import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const boot = readFileSync(new URL('../js/boot.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');

test('proyeccion plegable: la caja es un details con la primera fila en el encabezado', () => {
  const at = boot.indexOf('function injectCycleProjection()');
  const piece = boot.slice(at, at + 1800);
  assert.match(piece, /createElement\('details'\)/);
  assert.match(piece, /fin-preview gh-fold/);
  assert.match(piece, /<summary class="fin-preview-sum">/);
  assert.match(piece, /gh-fold-chevron/);
  assert.match(piece, /id="cycleProjectionFirst"/);
  assert.match(piece, /class="gh-fold-body"/);
});

test('proyeccion plegable: la primera fila va al encabezado y la segunda al cuerpo', () => {
  const at = boot.indexOf('function renderCycleProjection()');
  const piece = boot.slice(at, boot.indexOf('function injectCycleProjection()'));
  assert.match(piece, /first\.innerHTML = firstRowHtml/);
  assert.match(piece, /rows\.innerHTML = secondRowHtml/);
});

test('proyeccion plegable: el CSS copia la forma de Pendientes y no usa colores fijos', () => {
  const a = css.indexOf('/* proyeccion plegable */');
  const b = css.indexOf('/* fin proyeccion plegable */');
  assert.ok(a >= 0 && b > a);
  const block = css.slice(a, b);
  assert.match(block, /#cycleProjectionBox > \.gh-fold-body \{ margin-top: 0; \}/);
  assert.match(block, /#cycleProjectionBox:not\(\[open\]\)/);
  assert.doesNotMatch(block, /#[0-9a-fA-F]{3,8}\b/);
});
