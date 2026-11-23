// Icono del encabezado + cuadro con el estado de la extension (solo dentro de la extension de Chrome).
import { automationStatusView } from './automation-status.js';
import { installAutomationStatusUi } from './automation-ui.js';

const AVAILABILITY_REASONS = {
  connection: 'Esperando la conexión con Propio y Propio Shift Tracker.', schedule: 'La pestaña de Propio Shift Tracker todavía no confirma el horario y los descansos.',
  'shift-ended': 'Fuera del turno: no pulsa Start Calls.', 'before-shift': 'Esperando la hora de inicio de tu turno.',
  review: 'La conexión necesita revisión antes de empezar.', 'in-call': 'Estás en llamada; no toca los controles.',
  incoming: 'Hay una llamada entrante. Vos elegís si aceptarla.', 'portal-state': 'Esperando un estado claro de Propio.',
  'multiple-portals': 'Hay más de una pestaña de Propio, o todavía no se confirma la única pestaña.',
  pause: 'Esperando que termine tu Break o Lunch.', spacing: 'Respetando tu espera entre llamadas.',
  'acw-update': 'Actualizá Propio Shift Tracker para usar su contador ACW.',
  'acw-pending': 'Esperando el ACW actualizado de Propio Shift Tracker.',
  'manual-paused': 'Disponibilidad automática pausada por vos. El registro de llamadas continúa.',
  'pause-return-off': 'El regreso de esta pausa está apagado. Vos pulsás Start Calls para volver.',
  'first-done': 'La primera llamada ya fue tomada. El regreso de Break/Lunch sigue funcionando si está encendido.',
  off: 'No hay un iniciador pendiente.', available: 'Ya estás disponible en Propio.',
  'offline-control': 'Esperando Offline o Not Available con Start Calls disponible.',
  retry: 'Esperando un momento antes de reintentar Start Calls.', starting: 'Pulsando Start Calls para ponerte disponible.',
  stale: 'Lectura atrasada. Esperando confirmar Propio de nuevo; no se pulsa Start Calls ni Stop Calls.',
  'recording-off': 'El registro automático está apagado.',
  'device-passive': 'Solo registro en esta PC. No pulsa Start Calls ni Stop Calls ni termina pausas automáticamente.',
  coordination: 'Esperando permiso de la nube para esta PC. Otra PC puede estar usando los iniciadores. El registro continúa; pausá la PC anterior y esperá hasta 30 segundos.',
};
const REASONS = {
  'portal-closed': 'La pestaña de Propio se cerró durante una llamada. Revisá su final en Propio Shift Tracker.',
  'multiple-trackers': 'Dejá abierta una sola pestaña de Propio Shift Tracker para esta cuenta.',
  'tracker-closed': 'Abrí Propio Shift Tracker e iniciá sesión para conectarlo.',
  'pending-account': 'Hay llamadas pendientes de la cuenta anterior. Abrila para completar el registro.',
  'account-needed': 'Abrí Propio Shift Tracker, iniciá sesión y conectá esta cuenta antes de activar el registro.',
  'queue-full': 'La cola está llena. El registro se pausó; revisá las llamadas pendientes.',
  'expired-event': 'Hay una señal de más de 24 horas. El registro se pausó para revisarla.',
  'event-rejected': 'Una señal no pasó la validación. El registro está pausado.',
  'tracker-needs-review': 'Propio Shift Tracker requiere revisión: puede haber una llamada manual, un traslape o un problema al guardar.',
  storage: 'No se pudo guardar el estado. Reintentá la conexión.',
  'invalid-spacing': 'Elegí un número entero de 1 a 60 minutos.',
  'app-timeout': 'Propio Shift Tracker no respondió. Reintentá en unos segundos.',
  'update-tracker': 'Actualizá Propio Shift Tracker para usar esta opción.',
  'stale-tab': 'Esa pestaña de Propio Shift Tracker quedó vieja. Recargala e intentá de nuevo.',
};

// Convierte lo que responde la extension ({kind:'status'}) en lo que se ve. Funcion pura.
export function extensionBoxModel(state) {
  if (!state || state.ok === false) {
    return { dot: 'off', badge: 'Sin respuesta', paired: false, auto: false, title: 'La extensión no responde', detail: 'Cerrá y abrí de nuevo esta ventana.', queued: 0, attention: '' };
  }
  const paired = state.paired === true, auto = paired && state.mode === 'auto';
  const attention = state.attention ? String(state.attention) : '';
  const dot = !paired ? 'off' : attention ? 'warn' : auto ? 'on' : 'idle';
  const title = auto ? 'Registro automático activo' : paired ? 'Listo para registrar' : 'Buscando Propio Shift Tracker';
  const detail = REASONS[attention] || (paired ? (auto ? 'El registro automático está activo.' : 'Activá el registro cuando quieras comenzar.') : 'Se vincula automáticamente al reconocer tu sesión en Propio Shift Tracker.');
  return { dot, badge: paired ? 'Conectada' : 'Esperando', paired, auto, title, detail, queued: Math.max(0, Number(state.queued) || 0), attention };
}

// Valores de "Disponibilidad automatica" a partir de {kind:'status'}. Funcion pura.
export function extensionAvailabilityModel(state, now = Date.now()) {
  const prep = state && state.ok !== false ? state.preparation : null;
  const paired = state?.paired === true;
  const resume = prep?.resume || { break: false, lunch: false, mode: 'manual' };
  const spacing = prep?.spacing || { enabled: false, minutes: 2 };
  const view = automationStatusView(state?.automationStatus, now);
  const remaining = Math.max(0, Math.ceil((Date.parse(spacing.waitUntil) - now) / 1000));
  const status = AVAILABILITY_REASONS[view.key] || AVAILABILITY_REASONS[prep?.waitReason] || 'Comprobando cuándo ponerte disponible.';
  const resumeNote = resume.mode === 'timed'
    ? 'Al cumplir la duración de tu horario, cierra la pausa y te pone disponible. También podés terminarla vos en Inicio. Mantené Propio Shift Tracker abierto.'
    : 'Vos terminás la pausa en Inicio. Después, la extensión te pone disponible automáticamente.';
  const spacingNote = !spacing.enabled ? 'Apagado. No agrega esperas entre llamadas.'
    : prep?.availabilityPaused ? 'La disponibilidad automática está pausada por vos.'
    : prep?.waitReason === 'pause-return-off' ? 'El regreso de esta pausa está apagado. Vos decidís cuándo volver.'
    : prep?.waitReason === 'pause' ? 'La espera no interrumpe tu Break o Lunch.'
    : prep?.waitReason === 'spacing' && remaining > 0 ? `Faltan ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')} para volver a estar disponible.`
    : `Vuelve a estar disponible cuando el ACW de Propio Shift Tracker llega a ${spacing.minutes} minuto(s).`;
  return { paired, paused: prep?.availabilityPaused === true, first: prep?.enabled === true,
    resumeBreak: resume.break === true, resumeLunch: resume.lunch === true, resumeMode: resume.mode === 'timed' ? 'timed' : 'manual',
    spacingOn: spacing.enabled === true, minutes: spacing.minutes, status, resumeNote, spacingNote };
}

const PROBLEM_TEXT = {
  'queue-full': 'El registro se pausó porque hay demasiadas llamadas sin revisar.',
  'expired-event': 'El registro se pausó porque hay una señal de más de 24 horas sin revisar.',
  'event-rejected': 'El registro se pausó porque una señal no se pudo validar.',
  'tracker-needs-review': 'Propio Shift Tracker pide revisar unas llamadas antes de seguir.'
};

const SIGNAL_NAMES = { 'history-records': 'Historial de llamadas', 'session-start': 'Inicio de sesión', 'session-end': 'Fin de sesión', 'pause-end': 'Fin de pausa programado' };

// Señales pendientes y botones de la Parte 3, a partir de {kind:'status'}. Funcion pura.
export function extensionQueueModel(state, now = Date.now()) {
  const ok = state && state.ok !== false;
  const paired = ok && state.paired === true;
  const queued = ok ? Math.max(0, Number(state.queued) || 0) : 0;
  const prep = ok ? state.preparation : null;
  const plan = prep?.plan, spacing = prep?.spacing || { enabled: false };
  const expires = Date.parse(state?.queueSummary?.expiresAt);
  const left = Math.max(0, Math.ceil((expires - now) / 60000));
  const deadline = !queued ? '' : !Number.isFinite(expires) ? 'Pendientes sin fecha confirmada; requieren revisión.'
    : state.queueSummary.expired ? 'Hay señales vencidas; el registro necesita revisión.'
    : `La señal más antigua vence en ${Math.floor(left / 60)} h ${left % 60} min.`;
  const items = (ok && Array.isArray(state.queueItems) ? state.queueItems : []).map(item => {
    const at = new Date(item.at);
    return { name: SIGNAL_NAMES[item.type] || 'Señal', when: Number.isNaN(at.getTime()) ? '' : at.toLocaleString('es', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) };
  });
  const inCall = ok && (state.active || state.call === 'connected' || state.call === 'incoming');
  const attention = ok && state.attention ? String(state.attention) : '';
  const problemText = PROBLEM_TEXT[attention] || '';
  return { queued, deadline, items, problem: Boolean(problemText), problemText, showDiscard: Boolean(problemText),
    showResume: paired && prep?.availabilityPaused === true,
    showRefresh: paired && Boolean(plan) && !(plan.scheduleVerified === true && !(spacing.enabled && plan.acwVerified === false)),
    refreshLocked: Boolean(inCall) };
}

const SIGNAL_LABELS = { history: 'Historial oficial recuperado', 'session-start': 'Sesión iniciada · Shift', 'session-end': 'Sesión cerrada · Shift', incoming: 'Llamada entrante', accepted: 'Llamada aceptada', rejected: 'Llamada rechazada', disconnected: 'Llamada terminada', available: 'Disponible', unavailable: 'Fuera de línea' };

// «Estado de conexión», «Historial reconocido» y «Actividad reciente», a partir de {kind:'status'}. Funcion pura.
export function extensionActivityModel(state) {
  const ok = Boolean(state) && state.ok !== false;
  const paired = ok && state.paired === true;
  const callStatus = !ok ? '' : state.active ? 'Registrando tu llamada actual.' : state.call === 'connected' ? 'Hay una llamada en curso cuyo inicio no se observó; revisala en Propio Shift Tracker.' : state.call === 'incoming' ? 'Tenés una llamada entrante; vos decidís si aceptarla.' : 'Esperando la próxima llamada.';
  const attention = ok && state.attention ? String(state.attention) : '';
  const connection = REASONS[attention] || (!paired ? 'Esperando tu sesión de Propio Shift Tracker para conectar.'
    : state.portal === 'authenticated' ? `Propio está abierto y tu sesión fue reconocida. ${callStatus}`
    : state.portal === 'logged-out' ? 'Saliste de Propio. Esperando que vuelvas a entrar.' : 'Tu cuenta está vinculada. Esperando que Propio confirme tu sesión.');
  const h = ok ? state.history : null;
  const at = h ? new Date(h.at) : null;
  const historyStatus = h
    ? `${h.invalid ? `${h.invalid} fila(s) pendiente(s) de datos válidos. ` : ''}Última lectura: ${at && !Number.isNaN(at.getTime()) ? at.toLocaleTimeString('es') : '—'}.${state.mode !== 'auto' ? ' Activá el registro para sincronizarlas.' : ''}`
    : 'Abrí el historial de Propio para leer y recuperar sus llamadas.';
  const last = ok && Array.isArray(state.last) ? [...state.last].reverse() : [];
  const signals = last.length ? last.map(item => `${SIGNAL_LABELS[item.signal] || 'Señal'} · ${new Date(item.at).toLocaleTimeString('es')}`) : ['Todavía no se detectaron señales compatibles.'];
  return { connection, historyCount: h ? String(h.count) : '—', historyScope: h?.coverage === 'range' ? 'En el historial de hoy' : 'En la página del historial',
    observed: String(ok ? Number(state.completed) || 0 : 0), historyStatus, signals };
}

const REQUEST_KINDS = { status: 'Estado de Propio', twilio: 'Evento de llamadas', 'portal-api': 'Otra solicitud del portal' };
const REQUEST_FORMATS = { json: 'JSON', form: 'Formulario', missing: 'Cuerpo no disponible', oversized: 'Cuerpo demasiado grande', unreadable: 'Formato no reconocido', 'not-read': 'Cuerpo no leído' };

// «Detalles para soporte»: lo que la extension observo del portal. Funcion pura.
export function extensionSupportModel(state) {
  const d = state && state.ok !== false && state.diagnostic ? state.diagnostic : { requests: 0, recognized: 0, last: [] };
  const last = Array.isArray(d.last) ? [...d.last].reverse() : [];
  return { summary: d.requests ? `${d.requests} solicitud(es) observada(s) · ${d.recognized} señal(es) reconocida(s)` : 'Todavía no se observaron solicitudes del portal.',
    items: last.map(item => `${REQUEST_KINDS[item.kind] || 'Solicitud'} · ${REQUEST_FORMATS[item.format] || 'Sin formato'} · HTTP ${item.status} · ${item.result === 'recognized' ? 'Señal reconocida' : item.result === 'http-error' ? 'Solicitud fallida' : 'Sin señal compatible'}`) };
}

export function initExtensionBox(doc = globalThis.document, chromeApi = globalThis.chrome, loc = globalThis.location) {
  if (!doc || !loc || loc.protocol !== 'chrome-extension:' || !chromeApi?.runtime?.sendMessage) return null;
  const anchor = doc.getElementById('higherRateHeaderBtn');
  if (!anchor || doc.getElementById('extStatusBtn')) return null;
  const isPopup = /[?&]popup=1/.test(loc.search || '');
  const el = (tag, cls, text) => { const n = doc.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const btn = (text, id) => { const b = el('button', 'ext-box-btn', text); b.type = 'button'; if (id) b.id = id; return b; };

  const icon = el('button', 'hero-action-btn hero-action-btn-icon ext-status-btn');
  icon.id = 'extStatusBtn'; icon.type = 'button'; icon.title = 'Extensión de Chrome';
  icon.setAttribute('aria-label', 'Extensión de Chrome'); icon.setAttribute('aria-expanded', 'false'); icon.setAttribute('aria-controls', 'extStatusBox');
  icon.dataset.extDot = 'off';
  icon.innerHTML = '<span aria-hidden="true"><svg class="ic-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20v-5M12 20v-10M19 20V5"/></svg><i class="ext-dot"></i></span>';
  anchor.parentNode.insertBefore(icon, anchor);

  const box = el('section', 'ext-box'); box.id = 'extStatusBox'; box.hidden = true; box.setAttribute('aria-label', 'Extensión de Chrome');
  const head = el('div', 'ext-box-head'), headText = el('div');
  headText.append(el('h3', '', 'Extensión de Chrome'), el('p', '', 'Propio Shift Tracker'));
  const ver = el('span', 'ext-box-ver', 'v' + (chromeApi.runtime.getManifest?.().version || '')); ver.id = 'extBoxVersion';
  head.append(headText, ver);
  const conn = el('div', 'ext-box-conn');
  const badge = el('span', 'ext-box-badge', 'Comprobando'); badge.id = 'extBoxBadge';
  const status = el('p', 'ext-box-status', 'Comprobando conexión…'); status.id = 'extBoxStatus'; status.setAttribute('role', 'status');
  const detail = el('p', 'ext-box-detail'); detail.id = 'extBoxDetail'; detail.setAttribute('aria-live', 'polite');
  const actions = el('div', 'ext-box-actions');
  const pair = btn('Revisar conexión', 'extBoxPair'), open = btn('Abrir Shift Tracker ↗', 'extBoxOpen'), side = btn('Abrir en el panel lateral', 'extBoxSide');
  if (!isPopup) side.hidden = true;
  const resumeBtn = btn('Reanudar disponibilidad', 'extBoxResumeAvail'), refreshBtn = btn('Actualizar y reconectar', 'extBoxRefresh');
  resumeBtn.classList.add('is-primary'); resumeBtn.hidden = true; refreshBtn.hidden = true;
  actions.append(resumeBtn, pair, open, side, refreshBtn);
  conn.append(badge, status, detail, actions);
  const rec = el('label', 'ext-box-row'); rec.setAttribute('for', 'extBoxAuto');
  const recText = el('span'); recText.append(el('b', '', 'Registrar mi actividad'), el('small', '', 'Guarda turnos y llamadas en Shift Tracker.'));
  const sw = el('span', 'ext-box-switch'), auto = el('input'); auto.type = 'checkbox'; auto.id = 'extBoxAuto'; auto.setAttribute('role', 'switch');
  sw.append(auto, el('span', 'ext-box-track')); rec.append(recText, sw);
  const pend = el('div', 'ext-box-row');
  const pendText = el('span'); const pendNote = el('small', '', 'Nada esperando'); pendNote.id = 'extBoxPendingNote';
  pendText.append(el('b', '', 'Eventos pendientes'), pendNote);
  const pendCount = el('strong', 'ext-box-count', '0'); pendCount.id = 'extBoxPending'; pend.append(pendText, pendCount);
  const queueBox = el('div', 'ext-box-queue'); queueBox.id = 'extBoxQueue'; queueBox.hidden = true;
  const problemTitle = el('b', 'ext-box-problem-title', 'Hay llamadas sin revisar'); const problemNote = el('p', 'ext-box-note'); problemNote.id = 'extBoxProblemText';
  const deadlineNote = el('p', 'ext-box-note'); deadlineNote.id = 'extBoxQueueDeadline';
  const fold = (id, label) => { const b = el('button', 'ext-box-row ext-box-fold', ''); b.type = 'button'; b.id = id; b.setAttribute('aria-expanded', 'false'); const t = el('b', '', label), a = el('span', 'ext-box-arrow', '▸'); a.setAttribute('aria-hidden', 'true'); b.append(t, a); return { b, t, a }; };
  const moreFold = fold('extBoxMoreBtn', 'Más detalles'), moreBody = el('div', 'ext-box-more'); moreBody.id = 'extBoxMore'; moreBody.hidden = true;
  const sigList = el('ul', 'ext-box-signals'); sigList.id = 'extBoxSignals'; const howBody = el('div', 'ext-box-how'); howBody.id = 'extBoxHow';
  for (const [t, d] of [['Qué son', 'Señales de llamada, sesión o historial; no son llamadas adicionales.'], ['Cómo entregarlos', 'Abrí Propio Shift Tracker con la cuenta vinculada.'], ['Después de 24 horas', 'Se pausa su entrega para revisión. No se borran solas.']]) { const p = el('p'); p.append(el('b', '', t), el('span', '', d)); howBody.append(p); }
  howBody.append(el('p', 'ext-box-note', 'Revisá el historial de Propio y registrá lo que falte antes de descartar señales.'));
  const discard = btn('Ya las revisé, seguir registrando', 'extBoxDiscard'); discard.classList.add('is-primary');
  const discardWrap = el('div', 'ext-box-discard'); discardWrap.append(discard);
  moreBody.append(deadlineNote, sigList, howBody);
  queueBox.append(problemTitle, problemNote, discardWrap, moreFold.b, moreBody);
  const avail = el('div', 'ext-box-avail');
  const availHead = el('button', 'ext-box-row ext-box-fold', ''); availHead.type = 'button'; availHead.id = 'extBoxAvailBtn';
  availHead.setAttribute('aria-expanded', 'true'); availHead.setAttribute('aria-controls', 'extBoxAvailBody');
  const availArrow = el('span', 'ext-box-arrow', '▾'); availArrow.setAttribute('aria-hidden', 'true');
  availHead.append(el('b', '', 'Disponibilidad automática'), availArrow);
  const availBody = el('div', 'ext-box-avail-body'); availBody.id = 'extBoxAvailBody'; availBody.hidden = false;
  const toggleRow = (id, title, note) => {
    const row = el('label', 'ext-box-row'); row.setAttribute('for', id);
    const text = el('span'); const small = el('small', '', note); text.append(el('b', '', title), small);
    const swt = el('span', 'ext-box-switch'), input = el('input'); input.type = 'checkbox'; input.id = id; input.setAttribute('role', 'switch');
    swt.append(input, el('span', 'ext-box-track')); row.append(text, swt);
    return { row, input, small };
  };
  const pausedRow = toggleRow('extBoxPaused', 'Pausar disponibilidad automática', 'No pausa el guardado de llamadas.');
  const firstRow = toggleRow('extBoxFirst', 'Estar disponible al iniciar el turno', 'Desde tu horario hasta la primera llamada.');
  const brkRow = toggleRow('extBoxResumeBreak', 'Estar disponible después del Break', 'Ponerte disponible al terminar el descanso.');
  const lunchRow = toggleRow('extBoxResumeLunch', 'Estar disponible después del Lunch', 'Ponerte disponible al terminar la comida.');
  const modeRow = el('label', 'ext-box-field'); modeRow.setAttribute('for', 'extBoxResumeMode');
  const modeSel = el('select'); modeSel.id = 'extBoxResumeMode';
  for (const [v, t] of [['manual', 'Yo pulso «Terminar Break/Lunch» en Inicio'], ['timed', 'La extensión al cumplir su duración']]) { const o = el('option', '', t); o.value = v; modeSel.append(o); }
  modeRow.append(el('span', '', '¿Quién termina Break o Lunch?'), modeSel);
  const resumeNote = el('p', 'ext-box-note'); resumeNote.id = 'extBoxResumeNote';
  const spacingRow = toggleRow('extBoxSpacing', 'Esperar antes de volver', 'ACW 2 min');
  const minRow = el('label', 'ext-box-field'); minRow.setAttribute('for', 'extBoxMinutes');
  const minInput = el('input'); minInput.id = 'extBoxMinutes'; minInput.type = 'number'; minInput.min = '1'; minInput.max = '60'; minInput.step = '1'; minInput.value = '2';
  minRow.append(el('span', '', 'Minutos de ACW'), minInput);
  const spacingNote = el('p', 'ext-box-note'); spacingNote.id = 'extBoxSpacingNote';
  const availNote = el('p', 'ext-box-note'); availNote.id = 'extBoxAvailNote'; availNote.setAttribute('role', 'status');
  availBody.append(pausedRow.row, firstRow.row, brkRow.row, lunchRow.row, modeRow, resumeNote, spacingRow.row, minRow, spacingNote, availNote);
  avail.append(availHead, availBody);
  const doing = el('div', 'ext-box-avail'); doing.id = 'extBoxDoing';
  const doingHead = el('button', 'ext-box-row ext-box-fold', ''); doingHead.type = 'button'; doingHead.id = 'extBoxDoingBtn';
  doingHead.setAttribute('aria-expanded', 'true'); doingHead.setAttribute('aria-controls', 'automationPanel');
  const doingArrow = el('span', 'ext-box-arrow', '▾'); doingArrow.setAttribute('aria-hidden', 'true');
  doingHead.append(el('b', '', 'Qué hará la extensión ahora'), doingArrow);
  const doingBody = el('div', 'ext-box-avail-body ext-box-doing'); doingBody.id = 'automationPanel'; doingBody.hidden = false;
  const doingTitleLine = el('p', 'ext-box-doing-title');
  const doingTitle = el('strong', '', 'Sin conexión confirmada'); doingTitle.id = 'automationTitle'; doingTitle.setAttribute('role', 'status'); doingTitle.setAttribute('aria-live', 'polite');
  const doingClock = el('strong', 'ext-box-clock', ''); doingClock.id = 'automationCountdown'; doingClock.setAttribute('aria-label', 'Tiempo para el próximo intento'); doingClock.hidden = true;
  doingTitleLine.append(doingTitle, doingClock);
  const doingP = id => { const p = el('p', 'ext-box-check'); p.id = id; return p; };
  const doingDetail = doingP('automationDetail'); doingDetail.className = 'ext-box-note';
  const acw = el('div', 'ext-box-acw'); acw.id = 'automationAcwProgress'; acw.hidden = true;
  const acwBar = el('progress'); acwBar.id = 'automationAcwProgressBar'; acwBar.max = 100; acwBar.value = 0; acwBar.setAttribute('aria-label', 'Progreso de la espera entre llamadas');
  const acwLabel = el('p', 'ext-box-note'); acwLabel.id = 'automationAcwProgressLabel'; acw.append(acwBar, acwLabel);
  const checks = el('div', 'ext-box-checks');
  for (const id of ['automationTrackerCheck', 'automationPortalCheck', 'automationConnectionCheck', 'automationWorkCheck', 'automationScheduleCheck', 'automationHoursCheck', 'automationFirstCheck', 'automationReturnsCheck', 'automationPauseCheck', 'automationOptionsCheck']) checks.append(doingP(id));
  const hoursFold = fold('extBoxHoursBtn', 'Sobre estos horarios'), hoursBody = el('p', 'ext-box-note', 'El inicio usa tu horario o tu llamada real. El cálculo está en Reportes, dentro de Jornada.'); hoursBody.id = 'extBoxHours'; hoursBody.hidden = true;
  doingBody.append(doingTitleLine, doingDetail, acw, checks, hoursFold.b, hoursBody);
  doing.append(doingHead, doingBody);
  const section = (id, title, key) => {
    const wrap = el('div', 'ext-box-avail'), head = el('button', 'ext-box-row ext-box-fold', ''); head.type = 'button'; head.id = id + 'Btn';
    head.setAttribute('aria-expanded', 'false'); head.setAttribute('aria-controls', id);
    const arrow = el('span', 'ext-box-arrow', '▸'); arrow.setAttribute('aria-hidden', 'true'); head.append(el('b', '', title), arrow);
    const body = el('div', 'ext-box-avail-body ext-box-doing'); body.id = id; body.hidden = true; wrap.append(head, body);
    const setOpen = open => { body.hidden = !open; head.setAttribute('aria-expanded', String(open)); arrow.textContent = open ? '▾' : '▸'; };
    head.addEventListener('click', () => { const open = body.hidden; setOpen(open); try { chromeApi.storage?.local?.set?.({ [key]: open }); } catch { /* sin guardar */ } });
    try { Promise.resolve(chromeApi.storage?.local?.get?.(key)).then(saved => { if (saved?.[key] === true) setOpen(true); }).catch(() => {}); } catch { /* sin leer */ }
    return { wrap, body };
  };
  const connSec = section('extBoxConnection', 'Estado de conexión', 'extBoxConnOpen');
  const connHealth = el('p', 'ext-box-note'); connHealth.id = 'connectionHealth'; connHealth.setAttribute('role', 'status'); connSec.body.append(connHealth);
  const histSec = section('extBoxHistory', 'Historial reconocido', 'extBoxHistOpen');
  const stat = (id, note) => { const d = el('div', 'ext-box-stat'); const n = el('strong', '', '—'); n.id = id; const t = el('span', '', note); d.append(n, t); return { d, n, t }; };
  const histCount = stat('historyCount', 'En historial de Propio'), liveCount = stat('observedCount', 'Terminadas observadas en vivo'); liveCount.n.textContent = '0';
  histCount.t.id = 'historyScope'; liveCount.t.textContent = 'Terminadas observadas en vivo';
  const stats = el('div', 'ext-box-stats'); stats.append(histCount.d, liveCount.d);
  const histStatus = el('p', 'ext-box-note'); histStatus.id = 'historyStatus'; histStatus.setAttribute('role', 'status');
  histSec.body.append(stats, histStatus);
  const actSec = section('extBoxActivity', 'Actividad reciente', 'extBoxActOpen');
  const signalsList = el('ul', 'ext-box-signals'); signalsList.id = 'signals'; actSec.body.append(signalsList);
  const supSec = section('extBoxSupport', 'Detalles para soporte', 'extBoxSupportOpen');
  const supHelp = el('p', 'ext-box-note', 'Números para revisar la conexión.');
  const supSummary = el('p', 'ext-box-note'); supSummary.id = 'detectorStatus';
  const supList = el('ul', 'ext-box-signals'); supList.id = 'detectorRequests'; supSec.body.append(supHelp, supSummary, supList);
  box.append(head, conn, rec, pend, queueBox, avail, doing, connSec.wrap, histSec.wrap, actSec.wrap, supSec.wrap);
  doc.body.append(box);

  let busy = false, feedback = '', shown = false, timer = null, workSession = null;
  const automationUi = installAutomationStatusUi({ host: globalThis, document: doc, getWorkSession: () => workSession });
  const send = packet => chromeApi.runtime.sendMessage(packet);
  function place() {
    const r = icon.getBoundingClientRect(), y = (globalThis.scrollY || 0);
    box.style.top = Math.round(r.bottom + y + 8) + 'px';
  }
  async function refresh() {
    let state = null;
    try { state = await send({ kind: 'status' }); } catch { state = null; }
    const m = extensionBoxModel(state);
    workSession = state?.preparation?.plan?.workSession || null;
    automationUi.update(state?.ok === false ? null : state?.automationStatus || null);
    icon.dataset.extDot = m.dot;
    icon.title = m.dot === 'on' ? 'Extensión de Chrome: registrando' : 'Extensión de Chrome';
    badge.textContent = m.badge; badge.classList.toggle('is-on', m.paired);
    status.textContent = m.title;
    detail.textContent = feedback || m.detail; detail.classList.toggle('is-error', Boolean(m.attention));
    auto.checked = m.auto; auto.disabled = busy || !m.paired;
    pendCount.textContent = String(m.queued);
    pend.hidden = !m.queued;
    pendNote.textContent = m.queued ? 'Se entregan al abrir Propio Shift Tracker con la cuenta vinculada.' : 'Nada esperando';
    pair.classList.toggle('is-primary', !m.paired); pair.textContent = m.paired ? 'Revisar conexión' : 'Reintentar conexión';
    const act2 = extensionActivityModel(state);
    connHealth.textContent = act2.connection;
    histCount.n.textContent = act2.historyCount; histCount.t.textContent = act2.historyScope; liveCount.n.textContent = act2.observed; histStatus.textContent = act2.historyStatus;
    signalsList.replaceChildren(); for (const t of act2.signals) signalsList.append(el('li', '', t));
    const sup = extensionSupportModel(state);
    supSummary.textContent = sup.summary; supList.replaceChildren(); for (const t of sup.items) supList.append(el('li', '', t));
    const q = extensionQueueModel(state);
    queueBox.hidden = !q.problem; problemNote.textContent = q.problemText; deadlineNote.textContent = q.deadline;
    sigList.replaceChildren();
    for (const it of q.items) { const li = el('li', '', it.name); li.append(el('span', '', it.when)); sigList.append(li); }
    sigList.hidden = !q.items.length;
    discard.disabled = busy;
    resumeBtn.hidden = !q.showResume; resumeBtn.disabled = busy;
    refreshBtn.hidden = !q.showRefresh; refreshBtn.disabled = busy || q.refreshLocked;
    if (q.showResume) { status.textContent = 'Disponibilidad en pausa'; if (!feedback && !m.attention) detail.textContent = 'Sigue registrando. Reanuda desde aquí o con Start Calls en Propio.'; }
    const a = extensionAvailabilityModel(state);
    const lock = busy || !a.paired;
    pausedRow.input.checked = a.paused; firstRow.input.checked = a.first; brkRow.input.checked = a.resumeBreak; lunchRow.input.checked = a.resumeLunch;
    spacingRow.input.checked = a.spacingOn; modeSel.value = a.resumeMode;
    for (const i of [pausedRow.input, firstRow.input, brkRow.input, lunchRow.input, spacingRow.input, modeSel, minInput]) i.disabled = lock;
    if (doc.activeElement !== minInput) minInput.value = a.minutes;
    spacingRow.small.textContent = `ACW ${a.minutes} min`;
    resumeNote.textContent = a.resumeNote; spacingNote.textContent = a.spacingNote; availNote.textContent = a.status;
  }
  async function act(packet, okText) {
    if (busy) return; busy = true; feedback = '';
    try { const r = await send(packet); if (!r?.ok) feedback = REASONS[r?.reason] || 'No se pudo completar la acción.'; else if (okText) feedback = okText; }
    catch { feedback = REASONS.storage; }
    finally { busy = false; await refresh().catch(() => {}); }
    if (feedback) setTimeout(() => { feedback = ''; refresh().catch(() => {}); }, 6000);
  }
  async function actSeq(packets, okText) {
    if (busy) return; busy = true; feedback = '';
    try { for (const packet of packets) { const r = await send(packet); if (!r?.ok) { feedback = REASONS[r?.reason] || 'No se pudo completar la acción.'; break; } } if (!feedback) feedback = okText; }
    catch { feedback = REASONS.storage; }
    finally { busy = false; await refresh().catch(() => {}); }
    if (feedback) setTimeout(() => { feedback = ''; refresh().catch(() => {}); }, 6000);
  }
  pair.addEventListener('click', () => act({ kind: 'pair' }, 'Conexión revisada: Propio Shift Tracker está conectado.'));
  open.addEventListener('click', () => act({ kind: 'open-tracker' }));
  resumeBtn.addEventListener('click', () => act({ kind: 'pause-availability', paused: false }));
  refreshBtn.addEventListener('click', () => act({ kind: 'refresh-tracker' }));
  discard.addEventListener('click', () => {
    if (globalThis.confirm('¿Ya revisaste o registraste estas llamadas en Propio Shift Tracker? Se descartarán las señales pendientes y el registro seguirá activo. Una llamada activa en Propio Shift Tracker requiere revisión allí.')) actSeq([{ kind: 'clear-reviewed' }, { kind: 'mode', mode: 'auto' }], 'Listo. Señales descartadas y el registro sigue activo.');
  });
  const wireFold = (f, body) => f.b.addEventListener('click', () => { const open = body.hidden; body.hidden = !open; f.b.setAttribute('aria-expanded', String(open)); f.a.textContent = open ? '▾' : '▸'; });
  wireFold(moreFold, moreBody);
  auto.addEventListener('change', () => act({ kind: 'mode', mode: auto.checked ? 'auto' : 'observe' }));
  pausedRow.input.addEventListener('change', () => act({ kind: 'pause-availability', paused: pausedRow.input.checked }));
  firstRow.input.addEventListener('change', () => act({ kind: 'prepare-first', enabled: firstRow.input.checked }));
  for (const i of [brkRow.input, lunchRow.input, modeSel]) i.addEventListener('change', () => act({ kind: 'resume-options', break: brkRow.input.checked, lunch: lunchRow.input.checked, mode: modeSel.value }));
  const saveSpacing = () => act({ kind: 'spacing', enabled: spacingRow.input.checked, minutes: Number(minInput.value) });
  spacingRow.input.addEventListener('change', saveSpacing); minInput.addEventListener('change', saveSpacing);
  const setAvailOpen = open => { availBody.hidden = !open; availHead.setAttribute('aria-expanded', String(open)); availArrow.textContent = open ? '▾' : '▸'; };
  availHead.addEventListener('click', () => {
    const open = availBody.hidden; setAvailOpen(open);
    try { chromeApi.storage?.local?.set?.({ extBoxAvailOpen: open }); } catch { /* sin guardar: no pasa nada */ }
  });
  try { Promise.resolve(chromeApi.storage?.local?.get?.('extBoxAvailOpen')).then(saved => { if (saved?.extBoxAvailOpen === false) setAvailOpen(false); }).catch(() => {}); } catch { /* sin leer */ }
  const setDoingOpen = open => { doingBody.hidden = !open; doingHead.setAttribute('aria-expanded', String(open)); doingArrow.textContent = open ? '▾' : '▸'; };
  doingHead.addEventListener('click', () => {
    const open = doingBody.hidden; setDoingOpen(open);
    try { chromeApi.storage?.local?.set?.({ extBoxDoingOpen: open }); } catch { /* sin guardar: no pasa nada */ }
  });
  try { Promise.resolve(chromeApi.storage?.local?.get?.('extBoxDoingOpen')).then(saved => { if (saved?.extBoxDoingOpen === false) setDoingOpen(false); }).catch(() => {}); } catch { /* sin leer */ }
  wireFold(hoursFold, hoursBody);
  side.addEventListener('click', async () => {
    try { const w = await chromeApi.windows.getCurrent(); await chromeApi.sidePanel.open({ windowId: w.id }); globalThis.close?.(); } catch { /* sin panel lateral */ }
  });
  icon.addEventListener('click', () => {
    shown = !shown; box.hidden = !shown; icon.setAttribute('aria-expanded', String(shown));
    if (shown) { place(); refresh().catch(() => {}); }
  });
  globalThis.addEventListener?.('resize', () => { if (shown) place(); });
  refresh().catch(() => {});
  timer = setInterval(() => { if (!doc.hidden) refresh().catch(() => {}); }, 10000);
  return { icon, box, refresh, stop: () => { clearInterval(timer); automationUi.stop(); } };
}
