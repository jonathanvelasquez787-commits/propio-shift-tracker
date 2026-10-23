import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parse } from 'acorn';
import { configureCallsContext, restorePendingLiveCallBackup, requestCloseManualCallModal,
  hasPendingManualCallBackup, saveManualCall } from '../js/calls.js';
import { saveEditedCall } from '../js/call-recovery.js';
import { state, calls, settings, setAppState, setAppCalls, setAppSettings } from '../js/app-context.js';
import { acwCallRecord } from '../js/call-records.js';
import { restoreAutomaticGameChanges } from '../js/work-actions.js';

const at = minutes => new Date(Date.now() - minutes * 60000).toISOString();
const overlap = (a, b) => Date.parse(a.startISO) < Date.parse(b.endISO) && Date.parse(b.startISO) < Date.parse(a.endISO);
const canonical = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);

function fixture(t) {
  const oldDocument = globalThis.document, fields = new Map();
  globalThis.document = { getElementById: id => fields.get(id) || null, querySelectorAll: () => [] };
  t.after(() => { if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument; });
  setAppSettings({ marker: 'owner' }); setAppCalls([]);
  setAppState({ shiftStartedAt: at(20), shiftEndedAt: null, activeCall: null, activePause: null,
    pauseHistory: [{ id: 'interrupted' }], events: [{ id: 'auto' }, { id: 'pause-end' }, { id: 'unrelated' }], game: { xp: 20 },
    pendingLiveCallBackup: { startedAtISO: at(20), endedAtISO: at(10),
      candidate: { id: 'pending', customerId: 'Propio', callDate: '10/20/2026', startISO: at(20), endISO: at(10), durationMin: 10 },
      liveContext: { autoStartedShift: true, autoShiftEventId: 'auto', previousShiftStartedAt: at(120), previousShiftEndedAt: at(30),
        gameBeforeAutoShift: { xp: 7 }, interruptedPauseRollback: { pauseHistoryId: 'interrupted', pauseEndEventId: 'pause-end',
          pause: { type: 'break', startedAt: at(25) } } } } });
  const h = { accepted: true, allowed: true, writes: 0, closed: 0, messages: [], fields };
  const context = { appConfirm: (_message, run) => { h.confirm = run; }, saveAll: () => {
    h.writes++; if (h.accepted === 'throw') throw Error('storage'); return h.accepted;
  }, canPersistLocalChanges: () => h.allowed, render() {}, closeModal: () => h.closed++, openModal() {},
    renderRateTiles() {}, rateTilePerMin: () => .12, isoDateFromDayKey: () => '2026-10-20',
    dayKeyFromIsoDate: () => '10/20/2026', pad: n => String(n).padStart(2, '0'), formatHHMM: v => v,
    callDateKeyFromValue: v => v, todayCallDateKey: () => '10/20/2026', formatDuration: String,
    timeLabelFromDate: String, callsForDay: () => calls, toast: text => h.messages.push(text),
    MAX_CALL_DURATION_MIN: 1440, HIGHER_RATE_TIERS: {}, higherRateBonusForCall: () => null, makeLocalId: () => 'manual',
    callDedupeKey: call => call.id, callsOverlap: overlap, financeRunAutoFillCascade() {},
    getActiveDayKey: () => '10/20/2026', parseMoney: Number, onGameCallSaved() {}, onGameCallsChanged() {},
    toDateFromInputs: () => new Date(at(8)), autoStartShiftFromCalls() {},
  };
  configureCallsContext(context); restorePendingLiveCallBackup();
  h.context = context; h.snapshot = () => JSON.stringify({ state, calls, settings });
  return h;
}

for (const failure of [false, 'throw']) test(`pending-call discard rolls back a ${failure} save and can be retried`, t => {
  const h = fixture(t), before = h.snapshot(); h.accepted = failure;
  requestCloseManualCallModal();
  assert.equal(h.confirm(), false);
  assert.equal(h.snapshot(), before); assert.equal(hasPendingManualCallBackup(), true); assert.equal(h.closed, 0);
  h.accepted = true; requestCloseManualCallModal();
  assert.equal(h.confirm(), true); assert.equal(h.confirm(), false);
  assert.equal(state.pendingLiveCallBackup, null); assert.equal(hasPendingManualCallBackup(), false); assert.equal(h.closed, 1);
  assert.equal(state.game.xp, 7); assert.equal(state.activePause.type, 'break');
  assert.deepEqual(state.events.map(event => event.id), ['unrelated']); assert.equal(state.pauseHistory.length, 0);
});

for (const change of ['owner', 'activity', 'pending', 'stale']) test(`pending-call confirmation rejects ${change} without touching newer work`, t => {
  const h = fixture(t); requestCloseManualCallModal();
  if (change === 'owner') setAppSettings({ marker: 'another owner' });
  if (change === 'activity') state.activeCall = { startedAt: at(1) };
  if (change === 'pending') state.pendingLiveCallBackup.candidate.durationMin = 9;
  if (change === 'stale') h.allowed = false;
  const before = h.snapshot();
  assert.equal(h.confirm(), false); assert.equal(h.snapshot(), before); assert.equal(h.writes, 0); assert.equal(h.closed, 0);
});

test('editing a completed call cannot extend into an active live call', t => {
  const h = fixture(t); state.pendingLiveCallBackup = null; state.activeCall = { startedAt: at(5) };
  const original = { id: 'old', customerId: '1', startISO: at(20), endISO: at(10), callDate: '10/20/2026',
    callStart: '08:00 AM', durationMin: 10, pay: '1.20', billable: 'Yes', dropped: 'No', countsAsProductive: true };
  setAppCalls([original]);
  for (const [id, value] of Object.entries({ callEditDurationInput: '18', callEditPayInput: '2.16', callEditBillableInput: 'Yes', callEditDroppedInput: 'No' })) h.fields.set(id, { value });
  const context = { ...h.context, data: () => ({ state, calls, settings }), translateText: v => v,
    ui: (parts, ...values) => parts.reduce((out, part, i) => out + part + (values[i] ?? ''), ''),
    setCalls: setAppCalls, setState: setAppState, stateWithinBudget: () => true, reconcileLastCallEndedAt() {}, finishEdit() {} };
  const before = h.snapshot();
  assert.equal(saveEditedCall(context, 'old', { owner: settings, call: canonical(original) }), false);
  assert.equal(h.snapshot(), before); assert.equal(h.writes, 0);
  h.fields.get('callEditDurationInput').value = '14';
  assert.equal(saveEditedCall(context, 'old', { owner: settings, call: canonical(original) }), true);
  assert.equal(calls[0].durationMin, 14); assert.equal(state.activeCall.startedAt !== null, true);
});

test('a manual form opened before a live call starts cannot save overlapping time', t => {
  const h = fixture(t); state.pendingLiveCallBackup = null; state.activeCall = { startedAt: at(5) };
  for (const [id, value] of Object.entries({ manualCallDateInput: '2026-10-20', manualCallStartInput: '08:00',
    manualCallDurationInput: '6', manualCallPayInput: '.72', manualCallBillableInput: 'Yes', manualCallDroppedInput: 'No', manualCallCustomerIdInput: '1' })) h.fields.set(id, { value });
  const before = h.snapshot();
  assert.equal(saveManualCall(), false);
  assert.equal(h.snapshot(), before); assert.equal(h.writes, 0);
});

test('discarding a draft interrupted before its candidate was built ignores its bridge replay', t => {
  const h = fixture(t);
  state.pendingLiveCallBackup.candidate = null;
  state.pendingLiveCallBackup.liveContext.propioBridge = { callId: 'draft-before-candidate-123' };
  requestCloseManualCallModal(); assert.equal(h.confirm(), true);
  assert.ok(state.propioBridgeIgnoredCalls.some(item => item.callId === 'draft-before-candidate-123'));
});

test('ACW follows manual duration corrections while preserving the original official evidence', () => {
  const source = fs.readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');
  const node = parse(source, { ecmaVersion: 'latest', sourceType: 'module' }).body.find(node => node.type === 'FunctionDeclaration' && node.id.name === 'computeCurrentAcwStart');
  for (const correctedAgo of [15, 2]) {
    const call = { id: 'corrected', source: 'import', startISO: at(20), endISO: at(correctedAgo), manualCorrectionAt: at(1),
      records: { propio: { endISO: at(10), durationMin: 10 } } };
    const before = JSON.stringify(call);
    const h = vm.createContext({ state: { lastCallEndedAt: call.records.propio.endISO }, calls: [call],
      todayCallDateKey: () => '10/20/2026', dayWorkBounds: () => ({ live: true, start: new Date(at(30)) }),
      callsForDay: () => [call], dayPauseIntervals: () => [] });
    vm.runInContext(source.slice(node.start, node.end), h);
    assert.equal(h.computeCurrentAcwStart().toISOString(), call.endISO);
    assert.equal(acwCallRecord([call], call.endISO), call);
    assert.equal(JSON.stringify(call), before);
  }
});

test('reversing an automatic shift keeps later historical rewards and personal choices', () => {
  const before = { totalXp: 300, days: { today: { finalized: true, xp: 200, earnings: 10 } },
    ledger: { original: true }, accessories: ['old'], equipment: { hat: 'old' }, reinforcement: { claims: [] } };
  const started = { totalXp: 100, days: { today: { reopened: true } },
    ledger: { original: true, reflex: true }, accessories: ['old', 'auto'], equipment: { hat: 'old' }, reinforcement: { claims: [] } };
  const current = structuredClone(started);
  current.totalXp += 50; current.days.history = { earnings: 8 }; current.days.today.earnings = 12;
  current.ledger.history = { applied: 50 }; current.accessories.push('historical'); current.equipment.hat = 'historical';
  current.reinforcement.claims.push({ id: 'claimed-later' });
  const result = restoreAutomaticGameChanges(current, before, started);
  assert.equal(result.totalXp, 350); assert.equal(result.days.today.finalized, true);
  assert.equal(result.days.today.earnings, 12); assert.deepEqual(result.days.history, { earnings: 8 });
  assert.equal(result.ledger.reflex, undefined); assert.equal(result.ledger.history.applied, 50);
  assert.deepEqual(result.accessories, ['old', 'historical']); assert.equal(result.equipment.hat, 'historical');
  assert.equal(result.reinforcement.claims[0].id, 'claimed-later');
  assert.deepEqual(restoreAutomaticGameChanges(started, before, started), before);
});

test('discarding a pending automatic call preserves rewards that arrived while it was under review', t => {
  const h=fixture(t), context=state.pendingLiveCallBackup.liveContext;
  context.gameBeforeAutoShift={totalXp:300,ledger:{original:true}};
  context.gameAfterAutoShift={totalXp:100,ledger:{original:true,reflex:true}};
  state.game={totalXp:150,ledger:{original:true,reflex:true,historical:{applied:50}}};
  requestCloseManualCallModal();assert.equal(h.confirm(),true);
  assert.equal(state.game.totalXp,350);assert.equal(state.game.ledger.historical.applied,50);
  assert.equal(state.game.ledger.reflex,undefined);
});
