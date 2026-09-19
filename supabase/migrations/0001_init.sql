-- =====================================================================
-- Propio Shift Tracker — esquema inicial (Fase 1)
--
-- Se ejecuta UNA vez, completo, en Supabase → SQL Editor → New query.
-- Es idempotente: se puede volver a correr sin romper nada.
--
-- Modelo:
--   profiles   → username público + mapeo username -> auth.users.id
--   user_data  → 1 fila por usuario = las 3 claves de localStorage
--                (state / calls / settings) como jsonb
--
-- Regla de oro: TODA tabla lleva RLS y una política por dueño. Ninguna
-- consulta del navegador puede ver datos de otro usuario aunque tenga la
-- anon key (que es pública por diseño).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. profiles
-- ---------------------------------------------------------------------

create table if not exists public.profiles (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  username       text not null,
  -- El unique va sobre la versión en minúsculas: "Jonathan" y "jonathan"
  -- son el mismo usuario a la hora de entrar.
  username_lower text generated always as (lower(username)) stored,
  display_name   text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint profiles_username_format
    check (username ~ '^[a-zA-Z0-9_.]{3,24}$')
);

create unique index if not exists profiles_username_lower_key
  on public.profiles (username_lower);

alter table public.profiles enable row level security;

drop policy if exists "profiles: el dueño lee lo suyo" on public.profiles;
create policy "profiles: el dueño lee lo suyo"
  on public.profiles for select
  using (auth.uid() = user_id);

drop policy if exists "profiles: el dueño actualiza lo suyo" on public.profiles;
create policy "profiles: el dueño actualiza lo suyo"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- No hay política de INSERT ni DELETE a propósito: la fila la crea el
-- trigger handle_new_user() y la borra el cascade de auth.users.

-- ---------------------------------------------------------------------
-- 2. user_data — el equivalente 1:1 de las 3 claves de localStorage
-- ---------------------------------------------------------------------

create table if not exists public.user_data (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  state          jsonb not null default '{}'::jsonb,
  calls          jsonb not null default '[]'::jsonb,
  settings       jsonb not null default '{}'::jsonb,
  -- Para poder migrar el formato del blob más adelante sin adivinar.
  schema_version integer not null default 1,
  -- Solo diagnóstico: qué dispositivo escribió último (se muestra en el
  -- aviso de conflicto, no se usa para decidir nada).
  device_id      text,
  device_label   text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.user_data enable row level security;

drop policy if exists "user_data: el dueño lee lo suyo" on public.user_data;
create policy "user_data: el dueño lee lo suyo"
  on public.user_data for select
  using (auth.uid() = user_id);

drop policy if exists "user_data: el dueño inserta lo suyo" on public.user_data;
create policy "user_data: el dueño inserta lo suyo"
  on public.user_data for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_data: el dueño actualiza lo suyo" on public.user_data;
create policy "user_data: el dueño actualiza lo suyo"
  on public.user_data for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_data: el dueño borra lo suyo" on public.user_data;
create policy "user_data: el dueño borra lo suyo"
  on public.user_data for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 3. updated_at automático
--    updated_at lo pone SIEMPRE el servidor: la detección de conflictos
--    entre dispositivos se apoya en que ningún cliente pueda falsearlo.
-- ---------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists user_data_touch_updated_at on public.user_data;
create trigger user_data_touch_updated_at
  before update on public.user_data
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 4. Username: normalización y disponibilidad
-- ---------------------------------------------------------------------

create or replace function public.slugify_username(raw text)
returns text
language sql
immutable
as $$
  select left(
    regexp_replace(lower(coalesce(raw, '')), '[^a-z0-9_.]', '', 'g'),
    24
  );
$$;

-- Callable por anónimos a propósito: el formulario de registro necesita
-- decir "ese usuario ya existe" ANTES de crear la cuenta. Solo devuelve
-- un booleano — nunca un correo ni el id de nadie.
create or replace function public.username_available(p_username text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text := lower(trim(coalesce(p_username, '')));
begin
  if candidate !~ '^[a-z0-9_.]{3,24}$' then
    return false;
  end if;
  if candidate in (
    'admin','root','support','soporte','ayuda','help','api','app','www',
    'propio','system','sistema','null','undefined','login','logout',
    'registro','signup','signin','cuenta','account','terminos','privacidad'
  ) then
    return false;
  end if;
  return not exists (
    select 1 from public.profiles p where p.username_lower = candidate
  );
end;
$$;

revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. Alta de usuario: crea profiles + user_data en el mismo instante
--    en que nace la cuenta, para los 3 métodos de login.
-- ---------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen    text := nullif(trim(coalesce(new.raw_user_meta_data->>'username', '')), '');
  base      text;
  candidate text;
  n         integer := 0;
begin
  if chosen is not null then
    -- Username elegido a mano (correo/contraseña o usuario/contraseña):
    -- si está tomado se aborta el alta entera en vez de inventar otro
    -- nombre a espaldas de quien se está registrando.
    candidate := public.slugify_username(chosen);
    if candidate !~ '^[a-z0-9_.]{3,24}$' then
      raise exception 'USERNAME_INVALID' using errcode = '23514';
    end if;
    if exists (select 1 from public.profiles p where p.username_lower = candidate) then
      raise exception 'USERNAME_TAKEN' using errcode = '23505';
    end if;
  else
    -- Alta por Google: no hay username elegido, se deriva del correo y se
    -- desambigua con un sufijo. El usuario lo puede cambiar después.
    base := public.slugify_username(split_part(coalesce(new.email, 'usuario'), '@', 1));
    if length(base) < 3 then
      base := base || 'user';
    end if;
    candidate := base;
    while exists (select 1 from public.profiles p where p.username_lower = candidate) loop
      n := n + 1;
      candidate := left(base, 24 - length(n::text)) || n::text;
    end loop;
  end if;

  insert into public.profiles (user_id, username, display_name)
  values (
    new.id,
    candidate,
    coalesce(
      nullif(trim(coalesce(new.raw_user_meta_data->>'display_name', '')), ''),
      nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''),
      nullif(trim(coalesce(new.raw_user_meta_data->>'name', '')), ''),
      candidate
    )
  );

  insert into public.user_data (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 6. Resolución username -> correo (SOLO para el backend)
--
--    Este es el único punto donde un correo sale de la base. Por eso NO
--    se le da permiso a anon ni a authenticated: solo la Vercel Function
--    /api/login (service_role) puede llamarla, y esa función nunca
--    devuelve el correo al navegador — únicamente la sesión ya creada.
--    Sin esto, cualquiera con la anon key podría convertir una lista de
--    usernames en una lista de correos.
-- ---------------------------------------------------------------------

create or replace function public.email_for_login_identifier(p_identifier text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  ident text := lower(trim(coalesce(p_identifier, '')));
  correo text;
begin
  if ident = '' then
    return null;
  end if;

  if position('@' in ident) > 0 then
    select u.email into correo
    from auth.users u
    where lower(u.email) = ident
    limit 1;
    return correo;
  end if;

  select u.email into correo
  from public.profiles p
  join auth.users u on u.id = p.user_id
  where p.username_lower = ident
  limit 1;

  return correo;
end;
$$;

revoke all on function public.email_for_login_identifier(text) from public;
revoke all on function public.email_for_login_identifier(text) from anon, authenticated;
grant execute on function public.email_for_login_identifier(text) to service_role;

-- ---------------------------------------------------------------------
-- 7. Guardado con control de concurrencia (lo que llama sync.js)
--
--    Un upsert a ciegas deja que el último dispositivo en guardar pise
--    en silencio lo que otro acaba de subir. Esta función compara contra
--    el updated_at que el cliente creía vigente:
--      - coincide  -> guarda y devuelve el updated_at nuevo
--      - no coincide -> NO guarda y devuelve conflict = true
--    El cliente entonces avisa en pantalla en vez de perder datos.
-- ---------------------------------------------------------------------

create or replace function public.push_user_data(
  p_state             jsonb,
  p_calls             jsonb,
  p_settings          jsonb,
  p_expected_updated_at timestamptz default null,
  p_device_id         text default null,
  p_device_label      text default null
)
returns jsonb
language plpgsql
security invoker            -- corre con los permisos del usuario => RLS aplica
set search_path = public
as $$
declare
  uid    uuid := auth.uid();
  actual timestamptz;
  fresh  timestamptz;
begin
  if uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;

  select ud.updated_at into actual
  from public.user_data ud
  where ud.user_id = uid
  for update;

  if not found then
    insert into public.user_data (user_id, state, calls, settings, device_id, device_label)
    values (uid, coalesce(p_state, '{}'::jsonb), coalesce(p_calls, '[]'::jsonb),
            coalesce(p_settings, '{}'::jsonb), p_device_id, p_device_label)
    returning updated_at into fresh;
    return jsonb_build_object('ok', true, 'conflict', false, 'updated_at', fresh);
  end if;

  if p_expected_updated_at is not null and actual is distinct from p_expected_updated_at then
    return jsonb_build_object('ok', false, 'conflict', true, 'updated_at', actual);
  end if;

  update public.user_data ud
  set state        = coalesce(p_state, ud.state),
      calls        = coalesce(p_calls, ud.calls),
      settings     = coalesce(p_settings, ud.settings),
      device_id    = p_device_id,
      device_label = p_device_label
  where ud.user_id = uid
  returning ud.updated_at into fresh;

  return jsonb_build_object('ok', true, 'conflict', false, 'updated_at', fresh);
end;
$$;

revoke all on function public.push_user_data(jsonb, jsonb, jsonb, timestamptz, text, text) from public;
grant execute on function public.push_user_data(jsonb, jsonb, jsonb, timestamptz, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 8. Borrado de datos por el propio usuario
--    Borra SOLO los datos. El borrado de la cuenta de auth necesita la
--    service_role y lo hace /api/delete-account.
-- ---------------------------------------------------------------------

create or replace function public.wipe_my_data()
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '28000';
  end if;
  delete from public.user_data where user_id = auth.uid();
end;
$$;

revoke all on function public.wipe_my_data() from public;
grant execute on function public.wipe_my_data() to authenticated;

-- ---------------------------------------------------------------------
-- 9. Backfill: si ya existían usuarios antes de correr esto, se les
--    crean sus filas para que no queden a medias.
-- ---------------------------------------------------------------------

insert into public.profiles (user_id, username, display_name)
select u.id,
       left(public.slugify_username(split_part(coalesce(u.email, 'usuario'), '@', 1)), 20) || left(replace(u.id::text, '-', ''), 4),
       coalesce(u.raw_user_meta_data->>'full_name', split_part(coalesce(u.email, 'usuario'), '@', 1))
from auth.users u
where not exists (select 1 from public.profiles p where p.user_id = u.id)
on conflict do nothing;

insert into public.user_data (user_id)
select u.id
from auth.users u
where not exists (select 1 from public.user_data d where d.user_id = u.id)
on conflict do nothing;
