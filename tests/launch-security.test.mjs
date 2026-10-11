import test from 'node:test';
import assert from 'node:assert/strict';
import { readJsonObject } from '../lib/request-body.js';
import { cleanDiagnostic } from '../lib/diagnostic-redaction.js';
import { secretKinds } from '../scripts/scan-secrets.mjs';
import { applicationDatabase } from './helpers/postgres-fixture.mjs';
import fs from 'node:fs';
import vm from 'node:vm';

test('request limits reject oversized streams before reading their remainder and count UTF-8 bytes', async () => {
  let consumed = 0;
  const req = { headers: {}, async *[Symbol.asyncIterator]() {
    consumed++; yield Buffer.from('123456'); consumed++; yield Buffer.from('789'); consumed++; yield Buffer.from('ignored');
  } };
  await assert.rejects(readJsonObject(req, 8), { code: 'BODY_TOO_LARGE', status: 413 });
  assert.equal(consumed, 2);
  await assert.rejects(readJsonObject({ headers: {}, body: { text: 'á'.repeat(5) } }, 16), { code: 'BODY_TOO_LARGE' });
  await assert.rejects(readJsonObject({ headers: { 'content-length': '500' }, body: '{}' }, 16), { code: 'BODY_TOO_LARGE' });
  for (const body of ['null', '[]', 'false', '{']) await assert.rejects(readJsonObject({ headers: {}, body }, 16), { code: 'BODY_INVALID' });
  assert.deepEqual(await readJsonObject({ headers: {}, body: '{"ok":true}' }, 16), { ok: true });
});

test('diagnostics remove tokens, credentials and URL parameters before truncating', () => {
  const token = ['eyJhbGciOiJIUzI1NiJ9', 'eyJzdWIiOiIxIn0', 'signature'].join('.');
  const privateKey = 'sb_' + 'secret_' + 'sensitiveExampleValue1234567890';
  const input = `token=${token} Bearer opaque-refresh-secret password="a secret phrase" access_token=opaque-value ${privateKey} person@example.test https://app.test/?code=private-code#access_token=private-fragment`;
  const clean = cleanDiagnostic(input, 2000);
  for (const secret of [token, privateKey, 'opaque-refresh-secret', 'a secret phrase', 'opaque-value', 'person@example.test', 'private-code', 'private-fragment']) assert.ok(!clean.includes(secret), secret);
  assert.equal(cleanDiagnostic({ unexpected: 'object' }, 100), '');
  assert.equal(cleanDiagnostic('password=abcdefghijklmnopqrstuvwxyz', 20), 'password=[redacted]');
  for (const input of ['Authorization: Basic dXNlcjpwYXNz', 'password=first secret phrase, with punctuation', 'Authorization: Digest username="user", response="private-response"', 'password="first\\" second secret"']) {
    const output = cleanDiagnostic(input, 2000);
    for (const sensitive of ['dXNlcjpwYXNz', 'first', 'secret', 'phrase', 'punctuation', 'user', 'private-response']) assert.ok(!output.includes(sensitive), output);
  }
  assert.equal(cleanDiagnostic('Authorization: Basic dXNlcjpwYXNz\nrelease=v1', 2000), 'Authorization: [redacted]\nrelease=v1');
});

test('actual CSV export neutralizes formula cells and keeps ordinary amounts and quoted fields', () => {
  const source = fs.readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');
  const fn = source.slice(source.indexOf('    function csvField(value)'), source.indexOf('    function exportAccountingCsv()'));
  const csvField = vm.runInNewContext(fn + '\ncsvField');
  for (const value of ['=HYPERLINK("https://evil.test")', '+cmd', '-cmd', '@SUM(1)', '  =1+1', '\t=1+1', '\r=1+1', '\n=1+1']) {
    const field = csvField(value);
    assert.ok(field.startsWith("'") || field.startsWith('"\''));
  }
  assert.equal(csvField(-12.5), '-12.5');
  assert.equal(csvField('2.10'), '2.10');
  assert.equal(csvField('customer-123'), 'customer-123');
  assert.equal(csvField('a,b"c'), '"a,b""c"');
  assert.equal(csvField('a\rb'), '"a\rb"');
});

test('secret scan allows publishable credentials but detects service-role JWTs and private PEM headers', () => {
  const jwt = role => ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ role })).toString('base64url'), 'signature'].join('.');
  assert.deepEqual(secretKinds(jwt('anon') + ' sb_publishable_publicExample'), []);
  assert.deepEqual(secretKinds(jwt('service_role')), ['supabase-service-role']);
  assert.deepEqual(secretKinds('-----BEGIN ' + 'PRIVATE KEY-----'), ['private-key']);
});

test('login rejects malformed inputs before Auth and makes unconfirmed and unknown accounts indistinguishable', async t => {
  const keys = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  const priorFetch = globalThis.fetch;
  Object.assign(process.env, { SUPABASE_URL: 'https://synthetic.test', SUPABASE_ANON_KEY: 'test-public', SUPABASE_SERVICE_ROLE_KEY: 'test-private' });
  t.after(() => {
    globalThis.fetch = priorFetch;
    for (const key of keys) if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key];
  });
  let attempts = 0; let upstream = 'invalid_credentials';
  globalThis.fetch = async url => {
    if (url.includes('consume_rate_limit')) return { ok: true, json: async () => true };
    attempts++;
    return { ok: false, status: 401, json: async () => ({ error_code: upstream }) };
  };
  const handler = (await import('../api/login.js?launch-security')).default;
  const login = async body => {
    const result = {};
    await handler({ method: 'POST', headers: {}, body }, {
      setHeader() {}, status(code) { result.status = code; return this; }, json(body) { result.body = body; },
    });
    return result;
  };
  for (const body of [null, '{', [], { identifier: {}, password: 'x' }, { identifier: 'x@y.test', password: {} }, { identifier: 'x'.repeat(255), password: 'x' }]) {
    assert.equal((await login(body)).status, 400);
  }
  assert.equal((await login({ identifier: 'x@y.test', password: 'x'.repeat(9000) })).status, 413);
  assert.equal(attempts, 0);
  const unknown = await login({ identifier: 'x@y.test', password: 'valid-shape' });
  upstream = 'email_not_confirmed';
  assert.deepEqual(await login({ identifier: 'x@y.test', password: 'valid-shape' }), unknown);
  assert.equal(unknown.status, 401);
});

test('least-privilege grants deny anonymous data and RPCs while preserving owner sync, triggers and wipe', async () => {
  const db = await applicationDatabase();
  const owner = '33333333-3333-4333-8333-333333333333';
  try {
    await db.query("insert into auth.users(id,email) values($1,'owner@example.invalid')", [owner]);
    await db.exec('set role anon');
    await assert.rejects(db.query('select * from public.profiles'), /permission denied/);
    await assert.rejects(db.query("select public.push_user_data_v2('{}','{}')"), /permission denied/);
    await db.exec(`reset role; set role authenticated; set request.jwt.claim.sub='${owner}'`);
    await assert.rejects(db.query('select * from public.rate_limit_buckets'), /permission denied/);
    const result = await db.query("select public.push_user_data_v2('{}','{\"theme\":\"dark\"}') as saved");
    assert.equal(result.rows[0].saved.ok, true);
    assert.equal((await db.query('select settings from public.user_data')).rows[0].settings.theme, 'dark');
    await db.query("update public.profiles set display_name='Owner test'");
    await db.query('select public.wipe_my_data()');
    assert.equal((await db.query('select count(*)::integer as n from public.user_data')).rows[0].n, 0);
  } finally { await db.close(); }
});
