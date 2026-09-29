function localDay(date) {
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
}

function dayAt(now, offset) {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 9, 0, 0, 0);
  return date;
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
        id: `qa-${callDate.replaceAll('/', '')}-${index}`,
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

function gameFixture(now, scenario) {
  const today = localDay(now);
  const days = {};
  for (let offset = -5; offset < 0; offset++) {
    const key = localDay(dayAt(now, offset));
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
    live: { dayKey: today, combo: scenario === 'near-win' ? 7 : 5, shiftAlarmAt: null },
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

export const QA_SCENARIOS = Object.freeze([
  { id: 'tour', label: 'Recorrido completo' },
  { id: 'near-win', label: 'Victoria próxima' },
  { id: 'rewards', label: 'Cofres y recompensas' },
]);

export function createQaSnapshot(source, scenario = 'tour', now = new Date()) {
  const selected = QA_SCENARIOS.some((item) => item.id === scenario) ? scenario : 'tour';
  const allCalls = sampleCalls(now, 6, 5);
  const calls = selected === 'near-win' ? allCalls.slice(0, -3) : allCalls;
  const state = {
    ...(source.state || {}),
    shiftStartedAt: null,
    shiftEndedAt: null,
    activePause: null,
    activeCall: null,
    pendingLiveCallBackup: null,
    lastCallEndedAt: calls.at(-1)?.endISO || null,
    pauseHistory: [],
    events: [],
    activeDayKey: localDay(now),
    gapAnnotations: {},
    dayNotes: { [localDay(dayAt(now, -2))]: { category: 'other', note: 'Dato de ejemplo del modo QA' } },
    dayInterruptions: {},
    game: gameFixture(now, selected),
  };
  const settings = {
    ...(source.settings || {}),
    onboarded: true,
    productiveGoalMin: 45,
    earningsGoal: 7.08,
    game: { ...((source.settings || {}).game || {}), enabled: true, intensity: 'arcade' },
  };
  return { state, calls, settings };
}
