import test from 'node:test';
import assert from 'node:assert/strict';
import { createBridgeWorker } from '../extension/propio-bridge/bridge-worker.js';
import { PORTAL_ORIGIN } from '../js/propio-bridge-rules.js';

const accountScope = 'e'.repeat(64);
const START = Date.parse('2026-11-22T15:00:00.000Z');

// Varias pestañas de Propio abiertas: cada una lleva su propia llamada (state.tabs[tabId]).
function fixture() {
  const store = {}, delivered = [], listeners = {};
  let clock = START, sequence = 0;
  const api = { runtime: { id: 'tabs-extension', getURL: name => `chrome-extension://tabs-extension/${name}`, onMessage: { addListener() {} } },
    storage: { local: { get: async key => ({ [key]: structuredClone(store[key]) }), set: async patch => { Object.assign(store, structuredClone(patch)); } } },
    alarms: { create() {}, onAlarm: { addListener() {} } },
    webNavigation: { onCommitted: { addListener() {} } },
    webRequest: { onBeforeRequest: { addListener() {} }, onCompleted: { addListener() {} }, onErrorOccurred: { addListener() {} } },
    tabs: { onRemoved: { addListener: fn => { listeners.removed = fn; } }, query: async () => [{ id: 10 }],
      sendMessage: async (_id, message) => { if (message.kind === 'identify-tracker') return { accountScope }; delivered.push(message.event); return { status: 'ok' }; } } };
  const worker = createBridgeWorker(api, { now: () => clock, randomId: () => `tabs-event-${String(++sequence).padStart(10, '0')}` });
  const sender = { id: 'tabs-extension', url: api.runtime.getURL('popup.html') };
  const signal = async (name, tabId) => {
    const requestId = String(++sequence);
    worker.beforeRequest({ requestId, tabId, method: 'POST', initiator: PORTAL_ORIGIN, timeStamp: clock, url: 'https://eventgw.twilio.com/v4/EndpointEvents',
      requestBody: { raw: [{ bytes: new TextEncoder().encode(JSON.stringify({ name })).buffer }] } });
    await worker.completed({ requestId, statusCode: 200 });
  };
  const observe = (tabId, session = 'authenticated') => worker.message({ kind: 'portal-observation', session, call: 'idle', documentId: `doc-${tabId}-abcdefghij`, observedAt: new Date(clock).toISOString() },
    { id: 'tabs-extension', frameId: 0, tab: { id: tabId }, url: `${PORTAL_ORIGIN}/` });
  return { worker, sender, delivered, store, listeners, signal, observe, advance: ms => { clock += ms; } };
}
async function recording(f) {
  assert.equal((await f.worker.message({ kind: 'pair' }, f.sender)).ok, true);
  assert.equal((await f.worker.message({ kind: 'mode', mode: 'auto' }, f.sender)).ok, true);
}
const types = f => f.delivered.map(event => event.type);

test('dos pestañas de Propio: la llamada de una no se mezcla con la otra pestaña', async () => {
  const f = fixture();
  await recording(f);
  await f.observe(1); await f.observe(2);
  await f.signal('accepted-by-local', 1);
  const tabs = f.store['bridge-v1'].tabs;
  assert.ok(tabs[1].active, 'la pestaña 1 tiene la llamada');
  assert.ok(!tabs[2].active, 'la pestaña 2 sigue sin llamada');
  // Un "colgar" que llega por la pestaña 2 (sin llamada) no toca la llamada de la 1.
  f.advance(5000);
  await f.signal('disconnected-by-remote', 2);
  assert.ok(f.store['bridge-v1'].tabs[1].active, 'la llamada de la pestaña 1 sigue abierta');
  assert.deepEqual(types(f).filter(type => type.startsWith('call-')), ['call-start']);
});

test('cerrar la pestaña SIN llamada no corta la llamada de la otra pestaña', async () => {
  const f = fixture();
  await recording(f);
  await f.observe(1); await f.observe(2);
  await f.signal('accepted-by-local', 1);
  f.advance(5000);
  await f.worker.tabRemoved(2);
  assert.ok(f.store['bridge-v1'].tabs[1].active);
  assert.equal(types(f).includes('call-end'), false);
  f.advance(60000);
  await f.signal('disconnected-by-remote', 1);
  const end = f.delivered.find(event => event.type === 'call-end');
  assert.ok(end, 'la llamada termina normal');
  assert.equal(end.endedBy, undefined);
});

test('cerrar la pestaña CON llamada guarda esa llamada aunque haya otra pestaña abierta', async () => {
  const f = fixture();
  await recording(f);
  await f.observe(1); await f.observe(2);
  await f.signal('accepted-by-local', 2);
  f.advance(90000);
  await f.worker.tabRemoved(2);
  const end = f.delivered.find(event => event.type === 'call-end');
  assert.ok(end, 'la llamada de la pestaña cerrada se guarda');
  assert.equal(end.endedBy, 'portal-closed');
  assert.ok(f.store['bridge-v1'].tabs[1], 'la otra pestaña sigue');
});

test('cada pestaña lleva su propia llamada: terminar una no cierra la otra', async () => {
  const f = fixture();
  await recording(f);
  await f.observe(1); await f.observe(2);
  await f.signal('accepted-by-local', 1);
  f.advance(1000);
  await f.signal('accepted-by-local', 2);
  f.advance(30000);
  await f.signal('disconnected-by-remote', 1);
  assert.ok(!f.store['bridge-v1'].tabs[1].active);
  assert.ok(f.store['bridge-v1'].tabs[2].active, 'la llamada de la pestaña 2 sigue abierta');
});
