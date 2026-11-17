import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const a = css.indexOf('/* ciclo botones tamano pildoras */');
const b = css.indexOf('/* fin ciclo botones tamano pildoras */');

test('Ciclo: los botones Anterior, Ciclo actual y Siguiente miden lo mismo que las píldoras', () => {
  assert.ok(a > 0 && b > a);
  const block = css.slice(a, b);
  assert.match(block, /#earningsCycleView \.week-nav button\{padding:5px 10px;font-size:10\.5px;min-height:0/);
});
