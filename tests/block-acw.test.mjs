import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { acwMinutesForBlock } from '../js/block-acw.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const at = (hour, minute = 0) => new Date(`2026-09-29T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`);
const gap = (label, start, end) => ({ label, prev: { endISO: start.toISOString() }, cur: { startISO: end.toISOString() } });
function overlapMinutes(start, end, intervals = []) {
  return intervals.reduce((total, interval) => {
    const from = Math.max(start.getTime(), new Date(interval.start).getTime());
    const to = Math.min(end.getTime(), new Date(interval.end).getTime());
    return total + Math.max(0, (to - from) / 60000);
  }, 0);
}

test('ACW de bloque recorta gaps entre bloques, resta pausas y excluye gaps Other', () => {
  const gaps = [gap('acw', at(9), at(10)), gap('other', at(10), at(12))];
  const pauses = [{ start: at(9, 15), end: at(9, 25) }];
  const first = acwMinutesForBlock(gaps, at(9), at(9, 30), pauses, overlapMinutes);
  const second = acwMinutesForBlock(gaps, at(9, 30), at(10, 30), pauses, overlapMinutes);

  assert.equal(first, 20);
  assert.equal(second, 30, 'no convierte en ACW la porción recortada de un gap etiquetado Other');
});

test('Bloques del día usa los gaps etiquetados y muestra ACW en las dos variantes de progreso Work', () => {
  const app = fs.readFileSync(path.join(root, 'js/app-main.js'), 'utf8');
  const styles = fs.readFileSync(path.join(root, 'css/app-core.css'), 'utf8');
  assert.match(app, /const blockGaps = dayGapRows\(dayKey, dayCalls\)/);
  assert.match(app, /acwMinutesForBlock\(classifiedGaps, callWindowStart, callWindowEnd, mergeIntervals\(dayPauses\), overlapMinutesWithIntervals\)/);
  assert.match(app, /slotStats\(slot, dayCalls, dayPauses, shiftStart, shiftEnd, dayKey, extendStart, extendEnd, blockGaps\)/);
  assert.match(app, /const blockAcwMin = slot\.type === 'Work'[\s\S]*?: 0;/);
  assert.match(app, /stats\.realActivityRange[\s\S]*?\$\{acwProgressLabel\}/);
  assert.doesNotMatch(app, /name: 'ACW',[\s\S]*?renderBlockSummaryStrip\(summaryCards\)/);
  assert.match(styles, /grid-template-columns: 1\.6fr 1fr 1fr;/);
  assert.match(styles, /\.block-summary-strip \{ grid-template-columns: repeat\(2, 1fr\);/);
});
