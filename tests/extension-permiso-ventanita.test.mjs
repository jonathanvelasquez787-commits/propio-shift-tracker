import test from 'node:test';
import assert from 'node:assert/strict';
import { createBridgeWorker } from '../extension/propio-bridge/bridge-worker.js';

const scope = 'f'.repeat(64);
function worker() {
  const store = {};
  const api = { runtime: { id: 'popup-extension', getURL: name => `chrome-extension://popup-extension/${name}`, onMessage: { addListener() {} } },
    storage: { local: { get: async key => ({ [key]: structuredClone(store[key]) }), set: async patch => { Object.assign(store, structuredClone(patch)); } } },
    alarms: { create() {}, onAlarm: { addListener() {} } }, webNavigation: { onCommitted: { addListener() {} } },
    webRequest: { onBeforeRequest: { addListener() {} }, onCompleted: { addListener() {} }, onErrorOccurred: { addListener() {} } },
    tabs: { onRemoved: { addListener() {} }, query: async () => [], sendMessage: async () => null } };
  return createBridgeWorker(api, { now: () => Date.parse('2026-11-23T15:00:00Z'), randomId: () => 'x' });
}
// En Node el origen de chrome-extension:// es 'null'; en Chrome es chrome-extension://id.
async function conOrigenReal(task) {
  const Real = globalThis.URL;
  globalThis.URL = class extends Real { get origin() { return this.protocol === 'chrome-extension:' ? `chrome-extension://${this.host}` : super.origin; } };
  try { return await task(); } finally { globalThis.URL = Real; }
}
const popup = (extra = {}) => ({ id: 'popup-extension', url: 'chrome-extension://popup-extension/panel.html?popup=1', ...extra });

test('permiso ventanita: la ventanita del icono (sin pestaña y sin frameId) ya no es rechazada como frame', () => conOrigenReal(async () => {
  const w = worker();
  const r = await w.message({ kind: 'tracker-coordination', accountScope: scope }, popup());
  assert.notEqual(r?.why, 'frame');
  assert.equal(r.why, 'worker-unpaired');
}));

test('permiso ventanita: un marco hijo de la extension sigue rechazado', () => conOrigenReal(async () => {
  const w = worker();
  assert.equal((await w.message({ kind: 'tracker-coordination', accountScope: scope }, popup({ frameId: 2 }))).why, 'frame');
  assert.equal((await w.message({ kind: 'tracker-coordination', accountScope: scope }, { id: 'popup-extension', url: 'https://otro.example/' })).why, 'frame');
}));
