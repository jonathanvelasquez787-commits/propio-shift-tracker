import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../js/schedule.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const row = (() => {
  const start = source.indexOf('<div class="block-row sched-tl-item sched-bk"');
  return source.slice(start, source.indexOf('`;', start));
})();

test('tarjeta de bloque del día: arriba tipo, duración y ×; abajo Desde, Hasta y Meta', () => {
  const [, top, fields] = row.split(/<div class="sched-bk-(?:top|fields)">/);
  assert.ok(top && fields, 'existen la línea de arriba y la de campos');
  for (const token of ['sched-tl-icon', 'block-type-input', 'sched-tl-duration', 'data-remove-block']) assert.match(top, new RegExp(token));
  for (const token of ['block-start-input', 'block-end-input', 'block-goal-input']) assert.match(fields, new RegExp(token));
  assert.doesNotMatch(top, /block-start-input|block-goal-input/);
});

test('tarjeta de bloque del día: la meta solo se ve en Trabajo y se conserva el subtítulo de día siguiente', () => {
  assert.match(row, /block-goal-field[\s\S]*type === 'work'/);
  assert.match(row, /<div class="sched-tl-subtitle">\$\{nextDayLabel\}<\/div>/);
  assert.doesNotMatch(row, /sched-tl-handle|⋮⋮/);
  assert.doesNotMatch(source, /Enfoque y productividad|Almuerzo \/ Descanso largo/);
});

test('Horario rediseño B: barra del día, agregar por tipo y sin línea de tiempo ni leyenda', () => {
  for (const id of ['schedDayBar', 'schedDayBarTicks', 'addWorkBlockBtn', 'addBreakBlockBtn', 'addLunchBlockBtn']) assert.ok(html.includes(`id="${id}"`), id);
  assert.ok(!html.includes('id="addBlockBtn"') && !html.includes('sched-legend-chip') && !html.includes('sched-timeline-add-row'));
  assert.ok(source.includes('export function renderDayBar') && source.includes('export function addBlockRow(forcedType)'));
});
