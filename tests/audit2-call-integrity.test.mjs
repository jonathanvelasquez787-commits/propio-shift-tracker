import test from 'node:test';
import assert from 'node:assert/strict';
import { deleteRecordedCall, saveEditedCall, restoreCallChange, callRecoveryStamp } from '../js/call-recovery.js';
import { linkCallRecordReview } from '../js/call-records-view.js';
import { configureFinanceContext, financeRunAutoFillCascade } from '../js/finance.js';
import { state, settings, calls, setAppState, setAppSettings, setAppCalls } from '../js/app-context.js';
import { configureHigherRateContext, higherRateBonusForCall, higherRateBonusForCalls, purgePastHigherRateWindows, applyHigherRateCorrection } from '../js/higher-rate.js';

const ago = minutes => new Date(Date.now() - minutes * 60000).toISOString();
const clone = value => JSON.parse(JSON.stringify(value));
const canonical = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
const overlap = (a, b) => Date.parse(a.startISO) < Date.parse(b.endISO) && Date.parse(b.startISO) < Date.parse(a.endISO);

function fixture(t) {
  const oldDocument = globalThis.document, inputs = {};
  globalThis.document = { getElementById: id => inputs[id] || null, querySelectorAll: () => [] };
  t.after(() => { if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument; });
  const one = { id: 'one', customerId: 'one', source: 'live', callDate: '10/20/2026', callStart: '08:00 AM',
    startISO: ago(60), endISO: ago(50), durationMin: 10, pay: '.60', billable: 'Yes', dropped: 'No', countsAsProductive: true };
  one.records = { tool: { startISO: one.startISO, endISO: one.endISO, durationMs: 600000, pay: .60 } };
  setAppCalls([one, { ...one, id: 'two', customerId: 'two', startISO: ago(30), endISO: ago(20) }]);
  setAppState({ events: [], pauseHistory: [], activeCall: null, pendingLiveCallBackup: null });
  setAppSettings({ financeAutoFill: true, customFinanceCategories: [], financeCategories: {
    otro: { rows: [{ id: 'rent', name: 'Renta', categoryId: 'otro', kind: 'gasto', targetAmount: 10, assignedAmount: 1, priority: 1 }] } } });
  const h = { accepted: true, writes: 0, gameCalls: 0, messages: [], inputs, saved: null };
  let sequence = 0;
  configureFinanceContext({ parseMoney: Number, higherRateBonusForCalls: () => 0 });
  const context = { data: () => ({ calls, state, settings }), translateText: value => value,
    ui: (parts, ...values) => parts.reduce((out, part, i) => out + part + (values[i] ?? ''), ''),
    toast: text => h.messages.push(text), render() {}, canPersistLocalChanges: () => true, stateWithinBudget: () => true,
    setCalls: setAppCalls, setState: setAppState, MAX_CALL_DURATION_MIN: 1440,
    callsOverlap: overlap, callDedupeKey: call => `${call.customerId}|${call.startISO}|${call.durationMin}`,
    callDateKeyFromValue: value => value, makeLocalId: () => `change-${++sequence}`,
    higherRateBonusForCall: call => call.frozenHigherRateBonus || null, financeRunAutoFillCascade,
    reconcileLastCallEndedAt: () => { state.lastCallEndedAt = calls.at(-1)?.endISO || null; },
    saveAll() { h.writes++; if (h.onSave) return h.onSave(); if (h.accepted === 'throw') throw Error('interrupted'); if (!h.accepted) return false;
      h.saved = JSON.stringify({ calls, state, settings }); return true; },
    onGameCallsChanged() { h.gameCalls++; }, finishEdit() {}, closeModal() {},
  };
  h.context = context; h.snapshot = () => JSON.stringify({ calls, state, settings });
  h.reload = () => { const data = JSON.parse(h.saved); setAppCalls(data.calls); setAppState(data.state); setAppSettings(data.settings); };
  h.review = duration => {
    const incoming = { ...calls[0], source: 'import', pay: '0', durationMin: duration,
      endISO: new Date(Date.parse(calls[0].startISO) + duration * 60000).toISOString() };
    state.callRecordReviews = [{ id: 'review', call: incoming, candidateIds: ['one'], receivedAt: ago(1) }];
    return { owner: settings, review: JSON.stringify(state.callRecordReviews[0]), candidates: JSON.stringify([calls[0]]) };
  };
  return h;
}

for (const created of ['before', 'after']) test(`recovery rechecks a pending interval created ${created} its preview`, t => {
  const h = fixture(t), removed = clone(calls[0]);
  assert.equal(deleteRecordedCall(h.context, 'one', calls[0]), true);
  const pending = { startedAtISO: removed.startISO, endedAtISO: removed.endISO, candidate: { ...removed, id: 'pending' } };
  if (created === 'before') state.pendingLiveCallBackup = pending;
  const stamp = callRecoveryStamp({ calls, state, settings });
  if (created === 'after') state.pendingLiveCallBackup = pending;
  const before = h.snapshot(), writes = h.writes;
  assert.equal(restoreCallChange(h.context, 'change-1', stamp), false);
  assert.equal(h.snapshot(), before); assert.equal(h.writes, writes);
  state.pendingLiveCallBackup.startedAtISO = removed.endISO;
  state.pendingLiveCallBackup.endedAtISO = new Date(Date.parse(removed.endISO) + 60000).toISOString();
  assert.equal(restoreCallChange(h.context, 'change-1', callRecoveryStamp({ calls, state, settings })), true);
  assert.equal(calls.length, 2); assert.ok(state.pendingLiveCallBackup);
});

test('editing duration protects a pending call while allowing an exact adjacent endpoint', t => {
  const h = fixture(t), original = calls[0];
  state.pendingLiveCallBackup = { startedAtISO: new Date(Date.parse(original.startISO) + 15 * 60000).toISOString(), endedAtISO: ago(35) };
  for (const [id, value] of Object.entries({ callEditDurationInput: '20', callEditPayInput: '.60', callEditBillableInput: 'Yes', callEditDroppedInput: 'No' })) h.inputs[id] = { value };
  const before = h.snapshot();
  assert.equal(saveEditedCall(h.context, 'one', { owner: settings, call: canonical(original) }), false);
  assert.equal(h.snapshot(), before); assert.equal(h.writes, 0);
  h.inputs.callEditDurationInput.value = '15';
  assert.equal(saveEditedCall(h.context, 'one', { owner: settings, call: canonical(original) }), true);
  assert.equal(calls.find(call => call.id === 'one').endISO, state.pendingLiveCallBackup.startedAtISO);
});

test('explicit official linking cannot expand a saved observation into a pending interval', t => {
  const h = fixture(t), opened = h.review(20), start = calls[0].startISO;
  state.pendingLiveCallBackup = { startedAtISO: new Date(Date.parse(start) + 15 * 60000).toISOString(), endedAtISO: ago(35) };
  const before = h.snapshot();
  assert.equal(linkCallRecordReview(h.context, 'review', 'one', opened), false);
  assert.equal(h.snapshot(), before); assert.equal(h.writes, 0);
  const next = h.review(15);
  assert.equal(linkCallRecordReview(h.context, 'review', 'one', next), true);
  assert.equal(calls[0].endISO, state.pendingLiveCallBackup.startedAtISO);
});

for (const operation of ['delete', 'link']) for (const oldReport of [true, false]) for (const failure of [false, 'throw'])
  test(`${operation} rolls back the distribution report (${oldReport}) after ${failure} and a later save`, t => {
    const h = fixture(t);
    if (oldReport) settings.financeLastDistribution = { at: ago(1), items: [{ id: 'prior', name: 'Antes', amount: .2 }] };
    const opened = operation === 'link' ? h.review(10) : null, before = h.snapshot();
    h.accepted = failure;
    const result = operation === 'link' ? linkCallRecordReview(h.context, 'review', 'one', opened) : deleteRecordedCall(h.context, 'one', calls[0]);
    assert.equal(result, false); assert.equal(h.snapshot(), before); assert.equal(h.gameCalls, 0);
    h.accepted = true; h.context.saveAll(); h.reload();
    assert.equal(h.snapshot(), before);
  });

function enableHigherRate(h) {
  Object.assign(calls[0], { callDate: '01/01/2000', startISO: new Date('2000-01-01T08:00:00').toISOString(), endISO: new Date('2000-01-01T08:10:00').toISOString() });
  settings.higherRateWindows = [{ id: 'hr', date: '2000-01-01', start: '08:00', end: '09:00', tier: 'gold' }];
  h.context.higherRateBonusForCall = higherRateBonusForCall;
  configureFinanceContext({ parseMoney: Number, higherRateBonusForCalls });
  configureHigherRateContext({ ...h.context, HIGHER_RATE_EARLY_GRACE_MIN: 5,
    HIGHER_RATE_TIERS: { bronze: { bonusPerMin: .01 }, gold: { bonusPerMin: .03 } },
    timeLabel: value => value, formatHHMM: value => value, toMinutes: value => Number(value.slice(0, 2)) * 60 + Number(value.slice(3)),
    toDateFromInputs: (date, time) => new Date(`${date}T${time}:00`), isoDateFromDayKey: value => value,
    money: value => '$' + value.toFixed(2), convertedAmountText: () => '', appConfirm: (_text, action) => action(),
  });
  h.stamp = () => ({ owner: settings, callsOwner: calls, revision: JSON.stringify([settings, calls]), used: false });
}

for (const mode of ['unchanged', 'archive', 'move-preserve', 'tier-preserve', 'tier-recalculate', 'remove-recalculate'])
  test(`delete, promotion ${mode}, restore and reload preserve the applicable bonus exactly once`, async t => {
    const h = fixture(t); enableHigherRate(h);
    const original = clone(calls[0]); assert.equal(higherRateBonusForCall(original).amount, .3);
    assert.equal(deleteRecordedCall(h.context, 'one', calls[0]), true);
    if (mode === 'archive') purgePastHigherRateWindows();
    else if (mode !== 'unchanged') {
      const draft = mode === 'remove-recalculate' ? null : { ...settings.higherRateWindows[0],
        ...(mode === 'move-preserve' ? { start: '10:00', end: '11:00' } : { tier: 'bronze' }) };
      assert.equal(await applyHigherRateCorrection('hr', draft, h.stamp(), mode.endsWith('preserve') ? 'preserve' : 'recalculate'), true);
    }
    const stamp = callRecoveryStamp({ calls, state, settings });
    assert.equal(restoreCallChange(h.context, 'change-1', stamp), true);
    assert.equal(restoreCallChange(h.context, 'change-1', stamp), false);
    h.reload();
    const restored = calls.find(call => call.id === 'one');
    const expected = mode === 'remove-recalculate' ? 0 : mode === 'tier-recalculate' ? .1 : .3;
    assert.equal(higherRateBonusForCall(restored)?.amount || 0, expected);
    assert.equal(calls.filter(call => call.id === 'one').length, 1);
    assert.deepEqual(restored.records, original.records); assert.equal(restored.pay, original.pay);
    if (mode === 'unchanged') assert.equal(restored.frozenHigherRateBonus, undefined);
  });

test('a rejected explicit promotion correction cannot alter the later recovery bonus or report', async t => {
  const h = fixture(t); enableHigherRate(h);deleteRecordedCall(h.context, 'one', calls[0]);
  const before=h.snapshot();h.accepted=false;
  assert.equal(await applyHigherRateCorrection('hr', null, h.stamp()),false);
  assert.equal(h.snapshot(),before);h.accepted=true;
  assert.equal(restoreCallChange(h.context,'change-1',callRecoveryStamp({calls,state,settings})),true);
  assert.equal(higherRateBonusForCall(calls.find(call=>call.id==='one')).amount,.3);
});

test('preserving an increased promotion cannot inflate the original recovered tier', async t => {
  const h=fixture(t);enableHigherRate(h);settings.higherRateWindows[0].tier='bronze';
  deleteRecordedCall(h.context,'one',calls[0]);
  const draft={...settings.higherRateWindows[0],tier:'gold'};
  assert.equal(await applyHigherRateCorrection('hr',draft,h.stamp(),'preserve'),true);
  assert.equal(restoreCallChange(h.context,'change-1',callRecoveryStamp({calls,state,settings})),true);
  assert.equal(higherRateBonusForCall(calls.find(call=>call.id==='one')).amount,.1);
});

test('old recovery histories with only a numeric bonus do not invent a retired tier', t => {
  const h=fixture(t);enableHigherRate(h);deleteRecordedCall(h.context,'one',calls[0]);
  const change=state.callRecovery[0].changes[0];
  delete change.beforeHigherRateBonus;delete change.beforeHigherRateWindow;
  assert.equal(change.beforeBonus,.3);purgePastHigherRateWindows();
  assert.equal(restoreCallChange(h.context,'change-1',callRecoveryStamp({calls,state,settings})),true);
  assert.equal(higherRateBonusForCall(calls.find(call=>call.id==='one')),null);
});

test('explicit recalculation overrides a previously frozen recovered tier without changing its original evidence', async t => {
  const h=fixture(t);enableHigherRate(h);
  calls[0].frozenHigherRateBonus={tier:'gold',windowId:'hr',amount:.3};
  const original=clone(calls[0].records);deleteRecordedCall(h.context,'one',calls[0]);
  assert.equal(await applyHigherRateCorrection('hr',null,h.stamp(),'recalculate'),true);
  assert.equal(restoreCallChange(h.context,'change-1',callRecoveryStamp({calls,state,settings})),true);
  const restored=calls.find(call=>call.id==='one');
  assert.equal(higherRateBonusForCall(restored),null);assert.deepEqual(restored.records,original);
});

test('a promotion correction leaves ignored legacy recovery entries intact', async t => {
  const h=fixture(t);enableHigherRate(h);deleteRecordedCall(h.context,'one',calls[0]);
  state.callRecovery.push(null,{id:'legacy',changes:'unrecognized'});
  assert.equal(await applyHigherRateCorrection('hr',null,h.stamp()),true);
  assert.deepEqual(state.callRecovery.slice(-2),[null,{id:'legacy',changes:'unrecognized'}]);
});

for (const replace of ['state', 'all']) test(`a rejected promotion correction cannot restore data into replaced ${replace}`, async t => {
  const h=fixture(t);enableHigherRate(h);deleteRecordedCall(h.context,'one',calls[0]);
  const otherState={marker:'other-owner',callRecovery:[{id:'private'}]}, otherSettings={marker:'other-settings'}, otherCalls=[{id:'private'}];
  const untouched=clone({otherState,otherSettings,otherCalls});
  h.onSave=()=>{setAppState(otherState);if(replace==='all'){setAppSettings(otherSettings);setAppCalls(otherCalls);}return false;};
  assert.equal(await applyHigherRateCorrection('hr',null,h.stamp()),false);
  assert.equal(state,otherState);assert.deepEqual(otherState,untouched.otherState);
  if(replace==='all') {assert.equal(settings,otherSettings);assert.equal(calls,otherCalls);
    assert.deepEqual(otherSettings,untouched.otherSettings);assert.deepEqual(otherCalls,untouched.otherCalls);}
  else assert.equal(settings.higherRateWindows[0].id,'hr');
});

for (const operation of ['delete', 'restore', 'link']) test(`a rejected ${operation} cannot roll the previous owner into a replacement snapshot`, t => {
  const h=fixture(t);let opened;
  if(operation==='restore')deleteRecordedCall(h.context,'one',calls[0]);
  if(operation==='link')opened=h.review(10);
  const otherState={marker:'other-owner',callRecovery:[{id:'private'}]}, otherSettings={marker:'other-settings'}, otherCalls=[{id:'private'}];
  const expected=JSON.stringify({calls:otherCalls,state:otherState,settings:otherSettings});
  h.onSave=()=>{setAppState(otherState);setAppSettings(otherSettings);setAppCalls(otherCalls);return false;};
  const result=operation==='delete'?deleteRecordedCall(h.context,'one',calls[0])
    :operation==='link'?linkCallRecordReview(h.context,'review','one',opened)
    :restoreCallChange(h.context,'change-1',callRecoveryStamp({calls,state,settings}));
  assert.equal(result,false);assert.equal(h.snapshot(),expected);assert.equal(state,otherState);assert.equal(settings,otherSettings);assert.equal(calls,otherCalls);
});

test('128 seeded delete/recovery cycles conserve calls and reserves across live work, pending work, rejection and reload', t => {
  const h=fixture(t);let seed=20261024, checkpoints=0;
  const next=limit=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%limit;};
  for(let index=0;index<128;index++) {
    const original=clone(calls.find(call=>call.id==='one'));
    if(next(3)===0) {
      h.accepted=next(2)?false:'throw';const before=h.snapshot();
      assert.equal(deleteRecordedCall(h.context,'one',calls.find(call=>call.id==='one')),false);
      assert.equal(h.snapshot(),before);checkpoints++;
    }
    h.accepted=true;assert.equal(deleteRecordedCall(h.context,'one',calls.find(call=>call.id==='one')),true);
    const entry=state.callRecovery.at(-1).id, kind=next(3);
    if(kind===1)state.activeCall={startedAt:original.startISO};
    if(kind===2)state.pendingLiveCallBackup={startedAtISO:original.startISO,endedAtISO:original.endISO};
    const stamp=callRecoveryStamp({calls,state,settings});h.accepted=next(3)===0?false:true;
    const before=h.snapshot(), shouldRestore=kind===0&&h.accepted;
    assert.equal(restoreCallChange(h.context,entry,stamp),shouldRestore);
    if(!shouldRestore)assert.equal(h.snapshot(),before);
    state.activeCall=null;state.pendingLiveCallBackup=null;h.accepted=true;
    if(!shouldRestore)assert.equal(restoreCallChange(h.context,entry,callRecoveryStamp({calls,state,settings})),true);
    h.context.saveAll();h.reload();
    assert.equal(calls.length,2);assert.equal(new Set(calls.map(call=>call.id)).size,2);
    assert.deepEqual(calls.find(call=>call.id==='one'),original);
    const assigned=settings.financeCategories.otro.rows.reduce((sum,row)=>sum+row.assignedAmount,0);
    const earned=calls.reduce((sum,call)=>sum+Number(call.pay),0);
    assert.ok(assigned<=earned+.004);assert.ok(state.callRecovery.length<=50);checkpoints++;
  }
  t.diagnostic(`${checkpoints} invariant checkpoints with actual call-recovery and finance cascades`);
});
