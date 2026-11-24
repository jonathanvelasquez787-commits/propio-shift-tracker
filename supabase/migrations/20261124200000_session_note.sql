-- Nota de sesion: cada app abierta (la web o la herramienta de la extension) deja aqui un
-- "estoy abierta" y lo renueva cada pocos segundos. Sirve para saber si hay OTRA sesion abierta.
-- Esta parte solo ESCRIBE y LEE la nota: no cambia nada de lo que ve la persona ni toca
-- los datos guardados, las llamadas, el permiso de disponibilidad automatica ni la sesion del worker.
-- Una fila por pagina abierta (instance cambia al recargar); las viejas se borran solas.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table private.app_sessions (
  user_id uuid not null references auth.users(id) on delete cascade,
  instance uuid not null,
  device_id text not null check (char_length(device_id) between 1 and 64),
  label text not null check (char_length(label) between 1 and 80),
  kind text not null check (kind in ('web', 'extension')),
  seen_at timestamptz not null,
  primary key (user_id, instance)
);
create index app_sessions_user_seen on private.app_sessions(user_id, seen_at desc);
alter table private.app_sessions enable row level security;
revoke all on private.app_sessions from public, anon, authenticated;

-- Renueva MI nota y devuelve las sesiones vistas en los ultimos 2 minutos (incluida la mia).
create function private.session_heartbeat(p_instance uuid, p_device_id text, p_label text, p_kind text)
returns table(instance uuid, device_id text, label text, kind text, age_seconds integer, is_self boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
begin
  if v_user is null or p_instance is null then
    raise exception 'Authentication and instance required' using errcode = '42501';
  end if;
  if p_kind is null or p_kind not in ('web', 'extension') then
    raise exception 'Invalid kind' using errcode = '22023';
  end if;
  if p_device_id is null or char_length(p_device_id) not between 1 and 64
     or p_label is null or char_length(p_label) not between 1 and 80 then
    raise exception 'Invalid device' using errcode = '22023';
  end if;
  -- Limpieza: nada de mas de 10 minutos, y como maximo 20 notas por persona.
  delete from private.app_sessions s where s.user_id = v_user and s.seen_at < v_now - interval '10 minutes';
  insert into private.app_sessions as s(user_id, instance, device_id, label, kind, seen_at)
    values (v_user, p_instance, p_device_id, p_label, p_kind, v_now)
  on conflict on constraint app_sessions_pkey do update
    set device_id = excluded.device_id, label = excluded.label, kind = excluded.kind, seen_at = excluded.seen_at;
  delete from private.app_sessions s where s.user_id = v_user and s.instance in (
    select o.instance from private.app_sessions o where o.user_id = v_user
    order by o.seen_at desc, o.instance offset 20);
  return query
    select s.instance, s.device_id, s.label, s.kind,
           greatest(0, floor(extract(epoch from (clock_timestamp() - s.seen_at))))::integer,
           s.instance = p_instance
    from private.app_sessions s
    where s.user_id = v_user and s.seen_at >= v_now - interval '2 minutes'
    order by s.seen_at desc;
end;
$$;
revoke all on function private.session_heartbeat(uuid, text, text, text) from public, anon;
grant execute on function private.session_heartbeat(uuid, text, text, text) to authenticated;

create function public.session_heartbeat(p_instance uuid, p_device_id text, p_label text, p_kind text)
returns table(instance uuid, device_id text, label text, kind text, age_seconds integer, is_self boolean)
language sql security invoker set search_path = '' as $$
  select * from private.session_heartbeat(p_instance, p_device_id, p_label, p_kind);
$$;
revoke all on function public.session_heartbeat(uuid, text, text, text) from public, anon;
grant execute on function public.session_heartbeat(uuid, text, text, text) to authenticated;

-- Al cerrar la pagina: borra MI nota para que la otra sesion no espere por una que ya no existe.
create function private.session_leave(p_instance uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or p_instance is null then
    raise exception 'Authentication and instance required' using errcode = '42501';
  end if;
  delete from private.app_sessions s where s.user_id = auth.uid() and s.instance = p_instance;
end;
$$;
revoke all on function private.session_leave(uuid) from public, anon;
grant execute on function private.session_leave(uuid) to authenticated;

create function public.session_leave(p_instance uuid)
returns void
language sql security invoker set search_path = '' as $$
  select private.session_leave(p_instance);
$$;
revoke all on function public.session_leave(uuid) from public, anon;
grant execute on function public.session_leave(uuid) to authenticated;
