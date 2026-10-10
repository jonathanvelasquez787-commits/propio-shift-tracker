-- Synthetic reports are rolled back; sequence gaps are harmless.
do $$
declare before_result jsonb; after_result jsonb;
begin
  before_result := public.production_readiness();
  begin
    insert into public.app_errors(kind,message,path,client_hash)
      select 'readiness-drill','synthetic untrusted report','/synthetic-check','synthetic-check'
      from generate_series(1,30);
    after_result := public.production_readiness();
    if after_result is distinct from before_result then
      raise exception 'UNTRUSTED_REPORTS_CHANGED_READINESS';
    end if;
    if has_function_privilege('anon','public.production_readiness()','execute')
      or has_function_privilege('authenticated','public.production_readiness()','execute') then
      raise exception 'READINESS_PRIVILEGE_LEAK';
    end if;
    raise exception using errcode='P0002', message='ROLLBACK_READINESS_DRILL';
  exception when no_data_found then
    null;
  end;
end;
$$;
select true as untrusted_reports_do_not_change_readiness;
