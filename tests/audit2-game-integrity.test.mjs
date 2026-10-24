import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parse } from 'acorn';
import { setLanguage, translateText } from '../js/i18n.js';
import { setAppSettings } from '../js/app-context.js';
import { reinforcementText } from '../js/reinforcement-feedback.js';
import { surpriseDecision } from '../js/reinforcement-rules.js';

const source = fs.readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
const declarations = parse(source, { ecmaVersion: 'latest', sourceType: 'module' }).body
  .map(node => node.declaration || node);
function load(h, ...names) {
  for (const name of names) {
    const node = declarations.find(node => node.id?.name === name);
    assert.ok(node, name);
    vm.runInContext(source.slice(node.start, node.end), h);
  }
}
const copy = value => JSON.parse(JSON.stringify(value));
function progress() {
  return { totalXp: 300, level: 3, accessories: ['Visor violeta'], ledger: {},
    equipment: { face: null }, chest: { pending: true, sealedOn: '10/10/2026' },
    cycleReward: { pending: true, cycleKey: '10/10/2026',
      options: [{ id: 'cycle-xp', type: 'xp', amount: 35, label: '35 XP' }] } };
}
function harness() {
  const h = vm.createContext({ state: { game: progress() }, settings: { game: { enabled: true } },
    gameEnabled: () => true, ensureGameState() {}, ensureGameSettings: () => h.settings.game,
    translateText: text => text, translateStoredText: text => text, ui: (parts, ...values) =>
      parts.map((part, index) => part + (values[index] ?? '')).join(''),
    levelForXp: xp => Math.floor(xp / 150) + 1,
    chestReward: () => ({ type: 'xp', amount: 25, rarity: 'common', label: '25 XP' }),
    lootRarityLabel: String, queueGameToast() {}, renderGame() {}, renderHeader() {},
    announceGameStatus() {}, playGameSound() {}, document: { getElementById: () => null },
    ACCESSORY_BY_ID: { visor: { slot: 'face', label: 'Visor violeta', unlockLevel: 1 } },
    ACCESSORY_BY_LABEL: {}, saveStateOnly: () => false, saveSettingsOnly: () => false,
    appConfirm: (message, callback) => { h.confirm = callback; },
    normalizeReinforcementState: value => value || {},
    createDefaultGameState: () => ({ totalXp: 0, ledger: {}, accessories: [] }), toast() {} });
  return h;
}

for (const [name, invoke] of [
  ['chooseCycleReward', h => h.chooseCycleReward('cycle-xp')],
  ['grantChestReward', h => h.grantChestReward('10/10/2026', { showModal: false })],
  ['equipAccessory', h => h.equipAccessory('visor')],
  ['openPendingChest', h => { h.state.game.ledger['chest:10/10/2026'] = true;
    return h.openPendingChest('10/11/2026'); }],
]) {
  test(`${name} restores a rejected request and permits retry`, () => {
    const h = harness(); load(h, name);
    if (name === 'openPendingChest') h.state.game.ledger['chest:10/10/2026'] = true;
    const before = copy(h.state.game);
    assert.equal(invoke(h), false);
    assert.deepEqual(copy(h.state.game), before);
    h.saveStateOnly = () => true;
    assert.equal(invoke(h), true);
  });
  for (const replaceOwner of [false, true]) {
    test(`${name} never rolls rejected changes into replacement ${replaceOwner ? 'state' : 'game'}`, () => {
      const h = harness(); load(h, name);
      const replacement = { ...progress(), totalXp: 900, level: 8, accessories: [],
        chest: { pending: false, sealedOn: null },
        equipment: { face: 'Other' }, ledger: { 'chest:10/10/2026': { preserved: true },
          'cycle-reward:10/10/2026': { preserved: true } } };
      const before = copy(replacement);
      h.saveStateOnly = () => {
        if (replaceOwner) h.state = { game: replacement }; else h.state.game = replacement;
        return false;
      };
      assert.equal(invoke(h), false);
      assert.equal(h.state.game, replacement);
      assert.deepEqual(copy(replacement), before);
    });
  }
}

for (const replaceOwner of [false, true]) {
  test(`Logros enable rollback respects replacement ${replaceOwner ? 'settings' : 'game settings'}`, () => {
    const h = harness(); load(h, 'saveGamePreference', 'setGameEnabled');
    const replacement = { enabled: false };
    h.saveSettingsOnly = () => {
      if (replaceOwner) h.settings = { game: replacement }; else h.settings.game = replacement;
      return false;
    };
    assert.equal(h.setGameEnabled(false), false);
    assert.deepEqual(replacement, { enabled: false });
  });
}

for (const change of ['state', 'settings', 'new progress']) {
  test(`reset confirmation rejects stale ${change}`, () => {
    const h = harness(); load(h, 'resetGameProgress');
    h.resetGameProgress();
    if (change === 'state') h.state = { game: { ...progress(), totalXp: 900 } };
    if (change === 'settings') h.settings = { game: { enabled: false } };
    if (change === 'new progress') h.state.game.totalXp += 35;
    const before = copy(h.state.game);
    let writes = 0; h.saveStateOnly = () => { writes++; return true; };
    assert.equal(h.confirm(), false);
    assert.deepEqual(copy(h.state.game), before);
    assert.equal(writes, 0);
  });
}

for (const replaceOwner of [false, true]) {
  test(`reset rejection respects replacement ${replaceOwner ? 'state' : 'game'}`, () => {
    const h = harness(); load(h, 'resetGameProgress');
    h.resetGameProgress();
    const replacement = { ...progress(), totalXp: 900 };
    const before = copy(replacement);
    h.saveStateOnly = () => {
      if (replaceOwner) h.state = { game: replacement }; else h.state.game = replacement;
      return false;
    };
    assert.equal(h.confirm(), false);
    assert.equal(h.state.game, replacement);
    assert.deepEqual(copy(replacement), before);
  });
}

test('reset rejection restores progress; a fresh confirmation succeeds once and preserves personal rewards', () => {
  const h = harness(); load(h, 'resetGameProgress');
  h.state.game.reinforcement = { pendingRewards: [{ id: 'tea' }] };
  const before = copy(h.state.game);
  h.resetGameProgress(); assert.equal(h.confirm(), false);
  assert.deepEqual(copy(h.state.game), before);
  h.resetGameProgress();
  let writes = 0; h.saveStateOnly = () => { writes++; return true; };
  h.confirm();
  assert.equal(h.state.game.totalXp, 0);
  assert.deepEqual(copy(h.state.game.reinforcement), before.reinforcement);
  h.state.game.totalXp = 25;
  assert.equal(h.confirm(), false);
  assert.equal(h.state.game.totalXp, 25);
  assert.equal(writes, 1);
});

test('a cycle cosmetic acquired from another reward cannot consume the pending cycle choice', () => {
  const h = harness(); load(h, 'chooseCycleReward', 'renderCycleBosses');
  h.state.game.cycleReward.options.push({ id: 'cycle-accessory', type: 'accessory', amount: 0,
    accessory: 'Visor violeta', label: 'Visor violeta' });
  const before = copy(h.state.game);
  let writes = 0; h.saveStateOnly = () => { writes++; return true; };
  assert.equal(h.chooseCycleReward('cycle-accessory'), false);
  assert.deepEqual(copy(h.state.game), before);
  assert.equal(writes, 0);
  const choice = {};
  const root = { dataset: {}, querySelector: selector => selector === '[data-game-dynamic="cycle-choice"]' ? choice : null };
  h.document = { getElementById: id => id === 'gameCycleBoss' ? root : null, querySelector: () => null };
  h.cycleBossSnapshot = () => ({ cycle: {}, pct: 100, hp: 0 });
  h.todayCallDateKey = () => '10/10/2026'; h.formatCallDayLabel = String; h.escapeHtml = String;
  h.renderCycleBosses();
  assert.match(choice.innerHTML, /data-cycle-reward="cycle-xp"/);
  assert.doesNotMatch(choice.innerHTML, /data-cycle-reward="cycle-accessory"/);
  assert.equal(h.chooseCycleReward('cycle-xp'), true);
  assert.equal(h.state.game.totalXp, before.totalXp + 35);
  assert.equal(h.chooseCycleReward('cycle-xp'), false);
  assert.equal(writes, 1);
});

test('reinforcement templates follow runtime language changes without translating user reward names', () => {
  setAppSettings({});
  try {
    for (const language of ['es', 'en', 'es']) {
      setLanguage(language);
      assert.equal(reinforcementText('call-normal', { amount: '$1.00' }),
        translateText('Llamada completada · sumaste {amount} a tu día').replace('{amount}', '$1.00'));
      assert.equal(reinforcementText('reward-claimed', { icon: '☕', name: 'Mi Té' }),
        translateText('{icon} Premio realizado: {name}').replace('{icon}', '☕').replace('{name}', 'Mi Té'));
    }
  } finally { setLanguage('es'); setAppSettings({}); }
});

for (const draw of [0, .99]) {
  test(`derived surprise ${draw === 0 ? 'win' : 'loss'} stays pending after a rejected save without rerolling`, () => {
    const h = harness(); load(h, 'rewardSurpriseForCall');
    h.callIsXpEligible = () => true;
    h.reinforcementCallKey = () => 'reinforce-call:10/10/2026:call';
    h.surpriseDecision = surpriseDecision;
    h.gameEnabled = () => false;
    let grants = 0, draws = 0;
    h.grantDayBonusReceipt = () => { grants++; return { gross: 5, applied: 5 }; };
    const options = { random: () => { draws++; return draw; } };
    const first = copy(h.rewardSurpriseForCall({ id: 'call' }, '10/10/2026', options));
    assert.equal(first.surprise, draw === 0);
    assert.equal(first.applied, draw === 0 ? 5 : 0);
    h.state.game = copy(h.state.game);
    h.saveStateOnly = () => true;
    assert.deepEqual(copy(h.rewardSurpriseForCall({ id: 'call' }, '10/10/2026',
      { random: () => assert.fail('The same saved call must not roll twice') })), first);
    assert.equal(draws, 1);
    assert.equal(grants, draw === 0 ? 1 : 0);
  });
}

for (const shields of [0, 2, 3]) {
  test(`completed backup at ${shields} shields retains one capped pending receipt after save rejection`, () => {
    const h = harness(); load(h, 'onGameBackupExported');
    h.GAME_SHIELD_CAP = 3;
    h.state.game.shields = shields;
    h.onGameBackupExported();
    const pending = copy(h.state.game);
    assert.equal(pending.shields, Math.min(3, shields + 1));
    assert.equal(Object.keys(pending.ledger).filter(key => key.startsWith('backup-shield:')).length, 1);
    h.state.game = copy(pending);
    h.saveStateOnly = () => true;
    h.onGameBackupExported();
    assert.deepEqual(copy(h.state.game), pending);
  });
}
