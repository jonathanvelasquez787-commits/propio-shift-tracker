import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const financeJs = readFileSync(new URL('../js/finance.js', import.meta.url), 'utf8');

const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const sectionStart = html.indexOf('id="financeSection"');
const section = html.slice(sectionStart, html.indexOf('</section>', sectionStart));

test('Finanzas: la parte de arriba es un solo bloque con título, siguiente prioridad, disponible y casilla', () => {
  const top = section.slice(section.indexOf('class="fin-top"'), section.indexOf('id="financeTabToggle"'));
  assert.ok(top.length > 0, 'existe .fin-top');
  const header = top.slice(top.indexOf('class="fin-header"'), top.indexOf('class="fin-available-card"'));
  assert.ok(header.includes('id="financeNextPriorityVal"'), 'Siguiente prioridad va en el encabezado');
  assert.ok(!section.includes('class="fin-sub"'), 'sin frase bajo el título');
  for (const id of ['financeAvailableAmt', 'financeAvailableConverted', 'financeAutoFillInput']) {
    assert.equal(top.split(`id="${id}"`).length, 2, `#${id} dentro del bloque, una sola vez`);
  }
});

test('Finanzas: el texto largo de la casilla automática va detrás de una "i"', () => {
  assert.doesNotMatch(section, /<p class="sched-hint"/);
  const row = section.slice(section.indexOf('class="fin-auto-row"'), section.indexOf('id="financeTabToggle"'));
  assert.match(row, /class="sched-compact-info-btn"[^>]*aria-describedby="financeAutoFillInfoTooltip"/);
  assert.match(row, /id="financeAutoFillInfoTooltip" role="tooltip">Reserva el disponible en orden de prioridad/);
});

test('Finanzas: en celular el resumen Total va en filas con el monto a la derecha', () => {
  assert.match(css, /#pageFinance \.wk-total-metrics\{flex-direction:column/);
  assert.match(css, /#pageFinance \.wk-total-metric\{display:flex;justify-content:space-between/);
  assert.match(css, /#financeSection \.fin-top\{border:1px solid var\(--line\)/);
});

test('Finanzas: el resumen de Total gastos dice "Presupuestado" junto a Reservado y Pendiente', () => {
  const row = financeJs.slice(financeJs.indexOf('function financeTotalsRowHtml'), financeJs.indexOf('export function renderFinanceSection'));
  assert.match(row, /translateText\('Presupuestado'\)/);
  assert.doesNotMatch(row, /translateText\('Presupuesto'\)/);
});
