import test from 'node:test';
import assert from 'node:assert/strict';
import { createBridgeWorker, badgeFor } from '../extension/propio-bridge/bridge-worker.js';
import { SESSION_KEY, scopeForUser } from '../extension/propio-bridge/worker-session.js';
import { extensionClosedModeModel } from '../js/extension-box.js';

const OWNER = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

test('marca (5): sin sesion del worker sale "!" solo con la bandera y no sin ella', () => {
  const state = { accountScope: 'a'.repeat(64), mode: 'auto', attention: null };
  assert.equal(badgeFor(state).text, '');
  assert.equal(badgeFor(state, { workerSession: false }).text, '');
  const badge = badgeFor(state, { workerSession: true });
  assert.equal(badge.text, '!');
  assert.match(badge.title, /sesión propia del worker/);
  assert.equal(badgeFor({ ...state, accountScope: null }, { workerSession: true }).text, '', 'sin vincular nunca hay marca');
});

test('cuadro (5): el resumen del modo todo cerrado dice que falta', () => {
  const ok = { paired: true, mode: 'auto', workerSession: { state: 'ok' }, workerLease: { state: 'granted' }, workerData: { state: 'ok' }, workerPlan: { state: 'ok' } };
  assert.equal(extensionClosedModeModel(ok), 'Modo todo cerrado: listo.');
  assert.match(extensionClosedModeModel({ ...ok, workerPlan: { state: 'no-plan' } }), /listo \(hoy no hay turno/);
  assert.match(extensionClosedModeModel({ ...ok, workerSession: { state: 'expired' } }), /falta la sesión propia del worker/);
  assert.match(extensionClosedModeModel({ ...ok, workerLease: { state: 'denied' } }), /falta el permiso del worker/);
  assert.match(extensionClosedModeModel({ ...ok, workerPlan: { state: 'stale-data' } }), /datos de la nube al día/);
  assert.match(extensionClosedModeModel({ ...ok, mode: 'observe' }), /apagado/);
  assert.match(extensionClosedModeModel({ paired: false }), /primero conectá/);
  assert.match(extensionClosedModeModel({ ok: false }), /primero conectá/);
});

async function rig({ withSession, trackerOpen = false, passive = false }) {
  const scope = await scopeForUser(OWNER);
  const store = withSession ? { [SESSION_KEY]: { accessToken: 'T', refreshToken: 'R', expiresAt: Date.now() + 3600000, scope, email: 'yo@example.com' } } : {};
  if (passive) store['automation-device-passive'] = true;
  const badge = { text: '', title: '' };
  const api = { runtime: { id: 'ext', getURL: n => `chrome-extension://ext/${n}`, onMessage: { addListener() {} } },
    storage: { local: { get: async key => ({ [key]: structuredClone(store[key]) }), set: async patch => { Object.assign(store, structuredClone(patch)); }, remove: async key => { delete store[key]; } } },
    alarms: { create() {}, onAlarm: { addListener() {} } }, webNavigation: { onCommitted: { addListener() {} } },
    webRequest: { onBeforeRequest: { addListener() {} }, onCompleted: { addListener() {} }, onErrorOccurred: { addListener() {} } },
    action: { setBadgeText: async ({ text }) => { badge.text = text; }, setBadgeBackgroundColor: async () => {}, setTitle: async ({ title }) => { badge.title = title; } },
    tabs: { onRemoved: { addListener() {} }, query: async () => (trackerOpen ? [{ id: 5 }] : []), sendMessage: async () => (trackerOpen ? { accountScope: scope, plan: null, reinforcement: null } : null) } };
  const w = createBridgeWorker(api, { sessionOptions: { fetchImpl: async () => { throw new Error('sin red'); }, supabaseUrl: 'https://example.supabase.co', anonKey: 'anon' } });
  const panel = { id: 'ext', url: 'chrome-extension://ext/panel.html?popup=1' };
  await w.message({ kind: 'status' }, panel);
  const saved = JSON.parse(JSON.stringify(store['bridge-v1']));
  saved.mode = 'auto'; saved.accountScope = scope; saved.coordinationOwner = OWNER;
  store['bridge-v1'] = saved;
  return { w, badge, store };
}

test('worker (5): sin sesion del worker y sin ventanita sale "!"; al haber sesion se quita', async () => {
  const { w, badge, store } = await rig({ withSession: false });
  assert.equal(await w.checkWorkerSessionBadge(), true);
  assert.equal(badge.text, '!');
  store[SESSION_KEY] = { accessToken: 'T', refreshToken: 'R', expiresAt: Date.now() + 3600000, scope: store['bridge-v1'].accountScope, email: 'yo@example.com' };
  assert.equal(await w.checkWorkerSessionBadge(), false);
  assert.equal(badge.text, '');
});

test('worker (5): con la sesion del worker, con la ventanita abierta o en "solo registro" NO sale "!"', async () => {
  assert.equal(await (await rig({ withSession: true })).w.checkWorkerSessionBadge(), false);
  const open = await rig({ withSession: false, trackerOpen: true });
  assert.equal(await open.w.checkWorkerSessionBadge(), false);
  assert.equal(open.badge.text, '');
  const passive = await rig({ withSession: false, passive: true });
  assert.equal(await passive.w.checkWorkerSessionBadge(), false);
});
