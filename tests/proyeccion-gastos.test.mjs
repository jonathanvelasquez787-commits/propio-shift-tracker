import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const boot = readFileSync(new URL('../js/boot.js', import.meta.url), 'utf8');
const finance = readFileSync(new URL('../js/finance.js', import.meta.url), 'utf8');
const main = readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');

function projectionCode() {
  const at = boot.indexOf('function renderCycleProjection()');
  return boot.slice(at, boot.indexOf('function injectCycleProjection()'));
}

test('proyeccion gastos: ya no sale la fila Al ritmo de hoy', () => {
  assert.doesNotMatch(projectionCode(), /Al ritmo de hoy/);
});

test('proyeccion gastos: arriba va Para llegar a tu meta y debajo Gastos del ciclo', () => {
  const code = projectionCode();
  assert.match(code, /first\.innerHTML = firstRowHtml/);
  assert.match(code, /rows\.innerHTML = secondRowHtml/);
  const meta = code.indexOf('Para llegar a tu meta');
  const gastos = code.indexOf('Gastos del ciclo');
  assert.ok(meta > 0 && gastos > meta);
  assert.match(code, /financeGastosSummary\(\)/);
});

test('proyeccion gastos: los totales salen de las filas de gastos de Finanzas', () => {
  const at = finance.indexOf('export function financeGastosSummary()');
  assert.ok(at > 0);
  const piece = finance.slice(at, at + 700);
  assert.match(piece, /financeGastoRowsSorted\(\)/);
  assert.match(piece, /assignedAmount/);
  assert.match(piece, /targetAmount/);
  assert.match(main, /window\.financeGastosSummary = financeGastosSummary/);
});
