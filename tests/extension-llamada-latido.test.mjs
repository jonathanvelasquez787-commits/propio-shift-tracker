import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createBridgeWorker } from '../extension/propio-bridge/bridge-worker.js';
import { PORTAL_ORIGIN, BRIDGE_MAX_AGE, validateBridgeEvent } from '../js/propio-bridge-rules.js';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const accountScope = 'e'.repeat(64);
const START = Date.parse('2026-11-22T15:00:00.000Z');

// Un "Chrome" falso: almacenamiento compartido entre reinicios, pestañas que existen o no, y una ventanita (tracker) que siempre responde.
function chrome({ trackerOpen = true } = {}) {
  const store = {}, delivered = [], writes = { count: 0 };
  const tabs = new Map(); // id -> url
  const flags = { trackerOpen };
  let clock = START, sequence = 0;
  const handlers = {};
  const api = { runtime: { id: 'beat-extension', getURL: name => `chrome-extension://beat-extension/${name}`, onMessage: { addListener() {} }, onStartup: { addListener: fn => { handlers.startup = fn; } } },
    storage: { local: { get: async key => ({ [key]: structuredClone(store[key]) }), set: async patch => { writes.count++; Object.assign(store, structuredClone(patch)); } } },
    alarms: { create() {}, onAlarm: { addListener: fn => { handlers.alarm = fn; } } },
    webNavigation: { onCommitted: { addListener() {} } },
    webRequest: { onBeforeRequest: { addListener() {} }, onCompleted: { addListener() {} }, onErrorOccurred: { addListener() {} } },
    tabs: { onRemoved: { addListener() {} },
      get: async id => { if (!tabs.has(id)) throw new Error(`No tab with id: ${id}.`); return { id, url: tabs.get(id) }; },
      query: async () => flags.trackerOpen ? [{ id: 10 }] : [],
      sendMessage: async (_id, message) => { if (message.kind === 'identify-tracker') return { accountScope }; delivered.push(message.event); return { status: 'ok' }; } } };
  const make = () => createBridgeWorker(api, { now: () => clock, randomId: () => `beat-event-${String(++sequence).padStart(10, '0')}` });
  const sender = { id: 'beat-extension', url: api.runtime.getURL('popup.html') };
  const signal = async (worker, name, tabId = 1) => {
    const requestId = String(++sequence);
    worker.beforeRequest({ requestId, tabId, method: 'POST', initiator: PORTAL_ORIGIN, timeStamp: clock, url: 'https://eventgw.twilio.com/v4/EndpointEvents',
      requestBody: { raw: [{ bytes: new TextEncoder().encode(JSON.stringify({ name })).buffer }] } });
    await worker.completed({ requestId, statusCode: 200 });
  };
  return { api, make, sender, signal, store, tabs, delivered, writes, flags, handlers, advance: ms => { clock += ms; }, clock: () => clock };
}
async function recording(c, worker) {
  const wasOpen = c.flags.trackerOpen; c.flags.trackerOpen = true;
  assert.equal((await worker.message({ kind: 'pair' }, c.sender)).ok, true);
  assert.equal((await worker.message({ kind: 'mode', mode: 'auto' }, c.sender)).ok, true);
  c.flags.trackerOpen = wasOpen;
}
const queued = c => c.store['bridge-v1'].queue.map(item => item.event);

test('las reglas aceptan el motivo "chrome-restarted" en el final de llamada', () => {
  const event = { version: 1, id: 'beat-event-0000000001', type: 'call-end', callId: 'beat-call-0000000001', startedAt: '2026-11-22T14:58:00.000Z', at: '2026-11-22T14:59:00.000Z', endedBy: 'chrome-restarted' };
  assert.equal(validateBridgeEvent(event, START).endedBy, 'chrome-restarted');
});

test('mientras hay una llamada activa la extensión anota el último momento visto, y sin llamada no escribe nada', async () => {
  const c = chrome(); const worker = c.make(); c.tabs.set(1, `${PORTAL_ORIGIN}/app`);
  await recording(c, worker);
  const idle = c.writes.count; assert.equal(await worker.heartbeat(), false); assert.equal(c.writes.count, idle, 'sin llamada el latido no escribe');
  await c.signal(worker, 'accepted-by-local'); c.advance(30000);
  assert.equal(await worker.heartbeat(), true);
  assert.equal(c.store['bridge-v1'].tabs[1].aliveAt, new Date(c.clock()).toISOString());
});

test('Chrome cerrado de golpe: al volver la llamada se guarda con el último latido y el motivo "chrome-restarted"', async () => {
  const c = chrome(); const before = c.make(); c.tabs.set(1, `${PORTAL_ORIGIN}/app`);
  await recording(c, before); c.flags.trackerOpen = false;
  await c.signal(before, 'accepted-by-local');
  c.advance(30000); await before.heartbeat(); c.advance(30000); await before.heartbeat();
  const lastBeat = c.clock();
  // Se cierra todo Chrome: ya nadie late. Pasan 40 minutos y Chrome vuelve con un worker nuevo y sin pestañas.
  c.advance(40 * 60000); c.tabs.clear(); c.flags.trackerOpen = false;
  const after = c.make(); after.install();
  await c.handlers.startup(); await new Promise(resolve => setTimeout(resolve, 20));
  const events = queued(c);
  assert.deepEqual(events.map(event => event.type), ['call-start', 'call-end']);
  assert.equal(events[1].endedBy, 'chrome-restarted');
  assert.equal(Date.parse(events[1].at), lastBeat, 'el final es el último momento visto, no la hora de ahora');
  assert.equal(events[1].callId, events[0].callId);
  const status = await after.message({ kind: 'status' }, c.sender);
  assert.equal(status.active, false); assert.equal(status.completed, 1);
  assert.notEqual(status.attention, 'portal-closed');
});

test('si el worker se reinicia con Chrome abierto y la pestaña de Propio sigue ahí, la llamada NO se cierra', async () => {
  const c = chrome(); const before = c.make(); c.tabs.set(1, `${PORTAL_ORIGIN}/app`);
  await recording(c, before); await c.signal(before, 'accepted-by-local'); c.advance(30000);
  const after = c.make(); await after.heartbeat();
  assert.equal(queued(c).filter(event => event.type === 'call-end').length, 0);
  assert.equal((await after.message({ kind: 'status' }, c.sender)).active, true);
});

test('si Chrome reutilizó ese número de pestaña para otra página que no es Propio, la llamada huérfana se cierra', async () => {
  const c = chrome(); const before = c.make(); c.tabs.set(1, `${PORTAL_ORIGIN}/app`);
  await recording(c, before); c.flags.trackerOpen = false; await c.signal(before, 'accepted-by-local'); c.advance(30000); await before.heartbeat();
  c.advance(10 * 60000); c.tabs.set(1, 'https://example.com/otra-cosa');
  await c.make().heartbeat();
  assert.equal(queued(c).find(event => event.type === 'call-end')?.endedBy, 'chrome-restarted');
});

test('si Chrome murió antes del primer latido la llamada se guarda con 1 segundo, no se pierde', async () => {
  const c = chrome(); const before = c.make(); c.tabs.set(1, `${PORTAL_ORIGIN}/app`);
  await recording(c, before); c.flags.trackerOpen = false; await c.signal(before, 'accepted-by-local');
  const start = c.clock(); c.advance(15 * 60000); c.tabs.clear();
  await c.make().heartbeat();
  const end = queued(c).find(event => event.type === 'call-end');
  assert.equal(Date.parse(end.at), start + 1000);
});

test('una llamada huérfana de más de 24 horas no se entrega y NO pausa la grabación', async () => {
  const c = chrome(); const before = c.make(); c.tabs.set(1, `${PORTAL_ORIGIN}/app`);
  await recording(c, before); await c.signal(before, 'accepted-by-local');
  c.advance(BRIDGE_MAX_AGE + 3600000); c.tabs.clear();
  const after = c.make(); await after.heartbeat();
  assert.equal(queued(c).filter(event => event.type === 'call-end').length, 0);
  const status = await after.message({ kind: 'status' }, c.sender);
  assert.equal(status.mode, 'auto'); assert.equal(status.attention, 'portal-closed'); assert.equal(status.active, false);
});

test('sin grabación (modo observación) el cierre huérfano solo avisa y no inventa eventos', async () => {
  const c = chrome({ trackerOpen: false }); const before = c.make(); c.tabs.set(1, `${PORTAL_ORIGIN}/app`);
  c.flags.trackerOpen = true; assert.equal((await before.message({ kind: 'pair' }, c.sender)).ok, true); c.flags.trackerOpen = false;
  await c.signal(before, 'accepted-by-local'); c.advance(60000); c.tabs.clear();
  const after = c.make(); await after.heartbeat();
  const status = await after.message({ kind: 'status' }, c.sender);
  assert.equal(status.queued, 0); assert.equal(status.attention, 'portal-closed');
});

test('la alarma de cada 30 segundos y el arranque de Chrome disparan el latido, y la app muestra la nota nueva', async () => {
  const c = chrome(); const worker = c.make(); c.tabs.set(1, `${PORTAL_ORIGIN}/app`);
  worker.install();
  assert.equal(typeof c.handlers.alarm, 'function'); assert.equal(typeof c.handlers.startup, 'function');
  await recording(c, worker); await c.signal(worker, 'accepted-by-local'); c.advance(45000);
  c.handlers.alarm({ name: 'retry-bridge' }); await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(c.store['bridge-v1'].tabs[1].aliveAt, new Date(c.clock()).toISOString());
  assert.match(read('js/call-records-view.js'), /endedBy === 'chrome-restarted' \? translateText\('Fin aproximado: Chrome o la computadora se cerró/);
  assert.match(read('extension/propio-bridge/bridge-worker.js'), /api\.runtime\.onStartup\?\.addListener/);
});
