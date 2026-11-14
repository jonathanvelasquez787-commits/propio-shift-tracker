import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const js = readFileSync(new URL('../js/finance.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');

test('Finanzas: tarjeta de gasto compacta con una sola barra de monto', () => {
  const start = js.indexOf('<div class="fin-row-bar">');
  assert.ok(start > 0, 'existe la barra unida');
  const bar = js.slice(start, js.indexOf('</div>', js.indexOf('>Aplicar</button>', start)));
  for (const piece of ["financeAmountInputHtml(row, 'reservation')", '${signPillHtml}', 'data-fin-apply=']) {
    assert.ok(bar.includes(piece), `la barra contiene ${piece}`);
  }
  assert.ok(!bar.includes('data-fin-reset'), 'Liberar reserva queda fuera de la barra');
  assert.ok(!bar.includes('data-fin-edit') && !bar.includes('data-fin-delete'), 'Editar y Eliminar quedan fuera de la barra');
  assert.ok(js.includes('data-fin-mark-paid'), 'se conserva Omitir reserva automática');
});

test('Finanzas: en celular la tarjeta de gasto reordena sin cambiar sus botones', () => {
  assert.match(css, /#pageFinance \.fin-row-main,#pageFinance \.fin-row-actions\{display:contents\}/);
  assert.match(css, /#pageFinance \.fin-row-bar\{order:5;flex:0 0 100%;display:flex/);
  assert.match(css, /#pageFinance \.fin-row-sub\{order:2/);
});
