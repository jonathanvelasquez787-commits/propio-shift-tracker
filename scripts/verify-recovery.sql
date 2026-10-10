-- Isolated recovery drill. Every synthetic write is rolled back.
do $$
declare
  uid uuid := gen_random_uuid();
  initial_revision timestamptz;
  restored_revision timestamptz;
  result jsonb;
  original_state jsonb := '{"test":"recovery","earnings":12.34}'::jsonb;
  original_settings jsonb := '{"language":"es","theme":"dark"}'::jsonb;
  original_calls jsonb := '[{"id":"recovery-call","durationMin":10,"earnings":12.34}]'::jsonb;
  checks jsonb := '{}'::jsonb;
  invalid_rejected boolean := false;
begin
  begin
    insert into auth.users (id, email, raw_user_meta_data)
      values (uid, 'pst-recovery-' || uid::text || '@example.invalid',
        jsonb_build_object('username','recover_'||left(replace(uid::text,'-',''),12)));
    select updated_at into initial_revision from public.user_data where user_id = uid;
    insert into public.daily_backups (backup_date,user_id,snapshot)
      values (current_date,uid,jsonb_build_object('state',original_state,'settings',original_settings,'calls',original_calls));
    insert into public.calls(user_id,call_id,payload)
      values (uid,'different-call','{"id":"different-call"}'::jsonb);
    result := public.restore_user_backup(uid,current_date,initial_revision);
    if result->>'ok' <> 'true' then raise exception 'RESTORE_FAILED'; end if;
    if (select state <> original_state or settings <> original_settings from public.user_data where user_id=uid)
      or (select jsonb_agg(payload order by call_id) <> original_calls from public.calls where user_id=uid)
      or (select call_count <> 1 from public.call_quotas where user_id=uid) then
      raise exception 'RESTORE_CONTENT_MISMATCH';
    end if;
    checks := checks || '{"snapshot_and_quota_restored":true}'::jsonb;
    select updated_at into restored_revision from public.user_data where user_id=uid;
    result := public.restore_user_backup(uid,current_date,restored_revision - interval '1 second');
    if result->>'conflict' <> 'true' then raise exception 'STALE_RESTORE_NOT_REJECTED'; end if;
    checks := checks || '{"stale_revision_rejected":true}'::jsonb;
    update public.daily_backups
      set snapshot = jsonb_build_object('state',original_state,'settings',original_settings,
        'calls',jsonb_build_array(jsonb_build_object('id','oversized','value',repeat('x',70000))))
      where user_id=uid and backup_date=current_date;
    begin
      perform public.restore_user_backup(uid,current_date,restored_revision);
    exception when check_violation then invalid_rejected := true;
    end;
    if not invalid_rejected
      or (select jsonb_agg(payload order by call_id) <> original_calls from public.calls where user_id=uid)
      or (select call_count <> 1 from public.call_quotas where user_id=uid) then
      raise exception 'INVALID_SNAPSHOT_DID_NOT_ROLL_BACK';
    end if;
    checks := checks || '{"failed_restore_is_atomic":true}'::jsonb;
    if has_function_privilege('anon','public.restore_user_backup(uuid,date,timestamptz)','execute')
      or has_function_privilege('authenticated','public.restore_user_backup(uuid,date,timestamptz)','execute') then
      raise exception 'RESTORE_PRIVILEGE_LEAK';
    end if;
    checks := checks || '{"restore_backend_only":true}'::jsonb;
    raise exception 'PST_DRILL_ROLLBACK' using errcode='P0002';
  exception when no_data_found then
    if sqlerrm <> 'PST_DRILL_ROLLBACK' then raise; end if;
  end;
  if exists(select 1 from auth.users where id=uid) then raise exception 'TEST_ACCOUNT_LEFTOVER'; end if;
  checks := checks || '{"synthetic_transaction_rolled_back":true}'::jsonb;
  perform set_config('pst.recovery_drill',checks::text,false);
end $$;
select current_setting('pst.recovery_drill')::jsonb as recovery_drill;
