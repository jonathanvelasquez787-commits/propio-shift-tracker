import { ui, translateText, translateMarkup, displayLocale, setLanguage, currentLanguage } from '../js/i18n.js';
import { applySavedColors } from '../js/appearance-colors.js';
import { LANGUAGE_PREFERENCE_KEY, PENDING_LOGIN_LANGUAGE_KEY, normalizeLanguage, readLanguagePreference, saveLanguagePreference, readPendingLoginLanguage, clearPendingLoginLanguage } from '../js/language-preference.js';
import { createSessionSwitch } from '../js/session-switch.js';
import { announcePresence } from '../js/session-handoff.js';
import test from 'node:test';
import assert from 'node:assert/strict';

// Nube falsa compartida por las dos paginas: notas de sesion (vigentes 2 minutos) y un pedido de traspaso.
function fakeCloud() {
  const state = { t: 0, notes: [], takeover: null, calls: [] };
  const clientFor = () => ({ rpc: async (name, p) => {
    state.calls.push(name);
    if (name === 'session_heartbeat') { state.notes.push({ deviceId: p.p_device_id, kind: p.p_kind, at: state.t }); return { data: [], error: null }; }
    if (name === 'session_others') {
      const rows = state.notes.filter(n => state.t - n.at <= 120000 && !(n.deviceId === p.p_device_id && n.kind === p.p_kind))
        .map(n => ({ instance: 'i', device_id: n.deviceId, label: n.kind, kind: n.kind, age_seconds: Math.floor((state.t - n.at) / 1000) }));
      return { data: rows, error: null };
    }
    if (name === 'session_takeover_request') { state.takeover = { by: p.p_device_id, kind: p.p_kind, at: state.t, acked: false }; return { error: null }; }
    if (name === 'session_takeover_ack') { if (state.takeover) state.takeover.acked = true; return { error: null }; }
    if (name === 'session_takeover_get') return { data: state.takeover ? [{ by_device_id: state.takeover.by, by_label: 'x', by_kind: state.takeover.kind,
      age_seconds: Math.floor((state.t - state.takeover.at) / 1000), acked: state.takeover.acked }] : [], error: null };
    return { data: null, error: null };
  } });
  return { state, clientFor };
}
const memory = () => { const m = new Map(); return { get: () => JSON.parse(m.get('k') ?? 'null'), set: v => { m.set('k', JSON.stringify(v)); return true; }, clear: () => m.delete('k') }; };

function page({ cloud, id, kind, log, store = memory(), announce }) {
  return { store, sw: createSessionSwitch({
    getClient: cloud.clientFor, getDeviceId: () => id, getLabel: () => kind, kind,
    readMark: () => store.get(), writeMark: m => store.set(m), clearMark: () => store.clear(),
    screens: { prompt: ({ onHere }) => { log.push(id + ':pregunta'); setTimeout(onHere, 0); }, waiting: () => log.push(id + ':espera'), paused: () => log.push(id + ':pantalla-pausa') },
    settle: async () => ({ saved: true }), yieldCloud: async () => true, reload: () => log.push(id + ':recarga'),
    sleep: async ms => { cloud.state.t += ms; }, now: () => cloud.state.t, ...(announce ? { announce } : {}),
  }) };
}

test('la web abierta, la extension toca "Abrir aqui": al recargarse en pausa la web ve a la extension y NO se abre sola', async () => {
  const cloud = fakeCloud(), log = [];
  cloud.state.notes.push({ deviceId: 'WEB', kind: 'web', at: 0 });
  const web = page({ cloud, id: 'WEB', kind: 'web', log });
  const ext = page({ cloud, id: 'EXT', kind: 'extension', log });
  cloud.state.t = 5000;
  const extGate = ext.sw.gate('u1');            // la extension todavia no monto la app: su nota normal no existe
  await new Promise(resolve => setTimeout(resolve, 5));
  cloud.state.t = 6000;
  await web.sw.pause({ late: false, onBeforePause: () => {} });
  cloud.state.t = 6500;
  assert.equal(await web.sw.gate('u1'), 'stay', 'la web recargada debe quedarse en la pantalla de pausa');
  assert.ok(log.includes('WEB:pantalla-pausa'));
  assert.equal(await extGate, 'open');
});

test('lo mismo al reves: la extension abierta, la web toca "Abrir aqui"', async () => {
  const cloud = fakeCloud(), log = [];
  cloud.state.notes.push({ deviceId: 'EXT', kind: 'extension', at: 0 });
  const ext = page({ cloud, id: 'EXT', kind: 'extension', log });
  const web = page({ cloud, id: 'WEB', kind: 'web', log });
  cloud.state.t = 5000;
  const webGate = web.sw.gate('u1');
  await new Promise(resolve => setTimeout(resolve, 5));
  cloud.state.t = 6000;
  await ext.sw.pause({ late: false, onBeforePause: () => {} });
  cloud.state.t = 6500;
  assert.equal(await ext.sw.gate('u1'), 'stay');
  assert.equal(await webGate, 'open');
});

test('la nota de "estoy aqui" sale ANTES del pedido de traspaso', async () => {
  const cloud = fakeCloud(), log = [];
  cloud.state.notes.push({ deviceId: 'WEB', kind: 'web', at: 0 });
  const ext = page({ cloud, id: 'EXT', kind: 'extension', log });
  await ext.sw.gate('u1');
  const first = cloud.state.calls.indexOf('session_heartbeat'), second = cloud.state.calls.indexOf('session_takeover_request');
  assert.ok(first >= 0 && second > first);
});

test('si la nota falla, el traspaso sigue igual (nunca se bloquea)', async () => {
  const cloud = fakeCloud(), log = [];
  cloud.state.notes.push({ deviceId: 'WEB', kind: 'web', at: 0 });
  const base = cloud.clientFor;
  cloud.clientFor = () => ({ rpc: async (name, p) => (name === 'session_heartbeat' ? { error: { message: 'nube caida' } } : base().rpc(name, p)) });
  const ext = page({ cloud, id: 'EXT', kind: 'extension', log });
  assert.equal(await ext.sw.gate('u1'), 'open');
  assert.ok(cloud.state.calls.includes('session_takeover_request'));
});

test('announcePresence: manda session_heartbeat con el tipo y el dispositivo, y nunca lanza error', async () => {
  const sent = [];
  const ok = await announcePresence({ getClient: () => ({ rpc: async (name, p) => { sent.push({ name, p }); return { error: null }; } }),
    deviceId: 'EXT', label: 'Herramienta', kind: 'extension', randomId: () => 'uuid-1' });
  assert.equal(ok, true);
  assert.deepEqual(sent, [{ name: 'session_heartbeat', p: { p_instance: 'uuid-1', p_device_id: 'EXT', p_label: 'Herramienta', p_kind: 'extension' } }]);
  assert.equal(await announcePresence({ getClient: () => ({ rpc: async () => ({ error: { message: 'x' } }) }), deviceId: 'a', label: 'b', kind: 'web' }), false);
  assert.equal(await announcePresence({ getClient: () => { throw new Error('sin cliente'); }, deviceId: 'a', label: 'b', kind: 'web' }), false);
  const hung = await announcePresence({ getClient: () => ({ rpc: () => new Promise(() => {}) }), deviceId: 'a', label: 'b', kind: 'web', timeoutMs: 5 });
  assert.equal(hung, false);
});
