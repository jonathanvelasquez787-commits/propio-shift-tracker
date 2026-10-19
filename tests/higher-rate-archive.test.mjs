import test from 'node:test';
import assert from 'node:assert/strict';
import { calls, settings, setAppCalls, setAppSettings } from '../js/app-context.js';
import { setLanguage } from '../js/i18n.js';
import { configureHigherRateContext, higherRateBonusForCall, higherRateBonusForCalls, purgePastHigherRateWindows } from '../js/higher-rate.js';

function fixture(t) {
  setLanguage('es');
  const oldDocument = globalThis.document;
  globalThis.document = { getElementById: () => null };
  t.after(() => { if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument; });
  const windows = [
    { id: 'bronze', date: '2000-01-01', start: '08:00', end: '09:00', tier: 'bronze' },
    { id: 'gold', date: '2000-01-01', start: '08:15', end: '09:00', tier: 'gold' },
    { id: 'night', date: '2000-01-01', start: '23:00', end: '01:00', tier: 'silver' },
    { id: 'future', date: '2099-01-01', start: '08:00', end: '09:00', tier: 'gold' },
  ];
  const call = (id, when, durationMin, extra = {}) => ({ id, startISO: new Date(when).toISOString(), durationMin, callDate: when.slice(0, 10), pay: '$1.20', ...extra });
  setAppSettings({ higherRateWindows: windows, financeCategories: { expenses: { rows: [{ assignedAmount: 20, paidAmount: 5 }] } } });
  setAppCalls([
    call('bronze', '2000-01-01T08:05:00', 10),
    call('grace-gold', '2000-01-01T08:10:00', 20),
    call('exclusive-end', '2000-01-01T09:00:00', 10),
    call('overnight', '2000-01-02T00:30:00', 15),
    call('already-frozen', '1999-12-31T08:30:00', 6, { frozenHigherRateBonus: { windowId: 'removed', tier: 'bronze', amount: .06 } }),
    call('legacy', '1999-12-31T08:00:00', 1, { frozenHigherRateBonus: { windowId: 'legacy', tier: 'custom', amount: '2.50' } }),
  ]);
  const h = { prompts: [], messages: [], writes: 0, allowed: true, accepted: true, saved: null };
  configureHigherRateContext({
    HIGHER_RATE_EARLY_GRACE_MIN: 5,
    HIGHER_RATE_TIERS: { bronze: { bonusPerMin: .01 }, silver: { bonusPerMin: .02 }, gold: { bonusPerMin: .03 } },
    timeLabel: x => x, formatHHMM: x => x, toMinutes: x => Number(x.slice(0, 2)) * 60 + Number(x.slice(3)),
    toDateFromInputs: (date, time) => new Date(`${date}T${time}:00`),
    money: x => '$' + x.toFixed(2), convertedAmountText: x => '≈ L ' + (x * 27).toFixed(2),
    canPersistLocalChanges: () => h.allowed,
    appConfirm: (message, accept) => h.prompts.push({ message, accept }),
    saveAll: () => { h.writes++; if (!h.accepted) return false; h.saved = JSON.stringify({ settings, calls }); return true; },
    render() {}, toast: x => h.messages.push(x),
    financeRunAutoFillCascade: () => assert.fail('Archiving must not change financial assignments'),
    onGameCallsChanged: () => assert.fail('Archiving must not award or revoke game progress'),
  });
  return h;
}

test('cleaning Higher Rate history preserves each earned bonus, base pay and finance allocations after reload', t => {
  const h = fixture(t);
  const bonusBefore = calls.map(c => higherRateBonusForCall(c));
  const totalBefore = higherRateBonusForCalls(calls);
  const payBefore = calls.map(c => c.pay);
  const financeBefore = JSON.stringify(settings.financeCategories);
  purgePastHigherRateWindows();
  assert.equal(h.writes, 0, 'opening the preview must not save or freeze anything');
  assert.match(h.prompts[0].message, /Ventanas pasadas: 3/);
  assert.match(h.prompts[0].message, /Llamadas con bono: 3 \(\$1\.00 ≈ L 27\.00\)/);
  assert.ok(calls.slice(0, 4).every(c => !c.frozenHigherRateBonus));
  assert.equal(h.prompts[0].accept(), true);
  assert.deepEqual(settings.higherRateWindows.map(w => w.id), ['future']);
  assert.deepEqual(calls.map(c => higherRateBonusForCall(c)), bonusBefore);
  assert.deepEqual(calls.map(c => c.pay), payBefore);
  assert.equal(higherRateBonusForCalls(calls), totalBefore);
  assert.equal(JSON.stringify(settings.financeCategories), financeBefore);
  const restored = JSON.parse(h.saved);
  setAppSettings(restored.settings); setAppCalls(restored.calls);
  assert.equal(higherRateBonusForCalls(calls), totalBefore);
  assert.deepEqual(calls.map(c => higherRateBonusForCall(c)), bonusBefore);
  calls[0].durationMin = 12;
  assert.equal(higherRateBonusForCall(calls[0]).amount, .12, 'an official duration correction still applies the saved tier');
  purgePastHigherRateWindows();
  assert.equal(h.prompts.length, 1);
  assert.equal(h.writes, 1, 'empty history must not erase saved bonuses or save again');
});

test('rejected Higher Rate archive restores all windows and bonuses and can be retried without duplicate writes', t => {
  const h = fixture(t), before = JSON.stringify({ settings, calls });
  h.accepted = false;
  purgePastHigherRateWindows();
  assert.equal(h.prompts[0].accept(), false);
  assert.equal(JSON.stringify({ settings, calls }), before);
  assert.deepEqual(h.messages, []);
  assert.equal(h.prompts[0].accept(), false, 'a confirmation callback cannot run twice');
  assert.equal(h.writes, 1);
  h.accepted = true;
  purgePastHigherRateWindows();
  assert.equal(h.prompts[1].accept(), true);
  assert.equal(h.prompts[1].accept(), false);
  assert.equal(h.writes, 2);
  assert.equal(h.messages.length, 1);
});

for (const mutation of ['incoming call', 'window change', 'currency change', 'account change', 'stale revision']) {
  test(`Higher Rate archive rejects its preview after ${mutation}`, t => {
    const h = fixture(t);
    purgePastHigherRateWindows();
    if (mutation === 'incoming call') calls.push({ id: 'incoming', durationMin: 1 });
    if (mutation === 'window change') settings.higherRateWindows.push({ id: 'new-window' });
    if (mutation === 'currency change') settings.exchangeRate = 28;
    if (mutation === 'account change') setAppSettings(structuredClone(settings));
    if (mutation === 'stale revision') h.allowed = false;
    const changed = JSON.stringify({ settings, calls });
    assert.equal(h.prompts[0].accept(), false);
    assert.equal(JSON.stringify({ settings, calls }), changed);
    assert.equal(h.writes, 0);
    assert.equal(h.saved, null);
    assert.ok(!h.messages.some(x => /se conservaron/.test(x)));
  });
}

test('canceling a Higher Rate archive or opening it from a stale tab changes nothing', t => {
  const h = fixture(t), before = JSON.stringify({ settings, calls });
  purgePastHigherRateWindows();
  assert.equal(JSON.stringify({ settings, calls }), before);
  h.allowed = false;
  assert.equal(purgePastHigherRateWindows(), false);
  assert.equal(h.prompts.length, 1);
  assert.equal(h.writes, 0);
  assert.equal(JSON.stringify({ settings, calls }), before);
});
