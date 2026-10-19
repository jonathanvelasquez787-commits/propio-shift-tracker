import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { rollup } from 'rollup';
import { parse } from 'acorn';
import { entryBundleOptions } from '../scripts/bundle-entry.mjs';
import { earningsBreakdownForCalls, renderEarningsBreakdown } from '../js/detail-views.js';
import { ui, translateText, setLanguage } from '../js/i18n.js';

const parseMoney = x => Number(String(x).replace('$', '')) || 0;
const bonusForCall = call => call.bonus ? { amount: call.bonus } : null;

test('earnings breakdown separates recorded and live base without double counting configured or archived bonuses', () => {
  const calls = [
    { source: 'propio', pay: '$1.20', bonus: .3 },
    { source: 'manual', pay: '2.40', bonus: .2 },
    { source: 'live', pay: '.60', bonus: .05 },
    { source: 'live', pay: '.72', propioBridge: { payEstimated: false } },
    { source: 'propio', pay: '.12', propioBridge: { payEstimated: true } },
  ];
  const before = JSON.stringify(calls);
  const result = earningsBreakdownForCalls(calls, parseMoney, bonusForCall);
  assert.ok(Math.abs(result.registeredBase - 4.32) < 1e-10);
  assert.equal(result.liveBase, .72);
  assert.equal(result.bonus, .55);
  assert.ok(Math.abs(result.total - 5.59) < 1e-10);
  assert.equal(result.liveCount, 2); assert.equal(result.count, 5);
  assert.equal(JSON.stringify(calls), before);
});

test('official reconciliation moves an estimate to recorded base and preserves its bonus without an extra payment', () => {
  const call = { source: 'live', pay: '1.20', bonus: .3, propioBridge: { payEstimated: true } };
  assert.equal(earningsBreakdownForCalls([call], parseMoney, bonusForCall).total, 1.5);
  Object.assign(call, { pay: '1.08', propioBridge: { payEstimated: false } });
  const result = earningsBreakdownForCalls([call], parseMoney, bonusForCall);
  assert.equal(result.liveBase, 0); assert.equal(result.liveCount, 0);
  assert.equal(result.registeredBase, 1.08); assert.equal(result.bonus, .3);
  assert.ok(Math.abs(result.total - 1.38) < 1e-10);
});

test('empty and historical negative base entries keep the same accounting semantics as the totals', () => {
  assert.deepEqual(earningsBreakdownForCalls([], parseMoney, bonusForCall), { registeredBase: 0, liveBase: 0, bonus: 0, total: 0, liveCount: 0, count: 0 });
  assert.equal(earningsBreakdownForCalls([{ pay: '-.25' }], parseMoney, bonusForCall).total, -.25);
});

test('earnings rows translate both languages, escape their scope and show secondary currency for every amount', () => {
  for (const language of ['es', 'en']) {
    setLanguage(language);
    const wrap = {};
    renderEarningsBreakdown(wrap, [{ pay: '1.20', bonus: .3 }], { ui, translateText,
      escapeHtml: s => String(s).replaceAll('<', '&lt;'), money: x => '$' + x.toFixed(2),
      financeConvertedInline: x => '<span>≈ L ' + (27 * x).toFixed(2) + '</span>',
      parseMoney, higherRateBonusForCall: bonusForCall, scopeLabel: '<today>', exchangeRate: 27, currencyLabel: 'L' });
    assert.ok(!wrap.innerHTML.includes('<today>'));
    assert.match(wrap.innerHTML, language === 'es' ? /Base registrada/ : /Recorded base/);
    assert.equal((wrap.innerHTML.match(/≈ L/g) || []).length, 4);
    assert.match(wrap.innerHTML, /\$1\.50/);
    assert.match(wrap.innerHTML, /\$1 = L 27/);
  }
  setLanguage('es');
});

test('the exchange note uses the configured manual rate without changing recorded USD or inventing a rate', () => {
  setLanguage('es'); const wrap = {};
  const context = { ui, translateText, escapeHtml: s => String(s).replaceAll('<', '&lt;'), money: x => '$' + x.toFixed(2),
    financeConvertedInline: () => '', parseMoney, higherRateBonusForCall: bonusForCall, scopeLabel: 'Hoy' };
  const calls = [{ pay: '1.20' }], before = JSON.stringify(calls);
  for (const rate of [0, -1, NaN, Infinity]) {
    renderEarningsBreakdown(wrap, calls, { ...context, exchangeRate: rate, currencyLabel: 'L' });
    assert.match(wrap.innerHTML, /Moneda secundaria desactivada/);
    assert.ok(!wrap.innerHTML.includes('$1 ='));
  }
  renderEarningsBreakdown(wrap, calls, { ...context, exchangeRate: 28.1234, currencyLabel: '<script>' });
  assert.match(wrap.innerHTML, /28\.1234/); assert.ok(!wrap.innerHTML.includes('<script>'));
  assert.equal(JSON.stringify(calls), before);
});

test('detail views stay outside the initial app bundle and retain a release-bound native import and offline entry', async () => {
  const root = path.resolve('.'), options = entryBundleOptions(root, 'app-main', 'details-test');
  const file = path.join(root, 'js/detail-views.js');
  assert.equal(options.external('./detail-views.js'), true); assert.equal(options.external(file), true);
  assert.equal(options.output.paths(file), '/assets/detail-views.js?v=details-test');
  const bundle = await rollup({ input: path.join(root, 'js/detail-views-loader.js'), external: options.external, makeAbsoluteExternalsRelative: false });
  try {
    const { output } = await bundle.generate(options.output);
    assert.ok(!Object.keys(output[0].modules).includes(file));
    assert.match(output[0].code, /import\('\/assets\/detail-views\.js\?v=details-test'\)/);
  } finally { await bundle.close(); }
  assert.ok(fs.readFileSync('js/service-worker.js', 'utf8').includes('`/assets/detail-views.js?v=${BUILD_VERSION}`'));
});

test('a failed detail import is recoverable and a successful module is shared by later opens', async () => {
  const source = fs.readFileSync('js/detail-views-loader.js', 'utf8')
    .replace('export async function', 'async function').replaceAll('import.meta.url', '"https://example.invalid/assets/app-main.js?v=release"')
    .replace("import('./detail-views.js')", 'fetchDetails()').replace('import(url.href)', 'fetchDetails(url.href)');
  let attempts = 0;
  const module = { renderEarningsBreakdown() {} };
  const h = vm.createContext({ URL, fetchDetails: async url => { if (++attempts === 1) throw Error('offline'); assert.equal(url, 'https://example.invalid/assets/detail-views.js?v=release#retry-1'); return module; } });
  vm.runInContext(source, h);
  assert.equal(await h.loadDetailViews(), null);
  assert.equal(await h.loadDetailViews(), null, 'background renders do not repeat failed imports');
  assert.equal(await h.loadDetailViews({ retry: true }), module); assert.equal(await h.loadDetailViews(), module);
  assert.equal(attempts, 2);
});

test('changing the base rate updates future estimates and the general goal while preserving recorded calls, windows and special goals', () => {
  const source = fs.readFileSync('js/settings.js', 'utf8');
  const node = parse(source, { ecmaVersion: 'latest', sourceType: 'module' }).body.map(n => n.declaration || n)
    .find(n => n.type === 'FunctionDeclaration' && n.id.name === 'updateRate');
  const settings = { rate: .12, productiveGoalMin: 300, earningsGoal: 36, higherRateWindows: [{ id: 'hr', tier: 'gold' }], dailyGoalOverrides: { '10/18/2026': 24 } };
  const calls = [{ pay: '1.20', durationMin: 10, frozenHigherRateBonus: { amount: .3, tier: 'gold' } }], originalCalls = JSON.stringify(calls);
  let saved;
  const h = vm.createContext({ settings, state: { earningsGoal: 36 }, calls, RATE: .12,
    document: { getElementById: () => ({ value: '.2' }) }, snapshotHistoricalPlanning() {},
    saveAll() { saved = JSON.stringify({ settings, calls }); return true; },
    onGameDayMetadataChanged() {}, todayCallDateKey: () => '10/19/2026', refreshGoalInputs() {}, render() {}, toast() {} });
  vm.runInContext(source.slice(node.start, node.end), h); h.updateRate();
  assert.equal(settings.rate, .2); assert.equal(settings.earningsGoal, 60); assert.equal(h.state.earningsGoal, 60);
  assert.equal(JSON.stringify(calls), originalCalls);
  const restored = JSON.parse(saved);
  assert.deepEqual(restored.settings.higherRateWindows, [{ id: 'hr', tier: 'gold' }]);
  assert.deepEqual(restored.settings.dailyGoalOverrides, { '10/18/2026': 24 });
  assert.deepEqual(restored.calls, calls);
});
