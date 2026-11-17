import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const start = css.indexOf('/* nombres dentro de botones */');
const end = css.indexOf('/* fin nombres dentro de botones */');
const block = css.slice(start, end);

test('el nombre de los botones va dentro del boton solo en escritorio', () => {
  assert.ok(start > 0 && end > start);
  assert.match(block, /@media \(min-width: 761px\)/);
  assert.match(block, /\.action-short \{ position: absolute;/);
  assert.match(block, /height: 56px/);
  assert.doesNotMatch(block, /#[0-9a-fA-F]{3,8}\b/);
});

test('con un break o llamada en curso el nombre tambien queda dentro del boton', () => {
  assert.match(block, /is-active[^{]*> \.action-short \{ position: absolute/);
  assert.match(block, /is-active[^{]*> \.action-btn \{ height: 56px/);
});

test('el nombre del boton activo va en blanco como el cronometro', () => {
  assert.match(block, /is-active[^{]*> \.action-short \{ color: white; \}/);
  assert.doesNotMatch(block, /color: inherit/);
});

test('todos los nombres de la barra van en blanco en escritorio', () => {
  const s2 = css.indexOf('/* nombres blancos todos */');
  const e2 = css.indexOf('/* fin nombres blancos todos */');
  assert.ok(s2 > 0 && e2 > s2);
  const b2 = css.slice(s2, e2);
  assert.match(b2, /@media \(min-width: 761px\)/);
  assert.match(b2, /> \.action-short \{ color: white; \}/);
  assert.match(b2, /not\(\.theme-light\)[^{]*discard[^{]*\{ color: white; \}/);
  assert.doesNotMatch(b2, /#[0-9a-fA-F]{3,8}\b/);
});

test('los botones activos de llamada, break y lunch miden 120 px solo en escritorio', () => {
  const s3 = css.indexOf('/* botones activos largos */');
  const e3 = css.indexOf('/* fin botones activos largos */');
  assert.ok(s3 > 0 && e3 > s3);
  const b3 = css.slice(s3, e3);
  assert.match(b3, /@media \(min-width: 761px\)/);
  assert.match(b3, /flex: 0 0 120px; max-width: none;/);
  assert.match(b3, /width: 100%;/);
  assert.doesNotMatch(b3, /#[0-9a-fA-F]{3,8}\b/);
});

test('en tema claro los nombres inactivos van en negro y los iconos activos en blanco', () => {
  const s4 = css.indexOf('/* tema claro nombres negros e iconos blancos */');
  const e4 = css.indexOf('/* fin tema claro nombres negros e iconos blancos */');
  assert.ok(s4 > 0 && e4 > s4);
  const b4 = css.slice(s4, e4);
  assert.match(b4, /:not\(:has\([^{]*> \.action-short \{ color: var\(--text\); \}/);
  assert.match(b4, /> \.action-btn svg \{ color: white; \}/);
  assert.match(b4, /#shiftControlBtn\.is-active/);
  assert.doesNotMatch(b4, /#[0-9a-fA-F]{3,8}\b/);
});

test('en tema oscuro los textos e iconos de los botones activos van en blanco con cualquier paleta', () => {
  const s5 = css.indexOf('/* tema oscuro activos blancos */');
  const e5 = css.indexOf('/* fin tema oscuro activos blancos */');
  assert.ok(s5 > 0 && e5 > s5);
  const b5 = css.slice(s5, e5);
  assert.match(b5, /:root:not\(\.theme-light\)/);
  assert.match(b5, /\.action-sub[^{]*\{ color: white; \}/);
  assert.match(b5, /svg \{ fill: white; \}/);
  assert.match(b5, /svg \* \{ stroke: white; \}/);
  assert.doesNotMatch(b5, /#[0-9a-fA-F]{3,8}\b/);
});
