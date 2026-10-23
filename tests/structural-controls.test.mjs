import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parse } from 'acorn';

const source = fs.readFileSync(new URL('../js/settings.js', import.meta.url), 'utf8');
const node = parse(source, { ecmaVersion: 'latest', sourceType: 'module' }).body
  .map(item => item.declaration || item).find(item => item.id?.name === 'finishOnboarding');
const onboarding = source.slice(node.start, node.end);
const copy = value => JSON.parse(JSON.stringify(value));

for (const initial of [{ theme: 'dark' }, { userName: 'Anterior', userEmoji: '🌱', onboarded: false, theme: 'light' }]) {
  test(`rejected onboarding preserves ${Object.hasOwn(initial, 'userName') ? 'existing' : 'absent'} profile fields through an unrelated save, then permits retry`, () => {
    let accepted = false, disk = copy(initial), closed = 0, rendered = 0;
    const fields = { onboardingNameInput: { value: ' Nuevo ' }, onboardingEmojiInput: { value: ' ⭐ ' } };
    const h = vm.createContext({ settings: copy(initial), document: { getElementById: id => fields[id] },
      saveSettingsOnly: () => { if (accepted) disk = copy(h.settings); return accepted; },
      closeModal: () => { closed++; }, render: () => { rendered++; } });
    vm.runInContext(onboarding, h);
    assert.equal(h.finishOnboarding(), false);
    assert.deepEqual(copy(h.settings), initial);
    assert.deepEqual(disk, initial);
    assert.equal(closed, 0); assert.equal(rendered, 0);
    assert.equal(fields.onboardingNameInput.value, ' Nuevo ');
    accepted = true;
    h.settings.theme = 'auto'; h.saveSettingsOnly();
    assert.deepEqual(disk, { ...initial, theme: 'auto' });
    h.finishOnboarding();
    assert.deepEqual(disk, { ...initial, theme: 'auto', userName: 'Nuevo', userEmoji: '⭐', onboarded: true });
    assert.equal(closed, 1); assert.equal(rendered, 1);
  });
}

test('onboarding rollback never overwrites a replacement settings owner', () => {
  const replacement = { userName: 'Otra cuenta', onboarded: true };
  const h = vm.createContext({ settings: {}, document: { getElementById: () => ({ value: 'Borrador' }) },
    saveSettingsOnly: () => { h.settings = replacement; return false; },
    closeModal: () => assert.fail('Rejected onboarding must stay open'), render: () => assert.fail('Rejected onboarding must keep the draft') });
  vm.runInContext(onboarding, h);
  assert.equal(h.finishOnboarding(), false);
  assert.equal(h.settings, replacement);
  assert.deepEqual(replacement, { userName: 'Otra cuenta', onboarded: true });
});

function declaration(file, name) {
  const text = fs.readFileSync(new URL(`../js/${file}.js`, import.meta.url), 'utf8');
  const item = parse(text, { ecmaVersion: 'latest', sourceType: 'module' }).body
    .map(item => item.declaration || item).find(item => item.id?.name === name);
  assert.ok(item, name);
  return text.slice(item.start, item.end);
}

for (const previous of [undefined, true]) {
  test(`rejected streak setting preserves ${previous === undefined ? 'default' : 'explicit'} behavior without updating rewards`, () => {
    let accepted = false, rewards = 0, disk;
    const initial = previous === undefined ? {} : { streakSkipOffDays: previous };
    const h = vm.createContext({ settings: copy(initial), saveSettingsOnly: () => { if (accepted) disk = copy(h.settings); return accepted; },
      render() {}, onGameDayMetadataChanged: () => { rewards++; }, todayCallDateKey: () => 'today' });
    vm.runInContext(declaration('reports', 'updateStreakSkipOffSetting'), h);
    assert.equal(h.updateStreakSkipOffSetting(false), false);
    assert.deepEqual(copy(h.settings), initial); assert.equal(rewards, 0);
    accepted = true; h.saveSettingsOnly(); assert.deepEqual(disk, initial);
    h.updateStreakSkipOffSetting(false);
    assert.equal(disk.streakSkipOffDays, false); assert.equal(rewards, 1);
  });
}

test('streak rollback never restores the previous account over a replacement owner', () => {
  const replacement = { streakSkipOffDays: false };
  const h = vm.createContext({ settings: { streakSkipOffDays: true },
    saveSettingsOnly: () => { h.settings = replacement; return false; }, render() {},
    onGameDayMetadataChanged: () => assert.fail('Rejected setting must not change rewards') });
  vm.runInContext(declaration('reports', 'updateStreakSkipOffSetting'), h);
  assert.equal(h.updateStreakSkipOffSetting(false), false);
  assert.equal(h.settings, replacement); assert.equal(replacement.streakSkipOffDays, false);
});

const gameText = fs.readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
const gameAst = parse(gameText, { ecmaVersion: 'latest', sourceType: 'module' });
function findNode(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (predicate(node)) return node;
  for (const value of Object.values(node)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      const result = findNode(item, predicate); if (result) return result;
    }
  }
  return null;
}
function gameHandler(name) {
  const callback = ['onWeaponChange', 'onToggleSound'].includes(name)
    ? findNode(gameAst, node => node.type === 'Property' && node.key.name === name)?.value
    : findNode(gameAst, node => node.type === 'CallExpression' && node.callee.property?.name === 'addEventListener'
      && node.callee.object?.arguments?.[0]?.value === name)?.arguments[1];
  assert.ok(callback, name);
  return gameText.slice(callback.start, callback.end);
}

for (const [name, key, value] of [['onWeaponChange', 'weapon', 'rifle'], ['onToggleSound', 'soundEnabled', false],
  ['sidebarGameSoundInput', 'soundEnabled', false], ['gameSoundVolumeInput', 'soundVolume', 90]]) {
  test(`${name} restores rejected preferences, visible controls and audio before unrelated saves, and permits retry`, () => {
    let accepted = false, disk;
    const initial = { game: { weapon: 'pistol', soundEnabled: true, soundVolume: 40 } };
    const input = { value: String(value), checked: value }, visible = {}, heard = [];
    const h = vm.createContext({ settings: copy(initial), lastArenaRenderKey: 'previous',
      ensureGameSettings: () => h.settings.game, normalizeBattleWeapon: value => value,
      saveSettingsOnly: () => { if (accepted) disk = copy(h.settings); return accepted; },
      syncGameAudio: () => heard.push(copy(h.settings.game)),
      renderSettingsProfile: () => { input.checked = h.settings.game.soundEnabled; visible.volume = h.settings.game.soundVolume; },
      renderArena: () => { visible.weapon = h.settings.game.weapon; visible.sound = h.settings.game.soundEnabled; },
      renderGame: () => { h.renderSettingsProfile(); h.renderArena(); } });
    vm.runInContext(`${declaration('game', 'saveGamePreference')}\nconst handler = ${gameHandler(name)};`, h);
    const invoke = () => vm.runInContext(name === 'onWeaponChange' ? `handler('${value}')` : 'handler({target:input})', Object.assign(h, { input }));
    invoke();
    assert.deepEqual(copy(h.settings), initial);
    if (name === 'onWeaponChange') { assert.equal(visible.weapon, 'pistol'); assert.equal(h.lastArenaRenderKey, ''); }
    else assert.deepEqual(heard.at(-1), initial.game);
    if (name === 'gameSoundVolumeInput') assert.equal(Number(input.value), 40);
    if (name === 'sidebarGameSoundInput') assert.equal(input.checked, true);
    accepted = true; h.saveSettingsOnly(); assert.deepEqual(disk, initial);
    input.value = String(value); input.checked = value; invoke();
    assert.equal(disk.game[key], value);
  });
}

for (const key of ['weapon', 'soundEnabled', 'soundVolume']) test(`game ${key} rollback respects replacement settings and game owners`, () => {
  for (const replaceSettings of [false, true]) {
    const replacement = { weapon: 'other', soundEnabled: false, soundVolume: 5 };
    const h = vm.createContext({ settings: { game: { weapon: 'pistol', soundEnabled: true, soundVolume: 40 } },
      ensureGameSettings: () => h.settings.game, saveSettingsOnly: () => {
        if (replaceSettings) h.settings = { game: replacement }; else h.settings.game = replacement;
        return false;
      } });
    vm.runInContext(declaration('game', 'saveGamePreference'), h);
    assert.equal(h.saveGamePreference(key, 'draft'), false);
    assert.equal(h.settings.game, replacement);
    assert.deepEqual(replacement, { weapon: 'other', soundEnabled: false, soundVolume: 5 });
  }
});

const mainText = fs.readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');
const mainAst = parse(mainText, { ecmaVersion: 'latest', sourceType: 'module' });
const weekListener = findNode(mainAst, node => node.type === 'CallExpression' && node.callee.property?.name === 'addEventListener'
  && node.callee.object?.arguments?.[0]?.value === 'scheduleWeekCustomInput').arguments[1];
const weekHandler = mainText.slice(weekListener.start, weekListener.end);

function scheduleWeekHarness({ enabled = true, overrides, beforeWrite = () => {} } = {}) {
  const template = { mon: { start: '08:00', end: '16:00', blocks: [] } };
  const settings = { weeklySchedule: template, historicalPlanning: { before: 'settings' },
    ...(overrides === undefined ? {} : { scheduleOverridesByWeek: copy(overrides) }) };
  const state = { historicalPlanning: { before: 'state' } }, input = { checked: enabled };
  let accepted = false, confirmation, writes = 0, rewards = 0, past = false, mutations = 0;
  let disk = copy({ settings, state });
  const persist = () => {
    writes++; beforeWrite(h);
    if (accepted) disk = copy({ settings: h.settings, state: h.state });
    return accepted;
  };
  const h = vm.createContext({ settings, state, scheduleWeekOffset: 0, scheduleViewMode: 'week',
    scheduleWeekIsPast: () => past, scheduleWeekHasCustom: offset => !!h.settings.scheduleOverridesByWeek?.[`week-${offset}`],
    scheduleWeekKeyForOffset: offset => `week-${offset}`, cloneWeeklyScheduleForOverride: () => copy(h.settings.weeklySchedule),
    snapshotHistoricalPlanning: () => { mutations++; h.settings.historicalPlanning.changed = 'settings'; h.state.historicalPlanning.changed = 'state'; },
    saveAll: persist, saveSettingsOnly: persist, canPersistLocalChanges: () => true,
    onGameDayMetadataChanged: () => { rewards++; }, todayCallDateKey: () => 'today', toast() {}, translateText: text => text, render() {},
    appConfirm: (_message, callback) => { confirmation = callback; },
    syncShiftModalFields: () => { input.checked = !!h.settings.scheduleOverridesByWeek?.[`week-${h.scheduleWeekOffset}`]; } });
  vm.runInContext(`${declaration('schedule', 'ensureScheduleWeekOverride')}\n${declaration('schedule', 'removeScheduleWeekOverride')}\nconst handler = ${weekHandler};`, h);
  return { h, input, invoke() { return vm.runInContext('handler({target:input})', Object.assign(h, { input })); },
    confirm: () => confirmation(), accept: () => { accepted = true; }, setPast: () => { past = true; },
    disk: () => disk, writes: () => writes, rewards: () => rewards, mutations: () => mutations };
}

for (const overrides of [undefined, {}]) test(`enabling a custom schedule week restores ${overrides === undefined ? 'absent' : 'empty'} overrides after a rejected snapshot and permits retry`, () => {
  const f = scheduleWeekHarness({ overrides }), before = copy({ settings: f.h.settings, state: f.h.state });
  assert.equal(f.invoke(), false);
  assert.deepEqual(copy({ settings: f.h.settings, state: f.h.state }), before);
  assert.deepEqual(f.disk(), before); assert.equal(f.input.checked, false); assert.equal(f.rewards(), 0);
  f.accept(); f.h.saveAll(); assert.deepEqual(f.disk(), before);
  f.input.checked = true; f.invoke();
  assert.deepEqual(copy(f.h.settings.scheduleOverridesByWeek['week-0']), before.settings.weeklySchedule);
  assert.deepEqual(f.disk().settings.scheduleOverridesByWeek['week-0'], before.settings.weeklySchedule);
  assert.equal(f.input.checked, true); assert.equal(f.rewards(), 1);
});

const customWeeks = { 'week-0': { mon: { start: '10:00', end: '18:00', blocks: [] } }, 'week-1': { mon: { off: true } } };
test('removing a custom week restores its plan and planning history after rejection, without applying rewards, then permits retry', () => {
  const f = scheduleWeekHarness({ enabled: false, overrides: customWeeks }), before = copy({ settings: f.h.settings, state: f.h.state });
  f.invoke(); assert.equal(f.input.checked, true); assert.equal(f.confirm(), false);
  assert.deepEqual(copy({ settings: f.h.settings, state: f.h.state }), before); assert.deepEqual(f.disk(), before);
  assert.equal(f.rewards(), 0); assert.equal(f.input.checked, true); assert.equal(f.mutations(), 1);
  f.accept(); f.h.saveAll(); assert.deepEqual(f.disk(), before);
  f.input.checked = false; f.invoke(); f.confirm();
  assert.equal(Object.hasOwn(f.disk().settings.scheduleOverridesByWeek, 'week-0'), false);
  assert.deepEqual(f.disk().settings.scheduleOverridesByWeek['week-1'], customWeeks['week-1']);
  assert.equal(f.disk().settings.historicalPlanning.changed, 'settings'); assert.equal(f.disk().state.historicalPlanning.changed, 'state');
  assert.equal(f.rewards(), 1); assert.equal(f.input.checked, false);
});

for (const replace of ['settings', 'state', 'both']) test(`custom week rollback respects a replacement ${replace} owner`, () => {
  const replacementSettings = { scheduleOverridesByWeek: { 'week-0': { owner: 'new' } } }, replacementState = { owner: 'new' };
  const f = scheduleWeekHarness({ enabled: false, overrides: customWeeks, beforeWrite: h => {
    if (replace !== 'state') h.settings = replacementSettings;
    if (replace !== 'settings') h.state = replacementState;
  } });
  const before = copy({ settings: f.h.settings, state: f.h.state });
  f.invoke(); assert.equal(f.confirm(), false);
  assert.deepEqual(copy(f.h.settings), replace === 'state' ? before.settings : replacementSettings);
  assert.deepEqual(copy(f.h.state), replace === 'settings' ? before.state : replacementState);
  assert.equal(f.rewards(), 0);
});

for (const change of ['week', 'view', 'settings', 'state', 'schedule', 'past']) test(`custom week removal ignores an old confirmation after ${change} changes`, () => {
  const f = scheduleWeekHarness({ enabled: false, overrides: customWeeks });
  f.accept(); f.invoke();
  if (change === 'week') f.h.scheduleWeekOffset = 1;
  if (change === 'view') f.h.scheduleViewMode = 'template';
  if (change === 'settings') f.h.settings = copy(f.h.settings);
  if (change === 'state') f.h.state = copy(f.h.state);
  if (change === 'schedule') f.h.settings.scheduleOverridesByWeek['week-0'].mon.start = '11:00';
  if (change === 'past') f.setPast();
  const before = copy({ settings: f.h.settings, state: f.h.state });
  assert.equal(f.confirm(), false);
  assert.deepEqual(copy({ settings: f.h.settings, state: f.h.state }), before);
  assert.equal(f.writes(), 0); assert.equal(f.rewards(), 0); assert.equal(f.mutations(), 0);
});
