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
