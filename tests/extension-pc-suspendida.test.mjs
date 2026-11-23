import test from 'node:test';
import assert from 'node:assert/strict';
import { createBridgeWorker, SLEEP_GAP_MS } from '../extension/propio-bridge/bridge-worker.js';
import { BRIDGE_END_REASONS, validateBridgeEvent } from '../js/propio-bridge-rules.js';
import { readFileSync } from 'node:fs';
import { PORTAL_ORIGIN } from '../js/propio-bridge-rules.js';

const accountScope = 'b'.repeat(64);
const START = Date.parse('2026-11-22T15:00:00.000Z');

function fixture() {
  const store = {}, delivered = [];
  let clock = START, sequence = 0;
  const api = { runtime: { id: 'zz-extension', getURL: name => `chrome-extension://zz-extension/${name}`, onMessage: { addListener() {} } },
    storage: { local: { get: async key => ({ [key]: structuredClone(store[key]) }), set: async patch => { Object.assign(store, structuredClone(patch)); } } },
    alarms: { create() {}, onAlarm: { addListener() {} } },
    webNavigation: { onCommitted: { addListener() {} } },
    webRequest: { onBeforeRequest: { addListener() {} }, onCompleted: { addListener() {} }, onErrorOccurred: { addListener() {} } },
    tabs: { onRemoved: { addListener() {} }, get: async () => ({ url: `${PORTAL_ORIGIN}/` }), query: async () => [{ id: 10 }],
      sendMessage: async (_id, message) => { if (message.kind === 'identify-tracker') return { accountScope }; delivered.push(message.event); return { status: 'ok' }; } } };
  const worker = createBridgeWorker(api, { now: () => clock, randomId: () => `zz-event-${String(++sequence).padStart(10, '0')}` });
  const sender = { id: 'zz-extension', url: api.runtime.getURL('popup.html') };
  const signal = async (name, tabId = 1) => {
    const requestId = String(++sequence);
    worker.beforeRequest({ requestId, tabId, method: 'POST', initiator: PORTAL_ORIGIN, timeStamp: clock, url: 'https://eventgw.twilio.com/v4/EndpointEvents',
      requestBody: { raw: [{ bytes: new TextEncoder().encode(JSON.stringify({ name })).buffer }] } });
    await worker.completed({ requestId, statusCode: 200 });
  };
  const observe = (doc, tabId = 1, call = 'idle') => worker.message({ kind: 'portal-observation', session: 'authenticated', call, documentId: `doc-${doc}-abcdefghij`, observedAt: new Date(clock).toISOString() },
    { id: 'zz-extension', frameId: 0, tab: { id: tabId }, url: `${PORTAL_ORIGIN}/` });
  return { worker, sender, delivered, store, signal, observe, advance: ms => { clock += ms; } };
}
async function recording(f) {
  assert.equal((await f.worker.message({ kind: 'pair' }, f.sender)).ok, true);
  assert.equal((await f.worker.message({ kind: 'mode', mode: 'auto' }, f.sender)).ok, true);
}

// Llamada activa en la pestaña 1; devuelve el momento de la ultima vez que se vio viva.
async function inCall(f) {
  await recording(f);
  await f.observe('uno', 1, 'connected');
  await f.signal('accepted-by-local');
  f.advance(30000); await f.worker.heartbeat();
  return f.store['bridge-v1'].tabs[1].aliveAt;
}

test('las reglas aceptan el motivo "computer-slept" y siguen descartando otros', () => {
  assert.ok(BRIDGE_END_REASONS.includes('computer-slept'));
  const base = { version: 1, id: 'zz-event-0000000001', type: 'call-end', callId: 'zz-call-0000000001', startedAt: '2026-11-22T14:58:00.000Z', at: '2026-11-22T14:59:00.000Z' };
  const now = Date.parse('2026-11-22T15:00:00.000Z');
  assert.equal(validateBridgeEvent({ ...base, endedBy: 'computer-slept' }, now).endedBy, 'computer-slept');
  assert.equal('endedBy' in validateBridgeEvent({ ...base, endedBy: 'otra-cosa' }, now), false);
});

test('PC suspendida: si la pagina ya dice que no hay llamada, se cierra con el ultimo momento visto', async () => {
  const f = fixture();
  const lastAlive = await inCall(f);
  f.advance(SLEEP_GAP_MS + 60000); // la PC durmio varios minutos
  await f.observe('uno', 1, 'idle');
  await f.worker.heartbeat();
  const end = f.delivered.find(event => event.type === 'call-end');
  assert.ok(end, 'la llamada se guardo');
  assert.equal(end.endedBy, 'computer-slept');
  assert.equal(end.at, lastAlive);
  assert.equal(f.store['bridge-v1'].tabs[1], undefined);
});

test('PC suspendida: si la pagina sigue diciendo "conectada", la llamada NO se corta', async () => {
  const f = fixture();
  await inCall(f);
  f.advance(SLEEP_GAP_MS + 60000);
  await f.observe('uno', 1, 'connected');
  await f.worker.heartbeat();
  assert.ok(f.store['bridge-v1'].tabs[1].active);
  assert.equal(f.delivered.some(event => event.type === 'call-end'), false);
  assert.equal(f.store['bridge-v1'].tabs[1].aliveAt, new Date(Date.parse('2026-11-22T15:00:00.000Z') + 30000 + SLEEP_GAP_MS + 60000).toISOString());
});

test('PC suspendida: sin respuesta de la pagina espera una vuelta y a la segunda cierra', async () => {
  const f = fixture();
  const lastAlive = await inCall(f);
  f.advance(SLEEP_GAP_MS + 60000);
  await f.worker.heartbeat(); // la pagina aun no dice nada
  assert.ok(f.store['bridge-v1'].tabs[1].active, 'primera vuelta: todavia espera');
  assert.equal(f.delivered.some(event => event.type === 'call-end'), false);
  f.advance(30000);
  await f.worker.heartbeat();
  const end = f.delivered.find(event => event.type === 'call-end');
  assert.ok(end);
  assert.equal(end.endedBy, 'computer-slept');
  assert.equal(end.at, lastAlive);
});

test('latido normal (sin salto grande) con la pagina en reposo NO cierra la llamada', async () => {
  const f = fixture();
  await inCall(f);
  f.advance(30000);
  await f.observe('uno', 1, 'idle');
  await f.worker.heartbeat();
  assert.ok(f.store['bridge-v1'].tabs[1].active);
  assert.equal(f.delivered.some(event => event.type === 'call-end'), false);
});

test('el detalle de la llamada explica la suspension de la computadora', () => {
  const view = readFileSync(new URL('../js/call-records-view.js', import.meta.url), 'utf8');
  assert.match(view, /computer-slept/);
  assert.match(view, /la computadora se suspendió durante la llamada/);
});
