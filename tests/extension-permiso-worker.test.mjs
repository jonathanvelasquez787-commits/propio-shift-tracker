import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkerSession, scopeForUser, SESSION_KEY } from '../extension/propio-bridge/worker-session.js';
import { createWorkerLease, LEASE_KEY } from '../extension/propio-bridge/worker-lease.js';
import { createBridgeWorker } from '../extension/propio-bridge/bridge-worker.js';
import { extensionWorkerLeaseModel } from '../js/extension-box.js';
import { readFileSync } from 'node:fs';

const URL0 = 'https://example.supabase.co', OWNER = '11111111-2222-4333-8444-555555555555';
const T0 = Date.parse('2026-11-23T15:00:00Z');
const scope = await scopeForUser('user-1');
const iso = ms => new Date(ms).toISOString();

function rig({ session = true, answers = [] } = {}) {
  let clock = T0;
  const store = session ? { [SESSION_KEY]: { accessToken: 'TOK', refreshToken: 'R', expiresAt: T0 + 3600000, scope, email: 'yo@example.com' } } : {};
  const api = { runtime: { id: 'ext', getURL: n => `chrome-extension://ext/${n}`, onMessage: { addListener() {} } },
    storage: { local: { get: async key => ({ [key]: structuredClone(store[key]) }), set: async patch => { Object.assign(store, structuredClone(patch)); }, remove: async key => { delete store[key]; } } },
    alarms: { create() {}, onAlarm: { addListener() {} } }, webNavigation: { onCommitted: { addListener() {} } },
    webRequest: { onBeforeRequest: { addListener() {} }, onCompleted: { addListener() {} }, onErrorOccurred: { addListener() {} } },
    tabs: { onRemoved: { addListener() {} }, query: async () => [], sendMessage: async () => null } };
  const calls = [], queue = [...answers];
  const fetchImpl = async (url, init) => { calls.push({ url, init, body: init?.body ? JSON.parse(init.body) : null }); const next = queue.shift(); if (next instanceof Error) throw next; const r = next || { status: 200, json: [{ granted: true, server_now: iso(clock), expires_at: iso(clock + 90000) }] }; return { ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => r.json }; };
  const now = () => clock;
  return { api, store, calls, fetchImpl, now, advance: ms => { clock += ms; } };
}
const granted = { status: 200, json: [{ granted: true, server_now: iso(T0), expires_at: iso(T0 + 90000) }] };
function lease(r) {
  const session = createWorkerSession(r.api, { fetchImpl: r.fetchImpl, now: r.now, supabaseUrl: URL0, anonKey: 'anon', keepAliveMs: 5 });
  return createWorkerLease(r.api, session, { fetchImpl: r.fetchImpl, now: r.now, supabaseUrl: URL0, anonKey: 'anon' });
}

test('permiso del worker: pide el permiso largo con la sesion del worker y el mismo dueño', async () => {
  const r = rig(), l = lease(r);
  assert.deepEqual(await l.renew({ scope, owner: OWNER }), { ok: true, expiresAt: T0 + 80000 });
  assert.equal(r.calls.length, 1);
  assert.equal(r.calls[0].url, `${URL0}/rest/v1/rpc/automation_lease_worker`);
  assert.equal(r.calls[0].init.headers.Authorization, 'Bearer TOK');
  assert.equal(r.calls[0].init.headers.apikey, 'anon');
  assert.deepEqual(r.calls[0].body, { p_owner: OWNER });
  assert.equal((await l.status()).state, 'granted');
  r.advance(81000);
  assert.equal((await l.status()).state, 'lapsed');
});

test('permiso del worker: sin sesion del worker no sale ninguna peticion y queda dicho', async () => {
  const r = rig({ session: false }), l = lease(r);
  assert.deepEqual(await l.renew({ scope, owner: OWNER }), { ok: false, reason: 'no-session' });
  assert.equal(r.calls.length, 0);
  assert.equal((await l.status()).state, 'no-session');
  assert.deepEqual(await l.renew({ scope, owner: null }), { ok: false, reason: 'no-owner' });
});

test('permiso del worker: negado, sin red, error de la nube y respuesta rara se anotan sin romper nada', async () => {
  const r = rig({ answers: [{ status: 200, json: [{ granted: false, server_now: iso(T0), expires_at: null }] }, new Error('sin internet'), { status: 404, json: { message: 'function not found' } }, { status: 200, json: [{ granted: true, server_now: iso(T0), expires_at: iso(T0 + 5000) }] }] }), l = lease(r);
  const seen = [];
  for (let i = 0; i < 4; i++) { await l.renew({ scope, owner: OWNER }); seen.push((await l.status()).state); }
  assert.deepEqual(seen, ['denied', 'network', 'error', 'bad-answer']);
  assert.match((await (async () => { const rr = rig({ answers: [{ status: 404, json: { message: 'function not found' } }] }); const ll = lease(rr); await ll.renew({ scope, owner: OWNER }); return ll.status(); })()).detail, /404 function not found/);
});

test('permiso del worker: si varias alarmas coinciden sale UNA sola peticion', async () => {
  const r = rig(), l = lease(r);
  await Promise.all([l.renew({ scope, owner: OWNER }), l.renew({ scope, owner: OWNER }), l.renew({ scope, owner: OWNER })]);
  assert.equal(r.calls.length, 1);
});

test('permiso del worker: el worker lo pide solo en modo automatico con cuenta y dueño, y quitar la sesion borra el permiso', async () => {
  const r = rig();
  const w = createBridgeWorker(r.api, { now: r.now, randomId: () => 'x', sessionOptions: { fetchImpl: r.fetchImpl, supabaseUrl: URL0, anonKey: 'anon', keepAliveMs: 5 } });
  const panel = { id: 'ext', frameId: 0, url: 'chrome-extension://ext/panel.html?popup=1' };
  await w.message({ kind: 'status' }, panel);
  const patch = fn => { const s = structuredClone(r.store['bridge-v1']); fn(s); r.store['bridge-v1'] = s; };
  assert.deepEqual(await w.renewWorkerLease(), { ok: false, reason: 'no-account' });
  patch(s => { s.accountScope = scope; });
  assert.deepEqual(await w.renewWorkerLease(), { ok: false, reason: 'off' });
  patch(s => { s.mode = 'auto'; });
  assert.deepEqual(await w.renewWorkerLease(), { ok: false, reason: 'no-owner' });
  patch(s => { s.coordinationOwner = OWNER; s.preparation.devicePassive = true; });
  assert.equal((await w.renewWorkerLease()).reason, 'off');
  patch(s => { s.preparation.devicePassive = false; });
  assert.equal(r.calls.length, 0);
  assert.equal((await w.renewWorkerLease()).ok, true);
  assert.equal(r.calls.length, 1);
  assert.equal((await w.message({ kind: 'status' }, panel)).workerLease.state, 'granted');
  await w.message({ kind: 'worker-session-signout' }, panel);
  assert.equal(r.store[LEASE_KEY], undefined);
  assert.equal((await w.message({ kind: 'status' }, panel)).workerLease.state, 'none');
});

test('permiso del worker: el cuadro dice en palabras simples que pasa', () => {
  const m = (workerSession, workerLease) => extensionWorkerLeaseModel({ workerSession, workerLease });
  assert.match(m({ state: 'none' }, { state: 'none' }), /no se pide hasta que conectes la sesión del worker/);
  assert.equal(m({ state: 'ok' }, { state: 'granted', asks: 4 }), 'Permiso del worker: concedido · pedidos: 4');
  assert.match(m({ state: 'ok' }, { state: 'denied' }), /negado/);
  assert.match(m({ state: 'ok' }, { state: 'error', detail: '404 no existe', asks: 1 }), /error \(404 no existe\)/);
  assert.match(m({ state: 'ok' }, { state: 'off' }), /no se pide ahora/);
  assert.match(extensionWorkerLeaseModel(null), /no se pide hasta/);
});

test('permiso del worker: la migracion deja la funcion de la app intacta y nunca acorta el permiso', () => {
  const sql = readFileSync(new URL('../supabase/migrations/20261123180000_automation_lease_worker.sql', import.meta.url), 'utf8');
  assert.match(sql, /automation_lease_worker\(p_owner uuid\)/);
  assert.match(sql, /interval '90 seconds'/);
  assert.match(sql, /greatest\(lease\.expires_at, excluded\.expires_at\)/);
  assert.doesNotMatch(sql, /create or replace|drop function|create function public\.automation_lease\(/);
  assert.match(sql, /revoke all on function public\.automation_lease_worker\(uuid\) from public, anon/);
});

// Caida corta (Parte 6): una renovacion fallida NO tira un permiso que todavia esta vigente.
test('permiso del worker (caida corta): sin red o con error al renovar se conserva el permiso vigente hasta su vencimiento', async () => {
  const r = rig({ answers: [granted, new Error('sin internet'), { status: 503, json: { message: 'down' } }, new Error('otra vez')] });
  const l = lease(r);
  await l.renew({ scope, owner: OWNER });
  const first = await l.status();
  assert.equal(first.state, 'granted');
  r.advance(30000);
  assert.deepEqual(await l.renew({ scope, owner: OWNER }), { ok: false, reason: 'network' });
  const s1 = await l.status();
  assert.deepEqual([s1.state, s1.failing, s1.expiresAt], ['granted', 'network', first.expiresAt]);
  r.advance(30000);
  await l.renew({ scope, owner: OWNER });
  assert.deepEqual([(await l.status()).state, (await l.status()).failing], ['granted', 'error']);
  r.advance(30000); // ya paso la hora de vencimiento (~80 s): el permiso ya no vale y la falla se anota como siempre
  await l.renew({ scope, owner: OWNER });
  const s3 = await l.status();
  assert.deepEqual([s3.state, s3.failing], ['network', undefined]);
});

test('permiso del worker (caida corta): al volver la red se renueva y se limpia el aviso; si lo niegan o es otro dueño NO se conserva', async () => {
  const r = rig({ answers: [granted, new Error('x'), granted] });
  const l = lease(r);
  await l.renew({ scope, owner: OWNER }); r.advance(20000); await l.renew({ scope, owner: OWNER });
  assert.equal((await l.status()).failing, 'network');
  r.advance(20000); await l.renew({ scope, owner: OWNER });
  assert.equal((await l.status()).failing, undefined);
  const d = rig({ answers: [granted, { status: 200, json: [{ granted: false, server_now: iso(T0), expires_at: null }] }] });
  const ld = lease(d); await ld.renew({ scope, owner: OWNER }); await ld.renew({ scope, owner: OWNER });
  assert.equal((await ld.status()).state, 'denied');
  const o = rig({ answers: [granted, new Error('x')] });
  const lo = lease(o); await lo.renew({ scope, owner: OWNER }); await lo.renew({ scope, owner: 'otro-dueno' });
  assert.equal((await lo.status()).state, 'network');
});

test('permiso del worker (caida corta): el cuadro lo explica', () => {
  const m = wl => extensionWorkerLeaseModel({ workerSession: { state: 'ok' }, workerLease: wl });
  assert.equal(m({ state: 'granted', failing: 'network' }), 'Permiso del worker: concedido (no hubo red en el último intento; se reintenta solo) · pedidos: 0');
  assert.match(m({ state: 'lapsed', failing: 'error' }), /se venció \(la nube dio error en el último intento\)/);
});
