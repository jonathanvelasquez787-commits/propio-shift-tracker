import { ui, translateText, translateMarkup, displayLocale, setLanguage, currentLanguage } from '../js/i18n.js';
import { applySavedColors } from '../js/appearance-colors.js';
import { LANGUAGE_PREFERENCE_KEY, PENDING_LOGIN_LANGUAGE_KEY, normalizeLanguage, readLanguagePreference, saveLanguagePreference, readPendingLoginLanguage, clearPendingLoginLanguage } from '../js/language-preference.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionNote, STALE_OWN_SECONDS } from '../js/session-note.js';
import { createSessionSwitch, describeOtherSession } from '../js/session-switch.js';
import { sendSessionLeaveOnExit, setAccessToken } from '../js/sync.js';

const flush = () => new Promise(resolve => setImmediate(resolve));

// Nube falsa: la nota vale 2 minutos y se borra por instancia.
function fakeCloud() {
  const state = { t: 0, notes: [], calls: [] };
  const client = { rpc: async (name, p) => {
    state.calls.push({ name, p });
    if (name === 'session_heartbeat') {
      state.notes = state.notes.filter(n => n.instance !== p.p_instance);
      state.notes.push({ instance: p.p_instance, deviceId: p.p_device_id, kind: p.p_kind, label: p.p_label, at: state.t });
      return { data: state.notes.filter(n => state.t - n.at <= 120000).map(n => ({ instance: n.instance, device_id: n.deviceId, label: n.label, kind: n.kind,
        age_seconds: Math.floor((state.t - n.at) / 1000), is_self: n.instance === p.p_instance })), error: null };
    }
    if (name === 'session_leave') { state.notes = state.notes.filter(n => n.instance !== p.p_instance); return { error: null }; }
    if (name === 'session_others') {
      return { data: state.notes.filter(n => state.t - n.at <= 120000 && !(n.deviceId === p.p_device_id && n.kind === p.p_kind))
        .map(n => ({ instance: n.instance, device_id: n.deviceId, label: n.label, kind: n.kind, age_seconds: Math.floor((state.t - n.at) / 1000) })), error: null };
    }
    return { data: null, error: null };
  } };
  return { state, client, getClient: () => client };
}

function noteOf({ cloud, id = 'N1', device = 'DEV', kind = 'web', leaveOnExit = null }) {
  const timers = new Map(); let next = 0;
  const note = createSessionNote({ getClient: cloud.getClient, kind, getDeviceId: () => device, getLabel: () => 'Windows', randomId: () => id,
    setTimer: (fn, ms) => { timers.set(++next, fn); return next; }, clearTimer: t => timers.delete(t), now: () => cloud.state.t, leaveOnExit });
  const fire = async () => { const [k, fn] = [...timers][0]; timers.delete(k); fn(); await flush(); };
  return { note, fire };
}

test('al cerrar la pagina el borrado de la nota sale por el envio que sobrevive al cierre, sin llamada normal', async () => {
  const cloud = fakeCloud(), sent = [];
  const { note } = noteOf({ cloud, leaveOnExit: (instance) => { sent.push(instance); return true; } });
  note.start(); await flush();
  const before = cloud.state.calls.length;
  await note.stop({ exit: true });
  assert.deepEqual(sent, ['N1']);
  assert.equal(cloud.state.calls.length, before, 'no hubo llamada normal que se pierda al cerrar');
});

test('si el envio de cierre no se pudo preparar, cae a la llamada normal; y parar sin cerrar sigue usando la llamada normal', async () => {
  const cloud = fakeCloud();
  const a = noteOf({ cloud, id: 'A', leaveOnExit: () => false });
  a.note.start(); await flush();
  await a.note.stop({ exit: true });
  assert.ok(cloud.state.calls.some(c => c.name === 'session_leave' && c.p.p_instance === 'A'));
  const b = noteOf({ cloud, id: 'B', leaveOnExit: () => { throw new Error('boom'); } });
  b.note.start(); await flush();
  await b.note.stop({ exit: true });
  assert.ok(cloud.state.calls.some(c => c.name === 'session_leave' && c.p.p_instance === 'B'), 'un error en el envio tampoco rompe');
  const sent = [];
  const c = noteOf({ cloud, id: 'C', leaveOnExit: (i) => { sent.push(i); return true; } });
  c.note.start(); await flush();
  await c.note.stop();
  assert.deepEqual(sent, [], 'pausar espera la llamada normal: no usa el envio de cierre');
  assert.ok(cloud.state.calls.some(c2 => c2.name === 'session_leave' && c2.p.p_instance === 'C'));
});

test('sendSessionLeaveOnExit manda session_leave con keepalive y el token; sin token no manda nada', () => {
  const calls = [], realFetch = globalThis.fetch;
  globalThis.fetch = (url, init) => { calls.push({ url, init }); return Promise.resolve({}); };
  try {
    setAccessToken(null);
    assert.equal(sendSessionLeaveOnExit('X1'), false);
    assert.equal(calls.length, 0);
    setAccessToken('tok123');
    assert.equal(sendSessionLeaveOnExit('X1'), true);
    assert.equal(sendSessionLeaveOnExit(''), false);
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /\/rest\/v1\/rpc\/session_leave$/);
    assert.equal(calls[0].init.keepalive, true);
    assert.equal(calls[0].init.headers.Authorization, 'Bearer tok123');
    assert.deepEqual(JSON.parse(calls[0].init.body), { p_instance: 'X1' });
  } finally { setAccessToken(null); globalThis.fetch = realFetch; }
});

test('al latir borra las notas viejas de MI navegador y tipo, y solo esas', async () => {
  const cloud = fakeCloud();
  cloud.state.notes.push(
    { instance: 'MIA-VIEJA', deviceId: 'DEV', kind: 'web', label: 'Windows', at: 0 },
    { instance: 'MIA-FRESCA', deviceId: 'DEV', kind: 'web', label: 'Windows', at: 70000 },
    { instance: 'OTRO-NAVEGADOR', deviceId: 'OTRO', kind: 'web', label: 'Mac', at: 0 },
    { instance: 'OTRO-TIPO', deviceId: 'DEV', kind: 'extension', label: 'Windows', at: 0 },
  );
  cloud.state.t = 70000 + (STALE_OWN_SECONDS - 5) * 1000;
  const { note, fire } = noteOf({ cloud });
  note.start(); await flush();
  const left = () => cloud.state.notes.map(n => n.instance).sort();
  assert.deepEqual(left(), ['MIA-FRESCA', 'N1', 'OTRO-NAVEGADOR', 'OTRO-TIPO'].sort().filter(x => x !== 'MIA-VIEJA').sort());
  cloud.state.t += 20000; // la fresca ya paso de STALE_OWN_SECONDS sin renovarse
  await fire();
  assert.ok(!left().includes('MIA-FRESCA'), 'cuando vence sin renovarse tambien se borra');
  assert.ok(left().includes('N1') && left().includes('OTRO-NAVEGADOR') && left().includes('OTRO-TIPO'), 'la propia y las ajenas quedan');
  const drops = cloud.state.calls.filter(c => c.name === 'session_leave').map(c => c.p.p_instance);
  assert.equal(new Set(drops).size, drops.length, 'cada nota vieja se borra una sola vez');
});

test('un fallo al borrar una nota vieja no rompe el latido ni lo detiene', async () => {
  const cloud = fakeCloud();
  cloud.state.notes.push({ instance: 'VIEJA', deviceId: 'DEV', kind: 'web', label: 'Windows', at: 0 });
  cloud.state.t = 60000;
  const real = cloud.client.rpc;
  cloud.client.rpc = async (name, p) => { if (name === 'session_leave') throw new Error('red'); return real(name, p); };
  const { note, fire } = noteOf({ cloud });
  note.start(); await flush();
  assert.equal(note.isRunning(), true);
  await fire();
  assert.ok(cloud.state.notes.some(n => n.instance === 'N1'), 'sigue latiendo');
});

test('flujo completo: la web se cierra, su nota se borra y la ventanita abre sin preguntar', async () => {
  const cloud = fakeCloud(), sent = [], asked = [];
  const web = noteOf({ cloud, id: 'W1', device: 'WEB', kind: 'web', leaveOnExit: (i) => { sent.push(i); cloud.state.notes = cloud.state.notes.filter(n => n.instance !== i); return true; } });
  web.note.start(); await flush();
  cloud.state.t += 12000; // la ventanita se abre con la web viva (12 s: aun renueva cada 10 s): preguntaria
  const mk = () => createSessionSwitch({ getClient: cloud.getClient, getDeviceId: () => 'EXT', getLabel: () => 'ext', kind: 'extension',
    readMark: () => null, writeMark: () => true, clearMark: () => {}, yieldCloud: async () => true, settle: async () => ({ saved: true }),
    screens: { prompt: (o) => { asked.push(o); }, waiting: () => {}, paused: () => {} }, reload: () => {}, sleep: async () => {}, now: () => cloud.state.t });
  const withWeb = mk().gate('u1'); await flush(); await flush();
  assert.equal(asked.length, 1, 'con la web viva pregunta');
  assert.match(asked[0].detail, /Windows/);
  assert.match(asked[0].detail, /12 s/);
  void withWeb;
  asked.length = 0;
  await web.note.stop({ exit: true }); // se cierra la pestaña
  cloud.state.t += 5000;
  assert.equal(await mk().gate('u1'), 'open');
  assert.equal(asked.length, 0, 'sin la web ya no pregunta');
  assert.deepEqual(sent, ['W1']);
});

test('la letra chica de la pregunta dice de que sesion es la nota y hace cuanto dio señal', () => {
  const before = currentLanguage(); setLanguage('es');
  try {
    const others = [
      { kind: 'web', label: 'Windows', ageSeconds: 95 },
      { kind: 'web', label: 'Chrome en Windows', ageSeconds: 45 },
      { kind: 'extension', label: 'Ext', ageSeconds: 5 },
    ];
    assert.equal(describeOtherSession(others, 'web'), 'Última señal de esa sesión (Chrome en Windows): hace 45 s.');
    assert.equal(describeOtherSession([{ kind: 'web', label: '', ageSeconds: 100 }], 'web'), 'Última señal de esa sesión: hace 2 min.');
    assert.equal(describeOtherSession([], 'web'), '');
  } finally { setLanguage(before); }
});
