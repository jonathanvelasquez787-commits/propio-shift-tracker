import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const core = readFileSync(new URL('../css/app-core.css', import.meta.url), 'utf8');
const a = css.indexOf('/* ciclo dinero dorado */');
const b = css.indexOf('/* fin ciclo dinero dorado */');

test('Ciclo: el dinero del ciclo se pinta con un dorado metálico y no con el verde', () => {
  assert.ok(a > 0 && b > a);
  const block = css.slice(a, b);
  assert.match(block, /#earningsCycleView #cycleEarningsValue/);
  assert.match(block, /linear-gradient\(180deg, var\(--earnings-cycle-gold-top\)/);
  assert.match(block, /background-clip: text/);
  assert.match(block, /padding-right: \.12em/);
  assert.doesNotMatch(block, /#[0-9a-fA-F]{3,8}\b/);
  assert.doesNotMatch(block, /#earningsValue/);
});

test('Ciclo: el dorado tiene colores para el tema oscuro y para el claro', () => {
  const count = (core.match(/--earnings-cycle-gold-top:/g) || []).length;
  assert.equal(count, 3);
  assert.equal((core.match(/--earnings-cycle-gold-mid:/g) || []).length, 3);
  assert.equal((core.match(/--earnings-cycle-gold-low:/g) || []).length, 3);
});
