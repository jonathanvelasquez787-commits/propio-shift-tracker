import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const main = fs.readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');
const sched = fs.readFileSync(new URL('../js/schedule.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const more = html.slice(html.indexOf('id="schedMoreCard"'), html.indexOf('<!-- /schedMoreCard -->'));
const panel = key => more.slice(more.indexOf(`id="schedMorePanel-${key}"`), more.indexOf('</section>', more.indexOf(`id="schedMorePanel-${key}"`)));

test('Horario D: Más opciones es una tarjeta aparte, cerrada, debajo del Horario', () => {
  assert.ok(html.indexOf('<!-- /scheduleConfigAccordion -->') < html.indexOf('id="schedMoreCard"'));
  assert.match(more, /id="schedMoreToggle"[^>]*aria-expanded="false"/);
  assert.match(more, /id="schedMoreBody" hidden/);
  assert.match(more, /Mover turno · Si llegas tarde · Adherencia · Freelancer/);
});

test('Horario D: Más opciones tiene 4 filas en orden y cada una guarda sus controles de siempre', () => {
  const order = ['offset', 'late', 'adherence', 'freelancer'].map(k => more.indexOf(`data-more="${k}"`));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.ok(order.every(i => i > 0));
  for (const id of ['scheduleOffsetMinusBtn', 'scheduleOffsetPlusBtn', 'scheduleOffsetApplyBtn']) assert.ok(panel('offset').includes(`id="${id}"`));
  assert.ok(panel('late').includes('id="lateArrivalModeInput"'));
  for (const id of ['adherenceGraceMinInput', 'adherenceGoalPctInput']) assert.ok(panel('adherence').includes(`id="${id}"`));
  for (const id of ['freelancerEnabledInput', 'freelancerBreakMinInput', 'freelancerLunchMinInput', 'freelancerConnectedMinInput', 'freelancerSnoozeMinInput', 'freelancerSessionGoalInput', 'freelancerLunchEveryInput']) assert.ok(panel('freelancer').includes(`id="${id}"`));
  for (const key of ['short', 'medium', 'long']) assert.ok(panel('freelancer').includes(`data-fl-template="${key}"`));
  assert.ok(more.includes('id="freelancerStatusTag"'));
});

test('Horario D: ya no queda la tarjeta de Modo freelancer arriba ni los bloques sueltos de llegar tarde y adherencia', () => {
  assert.ok(!html.includes('id="freelancerAccordion"'));
  assert.ok(!html.includes('sched-compact-grid-2'));
  const card = html.slice(html.indexOf('id="scheduleConfigAccordion"'), html.indexOf('<!-- /scheduleConfigAccordion -->'));
  for (const id of ['scheduleOffsetApplyBtn', 'lateArrivalModeInput', 'adherenceGraceMinInput', 'freelancerEnabledInput']) assert.ok(!card.includes(`id="${id}"`));
});

test('Horario D: las filas se abren de una en una y los valores grises se actualizan', () => {
  assert.match(main, /data-more-toggle/);
  assert.match(main, /document\.getElementById\('schedMorePanel-' \+ other\.getAttribute\('data-more-toggle'\)\)\.hidden = !show/);
  assert.match(main, /updateScheduleMoreSummary/);
  assert.match(sched, /export function updateScheduleMoreSummary/);
  assert.match(sched, /schedMoreValOffset/);
});

test('Horario D: estilos en su bloque; en celular se oculta el texto largo de la barra', () => {
  const block = css.slice(css.indexOf('/* horario rediseño D */'), css.indexOf('/* fin horario rediseño D */'));
  assert.ok(block.length > 200);
  assert.match(block, /#schedMoreCard\.sched-more \{ padding: 4px 18px;/);
  assert.match(block, /#schedMoreCard \.sched-more-sum \{ display: none; \}/);
});
