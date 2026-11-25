import { ui, translateText, translateMarkup, displayLocale } from '../js/i18n.js';
import { createSessionSwitch } from '../js/session-switch.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

void ui; void translateText; void translateMarkup; void displayLocale;
const tick = () => new Promise((resolve) => setImmediate(resolve));
const OTHER = { by_device_id: 'dev_nuevo', by_label: 'Web', by_kind: 'web', age_seconds: 1, acked: false };

function rig({ takeover = null, realtimeFails = false, userId = 'u1' } = {}) {
  const log = [], rpcs = [], handlers = [], timers = [];
  const state = { takeover };
  const channel = { on(_t, f, cb) { handlers.push({ event: f.event, cb }); return channel; }, subscribe() { log.push('subscribe'); return channel; } };
  const client = {
    rpc: async (name) => {
      rpcs.push(name);
      if (name === 'session_takeover_get') return { data: state.takeover ? [state.takeover] : [], error: null };
      return { data: null, error: null };
    },
    realtime: { setAuth: async () => { if (realtimeFails) throw new Error('sin realtime'); log.push('setAuth'); } },
    channel(name, options) { log.push(`channel:${name}:${options.config.private}`); return channel; },
    removeChannel: async () => { log.push('removeChannel'); },
  };
  const sw = createSessionSwitch({
    getClient: () => client, getDeviceId: () => 'dev_viejo', getLabel: () => 'x', kind: 'extension',
    readMark: () => null, writeMark: (m) => log.push('mark:' + JSON.stringify(m)), clearMark() {}, screens: {},
    settle: async ({ push }) => { log.push('settle:' + push); return { saved: true }; }, yieldCloud: async () => true,
    reload: () => log.push('reload'),
    setTimer: (fn) => { timers.push(fn); return timers.length; }, clearTimer: (id) => { timers[id - 1] = null; }, now: () => 5000,
  });
  const watcher = sw.watch({ startedAt: 1000, onBeforePause: () => log.push('puente'), userId });
  const nudge = () => handlers.filter((h) => h.event === 'takeover').forEach((h) => h.cb());
  return { log, rpcs, state, timers, watcher, nudge };
}

test('conexion: el aviso de Realtime adelanta la revision y la pagina se pausa sin esperar los 5 s', async () => {
  const r = rig({ takeover: OTHER });
  await tick();
  assert.ok(r.log.includes('channel:session-handoff:u1:true'));
  assert.equal(r.rpcs.length, 0, 'todavia no se reviso nada');
  r.nudge();
  await tick(); await tick(); await tick();
  assert.deepEqual(r.log.filter((l) => /^(puente|settle|mark|reload|removeChannel)/.test(l)),
    ['removeChannel', 'puente', 'settle:true', 'mark:{"saved":true,"resume":false}', 'reload']);
  assert.ok(r.rpcs.includes('session_takeover_ack'));
});

test('conexion: el aviso NO es una orden: si el pedido real es propio o no existe, no se pausa', async () => {
  for (const takeover of [null, { ...OTHER, by_device_id: 'dev_viejo', by_kind: 'extension' }]) {
    const r = rig({ takeover });
    await tick();
    r.nudge();
    await tick(); await tick(); await tick();
    assert.equal(r.log.includes('reload'), false);
    assert.ok(r.rpcs.includes('session_takeover_get'), 'igual lee el pedido real en la nube');
    assert.equal(r.watcher.isRunning(), true, 'sigue vigilando');
  }
});

test('conexion: si Realtime no esta, el sondeo de cada 5 s sigue pausando como antes', async () => {
  const r = rig({ takeover: OTHER, realtimeFails: true });
  await tick();
  assert.equal(r.log.some((l) => l.startsWith('channel:')), false);
  await r.timers.shift()();
  await tick(); await tick(); await tick();
  assert.ok(r.log.includes('reload'));
});

test('conexion: sin cuenta (userId) no se abre ningun canal; parar el vigilante cierra el canal', async () => {
  const none = rig({ userId: null });
  await tick();
  assert.equal(none.log.some((l) => l.startsWith('channel:')), false);
  const r = rig();
  await tick();
  r.watcher.stop();
  await tick();
  assert.ok(r.log.includes('removeChannel'));
  assert.equal(r.watcher.isRunning(), false);
});

test('conexion: boot.js pasa la cuenta, el cliente usa el latido aparte y el worker de la extension no lo toca', () => {
  const boot = fs.readFileSync(new URL('../js/boot.js', import.meta.url), 'utf8');
  assert.match(boot, /startSessionPause\(\{[^}]*onBeforePause: \(\) => stopPropioBridge\(\), userId \}\)/);
  const client = fs.readFileSync(new URL('../js/supabase-client.js', import.meta.url), 'utf8');
  assert.match(client, /realtime:\s*\{\s*worker:\s*true\s*\}/);
  const sw = fs.readFileSync(new URL('../js/session-switch.js', import.meta.url), 'utf8');
  assert.doesNotMatch(sw, /signOut|localStorage\.|sessionStorage/);
  for (const file of ['bridge-worker.js', 'worker-session.js', 'worker-lease.js', 'worker-data.js', 'worker-plan.js']) {
    assert.doesNotMatch(fs.readFileSync(new URL(`../extension/propio-bridge/${file}`, import.meta.url), 'utf8'), /createTakeoverNudge|session-switch|realtime/i);
  }
});
