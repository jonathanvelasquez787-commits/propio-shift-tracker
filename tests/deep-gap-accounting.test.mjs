import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parse } from 'acorn';
import { acwMinutesForBlock } from '../js/block-acw.js';

const source = fs.readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');
const declarations = new Map(parse(source, { ecmaVersion: 'latest', sourceType: 'module' }).body
  .map(n => n.declaration || n).filter(n => n.type === 'FunctionDeclaration')
  .map(n => [n.id.name, source.slice(n.start, n.end).replace(/^export /, '')]));
const at = minutes => new Date(Date.UTC(2026, 9, 12, 12, minutes));
function harness(pauses = [], annotation = null) {
  const calls = [{ id: 'first', customerId: 'first', startISO: at(-10).toISOString(), endISO: at(0).toISOString() },
    { id: 'second', customerId: 'second', startISO: at(60).toISOString(), endISO: at(70).toISOString() }];
  const h = vm.createContext({ Date, GAP_AUTO_OTHER_THRESHOLD_MIN: 90,
    getActiveDayKey: () => '10/12/2026', callDateKeyFromValue: v => v, callsForDay: () => calls,
    dayShiftSessions: () => [], dayPauseIntervals: () => pauses,
    getGapAnnotation: () => annotation });
  vm.runInContext(['mergeIntervals', 'overlapMinutesWithIntervals', 'gapKeyFor', 'suggestGapLabel',
    'gapClassification', 'dayGapRows', 'dayGapTotals', 'manualGapPauseIntervals',
    'mergeOverlappingPauseEntries', 'dayPausesForSlotStats', 'subtractCallsFromPauseInterval',
    'actualPauseIntervalsForDay', 'pauseDurationExcludingCalls', 'pauseAssignmentCache'].map(name => declarations.get(name)).join('\n'), h);
  return h;
}
test('a short real Break inside a longer gap preserves residual ACW and counts only actual paused minutes', () => {
  const h = harness([{ type: 'break', start: at(40), end: at(45) }]);
  const totals = h.dayGapTotals();
  assert.equal(totals.breakTotal, 5);
  assert.equal(totals.acwTotal, 55);
  assert.equal(totals.possiblePauseTotal, 0);
  assert.equal(acwMinutesForBlock(h.dayGapRows(), at(0), at(60), h.dayPauseIntervals(), h.overlapMinutesWithIntervals), 55);
});
test('mixed real Break and Lunch split a gap without attributing both to the longest pause type', () => {
  const h = harness([{ type: 'break', start: at(20), end: at(25) }, { type: 'lunch', start: at(40), end: at(50) }]);
  const totals = h.dayGapTotals();
  assert.equal(totals.breakTotal, 5); assert.equal(totals.lunchTotal, 10); assert.equal(totals.acwTotal, 45);
});
test('real pauses after the final call are still included without inventing another call', () => {
  const h = harness([{ type: 'break', start: at(80), end: at(90) }]);
  assert.equal(h.dayGapTotals().breakTotal, 10);
  assert.equal(h.dayGapTotals().acwTotal, 60);
});
test('manual gap classification still spans the gap and does not duplicate the same real pause', () => {
  const h = harness([{ type: 'break', start: at(20), end: at(30) }], { label: 'break' });
  assert.equal(h.dayGapTotals().breakTotal, 60); assert.equal(h.dayGapTotals().acwTotal, 0);
});
test('automatic ACW excludes time outside explicit sessions even when an earlier manual call is imported', () => {
  const h = harness([{type:'break',start:at(50),end:at(55)}]);
  h.dayShiftSessions = () => [{start:at(0),end:at(15)}, {start:at(45),end:at(60)}];
  assert.equal(h.dayGapTotals().acwTotal,25);
  assert.equal(acwMinutesForBlock(h.dayGapRows(),at(0),at(60),h.dayPauseIntervals(),h.overlapMinutesWithIntervals),25);
});
test('a gap entirely outside explicit work sessions creates no automatic ACW row', () => {
  const h = harness(); h.dayShiftSessions = () => [{start:at(80),end:at(90)}];
  assert.equal(h.dayGapTotals().acwTotal,0);
  assert.equal(h.dayGapRows().length,0);
});

test('a manually classified Lunch gap does not duplicate a real Break in totals or adherence', () => {
  const h = harness([{type:'break',start:at(20),end:at(30)}],{label:'lunch'});
  const totals = h.dayGapTotals();
  assert.equal(totals.breakTotal,10); assert.equal(totals.lunchTotal,50);
  const intervals = h.actualPauseIntervalsForDay('10/12/2026');
  assert.equal(intervals.reduce((sum,p)=>sum+(p.end-p.start)/60000,0),60);
});

test('pause slot assignment uses the same nonduplicated minutes as day totals', () => {
  const h = harness([{type:'break',start:at(20),end:at(30)}],{label:'lunch'});
  Object.assign(h,{state:{pauseHistory:[{type:'break',startedAt:at(20),endedAt:at(30)}]},
    callDateToDate:()=>at(0), sameCallDay:()=>true, todayCallDateKey:()=>'',
    getEffectiveScheduleForDay:()=>[{type:'Lunch',start:'12:00'},{type:'Lunch',start:'12:30'}],
    dateAtTime:(_,time)=>at(time==='12:00'?0:30), PAUSE_SLOT_MAX_DISTANCE_MIN:240});
  const result=h.pauseAssignmentCache('10/12/2026','lunch');
  assert.equal(result.assignment.filter(Boolean).reduce((sum,p)=>sum+p.effectiveDurationMin,0),50);
});

test('a manual or imported call overlapping a real pause is not counted as both productive and paused time', () => {
  const h = harness([{type:'break',start:at(55),end:at(65)},{type:'lunch',start:at(67),end:at(75)}]);
  const totals = h.dayGapTotals();
  assert.equal(totals.breakTotal,5);
  assert.equal(totals.lunchTotal,5);
  assert.equal(totals.acwTotal,55);
});
