import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const js = readFileSync(new URL('../js/schedule.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const fn = js.slice(js.indexOf('export function renderDayBar()'), js.indexOf('export function updateScheduleRowSummary'));

test('La barra del dia muestra nombre y duracion en cada tramo', () => {
  assert.match(fn, /sched-bar-name/);
  assert.match(fn, /sched-bar-dur/);
  assert.match(fn, /formatBlockDurationLabel\(dur\)/);
});

test('La barra del dia pone la hora donde empieza cada bloque y la del final', () => {
  assert.match(fn, /segments\.forEach/);
  assert.match(fn, /barHourLabel\(shiftStart \+ seg\.from, i === 0\)/);
  assert.match(fn, /barHourLabel\(shiftStart \+ total, true\)/);
  assert.doesNotMatch(fn, /m \+= 120/);
});

test('En celular la barra muestra solo la duracion y menos horas', () => {
  assert.match(fn, /window\.innerWidth <= 760/);
  assert.match(fn, /compact && !\(i === 0/);
});

test('El estilo de la barra clara usa solo variables del tema', () => {
  const b = css.slice(css.indexOf('/* horario barra clara */'), css.indexOf('/* fin horario barra clara */'));
  assert.ok(b.length > 50);
  assert.match(b, /\.sched-bar-name/);
  assert.doesNotMatch(b, /#[0-9a-fA-F]{3,8}\b/);
});
