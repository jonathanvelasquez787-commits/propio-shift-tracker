import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source = fs.readFileSync(new URL('../extension/propio-bridge/tracker-content.js', import.meta.url), 'utf8');
function fixture() {
  let listener, contentListener, interval, alive = true, messages = 0, throwSend = false, transient = false, announcements = 0, clock = 20000;
  const timeouts = new Map();
  const lifecycle = new Map();
  const document = { addEventListener: (name, fn) => lifecycle.set(name, fn), removeEventListener: name => lifecycle.delete(name) };
  const window = { top: null, postMessage: () => messages++, addEventListener: (name, fn) => { if (name === 'message') listener = fn; else lifecycle.set(name, fn); }, removeEventListener: name => { if (name === 'message') listener = null; else lifecycle.delete(name); } };
  window.top = window;
  const runtime = { get id() { return alive ? 'test-extension' : undefined; }, sendMessage() { announcements++; if (throwSend) throw new Error('Extension context invalidated.'); if (transient) { transient = false; throw Error('Worker still starting'); } return Promise.resolve({ok:true}); }, onMessage: { addListener: fn => { contentListener = fn; }, removeListener: () => { contentListener = null; } } };
  vm.runInNewContext(source, { Date: {now:()=>clock}, window, document, location: { origin: 'https://propio-shift-tracker.vercel.app' }, chrome: { runtime }, crypto: { randomUUID: () => 'request-12345678' }, setInterval: fn => { interval = fn; return 1; }, clearInterval: () => { interval = null; }, setTimeout: fn => { const id = timeouts.size + 1; timeouts.set(id, fn); return id; }, clearTimeout: id => timeouts.delete(id) });
  return { ready(plan) { listener?.({ source: window, origin: 'https://propio-shift-tracker.vercel.app', data: { protocol: 'pst-propio-bridge/v1', direction: 'app', kind: 'ready', accountScope: 'a'.repeat(64), nonce: 'nonce-1234567890', plan } }); },
    identify() { let result; contentListener?.({ kind: 'identify-tracker' }, { id: 'test-extension' }, value => { result = value; }); return JSON.parse(JSON.stringify(result)); },
    refresh(respond) { return contentListener?.({kind:'identify-tracker',refresh:true},{id:'test-extension'},respond); },
    timeout() { [...timeouts.values()].forEach(fn=>fn()); timeouts.clear(); }, lifecycle(name) { lifecycle.get(name)?.(); },
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

test('tracker content forwards only ACW timestamps and distinguishes an older plan from an inactive counter', () => {
  const f = fixture(), plan = { startAt: '2026-10-15T12:00:00.000Z', endAt: '2026-10-15T20:00:00.000Z', scheduledPauses: [], hasCall: true };
  const acw = { startedAt: '2026-10-15T13:30:00.000Z', observedAt: '2026-10-15T13:30:50.000Z' };
  f.ready({ ...plan, acw: { ...acw, unexpected: 'discard-this' } });
  assert.deepEqual(f.identify().plan.acw, acw);
  f.ready({ ...plan, acw: null }); assert.equal(f.identify().plan.acw, null);
  f.ready(plan); assert.equal(Object.hasOwn(f.identify().plan, 'acw'), false);
});

test('worker refresh waits for a new app snapshot and shares it across concurrent requests without reannouncing', async () => {
  const f=fixture();f.ready({startAt:'2026-10-15T12:00:00Z',endAt:'2026-10-15T20:00:00Z'});
  await new Promise(resolve=>setImmediate(resolve));const before=f.announcements,replies=[];
  assert.equal(f.refresh(x=>replies.push(x)),true);f.refresh(x=>replies.push(x));assert.equal(replies.length,0);
  f.ready({startAt:'2026-10-16T12:00:00Z',endAt:'2026-10-16T20:00:00Z'});
  assert.equal(replies.length,2);assert.equal(replies[0].plan.startAt,'2026-10-16T12:00:00Z');
  assert.equal(f.announcements,before);assert.equal(f.pending,0);
});

test('a nonresponding background app returns no plan instead of relabeling an old snapshot as current', () => {
  const f=fixture();f.ready({startAt:'2026-10-15T12:00:00Z',endAt:'2026-10-15T20:00:00Z'});
  const replies=[];f.refresh(x=>replies.push(x));f.timeout();assert.deepEqual(replies,[null]);
  const before=f.messages;for(const name of ['pageshow','visibilitychange','resume'])f.lifecycle(name);
  assert.equal(f.messages,before+3);
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
