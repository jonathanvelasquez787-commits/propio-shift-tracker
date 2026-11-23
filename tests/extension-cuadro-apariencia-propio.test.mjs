import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const box = read('js/extension-box.js');

test('apariencia de Propio: el cuadro usa las mismas claves que la ventanita vieja', () => {
  const popup = read('extension/propio-bridge/popup.js');
  const dark = read('extension/propio-bridge/portal-dark-mode.js');
  const layoutKey = box.match(/LAYOUT_KEY = '([^']+)'/)[1], darkKey = box.match(/DARK_KEY = '([^']+)'/)[1];
  assert.ok(popup.includes(`const layoutKey = '${layoutKey}'`));
  assert.ok(dark.includes(`portalDarkKey = '${darkKey}'`));
  assert.match(box, /\{ enabled, revision: globalThis\.crypto\.randomUUID\(\) \}/);
  assert.match(box, /set\(\{ \[DARK_KEY\]: \{ enabled \} \}\)/);
});

test('apariencia de Propio: los dos interruptores salen justo debajo de Registrar mi actividad', () => {
  assert.match(box, /'extBoxOriginalLayout', 'Vista original de Propio'/);
  assert.match(box, /'extBoxPortalDark', 'Modo oscuro en Propio'/);
  assert.match(box, /box\.append\(head, conn, rec, celebrateRow\.row, askRow\.row, layoutRow\.row, darkRow\.row, pillRow\.row, pend,/);
  assert.match(box, /storage\?\.onChanged\?\.addListener/);
});
