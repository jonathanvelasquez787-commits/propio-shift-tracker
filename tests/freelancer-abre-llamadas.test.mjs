import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');
const start = src.indexOf('function updateFreelancerSettings()');
const body = src.slice(start, src.indexOf('function syncFreelancerFields', start));

test('al activar el modo freelancer se abre la vista Llamadas', () => {
  assert.match(body, /next\.enabled && !previous\.enabled/);
  assert.match(body, /setBlocksViewMode\('calls'\)/);
  assert.ok(body.indexOf('render();') < body.indexOf("setBlocksViewMode('calls')"));
});

test('al apagar el modo freelancer se vuelve a la vista Bloques', () => {
  assert.match(body, /!next\.enabled && previous\.enabled/);
  assert.match(body, /setBlocksViewMode\('blocks'\)/);
});
