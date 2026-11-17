import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const main = readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');
const datos = html.slice(html.indexOf('id="setPanelDatos"'), html.indexOf('/setPanelDatos'));

test('Reiniciar en Ajustes: Borrar todos los datos vive al final de la pestaña Datos', () => {
  assert.match(datos, /class="danger-card tone-bad"/);
  assert.match(datos, /id="eraseAllDataBtn"/);
  assert.ok(datos.indexOf('id="snapshotRecoveryBtn"') < datos.indexOf('id="eraseAllDataBtn"'));
  assert.match(main, /getElementById\('eraseAllDataBtn'\)\.addEventListener\('click', eraseAllData\)/);
});

test('Reiniciar en Ajustes: ya no existen el botón rojo de la barra ni la ventana Reiniciar', () => {
  assert.doesNotMatch(html, /id="resetHeaderBtn"|id="resetModal"|id="resetDayBtn"/);
  assert.doesNotMatch(main, /resetHeaderBtn|resetModal|resetDayBtn/);
  assert.match(main, /getElementById\('clearDayCallsBtn'\)\.addEventListener\('click', resetDay\)/);
});
