-- Permiso de disponibilidad automatica PARA EL WORKER de la extension (90 s en vez de 30 s).
-- Chrome despierta al worker cada 30 s como minimo, asi que el permiso de 30 s no le alcanza.
-- La funcion public.automation_lease(uuid) que usa la app NO se toca.
-- Si el mismo dueño renueva, el permiso nunca se acorta (greatest).
create function private.acquire_automation_lease_worker(p_owner uuid)
returns table(granted boolean, server_now timestamptz, expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_expires timestamptz;
begin
  if v_user is null or p_owner is null then
    raise exception 'Authentication and owner required' using errcode = '42501';
  end if;
  insert into private.automation_availability_leases as lease(user_id,owner,expires_at)
    values(v_user,p_owner,v_now + interval '90 seconds')
  on conflict(user_id) do update set owner = excluded.owner, expires_at = greatest(lease.expires_at, excluded.expires_at)
    where lease.owner = excluded.owner or lease.expires_at <= v_now
  returning lease.expires_at into v_expires;
  return query select v_expires is not null, clock_timestamp(), v_expires;
end;
$$;
revoke all on function private.acquire_automation_lease_worker(uuid) from public, anon;
grant execute on function private.acquire_automation_lease_worker(uuid) to authenticated;

create function public.automation_lease_worker(p_owner uuid)
returns table(granted boolean, server_now timestamptz, expires_at timestamptz)
language sql security invoker set search_path = '' as $$
  select * from private.acquire_automation_lease_worker(p_owner);
$$;
revoke all on function public.automation_lease_worker(uuid) from public, anon;
grant execute on function public.automation_lease_worker(uuid) to authenticated;
