import test from 'node:test';
import assert from 'node:assert/strict';
import { installOriginalPortal } from '../extension/propio-bridge/original-portal-content.js';
const key = 'propio-original-layout-v1', first = { enabled: true, revision: 'first-layout-12345' };
async function fixture({ stored = first, legacy = true, safe = true, deferred = false } = {}) {
  let change, tick, loaded, off = false, reply = { ok: true };
  const sent = [], states = [], announcements = [], listeners = {};
  const window = { location: { origin: 'https://interpreters.propio-ls.com', pathname: '/portal' },
    addEventListener: (name, fn) => { listeners[name] = fn; }, postMessage: packet => announcements.push(packet) };
  window.top = window;
  const api = { storage: { onChanged: { addListener: fn => { change = fn; }, removeListener() { off = true; } },
    local: { get: () => deferred ? new Promise(resolve => { loaded = resolve; }) : Promise.resolve({ [key]: stored }) } },
    runtime: { sendMessage: async packet => { (packet.kind === 'portal-layout-observation' ? states : sent).push(packet); return reply; } } };
  const document = { querySelector: selector => selector === 'app-header' || (selector === 'app-daily-rollup' && legacy) ? {} : null };
  const controller = installOriginalPortal(api, { window, document, reloadAllowed: () => safe, setTimer: fn => { tick = fn; return 1; }, clearTimer() { tick = null; } });
  await Promise.resolve(); await Promise.resolve();
  return { controller, sent, states, announcements, listeners, tick: () => tick?.(), changed: value => change({ [key]: { newValue: value } }, 'local'),
    load: value => loaded({ [key]: value }), setSafe: value => { safe = value; }, setReply: value => { reply = value; }, off: () => off };
}
test('original layout controller restores the saved choice without reloading a matching native view', async () => {
  const f = await fixture(); assert.equal(f.announcements.at(-1).enabled, true); assert.equal(f.sent.length, 0);
  assert.equal(f.states.at(-1).state, 'native-present');
  f.tick(); assert.equal(f.sent.length, 0); f.controller.stop();
  const defaults = await fixture({ stored: null }); assert.equal(defaults.announcements.at(-1).enabled, false); assert.equal(defaults.sent.length, 0);
});
test('original layout controller waits for safe Offline and applies both choices once', async () => {
  const f = await fixture({ safe: false });
  f.changed({ enabled: false, revision: 'second-layout-12345' }); await f.controller.apply(); assert.equal(f.sent.length, 0);
  f.setSafe(true); await f.controller.apply(); await f.controller.apply();
  assert.deepEqual(f.sent, [{ kind: 'apply-portal-layout', revision: 'second-layout-12345' }]);
  f.changed({ enabled: true, revision: 'third-layout-12345' }); await f.controller.apply(); await Promise.resolve();
  assert.equal(f.sent.at(-1).revision, 'third-layout-12345'); f.controller.stop();
});
test('original layout controller can retry a busy portal and does not lose a changed preference to a stale read', async () => {
  const f = await fixture({ deferred: true }); f.setReply({ ok: false, reason: 'portal-busy' });
  f.changed({ enabled: false, revision: 'new-layout-revision-12345' }); await Promise.resolve();
  f.load(first); await Promise.resolve(); assert.equal(f.announcements.at(-1).enabled, false);
  f.setReply({ ok: true }); await f.controller.apply(); assert.equal(f.sent.at(-1).revision, 'new-layout-revision-12345'); f.controller.stop();
});
test('original layout controller allows one recovery for a missing native legacy view and stops on invalidation', async () => {
  const f = await fixture({ legacy: false }); await Promise.resolve(); await f.controller.apply(); assert.equal(f.sent.length, 1);
  assert.equal(f.states.at(-1).state, 'native-missing');
  const invalid = await fixture({ safe: false }); invalid.setSafe(true);
  invalid.setReply({ ok: true }); invalid.listeners.pagehide({ persisted: true }); assert.equal(invalid.off(), false);
  invalid.listeners.pagehide({ persisted: false }); assert.equal(invalid.off(), true);
  invalid.changed({ enabled: false, revision: 'after-close-12345' }); await invalid.controller.apply(); assert.equal(invalid.sent.length, 0);
  f.controller.stop();
});
