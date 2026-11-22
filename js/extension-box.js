// Icono del encabezado + cuadro con el estado de la extension (solo dentro de la extension de Chrome).
import { automationStatusView } from './automation-status.js';

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
  actions.append(pair, open, side);
  conn.append(badge, status, detail, actions);
  const rec = el('label', 'ext-box-row'); rec.setAttribute('for', 'extBoxAuto');
  const recText = el('span'); recText.append(el('b', '', 'Registrar mi actividad'), el('small', '', 'Guarda turnos y llamadas en Shift Tracker.'));
  const sw = el('span', 'ext-box-switch'), auto = el('input'); auto.type = 'checkbox'; auto.id = 'extBoxAuto'; auto.setAttribute('role', 'switch');
  sw.append(auto, el('span', 'ext-box-track')); rec.append(recText, sw);
  const pend = el('div', 'ext-box-row');
  const pendText = el('span'); const pendNote = el('small', '', 'Nada esperando'); pendNote.id = 'extBoxPendingNote';
  pendText.append(el('b', '', 'Eventos pendientes'), pendNote);
  const pendCount = el('strong', 'ext-box-count', '0'); pendCount.id = 'extBoxPending'; pend.append(pendText, pendCount);
  const avail = el('div', 'ext-box-avail');
  const availHead = el('button', 'ext-box-row ext-box-fold', ''); availHead.type = 'button'; availHead.id = 'extBoxAvailBtn';
  availHead.setAttribute('aria-expanded', 'false'); availHead.setAttribute('aria-controls', 'extBoxAvailBody');
  const availArrow = el('span', 'ext-box-arrow', '▸'); availArrow.setAttribute('aria-hidden', 'true');
  availHead.append(el('b', '', 'Disponibilidad automática'), availArrow);
  const availBody = el('div', 'ext-box-avail-body'); availBody.id = 'extBoxAvailBody'; availBody.hidden = true;
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
  box.append(head, conn, rec, pend, avail);
  doc.body.append(box);

  let busy = false, feedback = '', shown = false, timer = null;
  const send = packet => chromeApi.runtime.sendMessage(packet);
  function place() {
    const r = icon.getBoundingClientRect(), y = (globalThis.scrollY || 0);
    box.style.top = Math.round(r.bottom + y + 8) + 'px';
  }
  async function refresh() {
    let state = null;
    try { state = await send({ kind: 'status' }); } catch { state = null; }
    const m = extensionBoxModel(state);
    icon.dataset.extDot = m.dot;
    icon.title = m.dot === 'on' ? 'Extensión de Chrome: registrando' : 'Extensión de Chrome';
    badge.textContent = m.badge; badge.classList.toggle('is-on', m.paired);
    status.textContent = m.title;
    detail.textContent = feedback || m.detail; detail.classList.toggle('is-error', Boolean(m.attention));
    auto.checked = m.auto; auto.disabled = busy || !m.paired;
    pendCount.textContent = String(m.queued);
    pendNote.textContent = m.queued ? 'Se entregan al abrir Propio Shift Tracker con la cuenta vinculada.' : 'Nada esperando';
    pair.classList.toggle('is-primary', !m.paired); pair.textContent = m.paired ? 'Revisar conexión' : 'Reintentar conexión';
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
  pair.addEventListener('click', () => act({ kind: 'pair' }, 'Conexión revisada: Propio Shift Tracker está conectado.'));
  open.addEventListener('click', () => act({ kind: 'open-tracker' }));
  auto.addEventListener('change', () => act({ kind: 'mode', mode: auto.checked ? 'auto' : 'observe' }));
  pausedRow.input.addEventListener('change', () => act({ kind: 'pause-availability', paused: pausedRow.input.checked }));
  firstRow.input.addEventListener('change', () => act({ kind: 'prepare-first', enabled: firstRow.input.checked }));
  for (const i of [brkRow.input, lunchRow.input, modeSel]) i.addEventListener('change', () => act({ kind: 'resume-options', break: brkRow.input.checked, lunch: lunchRow.input.checked, mode: modeSel.value }));
  const saveSpacing = () => act({ kind: 'spacing', enabled: spacingRow.input.checked, minutes: Number(minInput.value) });
  spacingRow.input.addEventListener('change', saveSpacing); minInput.addEventListener('change', saveSpacing);
  availHead.addEventListener('click', () => {
    const open = availBody.hidden; availBody.hidden = !open; availHead.setAttribute('aria-expanded', String(open)); availArrow.textContent = open ? '▾' : '▸';
  });
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
  return { icon, box, refresh, stop: () => clearInterval(timer) };
}
