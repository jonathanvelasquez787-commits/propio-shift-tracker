import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync('css/app-shell.css', 'utf8');
const js = readFileSync('js/app-main.js', 'utf8');
const block = css.slice(css.indexOf('/* linea y reto estrecho */'), css.indexOf('/* fin linea y reto estrecho */'));

test('en escritorio hay una línea doble entre los botones y el reto de hoy, y el reto no pasa de 520 px', () => {
  assert.ok(js.includes("sep.className = 'hero-shift-game-sep'"));
  assert.ok(js.includes('hero.insertBefore(sep, day)'));
  assert.ok(block.includes('.hero-shift-game-sep { display: block; order: 99; flex: 0 0 2px; width: 2px; height: 46px;'));
  assert.ok(block.includes('box-shadow: 4px 0 0'));
  assert.ok(block.includes('.hero-shift-game { max-width: 520px; }'));
  assert.ok(block.includes('.hero-shift-game-sep + .hero-shift-game { margin-left: 0; }'));
});

test('en celular el reto mide lo mismo de ancho que la barra de botones, sin línea y sin pegarse arriba', () => {
  assert.ok(block.includes('@media (max-width: 760px)'));
  assert.ok(block.includes('.hero-shift-game-sep { display: none; }'));
  assert.ok(block.includes('#gameHomeDay { margin-left: 15px; margin-right: 15px; }'));
  assert.ok(!block.includes('position: sticky'));
  assert.ok(!block.includes('position: fixed'));
});

test('la línea se mide contra un botón y se vuelve a medir cuando cambia el tamaño de la barra', () => {
  assert.ok(js.includes("hero.querySelector('button')"));
  assert.ok(!js.includes('sep.getBoundingClientRect().bottom'));
  assert.ok(js.includes('new ResizeObserver(() => placeGameSeparator())'));
});

test('las líneas quedan a la izquierda junto al reto, no se ocultan al pegarse arriba y en celular el reto deja espacio abajo', () => {
  assert.ok(block.includes('height: 46px; margin: 0 8px 0 4px;'));
  assert.ok(!block.includes('is-stuck'));
  assert.ok(block.includes('#gameHomeDay { margin-left: 15px; margin-right: 15px; margin-bottom: 12px; }'));
});
