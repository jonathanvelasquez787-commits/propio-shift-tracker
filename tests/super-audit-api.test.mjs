import test from 'node:test';
import assert from 'node:assert/strict';

let sequence = 0;
const initializedTests = new WeakSet();
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
  if (!initializedTests.has(t)) {
    initializedTests.add(t);
    t.after(() => {
      globalThis.fetch = previousFetch;
      for (const key of keys) if (prior[key] === undefined) delete process.env[key]; else process.env[key] = prior[key];
    });
  }
  const { default: handler } = await import(`../api/login.js?super-audit=${++sequence}`);
  return {
    get authRequests() { return authRequests; },
    async login(ip = '192.0.2.23') {
      const result = { ended: false, status: null, body: null, headers: {} };
      const response = { setHeader(key, value) { result.headers[key] = value; }, status(code) { result.status = code; return this; }, json(body) { Object.assign(result, { ended: true, body }); } };
      await handler({ method: 'POST', headers: { 'x-forwarded-for': ip }, body: { identifier: 'synthetic@example.test', password: 'synthetic-password' } }, response);
      return result;
    }
  };
}

for (const [label, limiter] of [
  ['network rejection', () => { throw new TypeError('fetch failed'); }],
  ['invalid upstream JSON', () => ({ ok: true, json: async () => { throw new SyntaxError('Invalid JSON'); } })],
  ['invalid upstream result', () => ({ ok: true, json: async () => ({ message: 'unavailable' }) })],
  ['upstream HTTP failure', () => ({ ok: false, status: 503 })],
]) {
  test(`login limiter ${label} blocks authentication across fresh instances`, async t => {
    const app = await harness(t, limiter);
    for (let i = 0; i < 2; i++) {
      const result = await app.login();
      assert.equal(result.ended, true);
      assert.equal(result.status, 503);
      assert.deepEqual(result.body, { error: 'LOGIN_UNAVAILABLE' });
      assert.equal(result.headers['Retry-After'], '60');
    }
    assert.equal(app.authRequests, 0);
    const otherInstance = await harness(t, limiter);
    assert.equal((await otherInstance.login()).status, 503);
    assert.equal(otherInstance.authRequests, 0);
  });
}

test('persistent login throttle blocks before sending authentication credentials', async t => {
  const app = await harness(t, () => ({ ok: true, json: async () => false }));
  assert.equal((await app.login()).status, 429);
  assert.equal(app.authRequests, 0);
});

test('a healthy shared limiter permits authentication and rejects the shared quota across instances', async t => {
  let hits = 0;
  const sharedLimit = () => ({ ok: true, json: async () => ++hits <= 12 });
  const first = await harness(t, sharedLimit);
  for (let i = 0; i < 12; i++) assert.equal((await first.login()).status, 401);
  assert.equal(first.authRequests, 12);
  const fresh = await harness(t, sharedLimit);
  const blocked = await fresh.login();
  assert.equal(blocked.status, 429);
  assert.equal(blocked.headers['Retry-After'], '60');
  assert.equal(fresh.authRequests, 0);
});
