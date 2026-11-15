import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync('css/app-shell.css', 'utf8');
const start = css.indexOf('/* botones barra escritorio */');
const end = css.indexOf('/* fin botones barra escritorio */');
const block = css.slice(start, end);

test('Barra de acciones: solo en escritorio los botones vuelven a 72 de ancho por 46 de alto', () => {
  assert.ok(start > 0 && end > start, 'el bloque CSS está marcado');
  assert.match(block, /@media \(min-width: 761px\)/);
  assert.match(block, /\.action-slot \{ flex: 0 0 auto; width: 72px; \}/);
  assert.match(block, /min-height: 46px;/);
  assert.doesNotMatch(block, /max-width/);
});

test('Barra de acciones: en celular los botones chicos de 40 por 34 no se tocan', () => {
  const small = css.slice(css.indexOf('/* botones barra chicos */'), css.indexOf('/* fin botones barra chicos */'));
  assert.match(small, /width: 40px;/);
  assert.match(small, /min-height: 34px;/);
  assert.ok(start > css.indexOf('/* fin botones barra chicos */'), 'el bloque de escritorio va después del de celular');
});
