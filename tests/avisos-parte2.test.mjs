import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const bloque = css.slice(css.indexOf('/* avisos parte 2 */'), css.indexOf('/* fin avisos parte 2 */'));

test('avisos parte 2: Aviso sin llamadas queda con una sola flecha y sin etiqueta', () => {
  assert.ok(bloque.length > 300, 'falta el bloque avisos parte 2');
  assert.match(bloque, /#positiveSettingsAccordion > summary::after,[^{]*\{[^}]*display:\s*none/);
  assert.match(bloque, /\.game-panel-eyebrow \{[^}]*display:\s*none/);
  assert.match(bloque, /game-settings-accordion-chevron \{[^}]*flex:\s*0 0 24px[^}]*border:\s*0/);
});

test('avisos parte 2: Repetir el aviso va sin cuadro y los campos son mas bajos', () => {
  assert.match(bloque, /\.game-settings-toggle \{[^}]*border:\s*0[^}]*padding:\s*0/);
  assert.match(bloque, /\.inactivity-row input \{[^}]*width:\s*76px/);
  assert.match(bloque, /#notificationFilesReview \.polished-setting > summary \{[^}]*min-height:\s*0/);
});

test('avisos parte 2: usa variables del tema y no colores fijos', () => {
  assert.doesNotMatch(bloque, /#[0-9a-fA-F]{3,8}\b/);
});
