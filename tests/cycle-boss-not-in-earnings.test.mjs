import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync('app.html', 'utf8');

test('la tarjeta Ganancias del ciclo ya no muestra al jefe del ciclo (Guardián de la Quincena)', () => {
  assert.ok(!html.includes('id="gameCycleBoss"'));
  const inicio = html.indexOf('id="cycleGoalAmountBadge"');
  assert.ok(inicio > 0);
  assert.ok(!html.slice(inicio - 1500, inicio).includes('game-cycle-boss-head'));
});

test('el jefe del ciclo sigue en la página de Logros', () => {
  assert.ok(html.includes('id="gameCycleBossAchievements"'));
});
