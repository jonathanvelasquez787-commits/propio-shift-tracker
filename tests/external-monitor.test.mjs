import test from 'node:test';
import assert from 'node:assert/strict';
import { probeProduction, confirmedObservation, monitorTransition } from '../lib/external-monitor.js';

const goodFetch = async url => url.endsWith('/api/health')
  ? new Response(JSON.stringify({ ok: true, release: 'a'.repeat(40) }))
  : new Response('app', { headers: { 'content-security-policy': "default-src 'self'", 'strict-transport-security': 'max-age=63072000', 'cache-control': 'no-store' } });
test('independent probe verifies health and app security headers', async () => {
  const result = await probeProduction(goodFetch);
  assert.equal(result.healthy, true);
  assert.equal(result.checks[0].release, 'a'.repeat(40));
  assert.equal(result.checks.length, 2);
});
test('a 200 health response with failed readiness still raises a failure', async () => {
  const result = await probeProduction(async url => url.endsWith('/api/health') ? new Response('{"ok":false,"private":"not retained"}') : goodFetch(url));
  assert.equal(result.healthy, false);
  assert.deepEqual(result.checks[0].issues, ['not_ready']);
  assert.equal(JSON.stringify(result).includes('private'), false);
});
test('missing headers and gateway failures are observable even with a working API', async () => {
  const result = await probeProduction(async url => url.endsWith('/app') ? new Response('gateway', { status: 502 }) : goodFetch(url));
  assert.equal(result.healthy, false);
  assert(result.checks[1].issues.includes('http_502'));
  assert(result.checks[1].issues.includes('missing_content-security-policy'));
});
test('transient failure is retried and suppressed when the retry succeeds', async () => {
  let calls = 0, pauses = 0;
  const result = await confirmedObservation({ fetchImpl: async url => ++calls <= 2 ? new Response('bad', { status: 503 }) : goodFetch(url), pause: async ms => { assert.equal(ms, 10000); pauses++; } });
  assert.equal(result.healthy, true);
  assert.equal(result.attempts, 2);
  assert.equal(pauses, 1);
});
test('network failure is confirmed without storing an exception or response', async () => {
  const result = await confirmedObservation({ fetchImpl: async () => { throw new Error('private diagnostic'); }, pause: async () => {} });
  assert.equal(result.healthy, false);
  assert.equal(result.attempts, 2);
  assert.equal(JSON.stringify(result).includes('private diagnostic'), false);
});
test('first failure alerts once, changed failure alerts, recovery alerts once', () => {
  const failure = { healthy: false, checks: [{ name: 'health', status: 503, issues: ['not_ready'] }] };
  const first = monitorTransition(null, failure, 't1');
  assert.equal(first.alert, 'failure');
  assert.equal(monitorTransition(first.state, failure, 't2').alert, null);
  const changed = monitorTransition(first.state, { healthy: false, checks: [{ name: 'health', issues: ['request_failed'] }] }, 't3');
  assert.equal(changed.alert, 'failure');
  const recovery = monitorTransition(changed.state, { healthy: true, checks: [{ name: 'health', status: 200, issues: [] }] }, 't4');
  assert.equal(recovery.alert, 'recovered');
  assert.equal(monitorTransition(recovery.state, { healthy: true, checks: [{ name: 'health', status: 200, issues: [] }] }, 't5').alert, null);
});
