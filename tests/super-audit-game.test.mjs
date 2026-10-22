import test from 'node:test';
import { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setAppCalls, setAppSettings, setAppState } from '../js/app-context.js';
import { ACCESSORY_CATALOG, configureGameContext, createDefaultGameState, normalizeGameState, computeGameDay,
  onGameCallSaved, onGameCallsChanged, onGameShiftEnded, onGameShiftStarted, onGameBackupExported,
  onGameDayMetadataChanged, openDailyGoalChest, claimPendingChest, equipAccessory, onGameDayReset,
  onGamePauseEnded, onGamePauseStarted, onGameDayRollover, chooseCycleReward, renderGame, setGameEnabled } from '../js/game.js';
import { configurePositiveReinforcementContext } from '../js/positive-reinforcement.js';
import { withSilentCallFeedback } from '../js/call-feedback.js';

test('discreet automatic feedback preserves identical XP, milestone and surprise reward receipts', () => {
  const snapshots = [];
  for (const silent of [false, true]) {
    const f = fixture({ goal: 3 });
    try {
      const save = () => { f.add(5, 1, () => 0); onGameCallsChanged(f.key); };
      if (silent) withSilentCallFeedback(save); else save();
      snapshots.push(structuredClone(f.current.game));
    } finally { f.dispose(); }
  }
  assert.deepEqual(snapshots[1], snapshots[0]);
});

// Relative call timestamps must stay on the same day as the fixture's key,
// including CI runs during the first ten minutes after UTC midnight.
beforeEach(t => t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-10T18:00:00Z') }));

function fixture({ owned = false, goal = 10000, shields = 0, status = 'compliant', streak = 0,
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
  current.game.shields = shields;
  if (owned) current.game.accessories = ACCESSORY_CATALOG.map(item => item.label);
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
      rows.push(call); onGameCallSaved(call, 'manual', { random });
    } },
    reload() { current.game = normalizeGameState(JSON.parse(JSON.stringify(current.game))); },
    setStatus(value) { status = value; }, setGoal(value) { goal = value; },
    dispose() { setAppState(null); setAppSettings({}); setAppCalls([]);
      for (const name of ['document', 'window']) { if (previous[name] === undefined) delete globalThis[name]; else globalThis[name] = previous[name]; } },
  };
}

test('achievement activation rolls back a rejected preference and preserves earned progress when disabled', () => {
  const f = fixture();
  try {
    f.current.game.totalXp = 300;
    f.current.game.level = 3;
    f.current.game.accessories = ['Visor violeta'];
    f.current.game.ledger['chest:10/09/2026'] = { type: 'chest', sealedOn: '10/09/2026', gross: 25, applied: 25 };
    renderGame();
    const before = structuredClone(f.current.game);
    f.setSettingsSaveResult(false);
    assert.equal(setGameEnabled(false), false);
    assert.equal(f.config.game.enabled, true);
    assert.deepEqual(f.current.game, before);
    f.setSettingsSaveResult(undefined);
    assert.equal(setGameEnabled(false), true);
    assert.equal(f.config.game.enabled, false);
    assert.deepEqual(f.current.game, before);
    assert.equal(setGameEnabled(true), true);
    assert.equal(f.config.game.enabled, true);
    assert.deepEqual(f.current.game, before);
    assert.deepEqual(f.rows, []);
  } finally { f.dispose(); }
});

test('resetting one day removes its reinforcement receipts and rewards while preserving other days and preferences', () => {
  const f = fixture();
  try {
    f.add();
    const yesterday = '10/09/2026';
    f.config.reinforcement = { enabled: true, askAfterCall: true, rewards: [{ id: 'tea', name: 'Té', window: 'break', trigger: 'calls', every: 1, accumulationTarget: 3 }] };
    const reward = dayKey => ({ id: `reward-${dayKey}`, rewardId: 'tea', name: 'Té', window: 'break', dayKey });
    f.current.game.reinforcement = {
      reflections: { today: { outcome: 'good', dayKey: f.key }, yesterday: { outcome: 'good', dayKey: yesterday } },
      recoveries: [{ callId: 'today', fromCallId: 'other', dayKey: f.key }, { callId: 'yesterday', fromCallId: 'earlier', dayKey: yesterday }],
      pendingRewards: [reward(f.key), reward(yesterday)], claims: [reward(f.key), reward(yesterday)],
      earnedKeys: Object.fromEntries([f.key, yesterday].flatMap(day => Array.from({ length: 7 }, (_, i) => [`calls:${day}:${i}:tea`, true]))),
      progress: { tea: 2 }, recoveryPending: { callId: 'today', dayKey: f.key },
    };
    for (const prefix of ['reinforce-call', 'money-hit', 'pause-return', 'idle-support']) {
      f.current.game.ledger[`${prefix}:${f.key}:id`] = true;
      f.current.game.ledger[`${prefix}:${yesterday}:id`] = true;
    }
    const preferences = structuredClone(f.config.reinforcement);
    f.rows.length = 0;
    onGameDayReset(f.key);
    const positive = f.current.game.reinforcement;
    assert.equal(positive.pendingRewards.length, 1);
    assert.equal(positive.pendingRewards[0].dayKey, yesterday);
    assert.equal(positive.claims.length, 1);
    assert.equal(positive.claims[0].dayKey, yesterday);
    assert.deepEqual(Object.keys(positive.reflections), ['yesterday']);
    assert.equal(positive.recoveries.length, 1);
    assert.equal(positive.recoveryPending, null);
    assert.equal(Object.keys(positive.earnedKeys).length, 7);
    assert.ok(Object.keys(positive.earnedKeys).every(key => key.includes(`:${yesterday}:`)));
    assert.equal(positive.progress.tea, 1);
    assert.equal(f.config.reinforcement.enabled, preferences.enabled);
    assert.equal(f.config.reinforcement.rewards[0].name, preferences.rewards[0].name);
    for (const prefix of ['reinforce-call', 'money-hit', 'pause-return', 'idle-support']) {
      assert.equal(f.current.game.ledger[`${prefix}:${f.key}:id`], undefined);
      assert.ok(f.current.game.ledger[`${prefix}:${yesterday}:id`]);
    }
  } finally { f.dispose(); }
});

test('resetting an unrelated day preserves accumulated rewards held by the daily limit', () => {
  const f = fixture();
  try {
    f.config.reinforcement = { rewards: [{ id: 'tea', name: 'Té', window: 'break', trigger: 'calls', accumulationTarget: 3, maxPerDay: 1 }] };
    f.current.game.reinforcement.pendingRewards = [{ id: 'reward', rewardId: 'tea', name: 'Té', window: 'break', dayKey: f.key }];
    f.current.game.reinforcement.earnedKeys = Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`calls:${f.key}:${i}:tea`, true]));
    f.current.game.reinforcement.progress.tea = 3;
    onGameDayReset('10/08/2026');
    assert.equal(f.current.game.reinforcement.progress.tea, 3);
    assert.equal(f.current.game.reinforcement.pendingRewards.length, 1);
    onGameDayReset(f.key);
    assert.equal(f.current.game.reinforcement.progress.tea, 0);
    assert.equal(f.current.game.reinforcement.pendingRewards.length, 0);
  } finally { f.dispose(); }
});

test('correction below eight calls revokes improved loot and requalifying grants it exactly once', () => {
  const f = fixture({ owned: true });
  try {
    f.add(8);
    const key = `loot:${f.key}:8:improved`;
    const reward = f.current.game.ledger[key];
    assert.equal(reward.type, 'bonusXp'); assert.ok(reward.applied > 0);
    const before = f.current.game.days[f.key].bonusXp;
    f.reload(); f.rows.splice(7); onGameCallsChanged(f.key);
    assert.equal(f.current.game.ledger[key], undefined);
    assert.equal(f.current.game.days[f.key].bonusXp, before - reward.applied);
    assert.equal(f.current.game.ledger[`impulse:${f.key}:8`], undefined);
    f.add(); onGameCallsChanged(f.key);
    const once = f.current.game.days[f.key].bonusXp;
    f.reload(); onGameCallsChanged(f.key);
    assert.equal(f.current.game.days[f.key].bonusXp, once);
    assert.ok(f.current.game.ledger[key]);
  } finally { f.dispose(); }
});

test('correction removes improved cosmetic and equipment before requalifying', () => {
  const f = fixture();
  try {
    f.current.game.totalXp = 10000;
    f.add(8);
    const key = `loot:${f.key}:8:improved`, accessory = f.current.game.ledger[key].accessory;
    assert.ok(accessory); assert.equal(equipAccessory(accessory), true);
    f.rows.splice(7); onGameCallsChanged(f.key);
    assert.equal(f.current.game.ledger[key], undefined);
    assert.equal(f.current.game.accessories.includes(accessory), false);
    assert.equal(Object.values(f.current.game.equipment).includes(accessory), false);
  } finally { f.dispose(); }
});

test('continue preserves a backup shield earned after closing the shift', () => {
  const f = fixture();
  try {
    f.add(); onGameShiftEnded(f.key); assert.equal(f.current.game.shields, 0);
    onGameBackupExported(); assert.equal(f.current.game.shields, 1);
    f.reload(); onGameShiftStarted({ continued: true });
    assert.equal(f.current.game.shields, 1);
    assert.equal(f.current.game.totalXp, 0);
    onGameShiftEnded(f.key); onGameShiftStarted({ continued: true });
    assert.equal(f.current.game.shields, 1);
  } finally { f.dispose(); }
});

test('continue reverses only stage shield consumption, preserving later backup award', () => {
  const f = fixture({ shields: 1, status: 'failed' });
  try {
    f.add(); onGameShiftEnded(f.key); assert.equal(f.current.game.shields, 0);
    onGameBackupExported(); assert.equal(f.current.game.shields, 1);
    f.reload(); onGameShiftStarted({ continued: true });
    assert.equal(f.current.game.shields, 2);
    assert.equal(f.current.game.days[f.key].finalized, undefined);
  } finally { f.dispose(); }
});

test('continue does not remove a shield already restored by correcting adherence', () => {
  const f = fixture({ shields: 1, status: 'failed' });
  try {
    f.add(); onGameShiftEnded(f.key); f.setStatus('compliant'); onGameDayMetadataChanged(f.key);
    onGameBackupExported(); assert.equal(f.current.game.shields, 2);
    f.reload(); onGameShiftStarted({ continued: true }); assert.equal(f.current.game.shields, 2);
  } finally { f.dispose(); }
});

test('goal chest XP remains idempotent across close, continue, correction, requalification and reset', () => {
  const f = fixture({ owned: true, goal: 1 });
  try {
    f.add(1, 1); assert.equal(openDailyGoalChest(f.key), true); assert.equal(f.current.game.totalXp, 25);
    assert.equal(openDailyGoalChest(f.key), false);
    onGameShiftEnded(f.key); const stageXp = f.current.game.days[f.key].xp;
    assert.equal(f.current.game.totalXp, 25 + stageXp);
    f.reload(); onGameShiftStarted({ continued: true }); assert.equal(f.current.game.totalXp, 25);
    f.rows[0].pay = .5; onGameCallsChanged(f.key); assert.equal(f.current.game.totalXp, 0);
    const adjustedAt=f.current.game.days[f.key].goalChestAdjustedAt;
    assert.ok(Number.isFinite(new Date(adjustedAt).getTime()));
    f.reload();assert.equal(f.current.game.days[f.key].goalChestAdjustedAt,adjustedAt);
    f.rows[0].pay = 1; onGameCallsChanged(f.key); assert.equal(openDailyGoalChest(f.key), true);
    assert.equal(f.current.game.totalXp, 25); assert.ok(computeGameDay(f.key).xp <= 150);
    f.rows.length = 0; onGameDayReset(f.key); assert.equal(f.current.game.totalXp, 0);
  } finally { f.dispose(); }
});

test('exact decimal financial goal unlocks chest, while a real shortfall cannot', () => {
  const f = fixture({ goal: 1.8 });
  try {
    f.add(1, 1.2); f.add(1, .6);
    assert.equal(f.rows.reduce((sum, call) => sum + call.pay, 0), 1.7999999999999998);
    assert.equal(computeGameDay(f.key).defeated, true);
    assert.equal(computeGameDay(f.key).hpPct, 0);
    assert.equal(openDailyGoalChest(f.key), true);
    assert.equal(f.current.game.accessories.includes('Visor violeta'), true);
    f.rows[1].pay = .59; onGameCallsChanged(f.key);
    assert.equal(computeGameDay(f.key).defeated, false);
    assert.equal(openDailyGoalChest(f.key), false);
    assert.equal(f.current.game.accessories.includes('Visor violeta'), false);
  } finally { f.dispose(); }
});

test('continue undoes weekly streak shield without consuming later backup shield', () => {
  const f = fixture({ shields: 1, status: 'failed', streak: 7 });
  try {
    f.add(); onGameShiftEnded(f.key); assert.equal(f.current.game.shields, 1);
    const key = f.current.game.days[f.key].rollback.streakShieldAwardedKey; assert.ok(key);
    onGameBackupExported(); assert.equal(f.current.game.shields, 2);
    f.reload(); onGameShiftStarted({ continued: true });
    assert.equal(f.current.game.shields, 2); assert.equal(f.current.game.ledger[key], undefined);
  } finally { f.dispose(); }
});

test('legacy same-day chest receipts prevent duplicate rewards across reopen and changed goal', () => {
  for (const receipt of [true, { type: 'chest', gross: 25, applied: 25 }]) {
    const f = fixture({ goal: 1 });
    try {
      f.add(1, 1); f.current.game.totalXp = 25;
      f.current.game.ledger[`chest:${f.key}`] = receipt;
      f.current.game.chest = { pending: true, sealedOn: f.key };
      f.reload(); assert.equal(claimPendingChest(), true);
      assert.equal(f.current.game.totalXp, 25);
      assert.equal(f.current.game.chest.pending, false);
      assert.equal(openDailyGoalChest(f.key), false);
      f.setGoal(2); onGameDayMetadataChanged(f.key);
      assert.equal(f.current.game.totalXp, 25);
      assert.deepEqual(f.current.game.ledger[`chest:${f.key}`], receipt);
    } finally { f.dispose(); }
  }
});

test('invalid pending chest day is discarded by persisted normalization', () => {
  const f = fixture();
  try {
    f.current.game.chest = { pending: true, sealedOn: '99/99/2026' };
    f.reload(); assert.equal(claimPendingChest(), false);
    assert.equal(f.current.game.totalXp, 0); assert.deepEqual(f.current.game.ledger, {});
  } finally { f.dispose(); }
});

test('large capped reward ledger reconciles every threshold without removing unrelated bonus', () => {
  const f = fixture({ owned: true });
  try {
    f.current.game.days[f.key] = { bonusXp: 50 };
    f.add(100); assert.equal(computeGameDay(f.key).xp, 150);
    const referenceBonus = count => 50 + Object.entries(f.current.game.ledger)
      .filter(([key]) => key.startsWith(`loot:${f.key}:`) && (key.endsWith(':improved') ? count >= 8 : Number(key.split(':').at(-1)) <= count))
      .reduce((sum, [, receipt]) => sum + receipt.applied, 0);
    for (const count of [99, 80, 16, 10, 9, 8, 7, 5, 4, 1, 0]) {
      const expected = referenceBonus(count);
      f.rows.splice(count); f.reload(); onGameCallsChanged(f.key);
      assert.equal(f.current.game.days[f.key].bonusXp, expected, `remaining count ${count}`);
      assert.ok(computeGameDay(f.key).xp <= 150);
      const ledger = JSON.stringify(f.current.game.ledger);
      onGameCallsChanged(f.key); assert.equal(JSON.stringify(f.current.game.ledger), ledger);
    }
    assert.equal(f.current.game.days[f.key].bonusXp, 50);
  } finally { f.dispose(); }
});

test('duplicate saved callbacks cannot repeat surprise, loot, chest or frozen stage XP', () => {
  const f = fixture({ owned: true });
  try {
    f.add(8); f.reload(); const before = JSON.stringify(f.current.game);
    for (let i = 0; i < 5; i++) for (const call of f.rows) onGameCallSaved(call, 'import', { random: () => 0 });
    assert.equal(JSON.stringify(f.current.game), before);
    onGameShiftEnded(f.key); const total = f.current.game.totalXp, bonus = f.current.game.days[f.key].bonusXp;
    f.rows.splice(7); onGameCallsChanged(f.key);
    assert.equal(f.current.game.totalXp, total); assert.equal(f.current.game.days[f.key].bonusXp, bonus);
    assert.ok(f.current.game.ledger[`loot:${f.key}:8:improved`], 'closing preserves the frozen reward receipt');
    onGameShiftEnded(f.key); assert.equal(f.current.game.totalXp, total);
  } finally { f.dispose(); }
});

test('continuing a pause revokes its return bonus once and a late return cannot restore it', () => {
  const f = fixture();
  try {
    f.add(); const pause = { type: 'break', shiftDayKey: f.key,
      startedAt: new Date(Date.now() - 300000).toISOString(), endedAt: new Date(Date.now() - 240000).toISOString() };
    onGamePauseEnded(pause, { onTime: true }); assert.equal(f.current.game.days[f.key].bonusXp, 5);
    f.reload(); onGamePauseEnded(pause, { onTime: true }); assert.equal(f.current.game.days[f.key].bonusXp, 5);
    f.current.activePause = { ...pause, endedAt: null }; onGamePauseStarted('break');
    assert.equal(f.current.game.days[f.key].bonusXp, 0);
    onGamePauseStarted('break'); assert.equal(f.current.game.days[f.key].bonusXp, 0);
    f.current.activePause = null; onGamePauseEnded({ ...pause, endedAt: new Date().toISOString() }, { onTime: false });
    assert.equal(f.current.game.days[f.key].bonusXp, 0);
  } finally { f.dispose(); }
});

test('reopening a corrected frozen day reconciles invalid loot before earning new XP', () => {
  const f = fixture({ owned: true });
  try {
    f.add(8); onGameShiftEnded(f.key);
    f.rows.splice(7); onGameCallsChanged(f.key);
    assert.ok(f.current.game.ledger[`loot:${f.key}:8:improved`]);
    f.reload(); onGameShiftStarted({ continued: true });
    assert.equal(f.current.game.ledger[`loot:${f.key}:8:improved`], undefined);
    assert.equal(f.current.game.days[f.key].bonusXp,
      f.current.game.ledger[`loot:${f.key}:5`]?.applied || 0);
    const validXp = computeGameDay(f.key).xp;
    for (let i = 0; i < 3; i++) {
      onGameShiftStarted({ continued: true });
      assert.equal(f.current.game.totalXp, 0);
      onGameShiftEnded(f.key);
      assert.equal(f.current.game.totalXp, validXp);
      f.reload(); onGameShiftStarted({ continued: true });
      assert.equal(f.current.game.totalXp, 0);
      assert.equal(f.current.game.ledger[`loot:${f.key}:8:improved`], undefined);
    }
  } finally { f.dispose(); }
});

test('reopening with Logros disabled also removes loot invalidated while frozen', () => {
  const f = fixture({ owned: true });
  try {
    f.add(8); onGameShiftEnded(f.key);
    f.rows.splice(7); onGameCallsChanged(f.key);
    f.config.game.enabled = false;
    f.reload(); onGameShiftStarted({ continued: true });
    assert.equal(f.current.game.ledger[`loot:${f.key}:8:improved`], undefined);
    assert.equal(f.current.game.days[f.key].bonusXp,
      f.current.game.ledger[`loot:${f.key}:5`]?.applied || 0);
    f.config.game.enabled = true; onGameShiftEnded(f.key);
    assert.equal(f.current.game.totalXp, f.current.game.days[f.key].xp);
  } finally { f.dispose(); }
});

test('day reset reverses stage consumption and award in the right order at the shield cap', () => {
  const f = fixture({ shields: 3, status: 'failed', streak: 7 });
  try {
    f.add(); onGameShiftEnded(f.key);
    assert.equal(f.current.game.shields, 3); assert.equal(f.current.game.days[f.key].shieldUsed, true);
    const award = f.current.game.days[f.key].rollback.streakShieldAwardedKey; assert.ok(award);
    f.rows.length = 0; f.reload(); onGameDayReset(f.key);
    assert.equal(f.current.game.shields, 3);
    assert.equal(f.current.game.ledger[award], undefined);
    assert.equal(f.current.game.totalXp, 0);
    onGameDayReset(f.key); assert.equal(f.current.game.shields, 3);
  } finally { f.dispose(); }
});

test('decimal cycle goal grants exactly one rollover reward while a real cent shortfall grants none', () => {
  for (const [earnings, qualified] of [[1.2 + .6, true], [1.79, false]]) {
    const f = fixture({ owned: true, cycleGoal: 1.8, cycleEarnings: offset => offset === -1 ? earnings : 0 });
    try {
      onGameDayRollover(); assert.equal(f.current.game.cycleReward.pending, qualified);
      const before = normalizeGameState(f.current.game).cycleReward;
      f.reload(); onGameDayRollover(); assert.deepEqual(f.current.game.cycleReward, before);
      if (qualified) {
        assert.equal(chooseCycleReward('cycle-xp'), true);
        assert.equal(f.current.game.totalXp, 35);
        assert.equal(chooseCycleReward('cycle-xp'), false);
        onGameDayRollover(); assert.equal(f.current.game.totalXp, 35);
      } else {
        assert.equal(chooseCycleReward('cycle-xp'), false);
        assert.equal(f.current.game.totalXp, 0);
      }
    } finally { f.dispose(); }
  }
});

test('current cycle uses the same decimal attainment as rollover', () => {
  for (const [earnings, qualified] of [[1.2 + .6, true], [1.79, false]]) {
    const f = fixture({ cycleGoal: 1.8, cycleEarnings: earnings });
    try {
      renderGame(); assert.equal(f.current.game.cycleReward.pending, qualified);
      const before = JSON.stringify(f.current.game.cycleReward);
      f.reload(); renderGame(); assert.equal(JSON.stringify(f.current.game.cycleReward), before);
      assert.equal(chooseCycleReward('cycle-xp'), qualified);
      assert.equal(f.current.game.totalXp, qualified ? 35 : 0);
      assert.equal(chooseCycleReward('cycle-xp'), false);
      f.reload(); renderGame();
      assert.equal(f.current.game.cycleReward.pending, false);
      assert.equal(f.current.game.totalXp, qualified ? 35 : 0);
    } finally { f.dispose(); }
  }
});
