import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('monto ciclo igual: el monto del ciclo usa el mismo tamano que el de Hoy', () => {
  const day = html.match(/<div class="([^"]*)"[^>]*id="earningsValue"/);
  const cycleTag = html.match(/<div [^>]*id="cycleEarningsValue"[^>]*>/)[0];
  assert.ok(day);
  assert.match(cycleTag, /class="earnings-big earnings-value-accent"/);
  assert.doesNotMatch(cycleTag, /font-size/);
  assert.doesNotMatch(html.match(/<div [^>]*id="earningsValue"[^>]*>/)[0], /font-size/);
});
