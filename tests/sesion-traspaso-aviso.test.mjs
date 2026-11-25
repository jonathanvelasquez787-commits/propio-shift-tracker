import { ui, translateText, translateMarkup, displayLocale, setLanguage, currentLanguage } from '../js/i18n.js';
import { applySavedColors } from '../js/appearance-colors.js';
import { LANGUAGE_PREFERENCE_KEY, PENDING_LOGIN_LANGUAGE_KEY, normalizeLanguage, readLanguagePreference, saveLanguagePreference, readPendingLoginLanguage, clearPendingLoginLanguage } from '../js/language-preference.js';
import { createSessionSwitch, createGateScreens, readPauseMark, writePauseMark, clearPauseMark, PAUSE_MARK_KEY } from '../js/session-switch.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const syncSource = fs.readFileSync(new URL('../js/sync.js', import.meta.url), 'utf8')
  .replace(/^import .*;\r?$/gm, '')
  .replace(/\bexport (?=(?:async )?(?:function|const))/g, '')
  .replace(/^export \{ DATA_SCHEMA_VERSION \};\r?$/gm, '');

function syncHarness({ cloud = null } = {}) {
  const values = new Map(), requests = [], events = [];
  const context = vm.createContext({ ui, translateText, translateMarkup, displayLocale, applySavedColors,
    LANGUAGE_PREFERENCE_KEY, PENDING_LOGIN_LANGUAGE_KEY, normalizeLanguage, readLanguagePreference, saveLanguagePreference, readPendingLoginLanguage, clearPendingLoginLanguage,
    Date, Math, JSON, Map, Set, Promise, Error, navigator: { userAgent: 'Audit', platform: 'Audit' },
    DATA_SCHEMA_VERSION: 2, SUPABASE_URL: 'https://audit.invalid', SUPABASE_ANON_KEY: 'audit',
    window: { localStorage: { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) },
      sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} } },
    setTimeout, clearTimeout,
    getSupabase: () => ({
      rpc: (name, payload) => new Promise(resolve => requests.push({ name, payload, resolve })),
      from: table => ({ select: () => ({ eq: () => {
        if (table !== 'calls') return { maybeSingle: async () => ({ data: cloud, error: null }) };
        const rows = (cloud?.calls || []).map(payload => ({ call_id: String(payload.id), payload }));
        const query = { order: () => query, range: async (from, to) => ({ data: rows.slice(from, to + 1), count: rows.length, error: null }),
          then: (resolve, reject) => Promise.resolve({ data: rows, error: null }).then(resolve, reject) };
        return query;
      } }) }),
    }) });
  vm.runInContext(syncSource, context);
  vm.runInContext('onSync((type) => auditEvents.push(type));', Object.assign(context, { auditEvents: events }));
  return { values, requests, events, run: code => vm.runInContext(code, context) };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
const SNAP = { state: { a: 1 }, calls: [{ id: 'c1', pay: '0.12' }], settings: { goal: 45 } };
const withBase = (extra = {}) => ({ ...SNAP, updated_at: '2026-11-24T10:00:00Z', ...extra });

// ---- sync.js: pausa ----

test('pauseSync: una pagina en pausa no sube nada y no se recarga por conflictos de la nube', async () => {
  const h = syncHarness({ cloud: withBase() });
  h.run(`adoptCloud(${JSON.stringify(withBase())}, 'u1'); markDirty(); pauseSync();`);
  assert.equal(h.run('isSyncPaused()'), true);
  const result = await h.run('pushSnapshot()');
  assert.equal(result.skipped, true);
  assert.equal(h.requests.length, 0);
  h.run("emit('conflict', {}); emit('cloud-changed', {});");
  assert.equal(h.events.includes('conflict'), false);
  assert.equal(h.events.includes('cloud-changed'), false);
  assert.equal((await h.run('checkCloudOnReturn({ minGapMs: 0 })')).skipped, true);
});

test('settleForTakeover: sin cambios pendientes queda guardado; con cambios sube una ultima vez', async () => {
  const clean = syncHarness({ cloud: withBase() });
  clean.run(`adoptCloud(${JSON.stringify(withBase())}, 'u1');`);
  assert.equal((await clean.run('settleForTakeover()')).saved, true);
  assert.equal(clean.requests.length, 0);

  const dirty = syncHarness({ cloud: withBase() });
  dirty.run(`adoptCloud(${JSON.stringify(withBase())}, 'u1'); markDirty();`);
  const pending = dirty.run('settleForTakeover()');
  await tick(); await tick();
  assert.equal(dirty.requests.length, 1);
  assert.equal(dirty.requests[0].name, 'push_user_data_v2');
  dirty.requests[0].resolve({ data: { updated_at: '2026-11-24T10:05:00Z' }, error: null });
  assert.equal((await pending).saved, true);
  assert.equal(dirty.run('readMeta().dirty'), false);
});

test('settleForTakeover: si la nube responde conflicto o falla, NO queda guardado (y no se recarga)', async () => {
  const h = syncHarness({ cloud: withBase() });
  h.run(`adoptCloud(${JSON.stringify(withBase())}, 'u1'); markDirty();`);
  const pending = h.run('settleForTakeover()');
  await tick(); await tick();
  h.requests[0].resolve({ data: { conflict: true, updated_at: '2026-11-24T10:09:00Z' }, error: null });
  assert.equal((await pending).saved, false);
  assert.equal(h.events.includes('conflict'), false);
});

test('settleForTakeover sin subir (pedido viejo): solo pausa y no manda nada a la nube', async () => {
  const h = syncHarness({ cloud: withBase() });
  h.run(`adoptCloud(${JSON.stringify(withBase())}, 'u1'); markDirty();`);
  assert.equal((await h.run('settleForTakeover({ push: false })')).saved, false);
  assert.equal(h.requests.length, 0);
  assert.equal(h.run('isSyncPaused()'), true);
});

test('yieldToCloud: baja lo de la nube y lo sin subir queda en copias recuperables', async () => {
  const newer = withBase({ state: { a: 2 }, updated_at: '2026-11-24T11:00:00Z' });
  const h = syncHarness({ cloud: newer });
  h.run(`adoptCloud(${JSON.stringify(withBase())}, 'u1'); localStorage = window.localStorage; markDirty();`);
  h.run("window.localStorage.setItem('propio_shift_tracker_state_es_v4', JSON.stringify({ a: 'cambio local' }));");
  assert.equal(await h.run("yieldToCloud('u1')"), true);
  assert.equal(h.run('readMeta().dirty'), false);
  assert.equal(h.run('readMeta().lastSyncedUpdatedAt'), newer.updated_at);
  assert.equal(h.run("listRecoveryCopies('u1').length"), 1);
  assert.deepEqual(JSON.parse(h.values.get('propio_shift_tracker_state_es_v4')), { a: 2 });
});

test('yieldToCloud: otra cuenta no se toca y si la nube falla devuelve false', async () => {
  const other = syncHarness({ cloud: withBase() });
  other.run(`adoptCloud(${JSON.stringify(withBase())}, 'u1');`);
  assert.equal(await other.run("yieldToCloud('u2')"), true);
  assert.equal(other.run('readMeta().userId'), 'u1');
  const failing = syncHarness({ cloud: withBase() });
  failing.run(`adoptCloud(${JSON.stringify(withBase())}, 'u1');`);
  failing.run("fetchCloud = async () => { throw new Error('sin red'); };");
  assert.equal(await failing.run("yieldToCloud('u1')"), false);
});

test('yieldToCloud con permiso retirado: una descarga que llega tarde no cambia lo guardado', async () => {
  const newer = withBase({ state: { a: 2 }, updated_at: '2026-11-24T11:00:00Z' });
  const h = syncHarness({ cloud: newer });
  h.run(`adoptCloud(${JSON.stringify(withBase())}, 'u1'); localStorage = window.localStorage; markDirty();`);
  h.run("window.localStorage.setItem('propio_shift_tracker_state_es_v4', JSON.stringify({ a: 'cambio local' }));");
  assert.equal(await h.run("yieldToCloud('u1', { canApply: () => false })"), false);
  assert.equal(h.run('readMeta().dirty'), true);
  assert.equal(h.run("listRecoveryCopies('u1').length"), 0);
  assert.deepEqual(JSON.parse(h.values.get('propio_shift_tracker_state_es_v4')), { a: 'cambio local' });
});

// ---- session-switch.js: la puerta de arranque ----

function fakeClient({ others = [], takeover = null, failAll = false } = {}) {
  const calls = [];
  const state = { others, takeover };
  return { calls, state, rpc: async (name, args) => {
    calls.push({ name, args });
    if (failAll) return { data: null, error: { message: 'x' } };
    if (name === 'session_others') return { data: state.others.map(o => ({ instance: 'i', device_id: o.deviceId || 'dev_otro', label: 'Otro', kind: o.kind, age_seconds: 3 })), error: null };
    if (name === 'session_takeover_request') { state.takeover = { by_device_id: args.p_device_id, by_label: args.p_label, by_kind: args.p_kind, age_seconds: 0, acked: false }; return { error: null }; }
    if (name === 'session_takeover_get') return { data: state.takeover ? [state.takeover] : [], error: null };
    if (name === 'session_takeover_ack') { if (state.takeover) state.takeover.acked = true; return { error: null }; }
    return { data: [], error: null };
  } };
}
function switchRig({ client, mark = null, kind = 'web', yieldOk = true } = {}) {
  const log = [], store = { mark };
  const screens = {
    prompt: p => { log.push(p.cancelled ? 'prompt-cancelled' : 'prompt:' + p.otherKind); store.prompt = p; },
    waiting: () => log.push('waiting'),
    paused: p => { log.push('paused:' + p.saved); store.paused = p; },
  };
  const rig = createSessionSwitch({
    getClient: () => client, getDeviceId: () => 'dev_nuevo', getLabel: () => 'Esta PC', kind,
    readMark: () => store.mark, writeMark: m => { store.mark = m; log.push('mark:' + JSON.stringify(m)); }, clearMark: () => { store.mark = null; log.push('mark-clear'); },
    screens, settle: async ({ push }) => { log.push('settle:' + push); return { saved: rig.settleSaved !== false }; },
    yieldCloud: async () => { log.push('yield'); return yieldOk; },
    reload: () => log.push('reload'), closeWindow: () => log.push('close'),
    sleep: async () => { await tick(); }, now: (() => { let t = 0; return () => (t += 1000); })(),
  });
  return { rig, log, store };
}

test('sin otra sesion se abre normal y no se muestra ningun aviso', async () => {
  const { rig, log } = switchRig({ client: fakeClient() });
  assert.equal(await rig.gate('u1'), 'open');
  assert.deepEqual(log, []);
});

test('si la nube falla o no contesta, se abre normal (nunca se bloquea a la persona)', async () => {
  const { rig, log } = switchRig({ client: fakeClient({ others: [{ kind: 'web' }], failAll: true }) });
  assert.equal(await rig.gate('u1'), 'open');
  assert.deepEqual(log, []);
});

test('con otra sesion abierta: aviso, y "Abrir aqui" pide el traspaso, espera la confirmacion y abre', async () => {
  const client = fakeClient({ others: [{ kind: 'web' }] });
  const { rig, log, store } = switchRig({ client, kind: 'extension' });
  const opening = rig.gate('u1');
  await tick(); await tick();
  assert.deepEqual(log, ['prompt:web']);
  assert.equal(client.calls.some(c => c.name === 'session_takeover_request'), false, 'no pide nada hasta que toque Abrir aqui');
  store.prompt.onHere();
  await tick(); await tick();
  assert.equal(client.calls.filter(c => c.name === 'session_takeover_request').length, 1);
  client.state.takeover.acked = true;
  assert.equal(await opening, 'open');
  assert.deepEqual(log.slice(0, 2), ['prompt:web', 'waiting']);
});

test('si la otra sesion no confirma en 15 s se abre igual con lo de la nube', async () => {
  const client = fakeClient({ others: [{ kind: 'extension' }] });
  const { rig, log, store } = switchRig({ client });
  const opening = rig.gate('u1');
  await tick(); await tick();
  assert.deepEqual(log, ['prompt:extension']);
  store.prompt.onHere();
  assert.equal(await opening, 'open');
  assert.ok(client.calls.filter(c => c.name === 'session_takeover_get').length >= 2);
});

test('Cancelar: no se abre ni se pide nada; en la extension se cierra la ventanita; se puede volver a tocar Abrir aqui', async () => {
  const client = fakeClient({ others: [{ kind: 'web' }] });
  const { rig, log, store } = switchRig({ client, kind: 'extension' });
  const opening = rig.gate('u1');
  await tick(); await tick();
  store.prompt.onCancel();
  assert.deepEqual(log, ['prompt:web', 'prompt-cancelled', 'close']);
  assert.equal(client.calls.some(c => c.name === 'session_takeover_request'), false);
  assert.equal(store.prompt.onCancel, undefined, 'la pantalla de cancelado solo ofrece Abrir aqui');
  client.state.takeover = { by_device_id: 'dev_nuevo', by_label: 'Esta PC', by_kind: 'extension', age_seconds: 0, acked: true };
  store.prompt.onHere();
  assert.equal(await opening, 'open');
});

test('en la web, Cancelar no intenta cerrar la pestana', async () => {
  const { rig, log, store } = switchRig({ client: fakeClient({ others: [{ kind: 'extension' }] }), kind: 'web' });
  rig.gate('u1');
  await tick(); await tick();
  store.prompt.onCancel();
  assert.equal(log.includes('close'), false);
});

test('pagina que quedo en pausa mientras la otra sigue abierta: muestra la pantalla de pausa y no abre la app', async () => {
  const { rig, log, store } = switchRig({ client: fakeClient({ others: [{ kind: 'web' }] }), mark: { saved: true, resume: false } });
  assert.equal(await rig.gate('u1'), 'stay');
  assert.deepEqual(log, ['paused:true']);
  store.paused.onBack();
  assert.deepEqual(log.slice(1), ['mark:{"saved":true,"resume":true}', 'reload']);
});

test('pausa con datos sin subir: la pantalla lo dice (copias recuperables) en vez de decir que se guardo todo', async () => {
  const { rig, log } = switchRig({ client: fakeClient({ others: [{ kind: 'web' }] }), mark: { saved: false, resume: false } });
  await rig.gate('u1');
  assert.deepEqual(log, ['paused:false']);
});

test('"Volver aqui": al recargar pide el traspaso directo (sin preguntar de nuevo), baja la nube y quita la marca', async () => {
  const client = fakeClient({ others: [{ kind: 'web' }] });
  const { rig, log, store } = switchRig({ client, mark: { saved: true, resume: true } });
  const opening = rig.gate('u1');
  await tick(); await tick();
  assert.equal(log.some(l => l.startsWith('prompt')), false);
  client.state.takeover.acked = true;
  assert.equal(await opening, 'open');
  assert.deepEqual(log.filter(l => ['waiting', 'yield', 'mark-clear'].includes(l)), ['waiting', 'yield', 'mark-clear']);
  assert.equal(store.mark, null);
});

test('marca de pausa pero la otra sesion ya no esta: se baja la nube y se abre; si no se pudo, la marca se queda', async () => {
  const ok = switchRig({ client: fakeClient(), mark: { saved: true, resume: false } });
  assert.equal(await ok.rig.gate('u1'), 'open');
  assert.deepEqual(ok.log, ['yield', 'mark-clear']);
  const bad = switchRig({ client: fakeClient(), mark: { saved: true, resume: false }, yieldOk: false });
  assert.equal(await bad.rig.gate('u1'), 'open');
  assert.deepEqual(bad.log, ['yield']);
  assert.deepEqual(bad.store.mark, { saved: true, resume: false });
});

// ---- session-switch.js: la sesion que ya estaba abierta ----

function pauseRig({ settleSaved = true } = {}) {
  const client = fakeClient();
  const timers = [];
  const built = switchRig({ client });
  built.rig.settleSaved = settleSaved;
  return { ...built, client, timers };
}

test('pedido reciente: apaga el puente, sube lo ultimo, confirma al que abre y se recarga en pausa', async () => {
  const { rig, log, client } = pauseRig();
  const order = [];
  await rig.pause({ late: false, onBeforePause: () => order.push('puente') });
  assert.deepEqual(order, ['puente']);
  assert.deepEqual(log, ['settle:true', 'mark:{"saved":true,"resume":false}', 'reload']);
  assert.equal(client.calls.filter(c => c.name === 'session_takeover_ack').length, 1);
});

test('si lo ultimo NO se pudo subir, NO se confirma (el que abre espera y abre con la nube) y la marca lo dice', async () => {
  const { rig, log, client } = pauseRig({ settleSaved: false });
  await rig.pause({ late: false, onBeforePause: () => {} });
  assert.equal(client.calls.some(c => c.name === 'session_takeover_ack'), false);
  assert.deepEqual(log, ['settle:true', 'mark:{"saved":false,"resume":false}', 'reload']);
});

test('pedido viejo (pagina dormida): NO sube nada y NO confirma; solo se pausa y se recarga', async () => {
  const { rig, log, client } = pauseRig();
  await rig.pause({ late: true, onBeforePause: () => {} });
  assert.deepEqual(log, ['settle:false', 'mark:{"saved":true,"resume":false}', 'reload']);
  assert.equal(client.calls.some(c => c.name === 'session_takeover_ack'), false);
});

test('aunque apagar el puente o subir falle, la pagina igual se pausa y se recarga', async () => {
  const { rig, log } = pauseRig();
  rig.settleSaved = true;
  await rig.pause({ late: false, onBeforePause: () => { throw new Error('boom'); } });
  assert.ok(log.includes('reload'));
});

test('watch: al ver el pedido de otro navegador, pausa; los pedidos propios o anteriores a abrir la pagina no cuentan', async () => {
  const client = fakeClient();
  client.state.takeover = { by_device_id: 'dev_viejo', by_label: 'Web', by_kind: 'web', age_seconds: 1, acked: false };
  const { rig, log } = switchRig({ client, kind: 'extension' });
  const timers = [];
  const rig2 = createSessionSwitch({ getClient: () => client, getDeviceId: () => 'dev_ext', getLabel: () => 'x', kind: 'extension',
    readMark: () => null, writeMark: m => log.push('mark:' + JSON.stringify(m)), clearMark() {}, screens: {},
    settle: async ({ push }) => { log.push('settle:' + push); return { saved: true }; }, yieldCloud: async () => true,
    reload: () => log.push('reload'), setTimer: fn => { timers.push(fn); return timers.length; }, clearTimer() {}, now: () => 5000 });
  rig2.watch({ startedAt: 1000, onBeforePause: () => log.push('puente') });
  await timers.shift()();
  await tick(); await tick(); await tick();
  assert.deepEqual(log.filter(l => l !== 'mark-clear'), ['puente', 'settle:true', 'mark:{"saved":true,"resume":false}', 'reload']);
  void rig;
});

// ---- marca, pantallas y conexion con boot.js ----

test('la marca de pausa se lee, se escribe y se borra sin lanzar errores', () => {
  const store = new Map();
  const storage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) };
  assert.equal(readPauseMark(storage), null);
  assert.equal(writePauseMark({ saved: false, resume: true }, storage), true);
  assert.deepEqual(readPauseMark(storage), { saved: false, resume: true });
  clearPauseMark(storage);
  assert.equal(readPauseMark(storage), null);
  store.set(PAUSE_MARK_KEY, '{roto');
  assert.equal(readPauseMark(storage), null);
  assert.equal(writePauseMark({}, { setItem() { throw new Error('lleno'); } }), false);
});

test('las pantallas dicen lo aprobado (web / herramienta, Abrir aqui, Cancelar, Volver aqui)', () => {
  const idioma = currentLanguage();
  setLanguage('es');
  let html = '';
  const handlers = {};
  globalThis.document = { documentElement: {}, getElementById: id => (html.includes(`id="${id}"`) ? { addEventListener: (_t, fn) => { handlers[id] = fn; } } : null) };
  try {
    const screens = createGateScreens({ body: () => ({ set innerHTML(value) { html = value; } }) });
    screens.prompt({ otherKind: 'web', onHere() {}, onCancel() {} });
    assert.match(html, /Ya hay una sesión abierta/);
    assert.match(html, /Tienes Propio abierto en la web\. Si abres aquí, la web subirá su último estado y se pausará\./);
    assert.match(html, /Abrir aquí/); assert.match(html, /Cancelar/);
    assert.ok(handlers.sessionSwitchHere && handlers.sessionSwitchCancel);
    screens.prompt({ otherKind: 'extension', onHere() {}, onCancel() {} });
    assert.match(html, /abierto en la herramienta\. Si abres aquí, la herramienta subirá/);
    screens.paused({ saved: true, onBack() {} });
    assert.match(html, /Abriste Propio en otro lugar/);
    assert.match(html, /Esta sesión quedó en pausa\. Tus datos ya están guardados\./);
    assert.match(html, /Las llamadas esperan en la cola hasta que una sesión las reciba\./);
    assert.match(html, /Volver aquí/);
    screens.paused({ saved: false, onBack() {} });
    assert.match(html, /copias recuperables/);
    assert.doesNotMatch(html, /ya están guardados/);
    setLanguage('en');
    screens.prompt({ otherKind: 'web', onHere() {}, onCancel() {} });
    assert.match(html, /There is already an open session/);
    assert.match(html, /Open here/);
    screens.paused({ saved: true, onBack() {} });
    assert.match(html, /Come back here/);
  } finally { delete globalThis.document; setLanguage(idioma); }
});

test('boot.js: la puerta va antes de leer datos y la vigilancia despues de montar; nunca se cierra sesion', () => {
  const boot = fs.readFileSync(new URL('../js/boot.js', import.meta.url), 'utf8');
  assert.match(boot, /import \{ resolveSessionGate, startSessionPause \} from '\.\/session-switch\.js';/);
  const bootBody = boot.slice(boot.indexOf('async function boot()'));
  const gateAt = bootBody.indexOf('resolveSessionGate(');
  assert.ok(gateAt > bootBody.indexOf('setAccessToken(session.access_token'));
  assert.ok(gateAt < bootBody.indexOf('canOpenFast(userId)'), 'antes de la carga rapida');
  assert.ok(gateAt < bootBody.indexOf('await resolveBoot(userId)'), 'antes de leer la nube');
  const watchAt = bootBody.indexOf('startSessionPause(');
  assert.ok(watchAt > bootBody.indexOf('await mountApp(userId)') && watchAt > bootBody.indexOf('startSessionNote('));
  assert.equal(bootBody.split('resolveSessionGate(').length - 1, 1);
  assert.equal(bootBody.split('startSessionPause(').length - 1, 1);
  const switchSource = fs.readFileSync(new URL('../js/session-switch.js', import.meta.url), 'utf8');
  assert.doesNotMatch(switchSource, /signOut/);
  assert.doesNotMatch(fs.readFileSync(new URL('../extension/propio-bridge/worker-session.js', import.meta.url), 'utf8') + fs.readFileSync(new URL('../extension/propio-bridge/bridge-worker.js', import.meta.url), 'utf8'), /session-switch|session-handoff/);
});
