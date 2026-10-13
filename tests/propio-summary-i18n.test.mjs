import test from 'node:test';
import assert from 'node:assert/strict';
import { languageOf, copyFor, scanError } from '../extension/propio-summary/i18n.js';
import { normalizeSummaryOptions } from '../extension/propio-summary/options.js';
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
  assert.equal(copyFor({}).calls(1), '1 call');
  assert.equal(copyFor({}).calls(2), '2 calls');
  assert.equal(copyFor({ language: 'es' }).calls(1), '1 llamada');
  assert.equal(copyFor({}).progress(15, 285), 'Adding 15/285 calls…');
  assert.equal(scanError('Cálculo cancelado.', {}), 'Scan cancelled.');
  assert.equal(scanError('Cálculo cancelado.', { language: 'es' }), 'Cálculo cancelado.');
  assert.equal(scanError('Unknown error', {}), copyFor({}).genericError);
});
