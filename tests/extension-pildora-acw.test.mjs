import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateAutomationStatus } from '../js/automation-status.js';
import { acwPillModel, installAcwPill, acwPillKey, acwPillPosKey, acwPillClamp, readChipStyle, applyChipStyle } from '../extension/propio-bridge/acw-pill.js';

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
  const mk = () => ({ style: {}, textContent: '', attrs: {}, children: [], isConnected: true, handlers: {}, addEventListener(k, f) { this.handlers[k] = f; }, setPointerCapture() {},
    setAttribute(k, v) { this.attrs[k] = v; }, append(...c) { this.children.push(...c); }, remove() { this.isConnected = false; },
    attachShadow() { const root = { append: (...c) => { this.shadowKids = c; } }; return root; } });
  const document = { body: { append: (e) => made.push(e) }, documentElement: { hasAttribute: () => darkAttr }, createElement: () => mk() };
  return { document, made };
}
function fakeApi(stored, reply) {
  const listeners = []; const sent = [];
  const api = { sent, listeners, saved: [], runtime: { sendMessage: async (m) => { sent.push(m); return reply(); } },
    storage: { local: { get: async () => stored, set: async (v) => { api.saved.push(v); } }, onChanged: { addListener: (f) => listeners.push(f), removeListener: () => {} } } };
  return api;
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

test('pildora de ACW: se arrastra, no se sale de la pantalla y la posicion se guarda', async () => {
  assert.deepEqual(acwPillClamp({ right: 20, bottom: 20 }, { width: 1000, height: 800 }, { width: 150, height: 40 }), { right: 20, bottom: 20 });
  assert.deepEqual(acwPillClamp({ right: -50, bottom: 9999 }, { width: 1000, height: 800 }, { width: 150, height: 40 }), { right: 4, bottom: 756 });
  assert.deepEqual(acwPillClamp(null, { width: 1000, height: 800 }, { width: 150, height: 40 }), { right: 20, bottom: 20 });
  const { document, made } = fakeDom(); const ticks = [];
  const api = fakeApi({}, () => ({ ok: true, status: snap() }));
  const w = Object.assign({}, win, { innerWidth: 1000, innerHeight: 800 }); w.top = w;
  installAcwPill(api, { window: w, document, setTimer: (f) => { ticks.push(f); return 1; }, clearTimer() {}, now: () => NOW });
  await new Promise(r => setTimeout(r, 5)); ticks[0](); await new Promise(r => setTimeout(r, 5)); ticks[0]();
  const pill = made[0].shadowKids[0];
  pill.handlers.pointerdown({ button: 0, clientX: 900, clientY: 700, pointerId: 1, preventDefault() {} });
  pill.handlers.pointermove({ clientX: 800, clientY: 600 });
  assert.equal(pill.style.right, '120px'); assert.equal(pill.style.bottom, '120px');
  ticks[0]();
  assert.equal(pill.style.right, '120px');
  pill.handlers.pointerup({});
  assert.deepEqual(api.saved, [{ [acwPillPosKey]: { right: 120, bottom: 120 } }]);
});

test('pildora de ACW: al abrir Propio vuelve a la posicion guardada', async () => {
  const { document, made } = fakeDom(); const ticks = [];
  const api = fakeApi({ [acwPillPosKey]: { right: 300, bottom: 150 } }, () => ({ ok: true, status: snap() }));
  const w = Object.assign({}, win, { innerWidth: 1000, innerHeight: 800 }); w.top = w;
  installAcwPill(api, { window: w, document, setTimer: (f) => { ticks.push(f); return 1; }, clearTimer() {}, now: () => NOW });
  await new Promise(r => setTimeout(r, 5)); ticks[0](); await new Promise(r => setTimeout(r, 5)); ticks[0]();
  const pill = made[0].shadowKids[0];
  assert.equal(pill.style.right, '300px'); assert.equal(pill.style.bottom, '150px');
});

test('pildora de ACW: copia tamano y color de las pildoras Calls / Minutes / Pay de Propio', () => {
  const page = { background: 'rgb(0, 188, 212)', parent: null };
  const mk = (text, styles, parent, box) => ({ children: [], textContent: text, parentElement: parent, styles, getBoundingClientRect: () => box || { height: 0 } });
  const body = mk('', { backgroundColor: 'rgb(0, 188, 212)' }, null);
  const bar = mk('', { backgroundColor: 'rgb(0, 188, 212)' }, body);
  const chip = mk('Calls: 0', {
    backgroundColor: 'rgba(0, 0, 0, 0.25)', color: 'rgb(10, 20, 30)', fontFamily: 'Poppins', fontSize: '13px', fontWeight: '500', letterSpacing: 'normal',
    borderTopLeftRadius: '14px', borderTopWidth: '0px', borderTopStyle: 'none', borderTopColor: 'rgb(0,0,0)',
    paddingTop: '4px', paddingRight: '12px', paddingBottom: '4px', paddingLeft: '12px' }, bar, { height: 28 });
  const wrapper = mk('Calls: 0 Minutes: 0', { backgroundColor: 'rgb(9, 9, 9)' }, body);
  const document = { body, querySelectorAll: () => [wrapper, bar, chip, mk('Minutes: 0', chip.styles, bar, { height: 28 })] };
  const window = { getComputedStyle: node => node.styles };
  const got = readChipStyle(window, document);
  assert.equal(got.background, 'rgb(0, 141, 159)', 'mezcla el fondo translucido con el fondo de la barra');
  assert.equal(got.height, '28px'); assert.equal(got.borderRadius, '14px'); assert.equal(got.border, 'none'); assert.deepEqual(got.padding, ['4px', '12px', '4px', '12px']);
  const pill = { style: {} }; applyChipStyle(pill, got);
  assert.equal(pill.style.padding, '4px 22px 4px 22px', 'un poco mas ancha que la pildora de Propio');
  assert.equal(pill.style.height, '28px'); assert.equal(pill.style.color, 'rgb(10, 20, 30)'); assert.equal(pill.style.boxShadow, 'none');
  assert.equal(readChipStyle(window, { body, querySelectorAll: () => [bar] }), null, 'sin pildoras de referencia usa los colores de siempre');
});

test('pildora de ACW: encuentra el fondo en el ::before, entiende color(srgb) y no toma la barra completa', () => {
  const mk = (text, styles, parent, box, pseudo) => ({ children: [], textContent: text, parentElement: parent, styles, pseudo, getBoundingClientRect: () => box });
  const body = mk('', { backgroundColor: 'rgb(255, 255, 255)' }, null, { height: 800, width: 1000 });
  const bar = mk('', { backgroundColor: 'rgb(0, 188, 212)' }, body, { height: 60, width: 900 });
  const chip = mk('Pay: $0.00', { backgroundColor: 'rgba(0, 0, 0, 0)', color: 'rgb(1, 2, 3)', fontFamily: 'x', fontSize: '13px', fontWeight: '500', letterSpacing: 'normal',
    borderTopLeftRadius: '12px', borderTopWidth: '0px', borderTopStyle: 'none', paddingTop: '2px', paddingRight: '8px', paddingBottom: '2px', paddingLeft: '8px' }, bar, { height: 26, width: 90 },
    { backgroundColor: 'color(srgb 0 0 0 / 0.2)' });
  const window = { getComputedStyle: (node, pseudo) => (pseudo === '::before' ? node.pseudo || { backgroundColor: 'rgba(0, 0, 0, 0)' } : node.styles) };
  const got = readChipStyle(window, { body, querySelectorAll: () => [chip] });
  assert.equal(got.background, 'rgb(0, 150, 170)');
  assert.equal(got.height, '26px');
  const onlyBar = mk('Calls: 0', { backgroundColor: 'rgb(9, 9, 9)' }, body, { height: 60, width: 900 });
  assert.equal(readChipStyle(window, { body, querySelectorAll: () => [onlyBar] }), null, 'una barra grande no cuenta como pildora');
});
