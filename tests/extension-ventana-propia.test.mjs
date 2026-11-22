import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createBridgeWorker } from '../extension/propio-bridge/bridge-worker.js';

function setup(ownIdentifies) {
  const messages = [], scope = 'a'.repeat(64), store = {};
  const api = { runtime: { id: 'abc' }, storage: { local: { get: async k => ({ [k]: store[k] }), set: async x => Object.assign(store, x) } }, tabs: {
    query: async q => String(q.url).startsWith('chrome-extension://abc/') ? [{ id: 20 }] : String(q.url).includes('propio-shift-tracker') ? [{ id: 10 }] : [],
    sendMessage: async (id, packet) => { messages.push({ id, ...packet }); return packet.kind === 'identify-tracker' ? (id === 20 && !ownIdentifies ? null : { accountScope: scope }) : {}; },
  } };
  return { api, messages };
}

test('extension window tracker takes the calls and the web tab only watches', async () => {
  const { api, messages } = setup(true);
  await createBridgeWorker(api).refreshBackground();
  assert.deepEqual(messages.filter(m => m.kind === 'identify-tracker').map(m => m.id), [20]);
});

test('web tracker is used when the extension window is not open or does not answer', async () => {
  const { api, messages } = setup(false);
  await createBridgeWorker(api).refreshBackground();
  assert.deepEqual(messages.filter(m => m.kind === 'identify-tracker').map(m => m.id), [20, 10]);
});

test('extension app page loads the bridge script and the script accepts the extension origin', () => {
  const build = fs.readFileSync(new URL('../scripts/build-extension.mjs', import.meta.url), 'utf8');
  assert.match(build, /tracker-content\.js/);
  const script = fs.readFileSync(new URL('../extension/propio-bridge/tracker-content.js', import.meta.url), 'utf8');
  assert.match(script, /chrome-extension:/);
});
