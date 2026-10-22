create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table private.automation_availability_leases (
  user_id uuid primary key references auth.users(id) on delete cascade,
  owner uuid not null,
  expires_at timestamptz not null
);
alter table private.automation_availability_leases enable row level security;
revoke all on private.automation_availability_leases from public, anon, authenticated;

create function private.acquire_automation_lease(p_owner uuid)
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
    values(v_user,p_owner,v_now + interval '30 seconds')
  on conflict(user_id) do update set owner = excluded.owner, expires_at = excluded.expires_at
    where lease.owner = excluded.owner or lease.expires_at <= v_now
  returning lease.expires_at into v_expires;
  return query select v_expires is not null, clock_timestamp(), v_expires;
end;
$$;
revoke all on function private.acquire_automation_lease(uuid) from public, anon;
grant execute on function private.acquire_automation_lease(uuid) to authenticated;

create function public.automation_lease(p_owner uuid)
returns table(granted boolean, server_now timestamptz, expires_at timestamptz)
language sql security invoker set search_path = '' as $$
  select * from private.acquire_automation_lease(p_owner);
$$;
revoke all on function public.automation_lease(uuid) from public, anon;
grant execute on function public.automation_lease(uuid) to authenticated;
