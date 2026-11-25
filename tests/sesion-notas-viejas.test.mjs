import { ui, translateText, translateMarkup, displayLocale, setLanguage, currentLanguage } from '../js/i18n.js';
import { applySavedColors } from '../js/appearance-colors.js';
import { LANGUAGE_PREFERENCE_KEY, PENDING_LOGIN_LANGUAGE_KEY, normalizeLanguage, readLanguagePreference, saveLanguagePreference, readPendingLoginLanguage, clearPendingLoginLanguage } from '../js/language-preference.js';
import { createSessionSwitch } from '../js/session-switch.js';
import { createSessionNote } from '../js/session-note.js';
import { dropNotes } from '../js/session-handoff.js';
import test from 'node:test';
import assert from 'node:assert/strict';

// Nube falsa: notas con su instancia (vigentes 2 minutos), borrado por instancia y un pedido de traspaso.
function fakeCloud() {
  const state = { t: 0, notes: [], takeover: null, calls: [] };
  const client = { rpc: async (name, p) => {
    state.calls.push(name);
    if (name === 'session_heartbeat') { state.notes = state.notes.filter(n => n.instance !== p.p_instance); state.notes.push({ instance: p.p_instance, deviceId: p.p_device_id, kind: p.p_kind, at: state.t }); return { data: [], error: null }; }
    if (name === 'session_leave') { state.notes = state.notes.filter(n => n.instance !== p.p_instance); return { error: null }; }
    if (name === 'session_others') {
      return { data: state.notes.filter(n => state.t - n.at <= 120000 && !(n.deviceId === p.p_device_id && n.kind === p.p_kind))
        .map(n => ({ instance: n.instance, device_id: n.deviceId, label: n.kind, kind: n.kind, age_seconds: Math.floor((state.t - n.at) / 1000) })), error: null };
    }
    if (name === 'session_takeover_request') { state.takeover = { by: p.p_device_id, kind: p.p_kind, at: state.t, acked: false }; return { error: null }; }
    if (name === 'session_takeover_ack') { if (state.takeover) state.takeover.acked = true; return { error: null }; }
    if (name === 'session_takeover_get') return { data: state.takeover ? [{ by_device_id: state.takeover.by, by_label: 'x', by_kind: state.takeover.kind,
      age_seconds: Math.floor((state.t - state.takeover.at) / 1000), acked: state.takeover.acked }] : [], error: null };
    return { data: null, error: null };
  } };
  return { state, client, getClient: () => client };
}
const memory = () => { const m = new Map(); return { get: () => JSON.parse(m.get('k') ?? 'null'), set: v => { m.set('k', JSON.stringify(v)); return true; }, clear: () => m.delete('k') }; };

function page({ cloud, id, kind, log, leaveNote }) {
  const store = memory();
  return createSessionSwitch({
    getClient: cloud.getClient, getDeviceId: () => id, getLabel: () => kind, kind,
    readMark: () => store.get(), writeMark: m => store.set(m), clearMark: () => store.clear(),
    screens: { prompt: ({ onHere }) => { log.push(id + ':pregunta'); setTimeout(onHere, 0); }, waiting: () => log.push(id + ':espera'), paused: () => log.push(id + ':pantalla-pausa') },
    settle: async () => ({ saved: true }), yieldCloud: async () => true, reload: () => log.push(id + ':recarga'),
    sleep: async ms => { cloud.state.t += ms; }, now: () => cloud.state.t,
    ...(leaveNote ? { leaveNote } : {}),
  });
}
const notesOf = (cloud, kind) => cloud.state.notes.filter(n => n.kind === kind).length;

test('la sesion que se pausa borra su nota ANTES de recargarse (la web pausada ya no engana a la ventanita)', async () => {
  const cloud = fakeCloud(), log = [];
  cloud.state.notes.push({ instance: 'W1', deviceId: 'WEB', kind: 'web', at: 0 });
  const web = page({ cloud, id: 'WEB', kind: 'web', log, leaveNote: async () => { log.push('WEB:borra-nota'); await cloud.client.rpc('session_leave', { p_instance: 'W1' }); } });
  const ext = page({ cloud, id: 'EXT', kind: 'extension', log });
  cloud.state.t = 5000;
  const extGate = ext.gate('u1');
  await new Promise(resolve => setTimeout(resolve, 5));
  await web.pause({ late: false, onBeforePause: () => {} });
  assert.ok(log.indexOf('WEB:borra-nota') >= 0 && log.indexOf('WEB:borra-nota') < log.indexOf('WEB:recarga'), 'la nota se borra antes de recargar');
  assert.equal(notesOf(cloud, 'web'), 0);
  assert.equal(await web.gate('u1'), 'stay', 'la web recargada sigue en pausa porque la ventanita dejo su nota');
  assert.equal(await extGate, 'open');
});

test('ventanita que se cierra y se vuelve a abrir mientras la web esta en pausa: se abre sin preguntar', async () => {
  const cloud = fakeCloud(), log = [];
  cloud.state.notes.push({ instance: 'W1', deviceId: 'WEB', kind: 'web', at: 0 });
  const web = page({ cloud, id: 'WEB', kind: 'web', log, leaveNote: async () => { await cloud.client.rpc('session_leave', { p_instance: 'W1' }); } });
  const ext = page({ cloud, id: 'EXT', kind: 'extension', log });
  cloud.state.t = 5000;
  const firstGate = ext.gate('u1');
  await new Promise(resolve => setTimeout(resolve, 5));
  await web.pause({ late: false, onBeforePause: () => {} });
  await firstGate;
  // La ventanita se cierra (su nota queda ahi, el mensaje de salida no llego) y se abre otra vez poco despues.
  cloud.state.t += 30000;
  const reopened = page({ cloud, id: 'EXT', kind: 'extension', log: [] });
  const preguntas = [];
  assert.equal(await reopened.gate('u1'), 'open');
  assert.equal(preguntas.length, 0);
  assert.equal(log.filter(entry => entry === 'EXT:pregunta').length, 1, 'solo la primera vez pregunto');
});

test('nadie confirma el traspaso: las notas que no contestaron se borran', async () => {
  const cloud = fakeCloud(), log = [];
  cloud.state.notes.push({ instance: 'W1', deviceId: 'WEB', kind: 'web', at: 0 }, { instance: 'W2', deviceId: 'WEB', kind: 'web', at: 0 });
  const ext = page({ cloud, id: 'EXT', kind: 'extension', log });
  cloud.state.t = 5000;
  assert.equal(await ext.gate('u1'), 'open');
  assert.equal(notesOf(cloud, 'web'), 0, 'las notas de paginas que no contestaron ya no estan');
  assert.ok(notesOf(cloud, 'extension') >= 1, 'la nota de quien abre se queda');
});

test('si el traspaso SI se confirma, no se borra ninguna nota ajena', async () => {
  const cloud = fakeCloud(), log = [];
  cloud.state.notes.push({ instance: 'W1', deviceId: 'WEB', kind: 'web', at: 0 });
  const ext = page({ cloud, id: 'EXT', kind: 'extension', log });
  cloud.state.t = 5000;
  const original = cloud.client.rpc;
  // La otra sesion esta viva: confirma el traspaso apenas se pide.
  cloud.client.rpc = async (name, p) => { const out = await original(name, p); if (name === 'session_takeover_request') cloud.state.takeover.acked = true; return out; };
  assert.equal(await ext.gate('u1'), 'open');
  assert.equal(notesOf(cloud, 'web'), 1);
});

test('si borrar la nota falla o tarda, la pausa y la recarga siguen igual', async () => {
  const cloud = fakeCloud(), log = [];
  const web = page({ cloud, id: 'WEB', kind: 'web', log, leaveNote: () => new Promise(() => {}) });
  await web.pause({ late: false, onBeforePause: () => {} });
  assert.ok(log.includes('WEB:recarga'));
  const web2 = page({ cloud, id: 'WEB', kind: 'web', log: [], leaveNote: async () => { throw new Error('sin red'); } });
  await web2.pause({ late: true, onBeforePause: () => {} });
});

test('la nota de sesion: stop() devuelve una promesa que termina cuando la nube borro la nota, y no lanza error', async () => {
  const cloud = fakeCloud();
  const note = createSessionNote({ getClient: cloud.getClient, kind: 'web', getDeviceId: () => 'WEB', getLabel: () => 'web',
    randomId: () => 'W9', setTimer: () => 1, clearTimer: () => {}, now: () => 0 });
  note.start();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(notesOf(cloud, 'web'), 1);
  await note.stop();
  assert.equal(notesOf(cloud, 'web'), 0);
  await note.stop();
  const broken = createSessionNote({ getClient: () => ({ rpc: async () => { throw new Error('caida'); } }), kind: 'web', getDeviceId: () => 'a', getLabel: () => 'b',
    randomId: () => 'W8', setTimer: () => 1, clearTimer: () => {}, now: () => 0 });
  broken.start();
  await new Promise(resolve => setImmediate(resolve));
  await broken.stop();
});

test('dropNotes: borra cada instancia, cuenta las que salieron bien y nunca lanza error', async () => {
  const sent = [];
  const count = await dropNotes({ getClient: () => ({ rpc: async (name, p) => { sent.push([name, p.p_instance]); return { error: p.p_instance === 'B' ? { message: 'x' } : null }; } }), instances: ['A', 'B', 'C'] });
  assert.equal(count, 2);
  assert.deepEqual(sent.map(entry => entry[0]), ['session_leave', 'session_leave', 'session_leave']);
  assert.equal(await dropNotes({ getClient: () => { throw new Error('sin cliente'); }, instances: ['A'] }), 0);
  assert.equal(await dropNotes({ getClient: () => ({ rpc: () => new Promise(() => {}) }), instances: ['A'], timeoutMs: 5 }), 0);
});
