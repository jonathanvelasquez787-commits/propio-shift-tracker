import test from 'node:test';
import assert from 'node:assert/strict';
let instance = 0;
async function harness(t, upstream, configured = true) {
  const savedFetch = globalThis.fetch;
  const prior = { SUPABASE_URL: process.env.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY };
  if (configured) Object.assign(process.env, { SUPABASE_URL: 'https://synthetic.invalid', SUPABASE_SERVICE_ROLE_KEY: 'test-only' });
  else { delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY; }
  let calls = 0;
  globalThis.fetch = async () => { calls++; return upstream(); };
  const { default: handler } = await import(`../api/health.js?test=${++instance}`);
  t.after(() => {
    globalThis.fetch = savedFetch;
    for (const [key, value] of Object.entries(prior)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
  return {
    get calls() { return calls; },
    async request(method = 'GET') {
      const result = { headers: {}, status: null, body: null };
      const res = { setHeader(k, v) { result.headers[k] = v; }, status(s) { result.status = s; return this; },
        json(body) { result.body = body; }, end() {} };
      await handler({ method }, res);
      return result;
    },
  };
}
test('health deduplicates concurrent probes and exposes only minimal status', async t => {
  const app = await harness(t, () => ({ ok: true, json: async () => ({ ok: true, checks: { sensitive: true } }) }));
  const results = await Promise.all([app.request(), app.request()]);
  assert.equal(app.calls, 1);
  for (const result of results) {
    assert.equal(result.status, 200);
    assert.equal(result.headers['Cache-Control'], 'no-store');
    assert.deepEqual(Object.keys(result.body).sort(), ['ok','release']);
  }
  assert.equal((await app.request('HEAD')).body, null);
  assert.equal(app.calls, 1);
});
for (const [name, upstream] of [
  ['readiness fails', () => ({ ok: true, json: async () => ({ ok: false }) })],
  ['bad payload', () => ({ ok: true, json: async () => ({ message: 'unavailable' }) })],
  ['HTTP failure', () => ({ ok: false })],
  ['network rejection', () => { throw new Error('synthetic'); }],
]) test(`health returns 503 when ${name}`, async t => {
  const app = await harness(t, upstream);
  const result = await app.request();
  assert.equal(result.status, 503);
  assert.equal(result.body.ok, false);
  assert.equal(result.headers['Retry-After'], '60');
});
test('unconfigured health returns 503 without requesting the database', async t => {
  const app = await harness(t, () => assert.fail('unexpected request'), false);
  assert.equal((await app.request()).status, 503);
  assert.equal(app.calls, 0);
});
test('health rejects mutation methods without probing', async t => {
  const app = await harness(t, () => assert.fail('unexpected request'));
  assert.equal((await app.request('POST')).status, 405);
  assert.equal(app.calls, 0);
});
