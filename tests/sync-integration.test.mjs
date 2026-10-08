import { ui, translateText, translateMarkup, displayLocale } from '../js/i18n.js';
import { applySavedColors } from '../js/appearance-colors.js';
import { LANGUAGE_PREFERENCE_KEY, PENDING_LOGIN_LANGUAGE_KEY, normalizeLanguage, readLanguagePreference, saveLanguagePreference, readPendingLoginLanguage, clearPendingLoginLanguage } from '../js/language-preference.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../js/sync.js', import.meta.url), 'utf8')
  .replace(/^import .*;\r?$/gm, '')
  .replace(/\bexport (?=(?:async )?(?:function|const))/g, '')
  .replace(/^export \{ DATA_SCHEMA_VERSION \};\r?$/gm, '');

function harness({ cloud = null, callRows = null, callsError = null, callsPageError = null, maxRows = 1000, cloudAfter = cloud, includeCount = true } = {}) {
  const values = new Map(), sessionValues = new Map(), requests = [], timers = new Map(), events = [];
  let timerId = 0;
  let cloudReads = 0;
  const context = vm.createContext({ ui, translateText, translateMarkup, displayLocale, applySavedColors,
    LANGUAGE_PREFERENCE_KEY, PENDING_LOGIN_LANGUAGE_KEY, normalizeLanguage, readLanguagePreference, saveLanguagePreference, readPendingLoginLanguage, clearPendingLoginLanguage,
    Date, Math, JSON, Map, Set, Promise, Error, navigator: { userAgent: 'Audit', platform: 'Audit' },
    DATA_SCHEMA_VERSION: 2, SUPABASE_URL: 'https://audit.invalid', SUPABASE_ANON_KEY: 'audit',
    window: { localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key),
    }, sessionStorage: {
      getItem: (key) => sessionValues.get(key) ?? null,
      setItem: (key, value) => sessionValues.set(key, value), removeItem: (key) => sessionValues.delete(key),
    } },
    setTimeout: (fn, delay) => { timers.set(++timerId, { fn, delay }); return timerId; },
    clearTimeout: (id) => timers.delete(id),
    getSupabase: () => ({
      rpc: (name, payload) => new Promise((resolve) => requests.push({ name, payload, resolve })),
      from: (table) => ({ select: () => ({ eq: () => {
        if (table !== 'calls') return { maybeSingle: async () => ({ data: cloudReads++ ? cloudAfter : cloud, error: null }) };
        const rows = callRows ?? cloud?.calls?.map((payload) => ({ payload })) ?? [];
        const query = {
          order: () => query,
          range: async (from, to) => ({ data: rows.slice(from, Math.min(to + 1, from + maxRows)), count: includeCount ? rows.length : null, error: from ? callsPageError : callsError }),
          then: (resolve, reject) => Promise.resolve({ data: rows.slice(0, 1000), error: callsError }).then(resolve, reject),
        };
        return query;
      } }) }),
    }),
  });
  vm.runInContext(source, context);
  vm.runInContext("onSync((type) => auditEvents.push(type));", Object.assign(context, { auditEvents: events }));
  return { values, sessionValues, requests, timers, events, run: (code) => vm.runInContext(code, context) };
}

test('un fallo de lectura de llamadas no descarga el snapshot antiguo ni altera datos locales', async () => {
  const cloud = { state: { cloud: true }, calls: [], settings: {}, updated_at: 'cloud-base' };
  for (const callsError of [
    { message: 'Failed to fetch' },
    { code: '42501', message: 'permission denied for table calls' },
    { code: '57014', message: 'canceling statement due to statement timeout' },
  ]) {
    const h = harness({ cloud, callsError });
    h.run("writeLocalSnapshot({state:{keep:true},calls:[{id:'keep'}],settings:{goal:25}}); adoptLocal('audit');");
    const before = new Map(h.values);
    await assert.rejects(h.run("fetchCloud('audit')"), (error) => error === callsError);
    if (!callsError.code) {
      const decision = await h.run("resolveBoot('audit')");
      assert.equal(decision.offline, true);
      assert.equal(decision.cloud, undefined);
    } else await assert.rejects(h.run("resolveBoot('audit')"), (error) => error === callsError);
    assert.deepEqual(h.values, before);
  }
});

test('la compatibilidad antigua se limita a una tabla de llamadas ausente', async () => {
  const cloud = { state: {}, calls: [{ id: 'legacy' }], settings: {}, updated_at: 'cloud-base' };
  for (const code of ['42P01', 'PGRST205']) {
    const h = harness({ cloud, callsError: { code, message: 'calls table missing' } });
    const result = await h.run("fetchCloud('audit')");
    assert.equal(result.calls[0].id, 'legacy');
  }
  const h = harness({ cloud, callRows: [{ payload: { id: 'normalized' } }] });
  const result = await h.run("fetchCloud('audit')");
  assert.equal(result.calls.length, 1);
  assert.equal(result.calls[0].id, 'normalized');
});

test('descargar cien mil llamadas conserva cantidad e identificadores en cien páginas', async () => {
  const rows = Array.from({ length: 100000 }, (_, i) => ({ payload: { id: `stress-${String(i).padStart(6, '0')}`, durationMin: 1, pay: '0.12' } }));
  const h = harness({ cloud: { state: {}, settings: {}, calls: [], updated_at: 'large-base' }, callRows: rows });
  const snapshot = await h.run("fetchCloud('audit')");
  assert.equal(snapshot.calls.length, 100000);
  assert.equal(new Set(snapshot.calls.map(c => c.id)).size, 100000);
  assert.equal(snapshot.calls[99999].id, 'stress-099999');
});

test('la descarga recupera todo el historial de más de mil llamadas', async () => {
  const callRows = Array.from({ length: 2505 }, (_, index) => ({ payload: { id: `call-${String(index).padStart(5, '0')}` } }));
  const h = harness({ cloud: { state: {}, calls: [], settings: {}, updated_at: 'cloud-base' }, callRows });
  const result = await h.run("fetchCloud('audit')");
  assert.equal(result.calls.length, 2505);
  assert.equal(result.calls.at(-1).id, 'call-02504');
});

test('la descarga respeta un límite de API menor al tamaño de página', async () => {
  const callRows = Array.from({ length: 505 }, (_, index) => ({ payload: { id: `call-${index}` } }));
  const h = harness({ cloud: { state: {}, calls: [], settings: {}, updated_at: 'cloud-base' }, callRows, maxRows: 200 });
  assert.equal((await h.run("fetchCloud('audit')")).calls.length, 505);
});

test('sin conteo la descarga sigue hasta una página vacía aunque la API limite las filas', async () => {
  const callRows = Array.from({ length: 505 }, (_, index) => ({ payload: { id: `call-${index}` } }));
  const h = harness({ cloud: { state: {}, calls: [], settings: {}, updated_at: 'cloud-base' }, callRows, maxRows: 200, includeCount: false });
  const result = await h.run("fetchCloud('audit')");
  assert.equal(result.calls.length, 505);
  assert.equal(result.calls.at(-1).id, 'call-504');
});

test('un error de la RPC vigente no utiliza la escritura antigua ni confirma los cambios', async () => {
  const h = harness();
  h.run("writeLocalSnapshot({state:{keep:true},calls:[{id:'keep'}],settings:{}}); adoptLocal('audit');");
  const pending = h.run('pushSnapshot()');
  const error = { code: '42501', message: 'permission denied for function push_user_data_v2' };
  h.requests[0].resolve({ data: null, error });
  await new Promise((resolve) => setImmediate(resolve));
  if (h.requests[1]) h.requests[1].resolve({ data: { updated_at: 'legacy-saved' }, error: null });
  const result = await pending;
  assert.equal(h.requests.length, 1);
  assert.equal(result.error, error);
  assert.equal(h.run('readMeta().dirty'), true);
});

test('la escritura antigua sigue disponible únicamente cuando falta la RPC vigente', async () => {
  for (const code of ['42883', 'PGRST202']) {
    const h = harness();
    h.run("writeLocalSnapshot({state:{keep:true},calls:[{id:'keep'}],settings:{}}); adoptLocal('audit');");
    const pending = h.run('pushSnapshot()');
    h.requests[0].resolve({ data: null, error: { code, message: 'push_user_data_v2 not found' } });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(h.requests[1].name, 'push_user_data');
    assert.equal(h.requests[1].payload.p_calls[0].id, 'keep');
    h.requests[1].resolve({ data: { updated_at: 'legacy-base' }, error: null });
    assert.equal((await pending).error, undefined);
    assert.equal(h.run('readMeta().dirty'), false);
  }
});

test('un fallo en la segunda página no adopta ni confirma un historial incompleto', async () => {
  const error = { message: 'Failed to fetch page 2' };
  const h = harness({ cloud: { state: {}, calls: [], settings: {}, updated_at: 'cloud-base' },
    callRows: Array.from({ length: 1001 }, (_, index) => ({ payload: { id: `call-${index}` } })), callsPageError: error });
  h.run("writeLocalSnapshot({state:{keep:true},calls:[{id:'keep'}],settings:{}}); adoptLocal('audit');");
  const before = new Map(h.values);
  await assert.rejects(h.run("resolveBoot('audit')"), (caught) => caught === error);
  assert.deepEqual(h.values, before);
});

test('una actualización de nube durante la descarga no mezcla estado antiguo con llamadas nuevas', async () => {
  const h = harness({ cloud: { state: { old: true }, calls: [], settings: {}, updated_at: 'old-base' },
    cloudAfter: { updated_at: 'new-base' }, callRows: [{ payload: { id: 'new-call' } }] });
  h.run("writeLocalSnapshot({state:{keep:true},calls:[{id:'keep'}],settings:{}}); adoptLocal('audit');");
  const before = new Map(h.values);
  await assert.rejects(h.run("resolveBoot('audit')"), /Cloud snapshot changed/);
  assert.deepEqual(h.values, before);
});

test('cambios durante una subida conservan dirty y se envían en el siguiente delta', async () => {
  const h = harness();
  h.run("writeLocalSnapshot({state:{v:1},calls:[{id:'first'}],settings:{goal:10}}); adoptLocal('audit');");
  const first = h.run('pushSnapshot()');
  assert.equal(h.requests[0].payload.p_call_upserts.length, 1);
  h.run("window.localStorage.setItem(APP_KEYS.calls, JSON.stringify([{id:'first'},{id:'second'}])); markDirty();");
  h.requests[0].resolve({ data: { updated_at: '2026-09-30T12:00:00Z' }, error: null });
  await first;
  assert.equal(h.run('readMeta().dirty'), true);
  assert.ok([...h.timers.values()].some((timer) => timer.delay === 6000));
  const second = h.run('pushSnapshot()');
  assert.equal(h.requests[1].payload.p_call_upserts.length, 1);
  assert.equal(h.requests[1].payload.p_call_upserts[0].id, 'second');
  assert.equal(h.requests[1].payload.p_expected_updated_at, '2026-09-30T12:00:00Z');
  h.requests[1].resolve({ data: { updated_at: '2026-09-30T12:00:10Z' }, error: null });
  await second;
  assert.equal(h.run('readMeta().dirty'), false);
});

test('un conflicto conserva los cambios locales y un error permite reintentar sin omitir llamadas', async () => {
  const h = harness();
  h.run("writeLocalSnapshot({state:{v:1},calls:[{id:'call'}],settings:{}}); adoptLocal('audit');");
  const conflict = h.run('pushSnapshot()');
  h.requests[0].resolve({ data: { conflict: true, updated_at: 'other-device' }, error: null });
  assert.equal((await conflict).conflict, true);
  assert.equal(h.run('readMeta().dirty'), true);
  const failed = h.run('pushSnapshot()');
  h.requests[1].resolve({ data: null, error: { message: 'Offline' } });
  assert.ok((await failed).error);
  assert.equal(h.run('readMeta().dirty'), true);
  const retry = h.run('pushSnapshot()');
  assert.equal(h.requests[2].payload.p_call_upserts[0].id, 'call');
  h.requests[2].resolve({ data: { updated_at: 'synced' }, error: null });
  await retry;
  assert.equal(h.run('readMeta().dirty'), false);
});

test('retirar el laboratorio conserva el snapshot real y elimina solo sus cuatro claves de prueba', () => {
  const h = harness();
  h.run("writeLocalSnapshot({state:{real:true},calls:[{id:'real-call'}],settings:{goal:25}}); adoptLocal('audit');");
  const before = new Map(h.values);
  h.run("for (const key of ['propio_qa_session_v1','propio_qa_state_v1','propio_qa_calls_v1','propio_qa_settings_v1']) window.localStorage.setItem(key, JSON.stringify({fake:true}));");
  assert.equal(h.run('retireLegacyQaStorage()'), true);
  assert.deepEqual(h.values, before);
  assert.equal(h.run('activeAppKeys().state'), h.run('APP_KEYS.state'));
  assert.equal(h.run('readLocalSnapshot().calls[0].id'), 'real-call');
  assert.equal(h.requests.length, 0);
});

test('una clave QA antigua ilegible o imposible de borrar nunca selecciona datos simulados', () => {
  const h = harness();
  h.run("writeLocalSnapshot({state:{real:true},calls:[{id:'real-call'}],settings:{}}); window.localStorage.setItem('propio_qa_session_v1', '{bad json'); window.localStorage.removeItem = () => { throw new Error('Denied'); };");
  const before = new Map(h.values);
  assert.equal(h.run('retireLegacyQaStorage()'), false);
  assert.deepEqual(h.values, before);
  assert.equal(h.run('readLocalSnapshot().calls[0].id'), 'real-call');
  assert.equal(h.run('activeAppKeys().state'), h.run('APP_KEYS.state'));
});

test('elegir idioma en login no crea datos locales ni cambia la decisión de descargar la nube', async () => {
  const cloud = { state: { marker: 'cloud' }, calls: [{ id: 'cloud-call' }], settings: { language: 'en' }, updated_at: 'cloud-base' };
  const h = harness({ cloud });
  const before = await h.run("resolveBoot('audit')");
  assert.equal(before.action, h.run('BOOT.USE_CLOUD'));
  h.run("saveLanguagePreference('es', {pendingLogin:true, storage:window.localStorage, session:window.sessionStorage});");
  assert.equal(h.run('localHasData()'), false);
  assert.equal(h.values.has(h.run('APP_KEYS.settings')), false);
  assert.equal((await h.run("resolveBoot('audit')")).action, before.action);
  const fresh = harness();
  fresh.run("saveLanguagePreference('es', {pendingLogin:true, storage:window.localStorage, session:window.sessionStorage});");
  assert.equal((await fresh.run("resolveBoot('audit')")).action, fresh.run('BOOT.FRESH'));
});

test('la selección explícita ES del login prevalece sobre nube EN conservando datos y base de sincronización', () => {
  const h = harness();
  h.run("saveLanguagePreference('es', {pendingLogin:true, storage:window.localStorage, session:window.sessionStorage}); adoptCloud({state:{marker:'cloud'},calls:[{id:'keep'}],settings:{language:'en',theme:'dark',goal:25},updated_at:'cloud-base'},'audit');");
  const before = h.run('JSON.stringify(readLocalSnapshot())');
  h.run('applyLoginLanguagePreference()');
  const snapshot = JSON.parse(h.run('JSON.stringify(readLocalSnapshot())'));
  const expected = JSON.parse(before);
  expected.settings.language = 'es';
  assert.deepEqual(snapshot, expected);
  assert.equal(h.run('readMeta().userId'), 'audit');
  assert.equal(h.run('readMeta().lastSyncedUpdatedAt'), 'cloud-base');
  assert.equal(h.run('readMeta().dirty'), true);
  assert.equal(h.values.get(LANGUAGE_PREFERENCE_KEY), 'es');
  assert.equal(h.sessionValues.has(PENDING_LOGIN_LANGUAGE_KEY), false);
  assert.equal(h.requests.length, 0);
});

test('sin selección pendiente la nube ES se conserva y alinea el idioma público antes de recargar', () => {
  const h = harness();
  h.run("saveLanguagePreference('en', {storage:window.localStorage, session:window.sessionStorage}); adoptCloud({state:{marker:'cloud'},calls:[{id:'keep'}],settings:{language:'es',goal:25},updated_at:'cloud-base'},'audit');");
  const before = h.run('JSON.stringify(readLocalSnapshot())');
  h.run('applyLoginLanguagePreference()');
  assert.equal(h.run('JSON.stringify(readLocalSnapshot())'), before);
  assert.equal(h.values.get(LANGUAGE_PREFERENCE_KEY), 'es');
  assert.equal(h.run('readMeta().dirty'), false);
  assert.equal(h.run('readMeta().lastSyncedUpdatedAt'), 'cloud-base');
  h.run('applyLoginLanguagePreference()');
  assert.equal(h.run('JSON.stringify(readLocalSnapshot())'), before);
  assert.equal(h.run('readMeta().dirty'), false);
});

test('cambiar de cuenta retira datos anteriores sin perder la elección pendiente del login', () => {
  const h = harness();
  h.run("writeLocalSnapshot({state:{old:true},calls:[{id:'old-account-call'}],settings:{language:'en'}}); adoptLocal('old-user'); saveLanguagePreference('es', {pendingLogin:true, storage:window.localStorage, session:window.sessionStorage}); resetForUser('new-user');");
  assert.equal(h.run('localHasData()'), false);
  assert.equal(h.run('readPendingLoginLanguage(window.sessionStorage)'), 'es');
  h.run("adoptCloud({state:{new:true},calls:[{id:'new-account-call'}],settings:{language:'en',goal:10},updated_at:'new-base'},'new-user'); applyLoginLanguagePreference();");
  assert.equal(h.run('readLocalSnapshot().state.new'), true);
  assert.equal(h.run('readLocalSnapshot().state.old'), undefined);
  assert.equal(h.run('readLocalSnapshot().calls[0].id'), 'new-account-call');
  assert.equal(h.run('readLocalSnapshot().settings.language'), 'es');
  assert.equal(h.run('readMeta().userId'), 'new-user');
  assert.equal(h.run('readMeta().lastSyncedUpdatedAt'), 'new-base');
});

test('cuota insuficiente conserva selección pendiente, ajustes y metadata para reintentar', () => {
  const h = harness();
  h.run("saveLanguagePreference('es', {pendingLogin:true, storage:window.localStorage, session:window.sessionStorage}); adoptCloud({state:{keep:true},calls:[{id:'keep'}],settings:{language:'en',goal:25},updated_at:'cloud-base'},'audit');");
  const before = new Map(h.values), pending = new Map(h.sessionValues);
  h.run("const successfulSet = window.localStorage.setItem; window.localStorage.setItem = (key,value) => { if (key === APP_KEYS.settings) throw new Error('QuotaExceededError'); successfulSet(key,value); };");
  assert.throws(() => h.run('applyLoginLanguagePreference()'));
  assert.deepEqual(h.values, before);
  assert.deepEqual(h.sessionValues, pending);
  h.run('window.localStorage.setItem = successfulSet; applyLoginLanguagePreference();');
  assert.equal(h.run('readLocalSnapshot().settings.language'), 'es');
  assert.equal(h.run('readMeta().dirty'), true);
  assert.equal(h.sessionValues.has(PENDING_LOGIN_LANGUAGE_KEY), false);
});
