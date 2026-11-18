import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const a = css.indexOf('/* tarjetas compactas */');
const b = css.indexOf('/* fin tarjetas compactas */');
const block = css.slice(a, b);

test('tarjetas compactas: solo tocan tarjetas abiertas y la etiqueta Hecho/Actual queda en la misma linea del titulo', () => {
  assert.ok(a >= 0 && b > a, 'faltan los marcadores del bloque CSS');
  assert.match(block, /\.sblk-card:not\(\.is-collapsed\) \{ padding: 10px 12px !important; \}/);
  assert.match(block, /\.sblk-head \.sblk-status \{ position: static !important; margin-left: auto !important; \}/);
  assert.match(block, /\.sblk-head \{[^}]*flex-wrap: nowrap/);
  assert.doesNotMatch(block, /\.sblk-card\.is-collapsed/);
});

test('tarjetas compactas: Usado comparte fila con su barra y en 470 px o menos queda apilado', () => {
  assert.match(block, /grid-template-columns: auto minmax\(0,1fr\) auto/);
  assert.match(block, /\.sblk-bar-label-row \{ display: contents/);
  const m = block.slice(block.indexOf('@media (max-width: 470px)'));
  assert.match(m, /\.sblk-bar-row \{ display: block !important; \}/);
  assert.match(m, /\.sblk-tile \{ display: block !important; \}/);
});

test('tarjetas compactas: sin colores fijos y con llaves balanceadas', () => {
  assert.doesNotMatch(block, /#[0-9a-fA-F]{3,8}\b/);
  assert.equal(block.split('{').length, block.split('}').length);
});
