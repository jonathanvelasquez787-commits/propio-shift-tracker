import { createSessionSwitch, STALE_NOTE_SECONDS, STALE_WAIT_MS } from '../js/session-switch.js';
import test from 'node:test';
import assert from 'node:assert/strict';

// Nube falsa con reloj propio: `sleep` lo adelanta, asi se mide cuanto espero la ventanita.
function setup({ ages, acked = false, mark = null }) {
  const t = { ms: 0 }; const calls = []; const dropped = []; const log = [];
  const notes = ages.map((age, i) => ({ instance: 'N' + i, device_id: 'WEB', label: 'Windows', kind: 'web', age_seconds: age }));
  const rpc = async (name, p) => {
    calls.push(name);
    if (name === 'session_others') return { data: notes, error: null };
    if (name === 'session_takeover_get') return { data: acked ? [{ by_device_id: 'EXT', by_label: 'x', by_kind: 'extension', age_seconds: 1, acked: true }] : [], error: null };
    return { data: null, error: null };
  };
  const sw = createSessionSwitch({
    getClient: () => ({ rpc }), getDeviceId: () => 'EXT', getLabel: () => 'x', kind: 'extension',
    readMark: () => mark, writeMark: () => true, clearMark: () => {},
    screens: { prompt: () => log.push('pregunta'), waiting: () => log.push('espera'), paused: () => log.push('pausa') },
    settle: async () => ({ saved: true }), yieldCloud: async () => true, announce: async () => true,
    dropOld: async ({ instances }) => { dropped.push(...instances); return instances.length; },
    reload: () => {}, sleep: async (ms) => { t.ms += ms; }, now: () => t.ms,
  });
  return { sw, t, calls, dropped, log };
}

test('nota vieja (mas de 20 s): no pregunta, pide el traspaso sola y espera poco', async () => {
  const s = setup({ ages: [26] });
  assert.equal(await s.sw.gate('u1'), 'open');
  assert.deepEqual(s.log, ['espera'], 'sin pregunta');
  assert.ok(s.calls.includes('session_takeover_request'), 'igual pide el traspaso por si la sesion esta dormida');
  assert.ok(s.t.ms <= STALE_WAIT_MS + 2000, 'espero ' + s.t.ms + ' ms, no los 15 s de siempre');
  assert.deepEqual(s.dropped, ['N0'], 'sin confirmacion: la nota vieja se borra');
});

test('nota fresca (20 s o menos): pregunta como siempre', async () => {
  for (const age of [3, 12, STALE_NOTE_SECONDS]) {
    const s = setup({ ages: [age] });
    void s.sw.gate('u1'); await new Promise(r => setImmediate(r)); await new Promise(r => setImmediate(r));
    assert.deepEqual(s.log, ['pregunta'], 'con ' + age + ' s pregunta');
  }
});

test('si alguna nota es fresca, pregunta aunque haya otras viejas', async () => {
  const s = setup({ ages: [90, 8, 60] });
  void s.sw.gate('u1'); await new Promise(r => setImmediate(r)); await new Promise(r => setImmediate(r));
  assert.deepEqual(s.log, ['pregunta']);
});

test('nota vieja pero la sesion dormida despierta y confirma: abre sin borrar notas', async () => {
  const s = setup({ ages: [45], acked: true });
  assert.equal(await s.sw.gate('u1'), 'open');
  assert.deepEqual(s.log, ['espera']);
  assert.deepEqual(s.dropped, []);
});

test('nota vieja con la ventanita ya pausada antes: sigue la pantalla de pausa (no se abre sola)', async () => {
  const s = setup({ ages: [45], mark: { saved: true, resume: false } });
  assert.equal(await s.sw.gate('u1'), 'stay');
  assert.deepEqual(s.log, ['pausa']);
});
