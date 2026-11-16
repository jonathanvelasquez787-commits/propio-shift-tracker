import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const block = css.slice(css.indexOf('/* horario mas chico */'), css.indexOf('/* fin horario mas chico */'));

test('Horario se ve mas chico en compu y celular', () => {
  assert.match(block, /@media \(min-width: 761px\)[^}]*#pageSchedule \{ zoom: \.85; \}/);
  assert.match(block, /@media \(max-width: 760px\)[^}]*#pageSchedule \{ zoom: \.87; \}/);
});

test('Horario muestra los bloques en una sola columna', () => {
  assert.match(block, /@media \(max-width: 900px\)[\s\S]*#blocksEditorList\.sched-bk-list \{ grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(block, /@media \(min-width: 901px\)[\s\S]*#blocksEditorList\.sched-bk-list \{ grid-template-columns: minmax\(0, 1fr\)/);
});

test('En compu cada bloque es una sola linea con columnas fijas', () => {
  assert.match(block, /grid-template-columns: 30px 110px 74px 170px 170px 170px 1fr 34px/);
  assert.match(block, /\.sched-bk-top,[\s\S]*\.sched-bk-fields \{ display: contents; \}/);
  assert.doesNotMatch(block, /#[0-9a-fA-F]{3,8}\b/);
});
