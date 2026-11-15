import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { ui, translateText } from '../js/i18n.js';
import { confirmReplacement } from '../js/backup-recovery.js';

const source = fs.readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');
const body = source.slice(source.indexOf('    function eraseAllData()'), source.indexOf('    function resetDay()'));

function eraseHarness(checked) {
  const finance = {
    financeCategories: { casa: { rows: [{ id: 'r1', name: 'Alquiler' }] } },
    financeAutoFill: true,
    financeLastDistribution: { at: 'x' },
    financePayments: [{ id: 'p1' }],
    financePlanning: { plan: 1 },
    customFinanceCategories: [{ id: 'mia', label: 'Mia' }],
    payReceipts: [{ id: 'rc1' }],
  };
  const context = vm.createContext({
    state: {}, calls: [{ id: 'c1' }], settings: { goal: 5, ...finance },
    useSnapshotTools: (_a, _k, change) => change(),
    canPersistLocalChanges: () => true,
    setAppState: v => { context.state = v; }, setAppCalls: v => { context.calls = v; },
    setAppSettings: v => { context.settings = v; },
    defaultState: () => ({}), defaultSettings: () => ({ goal: 1, financeCategories: { casa: { rows: [] } }, financeAutoFill: false }),
    ensureCurrencySettings() {}, persistFullSnapshot: () => true, render() {}, toast() {},
    translateText, closeModal() {}, openModal() {}, renderEmojiPicker() {}, setContextScheduleEditDay() {}, resetCallEditorState() {},
    weekViewOffset: 0, cycleViewOffset: 0, editingGapContext: null, DEFAULT_USER_EMOJI: 'x',
    document: { getElementById: id => (id === 'resetEraseFinanceInput' ? { checked } : null) },
  });
  vm.runInContext(body, context);
  return { context, finance };
}

test('borrar todos los datos conserva las Finanzas cuando la casilla no está marcada', () => {
  const { context, finance } = eraseHarness(false);
  vm.runInContext('eraseAllData()', context);
  assert.equal(context.calls.length, 0);
  assert.equal(context.settings.goal, 1);
  for (const key of Object.keys(finance)) assert.deepEqual(JSON.parse(JSON.stringify(context.settings[key])), finance[key]);
});

test('borrar todos los datos también borra las Finanzas cuando la casilla está marcada', () => {
  const { context } = eraseHarness(true);
  vm.runInContext('eraseAllData()', context);
  assert.deepEqual(JSON.parse(JSON.stringify(context.settings.financeCategories)), { casa: { rows: [] } });
  assert.equal(context.settings.financeAutoFill, false);
  assert.equal(Object.hasOwn(context.settings, 'financePayments'), false);
  assert.equal(Object.hasOwn(context.settings, 'payReceipts'), false);
});

test('el aviso de borrar todo trae la casilla "También borrar Finanzas" sin marcar', () => {
  const details = { innerHTML: '', className: '' };
  const prior = globalThis.document;
  globalThis.document = { getElementById: id => (id === 'confirmModalDetails' ? details : null) };
  try {
    const data = { state: {}, calls: [], settings: {} };
    confirmReplacement({ ui, translateText, escapeHtml: String, data: () => data, account: () => 'a', preserve() {}, appConfirm() {}, canPersistLocalChanges: () => true, toast() {}, restore() {} }, 'reset', () => true);
  } finally { if (prior === undefined) delete globalThis.document; else globalThis.document = prior; }
  assert.match(details.innerHTML, /id="resetEraseFinanceInput" type="checkbox"\/>/);
  assert.doesNotMatch(details.innerHTML, /resetEraseFinanceInput[^>]*checked/);
  assert.match(details.innerHTML, /Finance is kept|Las Finanzas se conservan/);
});
