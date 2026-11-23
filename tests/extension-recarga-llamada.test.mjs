import test from 'node:test';
import assert from 'node:assert/strict';
import { createBridgeWorker } from '../extension/propio-bridge/bridge-worker.js';
import { BRIDGE_END_REASONS, validateBridgeEvent } from '../js/propio-bridge-rules.js';
import { observedCallRecord } from '../js/call-records.js';
import { readFileSync } from 'node:fs';
import { PORTAL_ORIGIN } from '../js/propio-bridge-rules.js';

const accountScope = 'f'.repeat(64);
const START = Date.parse('2026-11-22T15:00:00.000Z');

function fixture() {
  const store = {}, delivered = [];
  let clock = START, sequence = 0;
  const api = { runtime: { id: 'f5-extension', getURL: name => `chrome-extension://f5-extension/${name}`, onMessage: { addListener() {} } },
    storage: { local: { get: async key => ({ [key]: structuredClone(store[key]) }), set: async patch => { Object.assign(store, structuredClone(patch)); } } },
    alarms: { create() {}, onAlarm: { addListener() {} } },
    webNavigation: { onCommitted: { addListener() {} } },
    webRequest: { onBeforeRequest: { addListener() {} }, onCompleted: { addListener() {} }, onErrorOccurred: { addListener() {} } },
    tabs: { onRemoved: { addListener() {} }, get: async () => ({ url: `${PORTAL_ORIGIN}/` }), query: async () => [{ id: 10 }],
      sendMessage: async (_id, message) => { if (message.kind === 'identify-tracker') return { accountScope }; delivered.push(message.event); return { status: 'ok' }; } } };
  const worker = createBridgeWorker(api, { now: () => clock, randomId: () => `f5-event-${String(++sequence).padStart(10, '0')}` });
  const sender = { id: 'f5-extension', url: api.runtime.getURL('popup.html') };
  const signal = async (name, tabId = 1) => {
    const requestId = String(++sequence);
    worker.beforeRequest({ requestId, tabId, method: 'POST', initiator: PORTAL_ORIGIN, timeStamp: clock, url: 'https://eventgw.twilio.com/v4/EndpointEvents',
      requestBody: { raw: [{ bytes: new TextEncoder().encode(JSON.stringify({ name })).buffer }] } });
    await worker.completed({ requestId, statusCode: 200 });
  };
  const observe = (doc, tabId = 1, call = 'idle') => worker.message({ kind: 'portal-observation', session: 'authenticated', call, documentId: `doc-${doc}-abcdefghij`, observedAt: new Date(clock).toISOString() },
    { id: 'f5-extension', frameId: 0, tab: { id: tabId }, url: `${PORTAL_ORIGIN}/` });
  return { worker, sender, delivered, store, signal, observe, advance: ms => { clock += ms; } };
}
async function recording(f) {
  assert.equal((await f.worker.message({ kind: 'pair' }, f.sender)).ok, true);
  assert.equal((await f.worker.message({ kind: 'mode', mode: 'auto' }, f.sender)).ok, true);
}

test('las reglas aceptan el motivo "portal-reloaded" y siguen descartando otros', () => {
  assert.ok(BRIDGE_END_REASONS.includes('portal-reloaded'));
  const base = { version: 1, id: 'f5-event-0000000001', type: 'call-end', callId: 'f5-call-0000000001', startedAt: '2026-11-22T14:58:00.000Z', at: '2026-11-22T14:59:00.000Z' };
  const now = Date.parse('2026-11-22T15:00:00.000Z');
  assert.equal(validateBridgeEvent({ ...base, endedBy: 'portal-reloaded' }, now).endedBy, 'portal-reloaded');
  assert.equal('endedBy' in validateBridgeEvent({ ...base, endedBy: 'otra-cosa' }, now), false);
});

test('F5 a mitad de llamada: la llamada se guarda con la hora de la recarga y fin aproximado', async () => {
  const f = fixture();
  await recording(f);
  await f.observe('uno');
  await f.signal('accepted-by-local');
  assert.ok(f.store['bridge-v1'].tabs[1].active);
  f.advance(120000);
  await f.observe('dos'); // la pagina recargada trae otro documentId
  const end = f.delivered.find(event => event.type === 'call-end');
  assert.ok(end, 'se entrego el fin de la llamada');
  assert.equal(end.endedBy, 'portal-reloaded');
  assert.equal(Date.parse(end.at) - START, 120000);
  assert.ok(!f.store['bridge-v1'].tabs[1].active, 'la pestaña ya no tiene llamada activa');
});

test('sin llamada, o con el mismo documento, una observacion NO cierra nada', async () => {
  const f = fixture();
  await recording(f);
  await f.observe('uno'); await f.observe('dos');
  await f.signal('accepted-by-local');
  f.advance(5000);
  await f.observe('dos', 1, 'connected');
  assert.ok(f.store['bridge-v1'].tabs[1].active, 'mismo documento: la llamada sigue');
  assert.equal(f.delivered.some(event => event.type === 'call-end'), false);
});

test('la recarga de una pestaña no cierra la llamada de otra pestaña', async () => {
  const f = fixture();
  await recording(f);
  await f.observe('a', 1); await f.observe('b', 2);
  await f.signal('accepted-by-local', 1);
  f.advance(5000);
  await f.observe('b2', 2);
  assert.ok(f.store['bridge-v1'].tabs[1].active);
  assert.equal(f.delivered.some(event => event.type === 'call-end'), false);
});

test('la app guarda el motivo en la llamada y el detalle lo explica', () => {
  const view = readFileSync(new URL('../js/call-records-view.js', import.meta.url), 'utf8');
  assert.match(view, /portal-reloaded/);
  assert.match(view, /se recargó la página de Propio durante la llamada/);
  const rec = observedCallRecord({ id: 'propio_f5', source: 'live', startISO: '2026-11-22T15:00:00.000Z', endISO: '2026-11-22T15:02:00.000Z', propioBridge: { callId: 'f5', endedBy: 'portal-reloaded' } });
  assert.equal(rec.endedBy, 'portal-reloaded');
});
