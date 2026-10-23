import { loadDetailViews } from './detail-views-loader.js';
import { ui, translateText, translateMarkup, displayLocale } from './i18n.js';
// app-main.js injects call helpers; app-context.js owns shared app state.
import { calls, settings, state, setAppCalls as setCalls, setAppState, setAppSettings } from './app-context.js';
import { ignorePropioCall } from './propio-bridge.js';
import { callFeedbackSilenced, withSilentCallFeedback } from './call-feedback.js';
import { PAY_ESTIMATE_RULE, roundedPayMinutes, callPayMinutes } from './pay-estimate.js';
import { observedCallRecord } from './call-records.js';
import { restoreAutomaticGameChanges } from './work-actions.js';

let HIGHER_RATE_TIERS, MAX_CALL_DURATION_MIN, appConfirm, autoStartShiftFromCalls, callDateKeyFromValue, callDedupeKey;
let callsForDay, callsOverlap, closeModal, connectedMinutesForDay, convertedAmountText, dayAdherence;
let dayEvents, dayGapRows, dayKeyFromIsoDate, dayShiftBounds, dayWorkSessions, escapeHtml, financeConvertedInline;
let financeConvertedNote, financeRunAutoFillCascade, formatCallDayLabel, formatDuration, formatHHMM;
let formatMinutes, gapLabelText, getActiveDayKey, higherRateBonusForCall, higherRateTierBadgeHtml;
let iconHtml, importedCallStats, isoDateFromDayKey, makeLocalId, money, onGameCallSaved, onGameCallsChanged, openModal;
let pad, parseMoney, rateTilePerMin, renderRateTiles, sameCallDay, saveAll, timeLabelFromDate;
let toDateFromInputs, toast, todayCallDateKey, playCallSavedSound;

let callContext;
export function configureCallsContext(context) {
  callContext = context;
  ({ HIGHER_RATE_TIERS, MAX_CALL_DURATION_MIN, appConfirm, autoStartShiftFromCalls, callDateKeyFromValue, callDedupeKey,
    callsForDay, callsOverlap, closeModal, connectedMinutesForDay, convertedAmountText, dayAdherence,
    dayEvents, dayGapRows, dayKeyFromIsoDate, dayShiftBounds, dayWorkSessions, escapeHtml, financeConvertedInline,
    financeConvertedNote, financeRunAutoFillCascade, formatCallDayLabel, formatDuration, formatHHMM,
    formatMinutes, gapLabelText, getActiveDayKey, higherRateBonusForCall, higherRateTierBadgeHtml,
    iconHtml, importedCallStats, isoDateFromDayKey, makeLocalId, money, onGameCallSaved, onGameCallsChanged, openModal,
    pad, parseMoney, rateTilePerMin, renderRateTiles, sameCallDay, saveAll, timeLabelFromDate,
    toDateFromInputs, toast, todayCallDateKey, playCallSavedSound } = context);
}

let editingCallId = null, editingCallContext = null, callDetailSequence = 0;

async function useCallRecovery(action, ...args) {
  const owner = settings;
  const detail = action === 'openCallRecords', sequence = detail ? ++callDetailSequence : callDetailSequence;
  const record = detail && args[0] ? JSON.stringify(calls.find(call => call.id === args[0])) : null;
  const module = await loadDetailViews({ retry: true });
  if (settings !== owner) return false;
  if (detail && !document.getElementById('callEditModal').classList.contains('open')) return false;
  if (detail && (sequence !== callDetailSequence || record && record !== JSON.stringify(calls.find(call => call.id === args[0])))) return false;
  if (!module) { toast(translateText('No se pudo cargar el detalle. Cerrá y abrí esta sección para reintentar.')); return false; }
  return module[action]({ ...callContext, ui, translateText, displayLocale,
    data: () => ({ calls, state, settings }), setCalls, setState: setAppState, reconcileLastCallEndedAt,
    finishEdit: () => { editingCallId = null; editingCallContext = null; },
  }, ...args);
}

export function openCallRecovery() { return useCallRecovery('openCallRecovery'); }
export function openCallRecords(callId, acwStart = null, reviewId = null) {
  if (callId) return openCallEditor(callId, { edit: false, acwStart });
  document.getElementById('callEditFields').hidden = true;
  document.getElementById('callEditModalTitle').textContent = translateText('Detalle del registro');
  document.getElementById('callRecordsContent').innerHTML = '';
  editingCallId = null; editingCallContext = null;
  openModal('callEditModal');
  return useCallRecovery('openCallRecords', null, acwStart, reviewId);
}

// Filtro Todo/Llamadas/Acciones sobre la tabla fusionada "Tabla de llamadas y acciones de hoy" (ver
// #tableFilterRow en el HTML y dayActionRows/renderTable más abajo). Vive en memoria, no en
// localStorage.
let tableFilterMode = 'all'; // 'all' | 'calls' | 'actions'.

function callAccountingFields(start, fallbackCallDate) {
  const calendarCallDate = callDateKeyFromValue(fallbackCallDate) || todayCallDateKey(start);
  const shiftStart = state.shiftStartedAt ? new Date(state.shiftStartedAt) : null;
  const shiftEnd = state.shiftEndedAt ? new Date(state.shiftEndedAt) : null;
  const startMs = start instanceof Date ? start.getTime() : Number.NaN;
  const belongsToTrackedShift = shiftStart
    && Number.isFinite(shiftStart.getTime())
    && Number.isFinite(startMs)
    && startMs >= shiftStart.getTime()
    && (!shiftEnd || !Number.isFinite(shiftEnd.getTime()) || startMs <= shiftEnd.getTime());
  const accountingCallDate = belongsToTrackedShift ? todayCallDateKey(shiftStart) : calendarCallDate;
  return {
    callDate: accountingCallDate,
    ...(belongsToTrackedShift ? { shiftDayKey: accountingCallDate } : {}),
    ...(accountingCallDate !== calendarCallDate ? { calendarCallDate } : {}),
  };
}

function reconcileLastCallEndedAt(dayKey) {
  const normalized = callDateKeyFromValue(dayKey);
  const todayKey = todayCallDateKey();
  const shiftDayKey = state.shiftStartedAt ? todayCallDateKey(new Date(state.shiftStartedAt)) : '';
  if (!normalized || (normalized !== todayKey && normalized !== shiftDayKey)) return;
  const now = Date.now();
  const latest = callsForDay(normalized)
    .filter(call => {
      const end = new Date(call.endISO || call.records?.propio?.endISO).getTime();
      return Number.isFinite(end) && end <= now;
    })
    .sort((a, b) => new Date(b.endISO || b.records?.propio?.endISO) - new Date(a.endISO || a.records?.propio?.endISO))[0];
  state.lastCallEndedAt = latest ? latest.endISO || latest.records?.propio?.endISO : null;
}

// Editor de una llamada ya importada: corrige duración, pago, billable y dropped.
export function openCallEditor(callId, options = {}) {
  const call = calls.find(c => c.id === callId);
  if (!call) {
    toast(translateText('No pude encontrar esa llamada'));
    return;
  }
  editingCallId = callId;
  editingCallContext = { owner: settings, call: JSON.stringify(call, function (_key, item) { return item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item; }) };
  const title = document.getElementById('callEditModalTitle');
  const preview = document.getElementById('callEditPreviewText');
  const durationInput = document.getElementById('callEditDurationInput');
  const payInput = document.getElementById('callEditPayInput');
  const billableInput = document.getElementById('callEditBillableInput');
  const droppedInput = document.getElementById('callEditDroppedInput');

  if (title) title.textContent = ui`Detalle de llamada · #${call.customerId}`;
  const fields = document.getElementById('callEditFields'); fields.hidden = false; fields.open = options.edit !== false;
  document.getElementById('callRecordsContent').innerHTML = '';
  if (preview) preview.textContent = ui`${call.callDate} · ${call.callStart} — los datos de fecha/hora no se pueden editar aquí, solo duración, pago, billable y dropped.`;
  if (durationInput) durationInput.value = call.durationMin;
  if (payInput) payInput.value = parseMoney(call.pay).toFixed(2);
  if (billableInput) billableInput.value = String(call.billable).toLowerCase() === 'yes' ? translateText('Yes') : translateText('No');
  if (droppedInput) droppedInput.value = String(call.dropped).toLowerCase() === 'yes' ? translateText('Yes') : translateText('No');
  syncManualCallPillsUI('callEditModal');

  // El nivel de Higher Rate NO se elige aquí: lo decide la ventana configurada
  // (higherRateBonusForCall). Esta sección solo informa cuál aplica, para que el Pago de arriba se
  // mantenga siendo el pago base que reporta Propio.
  const infoEl = document.getElementById('callEditHigherRateInfo');
  const infoTextEl = document.getElementById('callEditHigherRateInfoText');
  const warningEl = document.getElementById('callEditHigherRateWarning');
  const warningTextEl = document.getElementById('callEditHigherRateWarningText');
  const existingBonus = higherRateBonusForCall(call);
  if (infoEl && infoTextEl && warningEl && warningTextEl) {
    if (existingBonus) {
      const tierMeta = HIGHER_RATE_TIERS[existingBonus.tier];
      const tierLabel = tierMeta?.label || existingBonus.tier;
      infoTextEl.innerHTML = ui`Bono <strong>${escapeHtml(tierLabel)}</strong>: <strong>${money(existingBonus.amount)}</strong>${financeConvertedInline(existingBonus.amount)}, aparte del pago base. Para corregirlo, abrí Higher Rate → Revisar llamadas → Corregir promoción.`;
      infoEl.style.display = '';
      warningEl.style.display = 'none';
    } else {
      warningTextEl.textContent = translateText('Esta llamada no cae en ninguna ventana de Higher Rate, así que no lleva bono. El nivel se calcula solo desde tus ventanas: agrégala o ajústala en "Higher Rate" (botón del header) y el bono se suma solo a esta llamada.');
      warningEl.style.display = '';
      infoEl.style.display = 'none';
    }
  }

  openModal('callEditModal');
  return useCallRecovery('openCallRecords', callId, options.acwStart || null);
}

function readNumericCallPay(value, fallback = 0) {
  const amount = Number(String(value ?? '').trim() || fallback);
  return Number.isFinite(amount) && amount <= 1e9 ? Math.max(0, amount) : null;
}

export function saveCallEditor() { return useCallRecovery('saveEditedCall', editingCallId, editingCallContext); }

// Borra una llamada individual desde "Tabla completa" (botón "Eliminar" junto a "Editar", ver
// renderTable).
export function deleteCallRecord(callId, expected = calls.find(call => call.id === callId)) { return useCallRecovery('deleteRecordedCall', callId, expected); }

// Botón "🗑️ Vaciar llamadas del día" dentro de "Tabla de llamadas" — distinto de "Reiniciar día"
// (que además borra pausas/turno/huecos/nota/log de ese día).
export function clearActiveDayCalls() { return useCallRecovery('clearRecordedDay', getActiveDayKey()); }

// Agregar llamada manual ---- Para llamadas que nunca llegan en la exportación de Propio (ej. una
// llamada tomada fuera de la plataforma, o una que se te olvidó pegar).

let manualCallPayDirty = false;

// Tile de tarifa seleccionado actualmente en Agregar llamada manual — 'normal' por default (mismo
// resultado que el estimado de siempre, tasa base sin bono).
let manualCallSelectedRateTile = 'normal';

// Este modal puede abrirse como respaldo de una llamada en vivo ya colgada: cerrarlo sin guardar
// pierde ese tiempo.
let manualCallLiveBackupPending = false;

// Convierte "HH:MM" (24h, valor crudo de <input type="time">) al formato "h:mm AM/PM" que usa
// internamente callStart (el mismo formato que toDateFromInputs/parseCalls esperan al leer la
// exportación real de Propio)
function callStartLabelFromHHMM(hhmm) {
  const match = String(hhmm ?? '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return null;
  const normalized = formatHHMM(hhmm);
  const [h, m] = normalized.split(':').map(Number);
  const hour12 = h % 12 || 12;
  const suffix = h >= 12 ? translateText('PM') : translateText('AM');
  return `${hour12}:${pad(m)} ${suffix}`;
}

// El pago estimado usa el umbral personal; la duración real conserva sus segundos.
function manualCallEstimatedPay(durationMin, tileKey = 'normal') {
  const original = manualCallLiveBackupPending && state.pendingLiveCallBackup?.candidate;
  const minutes = original && Number(original.durationMin) === Number(durationMin)
    ? callPayMinutes(original) : roundedPayMinutes(durationMin);
  return Number((minutes * rateTilePerMin(tileKey)).toFixed(2));
}

// Prellena los campos del modal — extraído de openManualCallModal para poder reutilizarlo también
// cuando el modal se abre al TERMINAR una llamada en vivo (ver endCall), con los mismos campos
// pero.
function prefillManualCallForm({ dayKey, startDate, durationMin }) {
  const dateInput = document.getElementById('manualCallDateInput');
  const startInput = document.getElementById('manualCallStartInput');
  const durationInput = document.getElementById('manualCallDurationInput');
  const payInput = document.getElementById('manualCallPayInput');
  const billableInput = document.getElementById('manualCallBillableInput');
  const droppedInput = document.getElementById('manualCallDroppedInput');
  const customerIdInput = document.getElementById('manualCallCustomerIdInput');

  if (dateInput) dateInput.value = isoDateFromDayKey(dayKey);
  if (startInput) startInput.value = `${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`;
  if (durationInput) durationInput.value = durationMin === '' ? '' : String(durationMin);
  if (payInput) payInput.value = '';
  if (billableInput) billableInput.value = 'Yes';
  if (droppedInput) droppedInput.value = 'No';
  if (customerIdInput) customerIdInput.value = '';
  manualCallSelectedRateTile = 'normal';
  renderRateTiles('manualCallRateTiles', 'normal');
  syncManualCallPillsUI();
  updateManualCallPreview();
}

function syncManualCallPillsUI(containerId = 'manualCallModal') {
  document.querySelectorAll(`#${containerId} .mc-pill-row`).forEach(row => {
    const btns = row.querySelectorAll('.mc-pill-btn');
    if (!btns.length) return;
    const targetId = btns[0].getAttribute('data-mc-pill-for');
    const select = document.getElementById(targetId);
    const current = select ? select.value : null;
    btns.forEach(b => b.setAttribute('aria-pressed', b.getAttribute('data-mc-pill-value') === current ? 'true' : 'false'));
  });
}

export function openManualCallModal() {
  manualCallPayDirty = false;
  // Este es un "Agregar llamada manual" normal, no un respaldo de llamada en vivo — cerrar sin
  // guardar aquí nunca pierde tiempo de trabajo ya registrado, así que no exige confirmación.
  manualCallLiveBackupPending = false;
  const title = document.getElementById('manualCallModalTitle');
  const subtitle = document.getElementById('manualCallModalSubtitle');
  if (title) title.textContent = translateText('Agregar llamada manual');
  if (subtitle) subtitle.textContent = translateText('Para una llamada que no vino en la exportación de Propio. Se guarda igual que cualquier otra fila — mismo cálculo de huecos, ACW y ganancias.');
  prefillManualCallForm({ dayKey: getActiveDayKey(), startDate: new Date(), durationMin: '' });
  openModal('manualCallModal');
}

// Desde, esta variante YA NO es el camino normal al terminar una llamada (ver autoSaveLiveCall más
// abajo, que guarda sola sin abrir nada)
function openManualCallModalFromLiveCall(startedAtISO, endedAtISO, originalCandidate = null) {
  manualCallPayDirty = false;
  // Este modal SÍ representa una llamada real que ya se colgó y cuyo guardado automático falló
  // (traslape/duplicado). El respaldo conserva segundos/décimas y el día contable por separado.
  manualCallLiveBackupPending = true;
  const start = new Date(startedAtISO);
  const end = new Date(endedAtISO);
  const elapsedMs = Math.max(0, end.getTime() - start.getTime());
  const durationMin = Number.isFinite(Number(originalCandidate?.durationMin))
    ? Number(originalCandidate.durationMin)
    : Math.round((elapsedMs / 60000) * 100) / 100;
  const calendarDayKey = callDateKeyFromValue(originalCandidate?.calendarCallDate) || todayCallDateKey(start);
  const title = document.getElementById('manualCallModalTitle');
  const subtitle = document.getElementById('manualCallModalSubtitle');
  if (title) title.textContent = translateText('Guardar llamada');
  if (subtitle) subtitle.textContent = ui`Llamada terminada: ${timeLabelFromDate(start)} – ${timeLabelFromDate(end)} (${formatDuration(durationMin * 60000)}). Ajusta lo que haga falta antes de guardarla.`;
  prefillManualCallForm({ dayKey: calendarDayKey, startDate: start, durationMin });
  openModal('manualCallModal');
}

function rollbackPendingLiveBackup() {
  const pending = state.pendingLiveCallBackup;
  const context = pending?.liveContext;
  ignorePropioCall(state, pending?.candidate?.propioBridge?.callId || context?.propioBridge?.callId);

  if (context?.interruptedPauseRollback) {
    const rollback = context.interruptedPauseRollback;
    if (rollback.pauseHistoryId) state.pauseHistory = state.pauseHistory.filter(p => p?.id !== rollback.pauseHistoryId);
    if (rollback.pauseEndEventId) state.events = state.events.filter(e => e?.id !== rollback.pauseEndEventId);
    if (rollback.pause) state.activePause = { ...rollback.pause };
  }

  if (context?.autoStartedShift) {
    if (context.autoShiftEventId) state.events = state.events.filter(event => event?.id !== context.autoShiftEventId);
    state.shiftStartedAt = context.previousShiftStartedAt || null;
    state.shiftEndedAt = context.previousShiftEndedAt || null;
    if (context.gameBeforeAutoShift) state.game = restoreAutomaticGameChanges(state.game, context.gameBeforeAutoShift, context.gameAfterAutoShift);
  }

  const affectedDayKey = callDateKeyFromValue(pending?.candidate?.callDate)
    || (pending?.startedAtISO ? todayCallDateKey(new Date(pending.startedAtISO)) : todayCallDateKey());
  state.pendingLiveCallBackup = null;
  manualCallLiveBackupPending = false;
  reconcileLastCallEndedAt(affectedDayKey);
}

export function restorePendingLiveCallBackup() {
  const pending = state.pendingLiveCallBackup;
  if (!pending?.startedAtISO || !pending?.endedAtISO) return false;
  if (!pending.candidate) {
    pending.candidate = observedLiveCallCandidate(pending.startedAtISO, pending.endedAtISO, pending.liveContext);
    if (!pending.candidate) return false;
  }
  manualCallLiveBackupPending = true;
  openManualCallModalFromLiveCall(pending.startedAtISO, pending.endedAtISO, pending.candidate);
  return true;
}

// Punto único de salida para cerrar #manualCallModal desde cualquier camino (botón "×", click fuera
// del modal, tecla Escape).
export function requestCloseManualCallModal() {
  if (!manualCallLiveBackupPending) {
    closeModal('manualCallModal');
    return;
  }
  const owner = state, preferences = settings, pending = state.pendingLiveCallBackup;
  const signature = () => JSON.stringify([state.pendingLiveCallBackup, state.activeCall, state.activePause,
    state.shiftStartedAt, state.shiftEndedAt, state.pauseHistory, state.game]);
  const expected = signature();
  let settled = false;
  appConfirm(translateText('¿Descartar esta llamada sin guardarla? La llamada que acabas de colgar se perderá por completo — no quedará ningún registro de ese tiempo trabajado.'), () => {
    if (settled) return false;
    settled = true;
    if (state !== owner || settings !== preferences || signature() !== expected || !callContext.canPersistLocalChanges()) {
      toast(translateText('La actividad cambió. Revisá de nuevo antes de descartarla.'));
      return false;
    }
    const before = JSON.parse(JSON.stringify(state));
    try {
      rollbackPendingLiveBackup();
      if (saveAll() === false) throw Error('SAVE_REJECTED');
    } catch {
      setAppState(before);
      manualCallLiveBackupPending = true;
      callContext.render?.();
      toast(translateText('No se guardó el descarte. Tu actividad anterior se conservó.'));
      return false;
    }
    closeModal('manualCallModal');
    if (pending?.liveContext?.autoStartedShift) {
      const day = callDateKeyFromValue(pending.candidate?.callDate) || todayCallDateKey(new Date(pending.startedAtISO));
      onGameCallsChanged(day);
      callContext.onGameDayMetadataChanged?.(day);
    }
    return true;
  });
}

// Aplica el tile elegido en Agregar llamada manual: recalcula el estimado de Pago contra la tasa de
// ese nivel.
export function applyRateTileToManualCall(tileKey) {
  manualCallSelectedRateTile = tileKey;
  renderRateTiles('manualCallRateTiles', tileKey);
  manualCallPayDirty = false;
  updateManualCallPreview();
}

function restoreLiveBackupTiming(candidate, original, callDate, callStart) {
  if (!candidate || !original) return candidate;
  const start = new Date(original.startISO);
  const calendarDate = callDateKeyFromValue(original.calendarCallDate) || todayCallDateKey(start);
  const startLabel = original.callStart || callStartLabelFromHHMM(`${pad(start.getHours())}:${pad(start.getMinutes())}`);
  const result = { ...candidate, source: 'live', importedAt: original.importedAt || new Date().toISOString() };
  // Sin cambios de fecha/hora, conserva los segundos y el día contable originales.
  if (Number.isFinite(start.getTime()) && callDate === calendarDate && callStart === startLabel) {
    Object.assign(result, {
      callDate: original.callDate, shiftDayKey: original.shiftDayKey, calendarCallDate: original.calendarCallDate,
      id: original.id || candidate.id, startISO: original.startISO,
      endISO: Number(original.durationMin) === candidate.durationMin ? original.endISO
        : new Date(start.getTime() + candidate.durationMin * 60000).toISOString(),
    });
  }
  if (original.records) result.records = JSON.parse(JSON.stringify(original.records));
  result.durationMs = Math.max(0, Date.parse(result.endISO) - Date.parse(result.startISO));
  return result;
}

export function updateManualCallPreview() {
  const durationInput = document.getElementById('manualCallDurationInput');
  const payInput = document.getElementById('manualCallPayInput');
  const preview = document.getElementById('manualCallPreviewText');
  const duration = Number(durationInput?.value);
  const validDuration = !!String(durationInput?.value ?? '').trim() && !durationInput?.validity?.badInput
    && Number.isFinite(duration) && duration >= 0 && duration <= MAX_CALL_DURATION_MIN;

  if (validDuration && !manualCallPayDirty && payInput) {
    payInput.value = manualCallEstimatedPay(duration, manualCallSelectedRateTile).toFixed(2);
  }
  if (preview) {
    const callDate = dayKeyFromIsoDate(document.getElementById('manualCallDateInput')?.value);
    const callStart = callStartLabelFromHHMM(document.getElementById('manualCallStartInput')?.value);
    const start = callDate && callStart ? toDateFromInputs(callDate, callStart) : null;
    const amount = readNumericCallPay(payInput?.value);
    if (!validDuration || !start || amount === null || payInput?.validity?.badInput) { preview.textContent = translateText('Completa fecha, hora, duración y pago válidos para revisar la llamada.'); return; }
    const calculatedEnd = new Date(start.getTime() + duration * 60000);
    const original = manualCallLiveBackupPending && state.pendingLiveCallBackup?.candidate;
    const draft = restoreLiveBackupTiming({ ...callAccountingFields(start, callDate), startISO: start.toISOString(), endISO: calculatedEnd.toISOString(), durationMin: duration, payEstimateRule: PAY_ESTIMATE_RULE }, original, callDate, callStart);
    const end = new Date(draft.endISO);
    const base = manualCallPayWithoutDuplicateRateBonus(draft, amount);
    const overlap = calls.find(call => callsOverlap(call, draft));
    const warning = end.getTime() > Date.now() ? translateText('No se puede guardar: termina en el futuro.')
      : overlap ? ui`No se puede guardar: coincide con #${overlap.customerId}.` : translateText('Fecha y duración listas para guardar.');
    preview.textContent = ui`${formatCallDayLabel(draft.callDate)} · ${timeLabelFromDate(start)} → ${timeLabelFromDate(end)} · ${formatDuration(duration * 60000)}. Pago base: ${money(Number(base))} ${convertedAmountText(Number(base))}. ${warning}`;
  }
}

// Arma el objeto "llamada" a partir de datos ya resueltos (fecha/hora/
// duración/billable/dropped/pago/customerId)
function buildManualCallCandidate({ customerId, callDate, callStart, durationMin, billable, dropped, pay }) {
  const start = toDateFromInputs(callDate, callStart);
  if (!start) return null;
  const end = new Date(start.getTime() + durationMin * 60000);
  const accounting = callAccountingFields(start, callDate);
  return {
    id: makeLocalId(),
    // Mismo patrón que ya se ve en pantalla para llamadas manuales (Tabla completa/tarjetas mobile
    // ya renderizan "#Manual" cuando no hay customer ID real)
    customerId: String(customerId || '').trim() || 'Manual',
    ...accounting,
    callStart,
    durationMin,
    billable,
    dropped,
    pay,
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    countsAsProductive: billable === 'Yes' && dropped === 'No',
    source: 'manual',
    payEstimateRule: PAY_ESTIMATE_RULE,
    // Se marca "importada ahora" igual que una fila pegada (importCalls)
    importedAt: new Date().toISOString(),
  };
}

// A diferencia de buildManualCallCandidate, aquí el inicio y el fin traen segundos reales, no salen
// de un <input type="time">.
function buildLiveCallCandidate({ customerId, startedAtISO, endedAtISO, billable, dropped, pay }) {
  const start = new Date(startedAtISO);
  const rawEnd = new Date(endedAtISO);
  if (Number.isNaN(start.getTime()) || Number.isNaN(rawEnd.getTime())) return null;
  const elapsedMs = Math.max(0, rawEnd.getTime() - start.getTime());
  const durationMin = elapsedMs / 60000;
  // La duración observada conserva todos los segundos; el pago se calcula aparte.
  const end = rawEnd.getTime() > start.getTime() ? rawEnd : new Date(start.getTime() + durationMin * 60000);
  const accounting = callAccountingFields(start, todayCallDateKey(start));
  return {
    id: makeLocalId(),
    customerId: String(customerId || '').trim() || 'Manual',
    ...accounting,
    // CallStart es solo el texto que se ve en Tabla de llamadas — se deriva igual que siempre
    // (hora/minuto), pero NO se usa para calcular startISO/endISO (ver arriba)
    callStart: callStartLabelFromHHMM(`${pad(start.getHours())}:${pad(start.getMinutes())}`),
    durationMin,
    durationMs: elapsedMs,
    billable,
    dropped,
    pay,
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    countsAsProductive: billable === 'Yes' && dropped === 'No',
    source: 'live',
    payEstimateRule: PAY_ESTIMATE_RULE,
    importedAt: new Date().toISOString(),
  };
}

// Revisa traslape/duplicado exacto (mismas 2 validaciones que ya protegían
// importCalls/saveCallEditor/el modal manual) y, si pasa, guarda la llamada en `calls` y actualiza
// el día activo. NO llama a saveAll/toast.
function trySaveCallCandidate(candidate) {
  if (!candidate) return { ok: false, reason: translateText('Fecha u hora inválida') };
  if (state.activeCall && callsOverlap(candidate, { startISO: state.activeCall.startedAt, endISO: new Date().toISOString() })) {
    return { ok: false, reason: translateText('No se puede guardar: coincide con la llamada en curso.') };
  }
  const overlapsWith = calls.find(c => callsOverlap(c, candidate));
  if (overlapsWith) {
    return { ok: false, reason: ui`Esa hora se traslapa con la llamada #${overlapsWith.customerId} (${overlapsWith.callStart}). Ajusta la hora o la duración.` };
  }
  const key = callDedupeKey(candidate);
  // Different bridge call IDs can have the same displayed minute, duration and
  // estimated pay. Their precise intervals above still protect against overlaps.
  if (calls.some(c => candidate.propioBridge?.callId && c.propioBridge?.callId
    ? c.propioBridge.callId === candidate.propioBridge.callId : callDedupeKey(c) === key)) {
    return { ok: false, reason: translateText('Ya existe una llamada idéntica guardada (mismo cliente, fecha, hora, duración, pago, billable y dropped).') };
  }
  setCalls([...calls, candidate].sort((a, b) => new Date(a.startISO) - new Date(b.startISO)));
  // Igual que importCalls, si agregaste la llamada para un día distinto al que estabas viendo, "Día
  // activo" salta a ese día para que la veas de inmediato reflejada.
  state.activeDayKey = candidate.callDate;
  return { ok: true };
}

function manualCallPayWithoutDuplicateRateBonus(candidate, pay) {
  const tileBonus = HIGHER_RATE_TIERS[manualCallSelectedRateTile]?.bonusPerMin || 0;
  const windowBonus = higherRateBonusForCall(candidate);
  const duration = callPayMinutes(candidate);
  if (!tileBonus || !windowBonus || duration <= 0) return pay;
  const duplicate = Math.min(tileBonus, windowBonus.amount / duration) * duration;
  return Math.max(0, parseMoney(pay) - duplicate).toFixed(2);
}

export function saveManualCall() {
  if (!callContext.canPersistLocalChanges()) return false;
  const dateInput = document.getElementById('manualCallDateInput');
  const startInput = document.getElementById('manualCallStartInput');
  const durationInput = document.getElementById('manualCallDurationInput');
  const payInput = document.getElementById('manualCallPayInput');
  const billableInput = document.getElementById('manualCallBillableInput');
  const droppedInput = document.getElementById('manualCallDroppedInput');
  const customerIdInput = document.getElementById('manualCallCustomerIdInput');

  const callDate = dayKeyFromIsoDate(dateInput?.value);
  if (!callDate) {
    toast(translateText('Elige una fecha válida'));
    return;
  }
  const duration = Number(durationInput?.value);
  if (!String(durationInput?.value ?? '').trim() || durationInput?.validity?.badInput
    || !Number.isFinite(duration) || duration < 0 || duration > MAX_CALL_DURATION_MIN) {
    toast(ui`La duración debe ser un número entre 0 y ${MAX_CALL_DURATION_MIN} minutos`);
    return;
  }
  const callStart = callStartLabelFromHHMM(startInput?.value);
  if (!callStart) {
    toast(translateText('Elige una hora válida'));
    return;
  }
  const billable = billableInput?.value === 'Yes' ? translateText('Yes') : translateText('No');
  const dropped = droppedInput?.value === 'Yes' ? translateText('Yes') : translateText('No');
  const amount = readNumericCallPay(payInput?.value, manualCallEstimatedPay(duration));
  if (payInput?.validity?.badInput || amount === null) {
    toast(translateText('El pago debe ser un número válido de hasta 1000000000 dólares.'));
    return false;
  }
  const pay = amount.toFixed(2);
  const customerId = customerIdInput?.value || '';

  const pendingBackup = manualCallLiveBackupPending ? state.pendingLiveCallBackup : null;
  let candidate = buildManualCallCandidate({ customerId, callDate, callStart, durationMin: duration, billable, dropped, pay });
  candidate = restoreLiveBackupTiming(candidate, pendingBackup?.candidate, callDate, callStart);
  if (candidate && pendingBackup?.candidate?.propioBridge) candidate.propioBridge = { ...pendingBackup.candidate.propioBridge };
  if (candidate && new Date(candidate.endISO).getTime() > Date.now()) {
    toast(translateText('La llamada no puede terminar en el futuro'));
    return;
  }
  if (candidate && manualCallSelectedRateTile) candidate.pay = manualCallPayWithoutDuplicateRateBonus(candidate, candidate.pay);
  const previous = { calls, state: JSON.parse(JSON.stringify(state)), settings: JSON.parse(JSON.stringify(settings)) };
  const result = trySaveCallCandidate(candidate);
  if (!result.ok) {
    toast(result.reason);
    return false;
  }
  // Guardado exitoso (sea "Agregar llamada manual" normal o el respaldo de una llamada en vivo): ya
  // no hay nada que perder al cerrar, se apaga la bandera antes de cerrar sin preguntar.
  const affectedDayKey = callDateKeyFromValue(candidate.callDate) || callDate;
  state.pendingLiveCallBackup = null;
  reconcileLastCallEndedAt(affectedDayKey);
  financeRunAutoFillCascade();
  if (saveAll() === false) {
    setCalls(previous.calls); setAppState(previous.state); setAppSettings(previous.settings); callContext.render?.(); return false;
  }
  manualCallLiveBackupPending = false;
  closeModal('manualCallModal');
  if (affectedDayKey === todayCallDateKey() && !state.shiftStartedAt && !state.shiftEndedAt) autoStartShiftFromCalls(true);
  toast(translateText('Llamada agregada'));
  playCallSavedSound?.(pendingBackup ? 'callEnded' : 'callManual');
  onGameCallSaved(candidate, pendingBackup ? 'live' : 'manual');
  onGameCallsChanged(affectedDayKey);
}

// Terminar una llamada y querer empezar otra de inmediato (mismo minuto o cualquier otro) "no
// dejaba" — el modal de "Guardar llamada" cubre toda la pantalla y bloquea el click a "Iniciar
// llamada" hasta resolverlo.
function observedLiveCallCandidate(startedAtISO, endedAtISO, liveContext) {
  const elapsedMs = Math.max(0, new Date(endedAtISO).getTime() - new Date(startedAtISO).getTime());
  const pay = (roundedPayMinutes(elapsedMs / 60000) * rateTilePerMin('normal')).toFixed(2);
  const candidate = buildLiveCallCandidate({
    customerId: '',
    startedAtISO,
    endedAtISO,
    billable: 'Yes',
    dropped: 'No',
    pay,
  });
  if (candidate && liveContext?.propioBridge?.callId) {
    candidate.id = `propio_${liveContext.propioBridge.callId}`;
    candidate.customerId = 'Propio';
    candidate.propioBridge = { ...liveContext.propioBridge };
  }
  if (candidate) candidate.records = { tool: observedCallRecord(candidate) };
  return candidate;
}

export function autoSaveLiveCall(startedAtISO, endedAtISO, liveContext = null) {
  if (liveContext?.propioBridge && !callFeedbackSilenced()) return withSilentCallFeedback(() => autoSaveLiveCall(startedAtISO, endedAtISO, liveContext));
  const elapsedMs = Math.max(0, new Date(endedAtISO).getTime() - new Date(startedAtISO).getTime());
  const durationMin = elapsedMs / 60000;
  const candidate = observedLiveCallCandidate(startedAtISO, endedAtISO, liveContext);
  const previous = { calls, state: JSON.parse(JSON.stringify(state)), settings: JSON.parse(JSON.stringify(settings)) };
  const result = trySaveCallCandidate(candidate);

  if (result.ok) {
    state.pendingLiveCallBackup = null;
    financeRunAutoFillCascade();
    if (saveAll() === false) {
      setCalls(previous.calls); setAppState(previous.state); setAppSettings(previous.settings);
      state.pendingLiveCallBackup = { startedAtISO, endedAtISO, candidate, liveContext: liveContext ? JSON.parse(JSON.stringify(liveContext)) : null };
      manualCallLiveBackupPending = true;
      callContext.render?.();
      return false;
    }
    if (!callFeedbackSilenced()) {
      toast(ui`Llamada guardada (${formatDuration(durationMin * 60000)}) — edítala en Tabla de llamadas si hace falta`);
      playCallSavedSound?.('callEnded');
    }
    onGameCallSaved(candidate, 'live');
    return true;
  }

  state.pendingLiveCallBackup = {
    startedAtISO,
    endedAtISO,
    candidate,
    liveContext: liveContext ? JSON.parse(JSON.stringify(liveContext)) : null,
  };
  manualCallLiveBackupPending = true;
  // Persistir ANTES de abrir el modal: un refresh aquí ya no puede comerse la llamada.
  if (saveAll() === false) return false;
  toast(result.reason);
  openManualCallModalFromLiveCall(startedAtISO, endedAtISO, candidate);
  return false;
}

// Fusión de "Turno de Hoy" dentro de la tabla de llamadas. Arma las filas de "acción" del día —
// reutiliza 100% datos que la app ya calculaba, sin ningún registro nuevo.
function dayActionRows(dayKey) {
  const normalized = callDateKeyFromValue(dayKey);
  const rows = [];

  dayEvents(normalized).forEach(e => {
    if (!['shift', 'break', 'lunch', 'import'].includes(e.type)) return;
    let durationMin = null;
    // Para "Break/Lunch terminado" se busca la pausa real más cercana en el tiempo (mismo tipo,
    // mismo día) para mostrar cuánto duró — mismo dato que ya se ve en "Bloques del día", aquí como
    // referencia rápida. Tolerancia de 5s.
    if (/terminado/i.test(e.title) && (e.type === 'break' || e.type === 'lunch')) {
      const closeTime = new Date(e.ts).getTime();
      let best = null, bestDiff = Infinity;
      state.pauseHistory.forEach(p => {
        if (p.type !== e.type || !sameCallDay(p.endedAt, normalized)) return;
        const diff = Math.abs(new Date(p.endedAt).getTime() - closeTime);
        if (diff < bestDiff) { bestDiff = diff; best = p; }
      });
      if (best && bestDiff < 5000) {
        durationMin = Math.max(0, (new Date(best.endedAt).getTime() - new Date(best.startedAt).getTime()) / 60000);
      }
    }
    const connection = e.type === 'shift' && String(e.meta || '').toLowerCase() === 'propio';
    rows.push({
      ts: e.ts,
      badgeLabel: connection ? translateText('Conexión') : e.type === 'shift' ? translateText('Shift') : e.type === 'break' ? translateText('Break') : e.type === 'lunch' ? translateText('Lunch') : translateText('Importación'),
      badgeClass: `type-${e.type}`,
      detail: connection ? (/iniciado/i.test(e.title) ? translateText('Conexión a Propio detectada') : translateText('Conexión a Propio finalizada')) : e.title,
      note: '',
      durationMin,
      editable: false,
      gapKey: null,
    });
  });

  const connectionStarts = dayEvents(normalized).filter(event => event.type === 'shift' && /iniciado/i.test(event.title || '') &&
    String(event.meta || '').toLowerCase() === 'propio').map(event => Date.parse(event.ts));
  if (connectionStarts.length) dayWorkSessions(normalized).forEach(session => {
    if (!connectionStarts.includes(session.connectionStart.getTime())) return;
    rows.push({ ts: session.start.toISOString(), badgeLabel: translateText('Shift'), badgeClass: 'type-shift',
      detail: translateText('Inicio de turno'), note: '', durationMin: null, editable: false, gapKey: null });
  });

  dayGapRows(normalized).forEach(g => {
    if (g.raw <= 0) return;
    // Un hueco ACW/Otro reclasificado a mano como Break/Lunch desde "Editar hueco" pasaba a
    // excluirse de esta lista (el filtro solo dejaba pasar label==='acw'/'other')
    const isAcwOrOther = g.label === 'acw' || g.label === 'other';
    const isManualBreakOrLunch = g.manual && (g.label === 'break' || g.label === 'lunch');
    if (!isAcwOrOther && !isManualBreakOrLunch) return;
    rows.push({
      ts: g.prev.endISO,
      badgeLabel: gapLabelText(g.label),
      badgeClass: `type-${g.label}`,
      detail: g.isShiftStartGap ? translateText('Inicio de turno → primera llamada') : translateText('Entre llamadas'),
      note: [g.manual ? translateText('Clasificado por vos') : '', g.note || ''].filter(Boolean).join(' · '),
      durationMin: g.displayAmount,
      editable: true,
      gapKey: g.gapKey,
    });
  });

  return rows;
}

let tableRenderSequence = 0;
export async function renderTable(options = {}) {
  if (document.getElementById('blocksCallsView')?.style.display === 'none') return;
  const owner = settings, sequence = ++tableRenderSequence;
  const view = await loadDetailViews({ retry: options.retry === true });
  if (owner !== settings || sequence !== tableRenderSequence) return;
  const status = document.getElementById('callTableLoadStatus'), retry = document.getElementById('callTableRetryBtn');
  if (status) status.hidden = !!view;
  if (retry) retry.hidden = !!view;
  if (view) view.renderCallTable({ ...callContext, state, ui, translateText, translateMarkup, dayActionRows, tableFilterMode });
}

// (Fase 4): "Resumen del día" + "Estadísticas" — 2 tarjetas nuevas de escritorio (ocultas en mobile
// vía CSS, ver.day-stats-grid), alimentadas por los MISMOS datos que ya calcula
// importedCallStats/dayAdherence para el resto de la app.
export function renderDayStatsCards() {
  const dayGrid = document.getElementById('dayStatsGrid');
  if (!dayGrid) return;
  const dayKey = getActiveDayKey();
  const dayCalls = callsForDay(dayKey);
  const stats = importedCallStats(dayCalls, dayKey);

  const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };

  setText('statsShortest', dayCalls.length ? formatDuration(stats.shortest * 60000) : '—');
  // Una llamada real de cero minutos no debe confundirse con un error del contador.
  const shortestNoteEl = document.getElementById('statsShortestNote');
  if (shortestNoteEl) {
    if (dayCalls.length && stats.shortest === 0 && stats.zeroCount > 0 && stats.shortestNonZero !== null) {
      const intro = stats.zeroCount === 1 ? translateText('1 llamada duró 0 min') : ui`${stats.zeroCount} llamadas duraron 0 min`;
      shortestNoteEl.textContent = ui`${intro} — sin contar esa(s), la más corta fue ${formatDuration(stats.shortestNonZero * 60000)}`;
      shortestNoteEl.style.display = '';
    } else {
      shortestNoteEl.style.display = 'none';
    }
  }
  setText('statsLongest', dayCalls.length ? formatDuration(stats.longest * 60000) : '—');
  setText('statsAvg', dayCalls.length ? formatDuration(stats.avg * 60000) : '—');

  setText('statsGapLongest', stats.gapLongest > 0 ? formatDuration(stats.gapLongest * 60000) : '—');
  setText('statsGapAvg', stats.gapAvg > 0 ? formatDuration(stats.gapAvg * 60000) : '—');
  const avgPay = dayCalls.length ? stats.earnings / dayCalls.length : 0;
  setText('statsAvgPay', dayCalls.length ? `${money(avgPay)}${convertedAmountText(avgPay) ? ` (${convertedAmountText(avgPay)})` : ''}` : '—');
}

export function setTableFilterMode(value) { tableFilterMode = value || 'all'; }
export function markManualCallPayDirty() { manualCallPayDirty = true; }
export function clearManualCallRateTile() { manualCallSelectedRateTile = null; }
export function getManualCallSelectedRateTile() { return manualCallSelectedRateTile; }
export function hasPendingManualCallBackup() { return manualCallLiveBackupPending; }
export function resetCallEditorState() { editingCallId = null; editingCallContext = null; }
