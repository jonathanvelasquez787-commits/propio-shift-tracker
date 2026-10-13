const reasons = {
  'active-portal-call': 'Esperá a que termine la llamada para pausar o cambiar de cuenta. Para detener la conexión de inmediato, descartá las señales y revisá la llamada activa en el tracker.',
  'multiple-trackers': 'Dejá abierta una sola pestaña del tracker para esta cuenta.',
  'tracker-closed': 'Abrí el tracker e iniciá sesión para conectarlo.',
  'pending-account': 'Hay llamadas pendientes de la cuenta anterior. Abrila para completar el registro.',
  'account-needed': 'Abrí el tracker, iniciá sesión y conectá esta cuenta antes de activar el registro.',
  'queue-full': 'La cola está llena. El registro se pausó; revisá las llamadas pendientes.',
  'expired-event': 'Hay una señal de más de 24 horas. El registro se pausó para revisarla.',
  'event-rejected': 'Una señal no pasó la validación. El registro está pausado.',
  'tracker-needs-review': 'El tracker requiere revisión: puede haber una llamada manual, un traslape o un problema al guardar.',
  storage: 'No se pudo guardar el estado. Reintentá la conexión.',
};
const labels = { incoming: 'Llamada entrante', accepted: 'Llamada aceptada', rejected: 'Llamada rechazada', disconnected: 'Llamada terminada', available: 'Disponible', unavailable: 'Fuera de línea' };
const send = packet => chrome.runtime.sendMessage(packet);
let busy = false, feedback = '';
async function refresh() {
  const state = await send({ kind: 'status' });
  if (!state || state.ok === false) throw new Error('status');
  document.getElementById('status').textContent = state.mode === 'auto' ? 'Registro automático activo' : 'Modo de observación';
  document.getElementById('detail').textContent = feedback || reasons[state.attention] || `${state.paired ? 'Cuenta conectada' : 'Cuenta sin conectar'} · ${state.completed} llamada(s) observada(s) · ${state.queued} pendiente(s)`;
  const toggle = document.getElementById('automatic');
  toggle.checked = state.mode === 'auto'; toggle.disabled = busy || !state.paired;
  document.getElementById('reviewed').hidden = !state.queued && !(state.mode === 'auto' && state.active);
  const list = document.getElementById('signals'); list.replaceChildren();
  for (const item of [...state.last].reverse()) {
    const li = document.createElement('li');
    li.textContent = `${labels[item.signal] || 'Señal'} · ${new Date(item.at).toLocaleTimeString('es')}`; list.append(li);
  }
  if (!state.last.length) { const li = document.createElement('li'); li.textContent = 'Todavía no se detectaron señales compatibles.'; list.append(li); }
  const diagnostic = state.diagnostic || { requests: 0, recognized: 0, last: [] };
  document.getElementById('detectorStatus').textContent = diagnostic.requests
    ? `${diagnostic.requests} solicitud(es) observada(s) · ${diagnostic.recognized} señal(es) reconocida(s)`
    : 'Sin solicitudes observadas. Recargá Propio después de actualizar la extensión y comprobá su acceso a este sitio.';
  const requests = document.getElementById('detectorRequests'); requests.replaceChildren();
  const kinds = { status: 'Estado de Propio', twilio: 'Evento de llamadas', 'portal-api': 'Otra solicitud del portal' };
  const formats = { json: 'JSON', form: 'Formulario', missing: 'Cuerpo no disponible', oversized: 'Cuerpo demasiado grande', unreadable: 'Formato no reconocido', 'not-read': 'Cuerpo no leído' };
  for (const item of [...diagnostic.last].reverse()) {
    const li = document.createElement('li');
    li.textContent = `${kinds[item.kind] || 'Solicitud'} · ${formats[item.format] || 'Sin formato'} · HTTP ${item.status} · ${item.result === 'recognized' ? 'Señal reconocida' : item.result === 'http-error' ? 'Solicitud fallida' : 'Sin señal compatible'}`;
    requests.append(li);
  }
}
async function act(packet) {
  if (busy) return;
  busy = true; feedback = '';
  try { const result = await send(packet); if (!result?.ok) feedback = reasons[result?.reason] || 'No se pudo completar la acción.'; }
  catch { feedback = reasons.storage; }
  finally { busy = false; await refresh().catch(() => {}); }
}
document.getElementById('open').addEventListener('click', () => act({ kind: 'open-tracker' }));
document.getElementById('pair').addEventListener('click', () => act({ kind: 'pair' }));
document.getElementById('automatic').addEventListener('change', event => act({ kind: 'mode', mode: event.target.checked ? 'auto' : 'observe' }));
document.getElementById('reviewed').addEventListener('click', () => {
  if (window.confirm('¿Ya revisaste o registraste estas llamadas en el tracker? Se descartarán las señales pendientes y volverá el modo de observación. Una llamada activa en el tracker requiere revisión allí.')) act({ kind: 'clear-reviewed' });
});
refresh().catch(() => { document.getElementById('status').textContent = reasons.storage; });
setInterval(() => { if (!busy) refresh().catch(() => {}); }, 2000);
