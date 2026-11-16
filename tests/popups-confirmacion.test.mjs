import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const bloque = css.slice(css.indexOf('/* popups confirmacion */'), css.indexOf('/* fin popups confirmacion */'));

test('popups confirmacion: titulo a la izquierda, lista con checks y botones con el principal a la derecha', () => {
  assert.ok(bloque.length > 200, 'falta el bloque popups confirmacion');
  assert.match(bloque, /#confirmModal \.mc-modal-head \{[^}]*text-align:\s*left/);
  assert.match(bloque, /\.confirmation-effects li::before \{[^}]*content:\s*"✓"/);
  assert.match(bloque, /\.mc-action-row \{[^}]*row-reverse/);
});

test('popups confirmacion: el boton principal es de color de aviso, sin tocar las revisiones, y sin colores fijos', () => {
  assert.match(bloque, /#confirmModal:not\(:has\(\.review-confirm\)\) #confirmModalOkBtn \{[^}]*var\(--warn\)/);
  assert.doesNotMatch(bloque, /#[0-9a-fA-F]{3,8}\b/);
});
