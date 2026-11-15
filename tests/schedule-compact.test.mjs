import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('app.html', 'utf8');
const css = fs.readFileSync('css/app-shell.css', 'utf8');
const start = css.indexOf('/* horario compacto */');
const end = css.indexOf('/* fin horario compacto */');
const block = css.slice(start, end);

test('Horario: en celular Inicio y Fin del turno van lado a lado', () => {
  assert.ok(start > 0 && end > start, 'el bloque CSS está marcado');
  assert.match(block, /@media \(max-width: 760px\)/);
  assert.match(block, /#pageSchedule \.sched-time-row \{ grid-template-columns: 1fr 1fr;/);
  assert.ok(html.indexOf('id="dayStartInput"') < html.indexOf('id="dayEndInput"'));
});

test('Horario: el texto largo del modo freelancer vive en el icono i y no pierde su contenido', () => {
  const at = html.indexOf('class="sched-freelancer-head"');
  assert.ok(at > 0, 'existe la cabecera del modo freelancer');
  const head = html.slice(at, html.indexOf('<div class="sched-compact-row">', at));
  assert.match(head, /id="freelancerEnabledInput"/);
  assert.match(head, /aria-describedby="freelancerInfoTooltip"/);
  assert.match(head, /id="freelancerInfoTooltip" role="tooltip">Sin horario planeado/);
  assert.doesNotMatch(head, /<p class="alert-hint">/);
});

test('Horario: las plantillas del modo freelancer conservan sus tres botones en una fila', () => {
  const at = html.indexOf('class="sched-templates-line"');
  assert.ok(at > 0);
  const line = html.slice(at, html.indexOf('</div>\n</div>', at));
  for (const key of ['short', 'medium', 'long']) assert.ok(line.includes('data-fl-template="' + key + '"'));
  assert.match(block, /\.sched-templates-line \{ display: flex; flex-wrap: wrap;/);
});

test('Horario: en celular Guardar día ocupa todo el ancho y los dos botones de copiar quedan parejos', () => {
  assert.match(block, /#saveShiftWindowBtn \{ flex: 0 0 100%; \}/);
  assert.match(block, /#copyDayToAllBtn, #copyWeekendBtn \{ flex: 1 1 0;/);
  for (const id of ['saveShiftWindowBtn', 'copyDayToAllBtn', 'copyWeekendBtn']) assert.ok(html.includes('id="' + id + '"'));
});
