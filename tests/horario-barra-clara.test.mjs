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

test('La barra alta pone icono, nombre, horas y duracion dentro de cada pieza', () => {
  assert.match(fn, /sched-bar-head/);
  assert.match(fn, /sched-bar-range/);
  assert.match(fn, /BLOCK_TIMELINE_META/);
  assert.doesNotMatch(fn, /barHourLabel/);
  assert.match(fn, /ticks\.innerHTML = ''/);
});

test('En las piezas cortas la barra alta muestra solo icono y minutos', () => {
  assert.match(fn, /dur < 50/);
  assert.match(fn, /data-bar-size="\$\{size\}"/);
  const b = css.slice(css.indexOf('/* horario barra alta */'), css.indexOf('/* fin horario barra alta */'));
  assert.ok(b.length > 100);
  assert.match(b, /\.sched-daybar \{ height: 72px/);
  assert.match(b, /data-bar-size="short"/);
  assert.match(b, /\.sched-daybar-ticks \{ display: none/);
  assert.doesNotMatch(b, /#[0-9a-fA-F]{3,8}\b/);
});

test('El estilo de la barra clara usa solo variables del tema', () => {
  const b = css.slice(css.indexOf('/* horario barra clara */'), css.indexOf('/* fin horario barra clara */'));
  assert.ok(b.length > 50);
  assert.match(b, /\.sched-bar-name/);
  assert.doesNotMatch(b, /#[0-9a-fA-F]{3,8}\b/);
});
