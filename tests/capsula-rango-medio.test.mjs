import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const a = css.indexOf('/* capsula rango medio */');
const b = css.indexOf('/* fin capsula rango medio */');
const block = css.slice(a, b);

test('capsula rango medio: de 761 a 1179 px los otros botones conservan su nombre y se achican poco a poco, y la barra no crece', () => {
  assert.ok(a >= 0 && b > a, 'faltan los marcadores del bloque CSS');
  assert.match(block, /@media \(min-width: 761px\) and \(max-width: 1179px\)/);
  assert.match(block, /--cap-gap: 6px/);
  assert.match(block, /flex: 0 1 108px !important/);
  assert.match(block, /> \.action-short \{ display: block !important; \}/);
  assert.match(block, /min-width: 215px/);
  assert.doesNotMatch(block, /display: none !important/);
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

test('capsula rango medio: desde 761 px la pildora de Break y Lunch muestra nombre, cronometro, horario y barra como en celular', () => {
  const c = css.indexOf('/* pildora igual en compu */');
  const d = css.indexOf('/* fin pildora igual en compu */');
  assert.ok(c >= 0 && d > c, 'faltan los marcadores del bloque CSS');
  const blk = css.slice(c, d);
  assert.match(blk, /@media \(min-width: 761px\)/);
  assert.match(blk, /\.hbc-slide > \* \{ visibility: hidden; \}/);
  assert.match(blk, /\.hbc-live \.hbc-live-r2 \{ display: block;/);
  assert.match(blk, /\.hbc-live \.hbc-live-bar \{ position: absolute;/);
  assert.match(blk, /min-width: 172px/);
  assert.doesNotMatch(blk, /#[0-9a-fA-F]{3,8}\b/);
});
