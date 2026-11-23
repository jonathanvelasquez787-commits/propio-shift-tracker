import { ui, translateText, translateMarkup, displayLocale } from './i18n.js';
import { settings, state } from './app-context.js';
import { normalizeInactivityMessage, normalizeInactivityMinutes, notifyReinforcement, reinforcementFeedbackEnabled, reinforcementText } from './reinforcement-feedback.js';
import { reflectionPromptSilenced, reinforcementFeedbackSilenced } from './call-feedback.js';

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
    celebrateBridgeCalls: source.celebrateBridgeCalls === true,
    askAfterBridgeCall: source.askAfterBridgeCall === true,
    inactivityMessage: normalizeInactivityMessage(source.inactivityMessage),
    inactivityMinutes: normalizeInactivityMinutes(source.inactivityMinutes),
    inactivityRepeat: source.inactivityRepeat === true,
    inactivityEnabled: source.inactivityEnabled !== false,
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
  const silent = source === 'import' || reinforcementFeedbackSilenced();
  const previous = structuredClone(state.game.reinforcement);
  const feedback = evaluateCallRecovery(call, normalizedDay);
  if (saveStateOnly() === false) {
    state.game.reinforcement = previous;
    return false;
  }
  if (!silent) announceCallRecovery(call, normalizedDay, feedback);
  renderPositiveReinforcement();
  if (!reflectionPromptSilenced() && reinforcementFeedbackEnabled('personal') && settings.reinforcement.askAfterCall && !state.game.reinforcement.reflections[call.id]
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

export function renderSettingsReinforcement() {
  const enabled = document.getElementById('positiveReinforcementEnabledInput');
  const ask = document.getElementById('positiveAskAfterCallInput');
  if (enabled) enabled.checked = settings.reinforcement.enabled;
  if (ask) ask.checked = settings.reinforcement.askAfterCall;
  const soundRow = document.getElementById('sidebarGameSoundRow');
  if (soundRow) soundRow.hidden = !settings.reinforcement.enabled;
  const inactivityOn = settings.reinforcement.inactivityEnabled !== false;
  const inactivitySwitch = document.getElementById('positiveInactivityEnabledInput');
  if (inactivitySwitch) inactivitySwitch.checked = inactivityOn;
  const inactivitySwitchText = document.getElementById('positiveInactivityEnabledText');
  if (inactivitySwitchText) inactivitySwitchText.textContent = translateText(inactivityOn ? 'Encendido' : 'Apagado');
  const inactivityBox = document.getElementById('positiveSettingsAccordion');
  inactivityBox?.classList?.toggle?.('inactivity-off', !inactivityOn);
  for (const control of [...inactivityEditorControls(), document.getElementById('positiveInactivityMessageSaveBtn')].filter(Boolean)) control.disabled = !inactivityOn;
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

const positiveSvg = (path) => `<svg class="positive-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"></path></svg>`;
const POSITIVE_ICON_PATHS = {
  good: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z',
  difficult: 'M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z',
  learning: 'M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z',
  recovery: 'M4 17l6-6 4 4 6-7M15 8h5v5',
};

function greetingTitle(name, completed) {
  if (completed > 0) return name ? ui`Hoy diste todo, ${escapeHtml(name)}.` : translateText('Hoy diste todo.');
  return name ? ui`Hola, ${escapeHtml(name)}.` : translateText('Hola.');
}

function renderEvidence() {
  const root = document.getElementById('positiveEvidenceCard');
  const hero = document.getElementById('positiveHero');
  if (!root) return;
  root.hidden = !reinforcementEnabled();
  if (hero) hero.hidden = !root.hidden;
  if (root.hidden) return;
  const dayKey = currentPositiveDayKey();
  const dayReflections = Object.values(state.game.reinforcement.reflections).filter((item) => item.dayKey === dayKey);
  const good = dayReflections.filter((item) => item.outcome === 'good').length;
  const resilient = dayReflections.filter((item) => item.outcome === 'difficult').length;
  const learning = dayReflections.filter((item) => item.outcome === 'learning').length;
  const recoveries = state.game.reinforcement.recoveries.filter((item) => item.dayKey === dayKey).length;
  const completed = callsForDay(dayKey).length;
  const name = String(settings.userName || '').trim();
  const summary = completed === 0
    ? translateText('Tus llamadas completadas aparecerán aquí.')
    : completed === 1
      ? translateText('1 llamada completada. Cada una cuenta, también las difíciles.')
      : ui`${completed} llamadas completadas. Cada una cuenta, también las difíciles.`;
  const tile = (kind, count, label) => `<div class="positive-tile positive-tile-${kind}">${positiveSvg(POSITIVE_ICON_PATHS[kind === 'hard' ? 'difficult' : kind])}<strong>${count}</strong><span>${label}</span></div>`;
  const strip = recoveries === 0 ? ''
    : `<div class="positive-strip">${positiveSvg(POSITIVE_ICON_PATHS.recovery)}<span>${recoveries === 1
      ? translateText('Hoy volviste a tomar otra llamada 1 vez después de una difícil.')
      : ui`Hoy volviste a tomar otra llamada ${recoveries} veces después de una difícil.`}</span></div>`;
  root.innerHTML = `<div class="positive-greeting-head"><span class="positive-greeting-kicker">${translateText('Historial positivo')}</span><h1 class="positive-greeting-title">${greetingTitle(name, completed)}</h1><p class="positive-greeting-sub">${summary}</p></div>`
    + (completed === 0 ? '' : `<div class="positive-tiles">${tile('good', good, translateText('Cerraron bien'))}${tile('hard', resilient, translateText('Cumplí aunque fue difícil'))}${tile('learning', learning, translateText('Me dejaron un aprendizaje'))}</div>${strip}`);
}

function dayKeyToDate(dayKey) {
  const text = String(dayKey || '');
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const us = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const [year, month, day] = iso ? [iso[1], iso[2], iso[3]].map(Number) : us ? [us[3], us[1], us[2]].map(Number) : [0, 0, 0];
  return year && month && day ? new Date(year, month - 1, day) : null;
}

function daysBetween(earlierKey, laterKey) {
  const earlier = dayKeyToDate(earlierKey), later = dayKeyToDate(laterKey);
  return earlier && later ? Math.round((later - earlier) / 86400000) : NaN;
}

function pickRememberedNote(dayKey) {
  const notes = Object.values(state.game.reinforcement.reflections)
    .filter((item) => item.note && item.dayKey && daysBetween(item.dayKey, dayKey) > 0)
    .sort((a, b) => String(a.callId).localeCompare(String(b.callId)));
  if (!notes.length) return null;
  let seed = 0;
  for (const char of dayKey) seed = (seed * 31 + char.charCodeAt(0)) % 100003;
  return notes[seed % notes.length];
}

function renderRemembered() {
  const root = document.getElementById('positiveRememberCard');
  if (!root) return;
  const dayKey = currentPositiveDayKey();
  const note = reinforcementEnabled() ? pickRememberedNote(dayKey) : null;
  root.hidden = !note;
  if (!note) return;
  const days = daysBetween(note.dayKey, dayKey);
  const ago = days <= 1 ? translateText('Tú, ayer') : ui`Tú, hace ${days} días`;
  root.innerHTML = `<span class="positive-remember-kicker">${translateText('Algo que escribiste')}</span><p class="positive-remember-note">«${escapeHtml(note.note)}»</p><span class="positive-remember-ago">${ago}</span>`;
}

function dayHeading(dayKey, todayKey) {
  const diff = daysBetween(dayKey, todayKey);
  if (diff === 0) return translateText('Hoy');
  if (diff === 1) return translateText('Ayer');
  const date = dayKeyToDate(dayKey);
  return date ? date.toLocaleDateString(displayLocale(), { day: 'numeric', month: 'long', year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' }) : dayKey;
}

function timeLabel(iso) {
  const date = new Date(iso);
  return Number.isFinite(date.getTime()) ? date.toLocaleTimeString(displayLocale(), { hour: 'numeric', minute: '2-digit' }) : '';
}

let historyExpanded = false;
function renderHistory() {
  const root = document.getElementById('positiveHistoryList');
  if (!root) return;
  const reinforcement = state.game.reinforcement;
  const outcomes = { good: translateText('Cerró bien'), difficult: translateText('Cumplí aunque fue difícil'), learning: translateText('Me dejó un aprendizaje') };
  const records = [
    ...Object.values(reinforcement.reflections).map((item) => ({
      at: item.savedAt, dayKey: item.dayKey, kind: item.outcome === 'good' ? 'good' : item.outcome === 'difficult' ? 'hard' : 'learning',
      title: outcomes[item.outcome], note: item.note,
    })),
    ...reinforcement.recoveries.map((item) => ({ at: item.at, dayKey: item.dayKey, kind: 'hard', icon: 'recovery', title: translateText('Volví a tomar otra llamada'), note: '' })),
  ].sort((a, b) => String(b.at).localeCompare(String(a.at)));
  const count = document.getElementById('positiveHistoryCount');
  if (count) count.textContent = String(records.length);
  const shown = historyExpanded ? records : records.slice(0, 8);
  const todayKey = currentPositiveDayKey();
  let html = '';
  let lastDay = null;
  for (const item of shown) {
    if (item.dayKey !== lastDay) {
      html += `<span class="positive-day-heading">${escapeHtml(dayHeading(item.dayKey, todayKey))}</span>`;
      lastDay = item.dayKey;
    }
    const iconPath = POSITIVE_ICON_PATHS[item.icon || (item.kind === 'hard' ? 'difficult' : item.kind)];
    html += `<div class="positive-step"><div class="positive-step-rail"><span class="positive-step-dot positive-tile-${item.kind}">${positiveSvg(iconPath)}</span><span class="positive-step-line"></span></div><div class="positive-step-body"><div class="positive-step-top"><strong>${escapeHtml(item.title)}</strong><time>${escapeHtml(timeLabel(item.at))}</time></div>${item.note ? `<p>«${escapeHtml(item.note)}»</p>` : ''}</div></div>`;
  }
  root.innerHTML = records.length ? html
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
  renderRemembered();
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
  const inactivityWrap = document.getElementById('positiveInactivityEnabledWrap');
  if (typeof inactivityWrap?.addEventListener === 'function') inactivityWrap.addEventListener('click', (event) => event.stopPropagation());
  document.getElementById('positiveInactivityEnabledInput')?.addEventListener('change', (event) => {
    const previous = settings.reinforcement.inactivityEnabled !== false;
    settings.reinforcement.inactivityEnabled = !!event.target.checked;
    if (saveSettingsOnly() === false) {
      settings.reinforcement.inactivityEnabled = previous;
      event.target.checked = previous;
    }
    renderSettingsReinforcement();
  });
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
    renderSettingsReinforcement();
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
