import test from 'node:test';
import assert from 'node:assert/strict';
import { workspaceSettingsKey, workspacePages, validateWorkspaceSettings, readWorkspaceSettings, saveWorkspaceSettings } from '../extension/propio-bridge/workspace-settings.js';
import { workspaceBounds } from '../extension/propio-bridge/workspace.js';

const settings = () => ({ version: 1, pages: { ...workspacePages }, openOnProfileStart: false, passive: true, rightPaneHeightRatio: .61, rightPaneWidthRatio: .32 });
function fixture({ fail = false } = {}) {
  const store = { 'bridge-v1': { calls: ['preserved'], preparation: { spacing: { enabled: true, minutes: 4 } } }, personal: 'preserved' };
  const api = { storage: { local: { get: async key => ({ [key]: structuredClone(store[key]) }), set: async values => {
    if (fail) throw Error('Storage unavailable'); Object.assign(store, structuredClone(values));
  } } } };
  return { store, api };
}
test('opening the assistant previews safe defaults without changing existing installation or saved preferences', async () => {
  const f = fixture(), before = structuredClone(f.store);
  const result = await readWorkspaceSettings(f.api, { openOnProfileStart: true, rightPaneHeightRatio: .612 });
  assert.equal(result.passive, true); assert.equal(result.openOnProfileStart, true); assert.equal(result.rightPaneHeightRatio, .612);
  assert.deepEqual(f.store, before);
});
test('saving updates only workspace preferences atomically and reopening preserves all pages and sizes', async () => {
  const f = fixture(), before = structuredClone(f.store['bridge-v1']);
  const chosen = settings(); chosen.pages.dictionary = 'https://www.linguee.com/english-spanish/';
  await saveWorkspaceSettings(f.api, chosen);
  assert.deepEqual(await readWorkspaceSettings(f.api), chosen);
  assert.equal(f.store['workspace-profile-enabled'], false); assert.equal(f.store['automation-device-passive'], true);
  assert.deepEqual(f.store['bridge-v1'], before); assert.equal(f.store.personal, 'preserved');
});
test('invalid URLs, private parameters, credentials and sizes are rejected before preference writes', async () => {
  for (const change of [value => value.pages.portal = 'https://evil.invalid/portal', value => value.pages.portal = 'https://interpreters.propio-ls.com/login',
    value => value.pages.tracker += '?token=private', value => value.pages.dictionary = 'https://user:secret@www.linguee.com/',
    value => value.rightPaneHeightRatio = 1.1, value => value.rightPaneWidthRatio = .51, value => value.passive = 'true']) {
    const f = fixture(), before = structuredClone(f.store), value = settings(); change(value);
    await assert.rejects(saveWorkspaceSettings(f.api, value)); assert.deepEqual(f.store, before);
  }
  assert.equal(validateWorkspaceSettings(settings()).version, 1);
});
test('a failed save preserves the prior preferences and does not silently replace malformed persisted configuration', async () => {
  const f = fixture({ fail: true }), before = structuredClone(f.store);
  await assert.rejects(saveWorkspaceSettings(f.api, settings()), /Storage unavailable/); assert.deepEqual(f.store, before);
  f.store[workspaceSettingsKey] = { version: 9 }; await assert.rejects(readWorkspaceSettings(f.api));
});
test('column and notes reservation sizes share the same ratio and respect negative monitor origins', () => {
  const area = { availWidth: 1920, availHeight: 1040, availLeft: -1920, availTop: 0 };
  const bounds = workspaceBounds(area, 8, .612, .4);
  assert.equal(bounds.right.width, 784); assert.equal(bounds.right.left, -784); assert.equal(bounds.right.height, Math.round(1040 * .612) + 8);
  assert.equal(bounds.left.left + bounds.left.width - 8, bounds.right.left + 8);
});
