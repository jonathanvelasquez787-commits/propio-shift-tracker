import test from 'node:test';
import assert from 'node:assert/strict';
import { scopeForUser, SESSION_KEY } from '../extension/propio-bridge/worker-session.js';
import { createWorkerSession } from '../extension/propio-bridge/worker-session.js';
import { createWorkerData, userIdFromToken, projectCall, DATA_KEY, CALLS_WINDOW_MS } from '../extension/propio-bridge/worker-data.js';
import { createBridgeWorker } from '../extension/propio-bridge/bridge-worker.js';
import { extensionWorkerDataModel } from '../js/extension-box.js';
import { buildWorkerPlan, DATA_STALE_MS } from '../extension/propio-bridge/worker-plan.js';

const URL0 = 'https://example.supabase.co', USER = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const T0 = Date.parse('2026-11-23T15:00:00Z');
const b64 = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');
const TOKEN = `${b64({ alg: 'HS256' })}.${b64({ sub: USER })}.firma`;
const scope = await scopeForUser(USER);

function rig({ session = true, token = TOKEN, handler } = {}) {
  let clock = T0;
  const store = session ? { [SESSION_KEY]: { accessToken: token, refreshToken: 'R', expiresAt: T0 + 3600000, scope, email: 'yo@example.com' } } : {};
  const api = { runtime: { id: 'ext', getURL: n => `chrome-extension://ext/${n}`, onMessage: { addListener() {} } },
    storage: { local: { get: async key => ({ [key]: structuredClone(store[key]) }), set: async patch => { Object.assign(store, structuredClone(patch)); }, remove: async key => { delete store[key]; } } },
    alarms: { create() {}, onAlarm: { addListener() {} } }, webNavigation: { onCommitted: { addListener() {} } },
    webRequest: { onBeforeRequest: { addListener() {} }, onCompleted: { addListener() {} }, onErrorOccurred: { addListener() {} } },
    tabs: { onRemoved: { addListener() {} }, query: async () => [], sendMessage: async () => null } };
  const calls = [];
  const fetchImpl = async (url, init) => { calls.push({ url, init }); const r = await handler(url, init, calls.length); if (r instanceof Error) throw r; return { ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => r.json }; };
  const now = () => clock;
  const session2 = createWorkerSession(api, { fetchImpl, now, supabaseUrl: URL0, anonKey: 'anon', keepAliveMs: 5 });
  const data = createWorkerData(api, session2, { fetchImpl, now, supabaseUrl: URL0, anonKey: 'anon' });
  return { api, store, calls, fetchImpl, now, data, advance: ms => { clock += ms; } };
}
const UPDATED = '2026-11-23T14:59:00+00:00';
const callRow = (id, startISO, extra = {}) => ({ call_id: String(id), payload: { id, startISO, endISO: startISO, records: { propio: { endISO: startISO } }, secreto: 'x', ...extra } });
const cloud = ({ updated = UPDATED, state = { shiftStartedAt: 'x' }, settings = { goal: 360 }, rows = [callRow(1, '2026-11-23T13:00:00.000Z')] } = {}) => (url) => {
  if (url.includes('select=updated_at')) return { status: 200, json: [{ updated_at: typeof updated === 'function' ? updated() : updated }] };
  if (url.includes('/user_data?select=state')) return { status: 200, json: [{ state, settings, updated_at: typeof updated === 'function' ? updated() : updated, schema_version: 2 }] };
  if (url.includes('/calls?')) return { status: 200, json: rows };
  return { status: 404, json: {} };
};

test('datos del worker: el id de usuario sale del token y la llamada se reduce a lo que mira el plan', () => {
  assert.equal(userIdFromToken(TOKEN), USER);
  assert.equal(userIdFromToken('basura'), null);
  assert.deepEqual(projectCall(callRow(7, 'a').payload), { id: 7, startISO: 'a', endISO: 'a', propioEndISO: 'a' });
});

test('datos del worker: baja ajustes, estado y llamadas recientes con la sesion del worker y guarda una copia chica', async () => {
  const r = rig({ handler: cloud() });
  assert.deepEqual(await r.data.refresh({ scope }), { ok: true, changed: true });
  const urls = r.calls.map(c => c.url);
  assert.equal(urls.length, 4);
  assert.equal(urls[0], `${URL0}/rest/v1/user_data?select=updated_at&user_id=eq.${USER}`);
  assert.equal(urls[1], `${URL0}/rest/v1/user_data?select=state,settings,updated_at,schema_version&user_id=eq.${USER}`);
  const since = new Date(T0 - CALLS_WINDOW_MS).toISOString();
  assert.equal(urls[2], `${URL0}/rest/v1/calls?select=call_id,payload&user_id=eq.${USER}&payload->>startISO=gte.${encodeURIComponent(since)}&order=call_id`);
  assert.equal(r.calls[2].init.headers.Authorization, `Bearer ${TOKEN}`);
  assert.equal(r.calls[2].init.headers.apikey, 'anon');
  assert.equal(r.calls[2].init.headers.Range, '0-999');
  const saved = r.store[DATA_KEY];
  assert.equal(saved.result, 'ok'); assert.equal(saved.updatedAt, UPDATED);
  assert.deepEqual(saved.settings, { goal: 360 }); assert.deepEqual(saved.state, { shiftStartedAt: 'x' });
  assert.deepEqual(saved.calls, [{ id: 1, startISO: '2026-11-23T13:00:00.000Z', endISO: '2026-11-23T13:00:00.000Z', propioEndISO: '2026-11-23T13:00:00.000Z' }]);
  assert.equal(JSON.stringify(saved).includes('secreto'), false);
  assert.deepEqual(await r.data.status(), { state: 'ok', updatedAt: UPDATED, fetchedAt: T0, checkedAt: T0, calls: 1 });
  assert.equal((await r.data.snapshot()).settings.goal, 360);
});

test('datos del worker: si la nube no cambio solo hace UNA consulta barata y anota la hora', async () => {
  const r = rig({ handler: cloud() });
  await r.data.refresh({ scope });
  r.calls.length = 0; r.advance(30000);
  assert.deepEqual(await r.data.refresh({ scope }), { ok: true, changed: false });
  assert.equal(r.calls.length, 1);
  assert.equal(r.store[DATA_KEY].checkedAt, T0 + 30000);
  assert.equal(r.store[DATA_KEY].calls.length, 1);
});

test('datos del worker: si la nube cambia mientras se lee, no guarda a medias y lo dice', async () => {
  let n = 0;
  const r = rig({ handler: cloud({ updated: () => (++n >= 3 ? '2026-11-23T15:00:01+00:00' : UPDATED) }) });
  assert.deepEqual(await r.data.refresh({ scope }), { ok: false, reason: 'changed' });
  assert.equal(r.store[DATA_KEY].result, 'changed');
  assert.equal(r.store[DATA_KEY].state, undefined);
});

test('datos del worker: sin sesion o con token raro no sale ninguna peticion; red y errores se anotan', async () => {
  const none = rig({ session: false, handler: cloud() });
  assert.deepEqual(await none.data.refresh({ scope }), { ok: false, reason: 'no-session' });
  assert.equal(none.calls.length, 0);
  const bad = rig({ token: 'sin-jwt', handler: cloud() });
  assert.deepEqual(await bad.data.refresh({ scope }), { ok: false, reason: 'bad-token' });
  assert.equal(bad.calls.length, 0);
  assert.deepEqual(await rig({ handler: cloud() }).data.refresh({}), { ok: false, reason: 'no-account' });
  const net = rig({ handler: () => new Error('sin internet') });
  assert.deepEqual(await net.data.refresh({ scope }), { ok: false, reason: 'network' });
  assert.equal((await net.data.status()).state, 'network');
  const err = rig({ handler: () => ({ status: 401, json: { message: 'JWT expired' } }) });
  await err.data.refresh({ scope });
  assert.deepEqual([(await err.data.status()).state, (await err.data.status()).detail], ['error', '401 JWT expired']);
});

test('datos del worker: si falla solo la tabla de llamadas, igual guarda ajustes y estado y lo dice', async () => {
  const base = cloud();
  const r = rig({ handler: (url, ...rest) => url.includes('/calls?') ? { status: 404, json: { message: 'relation missing' } } : base(url, ...rest) });
  assert.equal((await r.data.refresh({ scope })).ok, true);
  assert.equal(r.store[DATA_KEY].result, 'ok');
  assert.match(r.store[DATA_KEY].detail, /404 relation missing/);
  assert.deepEqual(r.store[DATA_KEY].calls, []);
});

test('datos del worker: una copia demasiado grande no se guarda y no rompe nada', async () => {
  const r = rig({ handler: cloud({ state: { enorme: 'x'.repeat(2.5 * 1024 * 1024) } }) });
  assert.deepEqual(await r.data.refresh({ scope }), { ok: false, reason: 'too-big' });
  assert.equal(r.store[DATA_KEY].result, 'too-big');
  assert.equal(r.store[DATA_KEY].state, undefined);
});

test('datos del worker: varias alarmas a la vez hacen UNA sola lectura', async () => {
  const r = rig({ handler: cloud() });
  await Promise.all([r.data.refresh({ scope }), r.data.refresh({ scope }), r.data.refresh({ scope })]);
  assert.equal(r.calls.length, 4);
});

test('datos del worker: el worker lee solo en modo automatico con cuenta; quitar la sesion borra la copia; sale en status', async () => {
  const r = rig({ handler: cloud() });
  const w = createBridgeWorker(r.api, { now: r.now, randomId: () => 'x', sessionOptions: { fetchImpl: r.fetchImpl, supabaseUrl: URL0, anonKey: 'anon', keepAliveMs: 5 } });
  const panel = { id: 'ext', frameId: 0, url: 'chrome-extension://ext/panel.html?popup=1' };
  await w.message({ kind: 'status' }, panel);
  const patch = fn => { const s = structuredClone(r.store['bridge-v1']); fn(s); r.store['bridge-v1'] = s; };
  assert.deepEqual(await w.refreshWorkerData(), { ok: false, reason: 'no-account' });
  patch(s => { s.accountScope = scope; });
  assert.deepEqual(await w.refreshWorkerData(), { ok: false, reason: 'off' });
  patch(s => { s.mode = 'auto'; s.preparation.devicePassive = true; });
  assert.equal((await w.refreshWorkerData()).reason, 'off');
  patch(s => { s.preparation.devicePassive = false; });
  assert.equal(r.calls.length, 0);
  assert.equal((await w.refreshWorkerData()).ok, true);
  assert.equal((await w.message({ kind: 'status' }, panel)).workerData.state, 'ok');
  assert.equal((await w.workerDataSnapshot()).settings.goal, 360);
  await w.message({ kind: 'worker-session-signout' }, panel);
  assert.equal(r.store[DATA_KEY], undefined);
  assert.equal((await w.message({ kind: 'status' }, panel)).workerData.state, 'none');
});

test('datos del worker: el cuadro dice en palabras simples que pasa', () => {
  const m = (workerSession, workerData) => extensionWorkerDataModel({ workerSession, workerData }, T0 + 5 * 60000);
  assert.match(m({ state: 'none' }, { state: 'none' }), /no se leen hasta que conectes la sesión del worker/);
  assert.equal(m({ state: 'ok' }, { state: 'ok', checkedAt: T0, calls: 3 }), 'Datos del worker: al día, revisados hace 5 min · llamadas recientes: 3');
  assert.match(m({ state: 'ok' }, { state: 'error', detail: '401 JWT expired' }), /error \(401 JWT expired\)/);
  assert.match(m({ state: 'ok' }, { state: 'off' }), /no se leen ahora/);
  assert.match(m({ state: 'ok' }, { state: 'none' }), /todavía sin leer/);
  assert.match(extensionWorkerDataModel(null), /no se leen hasta/);
});

// Caida corta de internet (Parte 6): una revision fallida NO tira la copia buena; solo pasados 5 min el plan deja de usarla.
test('datos del worker (caida corta): si falla una revision y ya habia copia buena, se conserva como ok con la hora de la ultima revision buena', async () => {
  let down = false;
  const ok = cloud({ state: {} });
  const r = rig({ handler: (url, init, n) => down ? new Error('sin internet') : ok(url, init, n) });
  assert.deepEqual(await r.data.refresh({ scope }), { ok: true, changed: true });
  const goodAt = r.now();
  down = true; r.advance(60000);
  assert.deepEqual(await r.data.refresh({ scope }), { ok: false, reason: 'network' });
  const st = await r.data.status();
  assert.equal(st.state, 'ok');
  assert.equal(st.checkedAt, goodAt, 'checkedAt sigue siendo el de la ultima revision buena');
  assert.equal(st.failing, 'network');
  const snap = await r.data.snapshot();
  assert.equal(snap.result, 'ok');
  assert.deepEqual(snap.state, {});
  // un error de la nube (no de red) tambien se conserva, anotando el detalle
  const bad = rig({ handler: (url, init, n) => down ? { status: 503, json: { message: 'down' } } : ok(url, init, n) });
  down = false; await bad.data.refresh({ scope }); down = true; bad.advance(1000);
  await bad.data.refresh({ scope });
  const st2 = await bad.data.status();
  assert.deepEqual([st2.state, st2.failing, st2.failDetail], ['ok', 'error', '503 down']);
});

test('datos del worker (caida corta): al volver la nube se limpia el aviso y se actualiza la hora de revision', async () => {
  let down = false;
  const ok = cloud({ state: {} });
  const r = rig({ handler: (url, init, n) => down ? new Error('x') : ok(url, init, n) });
  await r.data.refresh({ scope });
  down = true; r.advance(30000); await r.data.refresh({ scope });
  assert.equal((await r.data.status()).failing, 'network');
  down = false; r.advance(30000); await r.data.refresh({ scope });
  const st = await r.data.status();
  assert.equal(st.failing, undefined);
  assert.equal(st.checkedAt, r.now());
  assert.equal(st.state, 'ok');
});

test('datos del worker (caida corta): sin copia buena previa (o de otra cuenta) la falla SI se anota como antes', async () => {
  const r = rig({ handler: () => new Error('x') });
  await r.data.refresh({ scope });
  assert.equal((await r.data.status()).state, 'network');
  // copia buena de OTRA cuenta guardada: no se conserva para esta
  const other = rig({ handler: () => new Error('x') });
  other.store[DATA_KEY] = { scope: 'otra-cuenta', userId: 'otro', result: 'ok', updatedAt: UPDATED, checkedAt: T0, state: {}, settings: {}, calls: [] };
  await other.data.refresh({ scope });
  assert.equal((await other.data.status()).state, 'network');
});

test('datos del worker (caida corta): el plan se arma con la copia conservada a los 4 min y deja de armarse pasados 5 min', async () => {
  let down = false;
  const ok = cloud({ state: {} });
  const r = rig({ handler: (url, init, n) => down ? new Error('x') : ok(url, init, n) });
  await r.data.refresh({ scope });
  const goodAt = r.now();
  down = true; r.advance(30000); await r.data.refresh({ scope });
  const snap = await r.data.snapshot();
  const build = at => { test.mock.timers.enable({ apis: ['Date'], now: at }); try { return buildWorkerPlan({ data: snap, owner: USER, leaseExpiresAt: at + 80000, lastEndedAt: null, now: at }).why; } finally { test.mock.timers.reset(); } };
  const early = build(goodAt + 4 * 60000), late = build(goodAt + DATA_STALE_MS + 60000);
  assert.ok(early !== 'stale-data' && early !== 'no-data', 'a los 4 min con la nube caida el plan sigue disponible: ' + early);
  assert.equal(late, 'stale-data');
});

test('datos del worker (caida corta): el cuadro explica que la nube fallo pero la copia sigue valiendo', () => {
  const m = (workerData) => extensionWorkerDataModel({ workerSession: { state: 'ok' }, workerData }, T0 + 2 * 60000);
  assert.equal(m({ state: 'ok', checkedAt: T0, calls: 3, failing: 'network' }), 'Datos del worker: última revisión buena hace 2 min · llamadas recientes: 3; el último intento no tuvo red, se reintenta solo');
  assert.match(m({ state: 'ok', checkedAt: T0, failing: 'error' }), /última revisión buena hace 2 min.*recibió error de la nube/);
});
