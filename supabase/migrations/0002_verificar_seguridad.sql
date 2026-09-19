-- =====================================================================
-- REVISIÓN DE SEGURIDAD — correr en Supabase → SQL Editor → New query
--
-- Este script hace dos cosas, en este orden:
--   1. REPARA: vuelve a activar RLS y a crear las políticas. Es seguro
--      correrlo aunque ya estuviera todo bien — no borra ni un dato.
--   2. VERIFICA: al final imprime una tabla que dice, en español, si cada
--      cosa quedó bien o mal.
--
-- Se puede correr las veces que haga falta.
--
-- ⚠️ ANTES DE ASUSTARTE: si estás viendo datos de otras cuentas desde el
--    panel de Supabase (Table Editor o SQL Editor), ESO ES NORMAL y no
--    significa que la seguridad esté rota. Ese panel entra como dueño de
--    la base, con llave maestra, y a propósito se salta todas las reglas.
--    Lo que importa es qué ve el NAVEGADOR de un usuario cualquiera, y eso
--    es lo que revisa este script.
-- =====================================================================


-- ---------------------------------------------------------------------
-- PARTE 1 — Reparar
-- ---------------------------------------------------------------------

alter table public.profiles  enable row level security;
alter table public.user_data enable row level security;

-- "force" hace que las reglas apliquen INCLUSO al dueño de la tabla. No es
-- imprescindible (el rol que usa el navegador nunca es el dueño), pero cierra
-- el último resquicio sin costo alguno.
alter table public.profiles  force row level security;
alter table public.user_data force row level security;

drop policy if exists "profiles: el dueño lee lo suyo" on public.profiles;
create policy "profiles: el dueño lee lo suyo"
  on public.profiles for select
  using (auth.uid() = user_id);

drop policy if exists "profiles: el dueño actualiza lo suyo" on public.profiles;
create policy "profiles: el dueño actualiza lo suyo"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

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

-- El correo NUNCA debe poder salir desde el navegador. Se revoca otra vez por
-- si alguna corrida anterior quedó a medias.
revoke all on function public.email_for_login_identifier(text) from public;
revoke all on function public.email_for_login_identifier(text) from anon;
revoke all on function public.email_for_login_identifier(text) from authenticated;
grant execute on function public.email_for_login_identifier(text) to service_role;


-- ---------------------------------------------------------------------
-- PARTE 2 — Verificar y reportar
-- ---------------------------------------------------------------------

with revisiones as (

  select 1 as orden,
    'Candado (RLS) en la tabla profiles' as revision,
    case when c.relrowsecurity
      then '✅ ACTIVADO'
      else '❌ APAGADO — vuelve a correr este script completo'
    end as resultado
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'profiles'

  union all
  select 2,
    'Candado (RLS) en la tabla user_data',
    case when c.relrowsecurity
      then '✅ ACTIVADO'
      else '❌ APAGADO — vuelve a correr este script completo'
    end
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'user_data'

  union all
  select 3,
    'Reglas de acceso en profiles',
    case when count(*) >= 2
      then '✅ ' || count(*)::text || ' reglas activas'
      else '❌ solo ' || count(*)::text || ' — faltan reglas'
    end
  from pg_policies
  where schemaname = 'public' and tablename = 'profiles'

  union all
  select 4,
    'Reglas de acceso en user_data',
    case when count(*) >= 4
      then '✅ ' || count(*)::text || ' reglas activas'
      else '❌ solo ' || count(*)::text || ' — faltan reglas'
    end
  from pg_policies
  where schemaname = 'public' and tablename = 'user_data'

  union all
  -- Una regla que no mencione auth.uid() no filtra por dueño: dejaría ver todo.
  select 5,
    'Todas las reglas filtran por dueño',
    case when count(*) = 0
      then '✅ SÍ'
      else '❌ hay ' || count(*)::text || ' regla(s) sin filtro de dueño'
    end
  from pg_policies
  where schemaname = 'public'
    and tablename in ('profiles', 'user_data')
    and coalesce(qual, '') !~ 'auth\.uid'
    and coalesce(with_check, '') !~ 'auth\.uid'

  union all
  select 6,
    'El correo NO se puede consultar desde el navegador',
    case when has_function_privilege('anon', p.oid, 'execute')
           or has_function_privilege('authenticated', p.oid, 'execute')
      then '❌ SÍ SE PUEDE — corre este script otra vez'
      else '✅ BLOQUEADO'
    end
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'email_for_login_identifier'

  union all
  select 7,
    'Cuentas registradas',
    count(*)::text || ' usuario(s)'
  from auth.users

  union all
  select 8,
    'Filas de datos guardadas',
    count(*)::text || ' fila(s) en user_data'
  from public.user_data

  union all
  select 9,
    'Cada usuario tiene su perfil',
    case when count(*) = 0
      then '✅ SÍ, todos'
      else '⚠️ ' || count(*)::text || ' usuario(s) sin perfil — corre 0001_init.sql otra vez'
    end
  from auth.users u
  where not exists (select 1 from public.profiles p where p.user_id = u.id)
)

select revision as "Revisión", resultado as "Resultado"
from revisiones
order by orden;
