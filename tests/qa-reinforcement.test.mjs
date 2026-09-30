import assert from 'node:assert/strict';
import test from 'node:test';
import { createQaSnapshot, QA_SCENARIOS } from '../js/qa-mode.js';
import { configureQaWalkthroughContext, createQaReinforcementCall, initQaWalkthrough, renderQaWalkthrough, stopQaWalkthrough } from '../js/qa-walkthrough.js';
import { setAppCalls, setAppSettings, setAppState } from '../js/app-context.js';
import { checkReinforcementInactivity, configureGameContext, normalizeGameState, onGameCallSaved, onGamePauseEnded, onGamePauseStarted, onGameShiftEnded, rewardSurpriseForCall } from '../js/game.js';
import { configurePositiveReinforcementContext } from '../js/positive-reinforcement.js';

const localDay = (date) => `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;

function harness() {
  const snapshot = createQaSnapshot({ state: {}, settings: {} }, 'reinforcement');
  const nodes = new Map(['qaWalkthroughPanel', 'qaWalkthroughProgress', 'qaWalkthroughTitle', 'qaWalkthroughDescription', 'qaWalkthroughResult', 'qaWalkthroughNextBtn', 'qaWalkthroughRestartBtn'].map((id) => [id, {
    hidden: false, disabled: false, textContent: '', handlers: new Map(),
    addEventListener(type, fn) { this.handlers.set(type, fn); },
    removeEventListener(type) { this.handlers.delete(type); },
    click(force = false) { if (!this.disabled || force) this.handlers.get('click')?.({ preventDefault() {} }); },
  }]));
  const handlers = new Map();
  global.document = {
    getElementById: (id) => nodes.get(id),
    addEventListener: (type, fn) => handlers.set(type, fn),
    removeEventListener: (type) => handlers.delete(type),
  };
  let active = true;
  let modal = false;
  const effects = { calls: [], pause: [], idle: [], intensity: [], end: 0, restart: 0 };
  const { state, settings, calls } = snapshot;
  const context = {
    getState: () => state, getSettings: () => settings, getCalls: () => calls,
    isActive: () => active, hasOpenModal: () => modal,
    saveState() {}, saveSettings() {}, navigate() {},
    addCall(call, source, options) {
      calls.push(call);
      effects.calls.push({ call, source, options, step: state.qaWalkthrough.step, prepared: state.qaWalkthrough.generatedCallIds.includes(call.id) });
      state.lastCallEndedAt = call.endISO;
      return true;
    },
    startPause(type) { state.activePause = { type, startedAt: new Date().toISOString() }; effects.pause.push(type); modal = true; },
    endPause() { state.activePause = null; effects.pause.push('ended'); },
    checkInactivity(now) { effects.idle.push(now); },
    setIntensity(value) { settings.game.intensity = value; effects.intensity.push(value); },
    endShift() { state.shiftEndedAt = new Date().toISOString(); effects.end++; modal = true; },
    restart() { effects.restart++; },
  };
  const setup = () => { configureQaWalkthroughContext(context); initQaWalkthrough(); };
  setup();
  return {
    ...snapshot, nodes, effects, context, setup,
    next: (force) => nodes.get('qaWalkthroughNextBtn').click(force),
    close(id) { modal = false; handlers.get('app:modal-closed')?.({ detail: { id } }); },
    setActive(value) { active = value; },
  };
}

test('refuerzo completo prepara datos aislados, día contable y llamadas largas recientes incluso a medianoche', () => {
  assert.ok(QA_SCENARIOS.some((scenario) => scenario.id === 'reinforcement'));
  const source = { state: { activePause: { type: 'lunch' }, game: { ledger: { real: true } } }, settings: { earningsGoal: 1, higherRateWindows: [{ id: 'real' }], reinforcement: { rewards: [{ id: 'real' }] } } };
  const original = structuredClone(source);
  for (const now of [new Date(2026, 8, 29, 12), new Date(2026, 8, 29, 0, 3)]) {
    const snapshot = createQaSnapshot(source, 'reinforcement', now);
    assert.equal(snapshot.state.qaWalkthrough.scenario, 'reinforcement');
    assert.equal(snapshot.state.qaWalkthrough.step, 0);
    assert.equal(snapshot.state.activeDayKey, localDay(new Date(snapshot.state.shiftStartedAt)));
    assert.equal(snapshot.state.game.days[snapshot.state.activeDayKey], undefined);
    assert.equal(snapshot.state.activePause, null);
    assert.deepEqual(snapshot.state.game.ledger, {});
    assert.deepEqual(snapshot.settings.higherRateWindows, []);
    assert.deepEqual(snapshot.settings.reinforcement.rewards, []);
    assert.equal(snapshot.settings.reinforcement.askAfterCall, false);
    assert.equal(snapshot.settings.earningsGoal, 10);
    let previousEndISO = '';
    const demo = [];
    for (let ordinal = 1; ordinal <= 8; ordinal++) {
      const call = createQaReinforcementCall({ ordinal, dayKey: snapshot.state.activeDayKey, now, previousEndISO });
      assert.ok(call);
      assert.equal(call.callDate, snapshot.state.activeDayKey);
      assert.equal(call.calendarCallDate, localDay(new Date(call.startISO)));
      assert.equal(new Date(call.endISO) - new Date(call.startISO), call.durationMin * 60000);
      assert.ok(new Date(call.endISO) <= now);
      assert.ok(now - new Date(call.endISO) <= 30 * 60000);
      if (previousEndISO) assert.ok(new Date(call.startISO) > new Date(previousEndISO));
      previousEndISO = call.endISO;
      demo.push(call);
    }
    assert.equal(demo[0].durationMin, 30);
    assert.equal(demo[2].frozenHigherRateBonus.tier, 'gold');
    assert.ok(Number(demo[3].pay) > Math.max(...demo.slice(0, 3).map((call) => Number(call.pay))));
    assert.equal(demo[4].dropped, 'Yes');
    assert.equal(demo[4].countsAsProductive, false);
    const earnings = demo.reduce((sum, call) => sum + Number(call.pay) + Number(call.frozenHigherRateBonus?.amount || 0), 0);
    assert.ok(earnings >= 10);
    assert.equal(new Set(demo.map((call) => call.id)).size, 8);
  }
  assert.deepEqual(source, original);
  assert.equal(createQaReinforcementCall({ ordinal: 0, dayKey: '09/29/2026' }), null);
  assert.equal(createQaReinforcementCall({ ordinal: 9, dayKey: '09/29/2026' }), null);
});

test('guía de trece pasos conserva modales, recarga, resultados aleatorios controlados e intensidad', () => {
  const h = harness();
  try {
    assert.match(h.nodes.get('qaWalkthroughProgress').textContent, /de 13/);
    h.next(); h.next(); h.next(); h.next(); h.next();
    assert.equal(h.state.qaWalkthrough.step, 5);
    assert.deepEqual(h.effects.calls.map((item) => item.source), ['live', 'manual', 'import', 'manual']);
    assert.deepEqual(h.effects.calls.map((item) => item.options.surpriseRandom), [0.99, 0.99, 0.99, 0.01]);
    assert.ok(h.effects.calls.every((item) => item.prepared));
    stopQaWalkthrough(); h.setup();
    assert.equal(h.effects.calls.length, 4, 'recargar no repite llamadas ni decisiones de sorpresa');
    h.next();
    assert.equal(h.state.activePause.type, 'break');
    assert.equal(h.state.qaWalkthrough.phase, 'break-open');
    assert.ok(Object.values(h.settings.weeklySchedule).some((day) => day.blocks.some((block) => block.type === 'break' && block.dur === 2)));
    h.next(true);
    assert.deepEqual(h.effects.pause, ['break'], 'un modal abierto bloquea aun clics forzados');
    h.close('physicalRewardClaimModal'); h.next();
    assert.equal(h.state.qaWalkthrough.step, 6);
    h.next(); h.next();
    assert.equal(h.effects.calls[4].call.dropped, 'Yes');
    assert.ok(new Date(h.effects.calls[5].call.startISO) > new Date(h.effects.calls[4].call.endISO));
    const beforeIdle = Date.now();
    h.next();
    assert.equal(h.effects.idle.length, 1);
    assert.ok(h.effects.idle[0] >= beforeIdle + 60 * 60000);
    h.next(); h.next();
    assert.deepEqual(h.effects.intensity, ['subtle', 'off']);
    assert.equal(h.effects.calls.length, 8);
    h.next();
    assert.deepEqual(h.effects.intensity, ['subtle', 'off', 'arcade']);
    assert.equal(h.effects.end, 1);
    assert.equal(h.state.qaWalkthrough.completed, true);
    assert.equal(h.state.qaWalkthrough.step, 12);
    h.next(true);
    assert.equal(h.effects.end, 1);
    h.close('stageClearModal');
    assert.match(h.nodes.get('qaWalkthroughResult').textContent, /Resumen de turno cerrado/);
    h.nodes.get('qaWalkthroughRestartBtn').click();
    assert.equal(h.effects.restart, 1);
  } finally { stopQaWalkthrough(); delete global.document; }
});

test('llamadas posteriores al Break respetan su fin real y pueden ser breves sin fechas futuras', () => {
  const now = new Date(2026, 8, 29, 12);
  const dayKey = localDay(now);
  const pauseEnd = new Date(now.getTime() - 200).toISOString();
  const previousEnd = new Date(now.getTime() - 100).toISOString();
  const call = createQaReinforcementCall({ ordinal: 6, dayKey, now, notBeforeISO: pauseEnd, previousEndISO: previousEnd });
  assert.ok(call);
  assert.equal(new Date(call.startISO).getTime(), new Date(previousEnd).getTime() + 1);
  assert.equal(new Date(call.endISO).getTime(), now.getTime() - 1);
  assert.ok(new Date(call.startISO) > new Date(pauseEnd));
  assert.equal(call.durationMin, (new Date(call.endISO) - new Date(call.startISO)) / 60000);
  assert.ok(call.durationMin > 0 && call.durationMin < 3);
  assert.equal(call.countsAsProductive, true);
  const next = createQaReinforcementCall({ ordinal: 7, dayKey, now: new Date(now.getTime() + 100), notBeforeISO: pauseEnd, previousEndISO: call.endISO });
  assert.ok(next);
  assert.ok(new Date(next.startISO) > new Date(call.endISO));
  assert.equal(createQaReinforcementCall({ ordinal: 6, dayKey, now, notBeforeISO: new Date(now.getTime() - 1).toISOString() }), null);
  assert.equal(createQaReinforcementCall({ ordinal: 6, dayKey, now, notBeforeISO: new Date(now.getTime() + 1).toISOString() }), null);
});

test('refuerzo QA bloquea hooks fuera de QA y restaura el paso si falla la escritura', () => {
  const h = harness();
  try {
    h.setActive(false);
    assert.equal(renderQaWalkthrough(), false);
    h.next(true);
    assert.equal(h.effects.calls.length, 0);
    h.setActive(true); renderQaWalkthrough(); h.next();
    const model = structuredClone(h.state.qaWalkthrough);
    const original = h.context.addCall;
    h.context.addCall = () => false;
    h.next();
    assert.deepEqual(h.state.qaWalkthrough, model);
    h.context.addCall = original;
    h.next();
    assert.equal(h.effects.calls.length, 1);
  } finally { stopQaWalkthrough(); delete global.document; }
});

test('llamadas de QA ejercitan los motores reales: cuatro hitos, sorpresa persistida, pausa, recuperación y cierre', async () => {
  const snapshot = createQaSnapshot({ state: {}, settings: {} }, 'reinforcement');
  const { state, settings } = snapshot;
  let rows = snapshot.calls;
  settings.game.intensity = 'subtle';
  const dayKey = state.activeDayKey;
  const noop = () => {};
  const parseDay = (value) => {
    const [month, day, year] = String(value).split('/').map(Number);
    return new Date(year, month - 1, day);
  };
  const dayOf = (value) => {
    if (value == null || value === '') return null;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(String(value))) return String(value);
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? localDay(date) : null;
  };
  const callsForDay = (key) => rows.filter((call) => dayOf(call.shiftDayKey || call.callDate) === key);
  const bonus = (call) => call.frozenHigherRateBonus || null;
  const stats = (items) => ({
    productive: items.filter((call) => call.countsAsProductive).reduce((sum, call) => sum + call.durationMin, 0),
    total: items.length, zeroCount: items.filter((call) => !call.durationMin).length,
    dropped: items.filter((call) => call.dropped === 'Yes').length, gapTotal: 0,
    earnings: items.reduce((sum, call) => sum + Number(call.pay) + Number(bonus(call)?.amount || 0), 0),
  });
  const goal = () => ({ min: settings.productiveGoalMin, usd: settings.earningsGoal });
  const baseContext = {
    callDateKeyFromValue: dayOf, callsForDay, importedCallStats: stats,
    effectiveDailyGoal: goal, todayCallDateKey: (date = new Date()) => localDay(date),
    convertedAmountText: () => '', money: (value) => `$${Number(value).toFixed(2)}`,
    escapeHtml: String, saveStateOnly: noop, saveSettingsOnly: noop, openModal: noop, closeModal: noop, toast: noop,
  };
  global.document = { activeElement: null, documentElement: { classList: { toggle() {} } }, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] };
  setAppState(state); setAppSettings(settings); setAppCalls(rows);
  configureGameContext({
    ...baseContext, callDateToDate: parseDay, parseMoney: (value) => Number(value) || 0,
    cycleEarningsForOffset: () => ({ earnings: 0, start: new Date(), end: new Date() }), effectiveCycleGoal: () => 1000,
    dayAdherence: () => ({ scorePct: 0, checkpoints: [] }), dayConfigFor: () => ({ blocks: [] }),
    formatCallDayLabel: String, formatMinutes: String,
    computeComplianceStreak: () => ({ days: 1 }), dayComplianceStatus: () => 'failed',
    higherRateBonusForCall: bonus, higherRateLiveStatus: () => ({ active: false }), weekdayKeyForDayKey: () => 'mon',
  });
  configurePositiveReinforcementContext(baseContext);
  try {
    const demo = [];
    for (let ordinal = 1; ordinal <= 8; ordinal++) {
      if (ordinal > 4) await new Promise((resolve) => setTimeout(resolve, 3));
      const call = createQaReinforcementCall({ id: `qa-real-engine-${ordinal}`, ordinal, dayKey, previousEndISO: demo.at(-1)?.endISO, notBeforeISO: state.pauseHistory.at(-1)?.endedAt });
      assert.ok(call);
      demo.push(call); rows.push(call); setAppCalls(rows);
      onGameCallSaved(call, ordinal === 3 || ordinal === 5 ? 'import' : 'manual', { random: () => ordinal === 4 ? 0.01 : 0.99 });
      if (ordinal === 4) {
        state.activePause = { type: 'break', startedAt: new Date().toISOString(), shiftDayKey: dayKey };
        onGamePauseStarted('break');
        assert.equal(state.game.live.combo, 0);
        const pause = { ...state.activePause, endedAt: new Date().toISOString() };
        state.activePause = null; state.pauseHistory.push(pause);
        onGamePauseEnded(pause, { onTime: true });
      }
    }
    for (const percent of [25, 50, 75, 100]) assert.equal(state.game.ledger[`money-hit:${dayKey}:${percent}`], true);
    const surprise = Object.values(state.game.ledger).filter((item) => item && typeof item === 'object' && item.surprise === true);
    assert.equal(surprise.length, 1);
    assert.ok(surprise[0].applied > 0);
    assert.equal(state.game.reinforcement.recoveries.length, 1);
    assert.equal(state.game.reinforcement.recoveries[0].callId, demo[5].id);
    assert.equal(state.game.reinforcement.recoveryPending, null);
    assert.ok(new Date(demo[5].startISO) > new Date(state.pauseHistory[0].endedAt));
    assert.ok(state.game.live.combo > 0, 'llamadas productivas posteriores al Break vuelven a subir el combo');
    assert.ok(Object.values(state.game.ledger).some((item) => item?.type === 'pause' && item.onTime));
    const beforeReload = structuredClone(state.game.ledger);
    state.game = normalizeGameState(JSON.parse(JSON.stringify(state.game)));
    let draws = 0;
    rewardSurpriseForCall(demo[3], dayKey, { random: () => { draws++; return 0.99; } });
    assert.equal(draws, 0);
    assert.deepEqual(state.game.ledger, beforeReload);
    assert.equal(checkReinforcementInactivity(Date.now() + 3600000), true);
    assert.equal(checkReinforcementInactivity(Date.now() + 3600000), false);
    state.shiftEndedAt = new Date().toISOString();
    onGameShiftEnded(dayKey);
    assert.equal(state.game.days[dayKey].finalized, true);
    assert.equal(state.game.days[dayKey].closingEvidence.things.length, 3);
  } finally {
    setAppState(null); setAppSettings({}); setAppCalls([]); delete global.document;
  }
});
