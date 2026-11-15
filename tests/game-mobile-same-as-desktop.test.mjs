import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync('css/app-shell.css', 'utf8');
const js = readFileSync('js/app-main.js', 'utf8');
const block = css.slice(css.indexOf('/* juego en celular igual que escritorio */'), css.indexOf('/* fin juego en celular igual que escritorio */'));

test('en celular el reto de hoy se ve igual que en escritorio (escena de 88 px) sin cambiar de lugar', () => {
  assert.ok(block.includes('@media (max-width: 760px)'));
  assert.ok(block.includes('grid-template-rows: 88px auto'));
  assert.ok(block.includes('#gameHomeDay .game-battle .game-battle-stage { height: 88px;'));
  assert.ok(block.includes('--battle-floor-lift: 15px'));
  assert.ok(!/(^|[\s{;])order\s*:/.test(block));
  assert.ok(!block.includes('position: fixed'));
});

test('en celular el selector de Arma queda en la franja de abajo, siempre visible', () => {
  assert.ok(js.includes("const inBar = day.classList.contains('hero-shift-game') || !desktopGameQuery?.matches;"));
  assert.ok(block.includes('.game-battle-loadout select'));
});
