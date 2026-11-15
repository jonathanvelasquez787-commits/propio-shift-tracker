import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('app.html', 'utf8');
const css = fs.readFileSync('css/app-shell.css', 'utf8');
const sched = fs.readFileSync('js/schedule.js', 'utf8');
const card = html.slice(html.indexOf('id="scheduleConfigAccordion"'), html.indexOf('id="saveShiftWindowBtn"'));

test('Horario rediseño A: el encabezado trae título, selector de modo y ayuda en una sola tarjeta', () => {
  assert.ok(card.includes('class="sched-rd-head"'));
  assert.ok(card.includes('id="scheduleModeTabs"') && card.includes('id="scheduleHelpBtn"'));
  assert.ok(card.indexOf('id="scheduleModeTabs"') < card.indexOf('id="scheduleHelpBtn"'));
  assert.ok(!/<details[^>]*scheduleConfigAccordion/.test(html), 'la tarjeta ya no es un acordeón');
  assert.equal(html.split('id="scheduleModeTabs"').length, 2, 'un solo selector de modo');
});

test('Horario rediseño A: ya no están los textos explicativos viejos', () => {
  assert.ok(!card.includes('Día a editar</div>'));
  assert.ok(!card.includes('Plantilla: tu horario semanal.'));
  assert.ok(!card.includes('Bloques del día (Trabajo, Break, Lunch)'));
  assert.ok(!card.includes('Cuándo empiezas, cuándo terminas'));
  assert.ok(!sched.includes('Editando tu horario de siempre'));
});

test('Horario rediseño A: la fila del día conserva los ids y suma el chip de duración y el interruptor', () => {
  for (const id of ['schedDayCardTitle', 'dayStartInput', 'dayEndInput', 'dayOffInput', 'schedShiftLenChip']) {
    assert.ok(card.includes(`id="${id}"`), id);
  }
  assert.ok(card.includes('role="switch"'));
});

test('Horario rediseño A: la tira de la semana muestra horas cortas y "Libre"', () => {
  assert.ok(sched.includes('function shortShiftRange'));
  assert.ok(sched.includes('day-tab-hours'));
  assert.ok(sched.includes("translateText('Libre')"));
  assert.ok(sched.includes('export function updateShiftLenChip'));
});

test('Horario rediseño A: el CSS nuevo está en su bloque marcado y la tira es una grilla de 7 columnas', () => {
  const a = css.indexOf('/* horario rediseño */');
  const b = css.indexOf('/* fin horario rediseño */');
  assert.ok(a > 0 && b > a);
  const block = css.slice(a, b);
  assert.match(block, /sched-weekstrip \{ display: grid; grid-template-columns: repeat\(7, minmax\(0, 1fr\)\)/);
  assert.match(block, /@media \(max-width: 760px\)/);
});
