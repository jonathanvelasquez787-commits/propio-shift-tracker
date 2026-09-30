export const QA_WALKTHROUGH_TOTAL_CALLS = 6;
export const QA_WALKTHROUGH_CALL_DURATION_MIN = 3;
export const QA_WALKTHROUGH_CALL_RATE = 0.12;
const DEMO_CALL_DURATION_MS = QA_WALKTHROUGH_CALL_DURATION_MIN * 60 * 1000;

const REINFORCEMENT_CALLS = Object.freeze([
  { durationMin: 30, pay: '3.60' },
  { durationMin: 3, pay: '0.36' },
  { durationMin: 5, pay: '1.40', frozenHigherRateBonus: { tier: 'gold', amount: 0.15, windowId: 'qa-reinforcement-gold' } },
  { durationMin: 4, pay: '4.00' },
  { durationMin: 1, pay: '0.00', dropped: 'Yes', countsAsProductive: false },
  { durationMin: 3, pay: '0.36' },
  { durationMin: 3, pay: '0.36' },
  { durationMin: 3, pay: '0.36' },
]);

export function createQaReinforcementCall({ id, ordinal, dayKey, now = new Date(), previousEndISO = '', notBeforeISO = '' }) {
  const spec = REINFORCEMENT_CALLS[ordinal - 1];
  const current = new Date(now);
  if (!spec || !dayKey || !Number.isFinite(current.getTime())) return null;
  const remainingMs = REINFORCEMENT_CALLS.slice(ordinal).reduce((sum, item) => sum + item.durationMin * 60000 + 1000, 0);
  let endMs = current.getTime() - remainingMs - 1000;
  let startMs = endMs - spec.durationMin * 60000;
  const previousEnd = new Date(previousEndISO).getTime();
  const notBefore = new Date(notBeforeISO).getTime();
  if (Number.isFinite(notBefore)) {
    startMs = Math.max(startMs, notBefore + 1, Number.isFinite(previousEnd) ? previousEnd + 1 : Number.NEGATIVE_INFINITY);
    endMs = Math.min(startMs + spec.durationMin * 60000, current.getTime() - 1);
  } else if (Number.isFinite(previousEnd) && startMs <= previousEnd) {
    startMs = previousEnd + 1000;
    endMs = startMs + spec.durationMin * 60000;
  }
  if (startMs >= endMs || endMs > current.getTime() || current.getTime() - endMs > 30 * 60000) return null;
  const start = new Date(startMs);
  return {
    id: String(id || `qa-reinforcement-${current.getTime().toString(36)}-${ordinal}`),
    customerId: `QA-REF-${ordinal}`,
    callDate: String(dayKey),
    calendarCallDate: localDayKey(start),
    shiftDayKey: String(dayKey),
    callStart: start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    billable: 'Yes', dropped: 'No', countsAsProductive: true,
    ...structuredClone(spec),
    durationMin: (endMs - startMs) / 60000,
    startISO: start.toISOString(), endISO: new Date(endMs).toISOString(),
    importedAt: current.toISOString(), source: 'qa-reinforcement',
  };
}

const QA_REINFORCEMENT_STEPS = Object.freeze([
  { title: 'Refuerzo completo', description: 'Esta guía usa llamadas sintéticas y los motores reales. Demuestra mensajes, cuatro hitos monetarios, pausa, recuperación, sorpresa y cierre; todo queda en QA.' },
  { title: 'Llamada larga y primer hito', description: 'Guarda una llamada en vivo de 30 minutos. Ese es el umbral de llamada larga; observa su mensaje y el primer cuarto de la meta.' },
  { title: 'Llamada normal', description: 'Guarda una llamada manual corta con menor pago. Observa el mensaje específico de una llamada normal.' },
  { title: 'Higher Rate y mitad de la meta', description: 'Importa una llamada con bono Gold ya congelado. Se reutiliza el cálculo de Higher Rate y se cruza el 50 % de la meta.' },
  { title: 'Mejor pago y sorpresa', description: 'Guarda la mejor llamada del día por pago. Cruza el 75 % y prueba un resultado ganador del 15 % con azar controlado solo en QA; recargar no vuelve a sortear.' },
  { title: 'Pausa y regreso puntual', description: 'Inicia un Break y observa cómo se reinicia el combo. Termínalo dentro de su ventana de dos minutos para probar el regreso puntual.' },
  { title: 'Llamada caída', description: 'Importa una llamada Dropped. La dificultad se registra automáticamente, sin penalización y sin exigir una reflexión.' },
  { title: 'Recuperación', description: 'Guarda una llamada posterior productiva. El motor detecta que volviste después de la llamada caída.' },
  { title: 'Una hora sin llamadas', description: 'Comprueba el recordatorio con una hora simulada de inactividad en un bloque de trabajo activo. No se cambia el reloj del equipo ni se agrega una llamada.' },
  { title: 'Intensidad sutil y meta completa', description: 'Usa intensidad Sutil y guarda otra llamada. Cruza el 100 %; observa mensajes pequeños sin partículas.' },
  { title: 'Intensidad apagada', description: 'Guarda una llamada con intensidad Off: continúa el progreso interno sin notificaciones de refuerzo.' },
  { title: 'Cierre con evidencia', description: 'Restaura Arcade y cierra el turno con el flujo real. El resumen utiliza tus llamadas, ganancias, pausa y recuperación, con una proyección condicional de racha.' },
  { title: 'Revisión final', description: 'Revisa el cierre y la evidencia en Logros. Reiniciar repite solo este escenario; salir restaura tus datos reales.' },
]);

export function createQaWalkthroughCall({
  id,
  ordinal,
  dayKey,
  now = new Date(),
  previousEndISO = '',
  totalCalls = QA_WALKTHROUGH_TOTAL_CALLS,
  endOffsetMs = 1000,
}) {
  const current = now instanceof Date ? new Date(now.getTime()) : new Date(now);
  if (!dayKey || !Number.isFinite(current.getTime())) return null;

  const slots = Math.max(1, Math.floor(Number(totalCalls) || QA_WALKTHROUGH_TOTAL_CALLS));
  const sequence = Math.max(1, Math.floor(Number(ordinal) || 1));
  const finalCallOffset = Math.max(1, Math.floor(Number(endOffsetMs) || 1000));
  const remaining = Math.max(0, slots - sequence);
  const latestEnd = current.getTime() - finalCallOffset;
  let endMs = latestEnd - remaining * DEMO_CALL_DURATION_MS;
  let startMs = endMs - DEMO_CALL_DURATION_MS;
  const previousEnd = new Date(previousEndISO).getTime();

  if (Number.isFinite(previousEnd)) {
    startMs = Math.max(startMs, previousEnd + 1000);
    endMs = startMs + DEMO_CALL_DURATION_MS;
  }
  if (endMs > latestEnd) {
    endMs = latestEnd;
    startMs = Number.isFinite(previousEnd) ? previousEnd + 1000 : endMs - DEMO_CALL_DURATION_MS;
  }
  if (startMs >= endMs || (Number.isFinite(previousEnd) && startMs <= previousEnd)) return null;

  const start = new Date(startMs);
  const end = new Date(endMs);
  const durationMin = (endMs - startMs) / 60000;
  const callId = String(id || `qa-tour-${current.getTime().toString(36)}-${sequence}`);
  return {
    id: callId,
    customerId: `QA-${String(sequence).padStart(2, '0')}`,
    callDate: String(dayKey),
    calendarCallDate: `${String(start.getMonth() + 1).padStart(2, '0')}/${String(start.getDate()).padStart(2, '0')}/${start.getFullYear()}`,
    shiftDayKey: String(dayKey),
    callStart: start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    durationMin,
    billable: 'Yes',
    dropped: 'No',
    pay: (durationMin * QA_WALKTHROUGH_CALL_RATE).toFixed(2),
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    countsAsProductive: true,
    source: 'qa-walkthrough',
    importedAt: current.toISOString(),
  };
}

const QA_WALKTHROUGH_STEPS = Object.freeze([
  Object.freeze({ title: 'Prepara el terreno', description: 'En Logros, revisa el nombre del monstruo y elige un enfoque en la configuración de misiones. La arena está en Inicio; el turno ya está preparado para esta simulación.' }),
  Object.freeze({ title: 'Una llamada real', description: 'Guarda una llamada de demostración. El motor real calcula su XP y combo; después abre la reflexión para que elijas cómo cerrarla.' }),
  Object.freeze({ title: 'Cierra con evidencia', description: 'Elige una respuesta en la reflexión real. Al continuar se guarda otra llamada manual para probar una recuperación.' }),
  Object.freeze({ title: 'Una llamada difícil y el regreso', description: 'Marca la segunda reflexión como “Difícil” o “Aprendizaje”. Sin repetir XP, una llamada posterior se registra como recuperación.' }),
  Object.freeze({ title: 'Constancia y premio', description: 'Guarda las llamadas 4 y 5 con el motor real. Mira cómo cambian combo, XP, cofre y premios pendientes.' }),
  Object.freeze({ title: 'Break y premio seguro', description: 'Abre un Break real. Usa la ventana de premio para marcarlo realizado o cambiarlo; después termina la pausa para volver.' }),
  Object.freeze({ title: 'Meta y cierre del turno', description: 'Guarda la sexta llamada y cierra el turno. El cálculo real prepara el cierre del día y su resumen STAGE CLEAR.' }),
  Object.freeze({ title: 'Logros e historial', description: 'Revisa el resumen final y la evidencia acumulada en Logros. El progreso de este recorrido vive solo en el espacio QA.' }),
]);

const QA_WALKTHROUGH_NODE_IDS = Object.freeze({
  panel: 'qaWalkthroughPanel',
  progress: 'qaWalkthroughProgress',
  title: 'qaWalkthroughTitle',
  description: 'qaWalkthroughDescription',
  result: 'qaWalkthroughResult',
  next: 'qaWalkthroughNextBtn',
  restart: 'qaWalkthroughRestartBtn',
});
const REFLECTION_OUTCOME_LABELS = Object.freeze({ good: 'cierre positivo', difficult: 'difícil', learning: 'aprendizaje' });

let walkthroughContext = null;
let walkthroughInitialized = false;
let walkthroughDisposed = false;
let walkthroughBusy = false;
let walkthroughHandlers = null;

export function configureQaWalkthroughContext(context) {
  detachQaWalkthroughHandlers();
  walkthroughContext = context && typeof context === 'object' ? context : null;
  walkthroughInitialized = false;
  walkthroughDisposed = false;
  walkthroughBusy = false;
}

function detachQaWalkthroughHandlers() {
  if (!walkthroughHandlers || typeof document === 'undefined') return;
  document.removeEventListener?.('app:modal-closed', walkthroughHandlers.modalClosed);
  document.getElementById(QA_WALKTHROUGH_NODE_IDS.next)?.removeEventListener?.('click', walkthroughHandlers.next);
  document.getElementById(QA_WALKTHROUGH_NODE_IDS.restart)?.removeEventListener?.('click', walkthroughHandlers.restart);
  walkthroughHandlers = null;
}

function currentTourModel() {
  if (!walkthroughContext) return null;
  const model = walkthroughContext.getState?.()?.qaWalkthrough;
  if (!model || model.version !== 1 || typeof model.sessionId !== 'string' || !model.sessionId.trim()
      || !Number.isInteger(model.step) || model.step < 0 || model.step >= walkthroughSteps(model).length
      || typeof model.completed !== 'boolean') return null;
  return model;
}

function walkthroughSteps(model) {
  return model?.scenario === 'reinforcement' ? QA_REINFORCEMENT_STEPS : QA_WALKTHROUGH_STEPS;
}

function activeTour() {
  return !walkthroughDisposed && !!walkthroughContext && walkthroughContext.isActive?.() === true;
}

function modalIsOpen() {
  return walkthroughContext?.hasOpenModal?.() === true;
}

function actionIsAllowed() {
  return activeTour() && !!currentTourModel() && !modalIsOpen() && !walkthroughBusy;
}

function persistTour() {
  walkthroughContext?.saveState?.();
}

function localDayKey(date) {
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
}

function accountingDayKey(model) {
  const state = walkthroughContext?.getState?.() || {};
  const shiftDate = state.shiftStartedAt ? new Date(state.shiftStartedAt) : null;
  if (shiftDate && Number.isFinite(shiftDate.getTime())) return localDayKey(shiftDate);
  return String(state.activeDayKey || localDayKey(new Date()));
}

function callIdFor(model, ordinal) {
  return `${model.sessionId}-call-${ordinal}`;
}

function findCall(id) {
  return (walkthroughContext?.getCalls?.() || []).find((call) => String(call?.id) === String(id)) || null;
}

function previousTourCallEnd(model, ordinal) {
  for (let previous = ordinal - 1; previous >= 1; previous--) {
    const call = findCall(callIdFor(model, previous));
    if (call?.endISO) return call.endISO;
  }
  return '';
}

function stepResult(model) {
  const state = walkthroughContext?.getState?.() || {};
  if (model.scenario === 'reinforcement') {
    return [model.result, `Combo: ${Number(state.game?.live?.combo) || 0} · XP total: ${Number(state.game?.totalXp) || 0} · Intensidad: ${walkthroughContext?.getSettings?.()?.game?.intensity || 'arcade'}`].filter(Boolean).join(' · ');
  }
  if (model.step === 4 || model.step === 5 || model.step === 7) {
    const game = state.game || {};
    const reinforcement = game.reinforcement || {};
    const pending = Array.isArray(reinforcement.pendingRewards) ? reinforcement.pendingRewards.length : 0;
    const liveStatus = `Combo: ${Number(game.live?.combo) || 0} · XP total: ${Number(game.totalXp) || 0} · Cofres pendientes: ${game.chest?.pending ? 1 : 0} · Premios pendientes: ${pending}`;
    const breakStatus = model.step === 5
      ? `Break: ${state.activePause?.type === 'break' ? 'activo' : model.phase === 'break-ended' ? 'terminado' : 'pendiente'}`
      : '';
    return [model.result, liveStatus, breakStatus].filter(Boolean).join(' · ');
  }
  if (model.result) return String(model.result);
  return '';
}

export function renderQaWalkthrough() {
  if (typeof document === 'undefined') return false;
  const panel = document.getElementById(QA_WALKTHROUGH_NODE_IDS.panel);
  const nodes = Object.fromEntries(Object.entries(QA_WALKTHROUGH_NODE_IDS)
    .filter(([key]) => key !== 'panel')
    .map(([key, id]) => [key, document.getElementById(id)]));
  const model = activeTour() ? currentTourModel() : null;
  const visible = !!panel && !!model;
  if (panel) panel.hidden = !visible;

  if (!model) {
    if (nodes.next) nodes.next.disabled = true;
    if (nodes.restart) nodes.restart.disabled = true;
    return false;
  }

  const steps = walkthroughSteps(model);
  const step = steps[model.step];
  const generatedCount = Array.isArray(model.generatedCallIds) ? model.generatedCallIds.length : 0;
  if (nodes.progress) nodes.progress.textContent = `Paso ${model.step + 1} de ${steps.length}`;
  if (nodes.title) nodes.title.textContent = step.title;
  if (nodes.description) {
    nodes.description.textContent = model.scenario !== 'reinforcement' && model.step === 4
      ? `${step.description} ${generatedCount < 4 ? 'Ahora toca la llamada 4.' : generatedCount < 5 ? 'Ahora toca la llamada 5.' : 'Las dos llamadas ya se guardaron.'}`
      : step.description;
  }
  if (nodes.result) {
    nodes.result.textContent = stepResult(model);
    nodes.result.hidden = !nodes.result.textContent;
  }
  if (nodes.next) {
    nodes.next.textContent = model.scenario === 'reinforcement'
      ? (model.completed ? 'Recorrido terminado' : model.step === 5 ? (model.phase === 'break-open' ? 'Terminar Break' : 'Iniciar Break') : 'Continuar')
      : model.step === 5
      ? (model.phase === 'break-open' ? 'Terminar Break' : 'Iniciar Break')
      : model.step === 7 ? 'Recorrido terminado' : model.step === 4 ? 'Guardar llamada' : 'Continuar';
    nodes.next.disabled = walkthroughBusy || model.completed || modalIsOpen();
  }
  if (nodes.restart) nodes.restart.disabled = walkthroughBusy || modalIsOpen();
  return visible;
}

function setTourResult(text) {
  const model = currentTourModel();
  if (!model) return;
  model.result = String(text || '');
  persistTour();
  renderQaWalkthrough();
}

function withWalkthroughBusy(action) {
  if (!actionIsAllowed()) {
    renderQaWalkthrough();
    return false;
  }
  walkthroughBusy = true;
  renderQaWalkthrough();
  try {
    return action();
  } catch {
    setTourResult('No se completó este paso. Revisa el estado QA y vuelve a intentarlo.');
    return false;
  } finally {
    walkthroughBusy = false;
    renderQaWalkthrough();
  }
}

function addTourCall(ordinal, source, { step, phase, reflectionRole = null, result = '', callFactory = createQaWalkthroughCall, surpriseRandom } = {}) {
  const model = currentTourModel();
  if (!model || !walkthroughContext) return false;
  const id = callIdFor(model, ordinal);
  const existing = findCall(id);
  const latestPauseEnd = model.scenario === 'reinforcement'
    ? (walkthroughContext.getState?.()?.pauseHistory || [])
      .map((pause) => pause?.endedAt)
      .filter((endedAt) => Number.isFinite(new Date(endedAt).getTime()))
      .sort((first, second) => new Date(second) - new Date(first))[0]
    : undefined;
  const call = existing || callFactory({
    id,
    ordinal,
    dayKey: accountingDayKey(model),
    now: new Date(),
    previousEndISO: previousTourCallEnd(model, ordinal),
    notBeforeISO: latestPauseEnd,
    totalCalls: QA_WALKTHROUGH_TOTAL_CALLS,
  });
  if (!call) {
    model.result = 'No hay un intervalo terminado disponible para esta llamada. Vuelve a intentarlo en un momento.';
    persistTour();
    return false;
  }

  const previousModel = {
    ...model,
    generatedCallIds: Array.isArray(model.generatedCallIds) ? [...model.generatedCallIds] : model.generatedCallIds,
  };

  if (!Array.isArray(model.generatedCallIds)) model.generatedCallIds = [];
  if (!model.generatedCallIds.includes(id)) model.generatedCallIds.push(id);
  model.nextCallOrdinal = Math.max(Number(model.nextCallOrdinal) || 1, ordinal + 1);
  if (Number.isInteger(step)) model.step = step;
  model.phase = phase || 'ready';
  if (reflectionRole) {
    model.reflectionCallId = id;
    model.reflectionRole = reflectionRole;
  }
  model.result = result;
  persistTour();

  let callbackResult;
  let callbackFailed = false;
  if (!existing) {
    try {
      callbackResult = walkthroughContext.addCall?.(call, source, { surpriseRandom });
    } catch {
      callbackFailed = true;
    }
  }
  const persistedCall = findCall(id);
  if (!existing && !persistedCall && (callbackFailed || callbackResult === false)) {
    Object.keys(model).forEach((key) => { if (!(key in previousModel)) delete model[key]; });
    Object.assign(model, previousModel);
    persistTour();
    return false;
  }
  if (result) model.result = result;
  persistTour();
  return true;
}

function reopenTourReflection(id, message = '') {
  const model = currentTourModel();
  if (!model || !id || modalIsOpen()) return false;
  const call = findCall(id);
  if (!call) {
    setTourResult('No encuentro esa llamada de demostración. Reinicia el recorrido para volver a prepararlo.');
    return false;
  }
  if (message) {
    model.result = message;
    persistTour();
  }
  const dayKey = String(call.shiftDayKey || call.callDate || accountingDayKey(model));
  walkthroughContext.reopenReflection?.(call, dayKey);
  renderQaWalkthrough();
  return true;
}

function reflectionFor(id) {
  const state = walkthroughContext?.getState?.() || {};
  return state.game?.reinforcement?.reflections?.[id] || null;
}

function prepareQaPauseWindow() {
  const settings = walkthroughContext.getSettings?.();
  if (!settings) return;
  const now = new Date();
  const minute = now.getHours() * 60 + now.getMinutes();
  const hhmm = (value) => `${String(Math.floor(value / 60) % 24).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
  const key = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()];
  const blocks = [];
  if (minute) blocks.push({ type: 'work', start: '00:00', dur: minute, goalMin: 40 });
  blocks.push({ type: 'break', start: hhmm(minute), dur: 2 });
  if (minute + 2 < 1440) blocks.push({ type: 'work', start: hhmm(minute + 2), dur: 1440 - minute - 2, goalMin: 40 });
  const plan = { off: false, start: '00:00', end: '23:59', blocks };
  settings.weeklySchedule = { ...settings.weeklySchedule, [key]: plan };
  settings.scheduleHistoryByDay = { ...settings.scheduleHistoryByDay, [accountingDayKey(currentTourModel())]: structuredClone(plan) };
  walkthroughContext.saveSettings?.();
}

function runNextReinforcementStep(model) {
  const advance = (result, phase = 'ready') => {
    model.step++;
    model.phase = phase;
    model.result = result;
    persistTour();
    return true;
  };
  const add = (ordinal, source, result, surpriseRandom = 0.99) => addTourCall(ordinal, source, {
    step: model.step + 1, callFactory: createQaReinforcementCall, result, surpriseRandom,
  });
  if (model.step === 0) {
    walkthroughContext.navigate?.('home', 'gameArena');
    return advance('Escenario preparado. Los resultados ganadores y no ganadores del sorteo solo se fuerzan en esta guía QA.');
  }
  if (model.step === 1) return add(1, 'live', 'Llamada larga guardada: 30 minutos. Revisa el mensaje y el primer hito monetario.');
  if (model.step === 2) return add(2, 'manual', 'Llamada normal guardada. No se repite el sorteo de la llamada anterior.');
  if (model.step === 3) return add(3, 'import', 'Llamada con Higher Rate Gold importada. Revisa el hito del 50 %.');
  if (model.step === 4) return add(4, 'manual', 'Mejor pago del día guardado. Revisa el hito del 75 % y la sorpresa persistente.', 0.01);
  if (model.step === 5) {
    const state = walkthroughContext.getState?.() || {};
    if (state.activePause?.type === 'break' && model.phase === 'break-open') {
      walkthroughContext.endPause?.();
      if (state.activePause) return false;
      return advance('Break terminado dentro de su ventana. Revisa el mensaje de regreso puntual.', 'break-ended');
    }
    if (state.activePause) return setTourResult('Termina la pausa abierta antes de iniciar el Break de esta guía.');
    prepareQaPauseWindow();
    walkthroughContext.startPause?.('break');
    if (!state.activePause) return false;
    model.phase = 'break-open';
    model.result = 'Break abierto con el flujo real. El combo vuelve a cero; termina la pausa para probar el regreso puntual.';
    persistTour();
    return true;
  }
  if (model.step === 6) return add(5, 'import', 'Llamada Dropped importada: evidencia automática de dificultad, sin XP ni penalización.');
  if (model.step === 7) return add(6, 'manual', 'Llamada productiva posterior guardada: recuperación calculada por el motor.');
  if (model.step === 8) {
    if (typeof walkthroughContext.checkInactivity !== 'function') return false;
    walkthroughContext.checkInactivity(Date.now() + 60 * 60000);
    return advance('Revisión de inactividad ejecutada en trabajo activo con una hora simulada. No se modificó el reloj del equipo.');
  }
  if (model.step === 9 || model.step === 10) {
    if (typeof walkthroughContext.setIntensity !== 'function') return false;
    const subtle = model.step === 9;
    walkthroughContext.setIntensity(subtle ? 'subtle' : 'off');
    return add(subtle ? 7 : 8, 'manual', subtle
      ? 'Llamada en Sutil guardada: meta monetaria completada y sin partículas.'
      : 'Llamada en Off guardada: el progreso continúa sin notificaciones de refuerzo.');
  }
  if (model.step === 11) {
    walkthroughContext.setIntensity?.('arcade');
    const state = walkthroughContext.getState?.() || {};
    if (!state.shiftEndedAt) walkthroughContext.endShift?.();
    if (!state.shiftEndedAt) return false;
    model.completed = true;
    advance('Turno cerrado. Revisa las tres evidencias disponibles y la racha de mañana, condicionada a continuar.', 'completed');
    walkthroughContext.navigate?.('achievements', 'positiveHistoryPanel');
    return true;
  }
  return false;
}

function runNextStep() {
  const model = currentTourModel();
  if (!model) return false;
  if (model.scenario === 'reinforcement') return runNextReinforcementStep(model);

  if (model.step === 0) {
    model.step = 1;
    model.phase = 'prepared';
    model.result = 'Enfoque y monstruo listos. La primera llamada usará el motor real.';
    persistTour();
    walkthroughContext.navigate?.('achievements', 'gameSettingsAccordion');
    return true;
  }

  if (model.step === 1) {
    walkthroughContext.navigate?.('home', 'gameArena');
    return addTourCall(1, 'manual', {
      step: 2,
      phase: 'awaiting-reflection-1',
      reflectionRole: 'positive',
      result: 'Llamada 1 guardada. Elige un cierre en la reflexión real; si recargas, se puede reabrir sin repetir XP.',
    });
  }

  if (model.step === 2) {
    const reflectionId = model.reflectionCallId || callIdFor(model, 1);
    if (!reflectionFor(reflectionId)) {
      return reopenTourReflection(reflectionId, 'Guarda una respuesta en la reflexión para continuar. Puedes reabrirla aquí sin volver a guardar la llamada.');
    }
    return addTourCall(2, 'manual', {
      step: 3,
      phase: 'awaiting-reflection-2',
      reflectionRole: 'difficult',
      result: 'Llamada 2 guardada. En la reflexión, marca “Difícil” o “Aprendizaje” para ver la recuperación.',
    });
  }

  if (model.step === 3) {
    const difficultId = model.difficultCallId || model.reflectionCallId || callIdFor(model, 2);
    const reflection = reflectionFor(difficultId);
    if (!reflection || !['difficult', 'learning'].includes(reflection.outcome)) {
      const message = reflection
        ? 'Para activar la recuperación, vuelve a elegir “Difícil” o “Aprendizaje” en la reflexión. No se generará otra llamada ni XP.'
        : 'Guarda “Difícil” o “Aprendizaje” en la reflexión para continuar.';
      return reopenTourReflection(difficultId, message);
    }
    return addTourCall(3, 'manual', {
      step: 4,
      phase: 'awaiting-reflection-3',
      reflectionRole: 'recovery',
      result: 'Llamada posterior guardada. La recuperación se calcula con el motor real; cierra su reflexión para seguir.',
    });
  }

  if (model.step === 4) {
    if (model.phase === 'awaiting-reflection-3' && !reflectionFor(model.reflectionCallId)) {
      return reopenTourReflection(model.reflectionCallId, 'Cierra o guarda la reflexión de la llamada 3 para continuar. Puedes reabrirla sin repetir la llamada.');
    }
    const call4 = callIdFor(model, 4);
    const call5 = callIdFor(model, 5);
    if (!findCall(call4)) {
      return addTourCall(4, 'import', {
        step: 4,
        phase: 'saving-call-4',
        result: 'Llamada 4 guardada con el motor real. El siguiente toque completa el hito de cinco.',
      });
    }
    if (!findCall(call5)) {
      return addTourCall(5, 'import', {
        step: 5,
        phase: 'ready-break',
        result: 'Llamadas 4 y 5 guardadas. Revisa el combo, XP, cofre y premios pendientes en Logros.',
      });
    }
    model.step = 5;
    model.phase = 'ready-break';
    persistTour();
    return true;
  }

  if (model.step === 5) {
    const state = walkthroughContext.getState?.() || {};
    if (state.activePause?.type === 'break' && model.phase === 'break-open') {
      walkthroughContext.endPause?.();
      model.step = 6;
      model.phase = 'break-ended';
      model.result = 'Break terminado con la acción real. La siguiente llamada puede completar la meta del recorrido.';
      persistTour();
      return true;
    }
    if (state.activePause) {
      model.result = 'Termina primero la pausa que está abierta para poder continuar el recorrido.';
      persistTour();
      return false;
    }
    model.phase = 'break-open';
    model.result = 'Break abierto. Usa Realizado o Cambiar en la ventana real del premio; luego vuelve aquí.';
    persistTour();
    walkthroughContext.startPause?.('break');
    persistTour();
    return true;
  }

  if (model.step === 6) {
    const state = walkthroughContext.getState?.() || {};
    if (!findCall(callIdFor(model, 6))) {
      const added = addTourCall(6, 'import', {
        step: 7,
        phase: 'closing-shift',
        result: 'Sexta llamada guardada. Cerrando el turno con el flujo real…',
      });
      if (!added) return false;
    } else {
      model.step = 7;
      model.phase = 'closing-shift';
      persistTour();
    }
    if (!state.shiftEndedAt) walkthroughContext.endShift?.();
    model.step = 7;
    model.phase = 'completed';
    model.completed = true;
    model.result = 'Turno cerrado. El resumen y el historial final se muestran en Logros.';
    persistTour();
    walkthroughContext.navigate?.('achievements', 'positiveHistoryPanel');
    return true;
  }

  if (model.step === 7 && !model.completed) {
    const state = walkthroughContext.getState?.() || {};
    if (model.phase === 'closing-shift' && !state.shiftEndedAt) walkthroughContext.endShift?.();
    model.completed = true;
    model.phase = 'completed';
    model.result = 'Recorrido listo. Puedes reiniciarlo o salir para volver a tus datos reales.';
    persistTour();
    walkthroughContext.navigate?.('achievements', 'positiveHistoryPanel');
    return true;
  }
  return false;
}

function nextQaWalkthrough() {
  return withWalkthroughBusy(runNextStep);
}

function restartQaWalkthrough() {
  return withWalkthroughBusy(() => {
    walkthroughContext.saveState?.();
    const restart = walkthroughContext.restart;
    stopQaWalkthrough();
    restart?.();
    return true;
  });
}

function onQaWalkthroughModalClosed(event) {
  if (!activeTour()) return;
  const model = currentTourModel();
  if (!model) return renderQaWalkthrough();
  const id = event?.detail?.id;
  if (id === 'positiveReflectionModal' && model.reflectionCallId) {
    const reflection = reflectionFor(model.reflectionCallId);
    if (reflection) model.result = `Reflexión guardada: ${REFLECTION_OUTCOME_LABELS[reflection.outcome] || 'respuesta registrada'}.`;
    if (model.step === 4 && model.reflectionRole === 'recovery') {
      model.phase = reflection ? 'reflection-3-saved' : 'reflection-3-closed';
    }
  } else if (id === 'physicalRewardClaimModal' && model.step === 5) {
    const pending = walkthroughContext.getState?.()?.game?.reinforcement?.pendingRewards?.length || 0;
    model.result = `Ventana cerrada · Premios pendientes: ${Number(pending) || 0}.`;
  } else if (id === 'stageClearModal' && (model.step === 7 || (model.scenario === 'reinforcement' && model.step === 12))) {
    model.result = 'Resumen de turno cerrado. Continúa con Logros e historial.';
  }
  persistTour();
  renderQaWalkthrough();
}

export function initQaWalkthrough() {
  if (!walkthroughContext || walkthroughInitialized || walkthroughDisposed || typeof document === 'undefined') return false;
  walkthroughInitialized = true;
  walkthroughHandlers = {
    next: (event) => { event?.preventDefault?.(); nextQaWalkthrough(); },
    restart: (event) => { event?.preventDefault?.(); restartQaWalkthrough(); },
    modalClosed: onQaWalkthroughModalClosed,
  };
  document.getElementById(QA_WALKTHROUGH_NODE_IDS.next)?.addEventListener?.('click', walkthroughHandlers.next);
  document.getElementById(QA_WALKTHROUGH_NODE_IDS.restart)?.addEventListener?.('click', walkthroughHandlers.restart);
  document.addEventListener?.('app:modal-closed', walkthroughHandlers.modalClosed);
  return renderQaWalkthrough();
}

export function stopQaWalkthrough() {
  if (walkthroughDisposed) return false;
  walkthroughDisposed = true;
  walkthroughInitialized = false;
  walkthroughBusy = false;
  detachQaWalkthroughHandlers();
  if (typeof document !== 'undefined') {
    const panel = document.getElementById(QA_WALKTHROUGH_NODE_IDS.panel);
    const next = document.getElementById(QA_WALKTHROUGH_NODE_IDS.next);
    const restart = document.getElementById(QA_WALKTHROUGH_NODE_IDS.restart);
    if (panel) panel.hidden = true;
    if (next) next.disabled = true;
    if (restart) restart.disabled = true;
  }
  return true;
}
