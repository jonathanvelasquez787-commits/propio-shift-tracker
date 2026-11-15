import { translateText } from './i18n.js';
import { callFeedbackSilenced } from './call-feedback.js';
import { calls, settings, state } from './app-context.js';
import { initGameAudio, playGameSound, syncGameAudio } from './game-audio.js';
import { activeWorkSinceLastCall, monetaryMilestones } from './reinforcement-rules.js';
import { chooseCallFeedback, configureReinforcementFeedback, normalizeInactivityMinutes, notifyReinforcement, reinforcementFeedbackEnabled, reinforcementText } from './reinforcement-feedback.js';
import {
  createDefaultReinforcementState,
  initPositiveReinforcement,
  normalizeReinforcementState,
  onPositiveCallSaved,
  reconcilePositiveCalls,
  resetPositiveDay,
  renderPositiveReinforcement,
} from './positive-reinforcement.js';

let callDateKeyFromValue, callsForDay, convertedAmountText, effectiveDailyGoal, higherRateBonusForCall;
let importedCallStats, money, saveSettingsOnly, saveStateOnly, todayCallDateKey, getReinforcementWorkIntervals, freelancerDiscipline;

export function configureGameContext(context) {
  ({ callDateKeyFromValue, callsForDay, convertedAmountText, effectiveDailyGoal, higherRateBonusForCall,
    importedCallStats, money, saveSettingsOnly, saveStateOnly, todayCallDateKey,
    getReinforcementWorkIntervals, freelancerDiscipline } = context);
  configureReinforcementFeedback({ queueToast: queueGameToast, playSound: playGameTone });
}

// Prefijos de recibos que el refuerzo positivo usa para no repetir avisos. Todo lo demás se descarta al cargar.
const LEDGER_PREFIXES = Object.freeze(['reinforce-call:', 'money-hit:', 'pause-return:', 'idle-support:', 'dropped-support:']);
const LEGACY_RECEIPT_FIELDS = Object.freeze(['surprise', 'gross', 'applied', 'amount', 'visual']);

export function createDefaultGameState() {
  return {
    version: 1,
    ledger: {},
    reinforcement: createDefaultReinforcementState(),
  };
}

export function normalizeGameState(raw) {
  const fallback = createDefaultGameState();
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const rawLedger = source.ledger && typeof source.ledger === 'object' && !Array.isArray(source.ledger) ? source.ledger : {};
  const ledger = Object.fromEntries(Object.entries(rawLedger)
    .filter(([key, value]) => typeof key === 'string' && key.length <= 180
      && LEDGER_PREFIXES.some((prefix) => key.startsWith(prefix))
      && (value === true || (value && typeof value === 'object' && !Array.isArray(value))))
    .slice(-30000)
    .map(([key, value]) => {
      if (value === true) return [key, true];
      const safe = Object.fromEntries(Object.entries(value).slice(0, 16).flatMap(([field, fieldValue]) => {
        if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(field) || LEGACY_RECEIPT_FIELDS.includes(field)) return [];
        if (typeof fieldValue === 'boolean') return [[field, fieldValue]];
        if (typeof fieldValue === 'number' && Number.isFinite(fieldValue)) return [[field, Math.max(0, Math.min(1000000000, fieldValue))]];
        if (typeof fieldValue === 'string') return [[field, fieldValue.slice(0, 180)]];
        return [];
      }));
      return [key, safe];
    }));
  return {
    ...fallback,
    ledger,
    reinforcement: normalizeReinforcementState(source.reinforcement),
  };
}

function ensureGameSettings() {
  if (!settings.game || typeof settings.game !== 'object' || Array.isArray(settings.game)) settings.game = {};
  delete settings.game.enabled;
  delete settings.game.intensity;
  if (typeof settings.game.soundEnabled !== 'boolean') settings.game.soundEnabled = true;
  const soundVolume = Number(settings.game.soundVolume);
  settings.game.soundVolume = Number.isFinite(soundVolume) ? Math.max(0, Math.min(100, soundVolume)) : 40;
  delete settings.game.monsterName;
  return settings.game;
}

function saveGamePreference(key, value) {
  const owner = settings, game = ensureGameSettings(), previous = game[key];
  game[key] = value;
  if (saveSettingsOnly() !== false) return true;
  if (settings === owner && settings.game === game) game[key] = previous;
  return false;
}

function currentGameDayKey() {
  const startedAt = state.shiftStartedAt ? new Date(state.shiftStartedAt) : null;
  if (startedAt && !Number.isNaN(startedAt.getTime()) && !state.shiftEndedAt) {
    return todayCallDateKey(startedAt);
  }
  return todayCallDateKey();
}

export function ensureGameState() {
  state.game = normalizeGameState(state.game);
  return state.game;
}

function hashText(value) {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// Una llamada cuenta para el refuerzo solo si fue productiva y se importó hace menos de 30 minutos.
function callIsRecentlyProductive(call, dayKey) {
  if (!call) return false;
  const productive = typeof call.countsAsProductive === 'boolean'
    ? call.countsAsProductive
    : String(call.billable).toLowerCase() === 'yes' && String(call.dropped).toLowerCase() !== 'yes';
  if (!productive || !(Number(call.durationMin) > 0)) return false;

  const started = new Date(call.startISO).getTime();
  const ended = new Date(call.endISO).getTime();
  const imported = new Date(call.importedAt).getTime();
  const now = Date.now();
  if (!Number.isFinite(started) || !Number.isFinite(ended) || !Number.isFinite(imported)
    || started > now || ended > now || imported > now) return false;
  const lag = imported - ended;
  if (lag < 0 || lag > 30 * 60000) return false;

  const importedDay = todayCallDateKey(new Date(imported));
  if (importedDay !== todayCallDateKey()) return false;
  if (importedDay === dayKey) return true;

  // Turno nocturno: una llamada puede pertenecer al día contable en que comenzó el shift aunque
  // termine/importarse después de medianoche. Se conserva el límite de importación reciente.
  return callDateKeyFromValue(call.shiftDayKey) === dayKey;
}

function higherRateBonusAmount(call) {
  return Number(higherRateBonusForCall(call)?.amount) || 0;
}

function renderSoundSettings() {
  const soundEnabled = document.getElementById('sidebarGameSoundInput');
  if (soundEnabled) {
    soundEnabled.checked = settings.game.soundEnabled;
    soundEnabled.disabled = false;
  }
}

function clearTransientGameUi() {
  const live = document.getElementById('gameStatusLive');
  if (live && !reinforcementFeedbackEnabled()) live.textContent = '';
}

export function renderGame() {
  ensureGameSettings();
  ensureGameState();
  syncGameAudio();
  pruneDisabledGameToasts();
  clearTransientGameUi();
  renderSoundSettings();
  renderPositiveReinforcement();
  drainGameToasts();
}

export function renderGameLive() {
  drainGameToasts();
}

const gameToastQueue = [];
let lastGameToastText = '';
let lastDisplayedToastText = '';
const TOAST_PRIORITIES = Object.freeze({ record: 4, loot: 3, impulse: 2, critical: 2, '': 1 });

export function announceGameStatus(message) {
  if (callFeedbackSilenced()) return;
  if (!reinforcementFeedbackEnabled() || state.activeCall) return;
  const live = document.getElementById('gameStatusLive');
  if (!live || !message) return;
  live.textContent = '';
  live.textContent = String(message);
}

export function queueGameToast(message, tone = '', options = {}) {
  if (callFeedbackSilenced()) return;
  const text = String(message ?? '').trim();
  const allowed = reinforcementFeedbackEnabled();
  if (!text || !allowed || (options.repeat !== true && text === lastGameToastText)) return;
  const key = `${tone}:${text}`;
  if (gameToastQueue.some((item) => item.key === key) || Array.from(document.querySelectorAll('#gameToastStack [data-game-toast-key]')).some((node) => node.dataset.gameToastKey === key)) return;
  const priority = Number.isFinite(Number(options.priority)) ? Number(options.priority) : (TOAST_PRIORITIES[tone] || 1);
  lastGameToastText = text;
  gameToastQueue.push({ key, message: text, tone, priority, repeat: options.repeat === true });
  gameToastQueue.sort((a, b) => b.priority - a.priority);
  if (options.announce !== false) announceGameStatus(text);
  drainGameToasts();
}

function pruneDisabledGameToasts() {
  const stack = document.getElementById('gameToastStack');
  for (const node of Array.from(stack?.children || [])) {
    if (!reinforcementFeedbackEnabled()) node.remove();
  }
  for (let index = gameToastQueue.length - 1; index >= 0; index--) {
    if (!reinforcementFeedbackEnabled()) gameToastQueue.splice(index, 1);
  }
}

function drainGameToasts() {
  const stack = document.getElementById('gameToastStack');
  if (stack) stack.hidden = !!state.activeCall;
  if (!stack || state.activeCall || document.querySelector('.modal-overlay.open')) return;
  while (gameToastQueue.length && stack.children.length < 3) {
    const item = gameToastQueue.shift();
    const allowed = reinforcementFeedbackEnabled();
    if (!allowed) continue;
    if (!item.repeat && item.message === lastDisplayedToastText) continue;
    lastDisplayedToastText = item.message;
    const toastElement = document.createElement('div');
    toastElement.className = `game-toast ${item.tone ? `game-toast--${item.tone}` : ''}`;
    toastElement.dataset.gameToastKey = item.key;
    toastElement.textContent = item.message;
    stack.appendChild(toastElement);
    requestAnimationFrame(() => toastElement.classList.add('show'));
    setTimeout(() => {
      toastElement.classList.remove('show');
      setTimeout(() => {
        toastElement.remove();
        drainGameToasts();
      }, 220);
    }, 2600);
  }
}

function playGameTone(kind = 'pause', dayKey = currentGameDayKey()) {
  const allowed = () => !state.activeCall && reinforcementFeedbackEnabled() && dayKey === currentGameDayKey();
  if (!allowed()) return false;
  return playGameSound(kind, { allowed });
}

function reinforcementCallKey(call, dayKey) {
  return `reinforce-call:${dayKey}:${String(call.id || `${call.startISO}:${call.customerId}`).slice(0, 120)}`;
}

export function migrateGameCallReferences(oldId, newId) {
  if (!oldId || !newId || oldId === newId) return;
  ensureGameState();
  Object.keys(state.game.ledger).forEach((key) => {
    if (!key.startsWith('reinforce-call:') || !key.endsWith(`:${oldId}`)) return;
    const nextKey = `${key.slice(0, -String(oldId).length)}${newId}`;
    state.game.ledger[nextKey] = state.game.ledger[key];
    delete state.game.ledger[key];
  });
}

export function onGameMonetaryProgress(dayKey, earnings, goal, { silent = false, record = true } = {}) {
  ensureGameState();
  const claimed = [25, 50, 75, 100].filter((pct) => state.game.ledger[`money-hit:${dayKey}:${pct}`]);
  const progress = monetaryMilestones(earnings, goal, claimed);
  if (!record) return progress;
  progress.crossed.forEach((pct) => { state.game.ledger[`money-hit:${dayKey}:${pct}`] = true; });
  if (progress.crossed.length) {
    saveStateOnly();
    if (!silent) notifyReinforcement(reinforcementText('milestone', { percent: progress.crossed.join('%, '), amount: `${money?.(earnings) || `$${Number(earnings).toFixed(2)}`} ${convertedAmountText?.(earnings) || ''}`.trim() }), { effect: true, sound: 'impulse', dayKey });
  }
  return progress;
}

export function checkReinforcementInactivity(now = Date.now()) {
  if (!state?.shiftStartedAt || state.shiftEndedAt || state.activePause || state.activeCall) return false;
  ensureGameState();
  const interruptions = Object.values(state.dayInterruptions || {}).flatMap((items) => Array.isArray(items) ? items : [])
    .map((item) => ({ startedAt: item.gapStart, endedAt: item.gapEnd }));
  // Modo freelancer: sin horario planeado, cualquier momento con el turno abierto cuenta como trabajo.
  const workIntervals = typeof freelancerDiscipline === 'function' && freelancerDiscipline(currentGameDayKey()) ? undefined : getReinforcementWorkIntervals?.(currentGameDayKey());
  if (Array.isArray(workIntervals) && !workIntervals.some((interval) => new Date(interval.startedAt).getTime() <= Number(now) && new Date(interval.endedAt).getTime() > Number(now))) return false;
  const elapsed = activeWorkSinceLastCall({ ...state, calls, now, workIntervals, pauseHistory: [...(state.pauseHistory || []), ...interruptions] });
  const interval = normalizeInactivityMinutes(settings.reinforcement?.inactivityMinutes) * 60000;
  if (elapsed < interval) return false;
  const lastCall = calls.filter((call) => new Date(call.endISO).getTime() <= Number(now))
    .filter((call) => new Date(call.endISO).getTime() >= new Date(state.shiftStartedAt).getTime())
    .sort((a, b) => new Date(b.endISO) - new Date(a.endISO))[0];
  const dayKey = currentGameDayKey();
  const key = `idle-support:${dayKey}:${hashText(lastCall?.endISO || state.shiftStartedAt)}`;
  const previous = state.game.ledger[key];
  if (previous) {
    if (settings.reinforcement?.inactivityRepeat !== true) return false;
    // Legacy receipts have no delivery time; establish a baseline without replaying them.
    if (previous === true || !Number.isFinite(previous.elapsedMs) || elapsed < previous.elapsedMs) {
      state.game.ledger[key] = { elapsedMs: elapsed };
      saveStateOnly();
      return false;
    }
    if (elapsed - previous.elapsedMs < interval) return false;
  }
  state.game.ledger[key] = { elapsedMs: elapsed };
  saveStateOnly();
  notifyReinforcement(reinforcementText('idle'), { repeat: settings.reinforcement?.inactivityRepeat === true });
  return true;
}

function processCallReinforcement(call, source, dayKey) {
  ensureGameState();
  const key = reinforcementCallKey(call, dayKey);
  const existing = state.game.ledger[key];
  if (existing?.feedback) return false;
  const dropped = String(call.dropped).toLowerCase() === 'yes';
  if (dropped) {
    const end = new Date(call.endISO).getTime();
    const imported = new Date(call.importedAt).getTime();
    if (!Number.isFinite(end) || !Number.isFinite(imported) || imported < end || imported - end > 1800000 || end > Date.now() || imported > Date.now()) return false;
    const droppedKey = `dropped-support:${dayKey}`;
    state.game.ledger[key] = { dayKey, feedback: true };
    state.game.reinforcement.recoveryPending = { callId: String(call.id), dayKey, endISO: call.endISO };
    if (!state.game.ledger[droppedKey]) {
      state.game.ledger[droppedKey] = true;
      notifyReinforcement(reinforcementText('dropped'));
    }
    saveStateOnly();
    return false;
  }
  if (!callIsRecentlyProductive(call, dayKey)) return false;
  state.game.ledger[key] = { ...(existing || {}), dayKey, feedback: true };
  const previousCalls = callsForDay(dayKey).filter((item) => item.id !== call.id);
  notifyReinforcement(chooseCallFeedback(call, { previousCalls, bonus: higherRateBonusAmount, money, convertedAmountText }));
  const stats = importedCallStats(callsForDay(dayKey), dayKey);
  onGameMonetaryProgress(dayKey, stats.earnings, effectiveDailyGoal(dayKey).usd);
  saveStateOnly();
  return true;
}

export function onGameCallSaved(call, source = 'manual') {
  if (!call || !['manual', 'live', 'import'].includes(source)) return;
  const dayKey = callDateKeyFromValue(call.shiftDayKey)
    || callDateKeyFromValue(call.callDate)
    || currentGameDayKey();
  processCallReinforcement(call, source, dayKey);
  onPositiveCallSaved(call, source, dayKey);
  saveStateOnly();
}

function syncMoneyProgress(dayKey) {
  const stats = importedCallStats(callsForDay(dayKey), dayKey);
  onGameMonetaryProgress(dayKey, stats.earnings, effectiveDailyGoal(dayKey).usd, { silent: dayKey !== currentGameDayKey() });
}

export function onGameCallsChanged(dayKey) {
  ensureGameState();
  const normalizedDayKey = String(dayKey || '');
  reconcilePositiveCalls(normalizedDayKey);
  syncMoneyProgress(normalizedDayKey);
  return true;
}

export function onGameDayReset(dayKey) {
  ensureGameState();
  const normalized = String(dayKey || '');
  resetPositiveDay(normalized);
  const prefixes = [
    `reinforce-call:${normalized}:`,
    `money-hit:${normalized}:`,
    `pause-return:${normalized}:`,
    `idle-support:${normalized}:`,
    `dropped-support:${normalized}`,
  ];
  Object.keys(state.game.ledger).forEach((key) => {
    if (prefixes.some((prefix) => key.startsWith(prefix))) delete state.game.ledger[key];
  });
  saveStateOnly();
}

export function onGameDayMetadataChanged(dayKey) {
  ensureGameState();
  syncMoneyProgress(String(dayKey || ''));
  saveStateOnly();
}

// Al iniciar un turno solo se guarda una copia del estado: si la llamada que abrió el turno se descarta, se puede volver atrás.
export function onGameShiftStarted({ captureState = null } = {}) {
  ensureGameState();
  captureState?.(JSON.parse(JSON.stringify(state.game)));
  saveStateOnly();
}

export function onGamePauseEnded(pauseRecord, { onTime = false } = {}) {
  ensureGameState();
  if (pauseRecord && ['break', 'lunch'].includes(pauseRecord.type)) {
    const dayKey = callDateKeyFromValue(pauseRecord.shiftDayKey) || currentGameDayKey();
    const key = `pause-return:${dayKey}:${hashText(`${pauseRecord.type}:${pauseRecord.startedAt}`)}`;
    const previous = state.game.ledger[key];
    if (!previous || previous.endedAt !== pauseRecord.endedAt) {
      state.game.ledger[key] = { type: 'pause', dayKey, onTime, endedAt: pauseRecord.endedAt };
      saveStateOnly();
      if (onTime) notifyReinforcement(reinforcementText('pause', { pause: pauseRecord.type === 'lunch' ? translateText('Lunch') : translateText('Break') }, pauseRecord.startedAt), { sound: 'pause', dayKey });
    }
  }
}

export function onGamePauseStarted(type) {
  ensureGameState();
  const pause = state.activePause;
  if (pause) {
    const dayKey = callDateKeyFromValue(pause.shiftDayKey) || currentGameDayKey();
    const key = `pause-return:${dayKey}:${hashText(`${type}:${pause.startedAt}`)}`;
    const receipt = state.game.ledger[key];
    if (receipt) state.game.ledger[key] = { ...receipt, onTime: false, endedAt: '' };
  }
  saveStateOnly();
}

export function onGameDayRollover() {
  // ensureGameState conserva el día en que arrancó un turno nocturno todavía activo.
  ensureGameState();
  saveStateOnly();
}

let gameInitialized = false;

export function initGame() {
  if (gameInitialized) return;
  gameInitialized = true;
  ensureGameSettings();
  ensureGameState();
  initGameAudio();
  syncMoneyProgress(currentGameDayKey());
  initPositiveReinforcement();
  document.getElementById('sidebarGameSoundInput')?.addEventListener('change', (event) => {
    saveGamePreference('soundEnabled', !!event.target.checked);
    syncGameAudio();
    renderSoundSettings();
  });
  document.addEventListener('input', (event) => { if (event.target?.id === 'masterVolumeInput') syncGameAudio(); });
  document.addEventListener('app:modal-closed', drainGameToasts);
}
