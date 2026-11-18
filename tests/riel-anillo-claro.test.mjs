import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const bloque = css.split('/* riel y anillo en tema claro */')[1]?.split('/* fin riel y anillo en tema claro */')[0] || '';

test('en tema claro el riel del Volumen usa un gris visible', () => {
  assert.ok(bloque.length > 0, 'falta el bloque riel y anillo en tema claro');
  assert.match(bloque, /theme-light \.volume-row input\[type="range"\] \{ background: var\(--line-2\)/);
});

test('en tema claro el fondo del anillo de la meta usa un gris visible', () => {
  assert.match(bloque, /theme-light \.gh-ring \{ background: conic-gradient\(.*var\(--line-2\) 0\)/);
  assert.ok(!bloque.includes('rgba(255,255,255'), 'no debe usar blanco sobre blanco');
});

test('el CSS del riel y anillo tiene las llaves balanceadas', () => {
  assert.equal(css.split('{').length, css.split('}').length);
});
