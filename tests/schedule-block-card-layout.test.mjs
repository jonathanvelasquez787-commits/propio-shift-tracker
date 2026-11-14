import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../js/schedule.js', import.meta.url), 'utf8');
const row = (() => {
  const start = source.indexOf('<div class="block-row sched-tl-item"');
  return source.slice(start, source.indexOf('`;', start));
})();

test('tarjeta de bloque del día: dos líneas, con tipo, horas y × arriba', () => {
  const [, top, bottom] = row.split(/<div class="sched-tl-card-(?:top|bottom)">/);
  assert.ok(top && bottom, 'existen la línea de arriba y la de abajo');
  for (const token of ['sched-tl-icon', 'block-type-input', 'block-start-input', 'block-end-input', 'data-remove-block']) assert.match(top, new RegExp(token));
  assert.doesNotMatch(top, /sched-tl-duration|block-goal-input/);
});

test('tarjeta de bloque del día: duración y meta productiva comparten la línea de abajo', () => {
  const bottom = row.split('<div class="sched-tl-card-bottom">')[1];
  assert.match(bottom, /sched-tl-duration/);
  assert.match(bottom, /block-goal-field[\s\S]*block-goal-input/);
});

test('tarjeta de bloque del día: ya no muestra el subtítulo fijo ni el símbolo de orden', () => {
  assert.doesNotMatch(row, /meta\.subtitle|sched-tl-handle|⋮⋮/);
  assert.match(row, /<div class="sched-tl-subtitle">\$\{nextDayLabel\}<\/div>/);
  assert.doesNotMatch(source, /Enfoque y productividad|Almuerzo \/ Descanso largo/);
});
