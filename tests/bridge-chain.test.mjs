import test from 'node:test';
import assert from 'node:assert/strict';
import { createBridgeWorker } from '../extension/propio-bridge/bridge-worker.js';
import { createPropioReceiver } from '../js/propio-bridge.js';
import { PORTAL_ORIGIN } from '../js/propio-bridge-rules.js';

test('worker-to-receiver chain retries lost acknowledgments across 500 calls and worker restarts without duplicates', async () => {
  const store = {}, calls = [], state = {}, accountScope = 'a'.repeat(64);
  let clock = Date.parse('2026-10-08T06:00:00Z'), sequence = 0, loseAck = false;
  const persistCall = event => { calls.push({ id: `propio_${event.callId}`, propioBridge: { callId: event.callId } }); state.activeCall = null; return true; };
  const receive = createPropioReceiver({ now: () => clock, getState: () => state, getCalls: () => calls, save: () => true,
    start: event => { state.activeCall = { startedAt: event.at, propioBridge: { callId: event.callId } }; return true; }, end: persistCall, catchUp: persistCall });
  const api = { runtime: { id: 'audit-extension', getURL: name => `chrome-extension://audit-extension/${name}` },
    storage: { local: { get: async key => ({ [key]: structuredClone(store[key]) }), set: async patch => { Object.assign(store, structuredClone(patch)); } } },
    tabs: { query: async () => [{ id: 10 }], sendMessage: async (_id, message) => {
      if (message.kind === 'identify-tracker') return { accountScope };
      const ack = receive(message.event);
      if (loseAck) { loseAck = false; throw Error('Acknowledgment lost after local save'); }
      return ack;
    } } };
  const makeWorker = () => createBridgeWorker(api, { now: () => clock, randomId: () => `audit-event-${String(++sequence).padStart(12, '0')}` });
  let worker = makeWorker();
  const sender = { id: 'audit-extension', url: api.runtime.getURL('popup.html') };
  assert.equal((await worker.message({ kind: 'pair' }, sender)).ok, true);
  assert.equal((await worker.message({ kind: 'mode', mode: 'auto' }, sender)).ok, true);
  const signal = async name => {
    const requestId = String(++sequence);
    worker.beforeRequest({ requestId, tabId: 1, method: 'POST', initiator: PORTAL_ORIGIN, timeStamp: clock, url: 'https://eventgw.twilio.com/v4/EndpointEvents',
      requestBody: { raw: [{ bytes: new TextEncoder().encode(JSON.stringify({ name, token: 'discard-this-synthetic-secret' })).buffer }] } });
    await worker.completed({ requestId, statusCode: 200 });
  };
  for (let i = 0; i < 500; i++) {
    await signal('accepted-by-local'); clock += 60000;
    loseAck = i % 7 === 0; await signal('disconnected-by-remote');
    if (i % 11 === 0) worker = makeWorker();
    await worker.flush(); clock += 1000;
    assert.equal(calls.length, i + 1);
  }
  assert.equal(new Set(calls.map(c => c.id)).size, 500);
  const status = await worker.message({ kind: 'status' }, sender);
  assert.equal(status.queued, 0); assert.equal(status.completed, 500);
  assert.equal(JSON.stringify(store).includes('discard-this-synthetic-secret'), false);
});
