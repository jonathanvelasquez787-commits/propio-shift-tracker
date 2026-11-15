import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync('css/game-battle.css', 'utf8');
const a = css.indexOf('/* meta dentro de la escena */');
const block = css.slice(a, css.indexOf('/* fin meta dentro de la escena */'));

test('la meta y la barra van encima de la escena, en la misma celda de la grilla', () => {
  assert.ok(a > 0);
  assert.ok(block.includes('.game-battle-stage { grid-column: 1; grid-row: 2;'));
  assert.ok(block.includes('.game-battle-health { grid-column: 1; grid-row: 2; align-self: start;'));
});

test('Disparar y Logros van abajo de la escena, centrados y sin la linea divisoria', () => {
  assert.ok(block.includes('.game-battle-footer {') || block.includes('.game-battle-footer,'));
  assert.ok(block.includes('align-self: end'));
  assert.ok(block.includes('justify-content: center'));
  assert.ok(block.includes('border-top: 0'));
});
