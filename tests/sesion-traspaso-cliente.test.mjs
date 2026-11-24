import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  findOtherSessions, requestTakeover, ackTakeover, waitForTakeoverAck, createTakeoverWatcher,
  LATE_SECONDS, TAKEOVER_POLL_MS, WAIT_LIMIT_MS,
} from '../js/session-handoff.js';

const flush = () => new Promise((resolve) => setImmediate(resolve));
function client(handler) {
  const calls = [];
  return { calls, rpc: (name, args) => { calls.push({ name, args }); return Promise.resolve(handler(name, args, calls.length)); } };
}
const row = (over = {}) => ({ by_device_id: 'dev_otro', by_label: 'Windows', by_kind: 'web', age_seconds: 1, acked: false, ...over });

test('buscar otras sesiones: manda mi navegador y tipo y devuelve las demas ya convertidas', async () => {
  const c = client(() => ({ data: [{ instance: 'x1', device_id: 'dev_web', label: 'Windows', kind: 'web', age_seconds: 12 }], error: null }));
  const result = await findOtherSessions({ getClient: () => c, deviceId: 'dev_ext', kind: 'extension' });
  assert.deepEqual(c.calls[0], { name: 'session_others', args: { p_instance: null, p_device_id: 'dev_ext', p_kind: 'extension' } });
  assert.deepEqual(result, { ok: true, others: [{ instance: 'x1', deviceId: 'dev_web', label: 'Windows', kind: 'web', ageSeconds: 12 }] });
});

test('buscar otras sesiones nunca lanza error: nube con error, caida o muy lenta dicen "no se pudo"', async () => {
  const failing = client(() => ({ data: null, error: { code: 'PGRST202' } }));
  assert.deepEqual(await findOtherSessions({ getClient: () => failing, deviceId: 'd', kind: 'web' }), { ok: false, others: [] });
  const throwing = { rpc: () => { throw new Error('sin red'); } };
  assert.deepEqual(await findOtherSessions({ getClient: () => throwing, deviceId: 'd', kind: 'web' }), { ok: false, others: [] });
  const slow = { rpc: () => new Promise(() => {}) };
  assert.deepEqual(await findOtherSessions({ getClient: () => slow, deviceId: 'd', kind: 'web', timeoutMs: 5 }), { ok: false, others: [] });
});

test('pedir y confirmar el traspaso llaman a la nube y dicen si salio bien', async () => {
  const c = client(() => ({ data: null, error: null }));
  assert.equal(await requestTakeover({ getClient: () => c, deviceId: 'dev_a', label: 'Windows', kind: 'web' }), true);
  assert.deepEqual(c.calls[0], { name: 'session_takeover_request', args: { p_device_id: 'dev_a', p_label: 'Windows', p_kind: 'web' } });
  assert.equal(await ackTakeover({ getClient: () => c }), true);
  assert.equal(c.calls[1].name, 'session_takeover_ack');
  const bad = client(() => ({ data: null, error: { message: 'x' } }));
  assert.equal(await requestTakeover({ getClient: () => bad, deviceId: 'a', label: 'l', kind: 'web' }), false);
  assert.equal(await ackTakeover({ getClient: () => { throw new Error('x'); } }), false);
});

test('la sesion nueva espera la confirmacion de SU peticion y, si no llega, abre al terminar el limite', async () => {
  let clock = 0;
  const sleeps = [];
  const sleep = (ms) => { sleeps.push(ms); clock += ms; return Promise.resolve(); };
  const answers = [[], [row({ by_device_id: 'dev_a', by_kind: 'web', acked: false })], [row({ by_device_id: 'dev_b', by_kind: 'extension', acked: true })], [row({ by_device_id: 'dev_a', by_kind: 'web', acked: true })]];
  const c = client(() => ({ data: answers.shift() ?? [], error: null }));
  const result = await waitForTakeoverAck({ getClient: () => c, deviceId: 'dev_a', kind: 'web', sleep, now: () => clock });
  assert.equal(result, 'acked');
  assert.equal(c.calls.length, 4);
  assert.deepEqual(sleeps, [2000, 2000, 2000]);
  clock = 0;
  const never = client(() => ({ data: [], error: null }));
  assert.equal(await waitForTakeoverAck({ getClient: () => never, deviceId: 'dev_a', kind: 'web', sleep, now: () => clock }), 'timeout');
  assert.ok(clock <= WAIT_LIMIT_MS);
});

function watcherRig({ rows, startedAt = 1000, now = 1000, deviceId = 'dev_viejo', kind = 'extension' }) {
  const timers = new Map(); let nextTimer = 0; const events = [];
  const c = client(() => ({ data: rows.shift() ?? [], error: null }));
  const watcher = createTakeoverWatcher({
    getClient: () => c, deviceId, kind, startedAt, onTakeover: (info) => events.push(info),
    setTimer: (fn, ms) => { timers.set(++nextTimer, { fn, ms }); return nextTimer; },
    clearTimer: (timerId) => timers.delete(timerId), now: () => now,
  });
  const fire = async () => { const [timerId, t] = [...timers][0]; timers.delete(timerId); t.fn(); await flush(); };
  return { watcher, events, timers, fire, c, setNow: (v) => { now = v; } };
}

test('la sesion vieja mira cada 5 segundos y avisa UNA vez cuando otra pide el traspaso', async () => {
  const r = watcherRig({ rows: [[], [row({ age_seconds: 3 })]], startedAt: 0, now: 600000 });
  r.watcher.start();
  assert.equal([...r.timers.values()][0].ms, TAKEOVER_POLL_MS);
  await r.fire();
  assert.equal(r.events.length, 0);
  await r.fire();
  assert.deepEqual(r.events, [{ byLabel: 'Windows', byKind: 'web', ageSeconds: 3, late: false }]);
  assert.equal(r.timers.size, 0);
  assert.equal(r.watcher.isRunning(), false);
});

test('la sesion vieja ignora su propia peticion y las peticiones hechas antes de abrirse', async () => {
  const mine = watcherRig({ rows: [[row({ by_device_id: 'dev_viejo', by_kind: 'extension', age_seconds: 1 })]], startedAt: 0, now: 600000 });
  mine.watcher.start(); await mine.fire();
  assert.equal(mine.events.length, 0);
  assert.equal(mine.timers.size, 1);
  // La pagina se abrio hace 10 s y la peticion es de hace 100 s: es de antes, no es para ella.
  const before = watcherRig({ rows: [[row({ age_seconds: 100 })]], startedAt: 590000, now: 600000 });
  before.watcher.start(); await before.fire();
  assert.equal(before.events.length, 0);
});

test('una pagina que estuvo dormida y se entera tarde lo dice (late) para no subir nada viejo', async () => {
  const r = watcherRig({ rows: [[row({ age_seconds: LATE_SECONDS + 5 })]], startedAt: 0, now: 3600000 });
  r.watcher.start(); await r.fire();
  assert.equal(r.events[0].late, true);
});

test('si la nube falla el vigilante sigue intentando y parar lo detiene', async () => {
  const r = watcherRig({ rows: [], startedAt: 0, now: 600000 });
  r.c.rpc = () => Promise.reject(new Error('sin red'));
  r.watcher.start(); await r.fire();
  assert.equal(r.timers.size, 1);
  r.watcher.stop();
  assert.equal(r.timers.size, 0);
});

test('el modulo no cierra sesion ni guarda nada en el navegador, y el worker no lo usa', () => {
  const text = fs.readFileSync(new URL('../js/session-handoff.js', import.meta.url), 'utf8');
  assert.doesNotMatch(text, /signOut|localStorage|sessionStorage|chrome\.storage/);
  for (const file of ['bridge-worker.js', 'worker-session.js', 'worker-lease.js', 'worker-data.js', 'worker-plan.js']) {
    assert.doesNotMatch(fs.readFileSync(new URL(`../extension/propio-bridge/${file}`, import.meta.url), 'utf8'), /session-handoff|session_takeover|session_others/);
  }
});
