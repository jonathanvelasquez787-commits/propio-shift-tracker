import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { ui, translateText, translateMarkup, displayLocale } from '../js/i18n.js';

const source = fs.readFileSync(new URL('../js/sync.js', import.meta.url), 'utf8')
  .replace(/^import .*;\r?$/gm, '').replace(/\bexport (?=(?:async )?(?:function|const))/g, '')
  .replace(/^export \{ DATA_SCHEMA_VERSION \};\r?$/gm, '');

function harness({ values = new Map(), online = true, cloud = null } = {}) {
  const requests = [], handlers = {}, timers = new Map(), events = [];
  let nextTimer = 0, reads = 0, rpcHook = null, readHook = null;
  class Storage {
    getItem(key) { return values.get(key) ?? null; }
    setItem(key, value) { values.set(key, String(value)); }
    removeItem(key) { values.delete(key); }
  }
  const storage = new Storage();
  const backend = {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'account-a', email: 'a@example.invalid' }, access_token: 'token-a' } } }),
      onAuthStateChange: fn => { handlers.auth = fn; } },
    from(table) {
      const query = { select: () => query, eq: () => query, order: () => query,
        maybeSingle: async () => { reads++; if (readHook) await readHook(reads); if (!online) throw new TypeError('Failed to fetch'); return { data: cloud, error: null }; },
        range: async (from, to) => ({ data: (cloud?.calls || []).slice(from, to + 1).map(payload => ({ call_id: String(payload.id), payload })), count: cloud?.calls?.length || 0, error: null }) };
      return query;
    },
    async rpc(name, payload) {
      requests.push({ name, payload });
      if (rpcHook) await rpcHook();
      if (!online) return { error: { message: 'Failed to fetch' } };
      if (cloud && payload.p_expected_updated_at && cloud.updated_at !== payload.p_expected_updated_at) return { data: { conflict: true, updated_at: cloud.updated_at } };
      const calls = new Map((cloud?.calls || []).map(call => [String(call.id), call]));
      payload.p_call_upserts.forEach(call => calls.set(String(call.id), call));
      payload.p_call_deletes.forEach(id => calls.delete(id));
      cloud = { state: payload.p_state, settings: payload.p_settings, calls: [...calls.values()], updated_at: 'revision-2' };
      return { data: { ok: true, updated_at: cloud.updated_at } };
    },
  };
  const context = vm.createContext({ ui, translateText, translateMarkup, displayLocale,
    DATA_SCHEMA_VERSION: 2, SUPABASE_URL: 'https://audit.invalid', SUPABASE_ANON_KEY: 'synthetic',
    Storage, window: { localStorage: storage, addEventListener: (name, fn) => { handlers[name] = fn; } },
    document: { addEventListener: (name, fn) => { handlers[name] = fn; } },
    navigator: { onLine: online, userAgent: 'Audit' }, getSupabase: () => backend,
    setTimeout: (fn, delay) => { timers.set(++nextTimer, { fn, delay }); return nextTimer; }, clearTimeout: id => timers.delete(id),
    auditEvents: events, fetch: (...args) => { requests.push({ exit: args }); return Promise.resolve(); },
  });
  vm.runInContext(source, context);
  vm.runInContext('onSync(type => auditEvents.push(type))', context);
  return { run: code => vm.runInContext(code, context), context, values, requests, timers, events,
    cloud: () => cloud, reads: () => reads, online: value => { online = value; context.navigator.onLine = value; },
    hook: fn => { rpcHook = fn; }, readHook: fn => { readHook = fn; }, handlers };
}

const initialCloud = () => ({ state: { saved: true }, settings: {}, calls: [{ id: 'keep' }, { id: 'delete' }], updated_at: 'revision-1' });

test('a saved full reset removes prior cloud calls and a fresh session cannot bring them back', async () => {
  const h=harness({cloud:initialCloud()});
  h.run(`adoptCloud(${JSON.stringify(initialCloud())},'account-a'); startAutoSync();`);
  h.run("window.localStorage.setItem(APP_KEYS.state,'{}'); window.localStorage.setItem(APP_KEYS.calls,'[]'); window.localStorage.setItem(APP_KEYS.settings,JSON.stringify({productiveGoalMin:360,onboarded:false}));");
  assert.equal((await h.run('pushSnapshot()')).ok,true);
  assert.deepEqual([...h.requests.at(-1).payload.p_call_deletes],['keep','delete']);
  assert.deepEqual(h.cloud().calls,[]);
  const fresh=harness({cloud:h.cloud()});
  const decision=await fresh.run("resolveBoot('account-a')");
  assert.equal(decision.action,'use-cloud');
  fresh.run(`adoptCloud(${JSON.stringify(decision.cloud)},'account-a');`);
  assert.equal(fresh.run('readLocalSnapshot().calls.length'),0);
  assert.equal(fresh.run('readLocalSnapshot().settings.onboarded'),false);
});

test('sharing a browser identity does not authorize an older divergent tab to overwrite newer cloud calls', async () => {
  const first=harness({cloud:initialCloud()});
  first.run(`adoptCloud(${JSON.stringify(initialCloud())},'account-a'); deviceId(); markDirty();`);
  const newer={...initialCloud(),calls:[{id:'keep'},{id:'delete'},{id:'newer-tab'}],updated_at:'revision-2',device_id:first.run('deviceId()')};
  const reopened=harness({values:first.values,cloud:newer});
  const decision=await reopened.run("resolveBoot('account-a')");
  assert.equal(decision.action,'conflict');
  assert.equal(reopened.requests.length,0);
  assert.deepEqual(reopened.cloud().calls,newer.calls);
});

test('offline reopening and deleting a saved call sends its deletion after reconnecting without another reload', async () => {
  const first = harness({ cloud: initialCloud() });
  first.run(`adoptCloud(${JSON.stringify(initialCloud())}, 'account-a')`);
  const reopened = harness({ values: first.values, cloud: initialCloud(), online: false });
  const decision = await reopened.run("resolveBoot('account-a')");
  assert.equal(decision.offline, true);
  reopened.run("adoptLocal('account-a'); startAutoSync(); window.localStorage.setItem(APP_KEYS.calls, JSON.stringify([{id:'keep'}]));");
  reopened.online(true);
  await reopened.run('pushSnapshot()');
  assert.deepEqual(reopened.cloud().calls.map(call => call.id), ['keep']);
  assert.equal(reopened.run('readMeta().dirty'), false);
  assert.deepEqual([...reopened.requests.at(-1).payload.p_call_deletes], ['delete']);
});

test('changing account then adopting the downloaded cloud keeps the baseline for call deletion', async () => {
  const h = harness({ cloud: initialCloud() });
  h.run("writeMeta({userId:'previous-account'});");
  const decision = await h.run("resolveBoot('account-a')");
  assert.equal(decision.action, 'other-account');
  h.run(`resetForUser('account-a'); adoptCloud(${JSON.stringify(decision.cloud)},'account-a'); startAutoSync(); window.localStorage.setItem(APP_KEYS.calls,JSON.stringify([{id:'keep'}]));`);
  await h.run('pushSnapshot()');
  assert.deepEqual(h.cloud().calls.map(call => call.id), ['keep']);
});

test('a late response for the previous account cannot mark the new account clean or change its base', async () => {
  const h = harness({ cloud: initialCloud() });
  h.run(`adoptCloud(${JSON.stringify(initialCloud())},'account-a'); setAccessToken('token-a', 'account-a'); markDirty();`);
  h.hook(async () => { h.run("resetForUser('account-b'); writeLocalSnapshot({state:{newAccount:true},calls:[{id:'b'}],settings:{}}); adoptLocal('account-b',null); setAccessToken('token-b','account-b');"); });
  await h.run('pushSnapshot()');
  assert.equal(h.run('readMeta().userId'), 'account-b');
  assert.equal(h.run('readMeta().dirty'), true);
  assert.equal(h.run('readMeta().lastSyncedUpdatedAt'), new Date(0).toISOString());
  assert.equal(h.events.includes('pushed'), false);
});

test('changing authentication identity blocks a pending snapshot from being sent as the next account', async () => {
  const h = harness({ cloud: initialCloud() });
  h.run(`adoptCloud(${JSON.stringify(initialCloud())},'account-a'); setAccessToken('token-a','account-a'); markDirty(); setAccessToken('token-b','account-b');`);
  await h.run('pushSnapshot()');
  assert.equal(h.requests.length, 0);
  h.run('flushOnExit()');
  assert.equal(h.requests.length, 0);
  assert.equal(h.run('readMeta().dirty'), true);
});

test('an offline reconnect against a later cloud revision preserves the other device and reports conflict', async () => {
  const first = harness({ cloud: initialCloud() });
  first.run(`adoptCloud(${JSON.stringify(initialCloud())},'account-a')`);
  const newer = { ...initialCloud(), calls: [{ id: 'newer' }], updated_at: 'later-revision' };
  const h = harness({ values: first.values, cloud: newer, online: false });
  await h.run("resolveBoot('account-a')");
  h.run("adoptLocal('account-a'); writeLocalSnapshot({state:{local:true},calls:[],settings:{}}); markDirty();");
  h.online(true);
  const result = await h.run('pushSnapshot()');
  assert.equal(result.conflict, true);
  assert.deepEqual(h.cloud(), newer);
  assert.equal(h.run('readMeta().dirty'), true);
});

const bootSource = fs.readFileSync(new URL('../js/boot.js', import.meta.url), 'utf8');
const bootBody = bootSource.slice(bootSource.indexOf('async function boot()'), bootSource.indexOf('\nboot().catch'))
  .replace("await import('./app-main.js')", '({applyPropioBridgeEvent:()=>{}})');
function bootHarness(cloud) {
  const h = harness({ cloud }), actions = [];
  const noop = () => {};
  Object.assign(h.context, { isConfigured: () => true, setBootMessage: noop, fail: message => { throw Error(message); },
    askConflict: async () => 'local', setLanguage: () => false, mountApp: async () => { actions.push('mount'); return true; },
    crypto: webcrypto, TextEncoder, installPropioBridge: () => { actions.push('bridge'); return noop; },
    normalizeAppAddress: noop, wireSyncStatus: noop, setSyncStatus: noop, getProfile: async () => ({}),
    injectAccountPanel: () => actions.push('panel'), injectDeleteAccount: noop, injectCycleProjection: noop,
    injectRecoveryCopies: noop, readOfflineOwner: () => null, watchProductionHealth: noop,
  });
  h.context.window.location = { replace: () => actions.push('redirect'), reload: noop };
  h.run('applyLoginLanguagePreference = () => {}; applyLightThemeDefault = () => {}; syncThemeClass = () => {};');
  return { ...h, actions, boot: () => h.run(bootBody + '\nboot()'),
    changeAccount: () => h.handlers.auth('SIGNED_IN', { user: { id: 'account-b' }, access_token: 'token-b' }) };
}

test('switching authentication while cloud is loading aborts the previous account before adoption and mount', async () => {
  const h = bootHarness(initialCloud());
  h.run(`adoptCloud(${JSON.stringify(initialCloud())},'account-a')`);
  const before = new Map(h.values);
  h.readHook(async read => { if (read === 1) h.changeAccount(); });
  await h.boot();
  assert.deepEqual(h.values, before);
  assert.deepEqual(h.actions, ['redirect']);
  assert.equal(h.requests.length, 0);
});

test('switching account while the conflict prompt is open cannot adopt or upload the old selection', async () => {
  const h = bootHarness({ ...initialCloud(), updated_at: 'different-revision' });
  h.run(`adoptCloud(${JSON.stringify(initialCloud())},'account-a'); writeLocalSnapshot({state:{localChanges:true},calls:[{id:'keep'}],settings:{}}); markDirty();`);
  const before = new Map(h.values);
  h.context.askConflict = async () => { h.changeAccount(); return 'local'; };
  await h.boot();
  assert.deepEqual(h.values, before);
  assert.deepEqual(h.actions, ['redirect']);
  assert.equal(h.requests.length, 0);
});

test('refreshing a token for the same account keeps its pending upload available', async () => {
  const h = bootHarness(initialCloud());
  h.run(`adoptCloud(${JSON.stringify(initialCloud())},'account-a');`);
  h.context.mountApp = async () => { h.handlers.auth('TOKEN_REFRESHED', { user: { id: 'account-a' }, access_token: 'token-a-new' }); return true; };
  await h.boot();
  assert.equal(h.requests.length, 1);
  assert.equal(h.run('readMeta().dirty'), false);
  assert.equal(h.actions.includes('redirect'), false);
});

const workerSource = fs.readFileSync(new URL('../js/service-worker.js', import.meta.url), 'utf8');
function workerHarness() {
  const handlers = {}, entries = new Map([['https://tracker.invalid/app', new Response('valid-app')]]), deleted = [], waits = [];
  let network = new Response('server-error', { status: 503 });
  const cache = { match: async key => entries.get(typeof key === 'string' ? key : key.url), put: async (key, response) => entries.set(key.url, response) };
  vm.runInNewContext(workerSource, { __BUILD_VERSION__: 'audit', URL, Response,
    self: { location: { origin: 'https://tracker.invalid' }, addEventListener: (type, fn) => { handlers[type] = fn; }, skipWaiting() {}, clients: { claim() {} } },
    caches: { open: async () => cache, keys: async () => ['propio-old', 'propio-audit', 'other-feature'], delete: async key => { deleted.push(key); } },
    fetch: async () => { if (network instanceof Error) throw network; return network; },
  });
  return { deleted, offline: () => { network = new TypeError('Failed to fetch'); },
    async fetch() { let result; handlers.fetch({ request: { method: 'GET', mode: 'navigate', url: 'https://tracker.invalid/app' }, respondWith: promise => { result = promise; } }); return await result; },
    async activate() { handlers.activate({ waitUntil: promise => { waits.push(promise); } }); await Promise.all(waits); } };
}

test('a failed server navigation does not replace the cached app needed for a later offline reopening', async () => {
  const h = workerHarness();
  assert.equal((await h.fetch()).status, 503);
  h.offline();
  assert.equal(await (await h.fetch()).text(), 'valid-app');
});

test('worker activation retires only this app caches and preserves another cache on the same origin', async () => {
  const h = workerHarness(); await h.activate();
  assert.deepEqual(h.deleted, ['propio-old']);
});

test('cloud adoption cannot replace a snapshot if its ownership metadata cannot be persisted', () => {
  const h = harness();
  h.run("writeLocalSnapshot({state:{previous:true},calls:[{id:'previous'}],settings:{}}); adoptLocal('previous-account'); const nativeSet = window.localStorage.setItem; window.localStorage.setItem = function(key,value) { if (key === 'propio_sync_meta_v1') throw Error('QuotaExceededError'); nativeSet.call(this,key,value); };");
  const before = new Map(h.values);
  assert.throws(() => h.run(`adoptCloud(${JSON.stringify(initialCloud())},'account-a')`), /QuotaExceeded/);
  assert.deepEqual(h.values, before);
});

test('failed snapshot hydration restores its previous metadata along with its previous data', () => {
  const h = harness();
  h.run("writeLocalSnapshot({state:{previous:true},calls:[{id:'previous'}],settings:{}}); adoptLocal('previous-account'); const nativeSet = window.localStorage.setItem; window.localStorage.setItem = function(key,value) { if (key === APP_KEYS.calls && value.includes('delete')) throw Error('QuotaExceededError'); nativeSet.call(this,key,value); };");
  const before = new Map(h.values);
  assert.throws(() => h.run(`adoptCloud(${JSON.stringify(initialCloud())},'account-a')`));
  assert.deepEqual(h.values, before);
});

test('local adoption reports failed ownership persistence instead of silently starting the app', () => {
  const h = harness();
  h.run("writeLocalSnapshot({state:{previous:true},calls:[{id:'previous'}],settings:{}}); adoptLocal('previous-account'); const nativeSet = window.localStorage.setItem; window.localStorage.setItem = function(key,value) { if (key === 'propio_sync_meta_v1') throw Error('QuotaExceededError'); nativeSet.call(this,key,value); };");
  const before = new Map(h.values);
  assert.throws(() => h.run("adoptLocal('account-a',null)"), /QuotaExceeded/);
  assert.deepEqual(h.values, before);
});

test('a delayed acknowledgement cannot regress a newer sync revision persisted by another tab', async () => {
  const h = harness({ cloud: initialCloud() });
  h.run(`adoptCloud(${JSON.stringify(initialCloud())},'account-a'); markDirty();`);
  h.hook(async () => { h.run("writeMeta({lastSyncedUpdatedAt:'newer-tab-revision',dirty:true});"); });
  await h.run('pushSnapshot()');
  assert.equal(h.run('readMeta().lastSyncedUpdatedAt'), 'newer-tab-revision');
  assert.equal(h.run('readMeta().dirty'), true);
  assert.equal(h.events.includes('pushed'), false);
});

test('an old tab refreshes its call baseline when another tab advanced the shared revision', async () => {
  const h = harness({ cloud: { ...initialCloud(), calls: [{ id: 'keep' }, { id: 'delete' }, { id: 'added-by-tab' }], updated_at: 'revision-3' } });
  h.run(`adoptCloud(${JSON.stringify(initialCloud())},'account-a'); writeMeta({lastSyncedUpdatedAt:'revision-3',dirty:true}); writeLocalSnapshot({state:{saved:true},calls:[{id:'keep'},{id:'delete'}],settings:{}});`);
  await h.run('pushSnapshot()');
  assert.deepEqual(h.cloud().calls.map(call => call.id), ['keep','delete']);
  assert.deepEqual([...h.requests.at(-1).payload.p_call_deletes], ['added-by-tab']);
});
