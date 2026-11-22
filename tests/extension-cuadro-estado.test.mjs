import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extensionBoxModel, initExtensionBox } from '../js/extension-box.js';
import { createBridgeWorker } from '../extension/propio-bridge/bridge-worker.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

function workerFixture() {
  const data = { 'bridge-v1': { schema: 1 } };
  const api = { runtime: { id: 'extension-id', getURL: (name) => `chrome-extension://extension-id/${name}` },
    storage: { local: { async get(key) { return { [key]: structuredClone(data[key]) }; }, async set(update) { Object.assign(data, structuredClone(update)); } } },
    tabs: { async query() { return []; }, async sendMessage() { return null; }, async create() {}, async reload() {} } };
  return createBridgeWorker(api, { now: () => Date.parse('2026-11-22T15:00:00.000Z') });
}

test('cuadro de la extensión: el punto verde solo sale cuando está vinculada, registrando y sin avisos', () => {
  assert.equal(extensionBoxModel({ paired: true, mode: 'auto', queued: 0, attention: null }).dot, 'on');
  assert.equal(extensionBoxModel({ paired: true, mode: 'observe', queued: 0 }).dot, 'idle');
  assert.equal(extensionBoxModel({ paired: true, mode: 'auto', attention: 'queue-full' }).dot, 'warn');
  assert.equal(extensionBoxModel({ paired: false, mode: 'auto' }).dot, 'off');
  assert.equal(extensionBoxModel(null).dot, 'off');
  assert.equal(extensionBoxModel({ ok: false }).dot, 'off');
});

test('cuadro de la extensión: textos y cola salen igual que en la ventanita vieja', () => {
  const on = extensionBoxModel({ paired: true, mode: 'auto', queued: 3 });
  assert.equal(on.badge, 'Conectada'); assert.equal(on.title, 'Registro automático activo'); assert.equal(on.queued, 3);
  assert.equal(extensionBoxModel({ paired: true, mode: 'observe' }).title, 'Listo para registrar');
  const waiting = extensionBoxModel({ paired: false });
  assert.equal(waiting.badge, 'Esperando'); assert.equal(waiting.title, 'Buscando Propio Shift Tracker');
  assert.match(extensionBoxModel({ paired: true, mode: 'auto', attention: 'tracker-closed' }).detail, /Abrí Propio Shift Tracker/);
  assert.equal(extensionBoxModel({ paired: true, queued: -4 }).queued, 0);
});

test('cuadro de la extensión: en la web normal no se crea nada', () => {
  const doc = { getElementById() { throw new Error('no debe tocar la página'); } };
  assert.equal(initExtensionBox(doc, { runtime: { sendMessage() {} } }, { protocol: 'https:', search: '' }), null);
  assert.equal(initExtensionBox(doc, undefined, { protocol: 'chrome-extension:', search: '' }), null);
});

test('cuadro de la extensión: el worker atiende al panel de la app y sigue rechazando páginas ajenas', async () => {
  const worker = workerFixture();
  const from = (url) => ({ id: 'extension-id', url: `chrome-extension://extension-id/${url}` });
  for (const page of ['panel.html', 'panel.html?popup=1', 'popup.html']) {
    const state = await worker.message({ kind: 'status' }, from(page));
    assert.equal(state?.mode, 'observe', page);
  }
  for (const page of ['panel.html.evil', 'otra.html', 'workspace.html']) assert.equal(await worker.message({ kind: 'status' }, from(page)), null, page);
  assert.equal(await worker.message({ kind: 'status' }, { id: 'otra-extension', url: 'chrome-extension://extension-id/panel.html' }), null);
});

test('cuadro de la extensión: está conectado a la app y su CSS usa variables del tema', () => {
  const main = read('js/app-main.js'), css = read('css/app-shell.css');
  assert.match(main, /import \{ initExtensionBox \} from '\.\/extension-box\.js'/);
  assert.ok(main.indexOf("initExtensionBox();") > main.indexOf("getElementById('ajustesHeaderBtn').addEventListener"));
  const block = css.slice(css.indexOf('/* cuadro extension */'), css.indexOf('/* fin cuadro extension */'));
  assert.ok(block.length > 500 && !/#[0-9a-fA-F]{3,8}\b/.test(block), 'sin hexadecimales');
  assert.equal((block.match(/\{/g) || []).length, (block.match(/\}/g) || []).length);
  const src = read('js/extension-box.js');
  for (const kind of ["'status'", "'pair'", "'open-tracker'", "'mode'"]) assert.ok(src.includes(kind), kind);
  assert.ok(!/localStorage|innerHTML\s*=\s*`/.test(src.replace(/icon\.innerHTML = '[^']*'/, '')), 'sin HTML armado con datos');
});
