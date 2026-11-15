import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync('css/app-shell.css', 'utf8');
const start = css.indexOf('/* barra en dos mitades */');
const end = css.indexOf('/* fin barra en dos mitades */');
const block = css.slice(start, end);

test('Barra de acciones: los botones de turno y los de llamadas se centran cada uno en su mitad', () => {
  assert.ok(start > 0 && end > start, 'el bloque CSS está marcado');
  assert.match(block, /\.hero-shift-sep \{ margin: 0 auto; \}/);
  assert.match(block, /data-slot="shift"\] \{ margin-left: auto; \}/);
  assert.match(block, /data-slot="add"\] \{ margin-right: auto; \}/);
});
