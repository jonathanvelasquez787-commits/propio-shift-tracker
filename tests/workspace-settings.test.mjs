import test from 'node:test';
import assert from 'node:assert/strict';
import { workspaceSettingsKey, workspacePages, defaultWorkspaceSides, describeSides, validateWorkspaceSettings, readWorkspaceSettings, saveWorkspaceSettings } from '../extension/propio-bridge/workspace-settings.js';
import { workspaceBounds } from '../extension/propio-bridge/workspace.js';

const settings = () => ({ version: 1, pages: { ...workspacePages }, sides: { ...defaultWorkspaceSides }, openOnProfileStart: false, passive: true, rightPaneHeightRatio: .61, rightPaneWidthRatio: .32 });
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
test('el lado de cada pagina se guarda, los ajustes viejos sin lados usan los de siempre y los lados invalidos se rechazan', async () => {
  const old = settings(); delete old.sides;
  assert.deepEqual(validateWorkspaceSettings(old).sides, { portal: 'left', interpreter: 'left', tracker: 'right', dictionary: 'right' });
  const swapped = settings(); swapped.sides = { portal: 'left', interpreter: 'right', tracker: 'right', dictionary: 'left' };
  assert.deepEqual(validateWorkspaceSettings(swapped).sides, swapped.sides);
  assert.equal(describeSides(swapped.sides), 'Propio y Linguee a la izquierda; UseInterpreter y Propio Shift Tracker a la derecha.');
  assert.equal(describeSides({ portal: 'left', interpreter: 'right', tracker: 'right', dictionary: 'right' }), 'Propio a la izquierda; UseInterpreter, Propio Shift Tracker y Linguee a la derecha.');
  for (const bad of [{ portal: 'right', interpreter: 'right', tracker: 'right', dictionary: 'right' }, { portal: 'left', interpreter: 'left', tracker: 'left', dictionary: 'right' },
    { portal: 'left', interpreter: 'left', tracker: 'left', dictionary: 'left' }, { portal: 'left', interpreter: 'left', tracker: 'right' }, { portal: 'left', interpreter: 'up', tracker: 'right', dictionary: 'right' }, null]) {
    const value = settings(); value.sides = bad;
    assert.throws(() => validateWorkspaceSettings(value));
  }
});

test('paginas agregadas: se validan solo HTTPS limpio, sin repetir sitios y con lado propio', () => {
  const base = settings();
  const extra = { id: 'extra1', name: ' Notas ', url: 'https://notas.example.com/app' };
  const ok = validateWorkspaceSettings({ ...base, extraPages: [extra], sides: { ...base.sides, extra1: 'right' } });
  assert.deepEqual(ok.extraPages, [{ id: 'extra1', name: 'Notas', url: 'https://notas.example.com/app' }]);
  assert.equal(ok.sides.extra1, 'right');
  assert.equal(validateWorkspaceSettings(base).extraPages, undefined);
  const bad = page => () => validateWorkspaceSettings({ ...base, extraPages: [page], sides: { ...base.sides, extra1: 'right' } });
  assert.throws(bad({ ...extra, url: 'http://notas.example.com/' }));
  assert.throws(bad({ ...extra, url: 'https://u:p@notas.example.com/' }));
  assert.throws(bad({ ...extra, url: 'https://notas.example.com/?a=1' }));
  assert.throws(bad({ ...extra, url: 'https://www.linguee.es/otra' }), /ya está/);
  assert.throws(bad({ ...extra, name: '' }));
  assert.throws(() => validateWorkspaceSettings({ ...base, extraPages: [extra] }), /lado/);
});
