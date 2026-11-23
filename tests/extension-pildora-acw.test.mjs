import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateAutomationStatus } from '../js/automation-status.js';
import { acwPillModel, installAcwPill, acwPillKey } from '../extension/propio-bridge/acw-pill.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const NOW = Date.parse('2026-11-23T15:00:00Z');
const iso = (ms) => new Date(ms).toISOString();
const snap = (over = {}) => validateAutomationStatus({
  version: 1, reportedAt: iso(NOW), observedAt: iso(NOW), reason: 'spacing', recording: true, paused: false, portal: 'authenticated', call: 'idle',
  review: false, devicePassive: false, coordinationConfirmed: true, scheduleVerified: true, waitUntil: iso(NOW + 108000), acwObservedAt: iso(NOW),
  options: { first: true, spacing: true, break: false, lunch: false, timed: false, minutes: 3 }, ...over,
}, NOW);

test('pildora de ACW: la cuenta regresiva dice cuanto falta para ponerte disponible', () => {
  assert.deepEqual(acwPillModel(snap(), NOW), { tone: 'go', text: 'Disponible en 01:48' });
  assert.equal(acwPillModel(snap(), NOW + 8000)?.text, 'Disponible en 01:40');
});

test('pildora de ACW: cada motivo de espera tiene su texto', () => {
  assert.equal(acwPillModel(snap({ reason: 'pause', pauseType: 'break' }), NOW)?.text, 'Esperando fin de Break');
  assert.equal(acwPillModel(snap({ reason: 'pause', pauseType: 'lunch' }), NOW)?.text, 'Esperando fin de Lunch');
  assert.equal(acwPillModel(snap({ reason: 'acw-pending', waitUntil: null }), NOW)?.text, 'Esperando al Tracker');
  assert.equal(acwPillModel(snap({ reason: 'acw-update', waitUntil: null }), NOW)?.text, 'Actualiza el Tracker');
  assert.equal(acwPillModel(snap({ paused: true }), NOW)?.text, 'Pausada por ti');
  assert.equal(acwPillModel(snap({ reason: 'starting', waitUntil: null }), NOW)?.text, 'Poniéndote disponible…');
});

test('pildora de ACW: no se muestra en llamada, con llamada entrante, ya disponible, con registro apagado o con datos viejos', () => {
  assert.equal(acwPillModel(snap({ call: 'connected' }), NOW), null);
  assert.equal(acwPillModel(snap({ call: 'incoming' }), NOW), null);
  assert.equal(acwPillModel(snap({ reason: 'available', waitUntil: null }), NOW), null);
  assert.equal(acwPillModel(snap({ recording: false }), NOW), null);
  assert.equal(acwPillModel(snap({ devicePassive: true }), NOW), null);
  assert.equal(acwPillModel(snap(), NOW + 60000), null);
  assert.equal(acwPillModel(null, NOW), null);
});

function fakeDom(darkAttr = false) {
  const made = [];
  const mk = () => ({ style: {}, textContent: '', attrs: {}, children: [], isConnected: true,
    setAttribute(k, v) { this.attrs[k] = v; }, append(...c) { this.children.push(...c); }, remove() { this.isConnected = false; },
    attachShadow() { const root = { append: (...c) => { this.shadowKids = c; } }; return root; } });
  const document = { body: { append: (e) => made.push(e) }, documentElement: { hasAttribute: () => darkAttr }, createElement: () => mk() };
  return { document, made };
}
function fakeApi(stored, reply) {
  const listeners = []; const sent = [];
  return { sent, listeners, runtime: { sendMessage: async (m) => { sent.push(m); return reply(); } },
    storage: { local: { get: async () => stored }, onChanged: { addListener: (f) => listeners.push(f), removeListener: () => {} } } };
}
const win = { top: null, location: { origin: 'https://interpreters.propio-ls.com', pathname: '/portal/home' }, addEventListener() {} };
win.top = win;

test('pildora de ACW: se dibuja con la cuenta regresiva y desaparece al apagar el interruptor', async () => {
  const { document, made } = fakeDom(); let t = NOW; const ticks = [];
  const api = fakeApi({}, () => ({ ok: true, status: snap() }));
  const handle = installAcwPill(api, { window: win, document, setTimer: (f) => { ticks.push(f); return 1; }, clearTimer() {}, now: () => t });
  await new Promise(r => setTimeout(r, 5));
  ticks[0](); await new Promise(r => setTimeout(r, 5)); ticks[0]();
  assert.equal(api.sent[0].kind, 'acw-pill');
  const pill = made[0].shadowKids[0];
  assert.equal(pill.textContent, 'Disponible en 01:48');
  t += 5000; ticks[0]();
  assert.equal(pill.textContent, 'Disponible en 01:43');
  api.listeners[0]({ [acwPillKey]: { newValue: { enabled: false } } }, 'local');
  assert.equal(made[0].isConnected, false);
  handle.stop();
});

test('pildora de ACW: apagada de entrada no pregunta al worker ni se dibuja', async () => {
  const { document, made } = fakeDom(); const ticks = [];
  const api = fakeApi({ [acwPillKey]: { enabled: false } }, () => ({ ok: true, status: snap() }));
  installAcwPill(api, { window: win, document, setTimer: (f) => { ticks.push(f); return 1; }, clearTimer() {}, now: () => NOW });
  await new Promise(r => setTimeout(r, 5)); ticks[0]();
  assert.equal(api.sent.length, 0); assert.equal(made.length, 0);
});

test('pildora de ACW: el worker solo contesta a la pagina de Propio y el cuadro tiene su interruptor', () => {
  const worker = read('extension/propio-bridge/bridge-worker.js');
  const i = worker.indexOf("packet?.kind === 'acw-pill'");
  const body = worker.slice(i, i + 500);
  assert.ok(body.includes('sender.frameId !== 0') && body.includes('PORTAL_ORIGIN'));
  assert.ok(read('extension/propio-bridge/original-portal-entry.js').includes('installAcwPill(chrome'));
  const box = read('js/extension-box.js');
  assert.match(box, /'extBoxAcwPill', 'Píldora de ACW en Propio'/);
  assert.ok(box.includes(`ACW_PILL_KEY = '${acwPillKey}'`));
  assert.match(box, /\[ACW_PILL_KEY\]: \{ enabled \}/);
});
