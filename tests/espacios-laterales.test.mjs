import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const bloque = css.slice(css.indexOf('/* espacios laterales */'), css.indexOf('/* fin espacios laterales */'));

test('espacios laterales: en escritorio la tarjeta principal mide 1180 px y queda centrada', () => {
  assert.ok(bloque.length > 30, 'falta el bloque espacios laterales');
  assert.match(bloque, /@media \(min-width: 901px\)/);
  assert.match(bloque, /max-width:\s*1180px/);
  assert.match(bloque, /margin-left:\s*auto/);
  assert.match(bloque, /margin-right:\s*auto/);
});

test('espacios laterales: no cambia celular ni tablet y no usa colores fijos', () => {
  assert.doesNotMatch(bloque, /max-width: 900px/);
  assert.doesNotMatch(bloque, /#[0-9a-fA-F]{3,8}\b/);
});
