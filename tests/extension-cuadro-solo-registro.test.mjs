import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extensionAvailabilityModel } from '../js/extension-box.js';

const state = passive => ({ ok: true, paired: true, mode: 'auto', preparation: { devicePassive: passive, resume: {}, spacing: {} } });

test('cuadro de la extension: el modelo sabe si esta PC esta en "Solo registro"', () => {
  assert.equal(extensionAvailabilityModel(state(true)).passive, true);
  assert.equal(extensionAvailabilityModel(state(false)).passive, false);
  assert.equal(extensionAvailabilityModel({ ok: true, paired: true, mode: 'auto', preparation: {} }).passive, false);
});

test('cuadro de la extension: el interruptor "Solo registro en esta PC" manda device-passive al worker', () => {
  const src = readFileSync(new URL('../js/extension-box.js', import.meta.url), 'utf8');
  assert.match(src, /toggleRow\('extBoxPassive', 'Solo registro en esta PC'/);
  assert.match(src, /passiveRow\.input\.addEventListener\('change', \(\) => act\(\{ kind: 'device-passive', enabled: passiveRow\.input\.checked \}\)\)/);
  assert.match(src, /availBody\.append\(pausedRow\.row, passiveRow\.row, firstRow\.row,/);
});
