import test from 'node:test';
import assert from 'node:assert/strict';
import { installProfileWorkspace } from '../extension/propio-bridge/workspace-profile.js';

function fixture({ normal = [{ id: 1, type: 'normal' }], preference, readDefault = async () => true, launchers = [] } = {}) {
  const local = preference === undefined ? {} : { 'workspace-profile-enabled': preference };
  const session = {}, changes = [], listeners = {};
  const windows = [...normal];
  const event = name => ({ addListener: listener => { listeners[name] = listener; } });
  const storage = data => ({
    get: async key => ({ [key]: data[key] }),
    set: async values => Object.assign(data, values),
    remove: async key => { delete data[key]; }
  });
  const api = {
    runtime: {
      getURL: page => `chrome-extension://fixture/${page}`,
      getContexts: async () => launchers.map(tab => ({ contextType: 'TAB', tabId: tab.id, documentUrl: tab.url, incognito: tab.incognito || false })),
      onStartup: event('startup')
    },
    storage: { local: storage(local), session: storage(session) },
    windows: { getAll: async () => windows.map(window => ({ ...window })), onCreated: event('created'), onRemoved: event('removed') },
    tabs: {
      query: async () => { throw new Error('Tab URL metadata is unavailable without extra permissions'); },
      create: async values => { changes.push({ kind: 'create', ...values }); return { id: 4, ...values }; },
      update: async (id, values) => { changes.push({ kind: 'update', id, ...values }); Object.assign(launchers.find(tab => tab.id === id), values); }
    }
  };
  const install = () => installProfileWorkspace(api, { readDefault });
  return { api, local, session, windows, changes, launchers, handlers: install(), install, listeners };
}

test('profile startup creates one own workspace page without requiring workday hours', async () => {
  const f = fixture();
  assert.equal((await f.handlers.startup()).status, 'opened');
  assert.deepEqual(f.changes, [{ kind: 'create', windowId: 1, url: 'chrome-extension://fixture/workspace.html#profile', active: false }]);
  assert.equal(f.local['workspace-profile-enabled'], true);
});
test('a new tracker window and repeated profile events do not recursively launch workspaces', async () => {
  const f = fixture(); await f.handlers.startup();
  await f.handlers.created({ id: 2, type: 'normal' }); await f.handlers.startup();
  assert.equal(f.changes.length, 1);
});
test('simultaneous startup and first window events serialize to one preparation', async () => {
  const f = fixture();
  await Promise.all([f.handlers.created({ id: 1, type: 'normal' }), f.handlers.startup()]);
  assert.equal(f.changes.length, 1);
});
test('worker restart preserves the prepared profile session', async () => {
  const f = fixture(); await f.handlers.startup();
  const restarted = f.install(); await restarted.created({ id: 2, type: 'normal' });
  assert.equal(f.changes.length, 1);
});
test('closing only one window does not reset the remaining workspace', async () => {
  const f = fixture(); await f.handlers.startup(); await f.handlers.removed();
  await f.handlers.created({ id: 2, type: 'normal' }); assert.equal(f.changes.length, 1);
});
test('closing every normal window and reopening prepares the profile again', async () => {
  const f = fixture(); await f.handlers.startup(); f.windows.length = 0;
  await f.handlers.removed(); f.windows.push({ id: 2, type: 'normal' });
  await f.handlers.created(f.windows[0]); assert.equal(f.changes.length, 2);
});
test('background profile with no window waits until a user opens a normal window', async () => {
  const f = fixture({ normal: [] }); assert.equal((await f.handlers.startup()).status, 'no-window');
  assert.equal(f.changes.length, 0); f.windows.push({ id: 2, type: 'normal' });
  await f.handlers.created(f.windows[0]); assert.equal(f.changes.length, 1);
});
test('incognito windows and popup windows do not trigger a workspace', async () => {
  const f = fixture();
  await f.handlers.created({ id: 2, type: 'normal', incognito: true });
  await f.handlers.created({ id: 3, type: 'popup' }); assert.equal(f.changes.length, 0);
});
test('Windows launch page is reused and changed to profile mode without another tab', async () => {
  const f = fixture({ launchers: [{ id: 8, url: 'chrome-extension://fixture/workspace.html#startup' }] });
  assert.equal((await f.handlers.startup()).status, 'reused');
  assert.deepEqual(f.changes, [{ kind: 'update', id: 8, url: 'chrome-extension://fixture/workspace.html#profile' }]);
});
test('an existing profile launcher is reused without navigation', async () => {
  const f = fixture({ launchers: [{ id: 8, url: 'chrome-extension://fixture/workspace.html#profile' }] });
  assert.equal((await f.handlers.startup()).status, 'reused'); assert.equal(f.changes.length, 0);
});
test('explicitly disabled choice survives an enabled installation default', async () => {
  const f = fixture({ preference: false }); assert.equal((await f.handlers.startup()).status, 'disabled');
  assert.equal(f.changes.length, 0); assert.equal(f.local['workspace-profile-enabled'], false);
});
test('public installation defaults to no automatic workspace and profile state stays isolated', async () => {
  const jonathan = fixture(); const ocio = fixture({ readDefault: async () => false });
  await jonathan.handlers.startup(); await ocio.handlers.startup();
  assert.equal(jonathan.changes.length, 1); assert.equal(ocio.changes.length, 0);
});
test('failure to create a tab releases preparation so a later window can retry', async () => {
  const f = fixture(); const create = f.api.tabs.create;
  f.api.tabs.create = async () => { throw new Error('transient failure'); };
  await assert.rejects(f.handlers.startup(), /transient failure/);
  f.api.tabs.create = create; await f.handlers.created({ id: 2, type: 'normal' });
  assert.equal(f.changes.length, 1);
});
