import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync('extension/propio-bridge/workspace.html', 'utf8');
const script = readFileSync('extension/propio-bridge/workspace-setup.js', 'utf8');

test('el espacio de trabajo muestra un dibujo en vivo de la pantalla', () => {
  assert.match(page, /id="preview-screen"/);
  assert.match(page, /Así queda tu pantalla/);
  assert.match(script, /function updatePreview/);
  assert.match(script, /range\.addEventListener\('input'/);
  assert.match(script, /number\.addEventListener\('input'/);
});

test('ancho y alto tienen barra y numero con los mismos limites de siempre', () => {
  assert.match(page, /id="width-range" type="range" min="25" max="50"/);
  assert.match(page, /id="height-range" type="range" min="40" max="100"/);
  assert.match(page, /name="width" type="number" min="25" max="50"/);
  assert.match(page, /name="height" type="number" min="40" max="100"/);
});

test('las cuatro direcciones quedan dentro del plegable Direcciones de las páginas', () => {
  const block = page.slice(page.indexOf('<summary>Direcciones de las páginas</summary>'));
  const end = block.indexOf('</details>');
  for (const name of ['portal', 'interpreter', 'tracker', 'dictionary']) assert.ok(block.slice(0, end).includes(`name="${name}"`));
});

test('cada pagina tiene su boton para pasar de lado y el limite de 2 a la izquierda se explica', () => {
  assert.match(page, /id="side-left"/); assert.match(page, /id="side-right"/); assert.match(page, /id="sides-note"/);
  assert.match(script, /Pasar a la derecha/); assert.match(script, /Pasar a la izquierda/);
  assert.match(script, /left\.length >= 2/); assert.match(script, /caben 2 páginas como mucho/);
  assert.match(script, /sides: \{ \.\.\.sides \}/);
});

test('cada pagina muestra su direccion y un boton Editar que cambia la misma direccion que se guarda', () => {
  assert.match(script, /edit\.textContent = 'Editar'/); assert.match(script, /fields\[key\]\.value = input\.value/);
  assert.match(script, /side-address/); assert.match(script, /Dirección de \$\{workspaceNames\[key\]\}/);
});
