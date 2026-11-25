import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createTakeoverNudge, createTakeoverWatcher, NUDGE_EVENT } from '../js/session-handoff.js';

const flush = () => new Promise((resolve) => setImmediate(resolve));
function fakeRealtime({ setAuthFails = false, subscribeFails = false } = {}) {
  const log = [];
  const handlers = [];
  const channel = {
    on(type, filter, cb) { log.push(['on', type, filter.event]); handlers.push({ type, event: filter.event, cb }); return channel; },
    subscribe(cb) { log.push(['subscribe']); if (subscribeFails) throw new Error('sin red'); cb?.('SUBSCRIBED'); return channel; },
  };
  const client = {
    log,
    realtime: { setAuth: async () => { log.push(['setAuth']); if (setAuthFails) throw new Error('sin token'); } },
    channel(name, options) { log.push(['channel', name, options]); return channel; },
    removeChannel: async (ch) => { log.push(['remove', ch === channel]); },
    send: (event) => handlers.filter((h) => h.event === event).forEach((h) => h.cb({ event })),
  };
  return client;
}

test('aviso por la red: pone la autorizacion y se suscribe al canal PRIVADO de la cuenta', async () => {
  const client = fakeRealtime();
  const nudge = createTakeoverNudge({ getClient: () => client, userId: 'user-1', onNudge: () => {} });
  nudge.start();
  await flush();
  assert.deepEqual(client.log.slice(0, 4), [
    ['setAuth'],
    ['channel', 'session-handoff:user-1', { config: { private: true } }],
    ['on', 'broadcast', 'takeover'],
    ['subscribe'],
  ]);
});

test('aviso por la red: cada mensaje "takeover" llama a onNudge; otros eventos no', async () => {
  const client = fakeRealtime();
  let nudges = 0;
  const nudge = createTakeoverNudge({ getClient: () => client, userId: 'u', onNudge: () => { nudges += 1; } });
  nudge.start();
  await flush();
  client.send(NUDGE_EVENT);
  client.send(NUDGE_EVENT);
  client.send('otra-cosa');
  assert.equal(nudges, 2);
});

test('aviso por la red nunca lanza error: sin token, sin red o con onNudge roto no pasa nada', async () => {
  for (const options of [{ setAuthFails: true }, { subscribeFails: true }]) {
    const nudge = createTakeoverNudge({ getClient: () => fakeRealtime(options), userId: 'u', onNudge: () => {} });
    nudge.start();
    await flush();
    nudge.stop();
  }
  const broken = { get realtime() { throw new Error('sin cliente'); } };
  const none = createTakeoverNudge({ getClient: () => broken, userId: 'u', onNudge: () => {} });
  none.start();
  await flush();
  const client = fakeRealtime();
  const bad = createTakeoverNudge({ getClient: () => client, userId: 'u', onNudge: () => { throw new Error('roto'); } });
  bad.start();
  await flush();
  assert.doesNotThrow(() => client.send(NUDGE_EVENT));
});

test('aviso por la red: parar cierra el canal; sin cuenta no hace nada; parar antes de abrir no deja canal', async () => {
  const client = fakeRealtime();
  const nudge = createTakeoverNudge({ getClient: () => client, userId: 'u', onNudge: () => {} });
  nudge.start();
  await flush();
  nudge.stop();
  await flush();
  assert.ok(client.log.some((entry) => entry[0] === 'remove' && entry[1] === true));
  assert.equal(nudge.isRunning(), false);
  const early = fakeRealtime();
  const quick = createTakeoverNudge({ getClient: () => early, userId: 'u', onNudge: () => {} });
  quick.start();
  quick.stop();
  await flush();
  assert.equal(early.log.some((entry) => entry[0] === 'subscribe'), false);
  const noUser = fakeRealtime();
  createTakeoverNudge({ getClient: () => noUser, userId: '', onNudge: () => {} }).start();
  await flush();
  assert.equal(noUser.log.length, 0);
});

test('poke del vigilante: adelanta la revision, sigue leyendo el pedido real y no se pisa con otra en curso', async () => {
  let pending = null;
  const calls = [];
  const cloud = { rpc: (name) => { calls.push(name); return Promise.resolve({ data: [{ by_device_id: 'dev_otro', by_label: 'Windows', by_kind: 'web', age_seconds: 1, acked: false }], error: null }); } };
  const seen = [];
  const watcher = createTakeoverWatcher({
    getClient: () => cloud, deviceId: 'dev_mio', kind: 'extension', startedAt: Date.now() - 60000,
    setTimer: (fn) => { pending = fn; return 1; }, clearTimer: () => { pending = null; },
    onTakeover: (info) => seen.push(info),
  });
  watcher.poke();
  await flush();
  assert.equal(calls.length, 0, 'sin empezar, poke no hace nada');
  watcher.start();
  assert.ok(pending, 'hay una revision programada');
  watcher.poke();
  assert.equal(pending, null, 'la revision programada se cancela al adelantarla');
  await flush();
  assert.deepEqual(calls, ['session_takeover_get']);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].late, false);
  watcher.poke();
  await flush();
  assert.equal(seen.length, 1, 'ya avisó una vez: no repite');
});

test('el aviso por la red no cierra sesion ni guarda nada en el navegador y el worker no lo usa', () => {
  const text = fs.readFileSync(new URL('../js/session-handoff.js', import.meta.url), 'utf8');
  assert.doesNotMatch(text, /signOut|localStorage|sessionStorage|chrome\.storage/);
  for (const file of ['bridge-worker.js', 'worker-session.js', 'worker-lease.js', 'worker-data.js', 'worker-plan.js']) {
    assert.doesNotMatch(fs.readFileSync(new URL(`../extension/propio-bridge/${file}`, import.meta.url), 'utf8'), /createTakeoverNudge|session-handoff|realtime/i);
  }
});
