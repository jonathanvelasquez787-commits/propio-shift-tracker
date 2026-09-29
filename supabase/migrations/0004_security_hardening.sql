-- Complementa push_user_data_v2 y protege escrituras directas.

lock table public.calls in share row exclusive mode;

create table if not exists public.call_quotas (
  user_id uuid primary key references auth.users(id) on delete cascade,
  call_count bigint not null default 0 check (call_count >= 0)
);
alter table public.call_quotas enable row level security;
revoke all on public.call_quotas from public, anon, authenticated;

insert into public.call_quotas (user_id, call_count)
select user_id, count(*)::bigint
from public.calls
group by user_id
on conflict (user_id) do update set call_count = excluded.call_count;

create or replace function public.reserve_call_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));

  if not exists (select 1 from public.call_quotas where user_id = new.user_id) then
    insert into public.call_quotas (user_id, call_count)
    select new.user_id, count(*)::bigint
    from public.calls
    where user_id = new.user_id
    group by user_id
    on conflict (user_id) do nothing;
    insert into public.call_quotas (user_id, call_count)
    values (new.user_id, 0)
    on conflict (user_id) do nothing;
  end if;

  if exists (
    select 1 from public.calls
    where user_id = new.user_id and call_id = new.call_id
  ) then
    return new;
  end if;

  update public.call_quotas
  set call_count = call_count + 1
  where user_id = new.user_id and call_count < 100000;
  if not found then
    raise exception 'TOO_MANY_CALLS' using errcode = '54000';
  end if;
  return new;
end;
$$;
revoke all on function public.reserve_call_quota() from public, anon, authenticated;

create or replace function public.lock_call_quota_before_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(old.user_id::text, 0));
  return old;
end;
$$;
revoke all on function public.lock_call_quota_before_delete() from public, anon, authenticated;

create or replace function public.release_call_quota_after_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.call_quotas
  set call_count = greatest(call_count - 1, 0)
  where user_id = old.user_id;
  return old;
end;
$$;
revoke all on function public.release_call_quota_after_delete() from public, anon, authenticated;

drop trigger if exists calls_reserve_quota on public.calls;
create trigger calls_reserve_quota
before insert on public.calls
for each row execute function public.reserve_call_quota();

drop trigger if exists calls_lock_quota_before_delete on public.calls;
create trigger calls_lock_quota_before_delete
before delete on public.calls
for each row execute function public.lock_call_quota_before_delete();

drop trigger if exists calls_release_quota_after_delete on public.calls;
create trigger calls_release_quota_after_delete
after delete on public.calls
for each row execute function public.release_call_quota_after_delete();

alter table public.app_errors enable row level security;
revoke all on public.app_errors from public, anon, authenticated;
grant insert, select, delete on public.app_errors to service_role;
grant usage, select on sequence public.app_errors_id_seq to service_role;

create index if not exists app_errors_retention_idx
on public.app_errors (created_at desc, id desc);

create or replace function public.prune_app_errors()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.app_errors
  where created_at < now() - interval '30 days';

  delete from public.app_errors
  where id in (
    select id
    from public.app_errors
    order by created_at desc, id desc
    offset 50000
  );
end;
$$;
revoke all on function public.prune_app_errors() from public, anon, authenticated;
grant execute on function public.prune_app_errors() to service_role;

select public.prune_app_errors();

do $$
declare
  old_job bigint;
begin
  for old_job in select jobid from cron.job where jobname = 'propio-prune-app-errors' loop
    perform cron.unschedule(old_job);
  end loop;
  perform cron.schedule('propio-prune-app-errors', '*/5 * * * *', 'select public.prune_app_errors()');
end;
$$;
