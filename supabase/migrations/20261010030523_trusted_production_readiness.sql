-- Browser telemetry is untrusted input and must never control outage readiness.
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
        and b.created_at > now() - interval '26 hours'))
  );
  return jsonb_build_object('ok', (select bool_and(value::boolean) from jsonb_each_text(checks)), 'checks', checks);
end;
$$;
revoke all on function public.production_readiness() from public, anon, authenticated;
grant execute on function public.production_readiness() to service_role;
