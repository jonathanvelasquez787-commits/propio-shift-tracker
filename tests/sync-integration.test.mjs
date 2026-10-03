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

function harness({ cloud = null } = {}) {
  const values = new Map(), sessionValues = new Map(), requests = [], timers = new Map(), events = [];
  let timerId = 0;
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
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: cloud, error: null }) }) }) }),
    }),
  });
  vm.runInContext(source, context);
  vm.runInContext("onSync((type) => auditEvents.push(type));", Object.assign(context, { auditEvents: events }));
  return { values, sessionValues, requests, timers, events, run: (code) => vm.runInContext(code, context) };
}

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
