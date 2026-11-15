import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync('css/app-shell.css', 'utf8');
const js = readFileSync('js/app-main.js', 'utf8');
const block = css.slice(css.indexOf('/* reto en ganancias celular */'), css.indexOf('/* fin reto en ganancias celular */'));

test('en celular el reto de hoy se mueve a la fila de Ganancias, antes del anillo de la meta', () => {
  assert.ok(js.includes("document.querySelector('#earningsDayView .earn-row')"));
  assert.ok(js.includes("earnRow.insertBefore(day, earnRow.querySelector('.gh-ring-wrap'))"));
  assert.ok(js.includes('const inEarn = !desktopGameQuery?.matches'));
});

test('en la fila de Ganancias el reto mide 71 px de alto y esconde título, nombre, pausa y Ver mis Logros', () => {
  assert.ok(block.includes('@media (max-width: 760px)'));
  assert.ok(block.includes('.earn-row > #gameHomeDay { flex: 1 1 0; min-width: 96px; height: 71px; margin: 0; }'));
  assert.ok(block.includes('[data-game-nav] { display: none; }'));
  assert.ok(block.includes('.game-battle-heading > h3'));
  assert.ok(block.includes('data-battle-auto-pause'));
});
