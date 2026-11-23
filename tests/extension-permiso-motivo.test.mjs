import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createBridgeWorker } from '../extension/propio-bridge/bridge-worker.js';
import { createAutomationLease } from '../js/automation-lease.js';
import { extensionLeaseModel } from '../js/extension-box.js';
import { TRACKER_ORIGIN } from '../js/propio-bridge-rules.js';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const scope = 'e'.repeat(64);
function worker() {
  const store = {};
  const api = { runtime: { id: 'why-extension', getURL: name => `chrome-extension://why-extension/${name}`, onMessage: { addListener() {} } },
    storage: { local: { get: async key => ({ [key]: structuredClone(store[key]) }), set: async patch => { Object.assign(store, structuredClone(patch)); } } },
    alarms: { create() {}, onAlarm: { addListener() {} } }, webNavigation: { onCommitted: { addListener() {} } },
    webRequest: { onBeforeRequest: { addListener() {} }, onCompleted: { addListener() {} }, onErrorOccurred: { addListener() {} } },
    tabs: { onRemoved: { addListener() {} }, query: async () => [], sendMessage: async () => null } };
  return { w: createBridgeWorker(api, { now: () => Date.parse('2026-11-23T15:00:00Z'), randomId: () => 'x' }) };
}
const ask = (w, sender = {}, accountScope = scope) => w.message({ kind: 'tracker-coordination', accountScope }, { id: 'why-extension', frameId: 0, url: TRACKER_ORIGIN + '/', tab: { id: 10 }, ...sender });

test('permiso motivo: el worker dice por que no entrega el codigo del permiso', async () => {
  const { w } = worker();
  assert.deepEqual(await ask(w), { owner: null, enabled: false, why: 'worker-unpaired' });
  assert.equal((await ask(w, { frameId: 3 })).why, 'frame');
  assert.equal((await ask(w, { tab: undefined })).why, 'sender');
  assert.equal((await ask(w, {}, 'corto')).why, 'scope-bad');
  assert.equal((await ask(w, { url: 'https://otro.example/' })).why, 'origin');
});

test('permiso motivo: la app guarda el motivo y el cuadro lo escribe', () => {
  const host = { setInterval: () => 1, clearInterval() {}, addEventListener() {}, removeEventListener() {}, document: { addEventListener() {}, removeEventListener() {} } };
  const lease = createAutomationLease({ rpc: async () => ({ data: [] }) }, { host });
  lease.request({ owner: undefined, enabled: false, why: 'scope-mismatch' });
  assert.deepEqual(lease.diagnostic(), { reason: 'no-owner', hellos: 1, rpcs: 0, why: 'scope-mismatch' });
  assert.equal(extensionLeaseModel(lease.diagnostic()), 'Permiso de la nube: sin dueño (la extensión no mandó su código) [motivo: scope-mismatch] · avisos: 1 · pedidos: 0');
  lease.stop();
});

test('permiso motivo: el hello lleva el motivo desde la extension hasta la app', () => {
  assert.ok(read('extension/propio-bridge/tracker-content.js').includes('automationWhy'));
  assert.ok(read('js/propio-bridge.js').includes('why: packet.automationWhy'));
});

test('permiso motivo: la ventanita muestra la respuesta cruda si llega vacia', () => {
  const src = read('extension/propio-bridge/tracker-content.js');
  assert.ok(src.includes("'respuesta ' + JSON.stringify(coordination ?? null)"));
});
