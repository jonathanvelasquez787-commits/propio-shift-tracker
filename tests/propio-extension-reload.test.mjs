import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source = fs.readFileSync(new URL('../extension/propio-bridge/tracker-content.js', import.meta.url), 'utf8');
function fixture() {
  let listener, contentListener, interval, alive = true, messages = 0, throwSend = false, transient = false, announcements = 0, clock = 20000;
  const timeouts = new Map();
  const window = { top: null, postMessage: () => messages++, addEventListener: (name, fn) => { if (name === 'message') listener = fn; }, removeEventListener: () => { listener = null; } };
  window.top = window;
  const runtime = { get id() { return alive ? 'test-extension' : undefined; }, sendMessage() { announcements++; if (throwSend) throw new Error('Extension context invalidated.'); if (transient) { transient = false; throw Error('Worker still starting'); } return Promise.resolve({ok:true}); }, onMessage: { addListener: fn => { contentListener = fn; }, removeListener: () => { contentListener = null; } } };
  vm.runInNewContext(source, { Date: {now:()=>clock}, window, location: { origin: 'https://propio-shift-tracker.vercel.app' }, chrome: { runtime }, crypto: { randomUUID: () => 'request-12345678' }, setInterval: fn => { interval = fn; return 1; }, clearInterval: () => { interval = null; }, setTimeout: fn => { const id = timeouts.size + 1; timeouts.set(id, fn); return id; }, clearTimeout: id => timeouts.delete(id) });
  return { ready() { listener?.({ source: window, origin: 'https://propio-shift-tracker.vercel.app', data: { protocol: 'pst-propio-bridge/v1', direction: 'app', kind: 'ready', accountScope: 'a'.repeat(64), nonce: 'nonce-1234567890' } }); },
    reload() { throwSend = true; }, invalidate() { alive = false; }, hello() { interval?.(); },
    transientOnce() { transient = true; }, advance(ms) { clock += ms; }, get announcements() { return announcements; },
    deliver(respond) { contentListener?.({ kind:'deliver-event', accountScope:'a'.repeat(64) }, { id:'test-extension' }, respond); },
    ack() { listener?.({ source:window, origin:'https://propio-shift-tracker.vercel.app', data:{protocol:'pst-propio-bridge/v1',direction:'app',kind:'ack',accountScope:'a'.repeat(64),nonce:'nonce-1234567890',requestId:'request-12345678',result:{status:'ok'}} }); },
    get interval() { return interval; }, get messages() { return messages; }, get pending() { return timeouts.size; } };
}

test('tracker readiness retries a transient startup failure without a user pairing action and periodically rechecks the link', async () => {
  const settle=()=>new Promise(resolve=>setImmediate(resolve));
  const f=fixture();f.transientOnce();f.ready();await settle();
  assert.equal(f.announcements,1);assert.notEqual(f.interval,null);
  f.ready();await settle();assert.equal(f.announcements,2);
  f.ready();assert.equal(f.announcements,2);
  f.advance(10000);f.ready();await settle();assert.equal(f.announcements,3);
});
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
