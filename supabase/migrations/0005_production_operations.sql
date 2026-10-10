-- Production operations: privileged functions, health and atomic recovery.
alter function public.touch_updated_at() set search_path = public;
alter function public.slugify_username(text) set search_path = public;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.wipe_my_data() from public, anon;
grant execute on function public.wipe_my_data() to authenticated;
revoke all on public.daily_backups from public, anon, authenticated;
grant select on public.daily_backups to service_role;

create or replace function public.production_readiness()
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $$
declare
  checks jsonb;
begin
  checks := jsonb_build_object(
    'rls', (select count(*) = 7 and bool_and(c.relrowsecurity)
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname in
        ('profiles','user_data','calls','app_errors','daily_backups','rate_limit_buckets','call_quotas')),
    'private_functions',
      not has_function_privilege('anon', 'public.email_for_login_identifier(text)', 'execute')
      and not has_function_privilege('authenticated', 'public.email_for_login_identifier(text)', 'execute')
      and not has_function_privilege('anon', 'public.consume_rate_limit(text,integer,integer)', 'execute')
      and not has_function_privilege('authenticated', 'public.consume_rate_limit(text,integer,integer)', 'execute')
      and not has_function_privilege('anon', 'public.wipe_my_data()', 'execute')
      and not has_function_privilege('anon', 'public.handle_new_user()', 'execute'),
    'backup_job', exists (
      select 1 from cron.job j where j.jobname = 'propio-daily-backup' and j.active
      and exists (select 1 from cron.job_run_details r where r.jobid = j.jobid
        and r.status = 'succeeded' and r.end_time > now() - interval '26 hours')),
    'retention_job', exists (
      select 1 from cron.job j where j.jobname = 'propio-prune-app-errors' and j.active
      and exists (select 1 from cron.job_run_details r where r.jobid = j.jobid
        and r.status = 'succeeded' and r.end_time > now() - interval '20 minutes')),
    'backup_coverage', not exists (
      select 1 from public.user_data d where d.created_at < now() - interval '26 hours'
      and not exists (select 1 from public.daily_backups b where b.user_id = d.user_id
        and b.created_at > now() - interval '26 hours')),
    'runtime_errors', (select count(*) < 10 from public.app_errors
      where created_at > now() - interval '15 minutes')
  );
  return jsonb_build_object('ok', (select bool_and(value::boolean) from jsonb_each_text(checks)), 'checks', checks);
end;
$$;
revoke all on function public.production_readiness() from public, anon, authenticated;
grant execute on function public.production_readiness() to service_role;

-- Only the backend/operator can restore; the expected revision is mandatory.
-- All writes use a single transaction; an invalid snapshot rolls back everything.
create or replace function public.restore_user_backup(
  p_user_id uuid, p_backup_date date, p_expected_updated_at timestamptz
) returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $$
declare
  saved jsonb;
  actual timestamptz;
  fresh timestamptz;
begin
  if p_expected_updated_at is null then raise exception 'EXPECTED_REVISION_REQUIRED'; end if;
  select updated_at into actual from public.user_data where user_id = p_user_id for update;
  if not found then raise exception 'USER_DATA_NOT_FOUND'; end if;
  if actual is distinct from p_expected_updated_at then
    return jsonb_build_object('ok', false, 'conflict', true, 'updated_at', actual);
  end if;
  select snapshot into saved from public.daily_backups
    where user_id = p_user_id and backup_date = p_backup_date;
  if not found then raise exception 'BACKUP_NOT_FOUND'; end if;
  if jsonb_typeof(saved->'state') <> 'object'
    or jsonb_typeof(saved->'settings') <> 'object'
    or jsonb_typeof(saved->'calls') <> 'array'
    or not (saved ?& array['state','settings','calls'])
    or octet_length((saved->'state')::text) > 2097152
    or octet_length((saved->'settings')::text) > 1048576
    or jsonb_array_length(saved->'calls') > 100000 then
    raise exception 'BACKUP_INVALID';
  end if;
  if exists (select 1 from jsonb_array_elements(saved->'calls') item
    where jsonb_typeof(item) <> 'object' or coalesce(item->>'id', '') = '') then
    raise exception 'BACKUP_INVALID_CALL';
  end if;
  if (select count(*) <> count(distinct item->>'id') from jsonb_array_elements(saved->'calls') item) then
    raise exception 'BACKUP_DUPLICATE_CALL';
  end if;
  delete from public.calls where user_id = p_user_id;
  insert into public.calls (user_id, call_id, payload)
    select p_user_id, item->>'id', item from jsonb_array_elements(saved->'calls') item;
  update public.user_data set state = saved->'state', settings = saved->'settings',
    calls = '[]'::jsonb, schema_version = 2,
    device_id = 'operator-restore', device_label = 'Backup recovery'
    where user_id = p_user_id returning updated_at into fresh;
  return jsonb_build_object('ok', true, 'conflict', false, 'updated_at', fresh);
end;
$$;
revoke all on function public.restore_user_backup(uuid,date,timestamptz) from public, anon, authenticated;
grant execute on function public.restore_user_backup(uuid,date,timestamptz) to service_role;
