import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { ui, translateText } from '../js/i18n.js';
import { confirmReplacement } from '../js/backup-recovery.js';

const source = fs.readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');
const body = source.slice(source.indexOf('    function eraseAllData()'), source.indexOf('    function resetDay()'));

function harness(boxes) {
  const opened = [];
  const context = vm.createContext({
    state: { shiftStartedAt: 'viejo', productiveGoalMin: 99, earningsGoal: 9 }, calls: [{ id: 'c1' }],
    settings: { shiftStart: '07:00', userName: 'Jonathan', theme: 'dark', financePayments: [{ id: 'p1' }] },
    useSnapshotTools: (_a, _k, change) => change(),
    canPersistLocalChanges: () => true,
    setAppState: v => { context.state = v; }, setAppCalls: v => { context.calls = v; }, setAppSettings: v => { context.settings = v; },
    defaultState: () => ({ shiftStartedAt: null, productiveGoalMin: 59, earningsGoal: 7.08 }),
    defaultSettings: () => ({ shiftStart: '06:00', userName: '', theme: 'auto' }),
    ensureCurrencySettings() {}, persistFullSnapshot: () => true, render() {}, toast() {},
    translateText, closeModal() {}, openModal: id => opened.push(id), renderEmojiPicker() {}, setContextScheduleEditDay() {}, resetCallEditorState() {},
    weekViewOffset: 0, cycleViewOffset: 0, editingGapContext: null, DEFAULT_USER_EMOJI: 'x',
    document: { getElementById: id => (id in boxes ? { checked: boxes[id] } : null) },
  });
  vm.runInContext(body, context);
  return { context, opened };
}
const all = { resetEraseCallsInput: false, resetEraseScheduleInput: false, resetEraseProfileInput: false, resetEraseFinanceInput: false };
const run = boxes => { const h = harness({ ...all, ...boxes }); const result = vm.runInContext('eraseAllData()', h.context); return { ...h, result }; };

test('reiniciar con solo "Llamadas y turnos" marcada deja horario, perfil y Finanzas', () => {
  const { context } = run({ resetEraseCallsInput: true });
  assert.equal(context.calls.length, 0);
  assert.equal(context.state.shiftStartedAt, null);
  assert.equal(context.state.productiveGoalMin, 99);
  assert.equal(context.settings.shiftStart, '07:00');
  assert.equal(context.settings.userName, 'Jonathan');
  assert.deepEqual(JSON.parse(JSON.stringify(context.settings.financePayments)), [{ id: 'p1' }]);
});

test('reiniciar con solo "Horario y metas" marcada conserva llamadas y perfil', () => {
  const { context } = run({ resetEraseScheduleInput: true });
  assert.equal(context.calls.length, 1);
  assert.equal(context.state.shiftStartedAt, 'viejo');
  assert.equal(context.state.productiveGoalMin, 59);
  assert.equal(context.settings.shiftStart, '06:00');
  assert.equal(context.settings.userName, 'Jonathan');
  assert.equal(context.settings.theme, 'dark');
});

test('reiniciar con solo "Perfil y ajustes" marcada borra el perfil y vuelve la bienvenida', () => {
  const { context, opened } = run({ resetEraseProfileInput: true });
  assert.equal(context.settings.userName, '');
  assert.equal(context.settings.theme, 'auto');
  assert.equal(context.settings.shiftStart, '07:00');
  assert.equal(context.calls.length, 1);
  assert.deepEqual(opened, ['onboardingModal']);
});

test('reiniciar sin tocar el perfil no vuelve a pedir el nombre', () => {
  const { opened, result } = run({ resetEraseCallsInput: true, resetEraseScheduleInput: true });
  assert.equal(result, true);
  assert.deepEqual(opened, []);
});

test('reiniciar con las 4 casillas marcadas borra todo, Finanzas incluida', () => {
  const { context } = run({ resetEraseCallsInput: true, resetEraseScheduleInput: true, resetEraseProfileInput: true, resetEraseFinanceInput: true });
  assert.equal(context.calls.length, 0);
  assert.equal(context.settings.userName, '');
  assert.equal(Object.hasOwn(context.settings, 'financePayments'), false);
});

test('reiniciar sin ninguna casilla marcada no cambia nada', () => {
  const { context, result } = run({});
  assert.equal(result, false);
  assert.equal(context.calls.length, 1);
  assert.equal(context.settings.userName, 'Jonathan');
});

test('el aviso de reiniciar trae 4 casillas: tres marcadas y Finanzas sin marcar', () => {
  const details = { innerHTML: '', className: '' };
  const prior = globalThis.document;
  globalThis.document = { getElementById: id => (id === 'confirmModalDetails' ? details : null) };
  try {
    const data = { state: {}, calls: [], settings: {} };
    confirmReplacement({ ui, translateText, escapeHtml: String, data: () => data, account: () => 'a', preserve() {}, appConfirm() {}, canPersistLocalChanges: () => true, toast() {}, restore() {} }, 'reset', () => true);
  } finally { if (prior === undefined) delete globalThis.document; else globalThis.document = prior; }
  for (const id of ['resetEraseCallsInput', 'resetEraseScheduleInput', 'resetEraseProfileInput']) assert.match(details.innerHTML, new RegExp(`id="${id}" type="checkbox" checked/>`));
  assert.match(details.innerHTML, /id="resetEraseFinanceInput" type="checkbox"\/>/);
  assert.match(details.innerHTML, /id="resetHowBtn"/);
  assert.doesNotMatch(details.innerHTML, /También borrar Finanzas|Also delete Finance/);
});
