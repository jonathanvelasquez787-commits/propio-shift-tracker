import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');
const a = css.indexOf('/* pildora igual en compu */');
const b = css.indexOf('/* fin pildora igual en compu */');
const block = css.slice(a, b);

test('pildora de llamada: en compu muestra nombre, cronometro y la hora en que empezo, como Break y Lunch', () => {
  assert.ok(a >= 0 && b > a, 'faltan los marcadores del bloque CSS');
  assert.match(block, /\[data-live-type="call"\]\) > \.hbc \.hbc-live \.hbc-live-r2/);
  assert.match(block, /\[data-live-type="call"\]\) > \.hbc \.hbc-live \.hbc-live-ic \{ display: none; \}/);
  assert.match(js, /info\.type === 'call' && info\.startedAt/);
  assert.match(js, /translateText\('Desde'\)/);
  assert.doesNotMatch(block, /#[0-9a-fA-F]{3,8}\b/);
  assert.equal(css.split('{').length - css.split('}').length, 0);
});
