import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const bloque = css.split('/* capsula una pieza */')[1]?.split('/* fin capsula una pieza */')[0] || '';

test('la capsula una pieza solo vale de 480 px para arriba', () => {
  assert.ok(bloque.length > 0, 'falta el bloque capsula una pieza');
  assert.match(bloque, /@media \(min-width: 480px\)/);
});

test('Break, Lunch, Llamada y pendiente quitan la linea de en medio entre boton y pildora', () => {
  for (const tipo of ['break', 'lunch', 'call', 'pending']) {
    const re = new RegExp(`data-live-type="${tipo}"\\] \\.action-slot\\[data-slot="(break|lunch|call)"\\] \\.action-btn \\{ box-shadow: none !important; border-right-width: 0 !important;`);
    assert.match(bloque, re, `falta quitar la linea en ${tipo}`);
  }
});

test('el borde del mouse rodea boton + pildora y el basurero conserva su propio borde', () => {
  assert.match(bloque, /> \.hbc \{ box-shadow: 0 -2px 0 0 var\(--cap-ring\), 0 2px 0 0 var\(--cap-ring\), 2px 0 0 0 var\(--cap-ring\) !important; \}/);
  assert.match(bloque, /data-slot="discard"\] \.action-btn:not\(:hover\) \{ box-shadow: none !important; \}/);
});

test('el CSS de la capsula una pieza tiene las llaves balanceadas', () => {
  assert.equal(css.split('{').length, css.split('}').length);
});
