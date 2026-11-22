import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createBridgeWorker } from '../extension/propio-bridge/bridge-worker.js';

const read = name => fs.readFileSync(new URL(`../extension/propio-bridge/${name}`, import.meta.url), 'utf8');
const scope = 'a'.repeat(64);

function setup({ pageAnswers }) {
  const sent = [], store = {};
  const api = { runtime: { id: 'abc', sendMessage: async packet => { sent.push(packet.kind); if (!pageAnswers) throw new Error('no receiver'); return packet.kind === 'identify-tracker' ? { accountScope: scope } : {}; } },
    storage: { local: { get: async k => ({ [k]: store[k] }), set: async x => Object.assign(store, x) } },
    tabs: { query: async q => String(q.url).includes('propio-shift-tracker') ? [{ id: 10 }] : [], sendMessage: async (id, packet) => { sent.push(`tab${id}:${packet.kind}`); return packet.kind === 'identify-tracker' ? { accountScope: scope } : {}; } } };
  return { api, sent };
}

test('toolbar icon drops the app down as a real extension popup', () => {
  const manifest = JSON.parse(read('manifest.json'));
  assert.equal(manifest.action.default_popup, 'panel.html?popup=1');
  assert.doesNotMatch(read('worker.js'), /window-launcher/);
  assert.match(read('panel-guard.js'), /popup/);
  assert.match(read('panel-guard.js'), /height:600px/);
});

test('the popup page takes the calls even though it has no tab', async () => {
  const { api, sent } = setup({ pageAnswers: true });
  await createBridgeWorker(api).refreshBackground();
  assert.ok(sent.includes('identify-tracker'));
  assert.ok(!sent.some(kind => kind.startsWith('tab10')));
});

test('web tracker is used when the popup is closed', async () => {
  const { api, sent } = setup({ pageAnswers: false });
  await createBridgeWorker(api).refreshBackground();
  assert.ok(sent.includes('tab10:identify-tracker'));
});

test('popup page without tab can report tracker status', async () => {
  const worker = (await import('node:fs')).readFileSync(new URL('../extension/propio-bridge/bridge-worker.js', import.meta.url), 'utf8');
  assert.match(worker, /viaOwnPage\(sender\)/);
});
