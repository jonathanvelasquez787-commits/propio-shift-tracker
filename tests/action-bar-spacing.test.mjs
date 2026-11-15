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

test('barra de acciones: el celular conserva su separación y los botones no cambian de tamaño', () => {
  assert.ok(block.startsWith('/* botones barra escritorio */'));
  assert.match(block, /@media \(min-width: 761px\) \{/);
  assert.match(block, /\.action-slot \{ flex: 0 0 auto; width: 72px; \}/, 'el tamaño de los botones no cambia');
  assert.match(css, /\.chips > \.hero-shift-actions \{ justify-content: center; align-items: center; gap: 6px; padding: 7px 10px; \}/, 'el celular conserva su separación');
});
