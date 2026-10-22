import test from 'node:test';
import assert from 'node:assert/strict';
import { higherRateWindowReview, higherRateCorrectionPlan } from '../js/higher-rate-review.js';
import { configureHigherRateContext, higherRateWindowBounds, callQualifiesForHigherRateWindow, higherRateBonusForCall, applyHigherRateCorrection } from '../js/higher-rate.js';
import { settings, calls, setAppCalls, setAppSettings } from '../js/app-context.js';
import { partitionLocaleResources } from '../scripts/locale-bundle.mjs';

const tiers = { bronze: { bonusPerMin: .01 }, silver: { bonusPerMin: .02 }, gold: { bonusPerMin: .03 } };
function fixture(windows) {
  const settings = { higherRateWindows: windows };
  setAppSettings(settings);
  configureHigherRateContext({ HIGHER_RATE_EARLY_GRACE_MIN: 5, HIGHER_RATE_TIERS: tiers,
    toDateFromInputs: (date, time) => new Date(`${date}T${time}:00`),
    timeLabel: x => x, formatHHMM: x => x, toMinutes: x => Number(x.slice(0, 2)) * 60 + Number(x.slice(3)), isoDateFromDayKey: x => x,
  });
  return { settings, context: { HIGHER_RATE_EARLY_GRACE_MIN: 5, HIGHER_RATE_TIERS: tiers,
    bounds: higherRateWindowBounds, qualifies: callQualifiesForHigherRateWindow, higherRateBonusForCall, isoDateFromDayKey: x => x } };
}
const window = { id: 'hr', date: '2026-10-19', start: '08:00', end: '09:00', tier: 'silver' };
const call = (id, time, extra = {}) => ({ id, callDate: '2026-10-19', startISO: `2026-10-19T${time}`, durationMin: 10, pay: '1.20', ...extra });

test('Higher Rate review explains exact grace and exclusive-end boundaries using the real bonus calculation', () => {
  const h = fixture([window]), calls = [call('early', '07:54:59'), call('grace', '07:55:00'), call('start', '08:00:00'), call('last', '08:59:59'), call('end', '09:00:00')];
  const before = JSON.stringify({ calls, settings: h.settings });
  const result = higherRateWindowReview(calls, window, h.context);
  assert.deepEqual(result.rows.map(r => [r.call.id, r.reason]), [['grace', 'grace'], ['start', 'eligible'], ['last', 'eligible']]);
  assert.deepEqual(result.excluded.map(r => [r.call.id, r.reason]), [['early', 'before'], ['end', 'after']]);
  assert.equal(result.eligibleCount, 3); assert.ok(Math.abs(result.appliedTotal - .6) < 1e-10);
  assert.equal(JSON.stringify({ calls, settings: h.settings }), before);
});

test('Higher Rate review separates overlapping-window winners and preserved bonuses from current eligibility', () => {
  const gold = { ...window, id: 'gold', tier: 'gold', start: '08:30' }, h = fixture([window, gold]);
  const calls = [call('silver', '08:10:00'), call('overlap', '08:30:00'),
    call('saved-here', '07:40:00', { frozenHigherRateBonus: { windowId: 'hr', tier: 'gold', amount: .3 } }),
    call('saved-elsewhere', '08:15:00', { frozenHigherRateBonus: { windowId: 'removed', tier: 'bronze', amount: .1 } })];
  const result = higherRateWindowReview(calls, window, h.context);
  assert.equal(result.rows.find(r => r.call.id === 'overlap').reason, 'other');
  assert.equal(result.rows.find(r => r.call.id === 'saved-here').reason, 'preserved');
  assert.equal(result.rows.find(r => r.call.id === 'saved-elsewhere').reason, 'preserved-other');
  assert.equal(result.eligibleCount, 3); assert.equal(result.appliedTotal, .5);
});

test('Higher Rate review handles overnight calls and zero-duration records without manufacturing a 24-hour window', () => {
  const night = { ...window, start: '23:00', end: '01:00' }, h = fixture([night]);
  const calls = [call('grace', '22:55:00'), call('night', '00:30:00', { startISO: '2026-10-20T00:30:00' }),
    call('zero', '23:10:00', { durationMin: 0 }), call('end', '01:00:00', { startISO: '2026-10-20T01:00:00' })];
  const result = higherRateWindowReview(calls, night, h.context);
  assert.equal(result.eligibleCount, 3); assert.equal(result.rows.find(r => r.call.id === 'zero').amount, 0);
  assert.equal(result.excluded.find(r => r.call.id === 'end').reason, 'after');
  assert.equal(higherRateWindowReview(calls, { ...night, end: night.start }, h.context), null);
});

test('lazy translations leave shared labels in the initial bundle and reconstruct both complete languages', () => {
  const resources = { es: { translation: { shared: 'shared', detail: 'detalle', unknown: 'fallback' } }, en: { translation: { shared: 'shared', detail: 'detail', unknown: 'fallback' } } };
  const catalog = { shared: { files: ['js/higher-rate-review.js', 'app.html'] }, detail: { files: ['js/higher-rate-review.js'] } };
  const { initial, details } = partitionLocaleResources(resources, catalog);
  for (const language of ['es', 'en']) {
    assert.equal(initial[language].translation.shared, 'shared');
    assert.equal(initial[language].translation.unknown, 'fallback');
    assert.deepEqual({ ...initial[language].translation, ...details[language].translation }, resources[language].translation);
    assert.equal(initial[language].translation.detail, undefined);
  }
});

test('correction previews release only the selected promotion and recompute the highest remaining bonus without mutating calls', () => {
  const gold = { ...window, id: 'gold', tier: 'gold', start: '08:30' }, h = fixture([window, gold]);
  const source = [call('own', '08:30:00', { frozenHigherRateBonus: { tier: 'silver', amount: .2, windowId: 'hr' } }),
    call('other', '08:15:00', { frozenHigherRateBonus: { tier: 'bronze', amount: .1, windowId: 'removed' } }), call('new', '10:15:00')];
  const before = JSON.stringify({ source, settings: h.settings });
  const removal = higherRateCorrectionPlan(source, h.settings.higherRateWindows, 'hr', null, h.context);
  assert.deepEqual(removal.rows.map(r => [r.call.id, r.before, r.after]), [['own', .2, .3]]);
  assert.ok(Math.abs(removal.afterTotal - .4) < 1e-10);
  const moved = higherRateCorrectionPlan(source, h.settings.higherRateWindows, 'hr', { ...window, start: '10:00', end: '11:00' }, h.context);
  assert.deepEqual(moved.rows.map(r => [r.call.id, r.after]), [['own', .3], ['new', .2]]);
  assert.equal(JSON.stringify({ source, settings: h.settings }), before);
});

test('correction previews reject invalid dates, clock values, tiers, duplicate identities and same-time windows', () => {
  const h = fixture([window]);
  for (const draft of [{ ...window, date: '2026-02-31' }, { ...window, date: '1969-12-31' }, { ...window, start: '' },
    { ...window, start: '24:00' }, { ...window, end: window.start }, { ...window, tier: 'unknown' }]) {
    assert.equal(higherRateCorrectionPlan([], [window], 'hr', draft, h.context), null);
  }
  assert.equal(higherRateCorrectionPlan([], [window, window], 'hr', null, h.context), null);
  assert.equal(higherRateCorrectionPlan([], [], 'hr', window, h.context), null);
  assert.equal(higherRateCorrectionPlan([], [window], 'hr', window, h.context).hasChanges, false);
  assert.ok(higherRateCorrectionPlan([], [window], 'hr', { ...window, start: '23:00', end: '01:00' }, h.context));
});

function transactionFixture(t) {
  fixture([window]);
  settings.financeCategories = { expenses: { rows: [{ assignedAmount: 1 }] } };
  setAppCalls([call('own', '08:15:00', { frozenHigherRateBonus: { windowId: 'hr', tier: 'silver', amount: .2 } }),
    call('legacy', '07:00:00', { frozenHigherRateBonus: { windowId: 'removed', tier: 'legacy', amount: '0.77' } })]);
  const oldDocument = globalThis.document;
  globalThis.document = { getElementById: () => null };
  t.after(() => { if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument; });
  const h = { accepted: true, allowed: true, writes: 0, effects: 0, saved: null };
  configureHigherRateContext({ HIGHER_RATE_EARLY_GRACE_MIN: 5, HIGHER_RATE_TIERS: tiers,
    toDateFromInputs: (date, time) => new Date(`${date}T${time}:00`), timeLabel: x => x, formatHHMM: x => x,
    toMinutes: x => Number(x.slice(0, 2)) * 60 + Number(x.slice(3)), isoDateFromDayKey: x => x, callDateKeyFromValue: x => x,
    canPersistLocalChanges: () => h.allowed,
    financeRunAutoFillCascade: () => { settings.financeCategories.expenses.rows[0].assignedAmount = .5; },
    saveAll() { h.writes++; if (h.accepted === 'throw') throw new Error('storage interrupted'); if (!h.accepted) return false; h.saved = JSON.stringify({ settings, calls }); return true; },
    onGameCallsChanged() { assert.ok(h.saved, 'reconcile only after the accepted snapshot'); h.effects++; }, render() {},
  });
  h.stamp = () => ({ owner: settings, callsOwner: calls, revision: JSON.stringify([settings, calls]), used: false });
  return h;
}

test('correction transactions roll back rejected finance and bonus changes, then persist exactly once and survive reload', async t => {
  const h = transactionFixture(t), before = JSON.stringify({ settings, calls });
  const draft = { ...window, start: '10:00', end: '11:00' };
  h.accepted = false;
  assert.equal(await applyHigherRateCorrection('hr', draft, h.stamp()), false);
  assert.equal(JSON.stringify({ settings, calls }), before); assert.equal(h.effects, 0);
  h.accepted = true;
  const stamp = h.stamp();
  assert.deepEqual(await Promise.all([applyHigherRateCorrection('hr', draft, stamp), applyHigherRateCorrection('hr', draft, stamp)]), [true, false]);
  assert.equal(h.writes, 2); assert.equal(h.effects, 1);
  assert.equal(calls[0].frozenHigherRateBonus, undefined); assert.equal(calls[0].pay, '1.20');
  assert.deepEqual(calls[1].frozenHigherRateBonus, { windowId: 'removed', tier: 'legacy', amount: '0.77' });
  const restored = JSON.parse(h.saved); setAppSettings(restored.settings); setAppCalls(restored.calls);
  assert.equal(higherRateBonusForCall(calls[0]), null); assert.equal(higherRateBonusForCall(calls[1]).amount, .77);
});

test('the unified promotion editor previews and preserves earned bonuses before moving its window', async t => {
  const h = transactionFixture(t), draft = { ...window, start: '10:00', end: '11:00' };
  const before = higherRateBonusForCall(calls[0]).amount;
  const model = fixture([window]);
  const plan = higherRateCorrectionPlan(calls, [window], 'hr', draft, {...model.context, preserve:true});
  assert.equal(plan.beforeTotal, plan.afterTotal);
  // Restore the transaction owner replaced by the pure-model fixture.
  const tx = transactionFixture(t);
  tx.accepted = false;
  const prior = JSON.stringify({settings,calls});
  assert.equal(await applyHigherRateCorrection('hr', draft, tx.stamp(), 'preserve'), false);
  assert.equal(JSON.stringify({settings,calls}), prior);
  tx.accepted = true;
  assert.equal(await applyHigherRateCorrection('hr', draft, tx.stamp(), 'preserve'), true);
  assert.equal(higherRateBonusForCall(calls[0]).amount, before);
  assert.equal(calls[0].frozenHigherRateBonus.windowId, 'hr');
  const reloaded = JSON.parse(tx.saved);
  assert.equal(reloaded.calls[0].frozenHigherRateBonus.amount, before);
});

for (const change of ['account', 'calls', 'revision', 'currency']) test(`correction refuses to apply after ${change} changes during review`, async t => {
  const h = transactionFixture(t), stamp = h.stamp();
  if (change === 'account') setAppSettings(structuredClone(settings));
  if (change === 'calls') calls.push(call('new', '10:30:00'));
  if (change === 'revision') h.allowed = false;
  if (change === 'currency') settings.exchangeRate = 28;
  const current = JSON.stringify({ settings, calls });
  assert.equal(await applyHigherRateCorrection('hr', null, stamp), false);
  assert.equal(JSON.stringify({ settings, calls }), current); assert.equal(h.writes, 0); assert.equal(h.effects, 0);
});

test('interrupted correction storage restores promotion, finance and preserved bonuses before retry', async t => {
  const h = transactionFixture(t), before = JSON.stringify({ settings, calls });
  h.accepted = 'throw';
  assert.equal(await applyHigherRateCorrection('hr', null, h.stamp()), false);
  assert.equal(JSON.stringify({ settings, calls }), before); assert.equal(h.effects, 0);
  h.accepted = true;
  assert.equal(await applyHigherRateCorrection('hr', null, h.stamp()), true);
  assert.equal(h.writes, 2); assert.equal(h.effects, 1);
});
