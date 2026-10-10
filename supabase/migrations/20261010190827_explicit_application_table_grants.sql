-- Fresh projects can disable automatic grants. RLS still limits every row.
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.user_data, public.calls to authenticated;
-- Public password signup is disabled; profile edits still need this boolean.
revoke execute on function public.username_available(text) from anon;
