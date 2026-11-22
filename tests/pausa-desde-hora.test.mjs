import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const main = readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');
const start = main.indexOf('function updateLiveActivityBar');
const body = main.slice(start, start + 6500);

test('Break y Lunch en curso sin horario muestran "Desde la hora" como la llamada', () => {
  assert.match(body, /info\.type === 'break' \|\| info\.type === 'lunch'\) && !liveRange && info\.startedAt/);
  assert.match(body, /pauseStart/);
  assert.match(body, /translateText\('Desde'\)/);
});

test('la llamada sigue mostrando su "Desde la hora"', () => {
  assert.match(body, /info\.type === 'call' && info\.startedAt/);
});
