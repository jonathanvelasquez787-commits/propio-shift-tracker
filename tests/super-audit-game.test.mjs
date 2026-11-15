import test from 'node:test';
import { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setAppCalls, setAppSettings, setAppState } from '../js/app-context.js';
import { configureGameContext, createDefaultGameState, normalizeGameState,
  onReinforcementCallSaved, onReinforcementCallsChanged, onReinforcementShiftStarted, onReinforcementDayMetadataChanged, onReinforcementDayReset,
  onReinforcementPauseEnded, onReinforcementPauseStarted, onReinforcementDayRollover, renderGame } from '../js/reinforcement.js';
import { configurePositiveReinforcementContext } from '../js/positive-reinforcement.js';
import { withSilentCallFeedback } from '../js/call-feedback.js';
import { restoreAutomaticGameChanges } from '../js/work-actions.js';

test('discreet automatic feedback preserves identical milestone and call receipts', () => {
  const snapshots = [];
  for (const silent of [false, true]) {
    const f = fixture({ goal: 3 });
    try {
      const save = () => { f.add(5, 1, () => 0); onReinforcementCallsChanged(f.key); };
      if (silent) withSilentCallFeedback(save); else save();
      snapshots.push(structuredClone(f.current.game));
    } finally { f.dispose(); }
  }
  assert.deepEqual(snapshots[1], snapshots[0]);
});

// Relative call timestamps must stay on the same day as the fixture's key,
// including CI runs during the first ten minutes after UTC midnight.
beforeEach(t => t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-10T18:00:00Z') }));

function fixture({ goal = 10000, status = 'compliant', streak = 0,
  cycleGoal = 1000, cycleEarnings = 0 } = {}) {
  const previous = { document: globalThis.document, window: globalThis.window };
  globalThis.window = { matchMedia: () => ({ matches: true }) };
  globalThis.document = { activeElement: null, documentElement: { classList: { toggle() {} } },
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] };
  const keyFor = (date = new Date()) => `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
  const key = keyFor();
  const rows = [];
  let settingsSaveResult;
  const current = { game: createDefaultGameState(), gapAnnotations: {}, pauseHistory: [] };
  const config = { game: { enabled: true, soundEnabled: false }, adherenceGoalPct: 95, streakSkipOffDays: true };
  setAppState(current); setAppSettings(config); setAppCalls(rows);
  const callsForDay = day => rows.filter(call => call.shiftDayKey === day);
  const common = {
    callDateKeyFromValue: value => /^\d{2}\/\d{2}\/\d{4}$/.test(String(value)) ? value : null,
    callDateToDate: value => { const [m, d, y] = String(value).split('/').map(Number); return new Date(y, m - 1, d); },
    callsForDay, todayCallDateKey: keyFor,
    importedCallStats: calls => ({ productive: calls.reduce((s, c) => s + c.durationMin, 0), total: calls.length,
      zeroCount: 0, dropped: 0, gapTotal: 0, earnings: calls.reduce((s, c) => s + Number(c.pay), 0) }),
    effectiveDailyGoal: () => ({ min: 1000, usd: goal }), dayAdherence: () => ({ scorePct: 0, checkpoints: [] }),
    dayConfigFor: () => ({ blocks: [] }), computeComplianceStreak: () => ({ days: streak }),
    dayComplianceStatus: day => day === key ? status : 'pending', weekdayKeyForDayKey: () => 'mon',
    higherRateBonusForCall: () => null, higherRateLiveStatus: () => ({ active: false }),
    cycleBoundsForOffset: offset => ({ start: new Date(Date.now() + offset * 86400000), end: new Date(Date.now() + offset * 86400000) }),
    cycleEarningsForOffset: offset => ({ earnings: typeof cycleEarnings === 'function' ? cycleEarnings(offset) : cycleEarnings,
      start: new Date(Date.now() + offset * 86400000), end: new Date(Date.now() + offset * 86400000) }),
    effectiveCycleGoal: () => cycleGoal,
    convertedAmountText: () => '', escapeHtml: String, money: String, formatCallDayLabel: String, formatMinutes: String,
    parseMoney: Number, openModal() {}, closeModal() {}, saveSettingsOnly() { return settingsSaveResult; }, saveStateOnly() {}, toast() {},
  };
  configureGameContext(common); configurePositiveReinforcementContext(common);
  return { key, rows, current, config,
    setSettingsSaveResult(value) { settingsSaveResult = value; },
    add(count = 1, pay = 0, random = () => .99) { for (let i = 0; i < count; i++) {
      const now = Date.now() - 600000 + rows.length * 1000;
      const call = { id: `audit-${rows.length}`, callDate: key, shiftDayKey: key, billable: 'Yes', dropped: 'No',
        countsAsProductive: true, durationMin: 1, pay, startISO: new Date(now).toISOString(),
        endISO: new Date(now + 5000).toISOString(), importedAt: new Date(now + 6000).toISOString() };
      rows.push(call); onReinforcementCallSaved(call, 'manual', { random });
    } },
    reload() { current.game = normalizeGameState(JSON.parse(JSON.stringify(current.game))); },
    setStatus(value) { status = value; }, setGoal(value) { goal = value; },
    dispose() { setAppState(null); setAppSettings({}); setAppCalls([]);
      for (const name of ['document', 'window']) { if (previous[name] === undefined) delete globalThis[name]; else globalThis[name] = previous[name]; } },
  };
}

test('automatic-start capture restores the previous receipts without erasing a later import of an earlier call', () => {
  const f = fixture();
  try {
    f.add(1, 1);
    const before = structuredClone(f.current.game);
    let started;
    onReinforcementShiftStarted({ captureState: value => { started = value; } });
    assert.deepEqual(started, before);
    const historical = { id: 'later-historical', shiftDayKey: f.key, callDate: f.key, startISO: new Date(Date.now() - 20 * 60000).toISOString(),
      endISO: new Date(Date.now() - 15 * 60000).toISOString(), importedAt: new Date().toISOString(), durationMin: 5, pay: 2, billable: 'Yes', dropped: 'No', countsAsProductive: true };
    f.rows.push(historical); onReinforcementCallSaved(historical, 'import'); onReinforcementCallsChanged(historical.callDate);
    const laterLedger = Object.fromEntries(Object.entries(f.current.game.ledger).filter(([key]) => !Object.hasOwn(started.ledger, key)));
    assert.ok(Object.keys(laterLedger).length > 0);
    f.current.game = restoreAutomaticGameChanges(f.current.game, before, started);
    onReinforcementCallsChanged(f.key); onReinforcementDayMetadataChanged(f.key);
    for (const [key, value] of Object.entries(laterLedger)) assert.deepEqual(f.current.game.ledger[key], value);
  } finally { f.dispose(); }
});

test('resetting one day removes its reinforcement receipts while preserving other days and preferences', () => {
  const f = fixture();
  try {
    f.add();
    const yesterday = '10/09/2026';
    f.config.reinforcement = { enabled: true, askAfterCall: true };
    f.current.game.reinforcement = {
      reflections: { today: { outcome: 'good', dayKey: f.key }, yesterday: { outcome: 'good', dayKey: yesterday } },
      recoveries: [{ callId: 'today', fromCallId: 'other', dayKey: f.key }, { callId: 'yesterday', fromCallId: 'earlier', dayKey: yesterday }],
      recoveryPending: { callId: 'today', dayKey: f.key },
    };
    for (const prefix of ['reinforce-call', 'money-hit', 'pause-return', 'idle-support']) {
      f.current.game.ledger[`${prefix}:${f.key}:id`] = true;
      f.current.game.ledger[`${prefix}:${yesterday}:id`] = true;
    }
    const preferences = structuredClone(f.config.reinforcement);
    f.rows.length = 0;
    onReinforcementDayReset(f.key);
    const positive = f.current.game.reinforcement;
    assert.deepEqual(Object.keys(positive.reflections), ['yesterday']);
    assert.equal(positive.recoveries.length, 1);
    assert.equal(positive.recoveryPending, null);
    assert.equal(f.config.reinforcement.enabled, preferences.enabled);
    assert.equal(f.config.reinforcement.askAfterCall, preferences.askAfterCall);
    for (const prefix of ['reinforce-call', 'money-hit', 'pause-return', 'idle-support']) {
      assert.equal(f.current.game.ledger[`${prefix}:${f.key}:id`], undefined);
      assert.ok(f.current.game.ledger[`${prefix}:${yesterday}:id`]);
    }
  } finally { f.dispose(); }
});

test('a pause return is recorded once, continuing the pause cancels it and a late return does not restore it', () => {
  const f = fixture();
  try {
    f.add(); const pause = { type: 'break', shiftDayKey: f.key,
      startedAt: new Date(Date.now() - 300000).toISOString(), endedAt: new Date(Date.now() - 240000).toISOString() };
    const returns = () => Object.entries(f.current.game.ledger).filter(([key]) => key.startsWith('pause-return:'));
    onReinforcementPauseEnded(pause, { onTime: true });
    assert.equal(returns().length, 1); assert.equal(returns()[0][1].onTime, true);
    f.reload(); onReinforcementPauseEnded(pause, { onTime: true });
    assert.equal(returns().length, 1); assert.equal(returns()[0][1].onTime, true);
    f.current.activePause = { ...pause, endedAt: null }; onReinforcementPauseStarted('break');
    assert.equal(returns()[0][1].onTime, false);
    onReinforcementPauseStarted('break'); assert.equal(returns()[0][1].onTime, false);
    f.current.activePause = null; onReinforcementPauseEnded({ ...pause, endedAt: new Date().toISOString() }, { onTime: false });
    assert.equal(returns().length, 1); assert.equal(returns()[0][1].onTime, false);
  } finally { f.dispose(); }
});

test('call receipts are stored once and duplicate saved callbacks do not change them', () => {
  const f = fixture();
  try {
    f.add(8); f.reload(); const before = JSON.stringify(f.current.game);
    for (let i = 0; i < 5; i++) for (const call of f.rows) onReinforcementCallSaved(call, 'import');
    assert.equal(JSON.stringify(f.current.game), before);
    assert.equal(Object.keys(f.current.game.ledger).filter(key => key.startsWith('reinforce-call:')).length, 8);
    assert.deepEqual(Object.keys(f.current.game).sort(), ['ledger', 'reinforcement', 'version']);
  } finally { f.dispose(); }
});
