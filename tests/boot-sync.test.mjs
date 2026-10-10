import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { ui, translateText, translateMarkup, displayLocale } from '../js/i18n.js';
import { applySavedColors } from '../js/appearance-colors.js';
import { LANGUAGE_PREFERENCE_KEY, PENDING_LOGIN_LANGUAGE_KEY, normalizeLanguage, readLanguagePreference, saveLanguagePreference, readPendingLoginLanguage, clearPendingLoginLanguage } from '../js/language-preference.js';

const syncSource = fs.readFileSync(new URL('../js/sync.js', import.meta.url), 'utf8')
  .replace(/^import .*;\r?$/gm, '').replace(/\bexport (?=(?:async )?(?:function|const))/g, '').replace(/^export \{ DATA_SCHEMA_VERSION \};\r?$/gm, '');
const bootSource = fs.readFileSync(new URL('../js/boot.js', import.meta.url), 'utf8');
const bootBody = bootSource.slice(bootSource.indexOf('async function boot()'), bootSource.indexOf('\nboot().catch'))
  .replace("await import('./app-main.js')", '({applyPropioBridgeEvent:()=>{}})');
const oldBase = '2026-10-08T10:00:00Z', observedBase = '2026-10-08T10:01:00Z', laterBase = '2026-10-08T10:02:00Z';
const noop = () => {};

function harness({ divergent = false, empty = false, absent = false, choice = 'local', race = false, readError = null, sessionError = null, cachedOwner = null, owner = 'audit', online } = {}) {
  const values = new Map(), requests = [];
  let cloud = absent ? null : { state: empty ? {} : { remote: true }, settings: {}, calls: empty ? [] : [{ id: 'remote' }], updated_at: divergent ? observedBase : oldBase };
  const storage = { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) };
  const backend = { auth: { getSession: async () => ({ data: { session: { user: { id: 'audit', email: 'audit@example.invalid' }, access_token: 'synthetic' } }, error: sessionError }), onAuthStateChange: noop },
    from: table => ({ select: () => ({ eq: () => {
      if (table !== 'calls') return { maybeSingle: async () => ({ data: readError ? null : cloud, error: readError }) };
      const query = { order: () => query, range: async (from, to) => ({ data: (cloud?.calls || []).slice(from, to + 1).map(payload => ({ payload })), count: cloud?.calls.length || 0, error: null }) };
      return query;
    } }) }),
    rpc: async (name, payload) => {
      requests.push({ name, payload });
      if (readError) return { data: null, error: readError };
      if (cloud && payload.p_expected_updated_at && payload.p_expected_updated_at !== cloud.updated_at) return { data: { conflict: true, updated_at: cloud.updated_at }, error: null };
      const calls = new Map((cloud?.calls || []).map(c => [c.id, c]));
      payload.p_call_deletes.forEach(id => calls.delete(id)); payload.p_call_upserts.forEach(c => calls.set(c.id, c));
      cloud = { state: payload.p_state, settings: payload.p_settings, calls: [...calls.values()], updated_at: laterBase };
      return { data: { ok: true, updated_at: laterBase }, error: null };
    } };
  const context = vm.createContext({ ui, translateText, translateMarkup, displayLocale, applySavedColors,
    LANGUAGE_PREFERENCE_KEY, PENDING_LOGIN_LANGUAGE_KEY, normalizeLanguage, readLanguagePreference, saveLanguagePreference, readPendingLoginLanguage, clearPendingLoginLanguage,
    Date, Math, JSON, Map, Set, Promise, Error, navigator: { userAgent: 'Audit', platform: 'Audit', onLine: online },
    DATA_SCHEMA_VERSION: 2, SUPABASE_URL: 'https://audit.invalid', SUPABASE_ANON_KEY: 'audit',
    window: { localStorage: storage, sessionStorage: storage, location: { replace: noop, reload: noop } },
    setTimeout: () => 1, clearTimeout: noop, getSupabase: () => backend,
    crypto: webcrypto, TextEncoder, isConfigured: () => true, setBootMessage: noop, fail: message => { throw new Error(message); },
    askConflict: async () => choice, setLanguage: () => false,
    mountApp: async () => { if (race) cloud = { state: { newer: true }, settings: {}, calls: [{ id: 'newer' }], updated_at: laterBase }; return true; },
    installPropioBridge: () => noop, normalizeAppAddress: noop, wireSyncStatus: noop, setSyncStatus: noop,
    getProfile: async () => ({}), injectAccountPanel: noop, injectDeleteAccount: noop, injectCycleProjection: noop,
    injectRecoveryCopies: noop, readOfflineOwner: () => cachedOwner, watchProductionHealth: noop,
    mountOfflineApp: async user => { context.offlineMounted = user.id; },
  });
  vm.runInContext(syncSource, context);
  vm.runInContext('startAutoSync = () => {}; applyLoginLanguagePreference = () => {}; applyLightThemeDefault = () => {}; syncThemeClass = () => {};', context);
  if (!empty && !absent) {
    vm.runInContext(`adoptCloud({state:{initial:true},calls:[{id:'remote'}],settings:{},updated_at:'${oldBase}'},'audit'); writeLocalSnapshot({state:{local:true},calls:[{id:'local'}],settings:{}}); markDirty();`, context);
  }
  vm.runInContext(`writeMeta({userId:${JSON.stringify(owner)}});`, context);
  return { requests, run: code => vm.runInContext(code, context), boot: () => vm.runInContext(bootBody + '\nboot()', context), cloud: () => cloud };
}

test('expired-session refresh network failure mounts only the cached local owner without an upload', async () => {
  const h = harness({ sessionError: { name:'AuthRetryableFetchError',message:'network unavailable' }, cachedOwner:{id:'audit'},online:true });
  await h.boot(); assert.equal(h.run('offlineMounted'),'audit'); assert.equal(h.requests.length,0);
  assert.equal(h.run('readLocalSnapshot().state.local'),true);
});

test('arranque local detecta una escritura entre la lectura y el montaje sin sobrescribirla', async () => {
  const h = harness({ race: true }); await h.boot();
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].payload.p_expected_updated_at, oldBase);
  assert.equal(h.cloud().state.newer, true);
  assert.equal(h.cloud().calls[0].id, 'newer');
  assert.equal(h.run('readMeta().dirty'), true);
});

test('elegir copia local en un conflicto sube contra la revisión mostrada y elimina filas remotas reemplazadas', async () => {
  const h = harness({ divergent: true }); await h.boot();
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].payload.p_expected_updated_at, observedBase);
  assert.equal(h.cloud().state.local, true);
  assert.deepEqual(h.cloud().calls.map(c => c.id), ['local']);
  assert.equal(h.run('readMeta().dirty'), false);
});

test('otra escritura posterior a elegir local vuelve a exigir resolver el conflicto', async () => {
  const h = harness({ divergent: true, race: true }); await h.boot();
  assert.equal(h.requests.length, 1);
  assert.equal(h.cloud().state.newer, true);
  assert.equal(h.run('readMeta().dirty'), true);
});

test('elegir copia de nube conserva sus datos sin subir la copia local', async () => {
  const h = harness({ divergent: true, choice: 'cloud' }); await h.boot();
  assert.equal(h.requests.length, 0);
  assert.equal(h.run('readLocalSnapshot().calls[0].id'), 'remote');
  assert.equal(h.run('readMeta().dirty'), false);
});

test('cuenta vacía conserva la revisión consultada para proteger la primera subida', async () => {
  const h = harness({ empty: true, race: true }); await h.boot();
  assert.equal(h.run('readMeta().lastSyncedUpdatedAt'), oldBase);
  await h.run('pushSnapshot()');
  assert.equal(h.cloud().state.newer, true);
});

test('snapshot ausente utiliza una base no nula y no pisa una fila creada mientras se monta', async () => {
  const h = harness({ absent: true, race: true }); await h.boot();
  assert.ok(h.run('readMeta().lastSyncedUpdatedAt'));
  await h.run('pushSnapshot()');
  assert.equal(h.cloud().state.newer, true);
});

test('sin red monta la copia de la misma cuenta y conserva su base y cambios pendientes', async () => {
  const h = harness({ readError: { message: 'TypeError: Failed to fetch', code: '' } });
  await h.boot();
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].payload.p_expected_updated_at, oldBase);
  assert.equal(h.run('readLocalSnapshot().calls[0].id'), 'local');
  assert.equal(h.run('readMeta().dirty'), true);
});

test('la señal offline del navegador abre los datos propios sin esperar una descarga', async () => {
  const h = harness({ online: false, readError: { message: 'download must not run' } });
  const decision = await h.run("resolveBoot('audit')");
  assert.equal(decision.offline, true);
  assert.equal(decision.cloud, undefined);
  assert.equal(h.run('readMeta().lastSyncedUpdatedAt'), oldBase);
});

test('sin red rechaza una copia ajena o sin propietario identificado', async () => {
  for (const owner of ['other', null]) {
    const h = harness({ owner, readError: { message: 'Failed to fetch' } });
    await assert.rejects(h.boot(), /Could not read|No se pudieron leer/);
    assert.equal(h.requests.length, 0);
    assert.equal(h.run('readLocalSnapshot().calls[0].id'), 'local');
  }
});

test('sin red no crea una cuenta vacía si no hay una copia local', async () => {
  const h = harness({ empty: true, readError: { message: 'Load failed' } });
  await assert.rejects(h.boot(), /Could not read|No se pudieron leer/);
  assert.equal(h.requests.length, 0);
});

test('fallos de permisos o servidor no se ocultan como desconexiones', async () => {
  for (const readError of [{ code: '42501', message: 'Failed to fetch' }, { code: 'PGRST301', message: 'Expired JWT' }, { message: 'Internal server error' }]) {
    const h = harness({ readError });
    await assert.rejects(h.boot(), /Could not read|No se pudieron leer/);
    assert.equal(h.requests.length, 0);
  }
});
