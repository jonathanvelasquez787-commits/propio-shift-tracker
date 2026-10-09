import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parse } from 'acorn';
import { ui, translateText, setLanguage } from '../js/i18n.js';
import { calls, settings, state, setAppCalls, setAppSettings, setAppState } from '../js/app-context.js';
import { configureCallsContext, saveManualCall, openCallEditor, saveCallEditor, deleteCallRecord, clearActiveDayCalls, autoSaveLiveCall, restorePendingLiveCallBackup } from '../js/calls.js';
import { configureFinanceContext, financeRunAutoFillCascade, financeApplySignedAmount } from '../js/finance.js';
import { configureHigherRateContext, higherRateBonusForCall, higherRateBonusForCalls, higherRateBonusBreakdownForCalls } from '../js/higher-rate.js';
import { configureGameContext, createDefaultGameState, computeGameDay, onGameCallsChanged } from '../js/game.js';
import { configurePositiveReinforcementContext } from '../js/positive-reinforcement.js';

const source = fs.readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');
const declarations = new Map(parse(source, { ecmaVersion: 'latest', sourceType: 'module' }).body.map(node => node.declaration || node).filter(node => node.type === 'FunctionDeclaration').map(node => [node.id.name, source.slice(node.start, node.end)]));
const functions = ['pad', 'dateKey', 'todayRange', 'todayCallDateKey', 'callDateKeyFromValue', 'callDateToDate', 'dayKeyFromIsoDate', 'isoDateFromDayKey', 'sameCallDay', 'toDateFromInputs', 'toMinutes', 'formatHHMM', 'timeLabel', 'timeLabelFromDate', 'parseMoney', 'callsOverlap', 'callDedupeKey', 'parseCalls', 'isReplaceableLiveCall', 'sameImportedCallIdentity', 'importCalls', 'importedCallStats', 'accountingExportDays', 'getDailyGoalOverride', 'effectiveDailyGoal', 'setDailyGoalOverride', 'dayEvents', 'dayShiftBounds', 'dayShiftSessions', 'previousCalendarDay', 'mergeIntervals', 'connectedMinutesForDay'];
const at = (day, clock = '12:00') => new Date(`2025-09-${String(day).padStart(2, '0')}T${clock}:00`);
const tiers = { bronze: { bonusPerMin: .01 }, silver: { bonusPerMin: .02 }, gold: { bonusPerMin: .03 } };

function harness(t) {
  setLanguage('en');
  const previousDocument = globalThis.document;
  const originalNow = Date.now;
  const inputs = new Map();
  const element = id => { if (!inputs.has(id)) inputs.set(id, { value: '', style: {}, classList: { contains: () => false, add() {}, remove() {} }, setAttribute() {} }); return inputs.get(id); };
  const document = { getElementById: element, querySelectorAll: () => [] };
  globalThis.document = document;
  let clock = at(1, '19:00').getTime(), sequence = 0, persisted, saves = 0;
  const gameSaved = [];
  Date.now = () => clock;
  t.after(() => { Date.now = originalNow; if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument; });
  class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : [clock])); } static now() { return clock; } }
  setAppState({ shiftStartedAt: null, shiftEndedAt: null, events: [], pauseHistory: [], activeDayKey: '09/01/2025', pendingLiveCallBackup: null });
  setAppCalls([]);
  setAppSettings({ rate: .12, productiveGoalMin: 40, earningsGoal: 4.8, higherRateWindows: [], financeAutoFill: true, financeCategories: { otro: { rows: [] } }, customFinanceCategories: [] });
  const save = () => { persisted = JSON.stringify({ calls, settings, state }); saves++; return true; };
  const h = { Date: ClockDate, ui, translateText, document, MAX_CALL_DURATION_MIN: 1440, CONNECTED_LIVE_GRACE_MIN: 90,
    makeLocalId: () => `id-${++sequence}`, setAppCalls, higherRateBonusForCall, higherRateBonusForCalls, higherRateBonusBreakdownForCalls,
    callsForDay: key => calls.filter(c => c.callDate === key),
    getActiveDayKey: () => state.activeDayKey, defaultActiveDayKey: () => h.todayCallDateKey(),
    toast() {}, saveAll: save, financeRunAutoFillCascade, autoStartShiftFromCalls() {},
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
  configureFinanceContext({ parseMoney: h.parseMoney, higherRateBonusForCalls, saveSettingsOnly: save, render() {}, money: x => x.toFixed(2), convertedAmountText: () => '', toast() {} });
  configureCallsContext({ ...h, HIGHER_RATE_TIERS: tiers, MAX_CALL_DURATION_MIN: 1440, money: x => x.toFixed(2), convertedAmountText: () => '', financeConvertedInline: () => '', formatDuration: x => String(x), rateTilePerMin: () => settings.rate, renderRateTiles() {}, formatCallDayLabel: x => x,
    closeModal() {}, openModal() {}, appConfirm: (_message, fn) => fn() });
  return { h, inputs, element, gameSaved,
    advance: date => { clock = date.getTime(); }, saves: () => saves,
    reload() { const snap = JSON.parse(persisted); setAppCalls(snap.calls); setAppState(snap.state); setAppSettings(snap.settings); },
    import(rows) { element('callInput').value = rows.map(row => row.join('\t')).join('\n'); h.importCalls(); },
    manual(day, time, duration, pay = '', customer = 'manual') {
      for (const [id, value] of Object.entries({ manualCallDateInput: h.isoDateFromDayKey(day), manualCallStartInput: time, manualCallDurationInput: String(duration), manualCallPayInput: String(pay), manualCallCustomerIdInput: customer, manualCallBillableInput: 'Yes', manualCallDroppedInput: 'No' })) element(id).value = value;
      saveManualCall();
    },
  };
}

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
