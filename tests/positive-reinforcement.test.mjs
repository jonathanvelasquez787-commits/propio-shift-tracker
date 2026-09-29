import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { setAppCalls, setAppSettings, setAppState } from '../js/app-context.js';
import {
  PHYSICAL_REWARD_PRESETS, configurePositiveReinforcementContext, createDefaultReinforcementState,
  initPositiveReinforcement, migratePositiveCallIdReferences, normalizeReinforcementSettings,
  normalizeReinforcementState, onPositiveCallSaved, reconcilePositiveCalls,
} from '../js/positive-reinforcement.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
function currentDayKey() {
  const now = new Date();
  return `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()}`;
}

test('premios personales y catálogo normalizan límites sin introducir puntos negativos', () => {
  assert.ok(PHYSICAL_REWARD_PRESETS.length >= 15);
  assert.deepEqual(new Set(PHYSICAL_REWARD_PRESETS.map((item) => item.window)), new Set(['break', 'lunch', 'shift-end']));
  assert.ok(PHYSICAL_REWARD_PRESETS.some((item) => item.trigger === 'recovery'));
  assert.ok(PHYSICAL_REWARD_PRESETS.some((item) => item.accumulationTarget > 1));
  const config = normalizeReinforcementSettings({ weeklyBudgetUsd: -2, rewards: [{ id: 'personal', name: '<Mi premio>', every: 500, maxPerDay: 99, accumulationTarget: 50, durationMin: 300, costUsd: -1 }] });
  assert.equal(config.enabled, false);
  assert.equal(normalizeReinforcementSettings({ enabled: true }).enabled, true);
  assert.equal(config.weeklyBudgetUsd, 0);
  assert.deepEqual({ every: config.rewards[0].every, maxPerDay: config.rewards[0].maxPerDay, accumulationTarget: config.rewards[0].accumulationTarget, durationMin: config.rewards[0].durationMin, costUsd: config.rewards[0].costUsd }, { every: 100, maxPerDay: 10, accumulationTarget: 30, durationMin: 240, costUsd: 0 });
  assert.equal(config.rewards[0].name, 'Mi premio');
  assert.deepEqual(normalizeReinforcementState({ recoveries: [{}], pendingRewards: [{ name: '<bad>', window: 'other' }] }).pendingRewards, []);
});

test('llamadas difíciles, premios acumulables, ventana segura y presupuesto conservan el premio', () => {
  const dayKey = currentDayKey();
  const callRows = [];
  const currentState = { game: { reinforcement: createDefaultReinforcementState() } };
  const currentSettings = { reinforcement: { enabled: true, askAfterCall: false, weeklyBudgetUsd: 2, rewards: [{ id: 'tea', name: 'Té especial', icon: '☕', window: 'break', trigger: 'calls', every: 2, accumulationTarget: 2, maxPerDay: 1, costUsd: 3 }] } };
  setAppState(currentState);
  setAppCalls(callRows);
  setAppSettings(currentSettings);
  const listeners = new Map();
  const nodes = new Map([
    ['physicalRewardClaimList', { innerHTML: '' }],
    ['physicalRewardClaimTitle', { textContent: '' }],
  ]);
  const opened = [];
  let swapControl = null;
  globalThis.Element = class { constructor(dataset) { this.dataset = dataset; } closest() { return this; } };
  globalThis.document = {
    getElementById: (id) => nodes.get(id) || null,
    querySelectorAll: () => swapControl ? [swapControl] : [],
    addEventListener: (type, callback) => listeners.set(type, callback),
  };
  configurePositiveReinforcementContext({
    callDateKeyFromValue: (value) => value === dayKey ? value : '',
    callsForDay: (value) => callRows.filter((call) => call.callDate === value),
    closeModal: (id) => opened.push(`close:${id}`),
    convertedAmountText: (amount) => `≈ L ${amount * 25}`,
    effectiveDailyGoal: () => ({ usd: 999 }),
    escapeHtml: (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;'),
    importedCallStats: () => ({ earnings: 0 }),
    openModal: (id) => opened.push(id),
    saveSettingsOnly: () => {},
    saveStateOnly: () => {},
    toast: () => {},
    todayCallDateKey: () => dayKey,
  });
  initPositiveReinforcement();

  const addCall = (id) => {
    const start = Date.now() - 120000 + callRows.length * 15000;
    const call = { id, callDate: dayKey, startISO: new Date(start).toISOString(), endISO: new Date(start + 10000).toISOString(), billable: 'No', dropped: 'Yes' };
    callRows.push(call);
    onPositiveCallSaved(call, 'import', dayKey);
  };
  addCall('c1');
  addCall('c2');
  assert.equal(currentState.game.reinforcement.progress.tea, 1);
  currentState.game.reinforcement.recoveryPending = { callId: 'c2', dayKey };
  addCall('c3');
  addCall('c4');
  assert.equal(currentState.game.reinforcement.recoveries.length, 1);
  assert.equal(currentState.game.reinforcement.pendingRewards.length, 1);
  onPositiveCallSaved(callRows[3], 'import', dayKey);
  assert.equal(currentState.game.reinforcement.pendingRewards.length, 1);
  assert.deepEqual(opened, []);

  const pendingButton = new Element({ positiveAction: 'open-pending' });
  listeners.get('click')({ target: pendingButton });
  assert.deepEqual(opened, []);
  currentState.activePause = { type: 'break' };
  listeners.get('click')({ target: pendingButton });
  assert.deepEqual(opened, ['physicalRewardClaimModal']);
  const earnedId = currentState.game.reinforcement.pendingRewards[0].id;
  const claimButton = new Element({ positiveAction: 'claim', earnedId });
  currentSettings.reinforcement.rewards.push({ id: 'alternate', name: 'Otro premio', icon: '🎁', window: 'break', trigger: 'calls', every: 100, accumulationTarget: 30, maxPerDay: 1, costUsd: 3, durationMin: 5, enabled: true });
  swapControl = { dataset: { rewardSwap: earnedId }, value: 'alternate' };
  currentState.activePause = null;
  listeners.get('click')({ target: new Element({ positiveAction: 'swap', earnedId }) });
  assert.equal(currentState.game.reinforcement.pendingRewards[0].rewardId, 'tea');
  currentState.activePause = { type: 'break' };
  listeners.get('click')({ target: new Element({ positiveAction: 'swap', earnedId }) });
  assert.equal(currentState.game.reinforcement.pendingRewards[0].rewardId, 'alternate');
  assert.equal(currentState.game.reinforcement.pendingRewards[0].sourceRewardId, 'tea');
  for (const id of ['c5', 'c6', 'c7', 'c8']) addCall(id);
  assert.equal(currentState.game.reinforcement.pendingRewards.length, 1, 'cambiar el premio no evade el máximo diario de su origen');
  currentState.activePause = null;
  listeners.get('click')({ target: claimButton });
  assert.equal(currentState.game.reinforcement.pendingRewards.length, 1);
  assert.equal(currentState.game.reinforcement.claims.length, 0);
  currentState.activePause = { type: 'break' };
  listeners.get('click')({ target: claimButton });
  assert.equal(currentState.game.reinforcement.pendingRewards.length, 1);
  assert.equal(currentState.game.reinforcement.claims.length, 0);
  currentSettings.reinforcement.weeklyBudgetUsd = 3;
  listeners.get('click')({ target: claimButton });
  assert.equal(currentState.game.reinforcement.pendingRewards.length, 0);
  assert.equal(currentState.game.reinforcement.claims.length, 1);
  assert.match(nodes.get('physicalRewardClaimList').innerHTML, /≈ L 75/);

  currentSettings.reinforcement.askAfterCall = true;
  const modalCall = { id: 'modal-live', callDate: dayKey, startISO: new Date(Date.now() - 60000).toISOString(), endISO: new Date(Date.now() - 30000).toISOString() };
  callRows.push(modalCall);
  onPositiveCallSaved(modalCall, 'manual', dayKey);
  const correctedEndISO = new Date(Date.now() - 15000).toISOString();
  assert.equal(migratePositiveCallIdReferences('modal-live', 'modal-official', correctedEndISO), true);
  listeners.get('click')({ target: new Element({ positiveOutcome: 'difficult' }) });
  assert.equal(currentState.game.reinforcement.reflections['modal-official'].callId, 'modal-official');
  assert.equal(currentState.game.reinforcement.recoveryPending.callId, 'modal-official');
  assert.equal(currentState.game.reinforcement.recoveryPending.endISO, correctedEndISO);
});

test('reemplazar una llamada live migra las referencias de refuerzo antes de reconciliar', () => {
  const dayKey = currentDayKey();
  const currentState = { game: { reinforcement: {
    ...createDefaultReinforcementState(),
    reflections: { liveId: { callId: 'liveId', outcome: 'difficult', note: 'Nota', dayKey, savedAt: '2026-09-29T12:00:00.000Z' } },
    recoveries: [{ callId: 'liveId', fromCallId: 'priorId', dayKey, at: '2026-09-29T12:01:00.000Z' }],
    recoveryPending: { callId: 'liveId', dayKey, endISO: '2026-09-29T11:59:30.000Z' },
  } } };
  const official = { id: 'officialId', callDate: dayKey, startISO: '2026-09-29T11:59:00.000Z', endISO: '2026-09-29T12:00:00.000Z' };
  const prior = { id: 'priorId', callDate: dayKey, startISO: '2026-09-29T11:58:00.000Z', endISO: '2026-09-29T11:58:30.000Z' };
  setAppState(currentState);
  setAppCalls([prior, official]);
  setAppSettings({ reinforcement: { enabled: true, askAfterCall: false, rewards: [] } });
  configurePositiveReinforcementContext({
    callDateKeyFromValue: (value) => value === dayKey ? value : '',
    callsForDay: (value) => value === dayKey ? [prior, official] : [],
    closeModal: () => {}, convertedAmountText: () => '', effectiveDailyGoal: () => ({ usd: 0 }),
    escapeHtml: (value) => String(value), importedCallStats: () => ({ earnings: 0 }), openModal: () => {},
    saveSettingsOnly: () => {}, saveStateOnly: () => {}, toast: () => {}, todayCallDateKey: () => dayKey,
  });

  assert.equal(migratePositiveCallIdReferences('liveId', 'officialId', '2026-09-29T12:00:00.000Z'), true);
  assert.equal(reconcilePositiveCalls(dayKey), false);
  assert.equal(currentState.game.reinforcement.reflections.liveId, undefined);
  assert.equal(currentState.game.reinforcement.reflections.officialId.callId, 'officialId');
  assert.equal(currentState.game.reinforcement.recoveries[0].callId, 'officialId');
  assert.equal(currentState.game.reinforcement.recoveries[0].fromCallId, 'priorId');
  assert.equal(currentState.game.reinforcement.recoveryPending.callId, 'officialId');
  assert.equal(currentState.game.reinforcement.recoveryPending.endISO, '2026-09-29T12:00:00.000Z');
  const appMain = fs.readFileSync(path.join(root, 'js/app-main.js'), 'utf8');
  const importBody = appMain.slice(appMain.indexOf('function importCalls()'), appMain.indexOf('function clearCallInputBox'));
  assert.ok(importBody.indexOf('migratePositiveCallIdReferences') < importBody.indexOf('onGameCallsChanged'));
  assert.match(importBody, /item\.replacementKind === 'live'\) migratePositiveCallIdReferences\(item\.replaces\?\.id, item\.call\.id, item\.call\.endISO\)/);
});

test('una llamada anterior a la difícil no consume la recuperación pendiente', () => {
  const dayKey = currentDayKey();
  const originEnd = Date.now() - 120000;
  const origin = { id: 'difficult', callDate: dayKey, startISO: new Date(originEnd - 60000).toISOString(), endISO: new Date(originEnd).toISOString() };
  const earlier = { id: 'earlier', callDate: dayKey, startISO: new Date(originEnd - 30000).toISOString(), endISO: new Date(originEnd - 10000).toISOString() };
  const later = { id: 'later', callDate: dayKey, startISO: new Date(originEnd).toISOString(), endISO: new Date(originEnd + 30000).toISOString() };
  const callRows = [origin];
  const currentState = { game: { reinforcement: { ...createDefaultReinforcementState(), recoveryPending: { callId: 'difficult', dayKey, endISO: new Date(originEnd - 60000).toISOString() } } } };
  setAppState(currentState);
  setAppCalls(callRows);
  setAppSettings({ reinforcement: { enabled: true, askAfterCall: false, rewards: [] } });
  configurePositiveReinforcementContext({
    callDateKeyFromValue: (value) => value === dayKey ? value : '',
    callsForDay: (value) => value === dayKey ? callRows : [],
    closeModal: () => {}, convertedAmountText: () => '', effectiveDailyGoal: () => ({ usd: 0 }),
    escapeHtml: (value) => String(value), importedCallStats: () => ({ earnings: 0 }), openModal: () => {},
    saveSettingsOnly: () => {}, saveStateOnly: () => {}, toast: () => {}, todayCallDateKey: () => dayKey,
  });

  callRows.push(earlier);
  onPositiveCallSaved(earlier, 'import', dayKey);
  assert.equal(currentState.game.reinforcement.recoveryPending.callId, 'difficult');
  assert.equal(currentState.game.reinforcement.recoveries.length, 0);
  currentState.game.reinforcement.recoveryPending.endISO = 'legacy-invalid-time';
  const earlierLegacy = { id: 'earlier-legacy', callDate: dayKey, startISO: new Date(originEnd - 5000).toISOString(), endISO: new Date(originEnd + 5000).toISOString() };
  callRows.push(earlierLegacy);
  onPositiveCallSaved(earlierLegacy, 'import', dayKey);
  assert.equal(currentState.game.reinforcement.recoveryPending.callId, 'difficult');
  assert.equal(currentState.game.reinforcement.recoveries.length, 0);
  callRows.push(later);
  onPositiveCallSaved(later, 'import', dayKey);
  assert.equal(currentState.game.reinforcement.recoveryPending, null);
  assert.deepEqual(currentState.game.reinforcement.recoveries.map(({ callId, fromCallId }) => ({ callId, fromCallId })), [{ callId: 'later', fromCallId: 'difficult' }]);
});

test('una cola llena conserva el progreso acumulado sin descartar premios previos', () => {
  const dayKey = currentDayKey();
  const callRows = [];
  const fullQueue = Array.from({ length: 100 }, (_, index) => ({ id: `saved-${index}`, rewardId: 'saved', name: 'Guardado', icon: '🎁', window: 'break', dayKey, triggerKey: `saved:${index}`, earnedAt: '', costUsd: 0, durationMin: 0 }));
  const currentState = { game: { reinforcement: { ...createDefaultReinforcementState(), pendingRewards: fullQueue } } };
  setAppState(currentState);
  setAppCalls(callRows);
  setAppSettings({ reinforcement: { enabled: true, askAfterCall: false, rewards: [{ id: 'snack', name: 'Snack', window: 'break', trigger: 'calls', every: 1, accumulationTarget: 1, maxPerDay: 10 }] } });
  configurePositiveReinforcementContext({
    callDateKeyFromValue: (value) => value === dayKey ? value : '',
    callsForDay: (value) => value === dayKey ? callRows : [],
    closeModal: () => {}, convertedAmountText: () => '', effectiveDailyGoal: () => ({ usd: 0 }),
    escapeHtml: (value) => String(value), importedCallStats: () => ({ earnings: 0 }), openModal: () => {},
    saveSettingsOnly: () => {}, saveStateOnly: () => {}, toast: () => {}, todayCallDateKey: () => dayKey,
  });
  const call = (id, offset) => ({ id, callDate: dayKey, startISO: new Date(Date.now() - 120000 + offset).toISOString(), endISO: new Date(Date.now() - 90000 + offset).toISOString() });
  const first = call('first', 0);
  callRows.push(first);
  onPositiveCallSaved(first, 'import', dayKey);
  assert.equal(currentState.game.reinforcement.pendingRewards.length, 100);
  assert.equal(currentState.game.reinforcement.progress.snack, 1);

  currentState.game.reinforcement.pendingRewards.shift();
  const second = call('second', 30000);
  callRows.push(second);
  onPositiveCallSaved(second, 'import', dayKey);
  assert.equal(currentState.game.reinforcement.pendingRewards.length, 100);
  assert.ok(currentState.game.reinforcement.pendingRewards.some((item) => item.rewardId === 'snack'));
  assert.equal(currentState.game.reinforcement.progress.snack, 1);
});

test('Plan del día se oculta de verdad al apagar gamificación', () => {
  const css = fs.readFileSync(path.join(root, 'css/game.css'), 'utf8');
  const game = fs.readFileSync(path.join(root, 'js/game.js'), 'utf8');
  assert.match(css, /\.positive-reward-editor-grid > \.goals-field\[hidden\]\s*\{\s*display:\s*none\s*!important/);
  const positive = fs.readFileSync(path.join(root, 'js/positive-reinforcement.js'), 'utf8');
  assert.match(positive, /reinforcement\.pendingRewards\.length >= 100/);
  assert.match(positive, /settings\.reinforcement\.rewards\.length >= 60[\s\S]*toast\('Ya tienes el máximo de 60 premios\.'\)/);
  assert.match(css, /\.game-daily-focus\[hidden\][\s\S]*?display:\s*none\s*!important/);
  assert.match(game, /function renderDailyFocus\(\)[\s\S]*?root\.hidden = !gameEnabled\(\)/);
});
