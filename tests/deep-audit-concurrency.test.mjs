import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parse } from 'acorn';
import { createAutomationLease } from '../js/automation-lease.js';
import { createBridgeWorker } from '../extension/propio-bridge/bridge-worker.js';

const settled = () => new Promise(resolve => setImmediate(resolve));
const one = '11111111-1111-4111-8111-111111111111', two = '22222222-2222-4222-8222-222222222222';
function declarations(file, names) {
  const source = fs.readFileSync(new URL(`../js/${file}.js`, import.meta.url), 'utf8');
  const nodes = parse(source, { ecmaVersion: 'latest', sourceType: 'module' }).body.map(item => item.declaration || item);
  return names.map(name => { const node = nodes.find(item => item.id?.name === name); assert.ok(node, name); return source.slice(node.start, node.end); }).join('\n');
}

test('delayed authenticated user reads reject an account that changed while the response was in flight', async () => {
  for (const next of ['account-b', null]) {
    let session = { user: { id: 'account-a' } }, respond;
    const h = vm.createContext({ window: {}, getSession: async () => session,
      getSupabase: () => ({ auth: { getUser: () => new Promise(resolve => { respond = resolve; }) } }) });
    vm.runInContext(declarations('auth', ['AuthError', 'assertAccount', 'getUser']), h);
    const pending = h.getUser('account-a');
    session = next ? { user: { id: next } } : null;
    respond({ data: { user: { id: 'account-a', email: 'private-a@example.invalid' } }, error: null });
    await assert.rejects(pending, error => error.code === 'NOT_AUTHENTICATED');
  }
});

function leaseFixture() {
  let clock = Date.parse('2026-10-24T12:00:00Z'), mono = 1000;
  const pending = [], listeners = {};
  const host = { setInterval: () => 1, clearInterval() {}, addEventListener: (name, fn) => { listeners[name] = fn; }, removeEventListener() {},
    document: { addEventListener() {}, removeEventListener() {} } };
  const lease = createAutomationLease({ rpc: (_name, { p_owner }) => new Promise(resolve => pending.push({ owner: p_owner, resolve, at: clock })) },
    { host, now: () => clock, monotonic: () => mono });
  const grant = index => { const request = pending[index]; request.resolve({ data: { granted: true,
    server_now: new Date(request.at).toISOString(), expires_at: new Date(request.at + 30000).toISOString() } }); };
  return { lease, pending, listeners, grant, advance: ms => { clock += ms; mono += ms; } };
}

for (const reset of ['owner', 'resume']) test(`lease ${reset} rotation can renew while the previous RPC remains pending and ignores its late grant`, async t => {
  const f = leaseFixture(); t.after(() => f.lease.stop());
  f.lease.request({ owner: one, enabled: true });
  if (reset === 'owner') f.lease.request({ owner: two, enabled: true }); else f.listeners.pageshow();
  assert.equal(f.pending.length, 2, 'the superseded RPC must not block the new generation');
  f.grant(1); await settled(); assert.equal(f.lease.current().owner, reset === 'owner' ? two : one);
  const current = f.lease.current(); f.grant(0); await settled(); assert.deepEqual(f.lease.current(), current);
});

test('an unanswered lease request expires locally so renewals resume without a reload', async t => {
  const f = leaseFixture(); t.after(() => f.lease.stop());
  f.lease.request({ owner: one, enabled: true }); f.advance(26000);
  void f.lease.renew();
  assert.equal(f.pending.length, 2, 'a stalled request must stop blocking after the maximum useful permission duration');
  f.grant(1); await settled(); assert.equal(f.lease.current().owner, one);
  const current = f.lease.current(); f.grant(0); await settled(); assert.deepEqual(f.lease.current(), current);
});

test('a frozen tracker acknowledgment times out without losing its queued event and a later flush recovers once', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const scope = 'a'.repeat(64), at = '2026-10-24T12:00:00Z';
  const event = { version: 1, id: 'call-end-event-12345', type: 'call-end', at, startedAt: '2026-10-24T11:59:00Z', callId: 'call-record-1234567' };
  const store = { 'bridge-v1': { schema: 1, mode: 'auto', accountScope: scope, tabs: {}, session: null,
    queue: [{ accountScope: scope, event }], last: [], completed: 1, attention: null } };
  let deliveries = 0, resolveFirst;
  const api = { runtime: { id: 'audit-extension', getURL: file => `chrome-extension://audit-extension/${file}` },
    storage: { local: { get: async key => ({ [key]: structuredClone(store[key]) }), set: async value => Object.assign(store, structuredClone(value)) } },
    tabs: { query: async () => [{ id: 10 }], sendMessage: async (_id, packet) => {
      if (packet.kind === 'identify-tracker') return { accountScope: scope };
      deliveries++; if (deliveries === 1) return new Promise(resolve => { resolveFirst = resolve; });
      return { status: 'ok', duplicate: true };
    } } };
  const worker = createBridgeWorker(api, { now: () => Date.parse(at) });
  let complete = false;
  const first = worker.flush().then(() => { complete = true; }); await settled();
  assert.equal(deliveries, 1);
  t.mock.timers.tick(4001); await settled();
  assert.equal(complete, true, 'a missing response must release the delivery loop');
  await first; assert.equal(store['bridge-v1'].queue.length, 1);
  await worker.flush(); assert.equal(deliveries, 2); assert.equal(store['bridge-v1'].queue.length, 0);
  resolveFirst({ status: 'ok' }); await settled(); assert.equal(store['bridge-v1'].queue.length, 0);
});

test('logout never archives another account under its original owner or signs it out after a delayed upload', async () => {
  const source = fs.readFileSync(new URL('../js/boot.js', import.meta.url), 'utf8');
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
  function find(node) {
    if (!node || typeof node !== 'object') return null;
    if (node.type === 'CallExpression' && node.callee.property?.name === 'addEventListener'
      && node.callee.object?.arguments?.[0]?.value === 'sidebarLogoutBtn') return node.arguments[1];
    for (const value of Object.values(node)) for (const child of Array.isArray(value) ? value : [value]) { const match = find(child); if (match) return match; }
    return null;
  }
  const handler = find(ast); assert.ok(handler);
  let owner = 'account-a', respond;
  const archived = [], actions = [];
  const h = vm.createContext({ window: { location: { replace: () => actions.push('redirect') } },
    readMeta: () => ({ userId: owner, dirty: true }), pushSnapshot: () => new Promise(resolve => { respond = resolve; }),
    readLocalSnapshot: () => ({ calls: [{ id: `${owner}-private` }] }), preserveRecoveryCopy: (...args) => archived.push(args),
    setSyncStatus() {}, translateText: value => value, signOut: async () => actions.push('signout') });
  vm.runInContext(`const handler = ${source.slice(handler.start, handler.end)};`, h);
  const pending = vm.runInContext('handler()', h);
  owner = 'account-b'; respond({ skipped: true }); await pending;
  assert.deepEqual(archived, []); assert.equal(actions.includes('signout'), false);
});

test('logout with an expected account refuses to clear a different authenticated session', async () => {
  let signedOut = 0, routed = 0;
  const h = vm.createContext({ window: {}, getSession: async () => ({ user: { id: 'account-b' } }),
    getSupabase: () => ({ auth: { signOut: async () => { signedOut++; } } }), setAppEntryHint: () => { routed++; } });
  vm.runInContext(declarations('auth', ['AuthError', 'assertAccount', 'signOut']), h);
  await assert.rejects(h.signOut('account-a'), error => error.code === 'NOT_AUTHENTICATED');
  assert.equal(signedOut, 0); assert.equal(routed, 0);
});
