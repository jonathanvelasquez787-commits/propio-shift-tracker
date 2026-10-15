import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parse } from 'acorn';

function declarations(path) {
  const source = fs.readFileSync(new URL(path, import.meta.url), 'utf8');
  return new Map(parse(source, { ecmaVersion: 'latest', sourceType: 'module' }).body.map(node => node.declaration || node)
    .filter(node => node.type === 'FunctionDeclaration').map(node => [node.id.name, source.slice(node.start, node.end)]));
}
const app = declarations('../js/app-main.js'), table = declarations('../js/calls.js');
const iso = time => new Date(`2026-10-15T${time}:00`).toISOString();
function fixture() {
  let clock = Date.parse(iso('08:30'));
  const dateKey = date => { const d = new Date(date); return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`; };
  const h = { Date: class extends Date { constructor(...args) { super(...(args.length ? args : [clock])); } },
    state: { shiftStartedAt: iso('07:42'), shiftEndedAt: null, activeCall: null, activePause: null, pauseHistory: [],
      events: [{ type: 'shift', title: 'Shift iniciado', meta: 'Propio', ts: iso('07:42') }] },
    calls: [], annotations: null, dateKey, CONNECTED_LIVE_GRACE_MIN: 90, GAP_AUTO_OTHER_THRESHOLD_MIN: 90,
    getActiveDayKey: () => dateKey(clock), todayCallDateKey: date => dateKey(date ?? clock), callDateKeyFromValue: key => key,
    sameCallDay: (date, key) => dateKey(date) === key,
    callDateToDate: key => { const [m, d, y] = key.split('/').map(Number); return new Date(y, m - 1, d); },
    previousCalendarDay: date => new Date(new Date(date).getTime() - 86400000),
    getDayNote: () => null, dayConfigFor: () => ({ start: '08:00', end: '16:00', off: false }),
    formatHHMM: value => value, dateAtTime: (base, time) => new Date(new Date(base).getTime() + time.split(':').reduce((a, b) => a * 60 + Number(b), 0) * 60000),
    callsForDay: () => h.calls, dayPauseIntervals: () => [], getGapAnnotation: () => h.annotations,
    translateText: value => value, gapLabelText: value => value };
  vm.createContext(h);
  const names = ['dayEvents', 'dayShiftBounds', 'dayShiftSessions', 'workStartForConnection', 'dayWorkSessions', 'dayWorkBounds',
    'workingMinutesForDay', 'connectedMinutesForDay', 'mergeIntervals', 'overlapMinutesWithIntervals', 'gapKeyFor', 'suggestGapLabel',
    'gapClassification', 'dayGapRows', 'computeCurrentAcwStart', 'todayShiftBounds', 'currentStateLabel'];
  vm.runInContext(names.map(name => app.get(name)).join('\n') + '\n' + table.get('dayActionRows'), h);
  return { h, time: value => { clock = Date.parse(value.includes('T') ? value : iso(value)); },
    call(from, to) { const c = { customerId: String(h.calls.length + 1), callDate: '10/15/2026', startISO: iso(from), endISO: iso(to), durationMin: (Date.parse(iso(to)) - Date.parse(iso(from))) / 60000, pay: '$0.60' }; h.calls.push(c); return c; } };
}

test('early Propio connection preserves raw presence but starts work and first-call ACW at schedule', () => {
  const f = fixture(); f.call('08:05', '08:10'); const h = f.h;
  assert.equal(h.connectedMinutesForDay(), 48); assert.equal(h.workingMinutesForDay(), 30);
  const gap = h.dayGapRows()[0]; assert.equal(gap.prev.endISO, iso('08:00')); assert.equal(gap.acw, 5);
  assert.equal(gap.gapKey, `shift-start|${iso('07:42')}|1|${iso('08:05')}`);
  assert.equal(h.state.shiftStartedAt, iso('07:42')); assert.equal(h.state.events[0].ts, iso('07:42'));
  const rows = h.dayActionRows('10/15/2026');
  assert.equal(rows.find(row => row.detail === 'Conexión a Propio detectada').ts, iso('07:42'));
  assert.equal(rows.find(row => row.detail === 'Inicio de turno').ts, iso('08:00'));
  assert.equal(h.computeCurrentAcwStart().toISOString(), iso('08:10'));
});

test('connection before work has no ACW or worked minutes and late arrival is never backdated', () => {
  const f = fixture(), h = f.h; f.time('07:50');
  assert.equal(h.currentStateLabel(), 'Conectado'); assert.equal(h.computeCurrentAcwStart(), null);
  assert.equal(h.workingMinutesForDay(), 0); assert.equal(h.connectedMinutesForDay(), 8);
  assert.equal(h.dayActionRows('10/15/2026').some(row => row.detail === 'Inicio de turno'), false);
  h.state.shiftStartedAt = iso('08:20'); h.state.events[0].ts = iso('08:20'); f.time('08:30');
  assert.equal(h.dayWorkBounds().start.toISOString(), iso('08:20')); assert.equal(h.workingMinutesForDay(), 10);
  assert.equal(h.computeCurrentAcwStart().toISOString(), iso('08:20'));
});

test('a real early call starts work at that call, preserving its pay and subsequent ACW', () => {
  const f = fixture(), call = f.call('07:50', '07:55'), before = JSON.stringify(call), h = f.h;
  f.time('08:05'); assert.equal(h.dayWorkBounds().start.toISOString(), iso('07:50'));
  assert.equal(h.workingMinutesForDay(), 15); assert.equal(h.computeCurrentAcwStart().toISOString(), iso('07:55'));
  assert.equal(h.dayGapRows().length, 0); assert.equal(JSON.stringify(h.calls[0]), before);
  assert.equal(h.dayActionRows('10/15/2026').find(row => row.detail === 'Inicio de turno').ts, iso('07:50'));
  h.calls = []; h.state.activeCall = { startedAt: iso('07:50') }; f.time('07:52');
  assert.equal(h.dayWorkBounds().start.toISOString(), iso('07:50')); assert.equal(h.computeCurrentAcwStart(), null);
});

test('manual starts, off days and existing gap annotations keep their explicit meaning', () => {
  const f = fixture(), h = f.h; h.state.events[0].meta = 'manual';
  assert.equal(h.dayWorkBounds().start.toISOString(), iso('07:42'));
  h.state.events[0].meta = 'Propio'; h.dayConfigFor = () => ({ off: true, start: '08:00', end: '16:00' });
  assert.equal(h.dayWorkBounds().start.toISOString(), iso('07:42'));
  h.dayConfigFor = () => ({ off: false, start: '08:00', end: '16:00' }); f.call('08:05', '08:10'); h.annotations = { label: 'other', note: 'saved note' };
  const row = h.dayGapRows()[0]; assert.equal(row.note, 'saved note'); assert.equal(row.other, 5); assert.equal(row.manual, true);
});

test('closing before the scheduled start creates no work session and overnight projection clips daily minutes', () => {
  const f = fixture(), h = f.h;
  h.state.shiftEndedAt = iso('07:50'); h.state.events.unshift({ type: 'shift', title: 'Shift terminado', meta: 'Propio', ts: iso('07:50') });
  assert.equal(h.workingMinutesForDay(), 0); assert.equal(h.connectedMinutesForDay(), 8);
  h.state.shiftStartedAt = iso('21:42'); h.state.shiftEndedAt = null; h.state.events = [{ type: 'shift', title: 'Shift iniciado', meta: 'Propio', ts: iso('21:42') }];
  h.dayConfigFor = () => ({ start: '22:00', end: '06:00', off: false }); f.time('22:30');
  assert.equal(h.workingMinutesForDay(), 30); assert.equal(h.dayWorkBounds().start.toISOString(), iso('22:00'));
  f.time('2026-10-16T00:30:00'); assert.equal(h.workingMinutesForDay(), 30);
  assert.equal(h.dayWorkBounds().start.toISOString(), iso('22:00'));
});
