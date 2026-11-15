import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync('css/app-shell.css', 'utf8');
const block = css.slice(css.indexOf('/* juego baja en ventana angosta */'), css.indexOf('/* fin juego baja en ventana angosta */'));

test('en ventana angosta de escritorio el juego baja a su propia fila en vez de salirse de la barra', () => {
  assert.ok(block.includes('@media (min-width: 761px)'));
  assert.ok(block.includes('.has-game { flex-wrap: wrap; }'));
  assert.ok(block.includes('flex: 1 1 400px'));
  assert.ok(block.includes('min-width: 320px'));
});
