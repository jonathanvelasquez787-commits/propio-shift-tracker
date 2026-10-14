import test from 'node:test';
import assert from 'node:assert/strict';
import { languageOf, copyFor, scanError } from '../extension/propio-summary/i18n.js';
import { normalizeSummaryOptions } from '../extension/propio-summary/options.js';
import fs from 'node:fs';
import vm from 'node:vm';

test('disabled summary has no portal observers, interaction listeners or history reads and releases them after toggling off', async () => {
  let storageListener, reads = 0, observing = false, observerCallback, scheduled = 0;
  const documentListeners = new Map(), windowListeners = new Map(), elements = new Map();
  const element = id => { if (!elements.has(id)) elements.set(id, { value: '', addEventListener() {}, setAttribute() {} }); return elements.get(id); };
  const root = { getElementById: element, querySelector: element };
  const host = { attachShadow: () => root, remove() {} };
  const document = { body: {}, createElement: () => host, getElementById: () => null,
    addEventListener: (name, fn) => documentListeners.set(name, fn), removeEventListener: name => documentListeners.delete(name) };
  const window = { addEventListener: (name, fn) => windowListeners.set(name, fn), removeEventListener: name => windowListeners.delete(name) }; window.top = window;
  class Observer { constructor(callback) { observerCallback = callback; } observe() { observing = true; } disconnect() { observing = false; } }
  const source = fs.readFileSync(new URL('../extension/propio-summary/summary.js', import.meta.url), 'utf8').replace(/^import .*;\r?$/gm, '').replace('export function installPortalSummary', 'function installPortalSummary');
  vm.runInNewContext(source + '\ninstallPortalSummary({enabledByDefault:false});', { document, window, location: { origin: 'https://interpreters.propio-ls.com', pathname: '/portal/history' },
    MutationObserver: Observer, AbortController, settingsKey: 'propio-summary-options-v1', normalizeSummaryOptions,
    readPortalHistory: () => { reads++; return null; }, createSummaryMount: () => ({ mount() {}, clear() {} }),
    chrome: { runtime: { id: 'test-extension' }, storage: { local: { get: async () => ({}) }, onChanged: { addListener: fn => { storageListener = fn; } } } },
    setTimeout: () => { scheduled++; return 1; }, clearTimeout() {}, getComputedStyle: () => ({ visibility: 'visible' }) });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(observing, false); assert.equal(reads, 0); assert.equal(documentListeners.size, 0); assert.equal(windowListeners.size, 0);
  storageListener({ 'propio-summary-options-v1': { newValue: { enabled: true } } }, 'local');
  assert.equal(observing, true); assert.equal(reads, 1); assert.equal(documentListeners.size, 3); assert.equal(windowListeners.size, 2);
  storageListener({ 'propio-summary-options-v1': { newValue: { enabled: false } } }, 'local');
  observerCallback();
  assert.equal(observing, false); assert.equal(reads, 1); assert.equal(documentListeners.size, 0); assert.equal(windowListeners.size, 0); assert.equal(scheduled, 0);
});
test('unified summary is opt-in and preference updates preserve enabled state and valid conversion', () => {
  assert.deepEqual(normalizeSummaryOptions(null, false), { enabled: false, language: 'en' });
  assert.equal(normalizeSummaryOptions(null).enabled, true);
  const enabled = normalizeSummaryOptions({ enabled: true, language: 'es', currency: 'L', rate: 26.8 }, false);
  assert.deepEqual(enabled, { enabled: true, language: 'es', currency: 'L', rate: 26.8 });
  assert.deepEqual(normalizeSummaryOptions({ ...enabled, enabled: false }, false), { ...enabled, enabled: false });
  assert.deepEqual(normalizeSummaryOptions({ ...enabled, currency: null, rate: null }, false), { enabled: true, language: 'es' });
  assert.deepEqual(normalizeSummaryOptions({ enabled: 'true', language: 'bad', currency: '<script>alert(1)</script>', rate: Infinity }, false), { enabled: false, language: 'en' });
});
test('summary defaults and legacy currency-only settings use English; Spanish is explicit', () => {
  for (const options of [undefined, {}, { currency: 'L', rate: 26.68 }, { language: 'fr' }]) {
    assert.equal(languageOf(options), 'en');
    assert.equal(copyFor(options).details, 'Details');
  }
  assert.equal(copyFor({ language: 'es' }).details, 'Detalles');
  assert.match(copyFor({}).tooltip, /Start Date and End Date/);
  assert.match(copyFor({ language: 'es' }).tooltip, /Start Date y End Date/);
});
test('summary status, plural calls and scan errors follow the selected language', () => {
  assert.equal(copyFor({}).earningsBasis, '(Earnings excluding Surge Hours bonuses)');
  assert.equal(copyFor({ language: 'es' }).earningsBasis, '(Ganancias sin bonos de Surge Hours)');
  assert.equal(copyFor({}).calls(1), '1 call');
  assert.equal(copyFor({}).calls(2), '2 calls');
  assert.equal(copyFor({ language: 'es' }).calls(1), '1 llamada');
  assert.equal(copyFor({}).progress(15, 285), 'Adding 15/285 calls…');
  assert.equal(scanError('Cálculo cancelado.', {}), 'Scan cancelled.');
  assert.equal(scanError('Cálculo cancelado.', { language: 'es' }), 'Cálculo cancelado.');
  assert.equal(scanError('Unknown error', {}), copyFor({}).genericError);
});
