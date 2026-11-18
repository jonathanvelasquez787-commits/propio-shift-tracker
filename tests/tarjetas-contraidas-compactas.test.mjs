import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const a = css.indexOf('/* tarjetas contraidas compactas */');
const b = css.indexOf('/* fin tarjetas contraidas compactas */');
const block = css.slice(a, b);

test('tarjetas contraidas compactas: 36 px de alto, una linea y solo tocan tarjetas contraidas', () => {
  assert.ok(a >= 0 && b > a, 'faltan los marcadores del bloque CSS');
  assert.match(block, /\.sblk-card\.is-collapsed \{[^}]*height: 36px !important/);
  assert.match(block, /\.sblk-card\.is-collapsed \.sblk-extra \{ display: none !important; \}/);
  assert.match(block, /\.sblk-head \{ flex: 1 1 100% !important; width: 100% !important/);
  assert.doesNotMatch(block, /\.sblk-card:not\(\.is-collapsed\)/);
});

test('tarjetas contraidas compactas: la etiqueta lleva un punto de color y en celular queda solo la hora', () => {
  assert.match(block, /\.sblk-status::before \{ content: ""/);
  assert.match(block, /background: currentColor/);
  const m = block.slice(block.indexOf('@media (max-width: 700px)'));
  assert.match(m, /span:nth-child\(n\+2\) \{ display: none !important; \}/);
});

test('tarjetas contraidas compactas: sin colores fijos y con llaves balanceadas', () => {
  assert.doesNotMatch(block, /#[0-9a-fA-F]{3,8}\b/);
  assert.equal(block.split('{').length, block.split('}').length);
});
