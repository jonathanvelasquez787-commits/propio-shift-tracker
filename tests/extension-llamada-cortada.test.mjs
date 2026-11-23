import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createBridgeWorker } from '../extension/propio-bridge/bridge-worker.js';
import { createPropioReceiver } from '../js/propio-bridge.js';
import { PORTAL_ORIGIN, validateBridgeEvent, createPropioReducer } from '../js/propio-bridge-rules.js';
import { observedCallRecord } from '../js/call-records.js';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const accountScope = 'd'.repeat(64);
const START = Date.parse('2026-11-22T15:00:00.000Z');

function fixture({ trackerOpen = true } = {}) {
  const store = {}, delivered = [], listeners = {};
  const flags = { trackerOpen };
  let clock = START, sequence = 0;
  const api = { runtime: { id: 'cut-extension', getURL: name => `chrome-extension://cut-extension/${name}`, onMessage: { addListener() {} } },
    storage: { local: { get: async key => ({ [key]: structuredClone(store[key]) }), set: async patch => { Object.assign(store, structuredClone(patch)); } } },
    alarms: { create() {}, onAlarm: { addListener() {} } },
    webNavigation: { onCommitted: { addListener() {} } },
    webRequest: { onBeforeRequest: { addListener() {} }, onCompleted: { addListener() {} }, onErrorOccurred: { addListener() {} } },
    tabs: { onRemoved: { addListener: fn => { listeners.removed = fn; } },
      query: async () => flags.trackerOpen ? [{ id: 10 }] : [],
      sendMessage: async (_id, message) => {
        if (message.kind === 'identify-tracker') return { accountScope };
        delivered.push(message.event); return { status: 'ok' };
      } } };
  const worker = createBridgeWorker(api, { now: () => clock, randomId: () => `cut-event-${String(++sequence).padStart(10, '0')}` });
  const sender = { id: 'cut-extension', url: api.runtime.getURL('popup.html') };
  const signal = async (name, tabId = 1) => {
    const requestId = String(++sequence);
    worker.beforeRequest({ requestId, tabId, method: 'POST', initiator: PORTAL_ORIGIN, timeStamp: clock, url: 'https://eventgw.twilio.com/v4/EndpointEvents',
      requestBody: { raw: [{ bytes: new TextEncoder().encode(JSON.stringify({ name })).buffer }] } });
    await worker.completed({ requestId, statusCode: 200 });
  };
  return { worker, api, sender, delivered, store, listeners, flags, signal, advance: ms => { clock += ms; }, clock: () => clock };
}
// Vincular necesita la ventanita abierta; despues se puede cerrar (como en la vida real).
async function recording(f, mode = 'auto') {
  const wasOpen = f.flags.trackerOpen; f.flags.trackerOpen = true;
  assert.equal((await f.worker.message({ kind: 'pair' }, f.sender)).ok, true);
  if (mode === 'auto') assert.equal((await f.worker.message({ kind: 'mode', mode: 'auto' }, f.sender)).ok, true);
  f.flags.trackerOpen = wasOpen;
}

test('las reglas aceptan el motivo "portal-closed" en el final de llamada y descartan cualquier otro', () => {
  const base = { version: 1, id: 'cut-event-0000000001', type: 'call-end', callId: 'cut-call-0000000001', startedAt: '2026-11-22T14:58:00.000Z', at: '2026-11-22T14:59:00.000Z' };
  const now = Date.parse('2026-11-22T15:00:00.000Z');
  assert.equal(validateBridgeEvent({ ...base, endedBy: 'portal-closed' }, now).endedBy, 'portal-closed');
  assert.equal('endedBy' in validateBridgeEvent({ ...base, endedBy: 'cualquier-cosa' }, now), false);
  assert.equal('endedBy' in validateBridgeEvent(base, now), false);
  const reduce = createPropioReducer({ randomId: () => 'cut-id-00000000001' });
  const started = reduce(null, 'accepted', '2026-11-22T14:58:00.000Z');
  assert.equal(reduce(started.state, 'disconnected', '2026-11-22T14:59:00.000Z', { endedBy: 'portal-closed' }).event.endedBy, 'portal-closed');
  assert.equal('endedBy' in reduce(started.state, 'disconnected', '2026-11-22T14:59:00.000Z').event, false, 'una desconexión real no lleva motivo');
});

test('al cerrarse la pestaña de Propio en plena llamada la extensión genera el final y lo guarda aunque la ventanita esté cerrada', async () => {
  const f = fixture({ trackerOpen: false });
  await recording(f);
  await f.signal('accepted-by-local'); f.advance(95000);
  await f.worker.tabRemoved(1);
  const status = await f.worker.message({ kind: 'status' }, f.sender);
  assert.deepEqual(status.queueItems.map(item => item.type), ['call-start', 'call-end'], 'la llamada queda completa en la cola de espera');
  assert.equal(status.completed, 1);
  assert.equal(status.active, false, 'la llamada ya no queda "activa" en la extensión');
  const queued = f.store['bridge-v1'].queue.map(item => item.event);
  assert.equal(queued[1].endedBy, 'portal-closed');
  assert.equal(queued[1].callId, queued[0].callId);
  assert.equal(queued[1].startedAt, queued[0].at);
  assert.equal(Date.parse(queued[1].at), f.clock(), 'el final es la hora del cierre');
  assert.notEqual(status.attention, 'portal-closed', 'la llamada se guardó: no hace falta pedir revisión a mano');
});

test('con la ventanita abierta el final llega a la app con su motivo y la llamada se guarda', async () => {
  const f = fixture({ trackerOpen: true });
  await recording(f);
  await f.signal('accepted-by-local'); f.advance(60000);
  await f.worker.tabRemoved(1);
  assert.deepEqual(f.delivered.map(event => event.type), ['call-start', 'call-end']);
  assert.equal(f.delivered[1].endedBy, 'portal-closed');
  const state = {}, calls = [];
  const ends = [], catchUps = [];
  const receive = createPropioReceiver({ now: () => f.clock(), getState: () => state, getCalls: () => calls, save: () => true,
    start: event => { state.activeCall = { startedAt: event.at, propioBridge: { callId: event.callId } }; return true; },
    end: event => { ends.push(event); state.activeCall = null; return true; }, catchUp: event => { catchUps.push(event); return true; } });
  receive(f.delivered[0]);
  assert.equal(receive(f.delivered[1]).status, 'ok');
  assert.equal(ends.length, 1);
  assert.equal(ends[0].endedBy, 'portal-closed', 'la app recibe el motivo para guardarlo en la llamada');
});

test('si la ventanita estaba cerrada y el inicio llegó tarde, el final con su motivo guarda la llamada completa', () => {
  const state = {}, calls = [], catchUps = [];
  const clock = START + 20 * 60000;
  const receive = createPropioReceiver({ now: () => clock, getState: () => state, getCalls: () => calls, save: () => true,
    start: () => { throw Error('un inicio de hace 20 minutos no debe abrir una llamada en vivo'); }, end: () => true, catchUp: event => { catchUps.push(event); return true; } });
  const start = { version: 1, id: 'cut-event-0000000010', type: 'call-start', callId: 'cut-call-0000000002', at: new Date(START).toISOString() };
  const end = { version: 1, id: 'cut-event-0000000011', type: 'call-end', callId: 'cut-call-0000000002', startedAt: start.at, at: new Date(START + 60000).toISOString(), endedBy: 'portal-closed' };
  assert.equal(receive(start).status, 'ok');
  assert.equal(receive(end).status, 'ok');
  assert.equal(catchUps.length, 1);
  assert.equal(catchUps[0].endedBy, 'portal-closed');
});

test('sin grabación (modo observación) el cierre sigue avisando "portal-closed" y no inventa eventos', async () => {
  const f = fixture({ trackerOpen: false });
  await recording(f, 'observe');
  await f.signal('accepted-by-local'); f.advance(30000);
  await f.worker.tabRemoved(1);
  const status = await f.worker.message({ kind: 'status' }, f.sender);
  assert.equal(status.queued, 0);
  assert.equal(status.attention, 'portal-closed');
});

test('cerrar una pestaña sin llamada activa no genera nada', async () => {
  const f = fixture({ trackerOpen: false });
  await recording(f);
  await f.signal('accepted-by-local'); f.advance(30000); await f.signal('disconnected-by-remote');
  const before = (await f.worker.message({ kind: 'status' }, f.sender)).queued;
  await f.worker.tabRemoved(1);
  assert.equal((await f.worker.message({ kind: 'status' }, f.sender)).queued, before);
});

test('el listener de pestañas cerradas usa la misma función y la app guarda y muestra el motivo', () => {
  const f = fixture();
  f.worker.install();
  assert.equal(typeof f.listeners.removed, 'function');
  const worker = read('extension/propio-bridge/bridge-worker.js');
  assert.match(worker, /api\.tabs\.onRemoved\.addListener\(tabId => \{ tabRemoved\(tabId\)/);
  const main = read('js/app-main.js');
  assert.match(main, /endCall\(\{ endedAt: event\.at, endedBy: event\.endedBy \}\)/);
  assert.match(main, /options\.endedBy \? \{ \.\.\.state\.activeCall, propioBridge: \{ \.\.\.state\.activeCall\.propioBridge, endedBy: options\.endedBy \} \}/);
  assert.match(main, /\.\.\.\(event\.endedBy \? \{ endedBy: event\.endedBy \} : \{\}\)/);
  const view = read('js/call-records-view.js');
  assert.equal((view.match(/\$\{approxEndHtml\(tool, translateText, esc\)\}/g) || []).length, 2, 'detalle y vista de "juntar" muestran la nota');
  assert.match(read('js/call-table-view.js'), /Fin aproximado/);
});

test('la medición guardada conserva el motivo del final aproximado', () => {
  const call = { id: 'propio_cut-call-0000000003', source: 'live', startISO: '2026-11-22T14:58:00.000Z', endISO: '2026-11-22T14:59:35.000Z', pay: '1.20',
    propioBridge: { callId: 'cut-call-0000000003', endedBy: 'portal-closed' } };
  assert.equal(observedCallRecord(call).endedBy, 'portal-closed');
  assert.equal('endedBy' in observedCallRecord({ ...call, propioBridge: { callId: 'cut-call-0000000003' } }), false);
});
