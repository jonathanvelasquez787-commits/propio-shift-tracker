import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync('css/app-shell.css', 'utf8');
const js = readFileSync('js/app-main.js', 'utf8');
const battle = readFileSync('js/game-battle.js', 'utf8');
const start = css.indexOf('/* juego a la altura de los botones */');
const block = css.slice(start, css.indexOf('/* fin juego a la altura de los botones */'));

test('en la barra la escena del juego mide 88 px y todo va dentro de ella en una sola celda', () => {
  assert.ok(start > 0);
  assert.ok(block.includes('@media (min-width: 761px)'));
  assert.ok(block.includes('grid-template-rows: 88px auto'));
  assert.ok(block.includes('.game-battle-stage { height: 88px;'));
  assert.ok(block.includes('.game-battle-footer { grid-column: 1; grid-row: 1; }'));
  assert.ok(block.includes('.game-battle-collection { grid-row: 2; }'));
});

test('arriba van el reto y la meta en una franja y abajo los botones, sin tocar el tamaño de los botones de acción', () => {
  assert.ok(block.includes('.game-battle-head { align-self: start;'));
  assert.ok(block.includes('.game-compact-goal-track { position: absolute;'));
  assert.ok(block.includes('.game-battle-footer { align-self: end;'));
  assert.ok(!block.includes('.action-btn'));
  assert.ok(!block.includes('.action-slot'));
});

test('el selector de Arma sube a la franja de abajo en la barra y vuelve a Logros fuera de ella', () => {
  assert.ok(js.includes('function placeBattleLoadout'));
  assert.ok(js.includes("footer.insertBefore(loadout, footer.querySelector('[data-battle-collection-toggle]'))"));
  assert.ok(js.includes('slots.appendChild(loadout)'));
  assert.ok(js.includes('new MutationObserver(() => placeBattleLoadout())'));
  assert.ok(block.includes('.game-battle-loadout select'));
});

test('el piso del juego sube sobre la franja de abajo con --battle-floor-lift y el monstruo queda parado sobre él', () => {
  assert.ok(block.includes('--battle-floor-lift: 15px'));
  assert.ok(battle.includes('--battle-floor-lift'));
  assert.ok(battle.includes('floor: (height - lift) / stageScale - 26'));
  assert.ok(block.includes('.game-battle-monster { bottom: 24px;'));
});
