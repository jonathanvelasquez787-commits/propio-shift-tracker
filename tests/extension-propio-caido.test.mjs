import test from 'node:test';
import assert from 'node:assert/strict';
import { createBridgeWorker, IDLE_LIMIT_MS, SILENT_LIMIT_MS, CALL_MAX_MS } from '../extension/propio-bridge/bridge-worker.js';
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

const START_ISO = new Date(START).toISOString();
// Llamada activa y conectada en la pestaña 1.
async function inCall(f) {
  await recording(f);
  await f.observe('uno', 1, 'connected');
  await f.signal('accepted-by-local');
}
// Pasa el tiempo en pasos de 30 s (como la alarma) con la pagina diciendo `call` en cada paso (o en silencio si es null).
async function run(f, ms, call) {
  for (let t = 0; t < ms; t += 30000) { f.advance(30000); if (call) await f.observe('uno', 1, call); await f.worker.heartbeat(); }
}
const ended = f => f.delivered.find(event => event.type === 'call-end');

test('las reglas aceptan el motivo "propio-stopped" y siguen descartando otros', () => {
  assert.ok(BRIDGE_END_REASONS.includes('propio-stopped'));
  const base = { version: 1, id: 'zz-event-0000000001', type: 'call-end', callId: 'zz-call-0000000001', startedAt: '2026-11-22T14:58:00.000Z', at: '2026-11-22T14:59:00.000Z' };
  const now = Date.parse('2026-11-22T15:00:00.000Z');
  assert.equal(validateBridgeEvent({ ...base, endedBy: 'propio-stopped' }, now).endedBy, 'propio-stopped');
  assert.equal('endedBy' in validateBridgeEvent({ ...base, endedBy: 'otra-cosa' }, now), false);
});

test('Propio caido: si la pagina dice "sin llamada" 2 minutos, la llamada se guarda con el ultimo momento conectada', async () => {
  const f = fixture();
  await inCall(f);
  await run(f, 60000, 'connected');
  const lastConnected = new Date(Date.parse(START_ISO) + 60000).toISOString();
  await run(f, IDLE_LIMIT_MS + 60000, 'idle');
  const end = ended(f);
  assert.ok(end, 'la llamada se guardo');
  assert.equal(end.endedBy, 'propio-stopped');
  assert.equal(end.at, lastConnected);
  assert.ok(!f.store['bridge-v1'].tabs[1]?.active, 'ya no hay llamada activa');
});

test('menos de 2 minutos de "sin llamada" NO cierra, y si vuelve a "conectada" se olvida', async () => {
  const f = fixture();
  await inCall(f);
  await run(f, 60000, 'idle');
  assert.ok(f.store['bridge-v1'].tabs[1].active, 'solo 1 minuto sin llamada: sigue');
  await run(f, 30000, 'connected');
  assert.equal(f.store['bridge-v1'].tabs[1].idleSince, undefined);
  await run(f, 60000, 'idle');
  assert.ok(f.store['bridge-v1'].tabs[1].active, 'la cuenta empezo de nuevo');
  assert.equal(ended(f), undefined);
});

test('una llamada larga de 2 horas con la pagina "conectada" NO se corta', async () => {
  const f = fixture();
  await inCall(f);
  await run(f, 2 * 3600000, 'connected');
  assert.ok(f.store['bridge-v1'].tabs[1].active);
  assert.equal(ended(f), undefined);
});

test('pagina congelada: 5 minutos sin reportar nada cierra con la ultima vez que reporto', async () => {
  const f = fixture();
  await inCall(f);
  await run(f, 60000, 'connected');
  const lastSeen = new Date(Date.parse(START_ISO) + 60000).toISOString();
  await run(f, SILENT_LIMIT_MS - 60000, null);
  assert.equal(ended(f), undefined, 'todavia no pasan 5 minutos');
  await run(f, 120000, null);
  const end = ended(f);
  assert.ok(end);
  assert.equal(end.endedBy, 'propio-stopped');
  assert.equal(end.at, lastSeen);
});

test('limite de duracion: una llamada "conectada" que pasa de 4 h 10 min se cierra con fin dudoso de 4 h', async () => {
  const f = fixture();
  await inCall(f);
  await run(f, CALL_MAX_MS - 60000, 'connected');
  assert.equal(ended(f), undefined, 'a las 4 h 9 min todavia sigue');
  await run(f, 120000, 'connected');
  const end = ended(f);
  assert.ok(end);
  assert.equal(end.endedBy, 'propio-stopped');
  assert.ok(Date.parse(end.at) - START <= 4 * 3600000, 'no pasa de las 4 horas');
});

test('el detalle de la llamada explica que Propio dejo de mostrar la llamada', () => {
  const view = readFileSync(new URL('../js/call-records-view.js', import.meta.url), 'utf8');
  assert.match(view, /propio-stopped/);
  assert.match(view, /Propio dejó de mostrar la llamada/);
});
