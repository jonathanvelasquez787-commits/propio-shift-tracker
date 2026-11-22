import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { installWindowLauncher, WINDOW_SIZE } from '../extension/propio-bridge/window-launcher.js';

function fixture(existing = []) {
  const calls = [], listeners = [];
  const api = { runtime: { getURL: path => `chrome-extension://abc/${path}` }, action: { onClicked: { addListener: fn => listeners.push(fn) } },
    tabs: { query: async q => { calls.push(['query', q.url]); return existing; }, update: async (id, patch) => { calls.push(['tab', id, patch]); } },
    windows: { create: async options => { calls.push(['create', options]); }, update: async (id, patch) => { calls.push(['window', id, patch]); } } };
  return { api, calls, listeners };
}

test('toolbar icon opens a tall popup-type window of the tracker', async () => {
  const { api, calls } = fixture();
  assert.equal(await installWindowLauncher(api).open(), 'created');
  assert.deepEqual(calls.at(-1), ['create', { url: 'chrome-extension://abc/panel.html', type: 'popup', ...WINDOW_SIZE }]);
  assert.ok(WINDOW_SIZE.height > WINDOW_SIZE.width);
});

test('toolbar icon focuses the tracker window that is already open instead of opening another', async () => {
  const { api, calls } = fixture([{ id: 7, windowId: 3 }]);
  assert.equal(await installWindowLauncher(api).open(), 'focused');
  assert.ok(!calls.some(call => call[0] === 'create'));
  assert.deepEqual(calls.filter(call => call[0] !== 'query'), [['window', 3, { focused: true }], ['tab', 7, { active: true }]]);
});

test('manifest has no default popup so the icon click reaches the worker', () => {
  const manifest = JSON.parse(fs.readFileSync(new URL('../extension/propio-bridge/manifest.json', import.meta.url), 'utf8'));
  assert.equal(manifest.action.default_popup, undefined);
  const { listeners } = fixture();
  const f = fixture(); installWindowLauncher(f.api);
  assert.equal(f.listeners.length, 1);
  assert.equal(listeners.length, 0);
});
