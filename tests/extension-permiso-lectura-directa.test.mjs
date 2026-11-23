import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../extension/propio-bridge/tracker-content.js', import.meta.url), 'utf8');

test('la ventanita lee su codigo del almacenamiento cuando el worker contesta vacio', () => {
  assert.ok(src.includes("chrome.storage.local.get('bridge-v1')"));
  assert.ok(src.includes('saved.coordinationOwner'));
  assert.ok(src.includes('saved?.accountScope === owner.accountScope'));
});

test('la lectura directa solo ocurre sin respuesta del worker y no suma mensajes', () => {
  assert.ok(src.includes('owner && !coordination?.owner && !coordination?.why'));
  assert.equal((src.match(/chrome\.runtime\.sendMessage\(\{ kind: 'tracker-coordination'/g) || []).length, 1);
});
