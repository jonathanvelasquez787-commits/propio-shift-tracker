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
