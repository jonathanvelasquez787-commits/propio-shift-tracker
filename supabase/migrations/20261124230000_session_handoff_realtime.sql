-- Aviso por Realtime (parte D1 de "una sola sesion a la vez"): cuando alguien pide el traspaso, la nube
-- le avisa a la sesion que ya estaba abierta por un canal privado de la cuenta, para que mire el pedido
-- ya y no espere su revision de cada 5 segundos (Chrome la frena en pestanas ocultas). El aviso no
-- trae datos: la sesion vieja sigue leyendo el pedido real con session_takeover_get. Solo agrega un
-- disparador y una regla de lectura: no cambia las funciones ni los datos que ya existen.
-- Si Realtime falla, el pedido se guarda igual (el aviso va dentro de un bloque que traga el error).
create function private.session_takeover_notify()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.acked_at is null then
    begin
      perform realtime.send(jsonb_build_object('kind', 'takeover'), 'takeover',
        'session-handoff:' || new.user_id::text, true);
    exception when others then
      null;
    end;
  end if;
  return new;
end;
$$;
revoke all on function private.session_takeover_notify() from public, anon, authenticated;

create trigger session_takeover_notify
  after insert or update on private.app_takeovers
  for each row execute function private.session_takeover_notify();

-- Solo la dueña de la cuenta puede recibir avisos de SU canal. Nadie puede mandar avisos desde un
-- navegador: no hay regla de escritura, solo la nube los manda.
create policy "session_handoff_receive_own" on realtime.messages
  for select to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (select realtime.topic()) = 'session-handoff:' || (select auth.uid())::text
  );
