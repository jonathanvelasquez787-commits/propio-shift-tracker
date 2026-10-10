-- Optimize ownership checks without changing who can access each row.
do $$ declare p record; statement text; begin
  for p in select tablename, policyname, cmd from pg_policies
    where schemaname = 'public' and tablename in ('profiles','user_data','calls')
    and (coalesce(qual,'') like '%auth.uid()%' or coalesce(with_check,'') like '%auth.uid()%') loop
    statement := format('alter policy %I on public.%I to authenticated', p.policyname, p.tablename);
    if p.cmd <> 'INSERT' then statement := statement || ' using ((select auth.uid()) = user_id)'; end if;
    if p.cmd in ('INSERT','UPDATE','ALL') then statement := statement || ' with check ((select auth.uid()) = user_id)'; end if;
    execute statement;
  end loop;
end $$;
create index if not exists daily_backups_user_id_idx on public.daily_backups(user_id);

create table if not exists public.operations_status (
  kind text primary key check (kind in ('monitor','backup')),
  checked_at timestamptz not null default clock_timestamp(),
  healthy boolean not null
);
alter table public.operations_status enable row level security;
revoke all on public.operations_status from public, anon, authenticated;
grant select, insert, update on public.operations_status to service_role;

create or replace function public.record_operation(p_kind text, p_ok boolean)
returns void language sql security invoker set search_path = public, pg_catalog as $$
  insert into public.operations_status(kind, healthy) values (p_kind, p_ok)
  on conflict(kind) do update set healthy = excluded.healthy, checked_at = clock_timestamp();
$$;
revoke all on function public.record_operation(text,boolean) from public, anon, authenticated;
grant execute on function public.record_operation(text,boolean) to service_role;

create or replace function public.operations_readiness()
returns jsonb language sql security definer set search_path = public, pg_catalog as $$
  select jsonb_build_object(
    'monitor', exists(select 1 from public.operations_status where kind = 'monitor' and healthy and checked_at > now() - interval '15 minutes'),
    'external_backup', exists(select 1 from public.operations_status where kind = 'backup' and healthy and checked_at > now() - interval '26 hours')
  );
$$;
revoke all on function public.operations_readiness() from public, anon, authenticated;
grant execute on function public.operations_readiness() to service_role;

-- The server immediately encrypts this response with a public key. The
-- decryption key is never held in Supabase, Vercel, the repository or logs.
create or replace function public.export_recovery_bundle()
returns jsonb language sql security definer set search_path = public, pg_catalog as $$
  select jsonb_build_object(
    'format','pst-backup-v1', 'created_at', clock_timestamp(), 'schema_version',2,
    'auth_users',coalesce((select jsonb_agg(to_jsonb(t)) from auth.users t),'[]'::jsonb),
    'auth_identities',coalesce((select jsonb_agg(to_jsonb(t)) from auth.identities t),'[]'::jsonb),
    'profiles',coalesce((select jsonb_agg(to_jsonb(t)) from public.profiles t),'[]'::jsonb),
    'user_data',coalesce((select jsonb_agg(to_jsonb(t)) from public.user_data t),'[]'::jsonb),
    'calls',coalesce((select jsonb_agg(to_jsonb(t)) from public.calls t),'[]'::jsonb),
    'daily_backups',coalesce((select jsonb_agg(to_jsonb(t)) from public.daily_backups t),'[]'::jsonb),
    'schema_manifest',jsonb_build_object(
      'columns',(select jsonb_agg(to_jsonb(c)) from information_schema.columns c where table_schema='public'),
      'auth_columns',(select jsonb_agg(to_jsonb(c)) from information_schema.columns c where table_schema='auth' and table_name in ('users','identities')),
      'policies',(select jsonb_agg(to_jsonb(p)) from pg_policies p where schemaname='public'),
      'indexes',(select jsonb_agg(to_jsonb(i)) from pg_indexes i where schemaname='public'),
      'functions',(select jsonb_agg(jsonb_build_object('name',p.proname,'definition',pg_get_functiondef(p.oid)))
        from pg_proc p join pg_namespace n on p.pronamespace=n.oid where n.nspname='public' and p.prokind='f'),
      'jobs',(select jsonb_agg(jsonb_build_object('name',jobname,'schedule',schedule,'active',active)) from cron.job)
    )
  );
$$;
revoke all on function public.export_recovery_bundle() from public, anon, authenticated;
grant execute on function public.export_recovery_bundle() to service_role;

create extension if not exists pg_net with schema extensions;
revoke all on schema net from public, anon, authenticated;
revoke all on all tables in schema net from public, anon, authenticated;
create table if not exists public.operation_http_requests (
  request_id bigint primary key,
  queued_at timestamptz not null default clock_timestamp(),
  processed boolean not null default false
);
alter table public.operation_http_requests enable row level security;
revoke all on public.operation_http_requests from public, anon, authenticated;

create or replace function public.queue_operation_probe()
returns bigint language plpgsql security definer set search_path = public, pg_catalog as $$
declare token text; request bigint;
begin
  select decrypted_secret into token from vault.decrypted_secrets where name='propio-operations-token' limit 1;
  if token is null then raise exception 'OPERATIONS_TOKEN_NOT_CONFIGURED'; end if;
  request := net.http_get(
    url := 'https://propio-shift-tracker.vercel.app/api/operations?mode=monitor',
    headers := jsonb_build_object('Authorization','Bearer ' || token), timeout_milliseconds := 15000
  );
  insert into public.operation_http_requests(request_id) values(request);
  return request;
end $$;
revoke all on function public.queue_operation_probe() from public, anon, authenticated;
grant execute on function public.queue_operation_probe() to service_role;

create or replace function public.collect_operation_probes()
returns void language plpgsql security definer set search_path = public, pg_catalog as $$
declare r record;
begin
  for r in select q.request_id, q.queued_at, h.status_code, h.error_msg
    from public.operation_http_requests q left join net._http_response h on h.id=q.request_id
    where not q.processed and (h.id is not null or q.queued_at < now()-interval '2 minutes') loop
    if r.status_code is distinct from 200 or r.error_msg is not null then
      insert into public.operations_status(kind,healthy,checked_at) values('monitor',false,r.queued_at)
      on conflict(kind) do update set healthy=false, checked_at=excluded.checked_at
        where operations_status.checked_at <= excluded.checked_at;
    end if;
    update public.operation_http_requests set processed=true where request_id=r.request_id;
  end loop;
  delete from public.operation_http_requests where processed and queued_at < now()-interval '7 days';
end $$;
revoke all on function public.collect_operation_probes() from public, anon, authenticated;
grant execute on function public.collect_operation_probes() to service_role;
select cron.schedule('propio-production-monitor','*/5 * * * *','select public.queue_operation_probe()');
select cron.schedule('propio-monitor-results','* * * * *','select public.collect_operation_probes()');
