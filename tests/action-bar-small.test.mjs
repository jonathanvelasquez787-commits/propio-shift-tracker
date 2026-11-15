import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync('css/app-shell.css', 'utf8');
const start = css.indexOf('/* botones barra chicos */');
const end = css.indexOf('/* fin botones barra chicos */');
const block = css.slice(start, end);

test('Barra de acciones: los botones miden 40 de ancho por 34 de alto', () => {
  assert.ok(start > 0 && end > start, 'el bloque CSS está marcado');
  assert.match(block, /\.action-slot \{ flex: 0 0 auto; width: 40px;/);
  assert.match(block, /min-height: 34px;/);
  assert.doesNotMatch(block, /min-height: 4\d/);
});

test('Barra de acciones: los botones quedan centrados y el que está en curso puede crecer para mostrar su tiempo', () => {
  assert.match(block, /justify-content: center/);
  assert.match(block, /is-active\),[\s\S]*\{ width: auto; \}/);
});
