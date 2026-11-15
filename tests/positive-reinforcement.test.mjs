import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { translateText } from '../js/i18n.js';
import { setAppCalls, setAppSettings, setAppState } from '../js/app-context.js';
import {
  configurePositiveReinforcementContext, createDefaultReinforcementState,
  initPositiveReinforcement, migratePositiveCallIdReferences, normalizeReinforcementSettings,
  normalizeReinforcementState, onPositiveCallSaved, reconcilePositiveCalls,
  reopenPositiveReflection, clearPositiveReinforcementTransients,
  renderPositiveReinforcement, saveInactivityMessage,
} from '../js/positive-reinforcement.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
function currentDayKey() {
  const now = new Date();
  return `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()}`;
}

test('ajustes y estado del refuerzo no guardan premios y borran lo viejo', () => {
  const config = normalizeReinforcementSettings({ weeklyBudgetUsd: -2, rewards: [{ id: 'personal', name: 'Mi premio' }] });
  assert.equal(config.enabled, false);
  assert.equal(normalizeReinforcementSettings({ enabled: true }).enabled, true);
  assert.equal(Object.hasOwn(config, 'weeklyBudgetUsd'), false);
  assert.equal(Object.hasOwn(config, 'rewards'), false);
  const state = normalizeReinforcementState({ recoveries: [{}], pendingRewards: [{ name: 'x', window: 'break' }], claims: [{}], earnedKeys: { a: true }, progress: { a: 1 } });
  assert.deepEqual(Object.keys(state).sort(), ['recoveries', 'recoveryPending', 'reflections']);
  assert.deepEqual(Object.keys(createDefaultReinforcementState()).sort(), ['recoveries', 'recoveryPending', 'reflections']);
});

test('inactivity editor preserves drafts, rolls back rejected saves and restores defaults with achievements off', (t) => {
  const previousDocument = globalThis.document;
  t.after(() => { globalThis.document = previousDocument; setAppState(null); setAppSettings({}); setAppCalls([]); });
  const config = { game: { enabled: false }, reinforcement: { enabled: true, inactivityMessage: 'Anterior', rewards: [] } };
  setAppSettings(config); setAppCalls([]); setAppState({ game: { reinforcement: createDefaultReinforcementState() } });
  const input = { value: '', dataset: {} }, status = { textContent: '' };
  globalThis.document = { activeElement: null, getElementById: id => id === 'positiveInactivityMessageInput' ? input : id === 'positiveInactivityMessageStatus' ? status : null };
  let accepted = true;
  const saved = [];
  configurePositiveReinforcementContext({ saveSettingsOnly: () => { if (accepted) saved.push(structuredClone(config.reinforcement)); return accepted; } });
  renderPositiveReinforcement();
  assert.equal(input.value, 'Anterior');
  input.value = '  Mi mensaje <3  '; input.dataset.dirty = 'true';
  renderPositiveReinforcement();
  assert.equal(input.value, '  Mi mensaje <3  ');
  assert.equal(saveInactivityMessage(), true);
  assert.equal(config.reinforcement.inactivityMessage, 'Mi mensaje <3');
  assert.equal(saved.at(-1).inactivityMessage, 'Mi mensaje <3');
  assert.equal(input.dataset.dirty, undefined);
  input.value = 'Reintentar'; input.dataset.dirty = 'true'; accepted = false;
  assert.equal(saveInactivityMessage(), false);
  assert.equal(config.reinforcement.inactivityMessage, 'Mi mensaje <3');
  renderPositiveReinforcement();
  assert.equal(input.value, 'Reintentar');
  assert.equal(status.textContent, translateText('No se pudo guardar el mensaje.'));
  accepted = true; input.value = '  ';
  assert.equal(saveInactivityMessage(), true);
  assert.equal(config.reinforcement.inactivityMessage, '');
  assert.equal(config.game.enabled, false);
});

test('inactivity editor cannot copy a previous account message into a new settings owner', (t) => {
  const previousDocument = globalThis.document;
  t.after(() => { globalThis.document = previousDocument; setAppState(null); setAppSettings({}); setAppCalls([]); });
  const previous = { reinforcement: { enabled: true, inactivityMessage: 'Cuenta anterior' } };
  const incoming = { reinforcement: { enabled: true, inactivityMessage: 'Otra cuenta' } };
  const input = { value: '', dataset: {} }, status = { textContent: '' };
  globalThis.document = { activeElement: null, getElementById: id => id === 'positiveInactivityMessageInput' ? input : id === 'positiveInactivityMessageStatus' ? status : null };
  setAppSettings(previous); setAppCalls([]); setAppState({ game: { reinforcement: createDefaultReinforcementState() } });
  configurePositiveReinforcementContext({ saveSettingsOnly: () => { setAppSettings(incoming); return false; } });
  renderPositiveReinforcement(); input.value = 'Borrador anterior'; input.dataset.dirty = 'true';
  assert.equal(saveInactivityMessage(), false);
  assert.equal(incoming.reinforcement.inactivityMessage, 'Otra cuenta');
  assert.equal(input.value, 'Otra cuenta');
  assert.equal(input.dataset.dirty, undefined);
});

test('inactivity frequency editor saves atomically, validates minutes and preserves or clears account drafts', (t) => {
  const previousDocument = globalThis.document;
  t.after(() => { globalThis.document = previousDocument; setAppState(null); setAppSettings({}); setAppCalls([]); });
  let config = { game: { enabled: false }, reinforcement: { enabled: true, inactivityMessage: 'Anterior' } };
  setAppSettings(config); setAppCalls([]); setAppState({ game: { reinforcement: createDefaultReinforcementState() } });
  const nodes = new Map([
    ['positiveInactivityMessageInput', { value: '', dataset: {} }],
    ['positiveInactivityMinutesInput', { value: '', dataset: {}, focus() {} }],
    ['positiveInactivityRepeatInput', { checked: false, dataset: {}, id: 'positiveInactivityRepeatInput' }],
    ['positiveInactivityMessageStatus', { textContent: '' }],
  ]);
  globalThis.document = { activeElement: null, getElementById: id => nodes.get(id) || null };
  let accepted = true, saves = 0;
  configurePositiveReinforcementContext({ saveSettingsOnly: () => { saves++; return accepted; } });
  renderPositiveReinforcement();
  const input = nodes.get('positiveInactivityMessageInput'), minutes = nodes.get('positiveInactivityMinutesInput'), repeat = nodes.get('positiveInactivityRepeatInput');
  assert.equal(minutes.value, '60'); assert.equal(repeat.checked, false);
  input.value = 'Nuevo'; minutes.value = '15'; repeat.checked = true;
  for (const control of [input, minutes, repeat]) control.dataset.dirty = 'true';
  renderPositiveReinforcement(); assert.equal(minutes.value, '15'); assert.equal(repeat.checked, true);
  const before = structuredClone(config.reinforcement);
  accepted = false; assert.equal(saveInactivityMessage(), false); assert.deepEqual(config.reinforcement, before);
  renderPositiveReinforcement(); assert.equal(minutes.value, '15'); assert.equal(input.value, 'Nuevo'); assert.equal(repeat.checked, true);
  accepted = true;
  for (const invalid of ['', '0', '241', '1.5', 'bad']) {
    minutes.value = invalid; const attempts = saves;
    assert.equal(saveInactivityMessage(), false); assert.equal(saves, attempts); assert.deepEqual(config.reinforcement, before);
  }
  minutes.value = '15'; assert.equal(saveInactivityMessage(), true);
  assert.equal(config.reinforcement.inactivityMinutes, 15); assert.equal(config.reinforcement.inactivityRepeat, true);
  assert.equal(input.dataset.dirty, undefined); assert.equal(minutes.dataset.dirty, undefined); assert.equal(repeat.dataset.dirty, undefined);
  minutes.value = '30'; minutes.dataset.dirty = 'true'; repeat.checked = false; repeat.dataset.dirty = 'true';
  config = { reinforcement: { enabled: true, inactivityMinutes: 10, inactivityRepeat: true, inactivityMessage: 'Otra cuenta' } };
  setAppSettings(config); renderPositiveReinforcement();
  assert.equal(minutes.value, '10'); assert.equal(repeat.checked, true); assert.equal(input.value, 'Otra cuenta');
  assert.equal(minutes.dataset.dirty, undefined); assert.equal(repeat.dataset.dirty, undefined);
});

test('la recuperación se registra una sola vez y la reflexión sobrevive al reemplazo de la llamada', async () => {
  const dayKey = currentDayKey();
  const callRows = [];
  const currentState = { game: { reinforcement: createDefaultReinforcementState() } };
  const currentSettings = { game: { enabled: true }, reinforcement: { enabled: true, askAfterCall: false } };
  setAppState(currentState);
  setAppCalls(callRows);
  setAppSettings(currentSettings);
  const listeners = new Map();
  const nodes = new Map();
  const opened = [];
  globalThis.Element = class { constructor(dataset) { this.dataset = dataset; } closest() { return this; } };
  globalThis.document = {
    getElementById: (id) => nodes.get(id) || null,
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
    const call = { id, callDate: dayKey, startISO: new Date(start).toISOString(), endISO: new Date(start + 10000).toISOString(), billable: 'Yes', dropped: 'No' };
    callRows.push(call);
    onPositiveCallSaved(call, 'import', dayKey);
  };
  addCall('c1');
  addCall('c2');
  currentState.game.reinforcement.recoveryPending = { callId: 'c2', dayKey };
  addCall('c3');
  addCall('c4');
  assert.equal(currentState.game.reinforcement.recoveries.length, 1);
  onPositiveCallSaved(callRows[3], 'import', dayKey);
  assert.equal(currentState.game.reinforcement.recoveries.length, 1, 'repetir el guardado no duplica la recuperación');
  assert.deepEqual(opened, []);

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

  const demoReflectionCall = { id: 'qa-reflection', customerId: 'QA-01', callDate: dayKey, endISO: new Date(Date.now() - 10000).toISOString() };
  const reinforcementBeforeReopen = structuredClone(currentState.game.reinforcement);
  callRows.push(demoReflectionCall);
  assert.equal(reopenPositiveReflection(demoReflectionCall, dayKey), true);
  assert.equal(opened.at(-1), 'positiveReflectionModal');
  assert.deepEqual(currentState.game.reinforcement, reinforcementBeforeReopen, 'reabrir reflexión no cambia el estado');

  currentSettings.reinforcement.enabled = false;
  assert.equal(reopenPositiveReflection(demoReflectionCall, dayKey), false, 'el refuerzo apagado no reabre la reflexión');
  currentSettings.reinforcement.enabled = true;
  assert.equal(reopenPositiveReflection({ ...demoReflectionCall, endISO: new Date(Date.now() + 60000).toISOString() }, dayKey), false, 'una llamada aún abierta no admite reflexión');

});

test('reemplazar una llamada live migra las referencias antes de reconciliar incluso con Logros apagado', () => {
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
  setAppSettings({ game: { enabled: false }, reinforcement: { enabled: true, askAfterCall: false, rewards: [] } });
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
  currentState.game.reinforcement.reflections.deleted = { callId: 'deleted', outcome: 'good', note: 'Retirada', dayKey, savedAt: '2026-09-29T12:02:00.000Z' };
  assert.equal(reconcilePositiveCalls(dayKey), true, 'Logros apagado permite reconciliar una llamada retirada');
  assert.equal(currentState.game.reinforcement.reflections.deleted, undefined);
  assert.equal(currentState.game.reinforcement.reflections.officialId.callId, 'officialId');
  const appMain = fs.readFileSync(path.join(root, 'js/app-main.js'), 'utf8');
  const importBody = appMain.slice(appMain.indexOf('function importCalls('), appMain.indexOf('function clearCallInputBox'));
  assert.ok(importBody.indexOf('migratePositiveCallIdReferences') < importBody.indexOf('onReinforcementCallsChanged'));
  assert.ok(importBody.indexOf('migrateGameCallReferences') < importBody.indexOf('onReinforcementCallsChanged'));
  assert.match(importBody, /item\.replacementKind === 'live'\)\s*\{?\s*migratePositiveCallIdReferences\(item\.replaces\?\.id, item\.call\.id, item\.call\.endISO\)/);
  assert.match(importBody, /migrateGameCallReferences\(item\.replaces\?\.id, item\.call\.id\)/);
});

test('una llamada anterior a la difícil no consume la recuperación pendiente', () => {
  const dayKey = currentDayKey();
  const originEnd = Date.now() - 120000;
  const origin = { id: 'difficult', callDate: dayKey, countsAsProductive: true, startISO: new Date(originEnd - 60000).toISOString(), endISO: new Date(originEnd).toISOString() };
  const earlier = { id: 'earlier', callDate: dayKey, countsAsProductive: true, startISO: new Date(originEnd - 30000).toISOString(), endISO: new Date(originEnd - 10000).toISOString() };
  const later = { id: 'later', callDate: dayKey, countsAsProductive: true, startISO: new Date(originEnd).toISOString(), endISO: new Date(originEnd + 30000).toISOString() };
  const callRows = [origin];
  const currentState = { game: { reinforcement: { ...createDefaultReinforcementState(), recoveryPending: { callId: 'difficult', dayKey, endISO: new Date(originEnd - 60000).toISOString() } } } };
  setAppState(currentState);
  setAppCalls(callRows);
  setAppSettings({ game: { enabled: true }, reinforcement: { enabled: true, askAfterCall: false, rewards: [] } });
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
  const earlierLegacy = { id: 'earlier-legacy', callDate: dayKey, countsAsProductive: true, startISO: new Date(originEnd - 5000).toISOString(), endISO: new Date(originEnd + 5000).toISOString() };
  callRows.push(earlierLegacy);
  onPositiveCallSaved(earlierLegacy, 'import', dayKey);
  assert.equal(currentState.game.reinforcement.recoveryPending.callId, 'difficult');
  assert.equal(currentState.game.reinforcement.recoveries.length, 0);
  callRows.push(later);
  onPositiveCallSaved(later, 'import', dayKey);
  assert.equal(currentState.game.reinforcement.recoveryPending, null);
  assert.deepEqual(currentState.game.reinforcement.recoveries.map(({ callId, fromCallId }) => ({ callId, fromCallId })), [{ callId: 'later', fromCallId: 'difficult' }]);
});

test('dropped repetidas no abren reflexión y una recuperación requiere llamada productiva', () => {
  const dayKey = currentDayKey();
  const now = Date.now();
  const rows = [];
  const origin = { id: 'origin-dropped', callDate: dayKey, dropped: 'Yes', billable: 'No', countsAsProductive: false, startISO: new Date(now - 120000).toISOString(), endISO: new Date(now - 90000).toISOString() };
  const currentState = { game: { reinforcement: { ...createDefaultReinforcementState(), recoveryPending: { callId: origin.id, dayKey, endISO: origin.endISO } } } };
  setAppState(currentState);
  setAppCalls(rows);
  setAppSettings({ game: { enabled: true, intensity: 'subtle' }, reinforcement: { enabled: true, askAfterCall: true } });
  const opened = [];
  configurePositiveReinforcementContext({
    callDateKeyFromValue: (value) => value === dayKey ? value : '', callsForDay: () => rows,
    closeModal: () => {}, convertedAmountText: () => '', effectiveDailyGoal: () => ({ usd: 0 }), escapeHtml: String,
    importedCallStats: () => ({ earnings: 0 }), openModal: (id) => opened.push(id), saveStateOnly: () => {},
    saveSettingsOnly: () => {}, toast: () => {}, todayCallDateKey: () => dayKey,
  });
  rows.push(origin);
  onPositiveCallSaved(origin, 'manual', dayKey);
  for (let index = 0; index < 5; index++) {
    const dropped = { ...origin, id: `dropped-${index}` };
    rows.push(dropped);
    onPositiveCallSaved(dropped, 'live', dayKey);
  }
  assert.equal(currentState.game.reinforcement.recoveries.length, 0);
  assert.deepEqual(opened, []);
  assert.equal(currentState.game.reinforcement.recoveryPending.callId, origin.id);
  assert.equal(reconcilePositiveCalls(dayKey), false, 'el origen dropped conserva la recuperación pendiente');
  const nonproductive = { ...origin, id: 'nonproductive', dropped: 'No', startISO: new Date(now - 60000).toISOString(), endISO: new Date(now - 30000).toISOString() };
  rows.push(nonproductive);
  onPositiveCallSaved(nonproductive, 'import', dayKey);
  assert.equal(currentState.game.reinforcement.recoveryPending.callId, origin.id);
  const productive = { ...nonproductive, id: 'productive', billable: 'Yes', countsAsProductive: true, startISO: new Date(now - 20000).toISOString(), endISO: new Date(now - 10000).toISOString() };
  rows.push(productive);
  onPositiveCallSaved(productive, 'import', dayKey);
  assert.equal(currentState.game.reinforcement.recoveryPending, null);
  assert.equal(currentState.game.reinforcement.recoveries.length, 1);
  onPositiveCallSaved(productive, 'import', dayKey);
  assert.equal(currentState.game.reinforcement.recoveries.length, 1);
});

test('Logros elimina plan, intensidad y presupuesto sin dejar controles ni listeners', () => {
  const html = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
  const game = fs.readFileSync(path.join(root, 'js/reinforcement.js'), 'utf8');
  const positive = fs.readFileSync(path.join(root, 'js/positive-reinforcement.js'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'css/reinforcement.css'), 'utf8');
  assert.doesNotMatch(html + positive, /physicalReward|pendingRewards|PHYSICAL_REWARD|onPositiveRewardWindow/);
  assert.doesNotMatch(css, /positive-reward-editor-grid|physical-reward/);
  assert.doesNotMatch(html + game + positive, /gameDailyFocus|gameIntensityInput|positiveWeeklyBudgetInput|choose-mission/);
});
