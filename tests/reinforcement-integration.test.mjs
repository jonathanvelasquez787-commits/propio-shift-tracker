import test from 'node:test';
import assert from 'node:assert/strict';
import { setLanguage } from '../js/i18n.js';
import { setAppCalls, setAppSettings, setAppState } from '../js/app-context.js';
// Game feedback variants are translated once when their module loads.
setLanguage('es');
const {
  announceGameStatus, checkReinforcementInactivity, chooseCycleReward, claimPendingChest, computeGameDay, configureGameContext, createDefaultGameState, equipAccessory,
  migrateGameCallReferences, normalizeGameState, onGameCallSaved, onGameCallsChanged, onGameDayMetadataChanged, openDailyGoalChest,
  onGameMonetaryProgress, onGamePauseEnded, onGamePauseStarted, queueGameToast,
  renderGame, renderGameLive, rewardSurpriseForCall, onGameShiftEnded, onGameShiftStarted,
} = await import('../js/game.js');
const { configurePositiveReinforcementContext } = await import('../js/positive-reinforcement.js');
import { financeRowIsMeta } from '../js/finance.js';

function harness(t, { at = new Date(2026, 8, 29, 12).getTime(), goal = 10000, streak = 3, compliance = 'failed', surface = false } = {}) {
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
  const nodes = new Map();
  const surfaceNode = () => {
    const classes = new Set();
    return {
      dataset: {}, style: { setProperty(name, value) { this[name] = value; } }, innerHTML: '', textContent: '', hidden: false, offsetWidth: 400,
      isConnected: true, get ownerDocument() { return globalThis.document; },
      get className() { return [...classes].join(' '); },
      set className(value) { classes.clear(); String(value).split(/\s+/).filter(Boolean).forEach((name) => classes.add(name)); },
      classList: { add(...names) { names.forEach((name) => classes.add(name)); }, remove(...names) { names.forEach((name) => classes.delete(name)); }, contains: (name) => classes.has(name) },
      querySelector: () => null, querySelectorAll: () => [],
      replaceChildren() { this.innerHTML = ''; },
      getBoundingClientRect: () => ({ width: 400, height: 280 }),
      getClientRects() { return this.hidden ? [] : [this.getBoundingClientRect()]; },
      setAttribute(name, value) { this[name] = String(value); },
      removeAttribute(name) { if (name.startsWith('data-')) delete this.dataset[name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())]; },
    };
  };
  if (surface) {
    for (const id of ['gameArena', 'classicDailyGoalCard', 'gameCallFx', 'gameMissions']) {
      nodes.set(id, surfaceNode());
    }
    const arena = nodes.get('gameArena');
    let markup = '', battle = null;
    const slots = new Map();
    Object.defineProperty(arena, 'innerHTML', {
      get: () => markup,
      set(value) {
        markup = String(value);
        slots.clear();
        for (const match of markup.matchAll(/\b(data-battle-[a-z-]+)(?=[\s>])/g)) slots.set(`[${match[1]}]`, surfaceNode());
        battle = markup.includes('class="game-battle"') ? surfaceNode() : null;
        if (!battle) return;
        battle.className = 'game-battle';
        battle.closest = selector => selector === '[hidden]' && arena.hidden ? arena : null;
        const hero = surfaceNode();
        battle.querySelector = selector => selector === '[data-battle-action="hero"]' ? hero : slots.get(selector) || null;
        slots.get('[data-battle-canvas]').getContext = () => null;
      },
    });
    arena.querySelector = selector => selector === '.game-battle' ? battle : slots.get(selector) || null;
  }
  const browser = {
    matchMedia: () => ({ matches: false }),
    getComputedStyle: () => ({ visibility: 'visible', getPropertyValue: () => '' }),
    setTimeout: (...args) => globalThis.setTimeout(...args),
    clearTimeout: (...args) => globalThis.clearTimeout(...args),
  };
  globalThis.document = {
    defaultView: browser, hidden: false,
    activeElement: null, documentElement: { classList: classList() },
    getElementById: (id) => nodes.get(id) || (id === 'gameToastStack' ? stack : id === 'gameStatusLive' ? live : null),
    querySelector: () => null,
    querySelectorAll: (selector) => selector.startsWith('#gameToastStack') ? stack.children : [],
    createElement: () => ({ dataset: {}, classList: classList(), remove() { if (this.parent) this.parent.children = this.parent.children.filter((node) => node !== this); } }),
  };
  globalThis.window = browser;
  globalThis.requestAnimationFrame = (callback) => callback();
  let currentState = { game: createDefaultGameState(), gapAnnotations: {}, pauseHistory: [], dayInterruptions: {}, shiftStartedAt: iso(now - 3 * 3600000), shiftEndedAt: null };
  const rows = [];
  const config = { game: { enabled: false, intensity: 'subtle' }, reinforcement: { enabled: false, askAfterCall: false }, adherenceGoalPct: 95 };
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
  const openedModals = [], closedModals = [], savedStates = [];
  const shared = {
    callDateKeyFromValue: dayFrom, callsForDay, convertedAmountText: (value) => `≈ L ${(value * 25).toFixed(2)}`,
    effectiveDailyGoal: () => ({ min: 1000, usd: dailyGoal }), escapeHtml: String, importedCallStats,
    saveStateOnly: () => savedStates.push(structuredClone(currentState)), saveSettingsOnly: () => {}, todayCallDateKey: keyFor, toast: () => {},
    closeModal: (id) => closedModals.push(id), openModal: (id) => openedModals.push(id),
  };
  configureGameContext({
    ...shared, financeRowIsMeta, appConfirm: async () => true, callDateToDate: parseDay, computeComplianceStreak: () => ({ days: streak }),
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
    get state() { return currentState; }, config, rows, stack, announcements, nodes, openedModals, closedModals, savedStates, add, keyFor, iso, advance,
    get now() { return now; }, setNow: (value) => { now = value; }, setGoal: (value) => { dailyGoal = value; },
    reload() { currentState = JSON.parse(JSON.stringify(currentState)); currentState.game = normalizeGameState(currentState.game); setAppState(currentState); },
    ledger(prefix) { return Object.entries(currentState.game.ledger).filter(([key]) => key.startsWith(prefix)); },
  };
}

test('llamadas históricas, futuras y caídas no activan un impacto visual', (t) => {
  const h = harness(t, { surface: true });
  h.config.game.intensity = 'arcade';
  const variants = [
    { id: 'historic', props: { callDate: '09/28/2026', shiftDayKey: '09/28/2026', startISO: h.iso(h.now - 86400000), endISO: h.iso(h.now - 86340000) } },
    { id: 'future', props: { startISO: h.iso(h.now + 60000), endISO: h.iso(h.now + 120000) } },
    { id: 'dropped', props: { dropped: 'Yes', countsAsProductive: false } },
  ];
  for (const { id, props } of variants) {
    const call = h.add(id, props);
    onGameCallSaved(call, 'import');
    assert.equal(h.nodes.get('gameCallFx').innerHTML, '');
    assert.notEqual(h.state.game.ledger[`reinforce-call:${call.shiftDayKey}:${id}`]?.visual, true);
  }
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

test('custom inactivity notification uses saved text with achievements off and preserves threshold and dedupe', (t) => {
  const h = harness(t);
  h.config.game.enabled = false;
  h.config.reinforcement.enabled = true;
  h.config.reinforcement.inactivityMessage = 'Un paso a la vez <3';
  h.state.shiftStartedAt = h.iso(h.now - 59 * 60000);
  const xp = h.state.game.totalXp;
  assert.equal(checkReinforcementInactivity(h.now), false);
  h.advance(60000);
  assert.equal(checkReinforcementInactivity(h.now), true);
  assert.equal(h.stack.children.at(-1).textContent, 'Un paso a la vez <3');
  assert.equal(h.state.game.totalXp, xp);
  assert.equal(h.rows.length, 0);
  h.config.reinforcement.inactivityMessage = 'Otro mensaje';
  assert.equal(checkReinforcementInactivity(h.now), false);
  h.reload();
  assert.equal(checkReinforcementInactivity(h.now), false);
  assert.equal(h.ledger('idle-support:').length, 1);
});

test('inactivity once-only and changed intervals preserve the last delivery instead of replaying a notice', (t) => {
  const h = harness(t);
  Object.assign(h.config.reinforcement, { inactivityMinutes: 5, inactivityRepeat: false });
  h.state.shiftStartedAt = h.iso(h.now - 5 * 60000);
  assert.equal(checkReinforcementInactivity(h.now), true);
  h.advance(60000); h.config.reinforcement.inactivityMinutes = 1;
  assert.equal(checkReinforcementInactivity(h.now), false, 'once-only remains delivered after frequency edits');
  h.config.reinforcement.inactivityMinutes = 10; h.config.reinforcement.inactivityRepeat = true;
  h.advance(8 * 60000); assert.equal(checkReinforcementInactivity(h.now), false);
  h.advance(60000); assert.equal(checkReinforcementInactivity(h.now), true);
  h.config.reinforcement.inactivityRepeat = false;
  h.advance(60 * 60000); assert.equal(checkReinforcementInactivity(h.now), false);
});

test('legacy inactivity receipts establish a repeat baseline and corrected pauses cannot replay delivery', (t) => {
  const h = harness(t);
  h.state.shiftStartedAt = h.iso(h.now - 60 * 60000);
  assert.equal(checkReinforcementInactivity(h.now), true);
  const key = h.ledger('idle-support:')[0][0];
  h.state.game.ledger[key] = true;
  Object.assign(h.config.reinforcement, { inactivityMinutes: 5, inactivityRepeat: true });
  h.reload(); assert.equal(checkReinforcementInactivity(h.now), false);
  h.advance(5 * 60000); assert.equal(checkReinforcementInactivity(h.now), true);
  h.state.pauseHistory = [{ startedAt: h.iso(h.now - 20 * 60000), endedAt: h.iso(h.now) }];
  assert.equal(checkReinforcementInactivity(h.now), false);
  h.reload(); assert.equal(checkReinforcementInactivity(h.now), false);
  h.advance(5 * 60000); assert.equal(checkReinforcementInactivity(h.now), true);
});

test('repeating inactivity actually redisplays identical messages after expiry without weakening ordinary toast dedupe', (t) => {
  const h = harness(t);
  Object.assign(h.config.reinforcement, { inactivityMinutes: 1, inactivityRepeat: true, inactivityMessage: 'Apoyo repetido' });
  h.state.shiftStartedAt = h.iso(h.now - 60000);
  assert.equal(checkReinforcementInactivity(h.now), true);
  assert.equal(h.stack.children.at(-1).textContent, 'Apoyo repetido');
  h.advance(60000); assert.equal(h.stack.children.length, 0);
  assert.equal(checkReinforcementInactivity(h.now), true);
  assert.equal(h.stack.children.at(-1).textContent, 'Apoyo repetido');
  assert.equal(h.announcements.filter(text => text === 'Apoyo repetido').length, 2);
  queueGameToast('Apoyo repetido', '', { channel: 'either' });
  assert.equal(h.stack.children.length, 1);
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
  assert.equal(h.stack.children.length, 1);
  renderGame();
  assert.equal(h.stack.children.length, 1);
  h.config.reinforcement.enabled = false;
  renderGame();
  queueGameToast('Apagado', '', { channel: 'personal' });
  assert.equal(h.stack.children.length, 0);
  assert.equal(h.announcements.at(-1), 'Anuncio personal');
});

