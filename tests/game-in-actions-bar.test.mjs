import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const js = readFileSync('js/app-main.js', 'utf8');
const css = readFileSync('css/app-shell.css', 'utf8');
const block = css.slice(css.indexOf('/* juego en la barra */'), css.indexOf('/* fin juego en la barra */'));

test('en escritorio el juego del día se mueve dentro de la barra de acciones y vuelve en celular', () => {
  assert.ok(js.includes("window.matchMedia('(min-width: 761px)')"));
  assert.ok(js.includes('function syncGameInActionsBar'));
  assert.ok(js.includes('hero.appendChild(day)'));
  assert.ok(js.includes('group.prepend(day)'));
  assert.ok(js.includes("page === 'home'"));
});

test('la barra con juego deja los botones y el juego juntos a la izquierda y todo se queda pegado al bajar, solo en escritorio', () => {
  assert.ok(block.includes('@media (min-width: 761px)'));
  assert.ok(block.includes('justify-content: flex-start'));
  assert.ok(!block.includes('margin: 0 0 0 auto'));
  assert.ok(!block.includes('.is-stuck > .hero-shift-game { display: none; }'));
});
