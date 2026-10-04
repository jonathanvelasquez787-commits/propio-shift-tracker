import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source = fs.readFileSync(new URL('../extension/propio-bridge/tracker-content.js', import.meta.url), 'utf8');
function fixture() {
  let listener, contentListener, interval, alive = true, messages = 0, throwSend = false;
  const timeouts = new Map();
  const window = { top: null, postMessage: () => messages++, addEventListener: (name, fn) => { if (name === 'message') listener = fn; }, removeEventListener: () => { listener = null; } };
  window.top = window;
  const runtime = { get id() { return alive ? 'test-extension' : undefined; }, sendMessage() { if (throwSend) throw new Error('Extension context invalidated.'); return Promise.resolve({}); }, onMessage: { addListener: fn => { contentListener = fn; }, removeListener: () => { contentListener = null; } } };
  vm.runInNewContext(source, { window, location: { origin: 'https://propio-shift-tracker.vercel.app' }, chrome: { runtime }, crypto: { randomUUID: () => 'request-12345678' }, setInterval: fn => { interval = fn; return 1; }, clearInterval: () => { interval = null; }, setTimeout: fn => { const id = timeouts.size + 1; timeouts.set(id, fn); return id; }, clearTimeout: id => timeouts.delete(id) });
  return { ready() { listener?.({ source: window, origin: 'https://propio-shift-tracker.vercel.app', data: { protocol: 'pst-propio-bridge/v1', direction: 'app', kind: 'ready', accountScope: 'a'.repeat(64), nonce: 'nonce-1234567890' } }); },
    reload() { throwSend = true; }, invalidate() { alive = false; }, hello() { interval?.(); },
    deliver(respond) { contentListener?.({ kind:'deliver-event', accountScope:'a'.repeat(64) }, { id:'test-extension' }, respond); },
    ack() { listener?.({ source:window, origin:'https://propio-shift-tracker.vercel.app', data:{protocol:'pst-propio-bridge/v1',direction:'app',kind:'ack',accountScope:'a'.repeat(64),nonce:'nonce-1234567890',requestId:'request-12345678',result:{status:'ok'}} }); },
    get interval() { return interval; }, get messages() { return messages; }, get pending() { return timeouts.size; } };
}
test('reloading the extension handles synchronous context invalidation without leaving a hello loop', async () => {
  const f = fixture(); f.reload(); assert.doesNotThrow(() => f.ready());
  await Promise.resolve(); await Promise.resolve();
  assert.equal(f.interval, null);
});
test('normal delivery still acknowledges once and clears its timeout', () => {
  const f = fixture(), replies=[]; f.ready(); f.deliver(result=>replies.push(result.status));
  f.ack(); f.ack(); assert.deepEqual(replies,['ok']); assert.equal(f.pending,0); assert.notEqual(f.interval,null);
});
test('invalidated content stops sending and clears outstanding delivery timeouts', () => {
  const f = fixture(); f.ready(); f.deliver(() => { throw new Error('respond after reload'); });
  assert.equal(f.pending,1); const before=f.messages;
  f.invalidate(); assert.doesNotThrow(() => f.hello());
  assert.equal(f.interval,null); assert.equal(f.pending,0); assert.equal(f.messages,before);
});
