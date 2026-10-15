import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parse } from 'acorn';
import { ui, translateText, setLanguage } from '../js/i18n.js';
import { calls, settings, state, setAppCalls, setAppSettings, setAppState } from '../js/app-context.js';
import { configureCallsContext, saveManualCall, updateManualCallPreview, openCallEditor, saveCallEditor, deleteCallRecord, clearActiveDayCalls, autoSaveLiveCall, restorePendingLiveCallBackup } from '../js/calls.js';
import { configureFinanceContext, financeRunAutoFillCascade, financeApplySignedAmount, financeResetRow } from '../js/finance.js';
import { addFinancePayment, deleteFinancePayment, saveFinanceSavingsMonths } from '../js/finance-planning.js';
import { financeMonthTotals } from '../js/finance-plan-model.js';
import { configureHigherRateContext, higherRateBonusForCall, higherRateBonusForCalls, higherRateBonusBreakdownForCalls } from '../js/higher-rate.js';
import { configureGameContext, createDefaultGameState, computeGameDay, onGameCallsChanged } from '../js/game.js';
import { configurePositiveReinforcementContext } from '../js/positive-reinforcement.js';
import { withSilentCallFeedback, callFeedbackSilenced } from '../js/call-feedback.js';

const source = fs.readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');
const declarations = new Map(parse(source, { ecmaVersion: 'latest', sourceType: 'module' }).body.map(node => node.declaration || node).filter(node => node.type === 'FunctionDeclaration').map(node => [node.id.name, source.slice(node.start, node.end)]));
const functions = ['pad', 'dateKey', 'todayRange', 'todayCallDateKey', 'callDateKeyFromValue', 'callDateToDate', 'dayKeyFromIsoDate', 'isoDateFromDayKey', 'sameCallDay', 'toDateFromInputs', 'toMinutes', 'formatHHMM', 'timeLabel', 'timeLabelFromDate', 'parseMoney', 'callsOverlap', 'callDedupeKey', 'parseCalls', 'isReplaceableLiveCall', 'sameImportedCallIdentity', 'importCalls', 'importedCallStats', 'accountingExportDays', 'getDailyGoalOverride', 'effectiveDailyGoal', 'setDailyGoalOverride', 'dayEvents', 'dayShiftBounds', 'dayShiftSessions', 'previousCalendarDay', 'mergeIntervals', 'connectedMinutesForDay'];
const at = (day, clock = '12:00') => new Date(`2025-09-${String(day).padStart(2, '0')}T${clock}:00`);
const tiers = { bronze: { bonusPerMin: .01 }, silver: { bonusPerMin: .02 }, gold: { bonusPerMin: .03 } };

test('official bridge synchronization is silent while the live finish and manual paste retain their sounds', t => {
  const x = harness(t); x.advance(at(2, '19:00'));
  autoSaveLiveCall(at(1, '09:00').toISOString(), at(1, '09:10').toISOString());
  assert.deepEqual(x.soundEvents, ['callEnded']);
  const tree = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
  const receiver = tree.body.find(node => node.declaration?.declarations?.[0]?.id.name === 'applyPropioBridgeEvent');
  const callback = receiver.declaration.declarations[0].init.arguments[0].properties.find(node => node.key.name === 'importHistory').value;
  const muted = [];
  x.h.withSilentCallFeedback = withSilentCallFeedback; x.h.portalRecordsText = value => value;
  x.h.onGameCallsChanged = () => muted.push(callFeedbackSilenced());
  const importHistory = vm.runInContext(`(${source.slice(callback.start, callback.end)})`, x.h);
  const row = '91434\t09/01/2025\t09:00 AM\t10\tYes\tNo\t$1.20';
  assert.equal(importHistory(row), true); assert.equal(calls.length, 1);
  assert.equal(importHistory(row), true); assert.equal(calls.length, 1);
  assert.equal(importHistory(row.replace('$1.20', '$1.25')), true); assert.equal(calls.length, 1);
  assert.deepEqual(x.soundEvents, ['callEnded']); assert.ok(muted.length > 0); assert.ok(muted.every(Boolean));
  assert.equal(callFeedbackSilenced(), false);
  x.import([['two', '09/01/2025', '09:30 AM', '10', 'Yes', 'No', '$1.20']]);
  assert.deepEqual(x.soundEvents, ['callEnded', 'callPasted']); assert.equal(muted.at(-1), false);
});

test('extension live saves and catch-up are discreet while ordinary live and manual saves keep feedback', t => {
  const x = harness(t); x.advance(at(2, '19:00'));
  const context = { propioBridge: { callId: 'discreet-bridge-call-123', timingEstimated: true, payEstimated: true } };
  assert.equal(autoSaveLiveCall(at(1, '09:00').toISOString(), at(1, '09:10').toISOString(), context), true);
  assert.equal(calls.length, 1); assert.deepEqual(x.messages, []); assert.deepEqual(x.soundEvents, []);
  assert.equal(x.gameSaved.length, 1); assert.equal(callFeedbackSilenced(), false);
  x.reload(); assert.equal(calls.length, 1);
  autoSaveLiveCall(at(1, '09:30').toISOString(), at(1, '09:40').toISOString());
  assert.deepEqual(x.soundEvents, ['callEnded']); assert.equal(x.messages.length, 1);
});

test('the actual tool plan exports planned Break/Lunch even with no active pause, respects shifted planning and midnight', t => {
  const x=harness(t); x.advance(at(1,'09:05'));
  const h=x.h; h.localStorageRevision={isCurrent:()=>true}; h.getDayNote=()=>null; h.referenceDurationMinForActivePause=()=>null;
  h.computeCurrentAcwStart=()=>null;
  let config={off:false,start:'06:00',end:'14:00',blocks:[{type:'break',start:'09:00',dur:15},{type:'lunch',start:'12:00',dur:60}]};
  h.dayConfigFor=()=>config;
  vm.runInContext(['getPropioBridgePlan','getShiftWindow','dateAtTime','getEffectiveScheduleForDay','reinforcementScheduleIntervals','buildPlannedSlots'].map(name=>declarations.get(name)).join('\n'),h);
  const periods=()=>JSON.parse(JSON.stringify(h.getPropioBridgePlan().scheduledPauses));
  assert.deepEqual(periods(),[{type:'break',startedAt:at(1,'09:00').toISOString(),endedAt:at(1,'09:15').toISOString()},
    {type:'lunch',startedAt:at(1,'12:00').toISOString(),endedAt:at(1,'13:00').toISOString()}]);
  assert.equal(Boolean(state.activePause),false);
  state.shiftStartedAt=at(1,'09:00').toISOString(); settings.lateArrivalMode='shift';
  assert.equal(periods()[0].startedAt,at(1,'12:00').toISOString());
  settings.lateArrivalMode='anchor'; config={off:false,start:'22:00',end:'06:00',blocks:[{type:'lunch',start:'23:45',dur:30}]};
  state.shiftStartedAt=at(1,'22:00').toISOString(); x.advance(at(2,'00:00'));
  assert.deepEqual(periods(),[{type:'lunch',startedAt:at(1,'23:45').toISOString(),endedAt:at(2,'00:15').toISOString()}]);
});

test('background official recovery preserves drafts and selected day, imports zero rows once and updates the same corrected identity', t => {
  const x = harness(t); x.advance(at(2,'19:00'));
  x.element('callInput').value = 'unfinished manual paste'; state.activeDayKey = '08/31/2025';
  const raw = '91434\t09/01/2025\t11:54 AM\t0\tYes\tNo\t$0.00\n72601\t09/01/2025\t11:52 AM\t0\tYes\tNo\t$0.00';
  assert.equal(x.h.importCalls(raw),true); assert.equal(calls.length,2);
  const original = calls.find(call=>call.customerId==='91434').id;
  assert.equal(x.element('callInput').value,'unfinished manual paste'); assert.equal(state.activeDayKey,'08/31/2025');
  assert.equal(x.h.importCalls(raw),true); assert.equal(calls.length,2); assert.deepEqual(x.messages,[]);
  assert.equal(x.h.importCalls('91434\t09/01/2025\t11:54 AM\t5\tYes\tNo\t$0.60'),true);
  assert.equal(calls.length,2); assert.equal(calls.find(call=>call.customerId==='91434').id,original);
  x.reload(); assert.equal(calls.length,2); assert.equal(calls.find(call=>call.customerId==='91434').durationMin,5);
});

test('background recovery holds a whole conflicting batch without partially importing or clearing the draft', t => {
  const x = harness(t); x.advance(at(2,'19:00')); x.manual('09/01/2025','08:00',10,'1.20','manual');
  x.element('callInput').value = 'draft'; const before = JSON.stringify(calls);
  assert.equal(x.h.importCalls('1\t09/01/2025\t9:00 AM\t5\tYes\tNo\t$0.60\n2\t09/01/2025\t8:05 AM\t5\tYes\tNo\t$0.60'),false);
  assert.equal(JSON.stringify(calls),before); assert.equal(x.element('callInput').value,'draft');
});

function harness(t) {
  setLanguage('en');
  const previousDocument = globalThis.document;
  const originalNow = Date.now;
  const inputs = new Map();
  const element = id => { if (!inputs.has(id)) inputs.set(id, { value: '', dataset: {}, style: {}, classList: { contains: () => false, add() {}, remove() {} }, setAttribute() {} }); return inputs.get(id); };
  const document = { getElementById: element, querySelectorAll: () => [] };
  globalThis.document = document;
  let clock = at(1, '19:00').getTime(), sequence = 0, persisted, saves = 0;
  const gameSaved = [], soundEvents = [];
  Date.now = () => clock;
  t.after(() => { Date.now = originalNow; if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument; });
  class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : [clock])); } static now() { return clock; } }
  setAppState({ shiftStartedAt: null, shiftEndedAt: null, events: [], pauseHistory: [], activeDayKey: '09/01/2025', pendingLiveCallBackup: null });
  setAppCalls([]);
  setAppSettings({ rate: .12, productiveGoalMin: 40, earningsGoal: 4.8, higherRateWindows: [], financeAutoFill: true, financeCategories: { otro: { rows: [] } }, customFinanceCategories: [] });
  let rejectSave=false;
  const messages=[];
  const save = () => { if(rejectSave)return false; persisted = JSON.stringify({ calls, settings, state }); saves++; return true; };
  const h = { Date: ClockDate, ui, translateText, document, escapeHtml: String, MAX_CALL_DURATION_MIN: 1440, CONNECTED_LIVE_GRACE_MIN: 90,
    makeLocalId: () => `id-${++sequence}`, setAppCalls, higherRateBonusForCall, higherRateBonusForCalls, higherRateBonusBreakdownForCalls,
    callsForDay: key => calls.filter(c => c.callDate === key),
    getActiveDayKey: () => state.activeDayKey, defaultActiveDayKey: () => h.todayCallDateKey(),
    toast:message=>messages.push(message), saveAll: save, financeRunAutoFillCascade, autoStartShiftFromCalls() {}, playCallSavedSound:kind=>soundEvents.push(kind),
    migratePositiveCallIdReferences() {}, migrateGameCallReferences() {}, onGameCallSaved: call => gameSaved.push(call.id), onGameCallsChanged() {},
    setEvent: (...args) => state.events.push(args), renderImportSkippedSummary() {}, callImportFlag: () => null,
    dayIsEffectivelyOff: key => new Date(h.callDateToDate(key)).getDay() === 0, dayAdherence: () => null,
    productiveMinutesForDay: key => h.importedCallStats(h.callsForDay(key), key).productive,
    dayGapTotals: () => ({ acwTotal: 0, rawGapTotal: 0, possiblePauseTotal: 0, breakTotal: 0, lunchTotal: 0, otherTotal: 0, gapCount: 0, gapLongest: 0 }),
  };
  Object.defineProperties(h, { calls: { get: () => calls }, settings: { get: () => settings }, state: { get: () => state } });
  vm.createContext(h);
  vm.runInContext(functions.map(name => { assert.ok(declarations.has(name), name); return declarations.get(name); }).join('\n'), h);
  configureHigherRateContext({ ...h, HIGHER_RATE_TIERS: tiers, HIGHER_RATE_EARLY_GRACE_MIN: 5 });
  configureFinanceContext({ parseMoney: h.parseMoney, higherRateBonusForCalls, saveSettingsOnly: save, render() {}, money: x => x.toFixed(2), convertedAmountText: () => '', toast:h.toast, makeLocalId:h.makeLocalId, appConfirm:(_message, run)=>run() });
  configureCallsContext({ ...h, HIGHER_RATE_TIERS: tiers, MAX_CALL_DURATION_MIN: 1440, money: x => x.toFixed(2), convertedAmountText: () => '', financeConvertedInline: () => '', formatDuration: x => String(x), rateTilePerMin: () => settings.rate, renderRateTiles() {}, formatCallDayLabel: x => x,
    closeModal() {}, openModal() {}, appConfirm: (_message, fn) => fn() });
  return { h, inputs, element, gameSaved, messages, soundEvents, rejectSave:()=>{rejectSave=true;},
    advance: date => { clock = date.getTime(); }, saves: () => saves,
    reload() { const snap = JSON.parse(persisted); setAppCalls(snap.calls); setAppState(snap.state); setAppSettings(snap.settings); },
    import(rows) { element('callInput').value = rows.map(row => row.join('\t')).join('\n'); h.importCalls(); },
    manual(day, time, duration, pay = '', customer = 'manual') {
      for (const [id, value] of Object.entries({ manualCallDateInput: h.isoDateFromDayKey(day), manualCallStartInput: time, manualCallDurationInput: String(duration), manualCallPayInput: String(pay), manualCallCustomerIdInput: customer, manualCallBillableInput: 'Yes', manualCallDroppedInput: 'No' })) element(id).value = value;
      saveManualCall();
    },
  };
}

test('a rejected manual call save does not announce success or award its reward',t=>{
  const x=harness(t);x.advance(at(2,'19:00'));x.rejectSave();
  x.manual('09/01/2025','08:00',10);
  assert.equal(x.saves(),0);assert.deepEqual(x.gameSaved,[]);
  assert.equal(calls.length,1);assert.deepEqual(x.messages,[]);
  assert.deepEqual(x.soundEvents,[]);
});

test('manual and live save sounds fire after persistence and never for duplicates or edits',t=>{
  const x=harness(t);x.advance(at(2,'19:00'));x.manual('09/01/2025','08:00',10,'1.20');assert.deepEqual(x.soundEvents,['callManual']);
  x.manual('09/01/2025','08:00',10,'1.20');assert.deepEqual(x.soundEvents,['callManual']);
  openCallEditor(calls[0].id);x.element('callEditPayInput').value='2';saveCallEditor();assert.deepEqual(x.soundEvents,['callManual']);
  autoSaveLiveCall(at(1,'09:00').toISOString(),at(1,'09:10').toISOString());assert.deepEqual(x.soundEvents,['callManual','callEnded']);
  x.reload();assert.deepEqual(x.soundEvents,['callManual','callEnded']);
});

test('distinct bridge calls in the same displayed minute save separately while overlaps and repeated IDs still block', t => {
  const x = harness(t), base = at(1, '09:00').getTime();
  const iso = seconds => new Date(base + seconds * 1000).toISOString();
  const context = id => ({ propioBridge: { callId: id, timingEstimated: true, payEstimated: true } });
  assert.equal(autoSaveLiveCall(iso(0), iso(20), context('first-bridge-call-123')), true);
  assert.equal(autoSaveLiveCall(iso(30), iso(50), context('second-bridge-call-123')), true);
  assert.equal(calls.length, 2); assert.equal(calls[0].callStart, calls[1].callStart);
  assert.equal(state.pendingLiveCallBackup, null);
  x.reload(); assert.equal(calls.length, 2);
  assert.equal(autoSaveLiveCall(iso(35), iso(55), context('overlapping-call-123')), false);
  state.pendingLiveCallBackup = null;
  assert.equal(autoSaveLiveCall(iso(70), iso(90), context('first-bridge-call-123')), false);
  assert.equal(calls.length, 2);
});

test('a pasted batch sounds once only after a changed import is saved',t=>{
  const x=harness(t);x.advance(at(2,'19:00'));
  const batch=[['one','09/01/2025','08:00 AM','10','Yes','No','$1.20'],['two','09/01/2025','08:30 AM','10','Yes','No','$1.20']];
  x.import(batch);assert.equal(calls.length,2);assert.deepEqual(x.soundEvents,['callPasted']);
  x.import(batch);assert.deepEqual(x.soundEvents,['callPasted']);
  x.rejectSave();x.import([['three','09/01/2025','09:00 AM','10','Yes','No','$1.20']]);assert.deepEqual(x.soundEvents,['callPasted']);
});

test('live save rejection and backup wait are silent while a saved live backup uses the ended sound',t=>{
  const x=harness(t);x.advance(at(2,'19:00'));x.manual('09/01/2025','08:00',10,'1.20');x.soundEvents.length=0;
  autoSaveLiveCall(at(1,'08:05').toISOString(),at(1,'08:15').toISOString());assert.deepEqual(x.soundEvents,[]);assert.ok(state.pendingLiveCallBackup);
  x.manual('09/01/2025','10:00',10,'1.20');assert.deepEqual(x.soundEvents,['callEnded']);
  x.rejectSave();autoSaveLiveCall(at(1,'11:00').toISOString(),at(1,'11:10').toISOString());assert.deepEqual(x.soundEvents,['callEnded']);
});

test('manual and edited numeric payment inputs respect scientific notation without changing the imported-money parser', t => {
  const x = harness(t); x.advance(at(2,'19:00'));
  x.manual('09/01/2025','08:00',10,'1e-2');
  assert.equal(calls[0].pay,'0.01');
  openCallEditor(calls[0].id); x.element('callEditPayInput').value='1e3'; saveCallEditor();
  assert.equal(calls[0].pay,'1000.00');
  assert.equal(x.h.parseMoney('$1,234.50'),1234.5);
});

test('overflowing manual or edited payments cannot create or replace a call', t => {
  const x = harness(t); x.advance(at(2,'19:00'));
  x.manual('09/01/2025','08:00',10,'1e309'); assert.equal(calls.length,0);
  x.manual('09/01/2025','08:00',10,'1.20');
  const before=JSON.stringify(calls);
  openCallEditor(calls[0].id); x.element('callEditPayInput').value='1e309'; saveCallEditor();
  assert.equal(JSON.stringify(calls),before);
});

test('native bad numeric input cannot masquerade as an empty payment and use the estimated fallback', t => {
  const x = harness(t); x.advance(at(2,'19:00'));
  x.element('manualCallPayInput').validity={badInput:true};
  x.manual('09/01/2025','08:00',10,''); assert.equal(calls.length,0);
  x.element('manualCallPayInput').validity={badInput:false};
  x.manual('09/01/2025','08:00',10,''); assert.equal(calls[0].pay,'1.20');
  const before=JSON.stringify(calls);
  openCallEditor(calls[0].id); x.element('callEditPayInput').value=''; x.element('callEditPayInput').validity={badInput:true};
  saveCallEditor(); assert.equal(JSON.stringify(calls),before);
});

for (const [label, value, badInput] of [['empty', '', false], ['whitespace', ' ', false], ['native bad input', '', true]]) {
  test(`${label} manual duration cannot create a zero-minute call, while explicit zero remains valid`, t => {
    const x = harness(t); x.advance(at(2, '19:00'));
    x.element('manualCallDurationInput').validity = { badInput };
    x.manual('09/01/2025', '08:00', value);
    assert.equal(calls.length, 0);
    assert.equal(x.saves(), 0);
    assert.deepEqual(x.gameSaved, []);
    x.element('manualCallDurationInput').validity = { badInput: false };
    x.manual('09/01/2025', '08:00', 0);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].durationMin, 0);
  });

  test(`${label} edited duration cannot erase an existing call duration or its earnings`, t => {
    const x = harness(t); x.advance(at(2, '19:00'));
    x.manual('09/01/2025', '08:00', 10, '1.20');
    const before = JSON.stringify(calls), saves = x.saves();
    openCallEditor(calls[0].id);
    x.element('callEditDurationInput').value = value;
    x.element('callEditDurationInput').validity = { badInput };
    saveCallEditor();
    assert.equal(JSON.stringify(calls), before);
    assert.equal(x.saves(), saves);
    x.element('callEditDurationInput').value = '0';
    x.element('callEditDurationInput').validity = { badInput: false };
    saveCallEditor();
    assert.equal(calls[0].durationMin, 0);
  });
}

test('manual preview leaves the payment draft intact when duration is incomplete or native-invalid', t => {
  const x = harness(t);
  for (const badInput of [false, true]) {
    x.element('manualCallDurationInput').value = '';
    x.element('manualCallDurationInput').validity = { badInput };
    x.element('manualCallPayInput').value = '1.20';
    updateManualCallPreview();
    assert.equal(x.element('manualCallPayInput').value, '1.20');
    assert.ok(!x.element('manualCallPreviewText').textContent.includes('0'));
  }
});

test('an incomplete live-backup duration preserves its recorded candidate for correction and retry', t => {
  const x = harness(t); x.advance(at(2, '19:00'));
  const start = at(1, '08:00').toISOString(), end = at(1, '08:10').toISOString();
  autoSaveLiveCall(start, end); autoSaveLiveCall(start, end); deleteCallRecord(calls[0].id);
  assert.equal(restorePendingLiveCallBackup(), true);
  const before = JSON.stringify(state.pendingLiveCallBackup), saves = x.saves();
  x.element('manualCallDurationInput').value = '';
  saveManualCall();
  assert.equal(calls.length, 0);
  assert.equal(JSON.stringify(state.pendingLiveCallBackup), before);
  assert.equal(x.saves(), saves);
  x.element('manualCallDurationInput').value = '10';
  saveManualCall();
  assert.equal(calls[0].durationMin, 10);
});

test('a twelve-hour clock rejects hour zero instead of importing a different canonical time', t => {
  const x = harness(t);
  for (const time of ['0:00 AM', '00:30 PM']) {
    assert.equal(x.h.toDateFromInputs('09/01/2025', time), null);
    assert.equal(x.h.parseCalls(`42\t09/01/2025\t${time}\t10\tYes\tNo\t1.20`).length, 0);
  }
  assert.equal(x.h.toDateFromInputs('09/01/2025', '12:00 AM').getHours(), 0);
  assert.equal(x.h.toDateFromInputs('09/01/2025', '12:30 PM').getHours(), 12);
});

test('a rejected finance allocation save does not report Aplicado',t=>{
  const x=harness(t);setAppCalls([{id:'income',pay:'20'}]);
  settings.financeCategories.otro.rows=[{id:'blocked',targetAmount:20,assignedAmount:0,kind:'meta'}];
  x.rejectSave();assert.equal(financeApplySignedAmount('otro','blocked','12,50','plus'),false);
  assert.equal(x.saves(),0);assert.equal(settings.financeCategories.otro.rows[0].assignedAmount,0);
  assert.match(x.messages.at(-1),/could not be saved|no se pudo guardar/);
  assert.ok(x.messages.every(message=>!['Aplicado','Applied'].includes(message)));
});

test('official correction to zero minutes replaces the original and preserves its identity and frozen bonus', t => {
  const x = harness(t); x.advance(at(2, '19:00'));
  x.import([['42', '09/01/2025', '8:00 AM', 10, 'Yes', 'No', '1.20']]);
  const id = calls[0].id;
  const rewarded = x.gameSaved.length;
  calls[0].frozenHigherRateBonus = { tier: 'gold', windowId: 'removed', amount: .3 };
  x.import([['42', '09/01/2025', '8:00 AM', 0, 'No', 'Yes', '0.00']]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].id, id);
  assert.equal(calls[0].durationMin, 0);
  assert.equal(higherRateBonusForCall(calls[0]).amount, 0);
  assert.equal(x.gameSaved.length, rewarded);
  x.reload(); assert.equal(calls.length, 1);
  x.import([['42', '09/01/2025', '8:00 AM', 5, 'Yes', 'No', '.60']]);
  assert.equal(calls.length, 1); assert.equal(calls[0].id, id); assert.equal(calls[0].durationMin, 5);
});

test('successive corrections in one paste produce one final record, including live replacement migration', t => {
  const x = harness(t); x.advance(at(2, '19:00'));
  x.import([['42', '09/01/2025', '8:00 AM', 10, 'Yes', 'No', '1.20']]);
  const id = calls[0].id;
  x.import([['42', '09/01/2025', '8:00 AM', 11, 'Yes', 'No', '1.32'], ['42', '09/01/2025', '8:00 AM', 12, 'Yes', 'No', '1.44']]);
  assert.equal(calls.length, 1); assert.equal(calls[0].id, id); assert.equal(calls[0].durationMin, 12);
  setAppCalls([]);
  autoSaveLiveCall(at(1, '08:00').toISOString(), at(1, '08:10').toISOString());
  x.import([['42', '09/01/2025', '8:00 AM', 11, 'Yes', 'No', '1.32'], ['42', '09/01/2025', '8:00 AM', 12, 'Yes', 'No', '1.44']]);
  assert.equal(calls.length, 1); assert.equal(calls[0].source, 'import'); assert.equal(calls[0].pay, '1.44');
  setAppCalls([]);
  const before = x.gameSaved.length;
  x.import([['42', '09/01/2025', '8:00 AM', 11, 'Yes', 'No', '1.32'], ['42', '09/01/2025', '8:00 AM', 12, 'Yes', 'No', '1.44']]);
  assert.equal(calls.length, 1); assert.equal(calls[0].durationMin, 12);
  assert.equal(x.gameSaved.length, before + 1, 'one new call receipt for the final accepted correction');
});

test('restored overnight live backup retains the original accounting date after a different shift', t => {
  const x = harness(t); x.advance(at(2, '19:00'));
  state.shiftStartedAt = at(1, '23:00').toISOString();
  const start = at(2, '00:10').toISOString(), end = at(2, '00:20').toISOString();
  autoSaveLiveCall(start, end);
  assert.equal(calls[0].callDate, '09/01/2025');
  assert.equal(autoSaveLiveCall(start, end), false);
  deleteCallRecord(calls[0].id);
  state.shiftStartedAt = at(2, '08:00').toISOString();
  state.shiftEndedAt = null;
  x.h.saveAll(); x.reload();
  assert.equal(restorePendingLiveCallBackup(), true);
  saveManualCall();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].callDate, '09/01/2025');
  assert.equal(calls[0].calendarCallDate, '09/02/2025');
  assert.equal(calls[0].shiftDayKey, '09/01/2025');
});

test('manual allocation accepts the exact final displayed ten cents without allowing overspending', t => {
  harness(t);
  const row = { id: 'rent', categoryId: 'otro', kind: 'gasto', targetAmount: 1, assignedAmount: .2, priority: 1 };
  settings.financeCategories.otro.rows.push(row);
  setAppCalls([{ pay: .3 }]);
  financeApplySignedAmount('otro', 'rent', '.10', 'plus');
  assert.ok(Math.abs(row.assignedAmount - .3) < 1e-12);
  financeApplySignedAmount('otro', 'rent', '.01', 'plus');
  assert.ok(Math.abs(row.assignedAmount - .3) < 1e-12);
});

test('manual finance allocation interprets decimal commas without multiplying the amount and rejects malformed numbers',t=>{
  harness(t);
  const row={id:'decimal',categoryId:'otro',kind:'meta',targetAmount:3000,assignedAmount:0,priority:1};
  settings.financeCategories.otro.rows.push(row);setAppCalls([{pay:3000}]);
  financeApplySignedAmount('otro','decimal','12,50','plus');assert.equal(row.assignedAmount,12.5);
  financeApplySignedAmount('otro','decimal','1,234.50','plus');assert.equal(row.assignedAmount,1247);
  financeApplySignedAmount('otro','decimal','12,50','minus');assert.equal(row.assignedAmount,1234.5);
  for(const invalid of ['1e3','12abc50','1,2,3','12.50.00','Infinity']){
    financeApplySignedAmount('otro','decimal',invalid,'plus');assert.equal(row.assignedAmount,1234.5,invalid);
  }
});

test('automatic allocation covers all 601 rows and bypasses zero-target legacy expenses', t => {
  harness(t);
  const rows = settings.financeCategories.otro.rows;
  rows.push({ id: 'legacy-zero', categoryId: 'otro', kind: 'gasto', targetAmount: 0, assignedAmount: 0, priority: 0 });
  for (let i = 0; i < 601; i++) rows.push({ id: `rent-${i}`, categoryId: 'otro', kind: 'gasto', targetAmount: 1, assignedAmount: 0, priority: i + 1 });
  setAppCalls([{ pay: 601 }]);
  assert.equal(financeRunAutoFillCascade(), true);
  assert.equal(rows.reduce((sum, row) => sum + row.assignedAmount, 0), 601);
  assert.equal(financeRunAutoFillCascade(), false);
  rows.shift(); rows.forEach(row => { row.assignedAmount = 0; });
  assert.equal(financeRunAutoFillCascade(), true);
  assert.equal(rows.reduce((sum, row) => sum + row.assignedAmount, 0), 601);
});

test('multiple explicit sessions plus calls outside them count each real connected minute once', t => {
  const x = harness(t); x.advance(at(2, '19:00'));
  state.events = [['08:00', 'iniciado'], ['10:00', 'terminado'], ['12:00', 'iniciado'], ['14:00', 'terminado']]
    .map(([time, title]) => ({ type: 'shift', title: `Shift ${title}`, ts: at(1, time).toISOString(), meta: 'manual' })).reverse();
  state.shiftStartedAt = at(1, '12:00').toISOString(); state.shiftEndedAt = at(1, '14:00').toISOString();
  x.import([['1', '09/01/2025', '7:45 AM', 20, 'Yes', 'No', '2.40'], ['2', '09/01/2025', '9:00 AM', 10, 'Yes', 'No', '1.20'], ['3', '09/01/2025', '2:30 PM', 10, 'Yes', 'No', '1.20']]);
  assert.equal(x.h.connectedMinutesForDay('09/01/2025'), 265);
  const bounds = x.h.dayShiftBounds('09/01/2025');
  assert.equal(bounds.start.getTime(), at(1, '12:00').getTime());
  assert.equal(bounds.end.getTime(), at(1, '14:00').getTime());
  assert.equal(x.h.productiveMinutesForDay('09/01/2025'), 40);
});

test('a corrected zero-minute official call cannot expand across a different customer call', t => {
  const x = harness(t); x.advance(at(2, '19:00'));
  x.import([['1', '09/01/2025', '8:00 AM', 0, 'No', 'Yes', '0'], ['2', '09/01/2025', '8:05 AM', 10, 'Yes', 'No', '1.20']]);
  const originalIds = calls.map(c => c.id);
  x.import([['1', '09/01/2025', '8:00 AM', 20, 'Yes', 'No', '2.40']]);
  assert.deepEqual(calls.map(c => c.id), originalIds);
  assert.equal(calls[0].durationMin, 0);
});

test('a correction collapses only legacy zero-minute duplicates of its exact official identity', t => {
  const x = harness(t); x.advance(at(2, '19:00'));
  x.import([['42', '09/01/2025', '8:00 AM', 3, 'Yes', 'No', '.36']]);
  const original = { ...calls[0], frozenHigherRateBonus: { tier: 'gold', windowId: 'removed', amount: .09 } };
  const duplicate = { ...original, id: 'legacy-zero', durationMin: 0, pay: '0', endISO: original.startISO, countsAsProductive: false, importedAt: at(2, '08:00').toISOString() };
  delete duplicate.frozenHigherRateBonus;
  setAppCalls([original, duplicate]);
  x.import([['42', '09/01/2025', '8:00 AM', 5, 'Yes', 'No', '.60']]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].id, original.id);
  assert.equal(calls[0].durationMin, 5);
  assert.equal(higherRateBonusForCall(calls[0]).amount, .15);
  x.reload(); assert.equal(calls.length, 1);
  setAppCalls([original, duplicate, { ...original, id: 'different-customer', customerId: '99', startISO: at(1, '08:04').toISOString(), endISO: at(1, '08:07').toISOString(), durationMin: 3 }]);
  x.import([['42', '09/01/2025', '8:00 AM', 5, 'Yes', 'No', '.60']]);
  assert.equal(calls.length, 3, 'an unrelated overlapping call prevents the correction and its deduplication');
});

test('reimporting the existing official zero row heals legacy duplicates and rolls back current XP exactly once', t => {
  const x = harness(t); x.advance(at(1, '08:05'));
  x.import([['42', '09/01/2025', '8:00 AM', 3, 'Yes', 'No', '.36']]);
  const original = { ...calls[0], frozenHigherRateBonus: { tier: 'gold', windowId: 'removed', amount: .09 } };
  const duplicate = { ...original, id: 'legacy-zero', durationMin: 0, pay: '0.00', billable: 'No', dropped: 'Yes', endISO: original.startISO, countsAsProductive: false };
  delete duplicate.frozenHigherRateBonus;
  setAppCalls([original, duplicate]);
  const row = { id: 'rent', categoryId: 'otro', kind: 'gasto', targetAmount: 1, assignedAmount: .45, priority: 1 };
  settings.financeCategories.otro.rows.push(row);
  settings.game = { enabled: false, soundEnabled: false };
  state.game = createDefaultGameState();
  const day = '09/01/2025', receiptKey = `reinforce-call:${day}:${original.id}`;
  state.game.days[day] = { bonusXp: 10 };
  state.game.ledger[receiptKey] = { dayKey: day, gross: 10, applied: 10, amount: 10 };
  const common = { ...x.h, dayConfigFor: () => ({ blocks: [] }), weekdayKeyForDayKey: () => 'mon',
    saveStateOnly() {}, saveSettingsOnly() {}, closeModal() {}, openModal() {}, escapeHtml: String, formatMinutes: String,
    convertedAmountText: () => '', getReinforcementWorkIntervals: () => [] };
  configureGameContext(common); configurePositiveReinforcementContext(common);
  x.h.onGameCallsChanged = onGameCallsChanged;
  assert.ok(computeGameDay(day).xp > 0);
  const rewarded = x.gameSaved.length;
  const officialZero = [['42', day, '8:00 AM', 0, 'No', 'Yes', '0.00']];
  x.import(officialZero);
  assert.equal(calls.length, 1); assert.equal(calls[0].id, original.id);
  assert.equal(calls[0].durationMin, 0); assert.equal(x.h.importedCallStats(calls, day).earnings, 0);
  assert.equal(higherRateBonusForCall(calls[0]).amount, 0);
  assert.equal(row.assignedAmount, 0);
  assert.equal(state.game.days[day].bonusXp, 0); assert.equal(state.game.ledger[receiptKey].applied, 0);
  assert.equal(computeGameDay(day).xp, 0); assert.equal(x.gameSaved.length, rewarded);
  x.reload();
  const snapshot = JSON.stringify({ calls, state, settings }), saves = x.saves();
  x.import(officialZero);
  assert.equal(JSON.stringify({ calls, state, settings }), snapshot);
  assert.equal(x.saves(), saves);
});

test('an exact zero-minute official correction cannot replace an unrelated overlapping live call', t => {
  const x = harness(t); x.advance(at(2, '19:00'));
  x.import([['1', '09/01/2025', '8:00 AM', 0, 'No', 'Yes', '0']]);
  autoSaveLiveCall(at(1, '08:05').toISOString(), at(1, '08:15').toISOString());
  const before = JSON.stringify(calls), saves = x.saves();
  x.import([['1', '09/01/2025', '8:00 AM', 20, 'Yes', 'No', '2.40']]);
  assert.equal(JSON.stringify(calls), before);
  assert.equal(x.saves(), saves);
});

test('31 chronological days preserve an independent ledger through imports, manual/live calls, corrections, deletion, goals, and reloads', t => {
  const x = harness(t), model = new Map();
  const row = { id: 'rent', categoryId: 'otro', kind: 'gasto', targetAmount: 20, assignedAmount: 0, priority: 1 };
  settings.financeCategories.otro.rows.push(row, { id: 'save', categoryId: 'otro', kind: 'meta', targetAmount: 100, assignedAmount: 0, priority: 1 });
  let checks = 0;
  const remember = (customer, day, min, cents, bonusCents = 0) => model.set(`${day}:${customer}`, { day, min, cents, bonusCents });
  const validate = () => {
    const cents = [...model.values()].reduce((sum, item) => sum + item.cents + item.bonusCents, 0);
    const all = x.h.importedCallStats(calls, state.activeDayKey);
    assert.ok(Math.abs(all.earnings * 100 - cents) < 1e-7, `ledger at check ${checks}`);
    assert.equal(calls.length, model.size);
    assert.equal(new Set(calls.map(c => c.id)).size, calls.length);
    assert.equal(all.productive, [...model.values()].reduce((sum, item) => sum + item.min, 0));
    const assigned = settings.financeCategories.otro.rows.reduce((sum, r) => sum + r.assignedAmount, 0);
    assert.ok(Math.abs(assigned * 100 - Math.min(cents, 12000)) < 1e-7);
    checks++;
  };
  for (let day = 1; day <= 31; day++) {
    const date = new Date(2025, 8, day, 19), key = x.h.todayCallDateKey(date);
    x.advance(date); state.activeDayKey = key;
    state.shiftStartedAt = new Date(2025, 8, day, 8).toISOString(); state.shiftEndedAt = new Date(2025, 8, day, 17).toISOString();
    if (day % 7 !== 0) {
      settings.higherRateWindows.push({ id: `hr-${day}`, date: key, start: '09:00', end: '10:00', tier: 'gold' });
      const rows = [[String(day), key, '9:00 AM', 10, 'Yes', 'No', '1.20']];
      x.import(rows); remember(String(day), key, 10, 120, 30); validate();
      const before = x.saves(); x.import(rows); assert.equal(x.saves(), before); validate();
      x.manual(key, '11:00', 15, '1.80', `manual-${day}`); remember(`manual-${day}`, key, 15, 180); validate();
      autoSaveLiveCall(new Date(2025, 8, day, 14).toISOString(), new Date(2025, 8, day, 14, 5).toISOString()); remember(`live-${day}`, key, 5, 60); validate();
      if (day % 3 === 0) {
        x.import([[String(day), key, '9:00 AM', 8, 'Yes', 'No', '.96']]); remember(String(day), key, 8, 96, 24); validate();
      }
      if (day % 5 === 0) {
        const record = calls.find(c => c.customerId === `manual-${day}`);
        openCallEditor(record.id); x.element('callEditDurationInput').value = '10'; x.element('callEditPayInput').value = '1.20'; saveCallEditor(); remember(`manual-${day}`, key, 10, 120); validate();
      }
      if (day % 4 === 0) {
        deleteCallRecord(calls.find(c => c.customerId === `manual-${day}`).id); model.delete(`${key}:manual-${day}`); validate();
      }
      if (day === 26) { clearActiveDayCalls(); for (const [id, entry] of model) if (entry.day === key) model.delete(id); validate(); }
    }
    x.h.setDailyGoalOverride(key, { min: 50, usd: 6 }); assert.equal(x.h.effectiveDailyGoal(key).usd, 6);
    x.h.setDailyGoalOverride(key, null); assert.equal(x.h.effectiveDailyGoal(key).usd, 4.8);
    x.h.saveAll(); x.reload(); validate();
  }
  const range = { start: new Date(2025, 8, 1), end: new Date(2025, 9, 1) };
  const days = x.h.accountingExportDays(range);
  assert.equal(days.length, 31);
  for (const exported of days) {
    const expected = [...model.values()].filter(item => item.day === exported.dayKey);
    assert.equal(exported.dayCalls.length, expected.length);
    assert.ok(Math.abs(exported.stats.earnings * 100 - expected.reduce((sum, entry) => sum + entry.cents + entry.bonusCents, 0)) < 1e-7);
  }
  assert.ok(checks > 160, `only ${checks} checkpoints`);
  t.diagnostic(`${checks} accounting checkpoints, ${model.size} final calls, 31 persisted daily snapshots and 31 exported day reconciliations`);
});

test('31 daily call saves, currency changes, allocation resets and payment corrections preserve an independent monthly payment ledger', t => {
  const x = harness(t), ledger = new Map();
  settings.exchangeRate = 26.8; settings.currencyLabel = 'L';
  settings.financeCategories.otro.rows = [
    {id:'expense',name:'Recurring expense',categoryId:'otro',kind:'gasto',targetAmount:120,assignedAmount:0,priority:1},
    {id:'savings',name:'Savings',categoryId:'otro',kind:'meta',targetAmount:300,assignedAmount:0,priority:1}
  ];
  let checks = 0;
  for (let day = 1; day <= 31; day++) {
    const date = new Date(2026, 9, day, 19), key = x.h.todayCallDateKey(date);
    x.advance(date); state.activeDayKey = key;
    x.manual(key, '08:30', 10, '20.00', `month-${day}`);
    settings.currencyLabel = day % 2 ? 'L' : 'MX$';
    settings.exchangeRate = day % 2 ? 26.8 : 20;
    const row = settings.financeCategories.otro.rows[0];
    row.expenseType = day <= 15 ? 'variable' : 'fixed';
    const beforeAssigned = row.assignedAmount;
    const cents = day % 2 ? 100 : 200;
    assert.equal(addFinancePayment('otro', row.id, day % 2 ? '1' : '', day % 2 ? '' : '40', `2026-10-${String(day).padStart(2,'0')}`), true);
    ledger.set(settings.financePayments.at(-1).id, {cents, type:row.expenseType});
    assert.equal(row.assignedAmount, beforeAssigned);
    if (day % 7 === 0) financeResetRow('otro', row.id);
    if (day === 10 || day === 20) {
      const id = settings.financePayments[0].id;
      deleteFinancePayment(id); deleteFinancePayment(id); ledger.delete(id);
    }
    if (day === 16) assert.equal(saveFinanceSavingsMonths('otro','savings',12),true);
    x.h.saveAll(); x.reload();
    const totals = financeMonthTotals(settings.financeCategories.otro.rows.filter(r=>r.kind==='gasto'),settings.financePayments,'2026-10');
    const expected = [...ledger.values()];
    assert.equal(Math.round(totals.paid * 100), expected.reduce((sum,p)=>sum+p.cents,0));
    assert.equal(Math.round(totals.variable * 100), expected.filter(p=>p.type==='variable').reduce((sum,p)=>sum+p.cents,0));
    assert.equal(Math.round(totals.fixed * 100), expected.filter(p=>p.type==='fixed').reduce((sum,p)=>sum+p.cents,0));
    assert.equal(settings.financePayments.length, ledger.size);
    assert.equal(calls.length, day);
    assert.equal(Math.round(x.h.importedCallStats(calls,key).earnings * 100), day * 2000);
    assert.ok(settings.financeCategories.otro.rows.reduce((sum,r)=>sum+r.assignedAmount,0) <= day * 20);
    checks++;
  }
  assert.equal(settings.financeCategories.otro.rows[1].savingsMonths,12);
  assert.equal(financeMonthTotals([],settings.financePayments,'2026-11').paid,0);
  t.diagnostic(`${checks} monthly payment reconciliations after daily persistence; ${ledger.size} retained payments and 31 real manual-call handler saves`);
});

test('42 days across leap February preserve the ledger after incomplete entry, midnight imports, correction and reload', t => {
  const x = harness(t), ledger = new Map();
  settings.financeCategories.otro.rows = [{ id: 'reserve', categoryId: 'otro', kind: 'meta', targetAmount: 1000, assignedAmount: 0, priority: 1 }];
  const start = new Date(2024, 1, 1);
  for (let day = 0; day < 42; day++) {
    const now = new Date(2024, 1, 1 + day, 19), key = x.h.todayCallDateKey(now);
    x.advance(now); state.activeDayKey = key;
    settings.higherRateWindows.push({ id: `leap-${day}`, date: key, start: '00:00', end: '01:00', tier: 'gold' });
    x.import([[String(day), key, '12:00 AM', 10, 'Yes', 'No', '1.20']]);
    ledger.set(`official-${day}`, { key, min: 10, cents: 150 });
    const official = calls.find(call => call.customerId === String(day) && call.callDate === key);
    x.manual(key, '08:00', 20, '2.40', `manual-leap-${day}`);
    ledger.set(`manual-${day}`, { key, min: 20, cents: 240 });
    const saves = x.saves(), before = JSON.stringify(calls);
    x.manual(key, '09:00', '', '10.00', `incomplete-${day}`);
    openCallEditor(official.id);
    x.element('callEditDurationInput').value = '';
    x.element('callEditDurationInput').validity = { badInput: day % 2 === 0 };
    saveCallEditor();
    assert.equal(JSON.stringify(calls), before);
    assert.equal(x.saves(), saves);
    x.element('callEditDurationInput').validity = { badInput: false };
    if (day % 3 === 0) {
      x.import([[String(day), key, '12:00 AM', 5, 'Yes', 'No', '.60']]);
      ledger.set(`official-${day}`, { key, min: 5, cents: 75 });
    }
    if (day % 5 === 0) {
      deleteCallRecord(calls.find(call => call.customerId === `manual-leap-${day}`).id);
      ledger.delete(`manual-${day}`);
    }
    x.h.saveAll(); x.reload();
    const expected = [...ledger.values()], stats = x.h.importedCallStats(calls, key);
    assert.equal(calls.length, ledger.size);
    assert.equal(stats.productive, expected.reduce((sum, entry) => sum + entry.min, 0));
    assert.ok(Math.abs(stats.earnings * 100 - expected.reduce((sum, entry) => sum + entry.cents, 0)) < 1e-7);
    assert.ok(Math.abs(settings.financeCategories.otro.rows[0].assignedAmount - stats.earnings) < 1e-7);
  }
  assert.ok(calls.some(call => call.callDate === '02/29/2024'));
  const exported = x.h.accountingExportDays({ start, end: new Date(2024, 2, 13) });
  assert.equal(exported.length, 42);
  for (const day of exported) {
    const expected = [...ledger.values()].filter(entry => entry.key === day.dayKey);
    assert.equal(day.dayCalls.length, expected.length);
    assert.ok(Math.abs(day.stats.earnings * 100 - expected.reduce((sum, entry) => sum + entry.cents, 0)) < 1e-7);
  }
  t.diagnostic(`42 persisted daily snapshots, 84 rejected incomplete entries, ${ledger.size} final calls and 42 exported day reconciliations across leap February`);
});
