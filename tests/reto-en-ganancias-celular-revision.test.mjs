import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync('css/app-shell.css', 'utf8');
const a11y = readFileSync('css/accessibility.css', 'utf8');
const js = readFileSync('js/app-main.js', 'utf8');
const block = css.slice(css.indexOf('/* reto en ganancias celular */'), css.indexOf('/* fin reto en ganancias celular */'));

test('en celular el reto solo entra a Ganancias mientras la vista Hoy se ve y se reacomoda al cambiar a Ciclo', () => {
  assert.ok(js.includes("document.getElementById('earningsDayView')?.style.display !== 'none'"));
  assert.ok(js.includes('&& !!earnRow && earnDayShown'));
  assert.ok(js.includes("new CustomEvent('earningsviewchange'"));
  assert.ok(js.includes("document.addEventListener('earningsviewchange', () => syncGameInActionsBar())"));
});

test('la vista esencial que apaga el progreso de Logros tambien esconde el reto dentro de Ganancias', () => {
  assert.ok(a11y.includes('.essential-hide-game #gameHomeDay'));
});

test('en pantalla tactil Disparar y Arma miden al menos 24 px de alto', () => {
  assert.ok(block.includes('@media (max-width: 760px) and (pointer: coarse)'));
  const touch = block.slice(block.indexOf('@media (max-width: 760px) and (pointer: coarse)'));
  assert.ok(touch.includes('.game-battle-footer > button { min-height: 24px; }'));
  assert.ok(touch.includes('.game-battle-loadout select { min-height: 24px; }'));
});
