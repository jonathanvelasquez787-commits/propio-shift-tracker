import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const a = css.indexOf('/* ciclo pildoras tamano hoy */');
const b = css.indexOf('/* fin ciclo pildoras tamano hoy */');

test('Ciclo: las píldoras tienen el mismo tamaño que las de Ganancias de hoy', () => {
  assert.ok(a > 0 && b > a);
  const block = css.slice(a, b);
  assert.match(block, /padding:5px 8px;font-size:10\.5px/);
  assert.match(block, /\.gh-info-pill svg\{width:12px;height:12px\}/);
  assert.match(block, /gap:6px/);
});
