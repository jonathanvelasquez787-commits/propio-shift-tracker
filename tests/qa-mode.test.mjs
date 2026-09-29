import assert from 'node:assert/strict';
import test from 'node:test';

import { createQaSnapshot, QA_SCENARIOS } from '../js/qa-mode.js';
import {
  APP_KEYS,
  QA_APP_KEYS,
  activeAppKeys,
  beginQaMode,
  isQaModeActive,
  restoreQaMode,
  writeQaSnapshot,
} from '../js/sync.js';

function storageMock(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(String(key), String(value)),
    removeItem: (key) => values.delete(String(key)),
  };
}

test('modo QA conserva byte a byte las llaves reales y usa namespace aislado', async () => {
  const original = {
    [APP_KEYS.state]: '{"real":1}',
    [APP_KEYS.calls]: '[{"real":true}]',
    [APP_KEYS.settings]: '{"theme":"dark"}',
  };
  global.window = { localStorage: storageMock(original) };

  const entered = await beginQaMode('user-qa');
  assert.equal(entered.ok, true);
  assert.equal(isQaModeActive(), true);
  assert.deepEqual(activeAppKeys(), QA_APP_KEYS);

  writeQaSnapshot({ state: { qa: 1 }, calls: [{ id: 'qa-1' }], settings: { theme: 'light' } });
  for (const [key, value] of Object.entries(original)) assert.equal(window.localStorage.getItem(key), value);
  assert.equal(JSON.parse(window.localStorage.getItem(QA_APP_KEYS.state)).qa, 1);

  assert.equal(restoreQaMode(), true);
  assert.equal(isQaModeActive(), false);
  assert.deepEqual(activeAppKeys(), APP_KEYS);
  for (const [key, value] of Object.entries(original)) assert.equal(window.localStorage.getItem(key), value);
  for (const key of Object.values(QA_APP_KEYS)) assert.equal(window.localStorage.getItem(key), null);
  delete global.window;
});

test('escenarios QA generan llamadas terminadas, productivas y sin tocar la fuente', () => {
  const source = { state: { marker: 'real' }, calls: [{ id: 'real' }], settings: { theme: 'dark' } };
  const now = new Date('2026-09-29T18:00:00.000Z');
  for (const scenario of QA_SCENARIOS) {
    const snapshot = createQaSnapshot(source, scenario.id, now);
    assert.equal(snapshot.state.marker, 'real');
    assert.equal(snapshot.settings.theme, 'dark');
    assert.equal(snapshot.settings.game.enabled, true);
    assert.ok(snapshot.calls.length > 0);
    assert.ok(snapshot.calls.every((call) => call.id.startsWith('qa-') && call.countsAsProductive));
    assert.ok(snapshot.calls.every((call) => new Date(call.endISO).getTime() <= now.getTime()));
  }
  assert.deepEqual(source.calls, [{ id: 'real' }]);
});
