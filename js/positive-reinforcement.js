import { ui, translateText, translateMarkup, displayLocale } from './i18n.js';
import { settings, state } from './app-context.js';
import { notifyReinforcement, reinforcementFeedbackEnabled, reinforcementText } from './reinforcement-feedback.js';

let callDateKeyFromValue, callsForDay, closeModal, convertedAmountText, effectiveDailyGoal;
let escapeHtml, importedCallStats, openModal, saveSettingsOnly, saveStateOnly, toast, todayCallDateKey;

export function configurePositiveReinforcementContext(context) {
  ({ callDateKeyFromValue, callsForDay, closeModal, convertedAmountText, effectiveDailyGoal,
    escapeHtml, importedCallStats, openModal, saveSettingsOnly, saveStateOnly, toast,
    todayCallDateKey } = context);
}

export const PHYSICAL_REWARD_PRESETS = Object.freeze([
  { id: 'favorite-drink', icon: '☕', name: 'Bebida favorita', window: 'break', trigger: 'calls', every: 5 },
  { id: 'favorite-song', icon: '🎵', name: 'Escuchar una canción favorita', window: 'break', trigger: 'calls', every: 3, durationMin: 4 },
  { id: 'fresh-air', icon: '🌤️', name: 'Salir un momento al aire', window: 'break', trigger: 'recovery', every: 1, durationMin: 5 },
  { id: 'stretch', icon: '🧘', name: 'Estiramiento agradable', window: 'break', trigger: 'calls', every: 5, durationMin: 5 },
  { id: 'snack', icon: '🍪', name: 'Snack favorito', window: 'break', trigger: 'calls', every: 8 },
  { id: 'short-scroll', icon: '📱', name: '5 minutos de contenido favorito', window: 'break', trigger: 'calls', every: 8, durationMin: 5 },
  { id: 'dessert', icon: '🍰', name: 'Postre con el Lunch', window: 'lunch', trigger: 'calls', every: 10 },
  { id: 'short-video', icon: '▶️', name: 'Video o parte de un episodio', window: 'lunch', trigger: 'calls', every: 10, durationMin: 10 },
  { id: 'walk', icon: '🚶', name: 'Caminata breve', window: 'lunch', trigger: 'daily-goal', every: 1, durationMin: 10 },
  { id: 'mini-hobby', icon: '🎨', name: 'Avanzar un hobby pequeño', window: 'lunch', trigger: 'daily-goal', every: 1, durationMin: 15 },
  { id: 'gaming', icon: '🎮', name: 'Sesión de videojuego', window: 'shift-end', trigger: 'calls', every: 15, durationMin: 30 },
  { id: 'episode', icon: '📺', name: 'Ver un episodio', window: 'shift-end', trigger: 'daily-goal', every: 1, durationMin: 25 },
  { id: 'favorite-meal', icon: '🍽️', name: 'Comida favorita', window: 'shift-end', trigger: 'daily-goal', every: 1 },
  { id: 'quiet-evening', icon: '🌙', name: 'Noche sin tareas pendientes', window: 'shift-end', trigger: 'daily-goal', every: 1 },
  { id: 'wishlist', icon: '🎁', name: 'Aporte a mi wishlist', window: 'shift-end', trigger: 'calls', every: 5, accumulationTarget: 4, costUsd: 5 },
  { id: 'savings', icon: '🐷', name: 'Aporte a una meta de ahorro', window: 'shift-end', trigger: 'daily-goal', every: 1, accumulationTarget: 3, costUsd: 5 },
]);

const WINDOWS = new Set(['break', 'lunch', 'shift-end']);
const TRIGGERS = new Set(['calls', 'recovery', 'daily-goal']);
const OUTCOMES = new Set(['good', 'difficult', 'learning']);
const WINDOW_LABELS = Object.freeze({ break: translateText('próximo Break'), lunch: translateText('próximo Lunch'), 'shift-end': translateText('fin del turno') });
const TRIGGER_LABELS = Object.freeze({ calls: translateText('llamadas completadas'), recovery: translateText('recuperación'), 'daily-goal': translateText('meta diaria') });

export function createDefaultReinforcementState() {
  return { reflections: {}, recoveries: [], pendingRewards: [], claims: [], earnedKeys: {}, progress: {}, recoveryPending: null };
}

function cleanText(value, max) {
  return String(value ?? '').replace(/[<>]/g, '').trim().slice(0, max);
}

function normalizeReward(raw, fallbackId = '') {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const name = cleanText(raw.name, 80);
  if (!name) return null;
  const id = cleanText(raw.id || fallbackId, 100).replace(/[^a-zA-Z0-9_-]/g, '') || `reward-${Date.now().toString(36)}`;
  const trigger = TRIGGERS.has(raw.trigger) ? raw.trigger : 'calls';
  return {
    id,
    templateId: cleanText(raw.templateId, 80).replace(/[^a-zA-Z0-9_-]/g, '') || null,
    icon: cleanText(raw.icon, 8) || '🎁',
    name,
    window: WINDOWS.has(raw.window) ? raw.window : 'break',
    trigger,
    every: trigger === 'calls' ? Math.max(1, Math.min(100, Math.floor(Number(raw.every) || 5))) : 1,
    maxPerDay: Math.max(1, Math.min(10, Math.floor(Number(raw.maxPerDay) || 1))),
    accumulationTarget: Math.max(1, Math.min(30, Math.floor(Number(raw.accumulationTarget) || 1))),
    durationMin: Math.max(0, Math.min(240, Math.floor(Number(raw.durationMin) || 0))),
    costUsd: Math.max(0, Math.min(100000, Number(raw.costUsd) || 0)),
    enabled: raw.enabled !== false,
  };
}

export function normalizeReinforcementSettings(raw) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const seen = new Set();
  const rewards = (Array.isArray(source.rewards) ? source.rewards : []).slice(0, 60).flatMap((item, index) => {
    const reward = normalizeReward(item, `reward-${index + 1}`);
    if (!reward || seen.has(reward.id)) return [];
    seen.add(reward.id);
    return [reward];
  });
  return {
    enabled: source.enabled === true,
    askAfterCall: source.askAfterCall !== false,
    rewards,
  };
}

export function normalizeReinforcementState(raw) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const reflections = Object.fromEntries(Object.entries(source.reflections || {}).slice(-800).flatMap(([callId, value]) => {
    if (!value || typeof value !== 'object' || !OUTCOMES.has(value.outcome)) return [];
    return [[cleanText(callId, 120), { callId: cleanText(value.callId || callId, 120), outcome: value.outcome, note: cleanText(value.note, 240), dayKey: cleanText(value.dayKey, 10), savedAt: cleanText(value.savedAt, 40) }]];
  }));
  const normalizeEarned = (item) => {
    if (!item || typeof item !== 'object') return null;
    const rewardId = cleanText(item.rewardId, 100);
    const name = cleanText(item.name, 80);
    if (!rewardId || !name || !WINDOWS.has(item.window)) return null;
    return {
      id: cleanText(item.id, 160), rewardId, sourceRewardId: cleanText(item.sourceRewardId || rewardId, 100), name, icon: cleanText(item.icon, 8) || '🎁',
      window: item.window, dayKey: cleanText(item.dayKey, 10), triggerKey: cleanText(item.triggerKey, 180),
      earnedAt: cleanText(item.earnedAt, 40), costUsd: Math.max(0, Math.min(100000, Number(item.costUsd) || 0)),
      durationMin: Math.max(0, Math.min(240, Math.floor(Number(item.durationMin) || 0))),
    };
  };
  const pendingRewards = (Array.isArray(source.pendingRewards) ? source.pendingRewards : []).slice(-100).flatMap((item) => {
    const normalized = normalizeEarned(item);
    return normalized ? [normalized] : [];
  });
  const claims = (Array.isArray(source.claims) ? source.claims : []).slice(-400).flatMap((item) => {
    const normalized = normalizeEarned(item);
    return normalized ? [{ ...normalized, claimedAt: cleanText(item.claimedAt, 40) }] : [];
  });
  const earnedKeys = Object.fromEntries(Object.entries(source.earnedKeys || {}).slice(-1500).filter(([key, value]) => typeof key === 'string' && key.length <= 180 && value === true));
  const progress = Object.fromEntries(Object.entries(source.progress || {}).slice(-60).filter(([key, value]) => typeof key === 'string' && key.length <= 100 && Number.isFinite(Number(value))).map(([key, value]) => [key, Math.max(0, Math.min(10000, Math.floor(Number(value))))]));
  const recoveries = (Array.isArray(source.recoveries) ? source.recoveries : []).slice(-400).flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    return [{ callId: cleanText(item.callId, 120), fromCallId: cleanText(item.fromCallId, 120), dayKey: cleanText(item.dayKey, 10), at: cleanText(item.at, 40) }];
  });
  const recovery = source.recoveryPending && typeof source.recoveryPending === 'object' ? source.recoveryPending : null;
  return {
    reflections, recoveries, pendingRewards, claims, earnedKeys, progress,
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
  return settings.game?.enabled === true && settings.reinforcement.enabled;
}

function makeId(prefix = 'reward') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function activeRewards(trigger) {
  return settings.reinforcement.rewards.filter((reward) => reward.enabled && reward.trigger === trigger);
}

function rewardCountForDay(rewardId, dayKey) {
  const pending = state.game.reinforcement.pendingRewards.filter((item) => (item.sourceRewardId || item.rewardId) === rewardId && item.dayKey === dayKey).length;
  const claimed = state.game.reinforcement.claims.filter((item) => (item.sourceRewardId || item.rewardId) === rewardId && item.dayKey === dayKey).length;
  return pending + claimed;
}

function earnReward(reward, dayKey, triggerKey) {
  const reinforcement = state.game.reinforcement;
  const key = `${triggerKey}:${reward.id}`;
  if (reinforcement.earnedKeys[key]) return null;
  reinforcement.earnedKeys[key] = true;
  reinforcement.progress[reward.id] = (reinforcement.progress[reward.id] || 0) + 1;
  if (reinforcement.progress[reward.id] < reward.accumulationTarget
      || rewardCountForDay(reward.id, dayKey) >= reward.maxPerDay
      || reinforcement.pendingRewards.length >= 100) return null;
  reinforcement.progress[reward.id] -= reward.accumulationTarget;
  const earned = {
    id: makeId('earned'), rewardId: reward.id, sourceRewardId: reward.id, name: reward.name, icon: reward.icon,
    window: reward.window, dayKey, triggerKey: key, earnedAt: new Date().toISOString(), costUsd: reward.costUsd,
    durationMin: reward.durationMin,
  };
  reinforcement.pendingRewards.push(earned);
  reinforcement.pendingRewards = reinforcement.pendingRewards.slice(-100);
  return earned;
}

function evaluateCallRewards(call, dayKey, { silent = false } = {}) {
  const reinforcement = state.game.reinforcement;
  const dayCalls = callsForDay(dayKey).filter((item) => String(item?.dropped).toLowerCase() !== 'yes'
    && item?.endISO && new Date(item.endISO).getTime() <= Date.now());
  const count = dayCalls.length;
  const earned = [];
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
      activeRewards('recovery').forEach((reward) => {
        const item = earnReward(reward, dayKey, `recovery:${dayKey}:${call.id}`);
        if (item) earned.push(item);
      });
      reinforcement.recoveryPending = null;
    }
  }

  activeRewards('calls').forEach((reward) => {
    if (count > 0 && count % reward.every === 0) {
      const item = earnReward(reward, dayKey, `calls:${dayKey}:${count}`);
      if (item) earned.push(item);
    }
  });

  const goal = Number(effectiveDailyGoal(dayKey)?.usd) || 0;
  const earnings = Number(importedCallStats(dayCalls, dayKey)?.earnings) || 0;
  if (goal > 0 && earnings >= goal) {
    activeRewards('daily-goal').forEach((reward) => {
      const item = earnReward(reward, dayKey, `daily-goal:${dayKey}`);
      if (item) earned.push(item);
    });
  }

  if (!silent && earned.length) {
    const first = earned[0];
    notifyReinforcement(reinforcementText('reward-earned', {
      icon: first.icon, window: WINDOW_LABELS[first.window], name: first.name,
      extra: earned.length > 1 ? ui` · +${earned.length - 1} más` : '',
    }, call.id), { channel: 'personal', sound: 'reward', dayKey });
  } else if (!silent && recovered) {
    notifyReinforcement(reinforcementText('recovery', {}, call.id), { channel: 'personal', sound: 'pause', dayKey });
  }
  return earned;
}

let reflectionCall = null;
let editingRewardId = null;
let editingTemplateId = null;
let deferredWindow = null;

export function clearPositiveReinforcementTransients() {
  reflectionCall = null;
  editingRewardId = null;
  editingTemplateId = null;
  deferredWindow = null;
}

function renderReflectionModal(call, dayKey) {
  reflectionCall = { callId: String(call.id), dayKey, endISO: call.endISO };
  const note = document.getElementById('positiveReflectionNote');
  if (note) note.value = '';
  const title = document.getElementById('positiveReflectionCall');
  if (title) title.textContent = ui`Llamada #${call.customerId || 'completada'}`;
  openModal('positiveReflectionModal');
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
  const silent = source === 'import';
  evaluateCallRewards(call, normalizedDay, { silent });
  saveStateOnly();
  renderPositiveReinforcement();
  if (!silent && reinforcementFeedbackEnabled('personal') && settings.reinforcement.askAfterCall && !state.game.reinforcement.reflections[call.id]) {
    renderReflectionModal(call, normalizedDay);
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
  const note = cleanText(document.getElementById('positiveReflectionNote')?.value, 240);
  state.game.reinforcement.reflections[reflectionCall.callId] = {
    callId: reflectionCall.callId, outcome, note, dayKey: reflectionCall.dayKey, savedAt: new Date().toISOString(),
  };
  if (outcome === 'difficult' || outcome === 'learning') {
    state.game.reinforcement.recoveryPending = { callId: reflectionCall.callId, dayKey: reflectionCall.dayKey, endISO: reflectionCall.endISO };
  }
  const message = reinforcementText(`reflection-${outcome}`, {}, reflectionCall.callId);
  reflectionCall = null;
  saveStateOnly();
  closeModal('positiveReflectionModal');
  renderPositiveReinforcement();
  notifyReinforcement(message, { channel: 'personal' });
}

function availableForWindow(windowName) {
  return state.game.reinforcement.pendingRewards.filter((item) => item.window === windowName);
}

function currentRewardWindow() {
  if (state.activeCall) return null;
  if (state.activePause?.type === 'break' || state.activePause?.type === 'lunch') return state.activePause.type;
  return state.shiftEndedAt ? 'shift-end' : null;
}

function renderClaimWindow(windowName) {
  if (!reinforcementEnabled() || currentRewardWindow() !== windowName) return false;
  const root = document.getElementById('physicalRewardClaimList');
  const title = document.getElementById('physicalRewardClaimTitle');
  if (!root || !title) return false;
  const available = availableForWindow(windowName);
  if (!available.length) return false;
  title.textContent = windowName === 'shift-end' ? translateText('Premios para cerrar tu turno') : ui`Premios para tu ${windowName === 'lunch' ? translateText('Lunch') : translateText('Break')}`;
  const alternatives = settings.reinforcement.rewards.filter((reward) => reward.enabled && reward.window === windowName);
  root.innerHTML = available.map((item) => {
    const swaps = alternatives.filter((reward) => reward.id !== item.rewardId);
    return ui`<article class="physical-reward-claim" data-earned-reward="${escapeHtml(item.id)}">
      <span class="physical-reward-claim-icon" aria-hidden="true">${escapeHtml(item.icon)}</span>
      <div><strong>${escapeHtml(item.name)}</strong><small>Lo ganaste con ${escapeHtml(TRIGGER_LABELS[item.triggerKey.split(':')[0]] || translateText('tu constancia'))}${item.durationMin > 0 ? ` · ${item.durationMin} min` : ''}${item.costUsd > 0 ? ` · $${item.costUsd.toFixed(2)} ${escapeHtml(convertedAmountText(item.costUsd))}` : ''}</small></div>
      <button type="button" data-positive-action="claim" data-earned-id="${escapeHtml(item.id)}">Realizado</button>
      ${swaps.length ? ui`<select aria-label="Cambiar premio" data-reward-swap="${escapeHtml(item.id)}">${swaps.map((reward) => ui`<option value="${escapeHtml(reward.id)}">${escapeHtml(reward.icon)} ${escapeHtml(reward.name)}</option>`).join('')}</select><button type="button" data-positive-action="swap" data-earned-id="${escapeHtml(item.id)}">Cambiar</button>` : ''}
    </article>`;
  }).join('');
  return true;
}

export function onPositiveRewardWindow(windowName, { manual = false } = {}) {
  if (!reinforcementEnabled() || (!manual && !reinforcementFeedbackEnabled('personal')) || !WINDOWS.has(windowName) || currentRewardWindow() !== windowName || !availableForWindow(windowName).length) return false;
  if (windowName === 'shift-end' && document.getElementById('stageClearModal')?.classList.contains('open')) {
    deferredWindow = { windowName, manual };
    return true;
  }
  if (!renderClaimWindow(windowName)) return false;
  openModal('physicalRewardClaimModal');
  return true;
}

function openPendingRewardsNow() {
  if (!reinforcementEnabled()) return;
  const windowName = currentRewardWindow();
  if (!windowName) {
    toast(translateText('Tus premios esperan al próximo Break, Lunch o fin del turno.'));
    return;
  }
  if (!onPositiveRewardWindow(windowName, { manual: true })) toast(translateText('No hay premios para esta pausa; los demás siguen guardados.'));
}

function claimReward(id) {
  if (!reinforcementEnabled()) return;
  const index = state.game.reinforcement.pendingRewards.findIndex((item) => item.id === id);
  if (index < 0) return;
  const item = state.game.reinforcement.pendingRewards[index];
  if (currentRewardWindow() !== item.window) {
    closeModal('physicalRewardClaimModal');
    toast(translateText('La ventana terminó; el premio sigue guardado para después.'));
    return;
  }
  state.game.reinforcement.pendingRewards.splice(index, 1);
  state.game.reinforcement.claims.push({ ...item, claimedAt: new Date().toISOString() });
  state.game.reinforcement.claims = state.game.reinforcement.claims.slice(-400);
  saveStateOnly();
  renderPositiveReinforcement();
  const remaining = availableForWindow(item.window);
  if (remaining.length) renderClaimWindow(item.window);
  else closeModal('physicalRewardClaimModal');
  notifyReinforcement(reinforcementText('reward-claimed', { icon: item.icon, name: item.name }, item.id), { channel: 'personal', sound: 'reward' });
}

function swapReward(id) {
  if (!reinforcementEnabled()) return;
  const item = state.game.reinforcement.pendingRewards.find((entry) => entry.id === id);
  if (!item) return;
  if (currentRewardWindow() !== item.window) {
    closeModal('physicalRewardClaimModal');
    toast(translateText('La ventana terminó; el premio sigue guardado para después.'));
    return;
  }
  const select = Array.from(document.querySelectorAll('[data-reward-swap]')).find((node) => node.dataset.rewardSwap === id);
  const replacement = settings.reinforcement.rewards.find((reward) => reward.id === select?.value && reward.enabled && reward.window === item.window);
  if (!replacement) return;
  Object.assign(item, { rewardId: replacement.id, name: replacement.name, icon: replacement.icon, costUsd: replacement.costUsd, durationMin: replacement.durationMin });
  saveStateOnly();
  renderClaimWindow(item.window);
}

function rewardEditorValues() {
  const trigger = document.getElementById('physicalRewardTriggerInput')?.value;
  return normalizeReward({
    id: editingRewardId || makeId(), templateId: editingTemplateId,
    icon: document.getElementById('physicalRewardIconInput')?.value,
    name: document.getElementById('physicalRewardNameInput')?.value,
    window: document.getElementById('physicalRewardWindowInput')?.value,
    trigger,
    every: document.getElementById('physicalRewardEveryInput')?.value,
    maxPerDay: document.getElementById('physicalRewardMaxInput')?.value,
    accumulationTarget: document.getElementById('physicalRewardAccumulationInput')?.value,
    durationMin: document.getElementById('physicalRewardDurationInput')?.value,
    costUsd: document.getElementById('physicalRewardCostInput')?.value,
    enabled: true,
  });
}

function syncRewardEditorConditional() {
  const trigger = document.getElementById('physicalRewardTriggerInput')?.value;
  const row = document.getElementById('physicalRewardEveryRow');
  if (row) row.hidden = trigger !== 'calls';
  const amount = Math.max(0, Number(document.getElementById('physicalRewardCostInput')?.value) || 0);
  const helper = document.getElementById('physicalRewardCostConverted');
  if (helper) helper.textContent = amount > 0 ? convertedAmountText(amount) : '';
}

function openRewardEditor(reward = null, template = null) {
  if (settings.game?.enabled !== true) return;
  const source = reward || template || { icon: '🎁', name: '', window: 'break', trigger: 'calls', every: 5, maxPerDay: 1, accumulationTarget: 1, durationMin: 0, costUsd: 0 };
  editingRewardId = reward?.id || null;
  editingTemplateId = reward?.templateId || template?.id || null;
  document.getElementById('physicalRewardEditorTitle').textContent = reward ? translateText('Editar premio') : translateText('Agregar premio');
  document.getElementById('physicalRewardIconInput').value = source.icon || '🎁';
  document.getElementById('physicalRewardNameInput').value = (template ? translateText(source.name) : source.name) || '';
  document.getElementById('physicalRewardWindowInput').value = source.window || 'break';
  document.getElementById('physicalRewardTriggerInput').value = source.trigger || 'calls';
  document.getElementById('physicalRewardEveryInput').value = source.every || 5;
  document.getElementById('physicalRewardMaxInput').value = source.maxPerDay || 1;
  document.getElementById('physicalRewardAccumulationInput').value = source.accumulationTarget || 1;
  document.getElementById('physicalRewardDurationInput').value = source.durationMin || '';
  document.getElementById('physicalRewardCostInput').value = source.costUsd || '';
  document.getElementById('deletePhysicalRewardBtn').hidden = !reward;
  syncRewardEditorConditional();
  openModal('physicalRewardEditorModal');
}

function saveRewardEditor() {
  if (settings.game?.enabled !== true) return;
  const reward = rewardEditorValues();
  if (!reward) {
    toast(translateText('Escribe un nombre para el premio.'));
    return;
  }
  const index = settings.reinforcement.rewards.findIndex((item) => item.id === editingRewardId);
  if (index >= 0) settings.reinforcement.rewards[index] = reward;
  else {
    if (settings.reinforcement.rewards.length >= 60) {
      toast(translateText('Ya tienes el máximo de 60 premios.'));
      return;
    }
    settings.reinforcement.rewards.push(reward);
  }
  saveSettingsOnly();
  closeModal('physicalRewardEditorModal');
  renderPositiveReinforcement();
  toast(translateText('Premio guardado'));
}

function deleteRewardEditor() {
  if (settings.game?.enabled !== true || !editingRewardId) return;
  settings.reinforcement.rewards = settings.reinforcement.rewards.filter((item) => item.id !== editingRewardId);
  saveSettingsOnly();
  closeModal('physicalRewardEditorModal');
  renderPositiveReinforcement();
}

function renderSettingsRewards() {
  const catalog = document.getElementById('physicalRewardCatalog');
  const selected = document.getElementById('physicalRewardSelected');
  const enabled = document.getElementById('positiveReinforcementEnabledInput');
  const ask = document.getElementById('positiveAskAfterCallInput');
  if (enabled) enabled.checked = settings.reinforcement.enabled;
  if (ask) ask.checked = settings.reinforcement.askAfterCall;
  const picker = document.getElementById('physicalRewardPresetSelect');
  if (catalog && picker) {
    const previous = picker.value;
    picker.innerHTML = PHYSICAL_REWARD_PRESETS.map(preset => ui`<option value="${escapeHtml(preset.id)}">${escapeHtml(preset.icon)} ${escapeHtml(translateText(preset.name))}</option>`).join('');
    if (PHYSICAL_REWARD_PRESETS.some(preset => preset.id === previous)) picker.value = previous;
    syncPresetSelection();
  }
  if (selected) selected.innerHTML = settings.reinforcement.rewards.length
    ? settings.reinforcement.rewards.map((reward) => ui`<button type="button" class="physical-reward-selected" data-positive-action="edit-reward" data-reward-id="${escapeHtml(reward.id)}"><span>${escapeHtml(reward.icon)}</span><strong>${escapeHtml(reward.name)}</strong><small>${escapeHtml(WINDOW_LABELS[reward.window])}${reward.accumulationTarget > 1 ? ui` · ${Math.min(state.game.reinforcement.progress[reward.id] || 0, reward.accumulationTarget)}/${reward.accumulationTarget} hitos` : ''}</small></button>`).join('')
    : translateMarkup('<p class="game-collection-empty">Aún no elegiste premios. Agrega uno del catálogo o crea el tuyo.</p>');
}

function syncPresetSelection() {
  const preset = PHYSICAL_REWARD_PRESETS.find(item => item.id === document.getElementById('physicalRewardPresetSelect')?.value);
  const button = document.getElementById('physicalRewardPresetAdd');
  const description = document.getElementById('physicalRewardPresetDescription');
  if (!preset || !button || !description) return;
  const added = settings.reinforcement.rewards.find(reward => reward.templateId === preset.id);
  button.dataset.positiveAction = added ? 'edit-reward' : 'add-preset';
  button.dataset.templateId = preset.id;
  button.dataset.rewardId = added?.id || '';
  button.textContent = added ? translateText('Editar premio') : translateText('Agregar premio');
  description.textContent = ui`${WINDOW_LABELS[preset.window]} · ${TRIGGER_LABELS[preset.trigger]}${preset.accumulationTarget > 1 ? ui` · ${preset.accumulationTarget} hitos` : ''}${preset.durationMin ? ui` · ${preset.durationMin} min` : ''}`;
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
  const pending = state.game.reinforcement.pendingRewards.length;
  root.innerHTML = ui`<div><span>PRUEBA POSITIVA DE HOY</span><strong>${completed === 1 ? ui`${completed} llamada completada` : ui`${completed} llamadas completadas`}</strong><small>${good} cerraron bien · ${resilient} difíciles que enfrentaste · ${learning} aprendizajes · ${recoveries} recuperaciones</small></div><div class="positive-evidence-rewards"><b>${pending}</b><span>${pending === 1 ? translateText('premio disponible') : translateText('premios disponibles')}</span><button type="button" data-positive-action="open-pending" ${pending ? '' : 'disabled'}>Ver premios</button></div>`;
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
    ...reinforcement.claims.map((item) => ({ at: item.claimedAt, dayKey: item.dayKey, icon: item.icon, title: ui`Premio realizado: ${item.name}`, note: '' })),
  ].sort((a, b) => String(b.at).localeCompare(String(a.at)));
  const count = document.getElementById('positiveHistoryCount');
  if (count) count.textContent = String(records.length);
  root.innerHTML = records.length
    ? (historyExpanded ? records : records.slice(0, 8)).map((item) => ui`<div class="positive-history-row"><span aria-hidden="true">${escapeHtml(item.icon)}</span><div><strong>${escapeHtml(item.title)}</strong>${item.note ? ui`<small>${escapeHtml(item.note)}</small>` : ''}</div><time>${escapeHtml(item.dayKey)}</time></div>`).join('')
    : translateMarkup('<div class="game-collection-empty">Tus llamadas y premios realizados aparecerán aquí.</div>');
  const toggle = document.getElementById('positiveHistoryToggle');
  if (toggle) {
    toggle.hidden = records.length <= 8;
    toggle.textContent = historyExpanded ? translateText('Ver menos') : ui`Ver todo (${records.length})`;
  }
}

export function renderPositiveReinforcement() {
  ensurePositiveState();
  if (settings.game?.enabled !== true) {
    clearPositiveReinforcementTransients();
    for (const id of ['positiveReflectionModal', 'physicalRewardClaimModal', 'physicalRewardEditorModal']) {
      if (document.getElementById(id)?.classList?.contains?.('open')) closeModal(id);
    }
  }
  renderSettingsRewards();
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
    if (!target || settings.game?.enabled !== true) return;
    if (target.dataset.positiveOutcome) return saveReflection(target.dataset.positiveOutcome);
    const action = target.dataset.positiveAction;
    if (action === 'skip-reflection') { reflectionCall = null; closeModal('positiveReflectionModal'); }
    if (action === 'claim') claimReward(target.dataset.earnedId);
    if (action === 'swap') swapReward(target.dataset.earnedId);
    if (action === 'add-preset') openRewardEditor(null, PHYSICAL_REWARD_PRESETS.find((item) => item.id === target.dataset.templateId));
    if (action === 'edit-reward') openRewardEditor(settings.reinforcement.rewards.find((item) => item.id === target.dataset.rewardId));
    if (action === 'new-reward') openRewardEditor();
    if (action === 'open-pending') openPendingRewardsNow();
    if (action === 'toggle-history') { historyExpanded = !historyExpanded; renderHistory(); }
  });
  document.getElementById('physicalRewardPresetSelect')?.addEventListener('change', syncPresetSelection);
  document.getElementById('savePhysicalRewardBtn')?.addEventListener('click', saveRewardEditor);
  document.getElementById('deletePhysicalRewardBtn')?.addEventListener('click', deleteRewardEditor);
  document.getElementById('physicalRewardTriggerInput')?.addEventListener('change', syncRewardEditorConditional);
  document.getElementById('physicalRewardCostInput')?.addEventListener('input', syncRewardEditorConditional);
  document.getElementById('positiveReinforcementEnabledInput')?.addEventListener('change', (event) => {
    settings.reinforcement.enabled = !!event.target.checked;
    saveSettingsOnly();
    renderPositiveReinforcement();
  });
  document.getElementById('positiveAskAfterCallInput')?.addEventListener('change', (event) => {
    settings.reinforcement.askAfterCall = !!event.target.checked;
    saveSettingsOnly();
  });
  document.addEventListener('app:modal-closed', (event) => {
    if (event.detail?.id === 'positiveReflectionModal') reflectionCall = null;
    if (event.detail?.id === 'stageClearModal' && deferredWindow) {
      const { windowName, manual } = deferredWindow;
      deferredWindow = null;
      setTimeout(() => onPositiveRewardWindow(windowName, { manual }), 0);
    }
  });
  renderPositiveReinforcement();
}
