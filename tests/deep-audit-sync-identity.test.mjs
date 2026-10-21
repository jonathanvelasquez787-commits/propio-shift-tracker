import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { ui, translateText, translateMarkup, displayLocale } from '../js/i18n.js';

const syncSource = fs.readFileSync(new URL('../js/sync.js', import.meta.url), 'utf8')
  .replace(/^import .*;\r?$/gm, '').replace(/\bexport (?=(?:async )?(?:function|const))/g, '')
  .replace(/^export \{ DATA_SCHEMA_VERSION \};\r?$/gm, '');
const bootSource = fs.readFileSync(new URL('../js/boot.js', import.meta.url), 'utf8');
const deletionSource = bootSource.slice(bootSource.indexOf('function injectDeleteAccount('), bootSource.indexOf('\n// ---------------------------------------------------------------------------', bootSource.indexOf('function injectDeleteAccount(')));
const offlineSource = bootSource.slice(bootSource.indexOf('async function mountOfflineApp('), bootSource.indexOf('\nfunction watchProductionHealth('));
const bootBody = bootSource.slice(bootSource.indexOf('async function boot()'), bootSource.indexOf('\nboot().catch'))
  .replace("await import('./app-main.js')", '({applyPropioBridgeEvent:()=>{}})');
const mountSource = bootSource.slice(bootSource.indexOf('async function mountApp('), bootSource.indexOf('// Barra de cuenta'))
  .replace("await import('./app-main.js')", 'await loadApp()');

function syncHarness() {
  const values = new Map();
  const cloud = { state: { remote: true }, calls: [{ id: 'remote' }], settings: {}, updated_at: 'remote-revision' };
  let readHook = () => {};
  const backend = { auth: { getSession: async () => ({ data: { session: { user: { id: 'account-a' }, access_token: 'synthetic' } } }), onAuthStateChange() {} }, from(table) {
    const query = { select: () => query, eq: () => query, order: () => query,
      maybeSingle: async () => { readHook(); return { data: cloud, error: null }; },
      range: async () => ({ data: cloud.calls.map(payload => ({ payload })), count: cloud.calls.length, error: null }) };
    return query;
  } };
  const context = vm.createContext({ ui, translateText, translateMarkup, displayLocale,
    DATA_SCHEMA_VERSION: 2, window: { localStorage: {
      getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key),
    } }, navigator: { onLine: true }, getSupabase: () => backend,
    setTimeout: () => 1, clearTimeout() {},
  });
  vm.runInContext(syncSource, context);
  const run = source => vm.runInContext(source, context);
  run("adoptCloud({state:{old:true},calls:[{id:'old'}],settings:{},updated_at:'old-revision'},'account-a');");
  return { run, values, context, hook(fn) { readHook = fn; } };
}

test('boot observes pending edits saved by another tab during the cloud read and asks about divergence', async () => {
  const h = syncHarness();
  let edited = false;
  h.hook(() => {
    if (edited) return;
    edited = true;
    h.run("writeLocalSnapshot({state:{newLocal:true},calls:[{id:'new-local'}],settings:{}}); writeMeta({dirty:true});");
  });
  const decision = await h.run("resolveBoot('account-a')");
  assert.equal(decision.action, 'conflict');
  assert.equal(h.run('readLocalSnapshot().calls[0].id'), 'new-local');
  assert.equal(h.run('readMeta().dirty'), true);
});

test('boot recognizes ownership changed by another tab while downloading and preserves its pending snapshot', async () => {
  const h = syncHarness();
  let edited = false;
  h.hook(() => {
    if (edited) return;
    edited = true;
    h.run("writeLocalSnapshot({state:{otherAccount:true},calls:[{id:'other-account-call'}],settings:{}}); writeMeta({userId:'account-b',dirty:true});");
  });
  const decision = await h.run("resolveBoot('account-a')");
  assert.equal(decision.action, 'other-account');
  h.run('resetForUser("account-a")');
  assert.equal(h.run('listRecoveryCopies("account-b")[0].snapshot.calls[0].id'), 'other-account-call');
});

function deletionHarness({ owner = 'account-a', sessionOwner = owner, sessionError = null, responseOk = true,
  failRecoveryCleanup = false, failSnapshotCleanup = false, changeOwnerDuringDelete = false, rejectSession = false } = {}) {
  const actions = [], requests = [];
  let localOwner = owner, currentUserId = owner;
  let click, confirmation;
  const button = { addEventListener: (_event, handler) => { click = handler; } };
  const card = { querySelector: () => ({}), insertBefore() {}, appendChild() {} };
  const context = vm.createContext({ ui, translateText, translateMarkup, displayLocale,
    MutationObserver: class { observe() {} disconnect() {} },
    document: { querySelector: () => card, createElement: () => ({}), getElementById: () => button },
    window: { addEventListener() {}, appConfirm: (_message, handler) => { confirmation = handler; }, location: { replace: url => actions.push(`redirect:${url}`) }, toast: text => actions.push(`toast:${text}`) },
    getSupabase: () => ({ auth: { getSession: async () => {
      if (rejectSession) throw Error('Failed to fetch');
      return { data: { session: { user: { id: sessionOwner }, access_token: `token-${sessionOwner}` } }, error: sessionError };
    } } }),
    fetch: async (url, options) => {
      requests.push({ url, options });
      if (changeOwnerDuringDelete) { localOwner = 'account-b'; currentUserId = 'account-b'; }
      return { ok: responseOk };
    },
    forgetRecoveryCopies: id => { actions.push(`forget:${id}`); if (failRecoveryCleanup) throw Error('QuotaExceededError'); },
    resetForUser: id => { actions.push(`reset:${id}`); if (failSnapshotCleanup) throw Error('StorageDenied'); },
    readMeta: () => ({ userId: localOwner }), getCurrentUserId: () => currentUserId,
    setAccessToken: (token, id) => actions.push(`retire:${token}:${id}`), signOut: async () => actions.push('signout'),
  });
  vm.runInContext(deletionSource, context);
  vm.runInContext(`injectDeleteAccount(${JSON.stringify(owner)}, getCurrentUserId)`, context);
  return { actions, requests, async confirm() { click(); await confirmation(); } };
}

test('successful account deletion clears the correct local recovery owner and finishes logout and redirect', async () => {
  const h = deletionHarness();
  await h.confirm();
  assert.equal(h.requests.length, 1);
  assert.deepEqual(h.actions, ['forget:account-a', 'reset:null', 'retire:null:null', 'signout', 'redirect:/?cuenta=borrada']);
});

test('account deletion confirmation cannot delete a different account signed in while the dialog was open', async () => {
  const h = deletionHarness({ sessionOwner: 'account-b' });
  await h.confirm();
  assert.equal(h.requests.length, 0);
  assert.deepEqual(h.actions, ['redirect:/']);
});

test('a failed delete request preserves local data and session for retry', async () => {
  const h = deletionHarness({ responseOk: false });
  await h.confirm();
  assert.equal(h.requests.length, 1);
  assert.equal(h.actions.length, 1);
  assert.ok(h.actions[0].startsWith('toast:'));
});

test('successful remote deletion still retires identity and logs out when recovery cleanup hits quota', async () => {
  const h = deletionHarness({ failRecoveryCleanup: true });
  await h.confirm();
  assert.deepEqual(h.actions, ['forget:account-a', 'reset:null', 'retire:null:null', 'signout', 'redirect:/?cuenta=borrada']);
});

test('successful remote deletion still retires identity and logs out when local snapshot cleanup fails', async () => {
  const h = deletionHarness({ failSnapshotCleanup: true });
  await h.confirm();
  assert.deepEqual(h.actions, ['forget:account-a', 'reset:null', 'retire:null:null', 'signout', 'redirect:/?cuenta=borrada']);
});

test('an account switch during DELETE leaves the new account snapshot and authentication untouched', async () => {
  const h = deletionHarness({ changeOwnerDuringDelete: true });
  await h.confirm();
  assert.equal(h.requests.length, 1);
  assert.deepEqual(h.actions, ['forget:account-a', 'redirect:/']);
});

test('cached offline identity cannot mount data assigned to another account during the session refresh', async () => {
  const actions = [];
  const context = vm.createContext({ ui, translateText, translateMarkup, displayLocale,
    readMeta: () => ({ userId: 'account-b' }), localHasData: () => true,
    setAccessToken: () => actions.push('token'), applyLoginLanguagePreference: () => actions.push('language'), syncThemeClass() {}, startAutoSync() {},
    mountApp: async () => { actions.push('mount'); return false; },
    setAppEntryHint: enabled => actions.push(`entry:${enabled}`),
    window: { location: { replace: url => actions.push(`redirect:${url}`) } },
  });
  vm.runInContext(offlineSource, context);
  await vm.runInContext("mountOfflineApp({id:'account-a',email:'a@example.invalid'})", context);
  assert.deepEqual(actions, ['entry:false', 'redirect:/?next=/app']);
});

test('session lookup failure before deletion reports a retryable failure without deleting or clearing data', async () => {
  for (const options of [{ rejectSession: true }, { sessionError: Error('Session refresh failed') }]) {
    const h = deletionHarness(options);
    await h.confirm();
    assert.equal(h.requests.length, 0);
    assert.equal(h.actions.length, 1);
    assert.ok(h.actions[0].startsWith('toast:'));
  }
});

for (const nextOwner of ['account-a', 'account-b']) {
  test(`conflict selection does not overwrite concurrent ${nextOwner} data saved while the prompt was open`, async () => {
    const h = syncHarness(), actions = [], noop = () => {};
    h.run('writeMeta({dirty:true})');
    Object.assign(h.context, { isConfigured: () => true, setBootMessage: noop, readOfflineOwner: () => null,
      fail: message => { throw Error(message); }, setLanguage: () => false,
      askConflict: async () => {
        h.run(`writeLocalSnapshot({state:{concurrent:true},calls:[{id:'concurrent'}],settings:{}}); writeMeta({userId:${JSON.stringify(nextOwner)},dirty:true});`);
        return 'cloud';
      }, mountApp: async () => { actions.push('mount'); return false; },
    });
    h.context.window.location = { reload: () => actions.push('reload'), replace: url => actions.push(`redirect:${url}`) };
    h.run('startAutoSync = () => {}; applyLoginLanguagePreference = () => {}; applyLightThemeDefault = () => {}; syncThemeClass = () => {};');
    await h.run(bootBody + '\nboot()');
    assert.deepEqual(actions, ['reload']);
    assert.equal(h.run('readMeta().userId'), nextOwner);
    assert.equal(h.run('readLocalSnapshot().calls[0].id'), 'concurrent');
  });
}

for (const choice of ['local', 'cloud']) {
  test(`legacy owner null can choose ${choice} for unchanged pending data without reloading forever`, async () => {
    const h = syncHarness(), actions = [], noop = () => {};
    h.run('writeMeta({userId:null,dirty:true})');
    Object.assign(h.context, { isConfigured: () => true, setBootMessage: noop, readOfflineOwner: () => null,
      fail: message => { throw Error(message); }, setLanguage: () => false, askConflict: async () => choice,
      mountApp: async () => { actions.push('mount'); return false; },
    });
    h.context.window.location = { reload: () => actions.push('reload'), replace: url => actions.push(`redirect:${url}`) };
    h.run('startAutoSync = () => {}; applyLoginLanguagePreference = () => {}; applyLightThemeDefault = () => {}; syncThemeClass = () => {};');
    await h.run(bootBody + '\nboot()');
    assert.deepEqual(actions, ['mount']);
    assert.equal(h.run('readMeta().userId'), 'account-a');
    assert.equal(h.run('readLocalSnapshot().calls[0].id'), choice === 'local' ? 'old' : 'remote');
  });
}

test('a delayed app import cannot reveal a snapshot reassigned to another account while the boot gate was open', async () => {
  const actions = [];
  let owner = 'account-a';
  const context = vm.createContext({ ui, translateText, translateMarkup, displayLocale,
    readMeta: () => ({ userId: owner }), setAppEntryHint: enabled => actions.push(`entry:${enabled}`),
    document: { body: { classList: { add: name => actions.push(`add:${name}`), remove: name => actions.push(`remove:${name}`) } } },
    overlay: { remove: () => actions.push('reveal') },
    window: { location: { replace: url => actions.push(`redirect:${url}`) } },
    loadApp: async () => { owner = 'account-b'; },
  });
  vm.runInContext(mountSource, context);
  assert.equal(await vm.runInContext("mountApp('account-a')", context), false);
  assert.equal(actions.includes('reveal'), false);
  assert.ok(actions.includes('redirect:/?next=/app'));
});
