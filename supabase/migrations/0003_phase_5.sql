-- Fases 4/5: rate limiting persistente, llamadas normalizadas, telemetría
-- privada y copias diarias con retención de 30 días.

create table if not exists public.rate_limit_buckets (
  bucket_key text primary key,
  window_started_at timestamptz not null,
  hits integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.rate_limit_buckets enable row level security;

create or replace function public.consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_hits integer;
begin
  if coalesce(p_key, '') = '' or p_limit < 1 or p_window_seconds < 1 then
    return false;
  end if;

  insert into public.rate_limit_buckets (bucket_key, window_started_at, hits)
  values (p_key, now(), 1)
  on conflict (bucket_key) do update
  set hits = case
        when rate_limit_buckets.window_started_at < now() - make_interval(secs => p_window_seconds)
          then 1 else rate_limit_buckets.hits + 1 end,
      window_started_at = case
        when rate_limit_buckets.window_started_at < now() - make_interval(secs => p_window_seconds)
          then now() else rate_limit_buckets.window_started_at end,
      updated_at = now()
  returning hits into current_hits;

  delete from public.rate_limit_buckets
  where updated_at < now() - interval '2 days';
  return current_hits <= p_limit;
end;
$$;
revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

create table if not exists public.calls (
  user_id uuid not null references auth.users(id) on delete cascade,
  call_id text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, call_id),
  constraint calls_payload_size check (octet_length(payload::text) <= 65536)
);
create index if not exists calls_user_date_idx
  on public.calls (user_id, ((payload->>'callDate')));
alter table public.calls enable row level security;

drop policy if exists "calls: el dueño lee lo suyo" on public.calls;
create policy "calls: el dueño lee lo suyo" on public.calls for select using (auth.uid() = user_id);
drop policy if exists "calls: el dueño inserta lo suyo" on public.calls;
create policy "calls: el dueño inserta lo suyo" on public.calls for insert with check (auth.uid() = user_id);
drop policy if exists "calls: el dueño actualiza lo suyo" on public.calls;
create policy "calls: el dueño actualiza lo suyo" on public.calls for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "calls: el dueño borra lo suyo" on public.calls;
create policy "calls: el dueño borra lo suyo" on public.calls for delete using (auth.uid() = user_id);

insert into public.calls (user_id, call_id, payload)
select d.user_id, item->>'id', item
from public.user_data d
cross join lateral jsonb_array_elements(coalesce(d.calls, '[]'::jsonb)) item
where coalesce(item->>'id', '') <> ''
on conflict (user_id, call_id) do update set payload = excluded.payload, updated_at = now();

-- Conservar el blob anterior como copia de reversión. Desde esta versión el
-- cliente lee y escribe public.calls; user_data.calls queda solo como legado.

create or replace function public.push_user_data_v2(
  p_state jsonb,
  p_settings jsonb,
  p_call_upserts jsonb default '[]'::jsonb,
  p_call_deletes text[] default '{}'::text[],
  p_expected_updated_at timestamptz default null,
  p_device_id text default null,
  p_device_label text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  actual timestamptz;
  fresh timestamptz;
begin
  if uid is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  if octet_length(coalesce(p_state, '{}'::jsonb)::text) > 2097152 then raise exception 'STATE_TOO_LARGE'; end if;
  if octet_length(coalesce(p_settings, '{}'::jsonb)::text) > 1048576 then raise exception 'SETTINGS_TOO_LARGE'; end if;
  if jsonb_typeof(coalesce(p_call_upserts, '[]'::jsonb)) <> 'array' then raise exception 'CALLS_INVALID'; end if;
  if octet_length(coalesce(p_call_upserts, '[]'::jsonb)::text) > 5242880 then raise exception 'CALL_BATCH_TOO_LARGE'; end if;

  select updated_at into actual from public.user_data where user_id = uid for update;
  if not found then
    insert into public.user_data (user_id, state, calls, settings, device_id, device_label)
    values (uid, coalesce(p_state, '{}'::jsonb), '[]'::jsonb, coalesce(p_settings, '{}'::jsonb), p_device_id, p_device_label)
    returning updated_at into fresh;
  else
    if p_expected_updated_at is not null and actual is distinct from p_expected_updated_at then
      return jsonb_build_object('ok', false, 'conflict', true, 'updated_at', actual);
    end if;
    update public.user_data
    set state = coalesce(p_state, state), settings = coalesce(p_settings, settings),
        device_id = p_device_id, device_label = p_device_label
    where user_id = uid returning updated_at into fresh;
  end if;

  delete from public.calls where user_id = uid and call_id = any(coalesce(p_call_deletes, '{}'::text[]));
  insert into public.calls (user_id, call_id, payload)
  select uid, item->>'id', item from jsonb_array_elements(coalesce(p_call_upserts, '[]'::jsonb)) item
  where coalesce(item->>'id', '') <> ''
  on conflict (user_id, call_id) do update set payload = excluded.payload, updated_at = now();

  if (select count(*) from public.calls where user_id = uid) > 100000 then raise exception 'TOO_MANY_CALLS'; end if;
  return jsonb_build_object('ok', true, 'conflict', false, 'updated_at', fresh);
end;
$$;
revoke all on function public.push_user_data_v2(jsonb,jsonb,jsonb,text[],timestamptz,text,text) from public;
grant execute on function public.push_user_data_v2(jsonb,jsonb,jsonb,text[],timestamptz,text,text) to authenticated;

create table if not exists public.app_errors (
  id bigint generated always as identity primary key,
  kind text not null,
  message text not null,
  stack text,
  path text,
  release text,
  client_hash text,
  created_at timestamptz not null default now()
);
alter table public.app_errors enable row level security;
revoke all on public.app_errors from public, anon, authenticated;
grant insert, select, delete on public.app_errors to service_role;
grant usage, select on sequence public.app_errors_id_seq to service_role;

create table if not exists public.daily_backups (
  backup_date date not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  primary key (backup_date, user_id)
);
alter table public.daily_backups enable row level security;

create or replace function public.create_daily_backup()
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.daily_backups (backup_date, user_id, snapshot)
  select current_date, d.user_id,
    jsonb_build_object(
      'state', d.state,
      'settings', d.settings,
      'calls', coalesce((select jsonb_agg(c.payload order by c.call_id) from public.calls c where c.user_id = d.user_id), '[]'::jsonb),
      'schema_version', 2,
      'backed_up_at', now()
    )
  from public.user_data d
  on conflict (backup_date, user_id) do update set snapshot = excluded.snapshot, created_at = now();
  delete from public.daily_backups where backup_date < current_date - 30;
end;
$$;
revoke all on function public.create_daily_backup() from public, anon, authenticated;
grant execute on function public.create_daily_backup() to service_role;

create extension if not exists pg_cron with schema extensions;
do $$
declare old_job bigint;
begin
  select jobid into old_job from cron.job where jobname = 'propio-daily-backup' limit 1;
  if old_job is not null then perform cron.unschedule(old_job); end if;
  perform cron.schedule('propio-daily-backup', '17 5 * * *', 'select public.create_daily_backup()');
end $$;

create or replace function public.wipe_my_data()
returns void language plpgsql security invoker set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED' using errcode = '28000'; end if;
  delete from public.calls where user_id = auth.uid();
  delete from public.daily_backups where user_id = auth.uid();
  delete from public.user_data where user_id = auth.uid();
end;
$$;
revoke all on function public.wipe_my_data() from public;
grant execute on function public.wipe_my_data() to authenticated;
