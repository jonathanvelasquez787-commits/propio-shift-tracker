import { createSessionSwitch } from '../js/session-switch.js';
import { requestTakeover, waitForTakeoverAck, createTakeoverWatcher, dropNotes } from '../js/session-handoff.js';
import test from 'node:test';
import assert from 'node:assert/strict';

const never = () => new Promise(() => {});
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const note = { instance: 'W1', device_id: 'WEB', label: 'Windows', kind: 'web', age_seconds: 5 };
// Nube falsa: `hang` lista los rpc que nunca contestan; el resto contesta lo basico.
function cloud({ hang = [], takeover = [] } = {}) {
  const calls = [];
  const rpc = (name) => {
    calls.push(name);
    if (hang.includes(name)) return never();
    if (name === 'session_others') return Promise.resolve({ data: [note], error: null });
    if (name === 'session_takeover_get') return Promise.resolve({ data: takeover, error: null });
    return Promise.resolve({ data: null, error: null });
  };
  return { calls, getClient: () => ({ rpc }) };
}
function ventanita({ nube, mark = null, yieldCloud = async () => true, announce = async () => true, ...extra }) {
  let stored = mark; const log = [];
  const sw = createSessionSwitch({
    getClient: nube.getClient, getDeviceId: () => 'EXT', getLabel: () => 'x', kind: 'extension',
    readMark: () => stored, writeMark: m => { stored = m; return true; }, clearMark: () => { stored = null; },
    screens: { prompt: ({ onHere }) => { log.push('pregunta'); setTimeout(onHere, 0); }, waiting: () => log.push('espera'), paused: () => log.push('pausa') },
    settle: async () => ({ saved: true }), yieldCloud, announce, reload: () => log.push('recarga'),
    sleep: ms => pause(Math.min(ms, 5)), ...extra,
  });
  return { sw, log, mark: () => stored };
}

test('pedir el traspaso: si la nube no contesta, devuelve false y no se queda esperando', async () => {
  const started = Date.now();
  const asked = await requestTakeover({ getClient: () => ({ rpc: never }), deviceId: 'EXT', label: 'x', kind: 'extension', timeoutMs: 30 });
  assert.equal(asked, false);
  assert.ok(Date.now() - started < 1000);
});

test('esperar la confirmacion: una lectura colgada no la frena y termina en timeout', async () => {
  let t = 0;
  const result = await waitForTakeoverAck({ getClient: () => ({ rpc: never }), deviceId: 'EXT', kind: 'extension',
    sleep: async ms => { t += ms; }, now: () => t, limitMs: 100, pollMs: 20, callLimitMs: 10 });
  assert.equal(result, 'timeout');
});

test('esperar la confirmacion: si una lectura se cuelga y la siguiente trae la confirmacion, abre', async () => {
  let t = 0, reads = 0;
  const rpc = () => { reads += 1; return reads === 1 ? never() : Promise.resolve({ data: [{ by_device_id: 'EXT', by_label: 'x', by_kind: 'extension', age_seconds: 1, acked: true }], error: null }); };
  const result = await waitForTakeoverAck({ getClient: () => ({ rpc }), deviceId: 'EXT', kind: 'extension',
    sleep: async ms => { t += ms; }, now: () => t, limitMs: 1000, pollMs: 20, callLimitMs: 10 });
  assert.equal(result, 'acked');
  assert.equal(reads, 2);
});

test('la sesion abierta: una revision colgada se suelta y la siguiente sigue buscando el pedido', async () => {
  let reads = 0, found = null;
  const rpc = () => { reads += 1; return reads === 1 ? never() : Promise.resolve({ data: [{ by_device_id: 'EXT', by_label: 'x', by_kind: 'extension', age_seconds: 1, acked: false }], error: null }); };
  const watcher = createTakeoverWatcher({ getClient: () => ({ rpc }), deviceId: 'WEB', kind: 'web', startedAt: Date.now() - 10000,
    pollMs: 10, onTakeover: (info) => { found = info; } });
  watcher.start();
  for (let i = 0; i < 70 && !found; i += 1) await pause(100);
  watcher.stop();
  assert.ok(found, 'despues del tope de la lectura colgada, la revision encuentra el pedido');
  assert.equal(found.byKind, 'extension');
});

test('Abrir aqui con la nube colgada: la ventanita abre al acabarse el tope total', async () => {
  const nube = cloud({ hang: ['session_takeover_request', 'session_takeover_get', 'session_leave'] });
  const v = ventanita({ nube, takeoverLimitMs: 80 });
  const started = Date.now();
  assert.equal(await v.sw.gate('u1'), 'open');
  assert.ok(Date.now() - started < 1500, 'abrio rapido, sin esperar para siempre');
  assert.deepEqual(v.log, ['pregunta', 'espera']);
});

test('lo que llega tarde (despues del tope total) ya no pide, borra ni descarga nada', async () => {
  const nube = cloud();
  let descargas = 0;
  const v = ventanita({ nube, mark: { saved: true, resume: true }, takeoverLimitMs: 40,
    announce: async () => { await pause(150); return true; }, yieldCloud: async () => { descargas += 1; return true; } });
  assert.equal(await v.sw.gate('u1'), 'open');
  await pause(300);
  assert.equal(nube.calls.includes('session_takeover_request'), false, 'no pidio el traspaso despues de abrir');
  assert.equal(descargas, 0, 'no bajo datos de la nube despues de abrir');
  assert.ok(v.mark(), 'la marca queda para intentarlo la proxima vez');
});

test('bajar los datos de la nube con tope: si no contesta abre igual, deja la marca y la descarga tardia no se aplica', async () => {
  const sinOtros = { getClient: () => ({ rpc: async () => ({ data: [], error: null }) }) };
  let permiso = null;
  const v = ventanita({ nube: sinOtros, mark: { saved: true, resume: false }, yieldLimitMs: 40,
    yieldCloud: (userId, opts) => { permiso = opts.canApply; return never(); } });
  const started = Date.now();
  assert.equal(await v.sw.gate('u1'), 'open');
  assert.ok(Date.now() - started < 1500);
  assert.ok(v.mark(), 'la marca no se borra si no se pudo bajar lo de la nube');
  assert.equal(permiso(), false, 'una descarga que llegue tarde ya no puede aplicarse');
});

test('bajar los datos de la nube a tiempo: se borra la marca como siempre', async () => {
  const sinOtros = { getClient: () => ({ rpc: async () => ({ data: [], error: null }) }) };
  const v = ventanita({ nube: sinOtros, mark: { saved: true, resume: false }, yieldCloud: async (userId, opts) => opts.canApply() });
  assert.equal(await v.sw.gate('u1'), 'open');
  assert.equal(v.mark(), null);
});

test('borrar notas muertas: varias sin contestar cuestan UN tope, no uno por nota', async () => {
  const started = Date.now();
  const count = await dropNotes({ getClient: () => ({ rpc: never }), instances: ['A', 'B', 'C', 'D', 'E'], timeoutMs: 60 });
  assert.equal(count, 0);
  assert.ok(Date.now() - started < 250, 'en paralelo: ~60 ms y no ~300 ms');
});
