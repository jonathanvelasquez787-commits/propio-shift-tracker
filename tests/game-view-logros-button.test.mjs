import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const js = readFileSync('js/game-battle.js', 'utf8');
const css = readFileSync('css/app-shell.css', 'utf8');
const block = css.slice(css.indexOf('/* reto de hoy redondeado */'), css.indexOf('/* fin reto de hoy redondeado */'));

test('el botón de Logros del reto de hoy se llama Ver mis Logros y abre la página de Logros sin desplegable', () => {
  const footer = js.slice(js.indexOf('<div class="game-battle-footer">'), js.indexOf('<section id="gameBattleCollection"'));
  assert.ok(footer.includes('data-game-nav'));
  assert.ok(footer.includes('>Ver mis Logros</button>'));
  assert.ok(!footer.includes('data-battle-action="collection"'));
  assert.ok(!footer.includes('aria-expanded'));
  assert.ok(!footer.includes('⌄'));
});

test('todo el reto de hoy tiene las esquinas redondeadas y recorta lo de adentro', () => {
  assert.ok(block.includes('#gameHomeDay { border-radius: 12px; overflow: hidden; }'));
  assert.ok(block.includes('#gameHomeDay .game-battle { border-radius: 12px; overflow: hidden; }'));
});
