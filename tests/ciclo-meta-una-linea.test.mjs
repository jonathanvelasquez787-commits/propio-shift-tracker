import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');

test('meta ciclo una linea: la tarjeta de Meta del ciclo tiene su id', () => {
  assert.match(html, /<div class="gh-goal-card" id="cycleGoalCard">/);
});

test('meta ciclo una linea: el CSS pone titulo, monto y convertido en una linea sin colores fijos', () => {
  const a = css.indexOf('/* meta ciclo una linea */');
  const b = css.indexOf('/* fin meta ciclo una linea */');
  assert.ok(a >= 0 && b > a);
  const block = css.slice(a, b);
  assert.match(block, /#cycleGoalCard \{[^}]*display: flex/);
  assert.match(block, /#cycleGoalCard > \.gh-goal-top \{ display: contents; \}/);
  assert.match(block, /@media \(max-width: 760px\)/);
  assert.doesNotMatch(block, /#[0-9a-fA-F]{3,8}\b/);
});
