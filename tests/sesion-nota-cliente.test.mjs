import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createSessionNote, HEARTBEAT_MS, RETRY_MS } from '../js/session-note.js';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

function rig({ responses = [] } = {}) {
  const calls = [], timers = new Map(), pending = [];
  let nextTimer = 0, nowMs = 1000;
  const client = { rpc: (name, args) => { calls.push({ name, args }); const r = responses.shift(); return Promise.resolve(typeof r === 'function' ? r() : r ?? { data: [], error: null }); } };
  const note = createSessionNote({
    getClient: () => client, kind: 'web', getDeviceId: () => 'dev_a', getLabel: () => 'Windows',
    randomId: () => 'instance-1',
    setTimer: (fn, ms) => { timers.set(++nextTimer, { fn, ms }); return nextTimer; },
    clearTimer: (timerId) => timers.delete(timerId),
    now: () => nowMs,
  });
  const flush = () => new Promise((resolve) => setImmediate(resolve));
  const fire = async () => { const [timerId, t] = [...timers][0]; timers.delete(timerId); t.fn(); await flush(); };
  return { note, calls, timers, fire, flush, setNow: (v) => { nowMs = v; } };
}

test('la nota avisa al arrancar y se renueva cada pocos segundos', async () => {
  const r = rig();
  r.note.start();
  await r.flush();
  assert.equal(r.calls.length, 1);
  assert.deepEqual(r.calls[0], { name: 'session_heartbeat', args: { p_instance: 'instance-1', p_device_id: 'dev_a', p_label: 'Windows', p_kind: 'web' } });
  assert.equal([...r.timers.values()][0].ms, HEARTBEAT_MS);
  await r.fire();
  assert.equal(r.calls.length, 2);
});

test('guarda las OTRAS sesiones y se deja a si misma fuera', async () => {
  const r = rig({ responses: [{ data: [
    { instance: 'instance-1', device_id: 'dev_a', label: 'Windows', kind: 'web', age_seconds: 0, is_self: true },
    { instance: 'x2', device_id: 'dev_ext', label: 'Windows', kind: 'extension', age_seconds: 7, is_self: false },
  ], error: null }] });
  r.note.start();
  await r.flush();
  assert.deepEqual(r.note.getOthers(), [{ instance: 'x2', deviceId: 'dev_ext', label: 'Windows', kind: 'extension', ageSeconds: 7 }]);
  assert.equal(r.note.getLastOkAt(), 1000);
});

test('si la nube falla o la funcion aun no existe, no pasa nada visible y reintenta mas despacio', async () => {
  const r = rig({ responses: [{ data: null, error: { code: 'PGRST202', message: 'no function' } }, () => { throw new Error('sin red'); }, { data: [], error: null }] });
  r.note.start();
  await r.flush();
  assert.equal([...r.timers.values()][0].ms, RETRY_MS);
  await r.fire();
  assert.equal([...r.timers.values()][0].ms, RETRY_MS);
  await r.fire();
  assert.equal([...r.timers.values()][0].ms, HEARTBEAT_MS);
  assert.equal(r.note.isRunning(), true);
});

test('al parar borra su nota, no renueva mas y olvida a las otras', async () => {
  const r = rig();
  r.note.start();
  await r.flush();
  r.note.stop();
  await r.flush();
  assert.deepEqual(r.calls.at(-1), { name: 'session_leave', args: { p_instance: 'instance-1' } });
  assert.equal(r.timers.size, 0);
  assert.equal(r.note.isRunning(), false);
  assert.deepEqual(r.note.getOthers(), []);
});

test('una respuesta que llega despues de parar se ignora', async () => {
  let release;
  const r = rig({ responses: [() => new Promise((resolve) => { release = resolve; })] });
  r.note.start();
  r.note.stop();
  release({ data: [{ instance: 'x2', device_id: 'd', label: 'l', kind: 'web', age_seconds: 1, is_self: false }], error: null });
  await r.flush();
  assert.deepEqual(r.note.getOthers(), []);
  assert.equal(r.timers.size, 0);
});

test('la nota NUNCA cierra sesion, no escribe en el almacenamiento y el worker no la usa', () => {
  const src = read('js/session-note.js');
  assert.doesNotMatch(src, /signOut|auth\.signOut|\.auth\b/);
  assert.doesNotMatch(src, /localStorage|sessionStorage|setItem|chrome\.storage/);
  for (const file of ['bridge-worker.js', 'worker-session.js', 'worker-lease.js', 'worker-data.js', 'worker-plan.js', 'worker.js', 'acw-pill.js']) {
    assert.doesNotMatch(read(`extension/propio-bridge/${file}`), /session-note|session_heartbeat|session_leave/, file);
  }
  assert.doesNotMatch(read('js/sync.js'), /session-note|session_heartbeat/);
});

test('boot.js arranca la nota solo despues de montar la app, con el cliente y el id del dispositivo', () => {
  const boot = read('js/boot.js');
  assert.match(boot, /import \{ startSessionNote \} from '\.\/session-note\.js';/);
  const mountAt = boot.indexOf('if (!mounted || bridgeUserId !== userId) return;');
  const noteAt = boot.indexOf('startSessionNote({ getClient: getSupabase, getDeviceId: deviceId, getLabel: deviceLabel });');
  assert.ok(mountAt > 0 && noteAt > mountAt);
  assert.equal(boot.split('startSessionNote(').length - 1, 1);
});

test('la migracion deja la tabla cerrada y las funciones solo para cuentas iniciadas', () => {
  const sql = read('supabase/migrations/20261124200000_session_note.sql');
  assert.match(sql, /revoke all on private\.app_sessions from public, anon, authenticated/);
  assert.match(sql, /revoke all on function public\.session_heartbeat\(uuid, text, text, text\) from public, anon/);
  assert.match(sql, /revoke all on function public\.session_leave\(uuid\) from public, anon/);
  assert.doesNotMatch(sql, /user_data|public\.calls|automation_availability_leases|signOut/);
});
