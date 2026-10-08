import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFragment } from 'parse5';
import { BATTLE_WEAPONS, normalizeBattleWeapon, createBattleQueue, battleMarkup, syncBattle, playBattleCall, stopBattle } from '../js/game-battle.js';

function harness({ reduced = false, canvasAvailable = true, currentDay = false } = {}) {
  let now = 1000, sequence = 0;
  const frames = new Map(), timers = new Map(), observers = [], sounds = [], changes = [], pauses = [];
  class Node {
    constructor(button = false) { this.dataset = {}; this.style = {}; this.listeners = new Map(); this.hidden = false; this.textContent = ''; this.innerHTML = ''; this.attributes = {}; this.button = button; }
    addEventListener(type, fn) { const list = this.listeners.get(type) || new Set(); list.add(fn); this.listeners.set(type, list); }
    removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); }
    dispatch(type, props = {}) { const event = { key: '', target: this, preventDefault() {}, ...props }; for (const fn of this.listeners.get(type) || []) fn(event); }
    setAttribute(name, value) { this.attributes[name] = value; }
    removeAttribute(name) { delete this.attributes[name]; if (name === 'data-battle-hit') delete this.dataset.battleHit; }
    closest(selector) { return selector === 'button' && this.button ? this : null; }
    getClientRects() { return this.hidden ? [] : [this.getBoundingClientRect()]; }
    getBoundingClientRect() { return { width: 320, height: 265 }; }
    focus() { this.focused = true; }
  }
  const doc = new Node(), host = new Node(), element = new Node(), nodes = {};
  doc.documentElement = new Node(); doc.body = new Node(); doc.defaultView = host; doc.hidden = false;
  element.ownerDocument = doc; element.isConnected = true;
  element.matches = selector => selector === '.game-battle'; element.contains = node => node === element || Object.values(nodes).includes(node);
  const names = ['stage','canvas','monster','hero-label','monster-label','monster-name','feed','notice','notice-text','banner','victory','selected','live','motion-note','duel-hud','touch','shortcuts','duel-button','work-note','hearts','time','points','best','duel-fill','duel-health','duel-hp','start','duel-message','auto-hud','auto-hero-hp','auto-hero-fill','auto-hp','auto-fill','round','round-state','call-overlay','round-victory','auto-pause','charge-fill','charge-label','charge','special-button','special-name','weapon-select','pause-icon','sound','sound-icon','collection','collection-summary','collection-toggle'];
  for (const name of names) nodes[name] = new Node();
  for (const name of ['auto','duel','start','attack','grenade','jump','collection-toggle','sound']) { nodes[name] = new Node(true); nodes[name].dataset.battleAction = name; }
  nodes['duel-button'] = nodes.duel; nodes['collection-toggle'].dataset.battleAction = 'collection'; nodes.sound.dataset.battleAction = 'toggle-sound';
  for (const [name, action] of [['auto-pause','pause-auto'],['special-button','special']]) { nodes[name].button = true; nodes[name].dataset.battleAction = action; }
  nodes.hero = new Node(true); nodes.hero.dataset.battleAction = 'hero';
  const weapons = BATTLE_WEAPONS.map(w => { const node = new Node(true); node.dataset.battleWeapon = w.id; return node; });
  element.querySelector = selector => selector.includes('data-battle-action') ? nodes.hero : nodes[selector.match(/data-battle-([\w-]+)/)?.[1]];
  element.querySelectorAll = selector => selector === '[data-battle-weapon]' ? weapons : selector === '[data-battle-touch] button' ? [nodes.attack,nodes.grenade,nodes.jump] : selector.includes('data-battle-action') ? [nodes.auto,nodes.duel] : [];
  host.devicePixelRatio = 1; host.performance = { now: () => now };
  host.getComputedStyle = () => ({ visibility: 'visible', getPropertyValue: () => '#123456' });
  host.requestAnimationFrame = fn => { const id = ++sequence; frames.set(id, fn); return id; };
  host.cancelAnimationFrame = id => frames.delete(id);
  host.setTimeout = fn => { const id = ++sequence; timers.set(id, fn); return id; };
  host.clearTimeout = id => timers.delete(id);
  const motion = new Node(); motion.matches = reduced; host.matchMedia = () => motion;
  const context = new Proxy({}, { get(target, name) { return name in target ? target[name] : () => {}; } });
  nodes.canvas.getContext = () => canvasAvailable ? context : null;
  class Observer {
    constructor(fn) { this.fn = fn; this.disconnected = false; observers.push(this); }
    observe() {}
    disconnect() { this.disconnected = true; }
  }
  host.ResizeObserver = Observer; host.IntersectionObserver = Observer; host.MutationObserver = Observer;
  const view = { dayKey: '10/03/2026', currentDay, weapon: 'pistol', enabled: true, hpPct: 63, defeated: false, monsterMarkup: '<svg data-species="existing"></svg>' };
  const toggles = [];
  const callbacks = { onToggleSound: () => toggles.push(true), onSound: kind => sounds.push(kind), onWeaponChange: id => changes.push(id), onPause: () => pauses.push(true) };
  const mount = () => syncBattle(element, view, callbacks);
  const click = name => element.dispatch('click', { target: nodes[name] });
  const begin = () => { view.workMode = 'break'; mount(); click('duel'); click('start'); };
  const practice = () => { now += 200; element.dispatch('click', { target: nodes.hero }); };
  const tick = (milliseconds = 40) => { now += milliseconds; const current = [...frames.values()]; frames.clear(); current.forEach(fn => fn(now)); };
  const event = (extra = {}) => ({ dayKey: view.dayKey, amountText: '$1.40 · ≈ L 36.40', xp: 3, ...extra });
  return { element, doc, host, nodes, motion, weapons, view, mount, practice, tick, event, frames, timers, observers, sounds, changes, pauses, toggles,
    click, begin, listenerCount: () => [element, doc, host, motion, ...Object.values(nodes)].reduce((count, node) => count + [...node.listeners.values()].reduce((n, list) => n+list.size, 0), 0) };
}

test('weapon selection normalizes only cosmetic catalog ids; imports work without DOM', () => {
  assert.equal(BATTLE_WEAPONS.length, 10);
  assert.deepEqual(BATTLE_WEAPONS.map(w => w.key), ['1','2','3','4','5','6','7','8','9','0']);
  for (const w of BATTLE_WEAPONS) { assert.equal(normalizeBattleWeapon(w.id), w.id); assert.ok(Object.isFrozen(w)); }
  for (const value of ['grenade','invalid',null,{},'__proto__']) assert.equal(normalizeBattleWeapon(value), 'pistol');
  stopBattle(); assert.equal(playBattleCall({ dayKey: 'x' }), false);
  const markup = battleMarkup();
  assert.equal((markup.match(/<option value=/g) || []).length, 10);
  assert.ok(markup.indexOf('data-battle-health-slot') > markup.indexOf('data-battle-canvas'));
  assert.ok(markup.indexOf('data-battle-health-slot') < markup.indexOf('game-battle-controls'));
  assert.match(markup, /aria-live="polite"/);
  assert.doesNotMatch(markup, /data-battle-action="(?:simulate|reset|special)"/);
  assert.doesNotMatch(markup, /data-battle-(?:charge|auto-hud|round)/);
  const section = parseFragment(markup).childNodes.find(node => node.tagName === 'section');
  assert.ok(section.childNodes.some(node => node.attrs?.some(attr => attr.name === 'data-battle-motion-note')),
    'The reduced-motion explanation must remain outside the collapsed weapon picker');
  const collection = section.childNodes.find(node => node.attrs?.some(attr => attr.name === 'data-battle-collection'));
  assert.ok(collection.attrs.some(attr => attr.name === 'hidden'));
  const bars = [];
  function visit(node, inHiddenCollection = false) {
    inHiddenCollection ||= node === collection;
    if (node.attrs?.some(attr => attr.name === 'role' && attr.value === 'progressbar')) bars.push(inHiddenCollection);
    for (const child of node.childNodes || []) visit(child, inHiddenCollection);
  }
  visit(section); assert.deepEqual(bars, [true], 'Only the optional duel owns a secondary progress bar, inside the hidden collection');
});

test('large imports remain one representation and excess events coalesce at six rows', () => {
  const queue = createBattleQueue(), input = Object.freeze({ dayKey: 'd', count: 5000, amountText: '$7000 · ≈ L 182000', xp: 150, critical: true });
  queue.push(input); assert.equal(queue.size, 1); assert.deepEqual(queue.shift(), input);
  for (let i = 0; i < 100; i++) queue.push({ dayKey: 'd', count: 1, xp: 2, amountText: '$1', critical: i === 99 });
  assert.equal(queue.size, 6);
  const result = []; while (queue.size) result.push(queue.shift());
  assert.equal(result.reduce((sum, event) => sum+event.count, 0), 100);
  assert.equal(result.reduce((sum, event) => sum+event.xp, 0), 200);
  assert.equal(result.at(-1).amountText, ''); assert.equal(result.at(-1).critical, true);
  queue.push({ dayKey: 'd', xp: -5, count: NaN, amountText: 'a'.repeat(1000) });
  const safe = queue.shift(); assert.equal(safe.xp, 0); assert.equal(safe.count, 1); assert.equal(safe.amountText.length, 160);
  queue.push(input); queue.clear(); assert.equal(queue.size, 0);
  for (let i=0;i<10;i++) queue.push({ dayKey: 'd', specialCount: 2, count: 6 });
  let specialCount=0; while (queue.size) specialCount += queue.shift().specialCount || 0;
  assert.equal(specialCount, 20, 'Queue coalescing preserves every batched special threshold');
});

test('the automatic shot runs briefly and releases its animation loop after impact', () => {
  const h = harness();
  try {
    h.mount(); assert.equal(h.frames.size, 0);
    assert.equal(playBattleCall(h.event()), true); assert.equal(h.frames.size, 1);
    for(let i=0;i<120;i++) h.tick();
    assert.ok(h.sounds.includes('hit'));
    assert.equal(h.frames.size, 0); assert.equal(h.nodes.banner.hidden, true);
    assert.equal(h.element.dataset.battleHp, '63');
  } finally { stopBattle(); }
});

test('automatic default stays still and manual inputs never alter real HP or call data', () => {
  const h = harness({ reduced: true });
  try {
    h.mount(); const snapshot = JSON.stringify(h.view);
    h.practice(); h.click('attack'); h.click('grenade'); h.click('duel');
    assert.equal(h.frames.size, 0); assert.equal(h.sounds.length, 0);
    assert.equal(h.element.dataset.battleMode, 'auto'); assert.equal(h.nodes['duel-hud'].hidden, true);
    assert.equal(JSON.stringify(h.view), snapshot); assert.equal(h.element.dataset.battleHp, '63');
    assert.equal(playBattleCall(h.event({ count: 800, xp: 150, critical: true })), true);
    assert.match(h.nodes.banner.textContent, /crítico|critical/i);
    assert.ok(h.sounds.includes('critical')); assert.equal(h.frames.size, 0);
    h.doc.hidden = true; h.doc.dispatch('visibilitychange'); assert.equal(h.timers.size, 0);
    assert.equal(playBattleCall(h.event()), false);
  } finally { stopBattle(); }
  assert.equal(h.listenerCount(), 0); assert.ok(h.observers.every(observer => observer.disconnected));
});

test('canvas fallback presents automatic results and disables the optional duel', () => {
  const h = harness({ canvasAvailable: false });
  try {
    h.view.workMode = 'off'; h.mount();
    assert.equal(h.element.dataset.battleCanvas, 'fallback'); assert.equal(h.frames.size, 0);
    h.click('duel'); assert.equal(h.element.dataset.battleMode, 'auto');
    assert.equal(playBattleCall(h.event({ dayKey: 'wrong' })), false); assert.equal(h.sounds.length, 0);
    assert.equal(playBattleCall(h.event()), true); assert.match(h.nodes.banner.textContent, /Llamada|Call/);
    h.element.dispatch('keydown', { key: '0', target: h.nodes.stage }); assert.deepEqual(h.changes, ['wand']);
  } finally { stopBattle(); }
  assert.equal(h.listenerCount(), 0); assert.equal(h.timers.size, 0);
});

test('work calls interrupt the duel immediately and returning to break requires explicit resume', () => {
  const h = harness();
  try {
    h.begin(); h.practice(); for(let i=0;i<20;i++) h.tick();
    const time = h.nodes.time.textContent, points = h.nodes.points.textContent, view = JSON.stringify(h.view);
    assert.equal(h.element.dataset.duelStatus, 'running'); assert.equal(h.frames.size, 1);
    h.view.workMode = 'call'; h.mount();
    assert.equal(h.element.dataset.battleMode, 'auto'); assert.equal(h.frames.size, 0);
    assert.equal(h.element.dataset.duelStatus, 'paused'); assert.equal(h.timers.size, 0);
    const sounds = h.sounds.length;
    h.practice(); h.click('attack'); h.click('grenade'); h.click('jump'); h.click('duel');
    h.element.dispatch('keydown', { key: '0', target: h.nodes.stage });
    assert.equal(playBattleCall(h.event()), true); h.tick(5000);
    assert.equal(h.sounds.length, sounds); assert.equal(h.nodes.time.textContent, time);
    assert.equal(h.nodes.points.textContent, points); assert.equal(h.element.dataset.battleHp, '63');
    h.view.workMode = 'break'; h.mount(); h.click('duel');
    assert.equal(h.frames.size, 0); assert.equal(h.element.dataset.duelStatus, 'paused');
    h.click('start'); assert.equal(h.frames.size, 1); assert.equal(h.element.dataset.duelStatus, 'running');
    assert.equal(JSON.stringify(h.view), view);
    h.doc.hidden = true; h.doc.dispatch('visibilitychange'); assert.equal(h.frames.size, 0);
    h.doc.hidden = false; h.doc.dispatch('visibilitychange'); assert.equal(h.frames.size, 0);
    assert.equal(h.element.dataset.duelStatus, 'paused');
  } finally { stopBattle(); }
  assert.equal(h.listenerCount(), 0);
});

test('visibility/date changes cancel pending visual calls and unmount releases animation observers', () => {
  const h = harness();
  try {
    h.mount(); assert.equal(h.frames.size, 0);
    assert.equal(playBattleCall(h.event()), true); h.tick(); assert.ok(h.sounds.includes('shoot-pistol'));
    h.view.dayKey = '10/04/2026'; h.mount();
    for (let i=0;i<35;i++) h.tick(); assert.equal(h.sounds.filter(kind => kind === 'hit').length, 0);
    assert.equal(playBattleCall(h.event()), true);
    const intersection = h.observers[1]; intersection.fn([{ isIntersecting: false }]);
    assert.equal(h.frames.size, 0); assert.equal(h.element.dataset.battlePaused, 'true'); assert.equal(playBattleCall(h.event()), false);
    const pauseCount = h.pauses.length; h.doc.dispatch('visibilitychange'); intersection.fn([{ isIntersecting: false }]); assert.equal(h.pauses.length, pauseCount);
    intersection.fn([{ isIntersecting: true }]); assert.equal(h.frames.size, 0);
    for (let i=0;i<35;i++) h.tick(); assert.equal(h.sounds.filter(kind => kind === 'hit').length, 0);
    h.element.isConnected = false; h.observers[2].fn();
    assert.equal(h.frames.size, 0); assert.equal(h.listenerCount(), 0); assert.ok(h.observers.every(observer => observer.disconnected));
    assert.equal(playBattleCall(h.event()), false);
  } finally { stopBattle(); }
});

test('switching reduced motion or disabling an active scene cancels every pending effect', () => {
  const h = harness();
  try {
    h.mount(); playBattleCall(h.event()); h.tick();
    assert.equal(h.frames.size, 1);
    h.motion.matches = true; h.motion.dispatch('change');
    assert.equal(h.frames.size, 0); assert.equal(h.nodes['motion-note'].hidden, false);
    assert.equal(h.sounds.filter(kind => kind === 'hit').length, 0);
    h.practice(); assert.ok(!h.sounds.includes('practice-hit'));
    syncBattle(h.element, { ...h.view, enabled: false });
    const soundCount = h.sounds.length;
    h.practice(); h.element.dispatch('keydown', { key: '0', target: h.nodes.stage });
    assert.equal(h.sounds.length, soundCount); assert.equal(h.changes.length, 0);
    assert.equal(h.listenerCount(), 0); assert.equal(h.timers.size, 0); assert.equal(playBattleCall(h.event()), false);
  } finally { stopBattle(); }
});

test('same-day edits, deletions and goal changes cancel pending hits while additions preserve the batch', () => {
  const h = harness();
  const waitForImpact = () => { for (let i=0;i<35;i++) h.tick(); };
  const hitCount = () => h.sounds.filter(kind => kind === 'hit').length;
  try {
    h.view.callSignatures = { call1: JSON.stringify({ pay: 1.4, start: '10:00', end: '10:10' }) };
    h.view.goalUsd = 28; h.mount();
    assert.equal(h.pauses.length, 0);
    playBattleCall(h.event()); h.tick();
    h.view.callSignatures.call2 = JSON.stringify({ pay: 2.8, start: '10:10', end: '10:30' });
    h.mount();
    assert.equal(h.pauses.length, 0);
    playBattleCall(h.event({ amountText: '$2.80 · ≈ L 72.80' }));
    waitForImpact(); assert.equal(hitCount(), 2); assert.match(h.nodes.banner.textContent, /Llamada|Call/);

    playBattleCall(h.event()); h.tick();
    h.view.callSignatures.call1 = JSON.stringify({ pay: 1.96, start: '10:00', end: '10:14' });
    h.mount(); waitForImpact();
    assert.equal(hitCount(), 2); assert.equal(h.pauses.length, 1); assert.equal(h.nodes.banner.hidden, true);

    playBattleCall(h.event()); h.tick();
    delete h.view.callSignatures.call1;
    h.mount(); waitForImpact();
    assert.equal(hitCount(), 2); assert.equal(h.pauses.length, 2); assert.equal(h.nodes.banner.hidden, true);

    playBattleCall(h.event()); h.tick();
    h.view.goalUsd = 40; h.mount(); waitForImpact();
    assert.equal(hitCount(), 2); assert.equal(h.pauses.length, 3);
    assert.equal(h.view.goalUsd, 40); assert.equal(Object.keys(h.view.callSignatures).length, 1);
  } finally { stopBattle(); }
});

test('idle breathing never attacks and pauses for live calls, hidden scenes and victories', () => {
  const h = harness({ currentDay: true });
  try {
    h.mount(); const original = JSON.stringify(h.view);
    assert.equal(h.frames.size, 1);
    for (let i = 0; i < 1000; i++) h.tick();
    assert.equal(h.element.dataset.battleSpecials, '0');
    assert.equal(h.element.dataset.battleHp, '63'); assert.equal(JSON.stringify(h.view), original);
    assert.equal(h.sounds.length, 0); assert.equal(h.nodes.banner.textContent, '');
    h.click('auto-pause'); assert.equal(h.frames.size, 0);
    h.mount(); assert.equal(h.frames.size, 0);
    h.click('auto-pause'); assert.equal(h.frames.size, 1);
    h.doc.hidden = true; h.doc.dispatch('visibilitychange'); assert.equal(h.frames.size, 0);
    h.doc.hidden = false; h.doc.dispatch('visibilitychange'); assert.equal(h.frames.size, 1);
    h.view.workMode = 'call'; h.mount(); assert.equal(h.frames.size, 0); assert.equal(h.nodes['call-overlay'].hidden, false);
    const sounds = h.sounds.length;
    playBattleCall(h.event({ count: 3 }));
    for (let i = 0; i < 40; i++) h.tick();
    assert.equal(h.frames.size, 0); assert.equal(h.sounds.length, sounds);
    h.view.workMode = 'break'; h.mount(); assert.equal(h.frames.size, 1);
    for (let i = 0; i < 40; i++) h.tick();
    assert.equal(h.sounds.length, sounds, 'Leaving a live call must not replay suspended attacks');
    h.view.defeated = true; h.mount(); assert.equal(h.frames.size, 0);
    h.view.defeated = false; h.view.currentDay = false; h.mount(); assert.equal(h.frames.size, 0);
  } finally { stopBattle(); }
  assert.equal(h.listenerCount(), 0); assert.ok(h.observers.every(observer => observer.disconnected));
});

test('every third eligible represented call triggers one automatic special including batched counts', () => {
  const h = harness({ currentDay: true, reduced: true });
  try {
    h.mount(); const original = JSON.stringify(h.view);
    playBattleCall(h.event({ count: 2 })); assert.equal(h.element.dataset.battleSpecials, '0');
    assert.doesNotMatch(h.nodes.banner.textContent, /especial|special/i);
    playBattleCall(h.event()); assert.equal(h.element.dataset.battleSpecials, '1');
    assert.match(h.nodes.banner.textContent, /especial|special/i);
    playBattleCall(h.event({ count: 8 })); assert.equal(h.element.dataset.battleSpecials, '3');
    playBattleCall(h.event()); assert.equal(h.element.dataset.battleSpecials, '4');
    assert.equal(playBattleCall(h.event({ dayKey: 'wrong', count: 9 })), false);
    assert.equal(h.element.dataset.battleSpecials, '4');
    assert.equal(h.frames.size, 0); assert.equal(h.element.dataset.battleHp, '63');
    assert.equal(JSON.stringify(h.view), original);
    h.view.currentDay = false; h.mount(); playBattleCall(h.event({ count: 3 }));
    assert.equal(h.element.dataset.battleSpecials, '4');
  } finally { stopBattle(); }
});

test('compact collection stays collapsed across sync until toggled, with real root-owned slots', () => {
  const h = harness();
  try {
    h.view.collectionMarkup = '<strong>Level 3 · real collection</strong>';
    h.nodes.victory.innerHTML = '<button data-game-action="open-daily-chest">Open</button>';
    h.mount(); assert.equal(h.nodes.collection.hidden, true);
    assert.equal(h.nodes['collection-toggle'].attributes['aria-expanded'], 'false');
    h.click('collection-toggle'); h.mount();
    assert.equal(h.nodes.collection.hidden, false); assert.equal(h.element.dataset.battleCollectionOpen, 'true');
    assert.equal(h.nodes['collection-summary'].innerHTML, h.view.collectionMarkup);
    assert.match(h.nodes.victory.innerHTML, /open-daily-chest/);
    h.click('sound'); assert.equal(h.toggles.length, 1);
    h.view.soundEnabled = false; h.mount(); playBattleCall(h.event());
    for (let i=0;i<40;i++) h.tick(); assert.equal(h.sounds.length, 0);
    h.click('collection-toggle'); assert.equal(h.nodes.collection.hidden, true);
  } finally { stopBattle(); }
});

test('winning shot precedes cofre and changed dates never reveal a stale cofre', () => {
  const h = harness();
  try {
    h.mount(); h.view.defeated = true; h.mount();
    playBattleCall(h.event()); assert.equal(h.nodes.victory.hidden, true);
    h.tick(); assert.ok(h.sounds.includes('shoot-pistol')); assert.equal(h.nodes.victory.hidden, true);
    for (let i=0;i<30;i++) h.tick(); assert.equal(h.nodes.victory.hidden, false);
    playBattleCall(h.event()); h.tick();
    h.view.dayKey = '10/04/2026'; h.view.defeated = false; h.mount();
    for (let i=0;i<100;i++) h.tick(); assert.equal(h.nodes.victory.hidden, true);
  } finally { stopBattle(); }
});

test('paused call feedback stays static across sync and reduced feedback returns to real goal status', () => {
  const h = harness({ currentDay: true });
  try {
    h.view.goalStatus = 'Current real goal'; h.mount(); h.click('auto-pause');
    playBattleCall(h.event({ count: 3 })); h.mount();
    assert.equal(h.frames.size, 0, 'Sync must not restart paused effects');
    assert.equal(h.nodes.monster.dataset.battleHit, undefined);
    assert.match(h.nodes.feed.textContent, /especial|special/i);
    for (const fn of h.timers.values()) fn(); h.timers.clear();
    assert.match(h.nodes.feed.textContent, /Paused|En pausa/);
    h.click('auto-pause'); h.motion.matches = true; h.motion.dispatch('change');
    playBattleCall(h.event());
    for (const fn of h.timers.values()) fn(); h.timers.clear();
    assert.equal(h.nodes.feed.textContent, 'Current real goal');
    assert.equal(h.frames.size, 0);
  } finally { stopBattle(); }
});
