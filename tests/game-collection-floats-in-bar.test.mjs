import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync('css/app-shell.css', 'utf8');
const block = css.slice(css.indexOf('/* logros flotante en la barra */'), css.indexOf('/* fin logros flotante en la barra */'));

test('con el juego en la barra, lo que abre Logros sale como panel flotante y no agranda la barra', () => {
  assert.ok(block.includes('@media (min-width: 761px)'));
  assert.ok(block.includes('.game-battle-collection { position: absolute; top: calc(100% + 6px);'));
  assert.ok(block.includes('z-index: 30'));
  assert.ok(block.includes('max-height: min(60vh, 420px)'));
});

test('el panel flotante no queda recortado ni tapado por las tarjetas de abajo', () => {
  assert.ok(block.includes('#gameHomeDay.hero-shift-game'));
  assert.ok(block.includes('.game-arena { overflow: visible; }'));
  assert.ok(block.includes('.game-battle-collection:not([hidden])'));
  assert.ok(block.includes('position: relative; z-index: 40; overflow: visible;'));
});
