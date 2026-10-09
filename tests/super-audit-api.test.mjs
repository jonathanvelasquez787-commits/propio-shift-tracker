import test from 'node:test';
import assert from 'node:assert/strict';

let sequence = 0;
async function harness(t, limiter) {
  const keys = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
  const prior = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  Object.assign(process.env, { SUPABASE_URL: 'https://synthetic.example', SUPABASE_ANON_KEY: 'test-anon', SUPABASE_SERVICE_ROLE_KEY: 'test-service' });
  const previousFetch = globalThis.fetch;
  let authRequests = 0;
  globalThis.fetch = async url => {
    if (url.includes('consume_rate_limit')) return limiter();
    if (url.includes('/auth/v1/token')) { authRequests++; return { ok: false, status: 401, json: async () => ({ error: 'invalid_credentials' }) }; }
    throw new Error(`Unexpected synthetic request ${url}`);
  };
  t.after(() => {
    globalThis.fetch = previousFetch;
    for (const key of keys) if (prior[key] === undefined) delete process.env[key]; else process.env[key] = prior[key];
  });
  const { default: handler } = await import(`../api/login.js?super-audit=${++sequence}`);
  return {
    get authRequests() { return authRequests; },
    async login(ip = '192.0.2.23') {
      const result = { ended: false, status: null, body: null };
      const response = { setHeader() {}, status(code) { result.status = code; return this; }, json(body) { Object.assign(result, { ended: true, body }); } };
      await handler({ method: 'POST', headers: { 'x-forwarded-for': ip }, body: { identifier: 'synthetic@example.test', password: 'synthetic-password' } }, response);
      return result;
    }
  };
}

for (const [label, limiter] of [
  ['network rejection', () => { throw new TypeError('fetch failed'); }],
  ['invalid upstream JSON', () => ({ ok: true, json: async () => { throw new SyntaxError('Invalid JSON'); } })],
  ['invalid upstream result', () => ({ ok: true, json: async () => ({ message: 'unavailable' }) })],
]) {
  test(`login limiter ${label} still responds and enforces its local fallback`, async t => {
    const app = await harness(t, limiter);
    for (let i = 0; i < 12; i++) {
      const result = await app.login();
      assert.equal(result.ended, true);
      assert.equal(result.status, 401);
      assert.deepEqual(result.body, { error: 'LOGIN_FAILED' });
    }
    const blocked = await app.login();
    assert.equal(blocked.status, 429);
    assert.deepEqual(blocked.body, { error: 'RATE_LIMITED' });
    assert.equal(app.authRequests, 12);
  });
}

test('persistent login throttle blocks before sending authentication credentials', async t => {
  const app = await harness(t, () => ({ ok: true, json: async () => false }));
  assert.equal((await app.login()).status, 429);
  assert.equal(app.authRequests, 0);
});
