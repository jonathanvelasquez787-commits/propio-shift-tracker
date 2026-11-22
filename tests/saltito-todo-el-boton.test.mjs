import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const js = fs.readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');

test('saltito: el icono, el nombre y el rosado de la pildora saltan juntos con el mismo movimiento', () => {
  const start = js.indexOf('function actionHopTargets');
  const end = js.indexOf('function wireActionButtonPress');
  assert.ok(start > 0 && end > start);
  const block = js.slice(start, end);
  // mismo salto de siempre: sube 1 px y crece 12 % en 260 ms
  assert.match(block, /scale: '1\.12', translate: '0 -1px'/);
  assert.match(block, /duration: 260/);
  // el rosado de la pildora y el icono del boton en curso van en el mismo grupo
  assert.match(block, /\.hbc-live/);
  assert.match(block, /\.action-icon/);
  assert.match(block, /\.action-label/);
  assert.match(block, /a\.id = 'action-hop'/);
});

test('saltito: sale al soltar, despues del cambio de estado, y todo junto en el mismo cuadro', () => {
  const start = js.indexOf('function wireActionHop');
  const block = js.slice(start, js.indexOf('function wireActionButtonPress'));
  assert.match(block, /addEventListener\('click'/);
  assert.doesNotMatch(block, /playActionHop\(actionHopTargets\(target\)\)/);
  assert.match(block, /requestAnimationFrame\(\(\) => playActionHop\(actionHopTargets\(btn\)\)\)/);
});

test('saltito: se conecta una sola vez y los pulsos de otras animaciones no lo cancelan', () => {
  assert.equal((js.match(/wireActionHop\(\);/g) || []).length, 1);
  assert.equal((js.match(/a\.id !== 'action-hop'/g) || []).length, 2);
  // el icono ya no tiene un salto aparte dentro del pulso de toque (seria doble)
  const press = js.slice(js.indexOf('function playActionPressAnimation'), js.indexOf('function keepActiveButtonFilled'));
  assert.doesNotMatch(press, /icon\.animate\(/);
});
