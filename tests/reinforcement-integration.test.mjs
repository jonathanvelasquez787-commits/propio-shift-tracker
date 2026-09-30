import test from 'node:test';
import assert from 'node:assert/strict';
import { setAppCalls, setAppSettings, setAppState } from '../js/app-context.js';
import {
  checkReinforcementInactivity, computeGameDay, configureGameContext, createDefaultGameState,
  migrateGameCallReferences, normalizeGameState, onGameCallSaved, onGameCallsChanged,
  onGameMonetaryProgress, onGamePauseEnded, onGamePauseStarted, queueGameToast,
  renderGame, renderGameLive, rewardSurpriseForCall, onGameShiftEnded, onGameShiftStarted,
} from '../js/game.js';
import { configurePositiveReinforcementContext } from '../js/positive-reinforcement.js';

function harness(t, { at = new Date(2026, 8, 29, 12).getTime(), goal = 10000, streak = 3, compliance = 'failed' } = {}) {
  const NativeDate = globalThis.Date;
  const original = Object.fromEntries(['document', 'window', 'requestAnimationFrame', 'setTimeout', 'clearTimeout'].map((key) => [key, globalThis[key]]));
  let now = at;
  class FixedDate extends NativeDate {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  globalThis.Date = FixedDate;
  const keyFor = (date = new FixedDate()) => `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
  const parseDay = (value) => {
    const match = String(value ?? '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return match ? new FixedDate(Number(match[3]), Number(match[1]) - 1, Number(match[2])) : null;
  };
  const dayFrom = (value) => parseDay(value) ? String(value) : null;
  const iso = (time) => new FixedDate(time).toISOString();
  const timers = new Map();
  let timerId = 0;
  globalThis.setTimeout = (callback, delay = 0) => { timers.set(++timerId, { callback, due: now + delay }); return timerId; };
  globalThis.clearTimeout = (id) => timers.delete(id);
  const advance = (duration) => {
    const target = now + duration;
    for (;;) {
      const next = [...timers.entries()].filter(([, timer]) => timer.due <= target).sort((a, b) => a[1].due - b[1].due)[0];
      if (!next) break;
      now = next[1].due;
      timers.delete(next[0]);
      next[1].callback();
    }
    now = target;
  };
  const classList = () => ({ add() {}, remove() {}, toggle() {}, contains: () => false });
  const stack = {
    children: [], get lastElementChild() { return this.children.at(-1); },
    appendChild(node) { node.parent = this; this.children.push(node); },
    replaceChildren() { this.children = []; },
  };
  const announcements = [];
  const live = { set textContent(value) { if (value) announcements.push(value); }, get textContent() { return announcements.at(-1) || ''; } };
  globalThis.document = {
    activeElement: null, documentElement: { classList: classList() },
    getElementById: (id) => id === 'gameToastStack' ? stack : id === 'gameStatusLive' ? live : null,
    querySelector: () => null,
    querySelectorAll: (selector) => selector.startsWith('#gameToastStack') ? stack.children : [],
    createElement: () => ({ dataset: {}, classList: classList(), remove() { if (this.parent) this.parent.children = this.parent.children.filter((node) => node !== this); } }),
  };
  globalThis.window = { matchMedia: () => ({ matches: false }) };
  globalThis.requestAnimationFrame = (callback) => callback();
  let currentState = { game: createDefaultGameState(), gapAnnotations: {}, pauseHistory: [], dayInterruptions: {}, shiftStartedAt: iso(now - 3 * 3600000), shiftEndedAt: null };
  const rows = [];
  const config = { game: { enabled: false, intensity: 'subtle' }, reinforcement: { enabled: false, askAfterCall: false, rewards: [] }, adherenceGoalPct: 95 };
  setAppState(currentState);
  setAppCalls(rows);
  setAppSettings(config);
  const callsForDay = (dayKey) => rows.filter((call) => (call.shiftDayKey || call.callDate) === dayKey);
  const importedCallStats = (items = []) => ({
    total: items.length, productive: items.reduce((sum, call) => sum + (call.countsAsProductive ? call.durationMin : 0), 0),
    earnings: items.reduce((sum, call) => sum + Number(call.pay || 0) + Number(call.bonus || 0), 0),
    dropped: items.filter((call) => call.dropped === 'Yes').length, zeroCount: 0, gapTotal: 0,
  });
  let dailyGoal = goal;
  const shared = {
    callDateKeyFromValue: dayFrom, callsForDay, convertedAmountText: (value) => `≈ L ${(value * 25).toFixed(2)}`,
    effectiveDailyGoal: () => ({ min: 1000, usd: dailyGoal }), escapeHtml: String, importedCallStats,
    saveStateOnly: () => {}, saveSettingsOnly: () => {}, todayCallDateKey: keyFor, toast: () => {},
    closeModal: () => {}, openModal: () => {},
  };
  configureGameContext({
    ...shared, appConfirm: async () => true, callDateToDate: parseDay, computeComplianceStreak: () => ({ days: streak }),
    cycleEarningsForOffset: () => ({ earnings: 0, start: new FixedDate(), end: new FixedDate() }), effectiveCycleGoal: () => 1000,
    dayAdherence: () => ({ scorePct: 0, checkpoints: [] }), dayConfigFor: () => ({ blocks: [] }),
    dayComplianceStatus: () => compliance, dayIsEffectivelyOff: () => false,
    formatCallDayLabel: String, formatMinutes: String, higherRateBonusForCall: (call) => call.bonus ? { amount: call.bonus } : null,
    higherRateLiveStatus: () => ({ active: false }), money: (value) => `$${Number(value).toFixed(2)}`,
    parseMoney: (value) => Number(value) || 0, weekdayKeyForDayKey: () => 'tue', productiveMinutesForDay: () => 0,
  });
  configurePositiveReinforcementContext(shared);
  renderGame();
  config.game.enabled = true;
  t.after(() => {
    setAppState(null); setAppCalls([]); setAppSettings({});
    globalThis.Date = NativeDate;
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  });
  const add = (id, props = {}) => {
    const call = {
      id, callDate: keyFor(), shiftDayKey: keyFor(new FixedDate(currentState.shiftStartedAt)),
      billable: 'Yes', dropped: 'No', countsAsProductive: true, durationMin: 1, pay: 1,
      startISO: iso(now - 120000), endISO: iso(now - 60000), importedAt: iso(now - 59000), ...props,
    };
    rows.push(call);
    return call;
  };
  return {
    get state() { return currentState; }, config, rows, stack, announcements, add, keyFor, iso, advance,
    get now() { return now; }, setNow: (value) => { now = value; }, setGoal: (value) => { dailyGoal = value; },
    reload() { currentState = JSON.parse(JSON.stringify(currentState)); currentState.game = normalizeGameState(currentState.game); setAppState(currentState); },
    ledger(prefix) { return Object.entries(currentState.game.ledger).filter(([key]) => key.startsWith(prefix)); },
  };
}

test('hooks manual/live/import guardan una decisión por llamada y migran la oficial sin reintentar azar', (t) => {
  const h = harness(t);
  const call = h.add('provisional');
  let draws = 0;
  const random = () => { draws += 1; return 0.01; };
  onGameCallSaved(call, 'manual', { random });
  const key = `reinforce-call:${call.shiftDayKey}:provisional`;
  const receipt = structuredClone(h.state.game.ledger[key]);
  assert.equal(receipt.surprise, true);
  assert.equal(receipt.applied, 5);
  const combo = h.state.game.live.combo;
  const xp = computeGameDay(call.shiftDayKey).xp;
  onGameCallSaved(call, 'live', { random });
  onGameCallSaved(call, 'import', { random });
  assert.equal(draws, 1);
  assert.equal(h.state.game.live.combo, combo);
  assert.equal(computeGameDay(call.shiftDayKey).xp, xp);
  migrateGameCallReferences('provisional', 'official');
  call.id = 'official';
  h.reload();
  onGameCallSaved(call, 'import', { random });
  assert.equal(draws, 1);
  assert.equal(h.state.game.ledger[key], undefined);
  assert.deepEqual(h.state.game.ledger[`reinforce-call:${call.shiftDayKey}:official`], receipt);
  const miss = h.add('surprise-miss');
  onGameCallSaved(miss, 'import', { random: () => 0.99 });
  const missKey = `reinforce-call:${miss.shiftDayKey}:surprise-miss`;
  assert.equal(h.state.game.ledger[missKey].surprise, false);
  h.reload();
  onGameCallSaved(miss, 'live', { random: () => { throw new Error('la recarga no debe volver a tirar azar'); } });
  assert.equal(h.state.game.ledger[missKey].applied, 0);
});

test('cofre sorpresa real respeta bloqueo y tope sin perder su decisión persistida', (t) => {
  const h = harness(t);
  const call = h.add('locked');
  h.state.game.days[call.shiftDayKey] = { bonusXp: 0, xpLocked: 80 };
  const locked = rewardSurpriseForCall(call, call.shiftDayKey, { random: () => 0.01 });
  assert.equal(locked.surprise, true);
  assert.equal(locked.applied, 0);
  assert.equal(h.state.game.days[call.shiftDayKey].bonusXp, 0);
  h.state.game.days[call.shiftDayKey] = { bonusXp: 0 };
  const cappedCall = h.add('capped');
  const baseXp = computeGameDay(call.shiftDayKey).xp;
  const baseBonus = 148 - baseXp;
  h.state.game.days[call.shiftDayKey].bonusXp = baseBonus;
  const capped = rewardSurpriseForCall(cappedCall, cappedCall.shiftDayKey, { random: () => 0.01 });
  assert.equal(capped.surprise, true);
  assert.equal(capped.applied, 2);
  assert.equal(h.state.game.days[call.shiftDayKey].bonusXp, baseBonus + 2, 'solo el XP aplicado entra al saldo reversible');
  assert.equal(computeGameDay(call.shiftDayKey).xp, 150);
  assert.ok(computeGameDay(call.shiftDayKey).xp <= 150);
  h.reload();
  assert.equal(rewardSurpriseForCall(cappedCall, cappedCall.shiftDayKey, { random: () => 0.99 }).applied, 2);
});

test('hitos monetarios múltiples, cambio de meta, corrección y recarga no repiten celebraciones', (t) => {
  const h = harness(t, { goal: 100 });
  const day = h.keyFor();
  const progress = onGameMonetaryProgress(day, 80, 100);
  assert.deepEqual(progress.crossed, [25, 50, 75]);
  assert.deepEqual(progress.next, { pct: 100, remaining: 20 });
  assert.equal(h.ledger(`money-hit:${day}:`).length, 3);
  assert.match(h.announcements.at(-1), /25%, 50%, 75%/);
  assert.match(h.announcements.at(-1), /\$80\.00 ≈ L 2000\.00/);
  const messages = h.announcements.length;
  h.reload();
  assert.deepEqual(onGameMonetaryProgress(day, 80, 100).crossed, []);
  assert.deepEqual(onGameMonetaryProgress(day, 10, 100).crossed, []);
  assert.deepEqual(onGameMonetaryProgress(day, 80, 200).crossed, []);
  assert.deepEqual(onGameMonetaryProgress(day, 80, 0).crossed, []);
  assert.equal(h.announcements.length, messages);
  assert.deepEqual(onGameMonetaryProgress(day, 80, 80).crossed, [100]);
  assert.equal(h.ledger(`money-hit:${day}:`).length, 4);
  const nextDay = '09/30/2026';
  assert.deepEqual(onGameMonetaryProgress(nextDay, 30, 100).crossed, [25]);
  assert.equal(h.ledger(`money-hit:${nextDay}:`).length, 1);
});

test('corregir o borrar la llamada revierte XP sorpresa y conserva la decisión sin nuevos sorteos', (t) => {
  const h = harness(t);
  const call = h.add('corrected-surprise');
  onGameCallSaved(call, 'manual', { random: () => 0.01 });
  const key = `reinforce-call:${call.shiftDayKey}:${call.id}`;
  assert.equal(h.state.game.ledger[key].applied, 5);
  call.dropped = 'Yes';
  call.countsAsProductive = false;
  onGameCallsChanged(call.shiftDayKey);
  assert.equal(h.state.game.ledger[key].surprise, true);
  assert.equal(h.state.game.ledger[key].applied, 0);
  assert.equal(h.state.game.days[call.shiftDayKey].bonusXp, 0);
  h.reload();
  call.dropped = 'No';
  call.countsAsProductive = true;
  onGameCallSaved(call, 'import', { random: () => { throw new Error('una corrección no reinicia el sorteo'); } });
  assert.equal(h.state.game.ledger[key].applied, 0);
  const deleted = h.add('deleted-surprise');
  onGameCallSaved(deleted, 'manual', { random: () => 0.01 });
  const deletedKey = `reinforce-call:${deleted.shiftDayKey}:${deleted.id}`;
  assert.equal(h.state.game.ledger[deletedKey].applied, 5);
  h.rows.splice(h.rows.indexOf(deleted), 1);
  onGameCallsChanged(deleted.shiftDayKey);
  assert.equal(h.state.game.ledger[deletedKey].surprise, true);
  assert.equal(h.state.game.ledger[deletedKey].applied, 0);
  h.reload();
  h.rows.push(deleted);
  onGameCallSaved(deleted, 'import', { random: () => { throw new Error('reimportar no reinicia el sorteo'); } });
  assert.equal(h.state.game.ledger[deletedKey].applied, 0);
});

test('hooks llamadas y correcciones mantienen hitos en el día contable nocturno', (t) => {
  const at = new Date(2026, 8, 30, 0, 20).getTime();
  const h = harness(t, { at, goal: 100 });
  h.state.shiftStartedAt = h.iso(at - 2 * 3600000);
  const call = h.add('night-call', { pay: 55 });
  assert.equal(call.shiftDayKey, '09/29/2026');
  onGameCallSaved(call, 'live', { random: () => 0.99 });
  assert.equal(h.ledger('money-hit:09/29/2026:').length, 2);
  assert.equal(h.ledger('money-hit:09/30/2026:').length, 0);
  h.setGoal(50);
  onGameCallsChanged(call.shiftDayKey);
  assert.equal(h.ledger('money-hit:09/29/2026:').length, 4);
  call.pay = 1;
  h.reload();
  onGameCallsChanged(call.shiftDayKey);
  assert.equal(h.ledger('money-hit:09/29/2026:').length, 4);
  h.rows.splice(0, h.rows.length);
  onGameCallsChanged(call.shiftDayKey);
  assert.equal(h.ledger('money-hit:09/29/2026:').length, 4);
});

test('Break reinicia combo y reconciliación lo conserva; retorno puntual concede una sola vez', (t) => {
  const h = harness(t);
  for (const id of ['before-a', 'before-b']) onGameCallSaved(h.add(id), 'manual', { random: () => 0.99 });
  const day = h.keyFor();
  assert.equal(h.state.game.live.combo, 2);
  const pause = { id: 'pause', type: 'break', startedAt: h.iso(h.now), shiftDayKey: day };
  h.state.activePause = pause;
  onGamePauseStarted('break');
  assert.equal(h.state.game.live.combo, 0);
  onGameCallsChanged(day);
  assert.equal(h.state.game.live.combo, 0);
  h.advance(10 * 60000);
  pause.endedAt = h.iso(h.now);
  h.state.pauseHistory.push(pause);
  h.state.activePause = null;
  onGamePauseEnded(pause, { onTime: true });
  const receipt = h.ledger(`pause-return:${day}:`)[0][1];
  assert.equal(receipt.onTime, true);
  assert.equal(receipt.applied, 5);
  const bonus = h.state.game.days[day].bonusXp;
  h.reload();
  onGamePauseEnded(pause, { onTime: true });
  onGameCallsChanged(day);
  assert.equal(h.state.game.days[day].bonusXp, bonus);
  assert.equal(h.state.game.live.combo, 0);
  h.advance(120000);
  onGameCallSaved(h.add('after-pause'), 'manual', { random: () => 0.99 });
  assert.equal(h.state.game.live.combo, 1);
});

test('pausa tardía y retorno con XP bloqueado no conceden bonus; dropped conserva combo sin premiar errores', (t) => {
  const h = harness(t);
  const first = h.add('good-call');
  onGameCallSaved(first, 'manual', { random: () => 0.99 });
  const day = first.shiftDayKey;
  const combo = h.state.game.live.combo;
  const dropped = h.add('dropped-a', { dropped: 'Yes', billable: 'No', countsAsProductive: false, pay: 0 });
  onGameCallSaved(dropped, 'live', { random: () => { throw new Error('dropped no participa en el sorteo'); } });
  const droppedMessages = h.announcements.filter((message) => /cort|corte/.test(message)).length;
  assert.equal(droppedMessages, 1);
  assert.equal(h.state.game.live.combo, combo);
  assert.equal(h.state.game.ledger[`reinforce-call:${day}:dropped-a`].applied, 0);
  h.reload();
  onGameCallSaved(dropped, 'import');
  onGameCallSaved(h.add('dropped-b', { dropped: 'Yes', countsAsProductive: false, pay: 0 }), 'manual');
  assert.equal(h.announcements.filter((message) => /cort|corte/.test(message)).length, droppedMessages);
  assert.equal(h.state.game.live.combo, combo);
  onGamePauseEnded({ type: 'lunch', startedAt: h.iso(h.now - 3600000), shiftDayKey: day }, { onTime: false });
  assert.equal(h.ledger(`pause-return:${day}:`)[0][1].applied, 0);
  h.state.game.days[day].xpLocked = 80;
  onGamePauseEnded({ type: 'break', startedAt: h.iso(h.now - 1800000), shiftDayKey: day }, { onTime: true });
  assert.equal(h.ledger(`pause-return:${day}:`)[1][1].applied, 0);
});

test('reanudar una pausa ya premiada y terminar tarde corrige la puntualidad sin duplicar XP', (t) => {
  const h = harness(t);
  const call = h.add('pause-correction-call');
  onGameCallSaved(call, 'manual', { random: () => 0.99 });
  const day = call.shiftDayKey;
  const pause = { type: 'break', startedAt: h.iso(h.now), shiftDayKey: day };
  h.state.activePause = pause;
  onGamePauseStarted('break');
  h.advance(10 * 60000);
  pause.endedAt = h.iso(h.now);
  h.state.activePause = null;
  h.state.pauseHistory.push(pause);
  onGamePauseEnded(pause, { onTime: true });
  assert.equal(h.ledger(`pause-return:${day}:`)[0][1].applied, 5);
  h.state.activePause = { ...pause };
  onGamePauseStarted('break');
  h.advance(30 * 60000);
  pause.endedAt = h.iso(h.now);
  h.state.activePause = null;
  onGamePauseEnded(pause, { onTime: false });
  assert.equal(h.ledger(`pause-return:${day}:`).length, 1);
  const receipt = h.ledger(`pause-return:${day}:`)[0][1];
  assert.equal(receipt.onTime, false);
  assert.equal(receipt.applied, 0);
  assert.equal(h.state.game.days[day].bonusXp, 0);
  h.reload();
  onGamePauseEnded(pause, { onTime: false });
  assert.equal(h.state.game.days[day].bonusXp, 0);
});

test('inactividad excluye pausas, turno cerrado y llamada activa; persiste dedupe y se rearma tras otra llamada', (t) => {
  const h = harness(t);
  h.state.shiftStartedAt = h.iso(h.now - 90 * 60000);
  h.state.pauseHistory = [{ startedAt: h.iso(h.now - 80 * 60000), endedAt: h.iso(h.now - 30 * 60000) }];
  assert.equal(checkReinforcementInactivity(h.now), false, '90 min menos 50 min de pausa = 40 min');
  h.state.pauseHistory = [];
  h.state.dayInterruptions = { [h.keyFor()]: [{ gapStart: h.iso(h.now - 70 * 60000), gapEnd: h.iso(h.now - 20 * 60000) }] };
  assert.equal(checkReinforcementInactivity(h.now), false, 'una interrupción laboral tampoco es inactividad');
  h.state.dayInterruptions = {};
  h.state.activePause = { type: 'break' };
  assert.equal(checkReinforcementInactivity(h.now), false);
  h.state.activePause = null;
  h.state.activeCall = { startedAt: h.iso(h.now - 60000) };
  assert.equal(checkReinforcementInactivity(h.now), false);
  h.state.activeCall = null;
  h.state.shiftEndedAt = h.iso(h.now);
  assert.equal(checkReinforcementInactivity(h.now), false);
  h.state.shiftEndedAt = null;
  assert.equal(checkReinforcementInactivity(h.now), true);
  const combo = h.state.game.live.combo;
  h.reload();
  assert.equal(checkReinforcementInactivity(h.now), false);
  assert.equal(h.state.game.live.combo, combo);
  const call = h.add('resume-call');
  onGameCallSaved(call, 'manual', { random: () => 0.99 });
  assert.equal(checkReinforcementInactivity(h.now), false);
  h.advance(60 * 60000);
  assert.equal(checkReinforcementInactivity(h.now), true);
  assert.equal(h.ledger('idle-support:').length, 2);
});

test('inactividad nocturna deduplica a ambos lados de medianoche del mismo turno', (t) => {
  const at = new Date(2026, 8, 29, 23, 59).getTime();
  const h = harness(t, { at });
  h.state.shiftStartedAt = h.iso(at - 90 * 60000);
  assert.equal(checkReinforcementInactivity(h.now), true);
  h.advance(120000);
  h.reload();
  assert.equal(checkReinforcementInactivity(h.now), false);
  assert.equal(h.ledger('idle-support:09/29/2026:').length, 1);
  assert.equal(h.ledger('idle-support:09/30/2026:').length, 0);
});

test('cola real limita a tres toasts y no repite el último texto después de expirar', (t) => {
  const h = harness(t);
  for (const message of ['Cola uno', 'Cola dos', 'Cola tres', 'Cola cuatro']) queueGameToast(message);
  assert.equal(h.stack.children.length, 3);
  assert.equal(h.announcements.length, 4);
  h.advance(2820);
  assert.equal(h.stack.children.length, 1);
  assert.equal(h.stack.children[0].textContent, 'Cola cuatro');
  h.advance(2820);
  assert.equal(h.stack.children.length, 0);
  queueGameToast('Cola cuatro');
  assert.equal(h.stack.children.length, 0);
  assert.equal(h.announcements.length, 4);
  h.config.game.enabled = false;
  h.config.reinforcement.enabled = true;
  queueGameToast('Anuncio personal', '', { channel: 'personal' });
  renderGameLive();
  assert.equal(h.stack.children[0].textContent, 'Anuncio personal');
  h.config.game.intensity = 'off';
  queueGameToast('Apagado', '', { channel: 'personal' });
  assert.equal(h.announcements.at(-1), 'Anuncio personal');
});

test('cierre de racha semanal conserva rollback y comparaciones al recargar y revoca el escudo al reabrir', (t) => {
  const h = harness(t, { streak: 7, compliance: 'compliant' });
  const call = h.add('weekly-close');
  onGameCallSaved(call, 'manual', { random: () => 0.99 });
  const day = call.shiftDayKey;
  const xp = computeGameDay(day).xp;
  h.state.shiftEndedAt = h.iso(h.now);
  assert.doesNotThrow(() => onGameShiftEnded(day));
  const entry = h.state.game.days[day];
  const rollback = structuredClone(entry.rollback);
  const comparisons = structuredClone(entry.comparisons);
  const shieldKey = `streak-shield:${day}:7`;
  assert.equal(entry.finalized, true);
  assert.equal(entry.callCount, 1);
  assert.equal(entry.totalXpAfter, xp);
  assert.ok(entry.levelAfter >= 1);
  assert.ok(entry.nextLevelXp >= xp);
  assert.equal(rollback.shieldsBefore, 0);
  assert.equal(rollback.streakShieldAwardedKey, shieldKey);
  assert.equal(comparisons.earnings, 1);
  assert.equal(h.state.game.shields, 1);
  assert.equal(h.state.game.ledger[shieldKey], true);
  h.reload();
  renderGame();
  assert.deepEqual(h.state.game.days[day].rollback, rollback);
  assert.deepEqual(h.state.game.days[day].comparisons, comparisons);
  assert.equal(h.state.game.days[day].totalXpAfter, xp);
  onGameShiftEnded(day);
  assert.equal(h.state.game.totalXp, xp);
  assert.equal(h.state.game.shields, 1);
  h.state.shiftEndedAt = null;
  onGameShiftStarted({ continued: true });
  assert.equal(h.state.game.days[day].finalized, undefined);
  assert.equal(h.state.game.totalXp, 0);
  assert.equal(h.state.game.shields, 0);
  assert.equal(h.state.game.ledger[shieldKey], undefined);
});

test('metadatos de cierre importados validan dinero, fechas y rollback antes de restaurar premios', () => {
  const day = '09/29/2026';
  const game = normalizeGameState({ days: { [day]: {
    finalized: true, callCount: Infinity, totalXpAfter: -2, levelAfter: 10000, nextLevelXp: '150',
    comparisons: { earnings: -1, yesterdayKey: '02/30/2026', yesterdayEarnings: Infinity, yesterdayHasData: 'yes', recordBefore: 12, recordDayKey: '09/28/2026' },
    rollback: { shieldsBefore: 99, bestStreakBefore: -1, streakShieldAwardedKey: '<invalid>' },
    correctedAt: 'invalid-date', metadataShieldRestored: true,
  } } });
  const entry = game.days[day];
  assert.equal(entry.callCount, undefined);
  assert.equal(entry.totalXpAfter, 0);
  assert.equal(entry.levelAfter, 100);
  assert.equal(entry.nextLevelXp, 150);
  assert.equal(entry.comparisons.yesterdayKey, null);
  assert.equal(entry.comparisons.recordDayKey, '09/28/2026');
  assert.equal(entry.comparisons.earnings, 0);
  assert.equal(entry.comparisons.yesterdayEarnings, 0);
  assert.equal(entry.comparisons.yesterdayHasData, false);
  assert.deepEqual(entry.rollback, { shieldsBefore: 3, bestStreakBefore: 0, streakShieldAwardedKey: null });
  assert.equal(entry.correctedAt, undefined);
  assert.equal(entry.metadataShieldRestored, true);
  assert.deepEqual(normalizeGameState(JSON.parse(JSON.stringify(game))).days[day], entry);
});

test('cierre nocturno cumplido proyecta la racha del día contable y las correcciones históricas no la proyectan de nuevo', (t) => {
  const at = new Date(2026, 8, 30, 0, 20).getTime();
  const h = harness(t, { at, streak: 3, compliance: 'compliant' });
  const call = h.add('night-projection');
  onGameCallSaved(call, 'live', { random: () => 0.99 });
  const day = call.shiftDayKey;
  assert.equal(day, '09/29/2026');
  assert.equal(h.keyFor(), '09/30/2026');
  h.state.shiftEndedAt = h.iso(h.now);
  onGameShiftEnded(day);
  assert.match(h.state.game.days[day].closingEvidence.projection, /Si mañana.*4 días/);
  assert.equal(h.state.game.days['09/30/2026'], undefined, 'la proyección no concede por anticipado otro día');
  h.reload();
  renderGame();
  assert.match(h.state.game.days[day].closingEvidence.projection, /Si mañana.*4 días/);
  h.advance(24 * 3600000);
  call.pay = 2;
  onGameCallsChanged(day);
  assert.equal(h.state.game.days[day].closingEvidence.projection, null);
  assert.equal(h.state.game.days[day].comparisons.earnings, 2);
  h.reload();
  assert.equal(h.state.game.days[day].closingEvidence.projection, null);
});
