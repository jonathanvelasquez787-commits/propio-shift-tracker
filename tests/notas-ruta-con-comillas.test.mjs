import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const script = readFileSync('extension/propio-bridge/workspace-setup.js', 'utf8');
const page = readFileSync('extension/propio-bridge/workspace.html', 'utf8');

test('las rutas pegadas con comillas se aceptan al preparar la configuracion de Windows', () => {
  assert.match(script, /const unquote = value =>/);
  assert.match(script, /unquote\(fields\.shortcut\.value\)/);
  assert.match(script, /unquote\(fields\.notes\.value\)/);
});

test('los avisos del boton Preparar configuracion salen debajo del boton', () => {
  assert.match(page, /id="setup-export"[^]*id="export-status"/);
  assert.match(script, /exportMessage\.textContent/);
  assert.doesNotMatch(script.slice(script.indexOf("getElementById('setup-export')")), /[^t]message\.textContent/);
});
