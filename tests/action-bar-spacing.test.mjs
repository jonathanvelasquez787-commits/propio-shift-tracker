import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const start = css.indexOf('/* botones barra escritorio */');
const block = css.slice(start, css.indexOf('/* fin botones barra escritorio */'));

test('barra de acciones: en escritorio hay más espacio entre botones, con tope', () => {
  assert.ok(start > 0 && block.length > 50, 'existe el bloque de botones de escritorio');
  assert.match(block, /@media \(min-width: 761px\)/);
  assert.match(block, /\.chips > \.hero-shift-actions \{ gap: clamp\(8px, 1\.5vw, 20px\);/);
});

test('barra de acciones: el celular conserva su separación', () => {
  assert.ok(block.startsWith('/* botones barra escritorio */'));
  assert.match(block, /@media \(min-width: 761px\) \{/);
  assert.match(css, /\.chips > \.hero-shift-actions \{ justify-content: center; align-items: center; gap: 6px; padding: 7px 10px; \}/, 'el celular conserva su separación');
});

test('barra de acciones: en escritorio los botones son más anchos (108 px) y la altura no cambia', () => {
  assert.match(block, /\.action-slot \{ flex: 0 0 auto; width: 108px; \}/, 'ancho nuevo de 108 px');
  assert.doesNotMatch(block, /width: 72px/, 'ya no queda el ancho viejo');
  assert.match(block, /min-height: 46px/, 'la altura sigue igual');
  assert.match(block, /\.action-slot\[data-slot="discard"\] \{ width: auto; \}/, 'el botón de descartar sigue automático');
  assert.match(block, /#callControlBtn\)\.is-active/, 'los botones activos siguen automáticos');
});
