import {
  createQaWalkthroughCall,
  createQaReinforcementCall,
  QA_WALKTHROUGH_CALL_DURATION_MIN,
  QA_WALKTHROUGH_CALL_RATE,
  QA_WALKTHROUGH_TOTAL_CALLS,
} from './qa-walkthrough.js';

function localDay(date) {
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
}

function dayAt(now, offset) {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 9, 0, 0, 0);
  return date;
}

function qaWeeklySchedule() {
  const day = () => ({
    off: false,
    start: '07:00',
    end: '15:00',
    blocks: [
      { type: 'work', start: '07:00', dur: 130, goalMin: 30 },
      { type: 'break', start: '09:10', dur: 20 },
      { type: 'work', start: '09:30', dur: 130, goalMin: 30 },
      { type: 'break', start: '11:40', dur: 20 },
      { type: 'work', start: '12:00', dur: 60, goalMin: 20 },
      { type: 'lunch', start: '13:00', dur: 55 },
      { type: 'work', start: '13:55', dur: 65, goalMin: 20 },
    ],
  });
  return Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((dayKey) => [dayKey, day()]));
}

function sampleCalls(now, days = 6, callsPerDay = 5) {
  const rows = [];
  for (let dayOffset = -(days - 1); dayOffset <= 0; dayOffset++) {
    const base = dayOffset === 0
      ? new Date(now.getTime() - (callsPerDay * 42 + 20) * 60000)
      : dayAt(now, dayOffset);
    for (let index = 0; index < callsPerDay; index++) {
      const start = new Date(base.getTime() + index * 42 * 60000);
      const durationMin = 7 + ((index + Math.abs(dayOffset)) % 5) * 3;
      const end = new Date(start.getTime() + durationMin * 60000);
      const callDate = localDay(base);
      rows.push({
        id: `qa-${callDate.replaceAll('/', '')}-${dayOffset}-${index}`,
        customerId: `QA${Math.abs(dayOffset)}${index + 1}`,
        callDate,
        calendarCallDate: callDate,
        callStart: start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        durationMin,
        billable: 'Yes',
        dropped: 'No',
        pay: (durationMin * 0.12).toFixed(2),
        startISO: start.toISOString(),
        endISO: end.toISOString(),
        countsAsProductive: true,
        source: 'qa',
        importedAt: now.toISOString(),
      });
    }
  }
  return rows;
}

function finalizedDay(dayKey, index) {
  const xp = 70 + index * 8;
  return {
    finalized: true,
    finalizedAt: new Date().toISOString(),
    xp,
    stars: index % 3 === 0 ? 3 : 2,
    bonusXp: 0,
    missionChoice: index % 2 ? 'quality' : 'balanced',
    missions: [
      { id: 'productive', ok: true, applies: true, status: 'complete', rewardXp: 8, detail: 'Meta productiva completada' },
      { id: 'breaks', ok: true, applies: true, status: 'complete', rewardXp: 6, detail: 'Pausas protegidas' },
      { id: 'adherence', ok: index % 3 !== 0, applies: true, status: index % 3 !== 0 ? 'complete' : 'pending', rewardXp: 6, detail: 'Adherencia del día' },
    ],
    monster: { species: ['lunes-perezoso', 'martillo-tuerto', 'mediodia-mordedor', 'jueves-jadeante', 'viernes-furioso'][index % 5], variant: index === 4 ? 'gold' : 'normal', defeated: true, hpPct: 0 },
    phase: 'defeated',
    hasActivity: true,
    earnings: 8.4 + index,
    impulse: { hits: { 3: true, 5: true, 8: index > 2 }, last: 8 },
  };
}

function gameFixture(now, scenario, activeDayKey = localDay(now)) {
  const today = activeDayKey;
  const days = {};
  for (let offset = -5; offset < 0; offset++) {
    const key = localDay(dayAt(now, offset));
    if (['tour', 'reinforcement'].includes(scenario) && key === activeDayKey) continue;
    days[key] = finalizedDay(key, offset + 5);
  }
  const game = {
    version: 1,
    totalXp: 1640,
    level: 5,
    shields: 2,
    bestStreak: 5,
    accessories: ['Armadura cian', 'Bufanda de racha', 'Corona del ciclo'],
    trophies: [{ id: 'qa-streak', label: 'Racha de 5 días', earnedOn: localDay(dayAt(now, -1)) }],
    chest: { pending: false, sealedOn: null },
    cycleReward: { pending: false, cycleKey: null, options: [] },
    equipment: { head: 'Corona del ciclo', neck: 'Bufanda de racha', back: null, body: 'Armadura cian', face: null },
    days,
    ledger: {},
    live: { dayKey: today, combo: ['tour', 'reinforcement'].includes(scenario) ? 0 : scenario === 'near-win' ? 7 : 5, shiftAlarmAt: null },
  };
  if (scenario === 'rewards') {
    game.chest = { pending: true, sealedOn: localDay(dayAt(now, -1)) };
    game.cycleReward = {
      pending: true,
      cycleKey: today,
      options: [
        { id: 'cycle-xp', type: 'xp', amount: 35, label: '35 XP de temporada', accessory: null },
        { id: 'cycle-crown', type: 'accessory', amount: 0, label: 'Corona del ciclo', accessory: 'Corona del ciclo' },
      ],
    };
  }
  return game;
}

export const QA_TOUR_PRODUCTIVE_GOAL_MIN = 17;
export const QA_TOUR_EARNINGS_GOAL = Number((QA_TOUR_PRODUCTIVE_GOAL_MIN * QA_WALKTHROUGH_CALL_RATE).toFixed(2));
export const QA_TOUR_REWARDS = Object.freeze([
  Object.freeze({ id: 'qa-tour-call-reward', name: 'Pausa para celebrar', icon: '☕', window: 'break', trigger: 'calls', every: 5, maxPerDay: 1, accumulationTarget: 1, durationMin: 2, costUsd: 0.05, enabled: true }),
  Object.freeze({ id: 'qa-tour-recovery-reward', name: 'Un momento al aire', icon: '🌤️', window: 'break', trigger: 'recovery', every: 1, maxPerDay: 1, accumulationTarget: 1, durationMin: 2, costUsd: 0.05, enabled: true }),
  Object.freeze({ id: 'qa-tour-goal-reward', name: 'Cerrar con calma', icon: '🌙', window: 'shift-end', trigger: 'daily-goal', every: 1, maxPerDay: 1, accumulationTarget: 1, durationMin: 5, costUsd: 0.1, enabled: true }),
]);

export const QA_SCENARIOS = Object.freeze([
  { id: 'tour', label: 'Recorrido guiado' },
  { id: 'reinforcement', label: 'Refuerzo completo' },
  { id: 'near-win', label: 'Victoria próxima' },
  { id: 'rewards', label: 'Cofres y recompensas' },
]);

export function createQaSnapshot(source, scenario = 'tour', now = new Date()) {
  const selected = QA_SCENARIOS.some((item) => item.id === scenario) ? scenario : 'tour';
  const allCalls = sampleCalls(now, 6, 5);
  const today = localDay(now);
  const guided = ['tour', 'reinforcement'].includes(selected);
  const tourAnchor = guided
    ? (selected === 'reinforcement' ? createQaReinforcementCall : createQaWalkthroughCall)({ ordinal: 1, dayKey: today, now, totalCalls: QA_WALKTHROUGH_TOTAL_CALLS })
    : null;
  const firstTourCallStart = tourAnchor ? new Date(tourAnchor.startISO).getTime() : Number.NaN;
  const shiftStartedAt = Number.isFinite(firstTourCallStart) ? new Date(firstTourCallStart - 60000).toISOString() : null;
  const accountingDayKey = shiftStartedAt ? localDay(new Date(shiftStartedAt)) : today;
  const calls = selected === 'near-win'
    ? allCalls.slice(0, -3)
    : guided
      ? allCalls.filter((call) => call.callDate !== accountingDayKey)
      : allCalls;
  const inheritedState = selected === 'tour' ? {} : (source.state || {});
  const inheritedSettings = selected === 'tour' ? {} : (source.settings || {});
  const state = {
    ...inheritedState,
    shiftStartedAt,
    shiftEndedAt: null,
    activePause: null,
    activeCall: null,
    pendingLiveCallBackup: null,
    lastCallEndedAt: guided ? null : calls.at(-1)?.endISO || null,
    pauseHistory: [],
    events: [],
    gapAnnotations: {},
    dayNotes: { [localDay(dayAt(now, -2))]: { category: 'other', note: 'Dato de ejemplo del modo QA' } },
    dayInterruptions: {},
    game: gameFixture(now, selected, accountingDayKey),
    lastCalendarDay: null,
    qaWalkthrough: guided
      ? { version: 1, ...(selected === 'reinforcement' ? { scenario: selected } : {}), step: 0, completed: false, sessionId: `qa-${selected === 'tour' ? 'tour' : 'reinforcement'}-${new Date(now).getTime().toString(36)}`, nextCallOrdinal: 1, generatedCallIds: [] }
      : null,
    activeDayKey: guided ? accountingDayKey : calls.at(-1)?.callDate || today,
  };
  const settings = {
    ...inheritedSettings,
    onboarded: true,
    productiveGoalMin: selected === 'tour' ? QA_TOUR_PRODUCTIVE_GOAL_MIN : selected === 'reinforcement' ? 48 : 45,
    earningsGoal: selected === 'tour' ? QA_TOUR_EARNINGS_GOAL : selected === 'reinforcement' ? 10 : 7.08,
    rate: QA_WALKTHROUGH_CALL_RATE,
    weeklySchedule: qaWeeklySchedule(),
    scheduleOverridesByWeek: {},
    scheduleHistoryByDay: {},
    dailyGoalOverrides: {},
    goalHistoryByDay: {},
    lateArrivalMode: 'anchor',
    game: { enabled: true, intensity: 'arcade' },
    reinforcement: selected === 'tour'
      ? { enabled: true, askAfterCall: true, weeklyBudgetUsd: 1, rewards: QA_TOUR_REWARDS.map((reward) => ({ ...reward })) }
      : { enabled: false, askAfterCall: false, weeklyBudgetUsd: 0, rewards: [] },
  };
  if (selected === 'reinforcement') {
    settings.higherRateWindows = [];
    settings.reinforcement = { enabled: true, askAfterCall: false, weeklyBudgetUsd: 0, rewards: [] };
    settings.weeklySchedule = Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((key) => [key, {
      off: false, start: '00:00', end: '23:59', blocks: [{ type: 'work', start: '00:00', dur: 1440, goalMin: 48 }],
    }]));
  }
  return { state, calls, settings };
}
