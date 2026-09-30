import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createQaSnapshot,
  QA_SCENARIOS,
  QA_TOUR_EARNINGS_GOAL,
  QA_TOUR_PRODUCTIVE_GOAL_MIN,
} from '../js/qa-mode.js';
import {
  createQaWalkthroughCall,
  QA_WALKTHROUGH_CALL_DURATION_MIN,
  QA_WALKTHROUGH_CALL_RATE,
  QA_WALKTHROUGH_TOTAL_CALLS,
} from '../js/qa-walkthrough.js';
import {
  APP_KEYS,
  QA_APP_KEYS,
  activeAppKeys,
  beginQaMode,
  isQaModeActive,
  restoreQaMode,
  writeQaSnapshot,
} from '../js/sync.js';

function storageMock(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(String(key), String(value)),
    removeItem: (key) => values.delete(String(key)),
  };
}

function localDay(date) {
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
}

test('modo QA conserva byte a byte las llaves reales y usa namespace aislado', async () => {
  const original = {
    [APP_KEYS.state]: '{"real":1}',
    [APP_KEYS.calls]: '[{"real":true}]',
    [APP_KEYS.settings]: '{"theme":"dark"}',
  };
  global.window = { localStorage: storageMock(original) };

  const entered = await beginQaMode('user-qa');
  assert.equal(entered.ok, true);
  assert.equal(isQaModeActive(), true);
  assert.deepEqual(activeAppKeys(), QA_APP_KEYS);

  writeQaSnapshot({ state: { qa: 1 }, calls: [{ id: 'qa-1' }], settings: { theme: 'light' } });
  for (const [key, value] of Object.entries(original)) assert.equal(window.localStorage.getItem(key), value);
  assert.equal(JSON.parse(window.localStorage.getItem(QA_APP_KEYS.state)).qa, 1);

  assert.equal(restoreQaMode(), true);
  assert.equal(isQaModeActive(), false);
  assert.deepEqual(activeAppKeys(), APP_KEYS);
  for (const [key, value] of Object.entries(original)) assert.equal(window.localStorage.getItem(key), value);
  for (const key of Object.values(QA_APP_KEYS)) assert.equal(window.localStorage.getItem(key), null);
  delete global.window;
});

test('escenarios QA generan llamadas terminadas, productivas y sin tocar la fuente', () => {
  const source = { state: { marker: 'real' }, calls: [{ id: 'real' }], settings: { theme: 'dark' } };
  const sourceBefore = structuredClone(source);
  const now = new Date('2026-09-29T18:00:00.000Z');
  for (const scenario of QA_SCENARIOS) {
    const snapshot = createQaSnapshot(source, scenario.id, now);
    if (scenario.id === 'tour') {
      assert.equal(snapshot.state.marker, undefined);
      assert.equal(snapshot.settings.theme, undefined);
    } else {
      assert.equal(snapshot.state.marker, 'real');
      assert.equal(snapshot.settings.theme, 'dark');
    }
    assert.equal(snapshot.settings.game.enabled, true);
    assert.deepEqual(snapshot.settings.scheduleHistoryByDay, {});
    assert.deepEqual(snapshot.settings.scheduleOverridesByWeek, {});
    assert.ok(Object.values(snapshot.settings.weeklySchedule).every((day) => !day.off && day.blocks.length > 0));
    assert.ok(snapshot.calls.length > 0);
    assert.ok(snapshot.calls.every((call) => call.id.startsWith('qa-') && call.countsAsProductive));
    assert.ok(snapshot.calls.every((call) => new Date(call.endISO).getTime() <= now.getTime()));
  }
  assert.deepEqual(source, sourceBefore);
});

test('el recorrido guiado empieza con datos históricos, el día actual abierto y progreso por delante', () => {
  const source = {
    state: { marker: 'real', game: { totalXp: 999999 }, activePause: { type: 'lunch' } },
    calls: [{ id: 'real' }],
    settings: {
      theme: 'dark', userName: 'Cuenta real', productiveGoalMin: 1, earningsGoal: 0.01,
      weeklySchedule: { mon: { off: true, start: '00:00', end: '00:00', blocks: [] } },
      game: { enabled: false }, reinforcement: { enabled: true, rewards: [{ id: 'personal', name: 'Premio real' }] },
    },
  };
  const sourceBefore = structuredClone(source);
  const now = new Date(2026, 8, 29, 15, 0, 0, 0);
  const today = localDay(now);
  const snapshot = createQaSnapshot(source, 'tour', now);

  assert.ok(snapshot.calls.length > 0);
  assert.ok(snapshot.calls.every((call) => call.callDate !== today));
  assert.equal(snapshot.state.activeDayKey, today);
  assert.equal(snapshot.state.activeDayKey, localDay(new Date(snapshot.state.shiftStartedAt)));
  assert.equal(snapshot.state.shiftEndedAt, null);
  assert.ok(new Date(snapshot.state.shiftStartedAt).getTime() <= now.getTime());
  const firstPlannedCall = createQaWalkthroughCall({ ordinal: 1, dayKey: snapshot.state.activeDayKey, now });
  assert.ok(new Date(snapshot.state.shiftStartedAt).getTime() < new Date(firstPlannedCall.startISO).getTime());
  assert.equal(snapshot.state.activeCall, null);
  assert.equal(snapshot.state.activePause, null);
  assert.equal(snapshot.state.game.days[today], undefined);
  assert.deepEqual(snapshot.state.qaWalkthrough, {
    version: 1,
    step: 0,
    completed: false,
    sessionId: `qa-tour-${now.getTime().toString(36)}`,
    nextCallOrdinal: 1,
    generatedCallIds: [],
  });
  assert.equal(snapshot.state.game.live.combo, 0);
  assert.equal(snapshot.settings.productiveGoalMin, QA_TOUR_PRODUCTIVE_GOAL_MIN);
  assert.equal(snapshot.settings.earningsGoal, QA_TOUR_EARNINGS_GOAL);
  assert.deepEqual(snapshot.settings.dailyGoalOverrides, {});
  assert.deepEqual(snapshot.settings.goalHistoryByDay, {});
  assert.equal(snapshot.settings.game.enabled, true);
  assert.equal(snapshot.settings.reinforcement.enabled, true);
  assert.equal(snapshot.settings.reinforcement.askAfterCall, true);
  assert.equal(snapshot.settings.reinforcement.rewards.length, 3);
  assert.deepEqual(new Set(snapshot.settings.reinforcement.rewards.map((reward) => reward.trigger)), new Set(['calls', 'recovery', 'daily-goal']));
  assert.ok(snapshot.settings.reinforcement.rewards.every((reward) => reward.costUsd <= 0.1 && reward.enabled));
  assert.ok(snapshot.settings.reinforcement.rewards.some((reward) => reward.window === 'break'));
  assert.ok(snapshot.settings.reinforcement.rewards.some((reward) => reward.window === 'shift-end'));
  assert.deepEqual(source, sourceBefore);

  let previousEndISO = '';
  const tourCalls = [];
  for (let ordinal = 1; ordinal <= 6; ordinal++) {
    const call = createQaWalkthroughCall({
      ordinal,
      dayKey: snapshot.state.activeDayKey,
      now,
      previousEndISO,
      totalCalls: QA_WALKTHROUGH_TOTAL_CALLS,
      id: `qa-tour-goal-${ordinal}`,
    });
    assert.ok(call);
    previousEndISO = call.endISO;
    tourCalls.push(call);
  }
  const firstFive = tourCalls.slice(0, 5);
  const fiveProductiveMin = firstFive.reduce((sum, call) => sum + call.durationMin, 0);
  const fiveEarnings = firstFive.reduce((sum, call) => sum + Number(call.pay), 0);
  assert.ok(fiveProductiveMin < snapshot.settings.productiveGoalMin);
  assert.ok(fiveEarnings < snapshot.settings.earningsGoal);
  assert.ok(fiveProductiveMin + tourCalls[5].durationMin >= snapshot.settings.productiveGoalMin);
  assert.ok(Number((fiveEarnings + Number(tourCalls[5].pay)).toFixed(2)) >= snapshot.settings.earningsGoal);
  assert.equal(snapshot.settings.productiveGoalMin, QA_WALKTHROUGH_CALL_DURATION_MIN * 6 - 1);
  assert.equal(snapshot.settings.earningsGoal, Number((QA_TOUR_PRODUCTIVE_GOAL_MIN * QA_WALKTHROUGH_CALL_RATE).toFixed(2)));
});

test('llamadas del recorrido tienen IDs únicos, timestamps elegibles y recuperación cronológica', () => {
  const now = new Date(2026, 8, 29, 15, 0, 0, 0);
  const dayKey = localDay(now);
  const generated = [];
  for (let ordinal = 1; ordinal <= QA_WALKTHROUGH_TOTAL_CALLS; ordinal++) {
    const call = createQaWalkthroughCall({
      id: `qa-tour-session-call-${ordinal}`,
      ordinal,
      dayKey,
      now,
      previousEndISO: generated.at(-1)?.endISO,
    });
    assert.ok(call);
    assert.equal(call.callDate, dayKey);
    assert.equal(call.shiftDayKey, dayKey);
    assert.ok(new Date(call.startISO).getTime() < new Date(call.endISO).getTime());
    assert.ok(new Date(call.endISO).getTime() <= now.getTime());
    assert.ok(new Date(call.importedAt).getTime() <= now.getTime());
    assert.ok(new Date(call.importedAt).getTime() - new Date(call.endISO).getTime() <= 30 * 60000);
    if (generated.length) assert.ok(new Date(call.startISO).getTime() >= new Date(generated.at(-1).endISO).getTime());
    generated.push(call);
  }
  assert.equal(new Set(generated.map((call) => call.id)).size, generated.length);
  assert.ok(new Date(generated[2].startISO).getTime() >= new Date(generated[1].endISO).getTime());
  const implicitIds = Array.from({ length: QA_WALKTHROUGH_TOTAL_CALLS }, (_, index) => createQaWalkthroughCall({
    ordinal: index + 1, dayKey, now,
  }).id);
  assert.equal(new Set(implicitIds).size, implicitIds.length);

  const aroundMidnight = new Date(2026, 8, 29, 0, 10, 0, 0);
  const midnightSnapshot = createQaSnapshot({ state: {}, calls: [], settings: {} }, 'tour', aroundMidnight);
  const accountingDay = midnightSnapshot.state.activeDayKey;
  let previousEndISO = '';
  for (let ordinal = 1; ordinal <= QA_WALKTHROUGH_TOTAL_CALLS; ordinal++) {
    const call = createQaWalkthroughCall({
      id: `qa-tour-midnight-${ordinal}`,
      ordinal,
      dayKey: accountingDay,
      now: aroundMidnight,
      previousEndISO,
    });
    assert.ok(call);
    assert.equal(call.callDate, accountingDay);
    assert.equal(call.calendarCallDate, localDay(new Date(call.startISO)));
    assert.equal(new Date(call.importedAt).toISOString(), aroundMidnight.toISOString());
    assert.ok(new Date(call.endISO).getTime() <= aroundMidnight.getTime());
    assert.ok(new Date(call.importedAt).getTime() - new Date(call.endISO).getTime() <= 30 * 60000);
    if (previousEndISO) assert.ok(new Date(call.startISO).getTime() > new Date(previousEndISO).getTime());
    previousEndISO = call.endISO;
  }
});

test('el recorrido usa el día contable del turno nocturno y conserva preferencias originales', () => {
  const now = new Date(2026, 8, 29, 0, 0, 0, 0);
  const demoDate = new Date(now.getTime() - (5 * 42 + 20) * 60000);
  const demoDay = localDay(demoDate);
  const sourceDaySchedule = { off: true, start: '00:00', end: '00:00', blocks: [] };
  const weekdayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const source = {
    state: { lastCalendarDay: localDay(new Date(now.getTime() - 24 * 60 * 60000)) },
    calls: [],
    settings: {
      weeklySchedule: { [weekdayKeys[demoDate.getDay()]]: sourceDaySchedule },
      scheduleOverridesByWeek: { source: { day: sourceDaySchedule } },
      scheduleHistoryByDay: { [demoDay]: sourceDaySchedule },
      dailyGoalOverrides: { [demoDay]: { min: 0, usd: 0 } },
      goalHistoryByDay: { [demoDay]: { min: 0, usd: 0 } },
    },
  };

  const snapshot = createQaSnapshot(source, 'tour', now);
  assert.equal(snapshot.state.activeDayKey, localDay(new Date(snapshot.state.shiftStartedAt)));
  assert.equal(snapshot.state.lastCalendarDay, null);
  assert.ok(snapshot.calls.some((call) => call.callDate === localDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2))));
  assert.ok(snapshot.calls.every((call) => call.callDate !== snapshot.state.activeDayKey));
  assert.equal(snapshot.state.game.days[snapshot.state.activeDayKey], undefined);
  assert.equal(snapshot.state.activeCall, null);
  assert.equal(snapshot.state.activePause, null);
  assert.equal(new Set(snapshot.calls.map((call) => call.id)).size, snapshot.calls.length);
  assert.deepEqual(snapshot.settings.scheduleHistoryByDay, {});
  assert.deepEqual(snapshot.settings.scheduleOverridesByWeek, {});
  assert.deepEqual(snapshot.settings.dailyGoalOverrides, {});
  assert.deepEqual(snapshot.settings.goalHistoryByDay, {});
  assert.ok(Object.values(snapshot.settings.weeklySchedule).every((day) => !day.off && day.blocks.length > 0));
  assert.deepEqual(source.settings.scheduleHistoryByDay[demoDay], sourceDaySchedule);
  assert.equal(source.settings.weeklySchedule[weekdayKeys[demoDate.getDay()]], sourceDaySchedule);
  assert.deepEqual(snapshot.state.qaWalkthrough, {
    version: 1,
    step: 0,
    completed: false,
    sessionId: `qa-tour-${now.getTime().toString(36)}`,
    nextCallOrdinal: 1,
    generatedCallIds: [],
  });
});
