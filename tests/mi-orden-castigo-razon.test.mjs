import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cleanOrderReason, scheduleNeedsReason, ORDER_REASON_MIN } from '../js/orden-model.js';

const cfg = (blocks, start = '07:00', end = '15:00', off = false) => ({ off, start, end, blocks });
const base = cfg([
  { type: 'work', start: '07:00', dur: 180, goalMin: 100 },
  { type: 'break', start: '10:00', dur: 15, goalMin: 0 },
  { type: 'work', start: '10:15', dur: 285, goalMin: 100 },
]);
const move = (fn) => cfg(base.blocks.map(b => ({ ...b })).map(fn), base.start, base.end);

test('castigo razon: mover un bloque o alargar un descanso del dia pide razon', () => {
  assert.equal(scheduleNeedsReason(base, move(b => (b.type === 'break' ? { ...b, dur: 30 } : b))), true);
  assert.equal(scheduleNeedsReason(base, move(b => (b.type === 'break' ? { ...b, start: '10:30' } : b))), true);
  assert.equal(scheduleNeedsReason(base, cfg(base.blocks, '07:30', '15:00')), true);
  assert.equal(scheduleNeedsReason(base, cfg(base.blocks.slice(0, 2))), true);
});

test('castigo razon: no la pide si nada se mueve, si solo cambia la meta o si el dia es libre', () => {
  assert.equal(scheduleNeedsReason(base, move(b => ({ ...b }))), false);
  assert.equal(scheduleNeedsReason(base, move(b => ({ ...b, goalMin: 999 }))), false);
  assert.equal(scheduleNeedsReason(base, cfg(base.blocks, '07:00', '15:00', true)), false);
  assert.equal(scheduleNeedsReason(null, base), false);
  assert.equal(scheduleNeedsReason({ start: '07:00', end: '15:00' }, base), false);
});

test('castigo razon: la razon necesita al menos 5 letras y se limpia', () => {
  assert.equal(ORDER_REASON_MIN, 5);
  assert.equal(cleanOrderReason('  me   dolia  la cabeza '), 'me dolia la cabeza');
  assert.equal(cleanOrderReason('ok'), '');
  assert.equal(cleanOrderReason(null), '');
  assert.equal(cleanOrderReason('x'.repeat(300)).length, 200);
});

test('castigo razon: guardar el horario de hoy con turno en curso pide la razon y la deja en la nota del dia', () => {
  const schedule = readFileSync(new URL('../js/schedule.js', import.meta.url), 'utf8');
  const save = schedule.slice(schedule.indexOf('export async function saveShiftWindow'), schedule.indexOf('export function copyDayToAll'));
  assert.match(save, /state\.shiftStartedAt && !state\.shiftEndedAt/);
  assert.match(save, /scheduleNeedsReason\(stored, cfg\)/);
  assert.ok(save.indexOf('askOrderReason()') < save.indexOf('reviewScheduleChange(cfg'), 'la razon se pide antes de la revision');
  assert.match(save, /if \(!reason\) return false;/);
  assert.match(save, /recordScheduleReason\(reason\)/);
  const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
  for (const id of ['orderReasonModal', 'orderReasonInput', 'orderReasonOkBtn']) assert.match(html, new RegExp(`id="${id}"`));
  const main = readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');
  assert.match(main, /askOrderReason, recordScheduleReason,/);
});
