import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const main = readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');

test('vaciar datos del dia: el boton cambia de nombre y conserva su estilo', () => {
  const at = html.indexOf('id="clearDayCallsBtn"');
  assert.ok(at > 0);
  const tag = html.slice(html.lastIndexOf('<button', at), html.indexOf('</button>', at));
  assert.match(tag, /class="gap-edit-btn call-delete-btn"/);
  assert.match(tag, /Vaciar datos del día/);
  assert.doesNotMatch(html, /Vaciar llamadas del día/);
});

test('vaciar datos del dia: abre el mismo selector que Reiniciar dia para elegir que borrar', () => {
  assert.match(main, /getElementById\('clearDayCallsBtn'\)\.addEventListener\('click', resetDay\)/);
  assert.match(main, /getElementById\('resetDayBtn'\)\.addEventListener\('click', resetDay\)/);
  assert.doesNotMatch(main, /addEventListener\('click', clearActiveDayCalls\)/);
});
