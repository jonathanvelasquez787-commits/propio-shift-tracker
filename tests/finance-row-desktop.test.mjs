import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const js = readFileSync(new URL('../js/finance.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');

test('Finanzas escritorio: la tarjeta de gasto agrupa nombre y medidor para ir en una sola fila', () => {
  const main = js.slice(js.indexOf('<div class="fin-row-main">'), js.indexOf('<span class="fin-badge'));
  const id = main.slice(main.indexOf('class="fin-row-id"'), main.indexOf('class="fin-row-meter"'));
  const meter = main.slice(main.indexOf('class="fin-row-meter"'));
  assert.ok(id.includes('fin-row-title') && id.includes('fin-row-sub'), 'título y categoría juntos');
  assert.ok(meter.includes('fin-row-amt-line') && meter.includes('fin-progress-track'), 'reservado y barra juntos');
});

test('Finanzas escritorio: controles abajo en una fila con la barra unida y la casilla a la derecha', () => {
  const block = css.slice(css.indexOf('@media(min-width:761px){\n#pageFinance .fin-row{'));
  assert.ok(block.length > 0, 'bloque de escritorio');
  assert.match(block, /#pageFinance \.fin-row-actions\{display:contents\}/);
  assert.match(block, /#pageFinance \.fin-row::before\{content:"";order:3;flex:0 0 100%/);
  assert.match(block, /#pageFinance \.fin-checkbox-label\{order:5;[^}]*margin:0 0 0 auto/);
  assert.match(block, /#pageFinance \.wk-total-metrics\{display:flex;[^}]*justify-content:flex-end/);
  assert.match(css, /@media\(max-width:760px\)\{#pageFinance \.fin-row-id,#pageFinance \.fin-row-meter\{display:contents\}\}/);
});
