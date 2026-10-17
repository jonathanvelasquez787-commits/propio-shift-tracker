import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parse } from 'acorn';
import { validateBridgePlan } from '../js/propio-bridge-rules.js';

const source = fs.readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');
const declarations = new Map(parse(source, { ecmaVersion: 'latest', sourceType: 'module' }).body.map(node => node.declaration || node)
  .filter(node => node.type === 'FunctionDeclaration').map(node => [node.id.name, source.slice(node.start, node.end)]));
const iso = time => `2026-10-15T${time}.000Z`;
function fixture() {
  let clock = Date.parse(iso('18:10:50'));
  const h = { Date: class extends Date { constructor(...args) { super(...(args.length ? args : [clock])); } },
    state: { shiftStartedAt: iso('18:00:00'), shiftEndedAt: null, activeCall: null, activePause: null, pauseHistory: [], lastCallEndedAt: iso('18:10:00') },
    calls: [{ startISO: iso('18:01:00'), endISO: iso('18:10:00') }], settings: { lateArrivalMode: 'anchor' },
    localStorageRevision: { isCurrent: () => true }, todayCallDateKey: () => '10/15/2026',
    getShiftWindow: () => ({ start: '18:00', end: '22:00' }), getDayNote: () => null,
    callDateToDate: () => new Date(iso('00:00:00')), dateAtTime: (date, time) => new Date(iso(time + ':00')),
    referenceDurationMinForActivePause: () => 10, currentShiftAccountingDayKey: () => '10/15/2026',
    reinforcementScheduleIntervals: () => [], callsForDay: () => h.calls,
    dayShiftBounds: () => ({ live: !h.state.shiftEndedAt, start: new Date(h.state.shiftStartedAt) }),
    dayPauseIntervals: () => h.state.pauseHistory.map(p => ({ start: new Date(p.startedAt), end: new Date(p.endedAt) })) };
  h.dayWorkBounds = () => h.dayShiftBounds();
  vm.createContext(h); vm.runInContext(['computeCurrentAcwStart', 'getPropioBridgePlan'].map(name => declarations.get(name)).join('\n'), h);
  return { h, now: () => clock, time: value => { clock = Date.parse(iso(value)); } };
}

test('bridge plan shares the visible ACW anchor with elapsed seconds and reconciled history', () => {
  const f = fixture();
  for (const endedAt of ['18:10:00', '18:10:40', '18:09:00']) {
    f.h.calls[0].endISO = iso(endedAt); f.h.state.lastCallEndedAt = iso(endedAt);
    const plan = f.h.getPropioBridgePlan(), validated = validateBridgePlan(plan, f.now());
    assert.equal(plan.acw.startedAt, f.h.computeCurrentAcwStart().toISOString());
    assert.equal(validated.acw.startedAt, iso(endedAt));
    assert.equal(validated.acw.observedAt, new Date(f.now()).toISOString());
    assert.equal(validated.acwVerified, true);
  }
});

test('early login ACW stays distinct from scheduled shift and active calls or pauses publish no ACW', () => {
  const f = fixture(); f.h.calls = []; f.h.state.lastCallEndedAt = null;
  f.h.getShiftWindow = () => ({ start: '18:30', end: '22:00' });
  f.h.dayWorkBounds = () => ({ live: f.now() >= Date.parse(iso('18:30:00')), start: new Date(iso('18:30:00')) });
  let plan = f.h.getPropioBridgePlan();
  assert.equal(plan.startAt, iso('18:30:00')); assert.equal(plan.acw, null); assert.equal(plan.hasCall, false);
  assert.equal(validateBridgePlan(plan, f.now()).acwVerified, true);
  f.h.state.activeCall = { startedAt: iso('18:10:00') }; assert.equal(f.h.getPropioBridgePlan().acw, null);
  f.h.state.activeCall = null; f.h.state.activePause = { type: 'break', startedAt: iso('18:10:00') };
  assert.equal(f.h.getPropioBridgePlan().acw, null);
  f.h.dayWorkBounds = () => f.h.dayShiftBounds();
  f.h.state.activePause = null; f.h.state.pauseHistory = [{ type: 'break', startedAt: iso('18:05:00'), endedAt: iso('18:10:20') }];
  assert.equal(f.h.getPropioBridgePlan().acw.startedAt, iso('18:10:20'));
});

test('ACW validation distinguishes old trackers, idle absence, malformed clocks and future timestamps', () => {
  const f = fixture(), base = f.h.getPropioBridgePlan();
  const old = { ...base }; delete old.acw;
  assert.equal(validateBridgePlan(old, f.now()).acwVerified, false);
  assert.equal(validateBridgePlan(validateBridgePlan(old, f.now()), f.now()).acwVerified, false);
  assert.equal(validateBridgePlan({ ...base, acw: null }, f.now()).acwVerified, true);
  for (const acw of [{ startedAt: 'invalid', observedAt: base.acw.observedAt }, { startedAt: iso('18:11:00'), observedAt: base.acw.observedAt },
    { startedAt: base.acw.startedAt, observedAt: iso('18:12:00') }, { startedAt: 1, observedAt: 2 }]) {
    const plan = validateBridgePlan({ ...base, acw }, f.now());
    assert.equal(plan.acw, null); assert.equal(plan.acwVerified, false);
  }
});

test('shifted bridge boundaries use the same shift bounds and minute precision as the displayed schedule', () => {
  const f=fixture();f.h.settings.lateArrivalMode='shift';
  f.h.state.shiftStartedAt=iso('18:20:50');
  f.h.dayShiftBounds=()=>({start:new Date(iso('18:10:30')),live:true});
  const plan=f.h.getPropioBridgePlan();
  assert.equal(plan.startAt,iso('18:10:00'));assert.equal(plan.endAt,iso('22:10:00'));
  f.h.settings.lateArrivalMode='anchor';
  assert.equal(f.h.getPropioBridgePlan().startAt,iso('18:00:00'));
});
