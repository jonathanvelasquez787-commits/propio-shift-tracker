import { ui, translateText, translateMarkup, displayLocale } from './i18n.js';
import { settings, state } from './app-context.js';
import { normalizeInactivityMessage, normalizeInactivityMinutes, notifyReinforcement, reinforcementFeedbackEnabled, reinforcementText } from './reinforcement-feedback.js';
import { callFeedbackSilenced } from './call-feedback.js';

let callDateKeyFromValue, callsForDay, closeModal;
let escapeHtml, openModal, saveSettingsOnly, saveStateOnly, todayCallDateKey;

export function configurePositiveReinforcementContext(context) {
  ({ callDateKeyFromValue, callsForDay, closeModal,
    escapeHtml, openModal, saveSettingsOnly, saveStateOnly,
    todayCallDateKey } = context);
}

const OUTCOMES = new Set(['good', 'difficult', 'learning']);
export function createDefaultReinforcementState() {
  return { reflections: {}, recoveries: [], recoveryPending: null };
}

function cleanText(value, max) {
  return String(value ?? '').replace(/[<>]/g, '').trim().slice(0, max);
}

export function normalizeReinforcementSettings(raw) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return {
    enabled: source.enabled === true,
    askAfterCall: source.askAfterCall !== false,
    inactivityMessage: normalizeInactivityMessage(source.inactivityMessage),
    inactivityMinutes: normalizeInactivityMinutes(source.inactivityMinutes),
    inactivityRepeat: source.inactivityRepeat === true,
  };
}

export function normalizeReinforcementState(raw) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const reflections = Object.fromEntries(Object.entries(source.reflections || {}).slice(-800).flatMap(([callId, value]) => {
    if (!value || typeof value !== 'object' || !OUTCOMES.has(value.outcome)) return [];
    return [[cleanText(callId, 120), { callId: cleanText(value.callId || callId, 120), outcome: value.outcome, note: cleanText(value.note, 240), dayKey: cleanText(value.dayKey, 10), savedAt: cleanText(value.savedAt, 40) }]];
  }));
  const recoveries = (Array.isArray(source.recoveries) ? source.recoveries : []).slice(-400).flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    return [{ callId: cleanText(item.callId, 120), fromCallId: cleanText(item.fromCallId, 120), dayKey: cleanText(item.dayKey, 10), at: cleanText(item.at, 40) }];
  });
  const recovery = source.recoveryPending && typeof source.recoveryPending === 'object' ? source.recoveryPending : null;
  return {
    reflections, recoveries,
    recoveryPending: recovery ? { callId: cleanText(recovery.callId, 120), dayKey: cleanText(recovery.dayKey, 10), endISO: cleanText(recovery.endISO, 40) } : null,
  };
}

function ensurePositiveState() {
  settings.reinforcement = normalizeReinforcementSettings(settings.reinforcement);
  state.game.reinforcement = normalizeReinforcementState(state.game.reinforcement);
  return state.game.reinforcement;
}

function reinforcementEnabled() {
  ensurePositiveState();
  return settings.reinforcement.enabled;
}

function evaluateCallRecovery(call, dayKey) {
  const reinforcement = state.game.reinforcement;
  let recovered = false;

  const productive = typeof call.countsAsProductive === 'boolean'
    ? call.countsAsProductive : String(call.billable).toLowerCase() === 'yes';
  if (productive && reinforcement.recoveryPending && reinforcement.recoveryPending.callId !== String(call.id)) {
    const previous = reinforcement.recoveryPending;
    const pendingDay = callDateKeyFromValue(previous.dayKey);
    const candidateDay = callDateKeyFromValue(dayKey);
    const candidateStart = new Date(call.startISO).getTime();
    const originDay = pendingDay || candidateDay;
    const origin = callsForDay(originDay).find((item) => String(item?.id) === String(previous.callId));
    const originEnd = new Date(origin?.endISO).getTime();
    const storedEnd = new Date(previous.endISO).getTime();
    const difficultEnd = Number.isFinite(originEnd) ? originEnd : storedEnd;
    if ((!pendingDay || pendingDay === candidateDay)
        && Number.isFinite(candidateStart) && Number.isFinite(difficultEnd) && candidateStart >= difficultEnd) {
      if (!reinforcement.recoveries.some((item) => item.callId === String(call.id))) {
        reinforcement.recoveries.push({ callId: String(call.id), fromCallId: previous.callId, dayKey, at: new Date().toISOString() });
        reinforcement.recoveries = reinforcement.recoveries.slice(-400);
        recovered = true;
      }
      reinforcement.recoveryPending = null;
    }
  }

  return { recovered };
}

function announceCallRecovery(call, dayKey, { recovered }) {
  if (recovered) notifyReinforcement(reinforcementText('recovery', {}, call.id), { sound: 'pause', dayKey });
}

let reflectionCall = null;
let reflectionQueue = [];

export function clearPositiveReinforcementTransients() {
  reflectionCall = null;
  reflectionQueue = [];
}

function renderReflectionModal(call, dayKey) {
  reflectionCall = { callId: String(call.id), dayKey, endISO: call.endISO };
  const note = document.getElementById('positiveReflectionNote');
  if (note) note.value = '';
  const noteDetails=document.getElementById('positiveReflectionNoteDetails');
  if(noteDetails)noteDetails.open=false;
  const title = document.getElementById('positiveReflectionCall');
  if (title) title.textContent = ui`Llamada #${call.customerId || 'completada'}`;
  openModal('positiveReflectionModal');
}

function drainReflectionQueue() {
  if (reflectionCall || !reinforcementEnabled() || document.querySelector?.('.modal-overlay.open')) return;
  if (!settings.reinforcement.askAfterCall) { reflectionQueue = []; return; }
  while (reflectionQueue.length) {
    const next = reflectionQueue.shift();
    const call = callsForDay(next.dayKey).find(item => String(item.id) === String(next.call.id));
    if (!call || state.game.reinforcement.reflections[call.id] || String(call.dropped).toLowerCase() === 'yes') continue;
    renderReflectionModal(call, next.dayKey);
    break;
  }
}

function currentPositiveDayKey() {
  const shiftStarted = state.shiftStartedAt ? new Date(state.shiftStartedAt) : null;
  return shiftStarted && Number.isFinite(shiftStarted.getTime()) && !state.shiftEndedAt
    ? todayCallDateKey(shiftStarted) : todayCallDateKey();
}

export function onPositiveCallSaved(call, source, dayKey) {
  if (!reinforcementEnabled() || !call?.id) return;
  if (String(call.dropped).toLowerCase() === 'yes') return;
  const normalizedDay = callDateKeyFromValue(dayKey) || callDateKeyFromValue(call.callDate) || currentPositiveDayKey();
  const endTime = new Date(call.endISO).getTime();
  if (normalizedDay !== currentPositiveDayKey() || !Number.isFinite(endTime) || endTime > Date.now()) return;
  const silent = source === 'import' || callFeedbackSilenced();
  const previous = structuredClone(state.game.reinforcement);
  const feedback = evaluateCallRecovery(call, normalizedDay);
  if (saveStateOnly() === false) {
    state.game.reinforcement = previous;
    return false;
  }
  if (!silent) announceCallRecovery(call, normalizedDay, feedback);
  renderPositiveReinforcement();
  if (!callFeedbackSilenced() && reinforcementFeedbackEnabled('personal') && settings.reinforcement.askAfterCall && !state.game.reinforcement.reflections[call.id]
      && reflectionCall?.callId !== String(call.id) && !reflectionQueue.some(item => String(item.call.id) === String(call.id))) {
    reflectionQueue.push({ call, dayKey: normalizedDay });
    drainReflectionQueue();
  }
}

export function reopenPositiveReflection(call, dayKey) {
  if (!reinforcementEnabled() || !call?.id) return false;
  const normalizedDay = callDateKeyFromValue(dayKey) || callDateKeyFromValue(call.callDate) || currentPositiveDayKey();
  const endTime = new Date(call.endISO).getTime();
  if (normalizedDay !== currentPositiveDayKey() || !Number.isFinite(endTime) || endTime > Date.now()) return false;
  renderReflectionModal(call, normalizedDay);
  return true;
}

function saveReflection(outcome) {
  if (!reinforcementEnabled() || !reflectionCall || !OUTCOMES.has(outcome)) return;
  const previous = structuredClone(state.game.reinforcement);
  const note = cleanText(document.getElementById('positiveReflectionNote')?.value, 240);
  state.game.reinforcement.reflections[reflectionCall.callId] = {
    callId: reflectionCall.callId, outcome, note, dayKey: reflectionCall.dayKey, savedAt: new Date().toISOString(),
  };
  if (outcome === 'difficult' || outcome === 'learning') {
    state.game.reinforcement.recoveryPending = { callId: reflectionCall.callId, dayKey: reflectionCall.dayKey, endISO: reflectionCall.endISO };
  }
  const message = reinforcementText(`reflection-${outcome}`, {}, reflectionCall.callId);
  if (saveStateOnly() === false) {
    state.game.reinforcement = previous;
    return false;
  }
  reflectionCall = null;
  closeModal('positiveReflectionModal');
  renderPositiveReinforcement();
  notifyReinforcement(message);
}

let inactivityMessageDraftOwner = null;
function inactivityEditorControls() {
  return [document.getElementById('positiveInactivityMessageInput'), document.getElementById('positiveInactivityMinutesInput'), document.getElementById('positiveInactivityRepeatInput')].filter(Boolean);
}
export function saveInactivityMessage() {
  ensurePositiveState();
  const input = document.getElementById('positiveInactivityMessageInput');
  if (!input) return false;
  const owner = settings;
  const minutesInput = document.getElementById('positiveInactivityMinutesInput');
  const repeatInput = document.getElementById('positiveInactivityRepeatInput');
  const status = document.getElementById('positiveInactivityMessageStatus');
  const minutes = minutesInput ? Number(minutesInput.value) : owner.reinforcement.inactivityMinutes;
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 240) {
    if (status) status.textContent = translateText('Elige un número entero entre 1 y 240 minutos.');
    minutesInput?.focus();
    return false;
  }
  const previous = { inactivityMessage: owner.reinforcement.inactivityMessage, inactivityMinutes: owner.reinforcement.inactivityMinutes, inactivityRepeat: owner.reinforcement.inactivityRepeat };
  const message = normalizeInactivityMessage(input.value);
  Object.assign(owner.reinforcement, { inactivityMessage: message, inactivityMinutes: minutes, inactivityRepeat: repeatInput ? repeatInput.checked === true : owner.reinforcement.inactivityRepeat });
  const saved = saveSettingsOnly() !== false;
  if (settings !== owner) {
    inactivityMessageDraftOwner = null;
    renderPositiveReinforcement();
    return false;
  }
  if (!saved) {
    Object.assign(owner.reinforcement, previous);
    if (status) status.textContent = translateText('No se pudo guardar el mensaje.');
    return false;
  }
  input.value = message;
  if (minutesInput) minutesInput.value = String(minutes);
  for (const control of inactivityEditorControls()) delete control.dataset.dirty;
  inactivityMessageDraftOwner = owner;
  if (status) status.textContent = translateText(message ? 'Mensaje guardado' : 'Mensaje original restaurado');
  return true;
}

function renderSettingsReinforcement() {
  const enabled = document.getElementById('positiveReinforcementEnabledInput');
  const ask = document.getElementById('positiveAskAfterCallInput');
  if (enabled) enabled.checked = settings.reinforcement.enabled;
  if (ask) ask.checked = settings.reinforcement.askAfterCall;
  const soundRow = document.getElementById('sidebarGameSoundRow');
  if (soundRow) soundRow.hidden = !settings.reinforcement.enabled;
  const inactivityInput = document.getElementById('positiveInactivityMessageInput');
  if (inactivityInput) {
    const changedOwner = inactivityMessageDraftOwner !== settings;
    for (const control of inactivityEditorControls()) {
      if (changedOwner) delete control.dataset.dirty;
      if (changedOwner || (document.activeElement !== control && control.dataset.dirty !== 'true')) {
        if (control.id === 'positiveInactivityRepeatInput') control.checked = settings.reinforcement.inactivityRepeat;
        else control.value = control === inactivityInput ? settings.reinforcement.inactivityMessage : String(settings.reinforcement.inactivityMinutes);
      }
    }
    if (changedOwner) {
      const status = document.getElementById('positiveInactivityMessageStatus');
      if (status) status.textContent = '';
      inactivityMessageDraftOwner = settings;
    }
    inactivityInput.placeholder = settings.reinforcement.inactivityMinutes === 60
      ? translateText('Ha pasado una hora de trabajo sin llamadas · puedes retomar a tu ritmo')
      : translateText('Han pasado {minutes} minutos de trabajo sin llamadas · puedes retomar a tu ritmo').replace('{minutes}', String(settings.reinforcement.inactivityMinutes));
  }
}

function renderEvidence() {
  const root = document.getElementById('positiveEvidenceCard');
  if (!root) return;
  root.hidden = !reinforcementEnabled();
  if (root.hidden) return;
  const dayKey = currentPositiveDayKey();
  const dayReflections = Object.values(state.game.reinforcement.reflections).filter((item) => item.dayKey === dayKey);
  const good = dayReflections.filter((item) => item.outcome === 'good').length;
  const resilient = dayReflections.filter((item) => item.outcome === 'difficult').length;
  const learning = dayReflections.filter((item) => item.outcome === 'learning').length;
  const recoveries = state.game.reinforcement.recoveries.filter((item) => item.dayKey === dayKey).length;
  const completed = callsForDay(dayKey).length;
  root.innerHTML = ui`<div><span>PRUEBA POSITIVA DE HOY</span><strong>${completed === 1 ? ui`${completed} llamada completada` : ui`${completed} llamadas completadas`}</strong><small>${good} cerraron bien · ${resilient} difíciles que enfrentaste · ${learning} aprendizajes · ${recoveries} recuperaciones</small></div>`;
}

let historyExpanded = false;
function renderHistory() {
  const root = document.getElementById('positiveHistoryList');
  if (!root) return;
  const reinforcement = state.game.reinforcement;
  const outcomes = { good: translateText('Cerró bien'), difficult: translateText('Cumplí aunque fue difícil'), learning: translateText('Me dejó un aprendizaje') };
  const records = [
    ...Object.values(reinforcement.reflections).map((item) => ({
      at: item.savedAt, dayKey: item.dayKey, icon: item.outcome === 'good' ? '✨' : item.outcome === 'difficult' ? '🛡️' : '💡',
      title: outcomes[item.outcome], note: item.note,
    })),
    ...reinforcement.recoveries.map((item) => ({ at: item.at, dayKey: item.dayKey, icon: '🛡️', title: translateText('Volví a tomar otra llamada'), note: '' })),
  ].sort((a, b) => String(b.at).localeCompare(String(a.at)));
  const count = document.getElementById('positiveHistoryCount');
  if (count) count.textContent = String(records.length);
  root.innerHTML = records.length
    ? (historyExpanded ? records : records.slice(0, 8)).map((item) => ui`<div class="positive-history-row"><span aria-hidden="true">${escapeHtml(item.icon)}</span><div><strong>${escapeHtml(item.title)}</strong>${item.note ? ui`<small>${escapeHtml(item.note)}</small>` : ''}</div><time>${escapeHtml(item.dayKey)}</time></div>`).join('')
    : translateMarkup('<div class="game-collection-empty">Tus llamadas completadas aparecerán aquí.</div>');
  const toggle = document.getElementById('positiveHistoryToggle');
  if (toggle) {
    toggle.hidden = records.length <= 8;
    toggle.textContent = historyExpanded ? translateText('Ver menos') : ui`Ver todo (${records.length})`;
  }
}

export function renderPositiveReinforcement() {
  ensurePositiveState();
  if (!reinforcementEnabled()) {
    clearPositiveReinforcementTransients();
    if (document.getElementById('positiveReflectionModal')?.classList?.contains?.('open')) closeModal('positiveReflectionModal');
  }
  renderSettingsReinforcement();
  renderEvidence();
  renderHistory();
}

export function reconcilePositiveCalls(dayKey) {
  ensurePositiveState();
  const normalizedDay = callDateKeyFromValue(dayKey);
  if (!normalizedDay) return false;
  const validIds = new Set(callsForDay(normalizedDay).map((call) => String(call.id)));
  let changed = false;
  Object.entries(state.game.reinforcement.reflections).forEach(([callId, reflection]) => {
    if (reflection.dayKey === normalizedDay && !validIds.has(callId)) {
      delete state.game.reinforcement.reflections[callId];
      changed = true;
    }
  });
  const remainingRecoveries = state.game.reinforcement.recoveries.filter((item) => item.dayKey !== normalizedDay || (validIds.has(item.callId) && validIds.has(item.fromCallId)));
  if (remainingRecoveries.length !== state.game.reinforcement.recoveries.length) {
    state.game.reinforcement.recoveries = remainingRecoveries;
    changed = true;
  }
  if (state.game.reinforcement.recoveryPending?.dayKey === normalizedDay
      && !validIds.has(state.game.reinforcement.recoveryPending.callId)) {
    state.game.reinforcement.recoveryPending = null;
    changed = true;
  }
  if (changed) saveStateOnly();
  renderPositiveReinforcement();
  return changed;
}

export function migratePositiveCallIdReferences(previousId, importedId, importedEndISO = '') {
  const from = String(previousId || '');
  const to = String(importedId || '');
  if (!from || !to || from === to) return false;
  const reinforcement = ensurePositiveState();
  const correctedEndISO = cleanText(importedEndISO, 40);
  let changed = false;
  const reflections = {};
  Object.entries(reinforcement.reflections).forEach(([key, value]) => {
    const targetKey = key === from || value.callId === from ? to : key;
    const target = { ...value, callId: value.callId === from || key === from ? to : value.callId };
    if (targetKey !== key || target.callId !== value.callId) changed = true;
    reflections[targetKey] = { ...(reflections[targetKey] || {}), ...target };
  });
  if (changed) reinforcement.reflections = reflections;
  reinforcement.recoveries = reinforcement.recoveries.map((item) => {
    const callId = item.callId === from ? to : item.callId;
    const fromCallId = item.fromCallId === from ? to : item.fromCallId;
    if (callId !== item.callId || fromCallId !== item.fromCallId) changed = true;
    return callId === item.callId && fromCallId === item.fromCallId ? item : { ...item, callId, fromCallId };
  });
  if (reinforcement.recoveryPending?.callId === from) {
    reinforcement.recoveryPending = {
      ...reinforcement.recoveryPending,
      callId: to,
      ...(correctedEndISO ? { endISO: correctedEndISO } : {}),
    };
    changed = true;
  }
  if (reflectionCall?.callId === from) {
    reflectionCall = {
      ...reflectionCall,
      callId: to,
      ...(correctedEndISO ? { endISO: correctedEndISO } : {}),
    };
    changed = true;
  }
  return changed;
}

let initialized = false;
export function initPositiveReinforcement() {
  if (initialized) return;
  initialized = true;
  ensurePositiveState();
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('[data-positive-action], [data-positive-outcome]') : null;
    if (!target) return;
    const settingsAction = ['toggle-history'].includes(target.dataset.positiveAction);
    if (!reinforcementEnabled() && !settingsAction) return;
    if (target.dataset.positiveOutcome) return saveReflection(target.dataset.positiveOutcome);
    const action = target.dataset.positiveAction;
    if (action === 'skip-reflection') { reflectionCall = null; closeModal('positiveReflectionModal'); }
    if (action === 'toggle-history') { historyExpanded = !historyExpanded; renderHistory(); }
  });
  const markInactivityDraft = (event) => {
    event.target.dataset.dirty = 'true';
    inactivityMessageDraftOwner = settings;
    const status = document.getElementById('positiveInactivityMessageStatus');
    if (status) status.textContent = '';
  };
  for (const control of inactivityEditorControls()) {
    control.addEventListener(control.type === 'checkbox' ? 'change' : 'input', markInactivityDraft);
    if (control.type !== 'checkbox') control.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') { event.preventDefault(); saveInactivityMessage(); }
    });
  }
  document.getElementById('positiveInactivityMessageSaveBtn')?.addEventListener('click', saveInactivityMessage);
  document.getElementById('positiveReinforcementEnabledInput')?.addEventListener('change', (event) => {
    const previous = settings.reinforcement.enabled;
    settings.reinforcement.enabled = !!event.target.checked;
    if (saveSettingsOnly() === false) {
      settings.reinforcement.enabled = previous;
      event.target.checked = previous;
      return;
    }
    renderPositiveReinforcement();
  });
  document.getElementById('positiveAskAfterCallInput')?.addEventListener('change', (event) => {
    const previous = settings.reinforcement.askAfterCall;
    settings.reinforcement.askAfterCall = !!event.target.checked;
    if (saveSettingsOnly() === false) {
      settings.reinforcement.askAfterCall = previous;
      event.target.checked = previous;
    }
  });
  document.addEventListener('app:modal-closed', (event) => {
    if (event.detail?.id === 'positiveReflectionModal') reflectionCall = null;
    setTimeout(drainReflectionQueue, 0);
  });
  renderPositiveReinforcement();
}

export function resetPositiveDay(dayKey) {
  reconcilePositiveCalls(dayKey);
  const reinforcement = ensurePositiveState();
  reflectionQueue = reflectionQueue.filter(item => item.dayKey !== dayKey);
  if (reflectionCall?.dayKey === dayKey) {
    reflectionCall = null;
    closeModal('positiveReflectionModal');
  }
}
