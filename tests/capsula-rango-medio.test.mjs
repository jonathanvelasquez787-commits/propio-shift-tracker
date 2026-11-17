import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const a = css.indexOf('/* capsula rango medio */');
const b = css.indexOf('/* fin capsula rango medio */');
const block = css.slice(a, b);

test('capsula rango medio: de 761 a 1179 px los otros botones se achican a solo icono y la barra no crece', () => {
  assert.ok(a >= 0 && b > a, 'faltan los marcadores del bloque CSS');
  assert.match(block, /@media \(min-width: 761px\) and \(max-width: 1179px\)/);
  assert.match(block, /--cap-gap: 6px/);
  assert.match(block, /width: 56px !important/);
  assert.match(block, /:is\(\.action-short, \.action-label, \.action-sub\) \{ display: none !important; \}/);
  assert.match(block, /height: 56px !important/);
  assert.doesNotMatch(block, /#[0-9a-fA-F]{3,8}\b/);
});

test('capsula rango medio: no queda ningun ancho desde 480 px sin capsula ni pildora en fila propia', () => {
  assert.match(css, /\/\* capsula larga \*\/[\s\S]*@media \(min-width: 480px\) \{/);
  assert.doesNotMatch(css, /max-width: 959px/);
  assert.doesNotMatch(css, /\(min-width: 960px\) and \(max-width: 1179px\)/);
  const stack = css.slice(css.indexOf('/* tarjeta de bloques en inicio */'), css.indexOf('/* fin tarjeta de bloques en inicio */'));
  assert.match(stack, /@media \(max-width: 479px\) \{\s*\.chips > \.hero-shift-actions \{ position: relative; padding-bottom: 64px; \}/);
});

test('capsula rango medio: el hover sube junto tambien desde 761 px', () => {
  const h = css.slice(css.indexOf('/* capsula sube junta */'), css.indexOf('/* fin capsula sube junta */'));
  assert.match(h, /\(hover: hover\) and \(pointer: fine\) and \(min-width: 480px\)/);
});
