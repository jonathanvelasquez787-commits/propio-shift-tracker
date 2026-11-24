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
const base = '2026-10-08T10:00:00Z', newer = '2026-10-08T10:05:00Z';
const noop = () => {};

function harness({ protocol = 'chrome-extension:', dirty = false, cloudAt = base } = {}) {
  class FakeStorage { constructor(m){ this.m = m; } getItem(k){ return this.m.get(k) ?? null; } setItem(k, v){ this.m.set(k, v); } removeItem(k){ this.m.delete(k); } }
  const values = new Map(), sessionValues = new Map(), order = [];
  const storage = new FakeStorage(values);
  const session = { getItem: k => sessionValues.get(k) ?? null, setItem: (k, v) => sessionValues.set(k, v), removeItem: k => sessionValues.delete(k) };
  const cloud = () => ({ state: { remote: true }, settings: {}, calls: [{ id: 'remote' }], updated_at: cloudAt });
  const backend = { auth: { getSession: async () => ({ data: { session: { user: { id: 'audit', email: 'a@example.invalid' }, access_token: 'synthetic' } }, error: null }), onAuthStateChange: noop },
    from: table => ({ select: () => ({ eq: () => {
      if (table !== 'calls') return { maybeSingle: async () => { order.push('cloud'); return { data: cloud(), error: null }; } };
      const query = { order: () => query, range: async (from, to) => ({ data: cloud().calls.slice(from, to + 1).map(payload => ({ payload })), count: 1, error: null }) };
      return query;
    } }) }),
    rpc: async () => ({ data: { ok: true, updated_at: cloudAt }, error: null }) };
  const context = vm.createContext({ ui, translateText, translateMarkup, displayLocale, applySavedColors,
    LANGUAGE_PREFERENCE_KEY, PENDING_LOGIN_LANGUAGE_KEY, normalizeLanguage, readLanguagePreference, saveLanguagePreference, readPendingLoginLanguage, clearPendingLoginLanguage,
    Date, Math, JSON, Map, Set, Promise, Error, Storage: FakeStorage, navigator: { userAgent: 'Audit', platform: 'Audit', onLine: true },
    DATA_SCHEMA_VERSION: 2, SUPABASE_URL: 'https://audit.invalid', SUPABASE_ANON_KEY: 'audit',
    window: { localStorage: storage, sessionStorage: session, location: { protocol, replace: noop, reload: noop } },
    setTimeout: () => 1, clearTimeout: noop, getSupabase: () => backend,
    crypto: webcrypto, TextEncoder, createAutomationLease: () => ({ stop() {} }), isConfigured: () => true, setBootMessage: noop, fail: m => { throw new Error(m); },
    askConflict: async () => 'local', setLanguage: () => false,
    mountApp: async () => { order.push('mount'); await Promise.resolve(); storage.setItem('propio_shift_tracker_state_es_v4', JSON.stringify({ local: true, normalized: true })); return true; },
    installPropioBridge: () => noop, normalizeAppAddress: noop, wireSyncStatus: noop, setSyncStatus: noop, setAppEntryHint: noop,
    getProfile: async () => ({}), injectAccountPanel: noop, injectDeleteAccount: noop, injectCycleProjection: noop,
    injectRecoveryCopies: noop, readOfflineOwner: () => null, watchProductionHealth: noop, mountOfflineApp: async () => {} });
  vm.runInContext(syncSource, context);
  vm.runInContext('patchLocalStorage();', context);
  vm.runInContext('startAutoSync = () => {}; startSessionNote = () => {}; resolveSessionGate = async () => "open"; startSessionPause = () => {}; applyLoginLanguagePreference = () => {}; applyLightThemeDefault = () => {}; syncThemeClass = () => {};', context);
  vm.runInContext(`writeLocalSnapshot({state:{local:true},calls:[{id:'local'}],settings:{}}); writeMeta({userId:'audit', dirty:${dirty}, lastSyncedUpdatedAt:'${base}'});`, context);
  return { order, run: code => vm.runInContext(code, context), boot: () => vm.runInContext(bootBody + '\nboot()', context), flag: () => session.getItem('propio_slow_boot_once_v1') };
}

test('arranque rápido: lo que la app guarda sola al armarse no marca cambios sin subir', async () => {
  const h = harness();
  await h.boot();
  assert.equal(h.run('readMeta().dirty'), false);
  assert.equal(h.run('readMeta().lastLocalSaveAt'), null);
});

test('arranque rápido: sigue revisando la nube y, si cambió (ej. borrado en la web), avisa para recargar', async () => {
  const h = harness({ cloudAt: newer });
  await h.boot();
  assert.deepEqual(h.order, ['mount', 'cloud']);
  assert.equal(h.flag(), '1');
});

test('arranque rápido: un cambio del usuario después de abrir SÍ cuenta como pendiente', async () => {
  const h = harness();
  await h.boot();
  h.run("window.localStorage.setItem('propio_shift_tracker_state_es_v4', '{}')");
  assert.equal(h.run('readMeta().dirty'), true);
});
