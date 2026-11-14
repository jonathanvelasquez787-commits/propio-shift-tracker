import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');

test('Finanzas en celular: "Siguiente prioridad" va en dos líneas y no se encima con el título', () => {
  const start = css.indexOf('/* finanzas-encabezado-celular */');
  assert.ok(start > 0, 'bloque marcado');
  const block = css.slice(start, css.indexOf('/* fin finanzas-encabezado-celular */', start));
  assert.match(block, /@media \(max-width:640px\)/);
  assert.match(block, /\.fin-header-left\{flex:0 0 auto\}/);
  assert.match(block, /\.fin-available-stat\{[^}]*min-width:0[^}]*flex-direction:column/);
  assert.match(block, /\.fin-available-stat-val\{[^}]*text-overflow:ellipsis[^}]*white-space:nowrap/);
});
