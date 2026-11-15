import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');

test('el interruptor del modo freelancer está en los bloques del día, debajo de Agregar', () => {
  const lunch = html.indexOf('id="addLunchBlockBtn"');
  const toggle = html.indexOf('id="freelancerEnabledInput"');
  const footer = html.indexOf('class="modal-actions mc-action-row sched-footer"');
  assert.ok(lunch > 0 && toggle > lunch && toggle < footer, 'va entre los botones de Agregar y el pie del Horario');
  assert.match(html.slice(toggle - 60, toggle + 80), /type="checkbox" role="switch"/);
  assert.equal(html.split('id="freelancerEnabledInput"').length - 1, 1, 'el id existe una sola vez');
});

test('Más opciones ya no repite el interruptor pero conserva los demás campos del modo freelancer', () => {
  const more = html.slice(html.indexOf('id="schedMoreCard"'), html.indexOf('<!-- /schedMoreCard -->'));
  assert.ok(!more.includes('id="freelancerEnabledInput"'));
  assert.ok(more.includes('id="freelancerBreakMinInput"') && more.includes('id="freelancerStatusTag"'));
  assert.ok(more.includes('Se activa debajo de los bloques del día.'));
});

test('el interruptor sigue ligado a los ajustes del modo freelancer', () => {
  const main = fs.readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');
  assert.match(main, /enabled: document\.getElementById\('freelancerEnabledInput'\)\.checked/);
  assert.match(main, /for \(const id of \['freelancerEnabledInput', 'freelancerBreakMinInput'/);
});

test('el interruptor tiene su bloque de estilos con variables del tema', () => {
  const a = css.indexOf('/* horario freelancer interruptor */'), b = css.indexOf('/* fin horario freelancer interruptor */');
  assert.ok(a > 0 && b > a);
  assert.doesNotMatch(css.slice(a, b), /#[0-9a-fA-F]{3,8}\b/);
});
