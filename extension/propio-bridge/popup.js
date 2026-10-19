document.getElementById('extensionVersion').textContent = chrome.runtime.getManifest().version;

const reasons = {
  'portal-closed': 'La pestaña de Propio se cerró durante una llamada. Revisá su final en el tracker.',
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
  'invalid-spacing': 'Elegí un número entero de 1 a 60 minutos.',
};
const labels = { history: 'Historial oficial recuperado', 'session-start': 'Sesión iniciada · Shift', 'session-end': 'Sesión cerrada · Shift', incoming: 'Llamada entrante', accepted: 'Llamada aceptada', rejected: 'Llamada rechazada', disconnected: 'Llamada terminada', available: 'Disponible', unavailable: 'Fuera de línea' };
const send = packet => chrome.runtime.sendMessage(packet);
labels['start-calls'] = 'Disponibilidad automática · Start Calls'; labels['pause-end'] = 'Fin de pausa programado';
labels['spacing-stop'] = 'Espera entre llamadas · Stop Calls';
labels['manual-stop'] = 'Pausaste la disponibilidad automática'; labels['manual-start'] = 'Reanudaste con Start Calls';
const availabilityReasons = {
  connection: 'Esperando la conexión con Propio y el tracker.', schedule: 'La pestaña del tracker todavía no confirma el horario y los descansos.',
  'shift-ended': 'Fuera del turno: no pulsa Start Calls.', 'before-shift': 'Esperando la hora de inicio de tu turno.',
  review: 'La conexión necesita revisión antes de empezar.', 'in-call': 'Estás en llamada; no toca los controles.',
  incoming: 'Hay una llamada entrante. Vos elegís si aceptarla.', 'portal-state': 'Esperando un estado claro de Propio.',
  'multiple-portals': 'Hay más de una pestaña de Propio, o todavía no se confirma la única pestaña.',
  pause: 'Esperando que termine tu Break o Lunch.', spacing: 'Respetando tu espera entre llamadas.',
  'acw-update': 'Actualizá el tracker para usar su contador ACW.',
  'acw-pending': 'Esperando el ACW actualizado de tu tracker.',
  'manual-paused': 'Disponibilidad automática pausada por vos. El registro de llamadas continúa.',
  'pause-return-off': 'El regreso de esta pausa está apagado. Vos pulsás Start Calls para volver.',
  'first-done': 'La primera llamada ya fue tomada. El regreso de Break/Lunch sigue funcionando si está encendido.',
  off: 'No hay un iniciador pendiente.', available: 'Ya estás disponible en Propio.',
  'offline-control': 'Esperando Offline o Not Available con Start Calls disponible.',
  retry: 'Esperando un momento antes de reintentar Start Calls.', starting: 'Pulsando Start Calls para ponerte disponible.',
};
let busy = false, feedback = '';
async function refresh() {
  const state = await send({ kind: 'status' });
  if (!state || state.ok === false) throw new Error('status');
  document.getElementById('status').textContent = state.mode === 'auto' ? 'Registro automático activo' : state.paired ? 'Listo para registrar' : 'Buscando tu tracker';
  document.getElementById('detail').textContent = feedback || reasons[state.attention] || (state.paired ? state.mode === 'auto' ? 'El registro automático está activo.' : 'Activá el registro cuando quieras comenzar.' : 'Se vincula automáticamente al reconocer tu sesión en el tracker.');
  document.getElementById('detail').classList.toggle('error', Boolean(feedback || state.attention));
  const badge = document.getElementById('connectionBadge'); badge.textContent = state.paired ? 'Conectada' : 'Esperando'; badge.classList.toggle('connected', state.paired);
  document.getElementById('observedCount').textContent = String(state.completed);
  document.getElementById('historyCount').textContent = state.history ? String(state.history.count) : '—';
  document.getElementById('historyScope').textContent = state.history?.coverage === 'range' ? 'En el historial de hoy' : 'En la página del historial';
  document.getElementById('historyStatus').textContent = state.history
    ? `${state.history.invalid ? `${state.history.invalid} fila(s) pendiente(s) de datos válidos. ` : ''}Última lectura: ${new Date(state.history.at).toLocaleTimeString('es')}.${state.mode !== 'auto' ? ' Activá el registro para sincronizarlas.' : ''}`
    : 'Abrí el historial de Propio para leer y recuperar sus llamadas.';
  document.getElementById('pendingCount').textContent = String(state.queued);
  document.getElementById('pair').textContent = state.paired ? 'Revisar conexión' : 'Reintentar conexión';
  document.getElementById('pair').classList.toggle('primary', !state.paired);
  document.getElementById('open').classList.toggle('primary', state.paired);
  const toggle = document.getElementById('automatic');
  const callStatus = state.active ? 'Registrando tu llamada actual.' : state.call === 'connected' ? 'Hay una llamada en curso cuyo inicio no se observó; revisala en el tracker.' : state.call === 'incoming' ? 'Tenés una llamada entrante; vos decidís si aceptarla.' : 'Esperando la próxima llamada.';
  document.getElementById('portalStatus').textContent = !state.paired ? 'Esperando tu sesión en el tracker para vincularla automáticamente. La vista original funciona por separado.' : state.portal === 'authenticated' ? `Sesión reconocida. ${callStatus}` : state.portal === 'logged-out' ? 'Cierre de sesión confirmado en Propio.' : 'Abrí Propio para reconocer tu sesión.';
  toggle.checked = state.mode === 'auto'; toggle.disabled = busy || !state.paired;
  const prep = state.preparation, prepToggle = document.getElementById('prepareFirst');
  document.getElementById('availabilityPaused').checked = prep?.availabilityPaused === true;
  document.getElementById('availabilityPaused').disabled = busy || !state.paired;
  document.getElementById('availabilityStatus').textContent = availabilityReasons[prep?.waitReason] || 'Comprobando cuándo ponerte disponible.';
  const spacing = prep?.spacing || { enabled: false, minutes: 2 };
  document.getElementById('spacingEnabled').checked = spacing.enabled === true;
  document.getElementById('spacingEnabled').disabled = busy || !state.paired;
  const minutesInput = document.getElementById('spacingMinutes');
  if (document.activeElement !== minutesInput) minutesInput.value = spacing.minutes;
  minutesInput.disabled = busy || !state.paired;
  const remaining = Math.max(0, Math.ceil((Date.parse(spacing.waitUntil) - Date.now()) / 1000));
  document.getElementById('spacingStatus').textContent = !spacing.enabled ? 'Apagado. No agrega esperas entre llamadas.'
    : prep?.availabilityPaused ? 'La disponibilidad automática está pausada por vos.'
    : prep?.waitReason === 'pause-return-off' ? 'El regreso de esta pausa está apagado. Vos decidís cuándo volver.'
    : prep?.waitReason === 'pause' ? 'La espera no interrumpe tu Break o Lunch.'
    : prep?.waitReason === 'spacing' && remaining > 0 ? `Faltan ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')} para volver a estar disponible.`
    : `Vuelve a estar disponible cuando el ACW de tu tracker llega a ${spacing.minutes} minuto(s).`;
  prepToggle.checked = prep?.enabled === true; prepToggle.disabled = busy || !state.paired;
  const plan = prep?.plan;
  const refreshTracker = document.getElementById('refreshTracker');
  refreshTracker.hidden = !state.paired || !plan || (plan.scheduleVerified === true && !(spacing.enabled && plan.acwVerified === false));
  refreshTracker.disabled = busy || state.active || state.call === 'connected' || state.call === 'incoming';
  const plannedPause = plan?.scheduledPauses?.filter(slot => Date.now() >= Date.parse(slot.startedAt) && Date.now() < Date.parse(slot.endedAt))
    .sort((a, b) => Date.parse(b.endedAt) - Date.parse(a.endedAt))[0];
  document.getElementById('prepareStatus').textContent = !prep?.enabled ? 'Apagado. Vos pulsás «Start Calls» para comenzar.'
    : state.mode !== 'auto' ? 'Activá «Registrar en mi tracker» para usar esta opción.'
    : !plan ? 'Esperando un horario de trabajo del tracker. En día libre no se activa.'
    : !plan.scheduleVerified ? 'La conexión de esta pestaña todavía no confirma tus descansos. Actualizá el tracker para reconectarlo.'
    : plan.ended || Date.now() >= Date.parse(plan.endAt) ? 'Tu turno terminó. Esperará al siguiente.'
    : prep.doneFor === plan.startAt || plan.hasCall ? 'El arranque de este turno ya terminó. La opción queda encendida para el siguiente turno.'
    : plannedPause ? `Ahora corresponde ${plannedPause.type === 'lunch' ? 'Lunch' : 'Break'}. Esperará hasta ${new Date(plannedPause.endedAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })} para empezar.`
    : Date.now() < Date.parse(plan.startAt) ? `Esperará hasta ${new Date(plan.startAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })} para ponerte disponible.`
    : 'Tu turno ya empezó. Te pondrá disponible hasta que conectés tu primera llamada.';
  const resume = prep?.resume || { break: false, lunch: false, mode: 'manual' };
  for (const [id, name] of [['resumeBreak','break'],['resumeLunch','lunch']]) {
    const input = document.getElementById(id); input.checked = resume[name]; input.disabled = busy || !state.paired;
  }
  document.getElementById('resumeMode').value = resume.mode; document.getElementById('resumeMode').disabled = busy || !state.paired;
  document.getElementById('resumeStatus').textContent = resume.mode === 'timed'
    ? 'Al cumplir la duración de tu horario, cierra la pausa y te pone disponible. También podés terminarla vos en tu tool. Mantené el tracker abierto.'
    : 'Vos terminás la pausa en tu tool. Después, la extensión te pone disponible automáticamente.';
  for (const id of ['pair', 'open']) document.getElementById(id).disabled = busy;
  document.getElementById('reviewed').hidden = !state.queued && !(state.mode === 'auto' && state.active);
  const list = document.getElementById('signals'); list.replaceChildren();
  for (const item of [...state.last].reverse()) {
    const li = document.createElement('li');
    li.textContent = `${labels[item.signal] || 'Señal'} · ${new Date(item.at).toLocaleTimeString('es')}`; list.append(li);
  }
  if (!state.last.length) { const li = document.createElement('li'); li.textContent = 'Todavía no se detectaron señales compatibles.'; list.append(li); }
  const diagnostic = state.diagnostic || { requests: 0, recognized: 0, last: [] };
  document.getElementById('connectionHealth').textContent = reasons[state.attention] || (!state.paired ? 'Esperando tu sesión del tracker para conectar.'
    : state.portal === 'authenticated' ? `Propio está abierto y tu sesión fue reconocida. ${callStatus}`
    : state.portal === 'logged-out' ? 'Saliste de Propio. Esperando que vuelvas a entrar.' : 'Tu tracker está vinculado. Esperando que Propio confirme tu sesión.');
  document.getElementById('detectorStatus').textContent = diagnostic.requests
    ? `${diagnostic.requests} solicitud(es) observada(s) · ${diagnostic.recognized} señal(es) reconocida(s)`
    : 'Todavía no se observaron solicitudes del portal.';
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
document.getElementById('prepareFirst').addEventListener('change', event => act({ kind: 'prepare-first', enabled: event.target.checked }));
document.getElementById('availabilityPaused').addEventListener('change', event => act({ kind: 'pause-availability', paused: event.target.checked }));
document.getElementById('refreshTracker').addEventListener('click', () => act({ kind: 'refresh-tracker' }));
const saveSpacing = () => act({ kind: 'spacing', enabled: document.getElementById('spacingEnabled').checked, minutes: Number(document.getElementById('spacingMinutes').value) });
document.getElementById('spacingEnabled').addEventListener('change', saveSpacing);
document.getElementById('spacingMinutes').addEventListener('change', saveSpacing);
for (const id of ['resumeBreak','resumeLunch','resumeMode']) document.getElementById(id).addEventListener('change', () => act({ kind: 'resume-options',
  break: document.getElementById('resumeBreak').checked, lunch: document.getElementById('resumeLunch').checked, mode: document.getElementById('resumeMode').value }));
document.getElementById('reviewed').addEventListener('click', () => {
  if (window.confirm('¿Ya revisaste o registraste estas llamadas en el tracker? Se descartarán las señales pendientes y volverá el modo de observación. Una llamada activa en el tracker requiere revisión allí.')) act({ kind: 'clear-reviewed' });
});
refresh().catch(() => { document.getElementById('status').textContent = reasons.storage; });
setInterval(() => { if (!busy) refresh().catch(() => {}); }, 2000);

const layoutKey = 'propio-original-layout-v1';
let layoutBusy = false, layoutRevision = 0;
function renderLayout(value) {
  const toggle = document.getElementById('originalLayout');
  toggle.checked = value?.enabled === true;
  toggle.disabled = layoutBusy;
  document.getElementById('originalLayoutStatus').textContent = toggle.checked
    ? 'Activada. Se recuerda en este perfil.'
    : 'Desactivada. Se recuerda en este perfil.';
}
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes[layoutKey]) return;
  layoutRevision++; renderLayout(changes[layoutKey].newValue);
});
const initialLayoutRevision = layoutRevision;
chrome.storage.local.get(layoutKey).then(values => {
  if (layoutRevision === initialLayoutRevision) renderLayout(values[layoutKey]);
}).catch(() => { document.getElementById('originalLayoutStatus').textContent = 'No se pudo leer la preferencia. Reintentá al abrir la extensión.'; });
document.getElementById('originalLayout').addEventListener('change', async event => {
  if (layoutBusy) return;
  const enabled = event.target.checked;
  layoutBusy = true; event.target.disabled = true;
  try {
    await chrome.storage.local.set({ [layoutKey]: { enabled, revision: crypto.randomUUID() } });
    document.getElementById('originalLayoutStatus').textContent = 'Guardado. Propio se actualizará cuando esté Offline.';
  } catch {
    try { const values = await chrome.storage.local.get(layoutKey); renderLayout(values[layoutKey]); } catch {}
    document.getElementById('originalLayoutStatus').textContent = 'No se pudo guardar. Se conserva la elección anterior; reintentá.';
  } finally { layoutBusy = false; event.target.disabled = false; }
});
