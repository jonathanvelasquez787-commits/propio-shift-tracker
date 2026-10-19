import test from 'node:test';
import assert from 'node:assert/strict';
import { appendRecoveryEntry, recoveryEntries, callRecoveryPlan, callRecoveryStamp, restoreCallChange, deleteRecordedCall, clearRecordedDay, saveEditedCall } from '../js/call-recovery.js';
import { ui, translateText } from '../js/i18n.js';

const ago = minutes => new Date(Date.now() - minutes * 60000).toISOString();
const call = (id, minutes = 100, extra = {}) => ({ id, customerId: id, callDate: '10/19/2026', callStart: '08:00 AM',
  startISO: ago(minutes), endISO: ago(minutes - 10), durationMin: 10, pay: '1.20', billable: 'Yes', dropped: 'No', ...extra });
const overlap = (a, b) => Date.parse(a.startISO) < Date.parse(b.endISO) && Date.parse(a.endISO) > Date.parse(b.startISO);
const key = c => `${c.customerId}|${c.startISO}|${c.durationMin}|${c.pay}`;
const model = { MAX_CALL_DURATION_MIN: 1440, callsOverlap: overlap, callDedupeKey: key };
const record = (id, changes, extra = {}) => ({ id, kind: 'delete', at: ago(1), changes, ...extra });

function fixture(t) {
  let calls = [call('a', 100, { frozenHigherRateBonus: { windowId: 'gone', tier: 'gold', amount: .3 } }), call('b', 60)];
  let state = { events: [{ id: 'shift' }], pauseHistory: [], activePause: { type: 'break' }, lastCallEndedAt: calls[1].endISO };
  let settings = { financeCategories: { expenses: { rows: [{ assignedAmount: 2 }] } } }, sequence = 0;
  const h = { accepted: true, allowed: true, stateFits: true, writes: 0, games: [], messages: [], closed: 0, endedEdit: 0, saved: null, confirm: null };
  const context = { ...model, ui, translateText, data: () => ({ state, settings, calls }),
    setState: value => { state = value; }, setCalls: value => { calls = value; }, makeLocalId: () => `change-${++sequence}`,
    canPersistLocalChanges: () => h.allowed, stateWithinBudget: () => h.stateFits,
    financeRunAutoFillCascade: () => { settings.financeCategories.expenses.rows[0].assignedAmount = .1; },
    reconcileLastCallEndedAt: () => { state.lastCallEndedAt = calls.at(-1)?.endISO || null; },
    higherRateBonusForCall: c => c.frozenHigherRateBonus ? { amount: .03 * Number(c.durationMin) } : null,
    parseMoney: value => Number(value), callDateKeyFromValue: value => value, getActiveDayKey: () => '10/19/2026', formatCallDayLabel: value => value,
    saveAll() { h.writes++; if (h.accepted === 'throw') throw Error('storage'); if (!h.accepted) return false; h.saved = JSON.stringify({ state, settings, calls }); return true; },
    onGameCallsChanged(day) { assert.ok(h.saved); h.games.push(day); }, render() {}, toast: message => h.messages.push(message),
    appConfirm: (message, run) => { h.confirm = { message, run }; }, closeModal: () => h.closed++, finishEdit: () => h.endedEdit++,
  };
  h.context = context; h.data = context.data; h.snapshot = () => JSON.stringify(context.data());
  h.reload = () => { ({ state, settings, calls } = JSON.parse(h.saved)); };
  return h;
}

test('call recovery restores a deletion after reload with frozen bonus and unrelated later calls intact', t => {
  const h = fixture(t), removed = structuredClone(h.data().calls[0]);
  assert.equal(deleteRecordedCall(h.context, removed.id, removed), true);
  assert.equal(h.data().calls.length, 1); assert.equal(h.data().state.callRecovery.length, 1);
  assert.equal(h.data().state.callRecovery[0].changes[0].beforeBonus, .3);
  h.reload(); const later = call('later', 20); h.data().calls.push(later);
  const stamp = callRecoveryStamp(h.data());
  assert.equal(restoreCallChange(h.context, 'change-1', stamp), true);
  assert.deepEqual(h.data().calls.find(c => c.id === removed.id), removed);
  assert.deepEqual(h.data().calls.find(c => c.id === later.id), later);
  assert.equal(h.data().state.events[0].id, 'shift'); assert.equal(h.data().state.activePause.type, 'break');
  assert.ok(h.data().state.callRecovery[0].restoredAt);
  assert.equal(h.data().state.callRecovery[1].kind, 'restore');
  assert.equal(restoreCallChange(h.context, 'change-1', stamp), false);
  assert.equal(restoreCallChange(h.context, 'change-1', callRecoveryStamp(h.data())), false);
  h.reload(); assert.equal(h.data().calls.length, 3); assert.equal(h.data().state.callRecovery.length, 2);
});

for (const failure of [false, 'throw', 'budget', 'stale']) test(`recovery rejects ${failure} without losing calls, bonuses, finance or history`, t => {
  const h = fixture(t), removed = h.data().calls[0];
  assert.equal(deleteRecordedCall(h.context, removed.id, removed), true);
  const before = h.snapshot(), games = h.games.length;
  if (failure === 'budget') h.stateFits = false;
  else if (failure === 'stale') h.allowed = false;
  else h.accepted = failure;
  assert.equal(restoreCallChange(h.context, 'change-1', callRecoveryStamp(h.data())), false);
  assert.equal(h.snapshot(), before); assert.equal(h.games.length, games);
  h.accepted = true; h.stateFits = true; h.allowed = true;
  assert.equal(restoreCallChange(h.context, 'change-1', callRecoveryStamp(h.data())), true);
});

test('failed deletion retains the actual call and records no recoverable change', t => {
  const h = fixture(t), before = h.snapshot(); h.accepted = false;
  assert.equal(deleteRecordedCall(h.context, 'a', h.data().calls[0]), false);
  assert.equal(h.snapshot(), before); assert.equal(h.games.length, 0);
});

test('recovery preview cannot replace a changed call, owner, state or later snapshot', t => {
  for (const change of ['calls', 'state', 'settings']) {
    const h = fixture(t), deleted = h.data().calls[0]; deleteRecordedCall(h.context, deleted.id, deleted);
    const stamp = callRecoveryStamp(h.data());
    if (change === 'calls') h.data().calls.push(call('later', 20));
    if (change === 'state') h.data().state.callRecovery.push({ id: 'later' });
    if (change === 'settings') h.data().settings.exchangeRate = 28;
    const before = h.snapshot();
    assert.equal(restoreCallChange(h.context, 'change-1', stamp), false); assert.equal(h.snapshot(), before);
  }
  const h = fixture(t); deleteRecordedCall(h.context, 'a', h.data().calls[0]);
  const stamp = callRecoveryStamp(h.data()); h.reload();
  assert.equal(restoreCallChange(h.context, 'change-1', stamp), false, 'reloaded references do not reuse a previous-account preview');
});

test('recovering a batch refuses partial restoration when one call returned, overlaps or has a corrected version', () => {
  const a = call('a', 100), b = call('b', 60), entry = record('batch', [{ id: 'a', before: a, after: null }, { id: 'b', before: b, after: null }]);
  const before = JSON.stringify(entry);
  assert.equal(callRecoveryPlan([a], entry, model).reason, 'changed');
  assert.equal(callRecoveryPlan([call('official', 100, { customerId: 'a', durationMin: 0, startISO: a.startISO, endISO: a.startISO })], entry, model).reason, 'overlap');
  assert.equal(callRecoveryPlan([call('other', 99)], entry, model).reason, 'overlap');
  assert.equal(callRecoveryPlan([], entry, { ...model, activeCall: { startedAt: ago(101) } }).reason, 'overlap');
  assert.equal(JSON.stringify(entry), before);
  const edited = record('edit', [{ id: 'a', before: a, after: { ...a, pay: '2.00' } }], { kind: 'edit' });
  assert.equal(callRecoveryPlan([{ ...a, pay: '2.01' }], edited, model).reason, 'changed');
  assert.equal(callRecoveryPlan([edited.changes[0].after, b], edited, model).calls.find(c => c.id === 'a').pay, '1.20');
});

test('recovery keeps unrelated live activity that arrived after the preview and rechecks any new active-call overlap', t => {
  const h = fixture(t), removed = h.data().calls[0]; deleteRecordedCall(h.context, removed.id, removed);
  const stamp = callRecoveryStamp(h.data());
  h.data().state.events.push({ id: 'new-activity' }); h.data().state.activePause = { type: 'lunch', startedAt: ago(5) };
  assert.equal(restoreCallChange(h.context, 'change-1', stamp), true);
  assert.equal(h.data().state.events.at(-1).id, 'new-activity'); assert.equal(h.data().state.activePause.type, 'lunch');
  const blocked = fixture(t), call = blocked.data().calls[0]; deleteRecordedCall(blocked.context, call.id, call);
  const preview = callRecoveryStamp(blocked.data()); blocked.data().state.activeCall = { startedAt: ago(101) };
  const before = blocked.snapshot();
  assert.equal(restoreCallChange(blocked.context, 'change-1', preview), false); assert.equal(blocked.snapshot(), before);
});

test('clearing a day preserves its activities, binds confirmation and saves one reversible batch', t => {
  const h = fixture(t), before = h.snapshot();
  clearRecordedDay(h.context, '10/19/2026'); assert.equal(h.snapshot(), before);
  assert.match(h.confirm.message, /30/); h.data().calls.push(call('later', 20));
  assert.equal(h.confirm.run(), false); assert.equal(h.writes, 0);
  clearRecordedDay(h.context, '10/19/2026');
  assert.equal(h.confirm.run(), true); assert.equal(h.confirm.run(), false);
  assert.equal(h.data().calls.length, 0); assert.equal(h.data().state.events.length, 1); assert.equal(h.data().state.activePause.type, 'break');
  assert.equal(h.data().state.callRecovery[0].changes.length, 3);
  assert.equal(restoreCallChange(h.context, 'change-1', callRecoveryStamp(h.data())), true);
  assert.equal(h.data().calls.length, 3);
});

test('recovery retention is bounded, excludes expired or malformed entries and never mutates earlier history', () => {
  const a = call('a'), entry = record('one', [{ id: 'a', before: a, after: null }]), expired = { ...entry, id: 'expired', at: new Date(Date.now() - 31 * 86400000).toISOString() };
  const source = [expired, entry], before = JSON.stringify(source);
  let history = source;
  for (let index = 0; index < 55; index++) history = appendRecoveryEntry(history, { ...entry, id: `next-${index}` });
  assert.equal(history.length, 50); assert.equal(history[0].id, 'next-5');
  history[0].restoredAt = ago(0); assert.equal(JSON.stringify(source), before);
  assert.equal(recoveryEntries([null, {}, { ...entry, changes: [{ id: 'a', before: {}, after: null }] }, expired]).length, 0);
  assert.equal(callRecoveryPlan([], expired, model).reason, 'unavailable');
  assert.equal(appendRecoveryEntry(source, { ...entry, changes: [{ id: 'a', before: { ...a, large: 'x'.repeat(400000) }, after: null }] }), null);
});

test('edited call persistence stays in the editor on failure, then records before and after for a safe undo', t => {
  const h = fixture(t), original = structuredClone(h.data().calls[0]);
  const canonical = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
  const previous = globalThis.document;
  const inputs = { callEditDurationInput: { value: '5' }, callEditPayInput: { value: '.60' }, callEditBillableInput: { value: 'Yes' }, callEditDroppedInput: { value: 'No' } };
  globalThis.document = { getElementById: key => inputs[key] };
  t.after(() => { if (previous === undefined) delete globalThis.document; else globalThis.document = previous; });
  const opened = { owner: h.data().settings, call: canonical(original) }, before = h.snapshot();
  h.accepted = false;
  assert.equal(saveEditedCall(h.context, 'a', opened), false); assert.equal(h.snapshot(), before); assert.equal(h.closed, 0);
  h.accepted = true;
  assert.equal(saveEditedCall(h.context, 'a', opened), true); assert.equal(h.closed, 1);
  assert.equal(h.data().calls.find(c => c.id === 'a').durationMin, 5);
  assert.equal(h.data().state.callRecovery[0].changes[0].afterBonus, .15);
  assert.equal(saveEditedCall(h.context, 'a', opened), false, 'the old editor cannot overwrite its newer version');
  assert.equal(restoreCallChange(h.context, 'change-2', callRecoveryStamp(h.data())), true);
  assert.deepEqual(h.data().calls.find(c => c.id === 'a'), original);
});

test('a newer deleted-call version or a future edited end cannot create a recovery record', t => {
  const h = fixture(t), original = structuredClone(h.data().calls[0]);
  h.data().calls[0].pay = '2.00';
  assert.equal(deleteRecordedCall(h.context, original.id, original), false); assert.equal(h.writes, 0);
  const canonical = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
  const previous = globalThis.document;
  const inputs = { callEditDurationInput: { value: '500' }, callEditPayInput: { value: '2.00' } };
  globalThis.document = { getElementById: key => inputs[key] };
  t.after(() => { if (previous === undefined) delete globalThis.document; else globalThis.document = previous; });
  const before = h.snapshot();
  assert.equal(saveEditedCall(h.context, original.id, { owner: h.data().settings, call: canonical(h.data().calls[0]) }), false);
  assert.equal(h.snapshot(), before); assert.equal(h.writes, 0); assert.equal(h.closed, 0);
});
