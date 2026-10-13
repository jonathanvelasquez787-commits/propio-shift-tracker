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
const labels = { 'session-start': 'Sesión iniciada · Shift', 'session-end': 'Sesión cerrada · Shift', incoming: 'Llamada entrante', accepted: 'Llamada aceptada', rejected: 'Llamada rechazada', disconnected: 'Llamada terminada', available: 'Disponible', unavailable: 'Fuera de línea' };
const send = packet => chrome.runtime.sendMessage(packet);
let busy = false, feedback = '';
async function refresh() {
  const state = await send({ kind: 'status' });
  if (!state || state.ok === false) throw new Error('status');
  document.getElementById('status').textContent = state.mode === 'auto' ? 'Registro automático activo' : state.paired ? 'Listo para registrar' : 'Conectá tu cuenta';
  document.getElementById('detail').textContent = feedback || reasons[state.attention] || (state.paired ? state.mode === 'auto' ? 'El registro automático está activo.' : 'Activá el registro cuando quieras comenzar.' : 'Abrí el tracker e iniciá sesión para vincularlo.');
  document.getElementById('detail').classList.toggle('error', Boolean(feedback || state.attention));
  const badge = document.getElementById('connectionBadge'); badge.textContent = state.paired ? 'Vinculada' : 'Sin vincular'; badge.classList.toggle('connected', state.paired);
  document.getElementById('observedCount').textContent = String(state.completed);
  document.getElementById('pendingCount').textContent = String(state.queued);
  document.getElementById('pair').textContent = state.paired ? 'Volver a vincular' : 'Vincular cuenta';
  document.getElementById('pair').classList.toggle('primary', !state.paired);
  document.getElementById('open').classList.toggle('primary', state.paired);
  const toggle = document.getElementById('automatic');
  const callStatus = state.active ? 'Llamada activa detectada.' : state.call === 'connected' ? 'Hay una llamada visible cuyo inicio no se observó; revisala en el tracker.' : state.call === 'incoming' ? 'Llamada entrante visible.' : state.call === 'idle' ? 'Controles de llamadas reconocidos.' : 'Controles de llamadas sin confirmar.';
  document.getElementById('portalStatus').textContent = !state.paired ? 'Vinculá tu cuenta para habilitar el registro. El resumen funciona por separado.' : state.portal === 'authenticated' ? `Sesión reconocida. ${callStatus}` : state.portal === 'logged-out' ? 'Cierre de sesión confirmado en Propio.' : 'Abrí Propio para reconocer tu sesión.';
  toggle.checked = state.mode === 'auto'; toggle.disabled = busy || !state.paired;
  for (const id of ['pair', 'open']) document.getElementById(id).disabled = busy;
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

let summaryOptions = normalizeSummaryOptions(null, false), summaryBusy = false, summaryRevision = 0, pendingSummaryEnabled = null;
function renderSummary(fillFields = false) {
  const toggle = document.getElementById('summaryEnabled');
  toggle.checked = pendingSummaryEnabled ?? summaryOptions.enabled; toggle.disabled = summaryBusy;
  document.getElementById('summaryStatus').textContent = summaryOptions.enabled
    ? 'Visible en el historial. «Calcular total» suma todas las páginas del rango.'
    : 'Oculto. Activá esta opción para verlo en el historial, sin recargar.';
  if (fillFields) {
    document.getElementById('summaryLanguage').value = summaryOptions.language;
    document.getElementById('summaryCurrency').value = summaryOptions.currency || '';
    document.getElementById('summaryRate').value = summaryOptions.rate || '';
  }
  for (const button of document.querySelectorAll('#summaryForm button')) button.disabled = summaryBusy;
}
async function saveSummary(patch) {
  if (summaryBusy) return;
  summaryBusy = true; pendingSummaryEnabled = typeof patch.enabled === 'boolean' ? patch.enabled : null; renderSummary();
  const feedback = document.getElementById('summaryFeedback'); feedback.textContent = ''; feedback.classList.remove('error');
  try {
    const stored = (await chrome.storage.local.get(settingsKey))[settingsKey];
    const next = normalizeSummaryOptions({ ...normalizeSummaryOptions(stored, false), ...patch }, false);
    await chrome.storage.local.set({ [settingsKey]: next });
    summaryOptions = next; renderSummary(true); feedback.textContent = 'Preferencias guardadas. Se aplican en tus pestañas de Propio.';
  } catch { feedback.textContent = 'No se pudo guardar. Reintentá.'; feedback.classList.add('error'); }
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
