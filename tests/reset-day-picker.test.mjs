import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { ui, translateText } from '../js/i18n.js';
import { confirmReplacement } from '../js/backup-recovery.js';

const source = fs.readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');
const body = source.slice(source.indexOf('    function resetDay()'), source.indexOf('    // Clave para detectar llamadas duplicadas'));

function harness(boxes) {
  const seen = { options: null, reinforcementReset: 0 };
  const context = vm.createContext({
    state: {
      shiftStartedAt: '2026-11-15T09:00:00', shiftEndedAt: null, activePause: null, activeCall: null, pendingLiveCallBackup: null, lastCallEndedAt: 'x',
      events: [{ ts: '2026-11-15T10:00:00', id: 'e1' }, { ts: '2026-11-14T10:00:00', id: 'e2' }],
      pauseHistory: [{ startedAt: '2026-11-15T11:00:00', id: 'p1' }, { startedAt: '2026-11-14T11:00:00', id: 'p2' }],
      gapAnnotations: { '2026-11-15': 1, '2026-11-14': 1 }, dayNotes: { '2026-11-15': 'n', '2026-11-14': 'n' }, dayInterruptions: { '2026-11-15': 1, '2026-11-14': 1 },
    },
    calls: [{ id: 'c1', callDate: '2026-11-15' }, { id: 'c2', callDate: '2026-11-14' }],
    getActiveDayKey: () => '2026-11-15', callDateKeyFromValue: v => String(v || ''), currentShiftAccountingDayKey: () => '2026-11-15',
    todayCallDateKey: () => '2026-11-15', sameCallDay: (ts, key) => String(ts).startsWith(key),
    setAppCalls: v => { context.calls = v; }, formatCallDayLabel: k => `dia ${k}`,
    useSnapshotTools: (_a, _k, change, options) => { seen.options = options; return change(); },
    onReinforcementDayReset: () => { seen.reinforcementReset += 1; }, financeRunAutoFillCascade() {}, saveAll: () => true, toast() {}, translateText,
    document: { getElementById: id => (id in boxes ? { checked: boxes[id] } : null) },
  });
  vm.runInContext(body, context);
  return { context, seen };
}
const none = { resetDayCallsInput: false, resetDayBreaksInput: false, resetDayNotesInput: false };
const run = boxes => { const h = harness({ ...none, ...boxes }); const result = vm.runInContext('resetDay()', h.context); return { ...h, result }; };
const ids = list => list.map(x => x.id);

test('reiniciar día con solo "Llamadas" marcada deja pausas, nota y acciones', () => {
  const { context } = run({ resetDayCallsInput: true });
  assert.deepEqual(ids(context.calls), ['c2']);
  assert.deepEqual(ids(context.state.events), ['e1', 'e2']);
  assert.deepEqual(ids(context.state.pauseHistory), ['p1', 'p2']);
  assert.equal(context.state.dayNotes['2026-11-15'], 'n');
  assert.equal(context.state.shiftStartedAt, '2026-11-15T09:00:00');
});

test('reiniciar día con solo "Pausas y huecos" marcada borra pausas y huecos de ese día', () => {
  const { context } = run({ resetDayBreaksInput: true });
  assert.deepEqual(ids(context.state.pauseHistory), ['p2']);
  assert.equal(context.state.gapAnnotations['2026-11-15'], undefined);
  assert.equal(context.state.gapAnnotations['2026-11-14'], 1);
  assert.equal(context.calls.length, 2);
  assert.deepEqual(ids(context.state.events), ['e1', 'e2']);
});

test('reiniciar día con solo "Nota y acciones" marcada borra nota, acciones y turno', () => {
  const { context, seen } = run({ resetDayNotesInput: true });
  assert.deepEqual(ids(context.state.events), ['e2']);
  assert.equal(context.state.dayNotes['2026-11-15'], undefined);
  assert.equal(context.state.dayNotes['2026-11-14'], 'n');
  assert.equal(context.state.dayInterruptions['2026-11-15'], undefined);
  assert.equal(context.state.shiftStartedAt, null);
  assert.equal(seen.reinforcementReset, 1);
  assert.equal(context.calls.length, 2);
  assert.deepEqual(ids(context.state.pauseHistory), ['p1', 'p2']);
});

test('reiniciar día con las 3 casillas borra todo ese día y no toca otros días', () => {
  const { context, result } = run({ resetDayCallsInput: true, resetDayBreaksInput: true, resetDayNotesInput: true });
  assert.equal(result, true);
  assert.deepEqual(ids(context.calls), ['c2']);
  assert.deepEqual(ids(context.state.events), ['e2']);
  assert.deepEqual(ids(context.state.pauseHistory), ['p2']);
});

test('reiniciar día sin ninguna casilla marcada no cambia nada', () => {
  const { context, result } = run({});
  assert.notEqual(result, true);
  assert.equal(context.calls.length, 2);
  assert.equal(context.state.events.length, 2);
});

test('reiniciar día le pasa al aviso el nombre del día y los números de ese día', () => {
  const { seen } = run({ resetDayCallsInput: true });
  assert.equal(seen.options.dayLabel, 'dia 2026-11-15');
  assert.deepEqual(JSON.parse(JSON.stringify(seen.options.dayCounts)), { calls: 1, actions: 1, pauses: 1 });
});

test('el aviso de reiniciar día trae 3 casillas marcadas y el botón ¿Cómo funciona?', () => {
  const details = { innerHTML: '', className: '' };
  const prior = globalThis.document;
  globalThis.document = { getElementById: id => (id === 'confirmModalDetails' ? details : null) };
  try {
    const data = { state: {}, calls: [], settings: {} };
    confirmReplacement({ ui, translateText, escapeHtml: String, data: () => data, account: () => 'a', preserve() {}, appConfirm() {}, canPersistLocalChanges: () => true, toast() {}, restore() {} }, 'day', () => true, { dayLabel: 'dom 15 de nov.', dayCounts: { calls: 2, actions: 1, pauses: 0 } });
  } finally { if (prior === undefined) delete globalThis.document; else globalThis.document = prior; }
  for (const id of ['resetDayCallsInput', 'resetDayBreaksInput', 'resetDayNotesInput']) assert.match(details.innerHTML, new RegExp(`id="${id}" type="checkbox" checked/>`));
  assert.match(details.innerHTML, /id="resetHowBtn"/);
  assert.match(details.innerHTML, /dom 15 de nov\./);
  assert.match(details.innerHTML, /2 (llamadas|calls)/);
  assert.match(details.innerHTML, /1 (acción|action)/);
  assert.doesNotMatch(details.innerHTML, /Copia completa actual|Current full copy/);
});
