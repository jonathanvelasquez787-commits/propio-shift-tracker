import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parse } from 'acorn';
import { ui, translateText, translateMarkup, setLanguage } from '../js/i18n.js';
import { parse as parseHtml } from 'parse5';

function declarations(file, names) {
  const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8');
  const nodes = parse(source, { ecmaVersion: 'latest', sourceType: 'module' }).body.map(node => node.declaration || node);
  return names.map(name => {
    const node = nodes.find(node => node.type === 'FunctionDeclaration' ? node.id.name === name
      : node.type === 'VariableDeclaration' && node.declarations.some(item => item.id.name === name));
    assert.ok(node, name);
    return source.slice(node.start, node.end);
  }).join('\n');
}

const key = date => `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
const at = (day, hour, minute = 0) => new Date(2026, 9, day, hour, minute);
function scheduleHarness({ day = 12, now = at(12, 19), start = at(12, 10), end = at(12, 11) } = {}) {
  const elements = new Map([['scheduleList', { innerHTML: '' }]]);
  const dayKey = key(at(day, 0)), todayKey = key(now);
  const slots = [{ type: 'Work', name: 'Mi bloque personal', start: '08:00', end: '09:00', goalMin: 0 }];
  class FixedDate extends Date { constructor(...args) { super(...(args.length ? args : [now.getTime()])); } }
  const h = vm.createContext({ Date: FixedDate, ui, translateText, translateMarkup,
    state: { shiftEndedAt: end?.toISOString() || null }, settings: {},
    document: { getElementById: id => elements.get(id) || null },
    getActiveDayKey: () => dayKey, callsForDay: () => [], dayPausesForSlotStats: () => [],
    dayShiftSessions: () => start ? [{ start, end: end || now, live: !end }] : [],
    dayConfigFor: () => ({ off: false }), dayIsEffectivelyOff: () => false,
    getEffectiveScheduleForDay: () => slots, originalPlannedSlotsForDay: () => slots,
    getShiftWindow: () => ({ start: '08:00', end: '09:00' }), connectedMinutesForDay: () => 60,
    getDayNote: () => null, todayCallDateKey: () => todayKey, todayRange: () => at(12, 0),
    callDateToDate: () => at(day, 0), dayGapRows: () => [], mergeIntervals: value => value,
    pauseForSlot: () => null, acwMinutesForBlock: () => 0, overlapMinutesWithIntervals: () => 0,
    slotMinuteAdherence: () => ({ pct: 0, adherentMinutes: 0, total: 60, reasons: { ausente: 60 } }),
    formatDuration: ms => `${ms / 60000}m`, formatMinutes: String, formatDeltaMinutes: String,
    timeLabel: value => value, timeLabelFromDate: String, escapeHtml: String, iconHtml: () => '',
    renderBlockSummaryStrip() {}, sameCallDay: () => true,
  });
  vm.runInContext(declarations('../js/app-main.js', ['dateAtTime', 'toMinutes', 'overlapMinutes',
    'EXCEPTION_REASON_LABELS', 'dominantExceptionReason', 'slotStats', 'renderSchedule']), h);
  h.renderSchedule();
  return elements.get('scheduleList').innerHTML;
}

for (const language of ['es', 'en']) {
  test('real schedule rendering localizes skipped work and absence detail in both supported languages', t => {
    setLanguage(language); t.after(() => setLanguage('es'));
    const html = scheduleHarness();
    assert.ok(html.includes(language === 'en' ? 'Skipped' : 'Omitido'));
    assert.ok(html.includes(language === 'en' ? 'Absence/late arrival' : 'Ausencia/llegada tarde'));
    assert.ok(html.includes('Mi bloque personal'), 'personal block names remain unchanged');
  });

  test(`real schedule rendering keeps the same active, finished and incomplete badge tones in ${language}`, t => {
    setLanguage(language); t.after(() => setLanguage('es'));
    const current = scheduleHarness({ now: at(12, 8, 30), start: at(12, 8), end: null });
    assert.match(current, /sblk-status warn/);
    const finished = scheduleHarness({ day: 11, start: at(11, 8), end: at(11, 10) });
    assert.match(finished, /sblk-status good/);
    const incomplete = scheduleHarness({ day: 11, start: at(11, 8), end: at(11, 8, 30) });
    assert.match(incomplete, /sblk-status warn/);
  });

  test(`real finance totals and completed-shift toast use ${language} labels`, t => {
    setLanguage(language); t.after(() => setLanguage('es'));
    const elements = new Map(['financeAvailableAmt', 'financeGastosTotalRow', 'financeMetasTotalRow'].map(id => [id, { innerHTML: '' }]));
    const messages = [];
    const h = vm.createContext({ Date, ui, translateText, translateMarkup,
      settings: {}, state: { shiftStartedAt: at(12, 8).toISOString(), shiftEndedAt: null },
      document: { getElementById: id => elements.get(id) || null },
      captureFinanceDetails() {}, financeAvailableBalance: () => 0,
      financeGastoRowsSorted: () => [{ id: 'expense', targetAmount: 10, assignedAmount: 5 }],
      financeMetaRowsSorted: () => [{ id: 'savings', targetAmount: 10, assignedAmount: 2 }],
      financeIsRowPagado: () => false, prepareFinanceMonthRender() {}, renderFinancePreview() {}, renderFinancePlanning() {}, updateFinanceTotalsScrollHint() {},
      money: value => `$${value}`, financeConvertedInline: () => '', escapeHtml: String,
      todayCallDateKey: key, setEvent() {}, fmtTime: String, saveAll: () => true,
      onGameShiftEnded() {}, toast: message => messages.push(message),
    });
    vm.runInContext(declarations('../js/finance.js', ['financeTotalsRowHtml', 'renderFinanceSection'])
      + '\n' + declarations('../js/app-main.js', ['endShift']), h);
    h.renderFinanceSection(); h.endShift();
    assert.ok(elements.get('financeGastosTotalRow').innerHTML.includes(language === 'en' ? 'Reserved' : 'Reservado'));
    assert.ok(elements.get('financeMetasTotalRow').innerHTML.includes(language === 'en' ? 'Reserved' : 'Reservado'));
    assert.deepEqual(messages, [language === 'en' ? 'Shift ended' : 'Shift terminado']);
  });
}

test('finance preview localizes allocated and saved labels without translating personal names', t => {
  setLanguage('en'); t.after(() => setLanguage('es'));
  const elements = new Map([['financePreviewBox', { style: {} }], ['financePreviewRows', { innerHTML: '' }]]);
  const personalName = 'Mi nombre personal sin traducir';
  const items = [false, true].map(isMeta => ({ isMeta, row: { categoryId: 'personal', name: personalName, targetAmount: 10, assignedAmount: 2 } }));
  const h = vm.createContext({ ui, translateText, document: { getElementById: id => elements.get(id) },
    financePendingPreviewItems: () => items, financeCategoryDef: () => ({ rgb: '1,2,3' }),
    financeCategoryIconHtml: () => '', escapeHtml: String, money: String, financeConvertedInline: () => '' });
  vm.runInContext(declarations('../js/finance.js', ['renderFinancePreview']), h);
  h.renderFinancePreview();
  const result = elements.get('financePreviewRows').innerHTML;
  assert.equal(result.split('>Reserved<').length - 1, 2);
  assert.ok(!result.includes('>Reservado<'));
  assert.equal(result.split(personalName).length - 1, 2);
});

test('Higher Rate history singular and plural render in English with unchanged window identities', t => {
  setLanguage('en'); t.after(() => setLanguage('es'));
  const elements = new Map(['higherRateWindowsList', 'higherRateHistoryList', 'higherRateHistoryTitle', 'higherRateActiveCountPill'].map(id => [id, { innerHTML: '' }]));
  const h = vm.createContext({ ui, translateText, translateMarkup,
    document: { getElementById: id => elements.get(id) || null },
    higherRateWindowIsPast: window => window.past,
    renderHigherRateWindowRow: window => `<div data-window-id="${window.id}"></div>`,
    iconHtml: () => '', renderHigherRateDayStats() {}, renderHigherRateLiveCard() {},
  });
  vm.runInContext('let higherRateLastPastCount = null;\n' + declarations('../js/higher-rate.js', ['renderHigherRateWindowsEditor']), h);
  for (const count of [1, 2]) {
    const windows = Array.from({ length: count }, (_, id) => ({ id: `personal-window-${id}`, date: '10/12/2026', start: '08:00', past: true }));
    const before = JSON.stringify(windows);
    h.renderHigherRateWindowsEditor(windows);
    assert.equal(elements.get('higherRateHistoryTitle').innerHTML.trim(), `History (${count} past)`);
    assert.equal(JSON.stringify(windows), before);
  }
});

test('paste-call placeholder localizes help while preserving original Propio sample and personal pasted input', t => {
  setLanguage('en'); t.after(() => setLanguage('es'));
  const html = parseHtml(fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8'));
  let textarea;
  function find(node) {
    if (node.attrs?.some(attr => attr.name === 'id' && attr.value === 'callInput')) textarea = node;
    (node.childNodes || []).forEach(find);
  }
  find(html);
  const original = textarea.attrs.find(attr => attr.name === 'placeholder').value;
  const input = { placeholder: original, value: 'Personal customer 9876\n10/12/2026\n8:00 AM\n5\nYes\nNo\n$0.60' };
  const before = input.value;
  const h = vm.createContext({ ui, translateText, document: { getElementById: () => input } });
  const source = fs.readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');
  const node = parse(source, { ecmaVersion: 'latest', sourceType: 'module' }).body.map(node => node.declaration || node)
    .find(node => node.type === 'FunctionDeclaration' && node.id.name === 'syncCallImportPlaceholder');
  if (node) { vm.runInContext(source.slice(node.start, node.end), h); h.syncCallImportPlaceholder(); }
  assert.match(input.placeholder, /^Paste your Propio data here\.\.\.\n\nExample:\n/);
  assert.equal(input.placeholder.split('Example:\n')[1], original.split('Ejemplo:\n')[1]);
  assert.equal(input.value, before);
});
