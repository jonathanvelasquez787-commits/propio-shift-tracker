import test from 'node:test';
import assert from 'node:assert/strict';
import { createBridgeWorker, badgeFor } from '../extension/propio-bridge/bridge-worker.js';

const accountScope = 'f'.repeat(64);

// Un "Chrome" falso con el icono (api.action) que guarda la marca puesta.
function chrome({ badgeFails = false } = {}) {
  const store = {}, icon = { text: '', title: null, color: null, calls: 0 };
  const api = { runtime: { id: 'badge-extension', getURL: name => `chrome-extension://badge-extension/${name}`, onMessage: { addListener() {} }, onStartup: { addListener() {} } },
    storage: { local: { get: async key => ({ [key]: structuredClone(store[key]) }), set: async patch => { Object.assign(store, structuredClone(patch)); } } },
    alarms: { create() {}, onAlarm: { addListener() {} } },
    webNavigation: { onCommitted: { addListener() {} } },
    webRequest: { onBeforeRequest: { addListener() {} }, onCompleted: { addListener() {} }, onErrorOccurred: { addListener() {} } },
    tabs: { onRemoved: { addListener() {} }, get: async () => { throw new Error('no tab'); }, query: async () => [{ id: 10 }], sendMessage: async (_id, message) => message.kind === 'identify-tracker' ? { accountScope } : { status: 'ok' } },
    action: { setBadgeText: async ({ text }) => { icon.calls++; if (badgeFails) throw new Error('boom'); icon.text = text; }, setBadgeBackgroundColor: async ({ color }) => { icon.color = color; }, setTitle: async ({ title }) => { icon.title = title; } } };
  const worker = createBridgeWorker(api, { now: () => Date.parse('2026-11-22T15:00:00.000Z'), randomId: () => 'badge-event-0000000001' });
  return { api, worker, store, icon, sender: { id: 'badge-extension', url: api.runtime.getURL('popup.html') } };
}
async function pair(c) { assert.equal((await c.worker.message({ kind: 'pair' }, c.sender)).ok, true); }

test('badgeFor: sin vincular no hay marca; vinculada y en auto sin problema tampoco', () => {
  assert.equal(badgeFor({ accountScope: null, mode: 'observe', attention: null }).text, '');
  assert.equal(badgeFor({ accountScope, mode: 'auto', attention: null }).text, '');
  assert.equal(badgeFor({ accountScope, mode: 'auto', attention: 'tracker-closed' }).text, '', 'ventanita cerrada: las llamadas esperan, no es problema');
});

test('badgeFor: vinculada y sin registrar, o con llamadas trabadas, muestra "!"', () => {
  assert.equal(badgeFor({ accountScope, mode: 'observe', attention: null }).text, '!');
  for (const attention of ['queue-full', 'expired-event', 'event-rejected', 'tracker-needs-review']) {
    assert.equal(badgeFor({ accountScope, mode: 'auto', attention }).text, '!', attention);
  }
});

test('el worker pone la marca en el icono al vincular y la quita al registrar', async () => {
  const c = chrome();
  await pair(c);
  assert.equal(c.icon.text, '!', 'vinculada pero en observacion: no registra');
  assert.match(c.icon.title, /NO está registrando/);
  assert.ok(c.icon.color);
  assert.equal((await c.worker.message({ kind: 'mode', mode: 'auto' }, c.sender)).ok, true);
  assert.equal(c.icon.text, '');
  assert.equal(c.icon.title, 'Propio · Tracker y vista original');
});

test('si la extension se pausa por un problema, vuelve la marca', async () => {
  const c = chrome();
  await pair(c);
  await c.worker.message({ kind: 'mode', mode: 'auto' }, c.sender);
  assert.equal(c.icon.text, '');
  const key = 'bridge-v1';
  c.store[key] = { ...c.store[key], mode: 'observe', attention: 'queue-full' };
  await c.worker.message({ kind: 'status' }, c.sender);
  assert.equal(c.icon.text, '!');
});

test('no repite la orden al icono si la marca no cambio', async () => {
  const c = chrome();
  await pair(c);
  const calls = c.icon.calls;
  await c.worker.message({ kind: 'status' }, c.sender);
  await c.worker.message({ kind: 'status' }, c.sender);
  assert.equal(c.icon.calls, calls);
});

test('si el icono falla, el registro sigue funcionando', async () => {
  const c = chrome({ badgeFails: true });
  await pair(c);
  assert.equal((await c.worker.message({ kind: 'mode', mode: 'auto' }, c.sender)).ok, true);
  assert.equal(c.store['bridge-v1'].mode, 'auto');
});
