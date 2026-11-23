import test from 'node:test';
import assert from 'node:assert/strict';
import { createBridgeWorker, badgeFor, SIGNALS_ODD_LIMIT } from '../extension/propio-bridge/bridge-worker.js';
import { extensionActivityModel } from '../js/extension-box.js';
import { PORTAL_ORIGIN } from '../js/propio-bridge-rules.js';

const accountScope = 'a'.repeat(64);

function chrome() {
  const store = {}, icon = { text: '', title: null };
  const api = { runtime: { id: 'sig-extension', getURL: name => `chrome-extension://sig-extension/${name}`, onMessage: { addListener() {} }, onStartup: { addListener() {} } },
    storage: { local: { get: async key => ({ [key]: structuredClone(store[key]) }), set: async patch => { Object.assign(store, structuredClone(patch)); } } },
    alarms: { create() {}, onAlarm: { addListener() {} } },
    webNavigation: { onCommitted: { addListener() {} } },
    webRequest: { onBeforeRequest: { addListener() {} }, onCompleted: { addListener() {} }, onErrorOccurred: { addListener() {} } },
    tabs: { onRemoved: { addListener() {} }, get: async () => { throw new Error('no tab'); }, query: async () => [{ id: 10 }], sendMessage: async (_id, message) => message.kind === 'identify-tracker' ? { accountScope } : { status: 'ok' } },
    action: { setBadgeText: async ({ text }) => { icon.text = text; }, setBadgeBackgroundColor: async () => {}, setTitle: async ({ title }) => { icon.title = title; } } };
  let id = 0;
  const worker = createBridgeWorker(api, { now: () => Date.parse('2026-11-22T15:00:00.000Z'), randomId: () => `sig-event-${String(++id).padStart(10, '0')}` });
  const sender = { id: 'sig-extension', url: api.runtime.getURL('popup.html') };
  // Un evento de llamadas de Twilio con el cuerpo dado (objeto JSON) y el codigo HTTP.
  const twilio = async (body, statusCode = 200) => {
    const requestId = String(++id);
    worker.beforeRequest({ requestId, tabId: 1, method: 'POST', initiator: PORTAL_ORIGIN, timeStamp: Date.parse('2026-11-22T15:00:00.000Z'), url: 'https://eventgw.twilio.com/v4/EndpointEvents',
      requestBody: { raw: [{ bytes: new TextEncoder().encode(JSON.stringify(body)).buffer }] } });
    await worker.completed({ requestId, statusCode });
  };
  return { worker, sender, icon, store, twilio };
}
async function recording(c) {
  assert.equal((await c.worker.message({ kind: 'pair' }, c.sender)).ok, true);
  assert.equal((await c.worker.message({ kind: 'mode', mode: 'auto' }, c.sender)).ok, true);
}

test('badgeFor: una racha larga de eventos ilegibles pone "!" aunque este registrando', () => {
  const base = { accountScope, mode: 'auto', attention: null };
  assert.equal(badgeFor({ ...base, diagnostic: { oddRun: SIGNALS_ODD_LIMIT - 1 } }).text, '');
  const badge = badgeFor({ ...base, diagnostic: { oddRun: SIGNALS_ODD_LIMIT } });
  assert.equal(badge.text, '!');
  assert.match(badge.title, /cambió sus señales/);
  assert.equal(badgeFor({ accountScope: null, mode: 'observe', diagnostic: { oddRun: 99 } }).text, '', 'sin vincular no avisa');
});

test('el worker pone "!" tras varios eventos de llamadas sin nombre legible y lo quita con uno legible', async () => {
  const c = chrome();
  await recording(c);
  assert.equal(c.icon.text, '');
  for (let i = 0; i < SIGNALS_ODD_LIMIT - 1; i++) await c.twilio({ eventName: 'algo-nuevo' });
  assert.equal(c.icon.text, '', 'todavia no llega al limite');
  await c.twilio({ eventName: 'algo-nuevo' });
  assert.equal(c.icon.text, '!');
  assert.match(c.icon.title, /cambió sus señales/);
  await c.twilio({ name: 'registered' }); // un evento con nombre (aunque no sea una llamada) prueba que el formato sigue igual
  assert.equal(c.icon.text, '');
  assert.equal(c.store['bridge-v1'].diagnostic.oddRun, 0);
});

test('eventos con nombre desconocido o fallos de red NO cuentan como señales cambiadas', async () => {
  const c = chrome();
  await recording(c);
  for (let i = 0; i < SIGNALS_ODD_LIMIT * 2; i++) await c.twilio({ name: 'otro-evento' });
  assert.equal(c.icon.text, '');
  for (let i = 0; i < SIGNALS_ODD_LIMIT * 2; i++) await c.twilio({ eventName: 'x' }, 500);
  assert.equal(c.icon.text, '', 'un HTTP 500 no es un cambio de formato');
  assert.equal(c.store['bridge-v1'].diagnostic.oddRun, 0);
});

test('la racha sigue contando aunque lleguen solicitudes que fallan en medio', async () => {
  const c = chrome();
  await recording(c);
  for (let i = 0; i < 5; i++) await c.twilio({ eventName: 'x' });
  await c.twilio({ eventName: 'x' }, 500);
  assert.equal(c.store['bridge-v1'].diagnostic.oddRun, 5);
  for (let i = 0; i < 3; i++) await c.twilio({ eventName: 'x' });
  assert.equal(c.icon.text, '!');
});

test('las llamadas normales se siguen registrando igual', async () => {
  const c = chrome();
  await recording(c);
  await c.twilio({ name: 'accepted-by-local' });
  const state = c.store['bridge-v1'];
  assert.ok(state.tabs[1]?.active, 'la llamada quedo activa');
  assert.equal(state.last.at(-1)?.signal, 'accepted');
  assert.equal(state.diagnostic.oddRun, 0);
});

test('el cuadro explica en "Estado de conexión" que Propio cambio sus señales', () => {
  const base = { ok: true, paired: true, mode: 'auto', portal: 'authenticated', completed: 0, call: 'none' };
  assert.doesNotMatch(extensionActivityModel({ ...base, diagnostic: { oddRun: 7, requests: 9, recognized: 0, last: [] } }).connection, /cambió sus señales/);
  assert.match(extensionActivityModel({ ...base, diagnostic: { oddRun: 8, requests: 9, recognized: 0, last: [] } }).connection, /cambió sus señales/);
});
