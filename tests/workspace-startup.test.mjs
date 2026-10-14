import test from 'node:test';
import assert from 'node:assert/strict';
import { arrangeWorkspace, workspaceBounds } from '../extension/propio-bridge/workspace.js';

const screen = { availWidth: 1920, availHeight: 1040, availLeft: 0, availTop: 0 };
const opts = { at: Date.parse('2026-10-14T12:00:00Z'), wait: async () => {} };
function fake(existing = []) {
  let nextTab = 100, nextWindow = 20, nextSplit = 1;
  const tabs = new Map([{ id: 99, windowId: 9, index: 0, url: 'chrome-extension://test/workspace.html' }, ...existing].map(tab => [tab.id, { pinned: false, groupId: -1, splitViewId: -1, ...tab }]));
  const windows = new Map([...tabs.values()].map(tab => [tab.windowId, { id: tab.windowId, type: 'normal' }]));
  const storage = {}, mutations = [];
  function renumber(windowId) {
    [...tabs.values()].filter(tab => tab.windowId === windowId).sort((a, b) => a.index - b.index).forEach((tab, index) => { tab.index = index; });
  }
  const api = {
    storage: { session: {
      get: async key => ({ [key]: storage[key] }),
      set: async data => Object.assign(storage, data),
      remove: async key => { delete storage[key]; }
    } },
    tabs: {
      getCurrent: async () => ({ ...tabs.get(99) }),
      get: async id => ({ ...tabs.get(id) }),
      query: async ({ url }) => [...tabs.values()].filter(tab => tab.url?.startsWith(url.slice(0, -1))).map(tab => ({ ...tab })),
      create: async properties => {
        mutations.push(['create', properties]);
        const tab = { id: nextTab++, index: tabs.size, pinned: false, groupId: -1, splitViewId: -1, ...properties };
        tabs.set(tab.id, tab); renumber(tab.windowId); return { ...tab };
      },
      update: async (id, properties) => { mutations.push(['update', id, properties]); Object.assign(tabs.get(id), properties); return { ...tabs.get(id) }; },
      ungroup: async id => { tabs.get(id).groupId = -1; },
      move: async (ids, properties) => {
        mutations.push(['move', ids, properties]);
        [...tabs.values()].filter(tab => tab.windowId === properties.windowId && !ids.includes(tab.id)).forEach(tab => { tab.index += ids.length; });
        ids.forEach((id, index) => Object.assign(tabs.get(id), { windowId: properties.windowId, index: properties.index + index }));
        renumber(properties.windowId); return ids.map(id => ({ ...tabs.get(id) }));
      },
      unsplit: async split => { mutations.push(['unsplit', split]); [...tabs.values()].filter(tab => tab.splitViewId === split).forEach(tab => { tab.splitViewId = -1; }); },
      createSplit: async ids => {
        const [left, right] = ids.map(id => tabs.get(id));
        assert.equal(right.windowId, left.windowId); assert.equal(right.index, left.index + 1);
        assert.equal(left.splitViewId, -1); assert.equal(right.splitViewId, -1);
        assert.equal(left.groupId, right.groupId); assert.equal(left.pinned, right.pinned);
        mutations.push(['split', ids]); left.splitViewId = right.splitViewId = nextSplit++;
      }
    },
    windows: {
      create: async properties => {
        const window = { id: nextWindow++, type: 'normal', ...properties }; windows.set(window.id, window);
        mutations.push(['window-create', properties]);
        if (properties.tabId) {
          const tab = tabs.get(properties.tabId); assert.equal(tab.splitViewId, -1); tab.windowId = window.id; tab.index = 0;
          window.tabs = [{ ...tab }];
        } else window.tabs = [await api.tabs.create({ windowId: window.id, url: properties.url })];
        return window;
      },
      update: async (id, properties) => { mutations.push(['window-update', id, properties]); Object.assign(windows.get(id), properties); }
    }
  };
  return { api, tabs, windows, storage, mutations };
}
const portal = { id: 1, windowId: 1, index: 0, url: 'https://interpreters.propio-ls.com/portal' };
const interpreter = { id: 2, windowId: 2, index: 1, url: 'https://app.useinterpreter.com/' };
const tracker = { id: 3, windowId: 2, index: 0, url: 'https://propio-shift-tracker.vercel.app/' };

test('automatic workspace startup works at any hour with no workday gate', async () => {
  for (const time of ['11:44:59', '11:45:00', '12:00:00', '19:59:59', '20:00:00', '00:00:00']) {
    const f = fake([portal, interpreter, tracker]);
    assert.equal((await arrangeWorkspace(f.api, screen, { ...opts, at: Date.parse(`2026-10-14T${time}Z`) })).status, 'ready', time);
  }
});
test('two windows cover work area, including monitors with negative coordinates', () => {
  const bounds = workspaceBounds({ ...screen, availLeft: -1920 });
  assert.equal(bounds.left.width, 1280); assert.equal(bounds.right.width, 640);
  assert.equal(bounds.left.left, -1920); assert.equal(bounds.right.left, -640);
  assert.throws(() => workspaceBounds({ availWidth: 600, availHeight: 400 }));
});
test('reboot screenshot: moves existing interpreter into native split, reuses tracker', async () => {
  const other = { id: 4, windowId: 1, index: 1, url: 'chrome://settings/onStartup' };
  const f = fake([portal, interpreter, tracker, other]);
  const result = await arrangeWorkspace(f.api, screen, opts);
  assert.equal(result.status, 'ready'); assert.equal(f.tabs.get(2).windowId, 1);
  assert.equal(f.tabs.get(1).splitViewId, f.tabs.get(2).splitViewId);
  assert.equal(f.windows.get(1).width, 1280); assert.equal(f.windows.get(2).left, 1280);
  assert.equal(f.mutations.filter(m => m[0] === 'create').length, 0);
  assert.equal(f.tabs.get(4).url, other.url);
});
test('fresh browser creates exactly three work pages', async () => {
  const f = fake(); await arrangeWorkspace(f.api, screen, opts);
  assert.equal(f.mutations.filter(m => m[0] === 'create').length, 3);
  assert.equal([...f.tabs.values()].filter(tab => tab.url === tracker.url).length, 1);
});
test('all work tabs in one window moves tracker into separate right window', async () => {
  const f = fake([portal, { ...interpreter, windowId: 1, index: 1 }, { ...tracker, windowId: 1, index: 2 }]);
  await arrangeWorkspace(f.api, screen, opts);
  assert.notEqual(f.tabs.get(1).windowId, f.tabs.get(3).windowId);
  assert.equal(f.tabs.get(1).windowId, f.tabs.get(2).windowId);
});
test('existing split is preserved on repeated launches without duplicate pages', async () => {
  const f = fake([{ ...portal, splitViewId: 10 }, { ...interpreter, windowId: 1, index: 1, splitViewId: 10 }, tracker]);
  await arrangeWorkspace(f.api, screen, opts); await arrangeWorkspace(f.api, screen, opts);
  assert.equal(f.mutations.filter(m => ['create', 'split', 'unsplit'].includes(m[0])).length, 0);
});
test('duplicate tracker accounts stop before mutations and release lock', async () => {
  const f = fake([portal, tracker, { ...tracker, id: 5, windowId: 3 }]);
  await assert.rejects(arrangeWorkspace(f.api, screen, opts), /varias pestañas/);
  assert.equal(f.mutations.length, 0); assert.deepEqual(f.storage, {});
});
test('existing pins and groups are normalized before splitting', async () => {
  const f = fake([{ ...portal, pinned: true }, { ...interpreter, groupId: 4 }, tracker]);
  await arrangeWorkspace(f.api, screen, opts);
  assert.equal(f.tabs.get(1).pinned, false); assert.equal(f.tabs.get(2).groupId, -1);
});
test('incorrect tracker/portal split is separated before moving either window', async () => {
  const f = fake([{ ...portal, splitViewId: 7 }, interpreter, { ...tracker, windowId: 1, index: 1, splitViewId: 7 }]);
  await arrangeWorkspace(f.api, screen, opts);
  assert.equal(f.tabs.get(3).splitViewId, -1);
  assert.equal(f.tabs.get(1).splitViewId, f.tabs.get(2).splitViewId);
});
test('missing native API fails before changing user tabs', async () => {
  const f = fake([portal, interpreter, tracker]); delete f.api.tabs.createSplit;
  await assert.rejects(arrangeWorkspace(f.api, screen, opts), /155/); assert.equal(f.mutations.length, 0);
});
test('concurrent launchers are held by active session lock', async () => {
  const f = fake([portal, interpreter, tracker]); f.storage['workday-workspace-lock'] = { owner: 'different', at: opts.at };
  const result = await arrangeWorkspace(f.api, screen, opts);
  assert.equal(result.status, 'already-running'); assert.equal(f.mutations.length, 0);
});
test('incognito work pages are not reused', async () => {
  const f = fake([{ ...tracker, incognito: true }]); await arrangeWorkspace(f.api, screen, opts);
  assert.equal(f.tabs.get(3).incognito, true);
  assert.equal(f.mutations.filter(m => m[0] === 'create').length, 3);
});
test('manual setup and automatic startup both arrange at night', async () => {
  const f = fake([portal, interpreter, tracker]);
  const result = await arrangeWorkspace(f.api, screen, { ...opts, startup: false, at: Date.parse('2026-10-14T23:00:00Z') });
  assert.equal(result.status, 'ready');
});

test('a reversed existing split is rebuilt with Propio before UseInterpreter', async () => {
  const f = fake([{ ...portal, index: 1, splitViewId: 10 }, { ...interpreter, windowId: 1, index: 0, splitViewId: 10 }, tracker]);
  await arrangeWorkspace(f.api, screen, opts);
  assert.equal(f.tabs.get(1).index, 0); assert.equal(f.tabs.get(2).index, 1);
  assert.deepEqual(f.mutations.filter(m => m[0] === 'split')[0][1], [1, 2]);
});
