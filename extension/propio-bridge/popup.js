import { settingsKey } from '../propio-summary/i18n.js';
import { normalizeSummaryOptions } from '../propio-summary/options.js';
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
};
const labels = { history: 'Historial oficial recuperado', 'session-start': 'Sesión iniciada · Shift', 'session-end': 'Sesión cerrada · Shift', incoming: 'Llamada entrante', accepted: 'Llamada aceptada', rejected: 'Llamada rechazada', disconnected: 'Llamada terminada', available: 'Disponible', unavailable: 'Fuera de línea' };
const send = packet => chrome.runtime.sendMessage(packet);
labels['start-calls'] = 'Disponibilidad automática · Start Calls'; labels['pause-end'] = 'Fin de pausa programado';
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
  document.getElementById('portalStatus').textContent = !state.paired ? 'Esperando tu sesión en el tracker para vincularla automáticamente. El resumen funciona por separado.' : state.portal === 'authenticated' ? `Sesión reconocida. ${callStatus}` : state.portal === 'logged-out' ? 'Cierre de sesión confirmado en Propio.' : 'Abrí Propio para reconocer tu sesión.';
  toggle.checked = state.mode === 'auto'; toggle.disabled = busy || !state.paired;
  const prep = state.preparation, prepToggle = document.getElementById('prepareFirst');
  prepToggle.checked = prep?.enabled === true; prepToggle.disabled = busy || !state.paired;
  const plan = prep?.plan;
  const plannedPause = plan?.scheduledPauses?.filter(slot => Date.now() >= Date.parse(slot.startedAt) && Date.now() < Date.parse(slot.endedAt))
    .sort((a, b) => Date.parse(b.endedAt) - Date.parse(a.endedAt))[0];
  document.getElementById('prepareStatus').textContent = !prep?.enabled ? 'Apagado. Vos pulsás «Start Calls» para comenzar.'
    : state.mode !== 'auto' ? 'Activá «Registrar en mi tracker» para usar esta opción.'
    : !plan ? 'Esperando un horario de trabajo del tracker. En día libre no se activa.'
    : !plan.scheduleVerified ? 'Tu tracker tiene una versión anterior abierta. Recargá su pestaña para reconocer también tus descansos.'
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
    ? 'Al cumplir la duración de tu horario, cierra la pausa y te pone disponible. Mantené el tracker abierto para que pueda guardar ese cierre.'
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
for (const id of ['resumeBreak','resumeLunch','resumeMode']) document.getElementById(id).addEventListener('change', () => act({ kind: 'resume-options',
  break: document.getElementById('resumeBreak').checked, lunch: document.getElementById('resumeLunch').checked, mode: document.getElementById('resumeMode').value }));
document.getElementById('reviewed').addEventListener('click', () => {
  if (window.confirm('¿Ya revisaste o registraste estas llamadas en el tracker? Se descartarán las señales pendientes y volverá el modo de observación. Una llamada activa en el tracker requiere revisión allí.')) act({ kind: 'clear-reviewed' });
});
refresh().catch(() => { document.getElementById('status').textContent = reasons.storage; });
setInterval(() => { if (!busy) refresh().catch(() => {}); }, 2000);

let summaryOptions = normalizeSummaryOptions(null, false), summaryBusy = false, summaryRevision = 0, pendingSummaryEnabled = null, summaryError = '';
function renderSummary(fillFields = false) {
  const toggle = document.getElementById('summaryEnabled');
  toggle.checked = pendingSummaryEnabled ?? summaryOptions.enabled; toggle.disabled = summaryBusy;
  document.getElementById('summaryStatus').classList.toggle('error', Boolean(summaryError));
  document.getElementById('summaryStatus').textContent = summaryError || (summaryOptions.enabled
    ? 'Visible en el historial. «Calcular total» suma todas las páginas del rango.'
    : 'Oculto. Activá esta opción para verlo en el historial, sin recargar.');
  if (fillFields) {
    document.getElementById('summaryLanguage').value = summaryOptions.language;
    document.getElementById('summaryCurrency').value = summaryOptions.currency || '';
    document.getElementById('summaryRate').value = summaryOptions.rate || '';
  }
  for (const button of document.querySelectorAll('#summaryForm button')) button.disabled = summaryBusy;
}
async function saveSummary(patch) {
  if (summaryBusy) return;
  summaryBusy = true; summaryError = ''; pendingSummaryEnabled = typeof patch.enabled === 'boolean' ? patch.enabled : null; renderSummary();
  const feedback = document.getElementById('summaryFeedback'); feedback.textContent = ''; feedback.classList.remove('error');
  try {
    const stored = (await chrome.storage.local.get(settingsKey))[settingsKey];
    const next = normalizeSummaryOptions({ ...normalizeSummaryOptions(stored, false), ...patch }, false);
    await chrome.storage.local.set({ [settingsKey]: next });
    summaryOptions = next; renderSummary(true); feedback.textContent = 'Preferencias guardadas. Se aplican en tus pestañas de Propio.';
  } catch { summaryError = 'No se pudo guardar. Se conserva la preferencia anterior; reintentá.'; feedback.textContent = summaryError; feedback.classList.add('error'); }
  finally { summaryBusy = false; pendingSummaryEnabled = null; renderSummary(); }
}
document.getElementById('summaryEnabled').addEventListener('change', event => { void saveSummary({ enabled: event.target.checked }); });
document.getElementById('summaryForm').addEventListener('submit', event => {
  event.preventDefault();
  const currency = document.getElementById('summaryCurrency').value.trim(), rate = Number(document.getElementById('summaryRate').value);
  const feedback = document.getElementById('summaryFeedback');
  if ((currency || rate) && (!currency || !Number.isFinite(rate) || rate <= 0 || rate > 100000)) {
    feedback.textContent = 'Ingresá una moneda y un cambio mayor que cero, o usá «Sin conversión».'; feedback.classList.add('error'); return;
  }
  void saveSummary({ language: document.getElementById('summaryLanguage').value, currency: currency || null, rate: currency ? rate : null });
});
document.getElementById('clearConversion').addEventListener('click', () => { void saveSummary({ currency: null, rate: null }); });
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes[settingsKey]) return;
  summaryRevision++; summaryOptions = normalizeSummaryOptions(changes[settingsKey].newValue, false); renderSummary(true);
});
const initialSummaryRevision = summaryRevision;
chrome.storage.local.get(settingsKey).then(stored => {
  if (initialSummaryRevision === summaryRevision) summaryOptions = normalizeSummaryOptions(stored[settingsKey], false);
  renderSummary(true);
}).catch(() => { document.getElementById('summaryStatus').textContent = 'No se pudo leer la preferencia del resumen. Reintentá al abrir la extensión.'; });
