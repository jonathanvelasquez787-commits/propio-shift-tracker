import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWorkerPlan, PLAN_LEASE_MS } from '../extension/propio-bridge/worker-plan.js';
import { validateBridgePlan } from '../js/propio-bridge-rules.js';
import { validateAutomationLease } from '../js/automation-lease.js';
import { createBridgeWorker } from '../extension/propio-bridge/bridge-worker.js';
import { SESSION_KEY, scopeForUser } from '../extension/propio-bridge/worker-session.js';
import { DATA_KEY } from '../extension/propio-bridge/worker-data.js';
import { LEASE_KEY } from '../extension/propio-bridge/worker-lease.js';
import { extensionWorkerPlanModel } from '../js/extension-box.js';

// Lunes 16-nov-2026: el horario normal empieza a las 07:00 (hora de la PC de prueba).
const at = (hh, mm = 0, day = 16) => new Date(2026, 10, day, hh, mm, 0, 0);
const OWNER = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const data = (state = {}, settings = {}, calls = []) => ({ result: 'ok', state, settings, calls });
const build = (now, extra = {}) => buildWorkerPlan({ data: data(), owner: OWNER, leaseExpiresAt: now.getTime() + 80000, lastEndedAt: null, now: now.getTime(), ...extra });
const withClock = (now, fn) => { test.mock.timers.enable({ apis: ['Date'], now: now.getTime() }); try { return fn(); } finally { test.mock.timers.reset(); } };

test('plan del worker: sin datos, sin dueño o sin permiso no hay plan y dice por que', () => {
  const now = at(10);
  withClock(now, () => {
    assert.equal(build(now, { data: null }).why, 'no-data');
    assert.equal(build(now, { data: { result: 'network' } }).why, 'no-data');
    assert.equal(build(now, { owner: null }).why, 'no-owner');
    assert.equal(build(now, { leaseExpiresAt: null }).why, 'no-lease');
    assert.equal(build(now, { leaseExpiresAt: now.getTime() + 3000 }).why, 'no-lease');
  });
});

test('plan del worker: con todo cerrado da el turno por iniciado a la hora del horario y el plan pasa la validacion', () => {
  const now = at(10, 0);
  withClock(now, () => {
    const built = build(now);
    assert.equal(built.why, 'ok');
    assert.equal(built.inferredStart, true);
    const valid = validateBridgePlan(built.plan, now.getTime());
    assert.ok(valid, 'el plan pasa validateBridgePlan');
    assert.equal(valid.scheduleVerified, true);
    assert.equal(valid.hasCall, false);
    assert.ok(valid.acw, 'con el turno dado por iniciado ya hay ACW');
    assert.equal(valid.acw.observedAt, now.toISOString());
    assert.equal(valid.automationLease.owner, OWNER);
  });
});

test('plan del worker: el permiso del plan se recorta a 20 s y pasa la comprobacion normal de 25 s', () => {
  const now = at(10, 0);
  withClock(now, () => {
    const lease = build(now).plan.automationLease;
    assert.ok(validateAutomationLease(lease, now.getTime()));
    assert.equal(Date.parse(lease.expiresAt) - now.getTime(), PLAN_LEASE_MS);
    const short = build(now, { leaseExpiresAt: now.getTime() + 9000 }).plan.automationLease;
    assert.equal(Date.parse(short.expiresAt) - now.getTime(), 9000);
  });
});

test('plan del worker: antes del horario, dia libre y turno ya terminado NO dan turno inventado', () => {
  const early = at(5, 30);
  withClock(early, () => { const b = build(early); assert.equal(b.inferredStart, false); assert.equal(b.plan.acw, null); });
  const sunday = at(10, 0, 22);
  withClock(sunday, () => assert.equal(build(sunday).why, 'no-plan'));
  const now = at(15, 0);
  withClock(now, () => {
    const b = buildWorkerPlan({ data: data({ shiftStartedAt: at(7).toISOString(), shiftEndedAt: at(14, 30).toISOString() }), owner: OWNER, leaseExpiresAt: now.getTime() + 80000, now: now.getTime() });
    assert.equal(b.plan.ended, true);
    assert.equal(b.inferredStart, false);
  });
});

test('plan del worker: si el turno ya estaba iniciado en la nube se respeta y no se inventa', () => {
  const now = at(10, 0);
  withClock(now, () => {
    const b = buildWorkerPlan({ data: data({ shiftStartedAt: at(7, 12).toISOString() }), owner: OWNER, leaseExpiresAt: now.getTime() + 80000, now: now.getTime() });
    assert.equal(b.inferredStart, false);
    assert.equal(b.plan.workSession.startedAt, at(7, 12).toISOString());
  });
});

test('plan del worker: freelancer sin turno iniciado no tiene plan', () => {
  const now = at(10, 0);
  withClock(now, () => assert.equal(build(now, { data: data({}, { freelancer: { enabled: true } }) }).why, 'no-plan'));
});

test('plan del worker: lo que el worker vio en el portal manda sobre la nube atrasada (ACW y hasCall)', () => {
  const now = at(10, 3);
  withClock(now, () => {
    const ended = at(10, 1);
    const b = build(now, { lastEndedAt: ended.toISOString() });
    assert.equal(b.plan.acw.startedAt, ended.toISOString());
    assert.equal(b.plan.acw.observedAt, now.toISOString());
    assert.equal(b.plan.hasCall, true);
    assert.equal(b.plan.lastCallEndedAt, ended.toISOString());
    assert.ok(validateBridgePlan(b.plan, now.getTime()));
  });
});

test('plan del worker: las llamadas de la nube (forma reducida) cuentan para el ACW', () => {
  const now = at(10, 5);
  withClock(now, () => {
    const ended = at(10, 2);
    const calls = [{ id: 'c1', startISO: at(9, 50).toISOString(), endISO: null, propioEndISO: ended.toISOString() }];
    const b = buildWorkerPlan({ data: data({ shiftStartedAt: at(7).toISOString() }, {}, calls), owner: OWNER, leaseExpiresAt: now.getTime() + 80000, now: now.getTime() });
    assert.equal(b.plan.hasCall, true);
    assert.equal(b.plan.lastCallEndedAt, ended.toISOString());
  });
});

test('cuadro: la linea del plan del worker explica cada estado', () => {
  assert.match(extensionWorkerPlanModel({ workerPlan: { state: 'ok', inferredStart: true } }), /listo para trabajar con todo cerrado.*a la hora del horario/);
  assert.match(extensionWorkerPlanModel({ workerPlan: { state: 'no-lease' } }), /sin permiso del worker/);
  assert.match(extensionWorkerPlanModel({ workerPlan: { state: 'no-plan' } }), /no hay turno planeado/);
  assert.match(extensionWorkerPlanModel({ workerPlan: { state: 'off' } }), /apagado/);
  assert.match(extensionWorkerPlanModel({}), /todavía sin calcular/);
  assert.match(extensionWorkerPlanModel({ ok: false, workerPlan: { state: 'ok' } }), /todavía sin calcular/);
});

test('worker: con todo cerrado arma el plan solo y prepareFirst lo usa; la ventanita abierta manda sobre el', async () => {
  const USER = OWNER, scope = await scopeForUser(USER);
  const now0 = at(10, 0);
  let clock = now0.getTime();
  const store = {
    [SESSION_KEY]: { accessToken: 'T', refreshToken: 'R', expiresAt: clock + 3600000, scope, email: 'yo@example.com' },
    [DATA_KEY]: { result: 'ok', scope, userId: USER, updatedAt: 'u', checkedAt: clock, state: {}, settings: {}, calls: [] },
    [LEASE_KEY]: { scope, owner: OWNER, asks: 1, lastAt: clock, result: 'granted', grantedAt: clock, expiresAt: clock + 80000 } };
  const api = { runtime: { id: 'ext', getURL: n => `chrome-extension://ext/${n}`, onMessage: { addListener() {} } },
    storage: { local: { get: async key => ({ [key]: structuredClone(store[key]) }), set: async patch => { Object.assign(store, structuredClone(patch)); }, remove: async key => { delete store[key]; } } },
    alarms: { create() {}, onAlarm: { addListener() {} } }, webNavigation: { onCommitted: { addListener() {} } },
    webRequest: { onBeforeRequest: { addListener() {} }, onCompleted: { addListener() {} }, onErrorOccurred: { addListener() {} } },
    tabs: { onRemoved: { addListener() {} }, query: async () => [], sendMessage: async () => null } };
  test.mock.timers.enable({ apis: ['Date'], now: clock });
  try {
    const w = createBridgeWorker(api, { now: () => clock, sessionOptions: { fetchImpl: async () => { throw new Error('sin red'); }, supabaseUrl: 'https://example.supabase.co', anonKey: 'anon' } });
    const panel = { id: 'ext', url: 'chrome-extension://ext/panel.html?popup=1' };
    await w.message({ kind: 'status' }, panel);
    const saved = JSON.parse(JSON.stringify(store['bridge-v1']));
    saved.mode = 'auto'; saved.accountScope = scope; saved.coordinationOwner = OWNER;
    store['bridge-v1'] = saved;
    await w.ensureWorkerPlan(true);
    assert.equal(w.workerPlanStatus().state, 'ok');
    assert.equal(w.workerPlanStatus().inferredStart, true);
    const status = await w.message({ kind: 'status' }, panel);
    assert.equal(status.workerPlan.state, 'ok');
    // Sin ventanita abierta, el siguiente flush toma el plan del worker.
    await w.flush();
    const plan = store['bridge-v1'].preparation.plan;
    assert.ok(plan && plan.automationLease && plan.automationLease.owner === OWNER, 'el plan del worker quedo guardado con su permiso');
    // Pasados los 12 s de vida del plan del worker, ya no se usa.
    clock += 13000; test.mock.timers.setTime(clock);
    await w.flush();
    assert.equal(store['bridge-v1'].preparation.plan, null);
  } finally { test.mock.timers.reset(); }
});
