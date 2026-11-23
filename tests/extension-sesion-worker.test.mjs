import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkerSession, scopeForUser, SESSION_KEY } from '../extension/propio-bridge/worker-session.js';
import { createBridgeWorker } from '../extension/propio-bridge/bridge-worker.js';
import { extensionWorkerSessionModel } from '../js/extension-box.js';
import { TRACKER_ORIGIN } from '../js/propio-bridge-rules.js';

const URL0 = 'https://example.supabase.co', REDIRECT = 'https://abc.chromiumapp.org/';
const NOW = Date.parse('2026-11-23T15:00:00Z');
const userScope = await scopeForUser('user-1');

function rig({ now = () => NOW, flow, answers = [] } = {}) {
  const store = {}, calls = [], gets = [];
  const api = { runtime: { id: 'ext', getURL: name => `chrome-extension://ext/${name}`, onMessage: { addListener() {} } },
    identity: { getRedirectURL: () => REDIRECT, launchWebAuthFlow: async opts => { api.lastFlow = opts; return flow ? flow(opts) : `${REDIRECT}?code=CODE1`; } },
    storage: { local: { get: async key => { gets.push(key); return { [key]: structuredClone(store[key]) }; }, set: async patch => { Object.assign(store, structuredClone(patch)); }, remove: async key => { delete store[key]; } } },
    alarms: { create() {}, onAlarm: { addListener() {} } }, webNavigation: { onCommitted: { addListener() {} } },
    webRequest: { onBeforeRequest: { addListener() {} }, onCompleted: { addListener() {} }, onErrorOccurred: { addListener() {} } },
    tabs: { onRemoved: { addListener() {} }, query: async () => [], sendMessage: async () => null } };
  const queue = [...answers];
  const fetchImpl = async (url, init) => { calls.push({ url, init, body: init?.body ? JSON.parse(init.body) : null }); const next = queue.shift(); if (next instanceof Error) throw next; const r = next || { status: 200, json: {} }; return { ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => r.json }; };
  const session = createWorkerSession(api, { fetchImpl, now, supabaseUrl: URL0, anonKey: 'anon', keepAliveMs: 5 });
  return { api, store, calls, gets, session, fetchImpl };
}
const login = (id = 'user-1', extra = {}) => ({ status: 200, json: { access_token: 'A1', refresh_token: 'R1', expires_in: 3600, user: { id, email: 'yo@example.com' }, ...extra } });

test('sesion del worker: inicia sesion con Google (PKCE), la guarda y dice de quien es', async () => {
  const { api, store, calls, session } = rig({ answers: [login()] });
  assert.deepEqual(await session.signIn(userScope), { ok: true });
  const url = new URL(api.lastFlow.url);
  assert.equal(api.lastFlow.interactive, true);
  assert.equal(url.origin + url.pathname, `${URL0}/auth/v1/authorize`);
  assert.equal(url.searchParams.get('provider'), 'google');
  assert.equal(url.searchParams.get('redirect_to'), REDIRECT);
  assert.equal(url.searchParams.get('code_challenge_method'), 's256');
  const sent = calls[0];
  assert.equal(sent.url, `${URL0}/auth/v1/token?grant_type=pkce`);
  assert.equal(sent.body.auth_code, 'CODE1');
  const digest = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sent.body.code_verifier))).toString('base64url');
  assert.equal(digest, url.searchParams.get('code_challenge'));
  assert.equal(store[SESSION_KEY].refreshToken, 'R1');
  assert.deepEqual(await session.status(userScope), { state: 'ok', email: 'yo@example.com', expiresAt: NOW + 3600000 });
});

test('sesion del worker: otra cuenta de Google no se guarda y se cierra solo esa sesion nueva', async () => {
  const { store, calls, session } = rig({ answers: [login('otro-usuario')] });
  assert.deepEqual(await session.signIn(userScope), { ok: false, reason: 'wrong-account' });
  assert.equal(store[SESSION_KEY], undefined);
  assert.equal(calls[1].url, `${URL0}/auth/v1/logout?scope=local`);
  assert.equal(calls[1].init.headers.Authorization, 'Bearer A1');
});

test('sesion del worker: sin cuenta vinculada, ventana cancelada o sin codigo: razones claras y nada guardado', async () => {
  assert.deepEqual(await rig().session.signIn(null), { ok: false, reason: 'account-needed' });
  const cancelled = rig({ flow: () => { throw new Error('cerrada'); } });
  assert.deepEqual(await cancelled.session.signIn(userScope), { ok: false, reason: 'login-cancelled' });
  const nocode = rig({ flow: () => `${REDIRECT}?error=access_denied` });
  assert.deepEqual(await nocode.session.signIn(userScope), { ok: false, reason: 'login-no-code' });
  const failed = rig({ answers: [{ status: 400, json: { error: 'bad' } }] });
  assert.deepEqual(await failed.session.signIn(userScope), { ok: false, reason: 'login-failed' });
  const offline = rig({ answers: [new Error('sin red')] });
  assert.deepEqual(await offline.session.signIn(userScope), { ok: false, reason: 'login-network' });
  assert.equal(offline.store[SESSION_KEY], undefined);
});

test('sesion del worker: mientras espera a Google mantiene despierto al worker y no deja dos inicios a la vez', async () => {
  const { gets, session } = rig({ flow: () => new Promise(resolve => setTimeout(() => resolve(`${REDIRECT}?code=C`), 40)), answers: [login()] });
  const first = session.signIn(userScope);
  assert.deepEqual(await session.signIn(userScope), { ok: false, reason: 'busy' });
  assert.deepEqual(await first, { ok: true });
  assert.ok(gets.length >= 3, 'el worker toca el almacenamiento mientras espera');
});

test('sesion del worker: token fresco no usa la red; si falta poco renueva UNA vez aunque lo pidan varios y guarda el refresh nuevo', async () => {
  let clock = NOW;
  const { store, calls, session } = rig({ now: () => clock, answers: [login(), { status: 200, json: { access_token: 'A2', refresh_token: 'R2', expires_in: 3600 } }] });
  await session.signIn(userScope);
  assert.equal(await session.token(userScope), 'A1');
  assert.equal(calls.length, 1);
  clock = NOW + 3600000 - 30000;
  const [a, b, c] = await Promise.all([session.token(userScope), session.token(userScope), session.token(userScope)]);
  assert.deepEqual([a, b, c], ['A2', 'A2', 'A2']);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, `${URL0}/auth/v1/token?grant_type=refresh_token`);
  assert.equal(calls[1].body.refresh_token, 'R1');
  assert.equal(store[SESSION_KEY].refreshToken, 'R2');
});

test('sesion del worker: refresh rechazado = vencida; sin red = conserva la sesion; otra cuenta vinculada = no entrega token', async () => {
  let clock = NOW;
  const dead = rig({ now: () => clock, answers: [login(), { status: 400, json: { error: 'invalid_grant' } }] });
  await dead.session.signIn(userScope);
  clock = NOW + 3600000;
  assert.equal(await dead.session.token(userScope), null);
  assert.equal((await dead.session.status(userScope)).state, 'expired');
  assert.equal(await dead.session.token(userScope), null);
  assert.equal(dead.calls.length, 2, 'una sesion vencida no sigue golpeando a la nube');

  let clock2 = NOW;
  const net = rig({ now: () => clock2, answers: [login(), new Error('sin red')] });
  await net.session.signIn(userScope);
  clock2 = NOW + 3600000 - 30000;
  assert.equal(await net.session.token(userScope), 'A1');
  assert.equal((await net.session.status(userScope)).state, 'offline');
  assert.equal(net.store[SESSION_KEY].refreshToken, 'R1');

  assert.equal(await net.session.token('f'.repeat(64)), null);
  assert.equal((await net.session.status('f'.repeat(64))).state, 'wrong-account');
});

test('sesion del worker: quitar la sesion cierra SOLO la suya y no toca el resto del almacenamiento', async () => {
  const { store, calls, session } = rig({ answers: [login()] });
  store['bridge-v1'] = { schema: 1, marca: 'intacta' };
  await session.signIn(userScope);
  assert.deepEqual(await session.signOut(), { ok: true });
  assert.equal(store[SESSION_KEY], undefined);
  assert.deepEqual(store['bridge-v1'], { schema: 1, marca: 'intacta' });
  assert.equal(calls.at(-1).url, `${URL0}/auth/v1/logout?scope=local`);
  assert.equal((await session.status(userScope)).state, 'none');
});

test('sesion del worker: solo la ventanita/panel de la extension puede conectarla o quitarla; el estado sale en status', async () => {
  const { api, answers } = rig();
  const queue = [login()];
  const w = createBridgeWorker(api, { now: () => NOW, randomId: () => 'x', sessionOptions: { fetchImpl: async () => { const r = queue.shift() || { status: 200, json: {} }; return { ok: r.status < 300, status: r.status, json: async () => r.json }; }, supabaseUrl: URL0, anonKey: 'anon', keepAliveMs: 5 } });
  const panel = { id: 'ext', frameId: 0, url: 'chrome-extension://ext/panel.html?popup=1' };
  const web = { id: 'ext', frameId: 0, url: TRACKER_ORIGIN + '/', tab: { id: 10 } };
  assert.equal(await w.message({ kind: 'worker-session-signin' }, web), null);
  assert.equal(await w.message({ kind: 'worker-session-signout' }, web), null);
  assert.deepEqual(await w.message({ kind: 'worker-session-signin' }, panel), { ok: false, reason: 'account-needed' });
  assert.deepEqual((await w.message({ kind: 'status' }, panel)).workerSession, { state: 'none' });
});

test('sesion del worker: el cuadro escribe el estado y muestra el boton que corresponde', () => {
  const m = state => extensionWorkerSessionModel(state);
  assert.deepEqual(m(null), { text: 'Sesión propia del worker: primero conectá la extensión con tu cuenta.', canConnect: false, canRemove: false });
  assert.equal(m({ paired: true, workerSession: { state: 'none' } }).canConnect, true);
  const ok = m({ paired: true, workerSession: { state: 'ok', email: 'yo@example.com' } });
  assert.equal(ok.text, 'Sesión propia del worker: conectada (yo@example.com).');
  assert.deepEqual([ok.canConnect, ok.canRemove], [false, true]);
  assert.match(m({ paired: true, workerSession: { state: 'expired' } }).text, /se venció/);
  const wrong = m({ paired: true, workerSession: { state: 'wrong-account', email: 'otro@example.com' } });
  assert.match(wrong.text, /otra cuenta/);
  assert.deepEqual([wrong.canConnect, wrong.canRemove], [true, true]);
  assert.equal(m({ ok: false }).canRemove, false);
});
