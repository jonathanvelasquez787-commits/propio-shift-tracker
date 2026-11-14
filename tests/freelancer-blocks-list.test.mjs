import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const js = readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');

test('Bloques del día en freelancer: cada descanso es una fila con etiqueta, horas y minutos', () => {
  const start = js.indexOf('const freelancerBlocksOn');
  const block = js.slice(start, js.indexOf('if (!plannedSlots.length)', start));
  assert.ok(start > 0, 'bloque freelancer');
  assert.ok(block.includes('fl-break-row') && block.includes('fl-break-chip') && block.includes('fl-break-time') && block.includes('fl-break-min'));
  assert.ok(block.includes('Descansos de hoy'), 'subtítulo con resumen');
  assert.ok(block.includes("classList.toggle('sched-freelancer-list'"), 'marca la tarjeta solo en freelancer');
  assert.ok(block.includes('Todavía no has tomado descansos.'), 'texto sin descansos se conserva');
});

test('Bloques del día en freelancer: se esconden el botón de contraer y los huecos vacíos', () => {
  assert.match(css, /#scheduleAccordion\.sched-freelancer-list \.blocks-top-grid,#scheduleAccordion\.sched-freelancer-list \.day-metrics-row,#scheduleAccordion\.sched-freelancer-list \.blocks-footer-row\{display:none\}/);
  assert.match(css, /#scheduleAccordion\.sched-freelancer-list \.fl-break-row\{display:flex/);
});
