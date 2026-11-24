-- Traspaso de sesion (parte 2a de "una sola sesion a la vez"): lo que la nube necesita para que una
-- sesion nueva pida a la otra que suba su ultimo estado y se pause. Solo agrega funciones y una
-- tabla privada nuevas: no toca los datos guardados, las llamadas, el permiso de disponibilidad
-- automatica, la sesion del worker ni la nota de sesion de la parte 1.
create schema if not exists private;

-- Una sola peticion por cuenta: la ultima que alguien hizo.
create table private.app_takeovers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  by_device_id text not null check (char_length(by_device_id) between 1 and 64),
  by_label text not null check (char_length(by_label) between 1 and 80),
  by_kind text not null check (by_kind in ('web', 'extension')),
  requested_at timestamptz not null,
  acked_at timestamptz
);
alter table private.app_takeovers enable row level security;
revoke all on private.app_takeovers from public, anon, authenticated;

-- Sesiones OTRAS vistas en los ultimos 2 minutos. Solo lee: no deja nota. Una pagina del mismo
-- navegador y del mismo tipo (por ejemplo la misma web recargada) no cuenta como otra.
create function private.session_others(p_instance uuid, p_device_id text, p_kind text)
returns table(instance uuid, device_id text, label text, kind text, age_seconds integer)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  return query
    select s.instance, s.device_id, s.label, s.kind,
           greatest(0, floor(extract(epoch from (clock_timestamp() - s.seen_at))))::integer
    from private.app_sessions s
    where s.user_id = auth.uid()
      and s.seen_at >= clock_timestamp() - interval '2 minutes'
      and s.instance is distinct from p_instance
      and not (s.device_id = p_device_id and s.kind = p_kind)
    order by s.seen_at desc;
end;
$$;
revoke all on function private.session_others(uuid, text, text) from public, anon;
grant execute on function private.session_others(uuid, text, text) to authenticated;

create function public.session_others(p_instance uuid, p_device_id text, p_kind text)
returns table(instance uuid, device_id text, label text, kind text, age_seconds integer)
language sql security invoker set search_path = '' as $$
  select * from private.session_others(p_instance, p_device_id, p_kind);
$$;
revoke all on function public.session_others(uuid, text, text) from public, anon;
grant execute on function public.session_others(uuid, text, text) to authenticated;

-- La sesion nueva pide el traspaso. Reemplaza la peticion anterior y la deja sin confirmar.
create function private.session_takeover_request(p_device_id text, p_label text, p_kind text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_kind is null or p_kind not in ('web', 'extension') then
    raise exception 'Invalid kind' using errcode = '22023';
  end if;
  if p_device_id is null or char_length(p_device_id) not between 1 and 64
     or p_label is null or char_length(p_label) not between 1 and 80 then
    raise exception 'Invalid device' using errcode = '22023';
  end if;
  insert into private.app_takeovers as t(user_id, by_device_id, by_label, by_kind, requested_at, acked_at)
    values (auth.uid(), p_device_id, p_label, p_kind, clock_timestamp(), null)
  on conflict on constraint app_takeovers_pkey do update
    set by_device_id = excluded.by_device_id, by_label = excluded.by_label, by_kind = excluded.by_kind,
        requested_at = excluded.requested_at, acked_at = null;
end;
$$;
revoke all on function private.session_takeover_request(text, text, text) from public, anon;
grant execute on function private.session_takeover_request(text, text, text) to authenticated;

create function public.session_takeover_request(p_device_id text, p_label text, p_kind text)
returns void
language sql security invoker set search_path = '' as $$
  select private.session_takeover_request(p_device_id, p_label, p_kind);
$$;
revoke all on function public.session_takeover_request(text, text, text) from public, anon;
grant execute on function public.session_takeover_request(text, text, text) to authenticated;

-- La peticion vigente de la cuenta (si hay): quien la hizo, hace cuantos segundos y si ya la confirmaron.
create function private.session_takeover_get()
returns table(by_device_id text, by_label text, by_kind text, age_seconds integer, acked boolean)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  return query
    select t.by_device_id, t.by_label, t.by_kind,
           greatest(0, floor(extract(epoch from (clock_timestamp() - t.requested_at))))::integer,
           t.acked_at is not null
    from private.app_takeovers t
    where t.user_id = auth.uid();
end;
$$;
revoke all on function private.session_takeover_get() from public, anon;
grant execute on function private.session_takeover_get() to authenticated;

create function public.session_takeover_get()
returns table(by_device_id text, by_label text, by_kind text, age_seconds integer, acked boolean)
language sql security invoker set search_path = '' as $$
  select * from private.session_takeover_get();
$$;
revoke all on function public.session_takeover_get() from public, anon;
grant execute on function public.session_takeover_get() to authenticated;

-- La sesion vieja avisa "ya subi mi ultimo estado": confirma la peticion vigente.
create function private.session_takeover_ack()
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  update private.app_takeovers t set acked_at = clock_timestamp()
    where t.user_id = auth.uid() and t.acked_at is null;
end;
$$;
revoke all on function private.session_takeover_ack() from public, anon;
grant execute on function private.session_takeover_ack() to authenticated;

create function public.session_takeover_ack()
returns void
language sql security invoker set search_path = '' as $$
  select private.session_takeover_ack();
$$;
revoke all on function public.session_takeover_ack() from public, anon;
grant execute on function public.session_takeover_ack() to authenticated;
