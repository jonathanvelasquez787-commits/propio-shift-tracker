import test from 'node:test';
import assert from 'node:assert/strict';
import { createAutomationLease, validateAutomationLease } from '../js/automation-lease.js';
import { applicationDatabase } from './helpers/postgres-fixture.mjs';
import { installPropioBridge } from '../js/propio-bridge.js';

const first = '11111111-1111-4111-8111-111111111111', second = '22222222-2222-4222-8222-222222222222';
function fixture() {
  let clock = Date.parse('2026-10-22T15:00:00Z'), mono = 1000, current = true, answer = { granted: true, server_now: new Date(clock).toISOString(), expires_at: new Date(clock + 30000).toISOString() };
  const listeners = {}, calls = [];
  const host = { setInterval: () => 1, clearInterval() {}, addEventListener: (key, fn) => { listeners[key] = fn; }, removeEventListener() {}, document: { addEventListener() {}, removeEventListener() {} } };
  const client = { rpc: async (...args) => { calls.push(args); return typeof answer === 'function' ? await answer() : { data: answer }; } };
  const lease = createAutomationLease(client, { host, now: () => clock, monotonic: () => mono, isCurrent: () => current });
  return { lease, calls, listeners, at: () => clock, advance: ms => { clock += ms; mono += ms; }, wall: ms => { clock += ms; }, answer: value => { answer = value; }, account: value => { current = value; } };
}
const settled = () => new Promise(resolve => setImmediate(resolve));

test('availability lease starts only on extension demand, expires conservatively and never mutates call settings', async () => {
  const f = fixture(); assert.equal(f.lease.current(), null); assert.equal(f.calls.length, 0);
  f.lease.request({ owner: first, enabled: true }); await settled();
  assert.equal(f.lease.current().owner, first); assert.equal(Date.parse(f.lease.current().expiresAt) - f.at(), 25000);
  f.advance(25000); assert.equal(f.lease.current(), null);
  assert.deepEqual(f.calls[0], ['automation_lease', { p_owner: first }]); f.lease.stop();
});

test('denial, network errors, old accounts, disabled PCs and resumed pages cannot reuse permission', async () => {
  for (const answer of [{ granted: false }, () => { throw Error('offline'); }]) {
    const f = fixture(); f.answer(answer); f.lease.request({ owner: first, enabled: true }); await settled(); assert.equal(f.lease.current(), null); f.lease.stop();
  }
  const f = fixture(); f.lease.request({ owner: first, enabled: true }); await settled(); assert.ok(f.lease.current());
  f.lease.request({ owner: first, enabled: false }); assert.equal(f.lease.current(), null);
  f.lease.request({ owner: first, enabled: true }); await settled(); f.account(false); assert.equal(f.lease.current(), null);
  f.account(true); f.listeners.offline(); assert.equal(f.lease.current(), null); f.lease.stop();
});

test('late renewal responses cannot authorize an expired request, replaced owner or stopped account', async () => {
  for (const change of [f => f.advance(25001), f => f.wall(-1000), f => f.lease.request({ owner: second, enabled: false }), f => f.lease.stop()]) {
    const f = fixture(); let resolve; const start = f.at();
    f.answer(() => new Promise(done => { resolve = done; })); f.lease.request({ owner: first, enabled: true });
    change(f); resolve({ data: { granted: true, server_now: new Date(start).toISOString(), expires_at: new Date(start + 30000).toISOString() } });
    await settled(); assert.equal(f.lease.current(), null); f.lease.stop();
  }
  assert.equal(validateAutomationLease({ version: 1, owner: first, grantedAt: 'invalid', expiresAt: 'invalid' }), null);
});

test('the authenticated bridge shares only current permission and rechecks timed pause ownership inside its write lock', async () => {
  const posted = [], listeners = new Set(), requests = [], scope = 'a'.repeat(64), origin = 'https://propio-shift-tracker.vercel.app';
  let grant = { version: 1, owner: first }, applied = 0, stopped = false;
  const host = { crypto: { randomUUID: () => 'bridge-nonce-12345' }, location: { origin }, postMessage: value => posted.push(value),
    addEventListener: (_key, fn) => listeners.add(fn), removeEventListener: (_key, fn) => listeners.delete(fn) };
  const stop = installPropioBridge({ host, accountScope: scope, getPlan: () => ({ startAt: '2026-10-22T15:00:00Z', endAt: '2026-10-22T23:00:00Z' }),
    receive: () => { applied++; return { status: 'ok' }; }, automationLease: { current: () => grant, request: value => requests.push(value), stop: () => { stopped = true; } } });
  const dispatch = data => listeners.forEach(fn => fn({ source: host, origin, data: { protocol: 'pst-propio-bridge/v1', direction: 'extension', accountScope: scope, nonce: 'bridge-nonce-12345', ...data } }));
  dispatch({ kind: 'hello', automationOwner: first, automationEnabled: true }); assert.equal(requests[0].owner, first);
  assert.equal(posted.at(-1).plan.automationLease.owner, first);
  grant = null; dispatch({ kind: 'event', requestId: 'pause-request-12345', event: { type: 'pause-end' } }); await settled();
  assert.equal(applied, 0); assert.equal(posted.at(-1).result.reason, 'coordination');
  dispatch({ kind: 'event', requestId: 'call-request-12345', event: { type: 'call-end' } }); await settled(); assert.equal(applied, 1);
  stop(); assert.equal(stopped, true);
});

test('SQL lease is exclusive per account, cannot be stolen or read directly, and expires by server time', async () => {
  const db = await applicationDatabase();
  const a = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', b = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  try {
    await db.exec(`insert into auth.users(id,email) values('${a}','lease-a@example.invalid'),('${b}','lease-b@example.invalid');`);
    const rpc = async (user, owner) => {
      await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${user}',false);`);
      try { return (await db.query(`select * from public.automation_lease('${owner}'::uuid)`)).rows[0]; }
      finally { await db.exec('reset role'); }
    };
    const one = await rpc(a, first); assert.equal(one.granted, true);
    assert.ok(new Date(one.expires_at) - new Date(one.server_now) <= 30000);
    assert.equal((await rpc(a, second)).granted, false); assert.equal((await rpc(a, first)).granted, true);
    assert.equal((await rpc(b, second)).granted, true);
    await db.exec('set role authenticated');
    await assert.rejects(db.query('select * from private.automation_availability_leases'), /permission denied/);
    await db.exec('reset role; set role anon');
    await assert.rejects(db.query(`select * from public.automation_lease('${first}'::uuid)`), /permission denied/);
    await db.exec('reset role');
    await db.exec(`update private.automation_availability_leases set expires_at = clock_timestamp() - interval '1 second' where user_id='${a}';`);
    assert.equal((await rpc(a, second)).granted, true); assert.equal((await rpc(a, first)).granted, false);
    await db.exec(`delete from auth.users where id='${a}'`);
    assert.equal((await db.query(`select count(*)::int as n from private.automation_availability_leases where user_id='${a}'`)).rows[0].n, 0);
  } finally { await db.close(); }
});
