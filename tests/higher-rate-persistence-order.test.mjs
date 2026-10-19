import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parse } from 'acorn';

function functions(file, names) {
  const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8');
  const declarations = parse(source, { ecmaVersion: 'latest', sourceType: 'module' }).body
    .map(node => node.declaration || node).filter(node => node.type === 'FunctionDeclaration');
  return names.map(name => {
    const node = declarations.find(node => node.id.name === name);
    assert.ok(node, name);
    return source.slice(node.start, node.end);
  }).join('\n');
}

test('a rejected retroactive Higher Rate window cannot persist game receipts before its settings snapshot; retry reconciles once', () => {
  const initialWindow = { id: 'hr', date: '2026-10-12', start: '08:00', end: '09:00', tier: 'bronze' };
  const draft = [initialWindow, { ...initialWindow, id: 'new-gold', tier: 'gold' }];
  const settings = { higherRateWindows: [initialWindow] };
  const state = { game: { ledger: {} } };
  const calls = [{ id: 'call', callDate: '10/12/2026', startISO: new Date('2026-10-12T08:15:00').toISOString(), durationMin: 10 }];
  const values = new Map([['state', JSON.stringify(state)], ['calls', JSON.stringify(calls)], ['settings', JSON.stringify(settings)]]);
  const before = new Map(values), effects = [];
  let accepted = false, reconciliations = 0;
  const h = vm.createContext({ Date, settings, state, calls, STORAGE_KEY: 'state', CALLS_KEY: 'calls', SETTINGS_KEY: 'settings',
    HIGHER_RATE_EARLY_GRACE_MIN: 5, HIGHER_RATE_TIERS: { bronze: { bonusPerMin: .01 }, gold: { bonusPerMin: .03 } },
    timeLabel: value => value, formatHHMM: value => value,
    toMinutes: value => Number(value.slice(0, 2)) * 60 + Number(value.slice(3)),
    toDateFromInputs: (date, time) => new Date(`${date}T${time}:00`), callDateKeyFromValue: value => value,
    readHigherRateWindowsFromEditor: () => draft, financeRunAutoFillCascade() {},
    localStorageRevision: { isCurrent: () => true, record() {} }, settingsWithinBudget: () => true,
    reportLocalPersistenceFailure() {}, STORAGE_QUOTA_TOAST: 'write rejected',
    localStorage: { getItem: key => values.get(key) ?? null,
      setItem(key, value) { if (key === 'settings' && !accepted) throw new Error('QuotaExceededError'); values.set(key, value); },
      removeItem: key => values.delete(key) },
    toast: message => effects.push(message),
    render() {
      if (settings.higherRateWindows.some(w => w.tier === 'gold')) {
        state.game.ledger['render-reward'] = true;
        h.saveStateOnly();
      }
    }, renderHigherRateLiveCard() {}, renderHigherRateDayStats() {},
    notifyHigherRateRetroactiveMatches: () => effects.push('retroactive success'), notifyHigherRateMidnightCrossingWindows() {},
    onGameCallsChanged(dayKey) {
      reconciliations++;
      state.game.ledger[dayKey] = h.higherRateBonusForCall(calls[0]).amount;
      h.saveStateOnly();
      effects.push('game success');
    },
  });
  vm.runInContext('let storageSnapshotPending = false;\n' + functions('../js/app-main.js',
    ['safeLocalStorageSet', 'canPersistLocalChanges', 'saveAll', 'persistFullSnapshot', 'saveStateOnly'])
    + '\n' + functions('../js/higher-rate.js', ['higherRateWindowBounds', 'callQualifiesForHigherRateWindow',
      'higherRateBonusForCall', 'higherRateGameBonusSnapshot', 'reconcileHigherRateGameChanges',
      'freezeHigherRateBonusesForWindowIds', 'higherRateMutationSnapshot',
      'restoreHigherRateMutation', 'saveHigherRateWindowsFromEditor']), h);
  const rejected = h.saveHigherRateWindowsFromEditor();
  assert.deepEqual(values, before);
  assert.equal(rejected, false);
  assert.equal(reconciliations, 0);
  assert.deepEqual(state.game.ledger, {});
  assert.ok(!effects.includes('game success') && !effects.includes('retroactive success'));
  assert.equal(settings.higherRateWindows[0].tier, 'bronze');
  assert.equal(draft[1].tier, 'gold', 'the unsaved editor draft remains available for retry');
  accepted = true;
  assert.equal(h.saveHigherRateWindowsFromEditor(), true);
  assert.equal(reconciliations, 1);
  assert.equal(JSON.parse(values.get('settings')).higherRateWindows[1].tier, 'gold');
  assert.equal(JSON.parse(values.get('state')).game.ledger['10/12/2026'], .3);
  const restored = JSON.parse(values.get('state'));
  assert.equal(restored.game.ledger['10/12/2026'], .3);
  assert.equal(h.saveHigherRateWindowsFromEditor(), true);
  assert.equal(reconciliations, 1, 'saving the same accepted edit does not repeat the game callback');
});

for (const action of ['saveHigherRateWindowsFromEditor', 'removeHigherRateWindowRowAt']) {
  for (const hasFrozenBonus of [false, true]) {
    test(`${action} restores frozen bonus and finance allocation after rejection (${hasFrozenBonus ? 'existing' : 'new'} frozen bonus)`, () => {
      const originalWindow = { id: 'hr', date: '2026-10-12', start: '08:00', end: '09:00', tier: 'bronze' };
      const settings = { higherRateWindows: [originalWindow], financeCategories: { otro: { rows: [{ id: 'row', assignedAmount: .1 }] } } };
      const call = { id: 'call', callDate: '10/12/2026', startISO: new Date('2026-10-12T08:15:00').toISOString(), durationMin: 10 };
      if (hasFrozenBonus) call.frozenHigherRateBonus = { tier: 'bronze', amount: .1, windowId: 'hr' };
      const before = JSON.stringify({ settings, call });
      const draft = [{ ...originalWindow, start: '08:10', tier: 'gold' }], effects = [];
      let accepted = false;
      const h = vm.createContext({ Date, settings, calls: [call],
        HIGHER_RATE_EARLY_GRACE_MIN: 5, HIGHER_RATE_TIERS: { bronze: { bonusPerMin: .01 }, gold: { bonusPerMin: .03 } },
        timeLabel: value => value, formatHHMM: value => value,
        toMinutes: value => Number(value.slice(0, 2)) * 60 + Number(value.slice(3)),
        toDateFromInputs: (date, time) => new Date(`${date}T${time}:00`), callDateKeyFromValue: value => value,
        readHigherRateWindowsFromEditor: () => draft,
        financeRunAutoFillCascade: () => { settings.financeCategories.otro.rows[0].assignedAmount += .2; },
        saveAll: () => accepted, render() {}, renderHigherRateLiveCard() {}, renderHigherRateDayStats() {}, renderHigherRateWindowsEditor() {},
        notifyHigherRateRetroactiveMatches: () => effects.push('success'), notifyHigherRateMidnightCrossingWindows() {},
        onGameCallsChanged: () => effects.push('game'),
      });
      vm.runInContext(functions('../js/higher-rate.js', ['higherRateWindowBounds', 'callQualifiesForHigherRateWindow',
        'higherRateBonusForCall', 'higherRateGameBonusSnapshot', 'reconcileHigherRateGameChanges',
        'freezeHigherRateBonusesForWindowIds', 'higherRateMutationSnapshot',
        'restoreHigherRateMutation', action]), h);
      assert.equal(h[action]('hr'), false);
      assert.equal(JSON.stringify({ settings, call }), before);
      assert.deepEqual(effects, []);
      assert.equal(draft[0].tier, 'gold');
      accepted = true;
      assert.equal(h[action]('hr'), true);
      assert.ok(Math.abs(settings.financeCategories.otro.rows[0].assignedAmount - .3) < 1e-12);
      assert.equal(call.frozenHigherRateBonus.tier, 'bronze');
      assert.equal(settings.higherRateWindows.length, action === 'removeHigherRateWindowRowAt' ? 0 : 1);
    });
  }
}
