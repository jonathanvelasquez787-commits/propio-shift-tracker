import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { ui, translateText } from '../js/i18n.js';
import { confirmReplacement } from '../js/backup-recovery.js';

const source = fs.readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');
const body = source.slice(source.indexOf('    function eraseAllData()'), source.indexOf('    function resetDay()'));

function eraseHarness(checked, theme) {
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
    state: {}, calls: [{ id: 'c1' }], settings: { goal: 5, theme, ...finance },
    useSnapshotTools: (_a, _k, change) => change(),
    canPersistLocalChanges: () => true,
    setAppState: v => { context.state = v; }, setAppCalls: v => { context.calls = v; },
    setAppSettings: v => { context.settings = v; },
    defaultState: () => ({}), defaultSettings: () => ({ theme: 'auto', goal: 1, financeCategories: { casa: { rows: [] } }, financeAutoFill: false }),
    ensureCurrencySettings() {}, persistFullSnapshot: () => true, render() {}, toast() {},
    translateText, closeModal() {}, openModal() {}, renderEmojiPicker() {}, setContextScheduleEditDay() {}, resetCallEditorState() {},
    weekViewOffset: 0, cycleViewOffset: 0, editingGapContext: null, DEFAULT_USER_EMOJI: 'x',
    document: { getElementById: id => (id === 'resetEraseFinanceInput' ? { checked } : null) },
  });
  vm.runInContext(body, context);
  return { context, finance };
}

test('reiniciar todos los datos conserva el tema oscuro que ya tenías', () => {
  const { context } = eraseHarness(true, 'dark');
  vm.runInContext('eraseAllData()', context);
  assert.equal(context.settings.theme, 'dark');
  assert.equal(context.settings.goal, 1);
});

test('reiniciar todos los datos conserva el tema claro que ya tenías', () => {
  const { context } = eraseHarness(true, 'light');
  vm.runInContext('eraseAllData()', context);
  assert.equal(context.settings.theme, 'light');
});

test('reiniciar sin tema elegido deja el de fábrica', () => {
  const { context } = eraseHarness(true, 'auto');
  vm.runInContext('eraseAllData()', context);
  assert.equal(context.settings.theme, 'auto');
});
