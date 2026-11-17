import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const core = readFileSync(new URL('../css/app-core.css', import.meta.url), 'utf8');
const main = readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');
const a = css.indexOf('/* dinero dorado al llegar a la meta */');
const b = css.indexOf('/* fin dinero dorado al llegar a la meta */');

test('Dinero dorado: solo se pinta dorado con la clase is-goal-met, en Hoy y en Ciclo', () => {
  assert.ok(a > 0 && b > a);
  const block = css.slice(a, b);
  assert.match(block, /#earningsValue\.is-goal-met/);
  assert.match(block, /#cycleEarningsValue\.is-goal-met/);
  assert.match(block, /linear-gradient\(180deg, var\(--earnings-gold-top\)/);
  assert.match(block, /background-clip: text/);
  assert.match(block, /padding-right: \.12em/);
  assert.doesNotMatch(block, /#[0-9a-fA-F]{3,8}\b/);
  // Sin la clase no hay regla: el verde de siempre se queda.
  assert.doesNotMatch(block, /^#(cycleE|e)arningsValue\s*\{/m);
});

test('Dinero dorado: la app pone is-goal-met solo al llegar a la meta del día y a la del ciclo', () => {
  assert.match(main, /earningsValueEl\.classList\.toggle\('is-goal-met', goalUsd > 0 && goalPct >= 100\)/);
  assert.match(main, /cycleEarningsValueEl\.classList\.toggle\('is-goal-met', cycleGoalAmount > 0 && cycleGoalPct >= 100\)/);
});

test('Dinero dorado: el dorado tiene colores para el tema oscuro y para el claro', () => {
  for (const k of ['top', 'mid', 'low']) {
    assert.equal((core.match(new RegExp(`--earnings-gold-${k}:`, 'g')) || []).length, 3);
  }
});
