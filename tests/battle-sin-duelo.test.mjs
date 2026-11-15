import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const js = readFileSync('js/game-battle.js', 'utf8');
const css = readFileSync('css/game-battle.css', 'utf8');

test('la batalla ya no muestra los botones Automático y Duelo', () => {
  assert.ok(!js.includes('game-battle-mode-row'));
  assert.ok(!js.includes('data-battle-duel-button'));
});

test('Disparar es un botón con borde y la barra de aturdimiento siempre se ve', () => {
  const a = css.indexOf('/* disparo de practica */');
  const b = css.indexOf('/* fin disparo de practica */');
  const bloque = css.slice(a, b);
  assert.ok(bloque.includes('button.game-battle-free-shot'));
  assert.ok(bloque.includes('border-radius: 999px'));
  assert.ok(!js.includes('data-battle-stun hidden'));
});
