import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const main = readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');

test('Ciclo: los botones Anterior, Ciclo actual y Siguiente van debajo del dinero', () => {
  const cycle = html.slice(html.indexOf('id="earningsCycleView"'));
  const money = cycle.indexOf('id="cycleEarningsValue"');
  const nav = cycle.indexOf('id="cyclePrevBtn"');
  const tags = cycle.indexOf('id="cycleTagsRow"');
  assert.ok(money > 0 && nav > money && tags > nav);
});

test('Ciclo: el subtítulo es solo Total del ciclo', () => {
  assert.match(main, /translateText\('Total del ciclo'\)/);
  assert.doesNotMatch(main, /Total del ciclo de pago actual/);
});

test('Ciclo: las píldoras tienen más aire que antes', () => {
  const a = css.indexOf('/* ciclo pildoras abajo */');
  const b = css.indexOf('/* fin ciclo pildoras abajo */');
  assert.ok(a > 0 && b > a);
  const block = css.slice(a, b);
  assert.match(block, /#cycleTagsRow\{margin:16px 0 14px\}/);
  assert.match(block, /gap:8px/);
});
