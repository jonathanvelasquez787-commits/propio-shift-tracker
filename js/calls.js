// Página Llamadas — quinto módulo de la Fase 3. Reúne el editor, alta manual,
// guardado de llamadas en vivo y la tabla/resumen diario. El modelo compartido
// permanece en app-main.js porque también alimenta Inicio, Reportes y Calendario.

import {
  HIGHER_RATE_TIERS,
  MAX_CALL_DURATION_MIN,
  appConfirm,
  autoStartShiftFromCalls,
  callDateKeyFromValue,
  callDedupeKey,
  calls,
  callsForDay,
  callsOverlap,
  closeModal,
  connectedMinutesForDay,
  convertedAmountText,
  dayAdherence,
  dayEvents,
  dayGapRows,
  dayKeyFromIsoDate,
  dayShiftBounds,
  escapeHtml,
  financeConvertedInline,
  financeConvertedNote,
  financeRunAutoFillCascade,
  formatCallDayLabel,
  formatDuration,
  formatHHMM,
  formatMinutes,
  gapLabelText,
  getActiveDayKey,
  higherRateBonusForCall,
  higherRateTierBadgeHtml,
  iconHtml,
  importedCallStats,
  isoDateFromDayKey,
  makeLocalId,
  money,
  onGameCallSaved,
  onGameCallsChanged,
  openModal,
  pad,
  parseMoney,
  rateTilePerMin,
  renderRateTiles,
  sameCallDay,
  saveAll,
  setCalls,
  settings,
  state,
  timeLabelFromDate,
  toDateFromInputs,
  toast,
  todayCallDateKey,
} from './app-main.js';

let editingCallId = null;

// Filtro Todo/Llamadas/Acciones sobre la tabla fusionada "Tabla de llamadas y acciones de hoy" (ver
// #tableFilterRow en el HTML y dayActionRows/renderTable más abajo). Vive en memoria, no en
// localStorage.
let tableFilterMode = 'all'; // 'all' | 'calls' | 'actions'.

function reconcileLastCallEndedAt(dayKey) {
  const normalized = callDateKeyFromValue(dayKey);
  const todayKey = todayCallDateKey();
  const shiftDayKey = state.shiftStartedAt ? todayCallDateKey(new Date(state.shiftStartedAt)) : '';
  if (!normalized || (normalized !== todayKey && normalized !== shiftDayKey)) return;
  const now = Date.now();
  const latest = callsForDay(normalized)
    .filter(call => {
      const end = new Date(call.endISO).getTime();
      return Number.isFinite(end) && end <= now;
    })
    .sort((a, b) => new Date(b.endISO) - new Date(a.endISO))[0];
  state.lastCallEndedAt = latest ? latest.endISO : null;
}

// Editor de una llamada ya importada: corrige duración, pago, billable y dropped.
export function openCallEditor(callId) {
  const call = calls.find(c => c.id === callId);
  if (!call) {
    toast('No pude encontrar esa llamada');
    return;
  }
  editingCallId = callId;
  const title = document.getElementById('callEditModalTitle');
  const preview = document.getElementById('callEditPreviewText');
  const durationInput = document.getElementById('callEditDurationInput');
  const payInput = document.getElementById('callEditPayInput');
  const billableInput = document.getElementById('callEditBillableInput');
  const droppedInput = document.getElementById('callEditDroppedInput');

  if (title) title.textContent = `Editar llamada · #${call.customerId}`;
  if (preview) preview.textContent = `${call.callDate} · ${call.callStart} — los datos de fecha/hora no se pueden editar aquí, solo duración, pago, billable y dropped.`;
  if (durationInput) durationInput.value = call.durationMin;
  if (payInput) payInput.value = parseMoney(call.pay).toFixed(2);
  if (billableInput) billableInput.value = String(call.billable).toLowerCase() === 'yes' ? 'Yes' : 'No';
  if (droppedInput) droppedInput.value = String(call.dropped).toLowerCase() === 'yes' ? 'Yes' : 'No';
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
      infoTextEl.innerHTML = `Esta llamada cae en una ventana <strong>${escapeHtml(tierLabel)}</strong> (+${money(tierMeta?.bonusPerMin || 0)}/min), así que ya suma <strong>${money(existingBonus.amount)}</strong>${financeConvertedInline(existingBonus.amount)} de bono aparte del Pago de arriba. Para cambiar el nivel, edita esa ventana en "Higher Rate" (botón del header) — no hace falta tocar el Pago.`;
      infoEl.style.display = '';
      warningEl.style.display = 'none';
    } else {
      warningTextEl.textContent = 'Esta llamada no cae en ninguna ventana de Higher Rate, así que no lleva bono. El nivel se calcula solo desde tus ventanas: agrégala o ajústala en "Higher Rate" (botón del header) y el bono se suma solo a esta llamada.';
      warningEl.style.display = '';
      infoEl.style.display = 'none';
    }
  }

  openModal('callEditModal');
}

export function saveCallEditor() {
  if (!editingCallId) return;
  const durationInput = document.getElementById('callEditDurationInput');
  const payInput = document.getElementById('callEditPayInput');
  const billableInput = document.getElementById('callEditBillableInput');
  const droppedInput = document.getElementById('callEditDroppedInput');

  const duration = Number(durationInput?.value);
  if (!Number.isFinite(duration) || duration < 0 || duration > MAX_CALL_DURATION_MIN) {
    toast(`La duración debe ser un número entre 0 y ${MAX_CALL_DURATION_MIN} minutos`);
    return;
  }
  // ParseMoney preserva el signo '-' a propósito (para poder leer valores ya negativos de datos
  // viejos/importados), así que un valor negativo tecleado a mano se guardaba tal cual.
  const pay = Math.max(0, parseMoney(payInput?.value)).toFixed(2);
  const billable = billableInput?.value === 'Yes' ? 'Yes' : 'No';
  const dropped = droppedInput?.value === 'Yes' ? 'Yes' : 'No';

  const original = calls.find(c => c.id === editingCallId);
  if (!original) return;
  const affectedDayKey = callDateKeyFromValue(original.callDate);
  const start = new Date(original.startISO);
  const end = new Date(start.getTime() + duration * 60000);
  if (end.getTime() > Date.now()) {
    toast('La llamada no puede terminar en el futuro');
    return;
  }
  const candidate = { ...original, startISO: start.toISOString(), endISO: end.toISOString() };

  // Alargar la duración puede encimar esta llamada con la siguiente o la anterior: se valida el
  // traslape.
  const overlapsWith = calls.find(c => c.id !== editingCallId && callsOverlap(c, candidate));
  if (overlapsWith) {
    toast(`Esa duración traslapa con la llamada #${overlapsWith.customerId} (${overlapsWith.callStart}). Ajusta la duración.`);
    return;
  }

  setCalls(calls.map(c => {
    if (c.id !== editingCallId) return c;
    // El startISO NO cambia (por eso no se puede editar fecha/hora aquí), así que las anotaciones
    // de gap ligadas a esta llamada (que usan startISO) siguen siendo válidas después de editar.
    return {
      ...c,
      durationMin: duration,
      pay,
      billable,
      dropped,
      endISO: end.toISOString(),
      countsAsProductive: billable === 'Yes' && dropped === 'No',
    };
  }));

  editingCallId = null;
  closeModal('callEditModal');
  if (affectedDayKey) reconcileLastCallEndedAt(affectedDayKey);
  financeRunAutoFillCascade();
  saveAll();
  if (affectedDayKey) onGameCallsChanged(affectedDayKey);
  toast('Llamada actualizada');
}

// Borra una llamada individual desde "Tabla completa" (botón "Eliminar" junto a "Editar", ver
// renderTable).
export function deleteCallRecord(callId) {
  const call = calls.find(c => c.id === callId);
  if (!call) return false;
  const affectedDayKey = callDateKeyFromValue(call.callDate);
  setCalls(calls.filter(c => c.id !== callId));
  if (affectedDayKey) reconcileLastCallEndedAt(affectedDayKey);
  financeRunAutoFillCascade();
  saveAll();
  if (affectedDayKey) onGameCallsChanged(affectedDayKey);
  toast('Llamada eliminada');
  return true;
}

// Botón "🗑️ Vaciar llamadas del día" dentro de "Tabla de llamadas" — distinto de "Reiniciar día"
// (que además borra pausas/turno/huecos/nota/log de ese día).
export function clearActiveDayCalls() {
  const dayKey = getActiveDayKey();
  const dayCallsList = callsForDay(dayKey);
  if (!dayCallsList.length) {
    toast('No hay llamadas que borrar en este día.');
    return;
  }
  const count = dayCallsList.length;
  const plural = count === 1 ? 'llamada' : 'llamadas';
  appConfirm(`¿Vaciar TODAS las ${plural} de ${formatCallDayLabel(dayKey)} (${count})? Tu turno, pausas y horario de ese día no se tocan. No se puede deshacer.`, () => {
    setCalls(calls.filter(c => callDateKeyFromValue(c.callDate) !== dayKey));
    reconcileLastCallEndedAt(dayKey);
    financeRunAutoFillCascade();
    saveAll();
    onGameCallsChanged(dayKey);
    toast(`${count} ${plural} de ${formatCallDayLabel(dayKey)} borrada(s)`);
  });
}

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
  const normalized = formatHHMM(hhmm);
  const [h, m] = normalized.split(':').map(Number);
  const hour12 = h % 12 || 12;
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${hour12}:${pad(m)} ${suffix}`;
}

// Estimado de pago = duración × tasa del tile elegido. Es solo un punto de partida editable.
function manualCallEstimatedPay(durationMin, tileKey = 'normal') {
  return Number((durationMin * rateTilePerMin(tileKey)).toFixed(2));
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
  if (title) title.textContent = 'Agregar llamada manual';
  if (subtitle) subtitle.textContent = 'Para una llamada que no vino en la exportación de Propio. Se guarda igual que cualquier otra fila — mismo cálculo de huecos, ACW y ganancias.';
  prefillManualCallForm({ dayKey: getActiveDayKey(), startDate: new Date(), durationMin: '' });
  openModal('manualCallModal');
}

// Desde, esta variante YA NO es el camino normal al terminar una llamada (ver autoSaveLiveCall más
// abajo, que guarda sola sin abrir nada)
function openManualCallModalFromLiveCall(startedAtISO, endedAtISO) {
  manualCallPayDirty = false;
  // Este modal SÍ representa una llamada real que ya se colgó y cuyo guardado automático falló
  // (traslape/duplicado)
  manualCallLiveBackupPending = true;
  const start = new Date(startedAtISO);
  const end = new Date(endedAtISO);
  const durationMin = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
  const title = document.getElementById('manualCallModalTitle');
  const subtitle = document.getElementById('manualCallModalSubtitle');
  if (title) title.textContent = 'Guardar llamada';
  if (subtitle) subtitle.textContent = `Llamada terminada: ${timeLabelFromDate(start)} – ${timeLabelFromDate(end)} (${formatDuration(durationMin * 60000)}). Ajusta lo que haga falta antes de guardarla.`;
  prefillManualCallForm({ dayKey: todayCallDateKey(start), startDate: start, durationMin });
  openModal('manualCallModal');
}

// Punto único de salida para cerrar #manualCallModal desde cualquier camino (botón "×", click fuera
// del modal, tecla Escape).
export function requestCloseManualCallModal() {
  if (!manualCallLiveBackupPending) {
    closeModal('manualCallModal');
    return;
  }
  appConfirm('¿Descartar esta llamada sin guardarla? La llamada que acabas de colgar se perderá por completo — no quedará ningún registro de ese tiempo trabajado.', () => {
    manualCallLiveBackupPending = false;
    closeModal('manualCallModal');
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

export function updateManualCallPreview() {
  const durationInput = document.getElementById('manualCallDurationInput');
  const payInput = document.getElementById('manualCallPayInput');
  const preview = document.getElementById('manualCallPreviewText');
  const duration = Number(durationInput?.value);
  const validDuration = Number.isFinite(duration) && duration >= 0;

  if (validDuration && !manualCallPayDirty && payInput) {
    payInput.value = manualCallEstimatedPay(duration, manualCallSelectedRateTile).toFixed(2);
  }
  if (preview) {
    preview.textContent = validDuration
      ? `Se guardará como ${formatDuration(duration * 60000)} de llamada.`
      : 'Completa los campos para agregar la llamada.';
  }
}

// Arma el objeto "llamada" a partir de datos ya resueltos (fecha/hora/
// duración/billable/dropped/pago/customerId)
function buildManualCallCandidate({ customerId, callDate, callStart, durationMin, billable, dropped, pay }) {
  const start = toDateFromInputs(callDate, callStart);
  if (!start) return null;
  const end = new Date(start.getTime() + durationMin * 60000);
  return {
    id: makeLocalId(),
    // Mismo patrón que ya se ve en pantalla para llamadas manuales (Tabla completa/tarjetas mobile
    // ya renderizan "#Manual" cuando no hay customer ID real)
    customerId: String(customerId || '').trim() || 'Manual',
    callDate,
    callStart,
    durationMin,
    billable,
    dropped,
    pay,
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    countsAsProductive: billable === 'Yes' && dropped === 'No',
    source: 'manual',
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
  const durationMin = Math.round((elapsedMs / 60000) * 100) / 100;
  // Si el fin no quedó después del inicio, se reconstruye con la duración redondeada.
  const end = rawEnd.getTime() > start.getTime() ? rawEnd : new Date(start.getTime() + durationMin * 60000);
  const shiftStart = state.shiftStartedAt ? new Date(state.shiftStartedAt) : null;
  const shiftEnd = state.shiftEndedAt ? new Date(state.shiftEndedAt) : null;
  const belongsToTrackedShift = shiftStart
    && Number.isFinite(shiftStart.getTime())
    && start.getTime() >= shiftStart.getTime()
    && (!shiftEnd || !Number.isFinite(shiftEnd.getTime()) || start.getTime() <= shiftEnd.getTime());
  const calendarCallDate = todayCallDateKey(start);
  const accountingCallDate = belongsToTrackedShift ? todayCallDateKey(shiftStart) : calendarCallDate;
  return {
    id: makeLocalId(),
    customerId: String(customerId || '').trim() || 'Manual',
    callDate: accountingCallDate,
    ...(belongsToTrackedShift ? { shiftDayKey: accountingCallDate } : {}),
    ...(accountingCallDate !== calendarCallDate ? { calendarCallDate } : {}),
    // CallStart es solo el texto que se ve en Tabla de llamadas — se deriva igual que siempre
    // (hora/minuto), pero NO se usa para calcular startISO/endISO (ver arriba)
    callStart: callStartLabelFromHHMM(`${pad(start.getHours())}:${pad(start.getMinutes())}`),
    durationMin,
    billable,
    dropped,
    pay,
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    countsAsProductive: billable === 'Yes' && dropped === 'No',
    source: 'live',
    importedAt: new Date().toISOString(),
  };
}

// Revisa traslape/duplicado exacto (mismas 2 validaciones que ya protegían
// importCalls/saveCallEditor/el modal manual) y, si pasa, guarda la llamada en `calls` y actualiza
// el día activo. NO llama a saveAll/toast.
function trySaveCallCandidate(candidate) {
  if (!candidate) return { ok: false, reason: 'Fecha u hora inválida' };
  const overlapsWith = calls.find(c => callsOverlap(c, candidate));
  if (overlapsWith) {
    return { ok: false, reason: `Esa hora se traslapa con la llamada #${overlapsWith.customerId} (${overlapsWith.callStart}). Ajusta la hora o la duración.` };
  }
  const key = callDedupeKey(candidate);
  if (calls.some(c => callDedupeKey(c) === key)) {
    return { ok: false, reason: 'Ya existe una llamada idéntica guardada (mismo cliente, fecha, hora, duración, pago, billable y dropped).' };
  }
  setCalls([...calls, candidate].sort((a, b) => new Date(a.startISO) - new Date(b.startISO)));
  // Igual que importCalls, si agregaste la llamada para un día distinto al que estabas viendo, "Día
  // activo" salta a ese día para que la veas de inmediato reflejada.
  state.activeDayKey = candidate.callDate;
  return { ok: true };
}

export function saveManualCall() {
  const dateInput = document.getElementById('manualCallDateInput');
  const startInput = document.getElementById('manualCallStartInput');
  const durationInput = document.getElementById('manualCallDurationInput');
  const payInput = document.getElementById('manualCallPayInput');
  const billableInput = document.getElementById('manualCallBillableInput');
  const droppedInput = document.getElementById('manualCallDroppedInput');
  const customerIdInput = document.getElementById('manualCallCustomerIdInput');

  const callDate = dayKeyFromIsoDate(dateInput?.value);
  if (!callDate) {
    toast('Elige una fecha válida');
    return;
  }
  const duration = Number(durationInput?.value);
  if (!Number.isFinite(duration) || duration < 0 || duration > MAX_CALL_DURATION_MIN) {
    toast(`La duración debe ser un número entre 0 y ${MAX_CALL_DURATION_MIN} minutos`);
    return;
  }
  const callStart = callStartLabelFromHHMM(startInput?.value);
  const billable = billableInput?.value === 'Yes' ? 'Yes' : 'No';
  const dropped = droppedInput?.value === 'Yes' ? 'Yes' : 'No';
  const pay = Math.max(0, parseMoney(payInput?.value || manualCallEstimatedPay(duration))).toFixed(2);
  const customerId = customerIdInput?.value || '';

  const candidate = buildManualCallCandidate({ customerId, callDate, callStart, durationMin: duration, billable, dropped, pay });
  if (candidate && new Date(candidate.endISO).getTime() > Date.now()) {
    toast('La llamada no puede terminar en el futuro');
    return;
  }
  const result = trySaveCallCandidate(candidate);
  if (!result.ok) {
    toast(result.reason);
    return;
  }
  // Guardado exitoso (sea "Agregar llamada manual" normal o el respaldo de una llamada en vivo): ya
  // no hay nada que perder al cerrar, se apaga la bandera antes de cerrar sin preguntar.
  manualCallLiveBackupPending = false;
  closeModal('manualCallModal');
  reconcileLastCallEndedAt(callDate);
  if (callDate === todayCallDateKey() && !state.shiftStartedAt && !state.shiftEndedAt) {
    autoStartShiftFromCalls(true);
  }
  financeRunAutoFillCascade();
  saveAll();
  onGameCallSaved(candidate, 'manual');
  onGameCallsChanged(callDate);
  toast('Llamada agregada');
}

// Terminar una llamada y querer empezar otra de inmediato (mismo minuto o cualquier otro) "no
// dejaba" — el modal de "Guardar llamada" cubre toda la pantalla y bloquea el click a "Iniciar
// llamada" hasta resolverlo.
export function autoSaveLiveCall(startedAtISO, endedAtISO) {
  const elapsedMs = Math.max(0, new Date(endedAtISO).getTime() - new Date(startedAtISO).getTime());
  const durationMin = Math.round((elapsedMs / 60000) * 100) / 100;
  const pay = manualCallEstimatedPay(durationMin, 'normal').toFixed(2);

  const candidate = buildLiveCallCandidate({
    customerId: '',
    startedAtISO,
    endedAtISO,
    billable: 'Yes',
    dropped: 'No',
    pay,
  });
  const result = trySaveCallCandidate(candidate);

  if (result.ok) {
    financeRunAutoFillCascade();
    saveAll();
    onGameCallSaved(candidate, 'live');
    toast(`Llamada guardada (${formatDuration(durationMin * 60000)}) — edítala en Tabla de llamadas si hace falta`);
    return true;
  }
  toast(result.reason);
  openManualCallModalFromLiveCall(startedAtISO, endedAtISO);
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
    rows.push({
      ts: e.ts,
      badgeLabel: e.type === 'shift' ? 'Shift' : e.type === 'break' ? 'Break' : e.type === 'lunch' ? 'Lunch' : 'Importación',
      badgeClass: `type-${e.type}`,
      detail: e.title,
      note: '',
      durationMin,
      editable: false,
      gapKey: null,
    });
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
      detail: g.isShiftStartGap ? 'Inicio de turno → primera llamada' : 'Entre llamadas',
      note: g.note || '',
      durationMin: g.displayAmount,
      editable: true,
      gapKey: g.gapKey,
    });
  });

  return rows;
}

export function renderTable() {
      const wrap = document.getElementById('callTableWrap');
      const dayKey = getActiveDayKey();
      const clearDayCallsDayLabel = document.getElementById('clearDayCallsDayLabel');
      if (clearDayCallsDayLabel) clearDayCallsDayLabel.textContent = formatCallDayLabel(dayKey);

      const sortedCalls = [...callsForDay(dayKey)].sort((a, b) => new Date(a.startISO) - new Date(b.startISO));
      const actionRows = dayActionRows(dayKey);

      // Entradas combinadas — cada una con un `ts` común para poder ordenar todo junto
      // cronológicamente, sin importar si es llamada o acción. `kind` decide qué plantilla de fila
      // usar más abajo.
      const entries = [];
      sortedCalls.forEach(c => entries.push({ kind: 'call', ts: c.startISO, call: c }));
      actionRows.forEach(a => entries.push({ kind: 'action', ts: a.ts, action: a }));

      if (!entries.length) {
        wrap.innerHTML = '<div class="note" style="padding:14px;">No hay filas para el día activo. La vista se alimenta de las llamadas importadas, tus acciones del turno (Shift/Break/Lunch/ACW) y del día seleccionado.</div>';
        return;
      }

      // Filtro Todo/Llamadas/Acciones (ver #tableFilterRow en el HTML) sobre la tabla fusionada.
      const filtered = entries.filter(e => {
        if (tableFilterMode === 'calls') return e.kind === 'call';
        if (tableFilterMode === 'actions') return e.kind === 'action';
        return true;
      });

      if (!filtered.length) {
        wrap.innerHTML = '<div class="note" style="padding:14px;">No hay filas de este tipo para el día activo — cambia el filtro de arriba para ver el resto.</div>';
        return;
      }

      // Más recientes primero, mismo criterio de siempre.
      filtered.sort((a, b) => new Date(b.ts) - new Date(a.ts));

      const ROW_TYPE_ICON = {
        'type-shift': 'play',
        'type-break': 'coffee',
        'type-lunch': 'utensils',
        'type-acw': 'timer',
        'type-other': 'circle',
        'type-import': 'clipboard',
      };

      const rowsHtml = filtered.map(entry => {
        if (entry.kind === 'call') {
          const c = entry.call;
          const billableText = String(c.billable).toLowerCase() === 'yes' ? 'Billable' : 'No billable';
          const droppedText = String(c.dropped).toLowerCase() === 'yes' ? 'Dropped' : 'No dropped';
          const higherRateBonus = higherRateBonusForCall(c);
          const higherRateBadge = higherRateBonus ? higherRateTierBadgeHtml(higherRateBonus.tier, higherRateBonus.amount) : '';

          return `
            <div class="tbl-row">
              <span class="tbl-row-icon type-call">${iconHtml('phone')}</span>
              <div class="tbl-row-main">
                <div class="tbl-row-title">#${escapeHtml(c.customerId)} <span class="tbl-type-badge type-call">Llamada</span></div>
                <div class="tbl-row-sub">${escapeHtml(billableText)} · ${escapeHtml(droppedText)}</div>
              </div>
              <div class="tbl-row-right">
                <div class="tbl-row-amount">${money(parseMoney(c.pay))}</div>
                ${financeConvertedNote(parseMoney(c.pay))}
                <div class="tbl-row-time">${escapeHtml(c.callStart)} · ${c.durationMin} min</div>
                ${higherRateBadge}
              </div>
              <div class="tbl-row-actions">
                <button class="tbl-icon-btn" type="button" data-call-edit="${escapeHtml(c.id || '')}" aria-label="Editar llamada">${iconHtml('edit')}</button>
                <button class="tbl-icon-btn bad" type="button" data-call-delete="${escapeHtml(c.id || '')}" aria-label="Eliminar llamada">${iconHtml('trash')}</button>
              </div>
            </div>
          `;
        }

        const a = entry.action;
        const hora = timeLabelFromDate(new Date(a.ts));
        const hasDuration = a.durationMin !== null && a.durationMin !== undefined;
        const durationText = hasDuration ? `${formatMinutes(a.durationMin)} min` : '';
        const editBtn = a.editable && a.gapKey
          ? `<button class="tbl-icon-btn" type="button" data-gap-edit="${escapeHtml(a.gapKey)}" data-gap-day="${escapeHtml(dayKey)}" aria-label="Editar hueco">${iconHtml('edit')}</button>`
          : '';
        const iconName = ROW_TYPE_ICON[a.badgeClass] || 'circle';
        const iconMarkup = a.badgeClass === 'type-shift' ? iconHtml(iconName, 'ic-fill') : iconHtml(iconName);

        return `
          <div class="tbl-row">
            <span class="tbl-row-icon ${a.badgeClass}">${iconMarkup}</span>
            <div class="tbl-row-main">
              <div class="tbl-row-title">${escapeHtml(a.detail)} <span class="tbl-type-badge ${a.badgeClass}">${escapeHtml(a.badgeLabel)}</span></div>
              ${a.note ? `<div class="tbl-row-sub">${escapeHtml(a.note)}</div>` : ''}
            </div>
            <div class="tbl-row-right">
              <div class="tbl-row-time">${escapeHtml(hora)}${hasDuration ? ` · ${escapeHtml(durationText)}` : ''}</div>
            </div>
            <div class="tbl-row-actions">${editBtn}</div>
          </div>
        `;
      });

      // `#callTableWrap` ya trae su propio borde/fondo redondeado (`.table-wrap`, en el HTML) — las
      // filas se pintan directo ahí dentro, sin envolver en otra tarjeta propia.
      wrap.innerHTML = rowsHtml.join('');
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
  const adherence = dayAdherence(dayKey);

  const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };

  setText('resumenDiaLlamadas', String(dayCalls.length));
  setText('resumenDiaProductivo', formatDuration(stats.productive * 60000));
  setText('resumenDiaACW', formatDuration(stats.gapTotal * 60000));
  setText('resumenDiaAdherencia', adherence ? `${adherence.scorePct}%` : '—');
  const goalPct = Number.isFinite(Number(settings.adherenceGoalPct)) ? Number(settings.adherenceGoalPct) : 95;
  setText('resumenDiaAdherenciaGoal', `Objetivo ≥ ${goalPct}%`);

  setText('statsShortest', dayCalls.length ? formatDuration(stats.shortest * 60000) : '—');
  // Nota aclaratoria cuando "Más corta" da 0 min por una llamada real de inicio=fin — sin esto se
  // veía como un error de la app.
  const shortestNoteEl = document.getElementById('statsShortestNote');
  if (shortestNoteEl) {
    if (dayCalls.length && stats.shortest === 0 && stats.zeroCount > 0 && stats.shortestNonZero !== null) {
      // El texto anterior ("Hubo 1 llamada de 0 min — siguiente: 00:01:00") no dejaba claro qué
      // relación tenía ese "siguiente" con el 00:00:00 de arriba. Se reescribe para que quede
      // explícito.
      const intro = stats.zeroCount === 1 ? '1 llamada duró 0 min' : `${stats.zeroCount} llamadas duraron 0 min`;
      shortestNoteEl.textContent = `${intro} — sin contar esa(s), la más corta fue ${formatDuration(stats.shortestNonZero * 60000)}`;
      shortestNoteEl.style.display = '';
    } else {
      shortestNoteEl.style.display = 'none';
    }
  }
  setText('statsLongest', dayCalls.length ? formatDuration(stats.longest * 60000) : '—');
  setText('statsAvg', dayCalls.length ? formatDuration(stats.avg * 60000) : '—');

  // Desglose Break/Lunch/Otro + bono de Higher Rate en "Resumen del día"
  setText('resumenDiaBreak', formatDuration(stats.breakGapTotal * 60000));
  setText('resumenDiaLunch', formatDuration(stats.lunchGapTotal * 60000));
  setText('resumenDiaOtro', formatDuration(stats.otherGapTotal * 60000));
  setText('resumenDiaHigherRate', money(stats.higherRateBonus || 0));

  // Conectado/Tiempo llamadas/ Billable/Dropped, mismos datos que ya alimentan las píldoras de
  // "Ganancias de hoy" (renderHeader)
  const dayShiftBoundsForStats = dayShiftBounds(dayKey);
  const hasShiftForStats = !!dayShiftBoundsForStats.start;
  setText('resumenDiaConectado', hasShiftForStats ? formatDuration(connectedMinutesForDay(dayKey) * 60000) : '—');
  setText('resumenDiaTiempoLlamadas', formatDuration(stats.total * 60000));
  setText('resumenDiaBillable', String(stats.billable));
  setText('resumenDiaDropped', String(stats.dropped));

  // Hueco más largo/promedio (ya calculados por importedCallStats) + pago promedio por llamada
  // (Ganancias ÷ Total de llamadas).
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
export function resetCallEditorState() { editingCallId = null; }
