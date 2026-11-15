import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/game.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

function block() {
  const start = css.indexOf('/* logros-tarjeta-nivel-compacta */');
  assert.ok(start > 0, 'bloque marcado');
  return css.slice(start, css.indexOf('/* fin logros-tarjeta-nivel-compacta */', start));
}

test('Logros en celular: Nivel y XP van en una línea, sin el círculo con el número', () => {
  const b = block();
  assert.match(b, /@media \(max-width: 640px\)/);
  assert.match(b, /\.game-progress-card \.game-level-emblem\s*\{\s*display:\s*none/);
  assert.match(b, /\.game-level-panel > \.game-level-foot\s*\{[^}]*grid-column:\s*2;\s*grid-row:\s*1/);
  assert.match(b, /\.game-level-panel > \.game-panel-head\s*\{[^}]*grid-column:\s*1;\s*grid-row:\s*1/);
});

test('Logros en celular: Desbloqueos por nivel queda en una sola línea sin subtítulo', () => {
  assert.match(block(), /\.game-unlock-details \.game-settings-accordion-copy > small\s*\{\s*display:\s*none/);
});

test('Logros en celular: Racha, Mejor y Escudos van en una línea y los días son puntos con la letra debajo', () => {
  const b = block();
  assert.match(b, /\.game-progress-card > \.game-streak-panel\s*\{[^}]*display:\s*flex;\s*flex-wrap:\s*wrap/);
  assert.match(b, /\.game-streak-panel > \.game-panel-foot\s*\{[^}]*order:\s*2/);
  assert.match(b, /\.game-streak-panel > \.game-streak-week\s*\{[^}]*flex:\s*0 0 100%;\s*order:\s*3/);
  assert.match(b, /\.game-streak-day em\s*\{[^}]*order:\s*1/);
  assert.match(b, /\.game-streak-day b\s*\{[^}]*order:\s*2/);
  assert.ok(html.includes('<div class="game-panel-foot"><span>Escudos</span>'), 'etiqueta corta de escudos');
});

test('Logros: la tarjeta conserva los elementos que usa game.js', () => {
  for (const role of ['level', 'level-emblem', 'level-xp', 'next-level', 'level-progress', 'streak-best', 'streak-week', 'shields']) {
    assert.ok(html.includes(`data-game-role="${role}"`), role);
  }
  assert.ok(html.includes('id="gameReviewSummary"') && html.includes('data-game-dynamic="unlock-roadmap"'));
});
