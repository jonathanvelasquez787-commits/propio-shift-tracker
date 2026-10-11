-- Anonymous visitors need Auth, not direct access to application data.
-- Keep owner RLS and signed-in application grants unchanged.
revoke all on public.profiles, public.user_data, public.calls,
  public.rate_limit_buckets from anon;
revoke all on public.rate_limit_buckets from authenticated;

-- Functions created under legacy default privileges inherited anon execution.
-- Triggers do not need a client EXECUTE grant to run.
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
revoke execute on function public.slugify_username(text) from public, anon, authenticated;
revoke execute on function public.push_user_data(jsonb, jsonb, jsonb, timestamptz, text, text) from public, anon;
revoke execute on function public.push_user_data_v2(jsonb, jsonb, jsonb, text[], timestamptz, text, text) from public, anon;
