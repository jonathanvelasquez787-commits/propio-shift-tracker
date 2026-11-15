import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TRACKER_ORIGIN, validateBridgeReinforcement } from '../js/propio-bridge-rules.js';
import { installPropioBridge } from '../js/propio-bridge.js';
import { createBridgeWorker } from '../extension/propio-bridge/bridge-worker.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const scope = 'c'.repeat(64);
const popupSender = { id: 'extension-id', url: 'chrome-extension://extension-id/popup.html' };
const trackerSender = { id: 'extension-id', frameId: 0, tab: { id: 10 }, url: `${TRACKER_ORIGIN}/app.html` };
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function windowFixture(overrides = {}) {
  const posted = [], listeners = new Set();
  const host = { crypto: { randomUUID: () => 'nonce-123456789012' }, location: { origin: TRACKER_ORIGIN }, navigator: {},
    postMessage(packet) { posted.push(packet); }, addEventListener(_, fn) { listeners.add(fn); }, removeEventListener(_, fn) { listeners.delete(fn); } };
  const stop = installPropioBridge({ host, accountScope: scope, receive: () => ({ status: 'ok' }), ...overrides });
  const dispatch = (data, extra = {}) => { for (const fn of listeners) fn({ source: host, origin: TRACKER_ORIGIN, data, ...extra }); };
  const base = { protocol: posted[0].protocol, direction: 'extension', nonce: posted[0].nonce, accountScope: scope };
  return { host, posted, dispatch, base, stop };
}

function workerFixture({ reinforcement = { celebrate: false, ask: false }, ack = { status: 'ok' } } = {}) {
  const data = { 'bridge-v1': { schema: 1 } }, delivered = [];
  const state = { reinforcement, ack };
  const api = { runtime: { id: 'extension-id', getURL: (name) => `chrome-extension://extension-id/${name}` },
    storage: { local: { async get(key) { return { [key]: structuredClone(data[key]) }; }, async set(update) { Object.assign(data, structuredClone(update)); } } },
    tabs: { async query() { return [{ id: 10 }]; },
      async sendMessage(id, message) {
        if (message.kind === 'identify-tracker') return { accountScope: scope, plan: null, reinforcement: state.reinforcement };
        delivered.push(message); return state.ack;
      }, async create() {}, async reload() {} } };
  const worker = createBridgeWorker(api, { now: () => Date.parse('2026-11-16T15:00:00.000Z') });
  return { worker, delivered, state, data };
}

test('las reglas del puente solo aceptan dos booleanos exactos para el refuerzo', () => {
  assert.deepEqual(validateBridgeReinforcement({ celebrate: true, ask: false, extra: 'x' }), { celebrate: true, ask: false });
  for (const bad of [null, undefined, 'si', [], {}, { celebrate: true }, { celebrate: 'true', ask: false }, { celebrate: 1, ask: 0 }]) {
    assert.equal(validateBridgeReinforcement(bad), null);
  }
});

test('la app avisa sus dos interruptores en cada paquete ready y valida los cambios que llegan de la extensión', async () => {
  const current = { celebrate: false, ask: true }, applied = [];
  const f = windowFixture({ getReinforcement: () => current, applyReinforcement: (value) => { applied.push(value); Object.assign(current, value); return { status: 'ok' }; } });
  assert.deepEqual(f.posted[0].reinforcement, { celebrate: false, ask: true });
  const packet = { ...f.base, kind: 'settings', requestId: 'request-id-123456789', reinforcement: { celebrate: true, ask: false } };
  f.dispatch({ ...packet, nonce: 'otro' }); f.dispatch(packet, { origin: 'https://evil.test' }); f.dispatch({ ...packet, requestId: 'x' });
  f.dispatch({ ...packet, reinforcement: { celebrate: 'true', ask: false } }); await tick();
  assert.equal(applied.length, 0, 'paquetes falsos o mal formados no cambian nada');
  assert.equal(f.posted.filter((item) => item.kind === 'ack').at(-1).result.reason, 'invalid-reinforcement');
  f.dispatch(packet); await tick();
  assert.deepEqual(applied, [{ celebrate: true, ask: false }]);
  const ack = f.posted.filter((item) => item.kind === 'ack').at(-1);
  assert.equal(ack.result.status, 'ok');
  assert.deepEqual(f.posted.at(-1).reinforcement, { celebrate: true, ask: false }, 'después de cambiar vuelve a avisar el estado nuevo');
});

test('una app vieja sin soporte responde update-tracker y no manda ajustes inventados', async () => {
  const f = windowFixture();
  assert.equal(f.posted[0].reinforcement, null);
  f.dispatch({ ...f.base, kind: 'settings', requestId: 'request-id-123456789', reinforcement: { celebrate: true, ask: true } }); await tick();
  assert.equal(f.posted.filter((item) => item.kind === 'ack').at(-1).result.reason, 'update-tracker');
});

test('el worker guarda el estado que avisa la app y el popup lo manda a la pestaña vinculada', async () => {
  const f = workerFixture({ reinforcement: { celebrate: false, ask: true } });
  assert.equal((await f.worker.message({ kind: 'pair' }, popupSender)).ok, true);
  assert.deepEqual((await f.worker.message({ kind: 'status' }, popupSender)).preparation.reinforcement, { celebrate: false, ask: true });
  const result = await f.worker.message({ kind: 'reinforcement', celebrate: true, ask: true }, popupSender);
  assert.equal(result.ok, true);
  assert.deepEqual(f.delivered.at(-1), { kind: 'deliver-settings', accountScope: scope, reinforcement: { celebrate: true, ask: true } });
  assert.deepEqual((await f.worker.message({ kind: 'status' }, popupSender)).preparation.reinforcement, { celebrate: true, ask: true });
});

test('el worker rechaza valores raros, cuentas sin vincular, remitentes ajenos y respuestas fallidas', async () => {
  const f = workerFixture();
  assert.equal((await f.worker.message({ kind: 'reinforcement', celebrate: true, ask: false }, popupSender)).reason, 'account-needed');
  await f.worker.message({ kind: 'pair' }, popupSender);
  for (const bad of [{ celebrate: 'true', ask: false }, { celebrate: true }, { celebrate: 1, ask: 1 }]) {
    assert.equal((await f.worker.message({ kind: 'reinforcement', ...bad }, popupSender)).reason, 'invalid-reinforcement');
  }
  assert.equal(f.delivered.length, 0);
  assert.equal(await f.worker.message({ kind: 'reinforcement', celebrate: true, ask: true }, trackerSender), null, 'solo el popup puede cambiarlo');
  f.state.ack = { status: 'blocked', reason: 'app-timeout' };
  const failed = await f.worker.message({ kind: 'reinforcement', celebrate: true, ask: true }, popupSender);
  assert.deepEqual(failed, { ok: false, reason: 'app-timeout' });
  assert.deepEqual((await f.worker.message({ kind: 'status' }, popupSender)).preparation.reinforcement, { celebrate: false, ask: false }, 'si la app no confirma, el popup no cambia');
});

test('el popup tiene su tarjeta entre ACW y Apariencia, apagada y deshabilitada sin vínculo', () => {
  const html = read('extension/propio-bridge/popup.html'), js = read('extension/propio-bridge/popup.js');
  const card = html.indexOf('aria-label="Refuerzo positivo"');
  assert.ok(card > html.indexOf('id="spacingEnabled"') && card < html.indexOf('aria-label="Apariencia de Propio"'));
  for (const text of ['Celebrar con la extensión', 'Celebra las llamadas que la extensión registra sola.', 'Cierre breve con la extensión', 'Pregunta cómo te fue en esas llamadas.']) assert.ok(html.includes(text), text);
  const section = html.slice(card, html.indexOf('</section>', card));
  assert.equal((section.match(/class="toggle-row"/g) || []).length, 2);
  assert.doesNotMatch(section, /\bchecked\b/);
  assert.match(js, /input\.disabled = busy \|\| !state\.paired \|\| !prep\?\.reinforcement/);
  assert.match(js, /act\(\{ kind: 'reinforcement'/);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids.filter((id, i) => ids.indexOf(id) !== i), []);
});

test('el script de contenido de la extensión reenvía los ajustes solo a la pestaña vinculada', () => {
  const js = read('extension/propio-bridge/tracker-content.js');
  assert.match(js, /message\?\.kind === 'deliver-settings'/);
  assert.match(js, /message\.accountScope !== ready\.accountScope/);
  assert.match(js, /kind: 'settings'/);
});
