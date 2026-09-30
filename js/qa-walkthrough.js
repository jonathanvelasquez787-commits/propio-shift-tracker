export const QA_WALKTHROUGH_TOTAL_CALLS = 6;
export const QA_WALKTHROUGH_CALL_DURATION_MIN = 3;
export const QA_WALKTHROUGH_CALL_RATE = 0.12;
const DEMO_CALL_DURATION_MS = QA_WALKTHROUGH_CALL_DURATION_MIN * 60 * 1000;

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
      || !Number.isInteger(model.step) || model.step < 0 || model.step >= QA_WALKTHROUGH_STEPS.length
      || typeof model.completed !== 'boolean') return null;
  return model;
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

  const step = QA_WALKTHROUGH_STEPS[model.step];
  const generatedCount = Array.isArray(model.generatedCallIds) ? model.generatedCallIds.length : 0;
  if (nodes.progress) nodes.progress.textContent = `Paso ${model.step + 1} de ${QA_WALKTHROUGH_STEPS.length}`;
  if (nodes.title) nodes.title.textContent = step.title;
  if (nodes.description) {
    nodes.description.textContent = model.step === 4
      ? `${step.description} ${generatedCount < 4 ? 'Ahora toca la llamada 4.' : generatedCount < 5 ? 'Ahora toca la llamada 5.' : 'Las dos llamadas ya se guardaron.'}`
      : step.description;
  }
  if (nodes.result) {
    nodes.result.textContent = stepResult(model);
    nodes.result.hidden = !nodes.result.textContent;
  }
  if (nodes.next) {
    nodes.next.textContent = model.step === 5
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

function addTourCall(ordinal, source, { step, phase, reflectionRole = null, result = '' } = {}) {
  const model = currentTourModel();
  if (!model || !walkthroughContext) return false;
  const id = callIdFor(model, ordinal);
  const existing = findCall(id);
  const call = existing || createQaWalkthroughCall({
    id,
    ordinal,
    dayKey: accountingDayKey(model),
    now: new Date(),
    previousEndISO: previousTourCallEnd(model, ordinal),
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
      callbackResult = walkthroughContext.addCall?.(call, source);
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

function runNextStep() {
  const model = currentTourModel();
  if (!model) return false;

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
  } else if (id === 'stageClearModal' && model.step === 7) {
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
