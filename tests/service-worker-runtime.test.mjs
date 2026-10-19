import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../js/service-worker.js', import.meta.url), 'utf8');
function fixture({ cached, entries, url = 'https://tracker.invalid/assets/app.js', network = new Response('fresh'), quota = false, mode = 'cors' } = {}) {
  const handlers = {}, waits = [], deleted = [], writes = [];
  const cache = { match: async request => entries ? entries.get(typeof request === 'string' ? request : request.url) : cached, put: async (...args) => { if (quota) throw Error('QuotaExceeded'); writes.push(args); } };
  vm.runInNewContext(source, { __BUILD_VERSION__: 'new', URL, Response,
    self: { location: { origin: 'https://tracker.invalid' }, addEventListener: (name, fn) => { handlers[name] = fn; }, skipWaiting() {}, clients: { claim() {} } },
    caches: { open: async () => cache, keys: async () => ['propio-old', 'propio-new'], delete: async key => { deleted.push(key); } },
    fetch: async () => { if (network instanceof Error) throw network; return network; },
  });
  let response;
  const event = { request: { method: 'GET', mode, url },
    respondWith: value => { response = value; }, waitUntil: value => { waits.push(value); } };
  return { async fetch() { handlers.fetch(event); return await response; }, waits, deleted, writes, activate() { handlers.activate(event); } };
}

test('PWA cached assets remain usable offline and refresh failure is handled for the event lifetime', async () => {
  const cached = new Response('cached');
  const h = fixture({ cached, network: new TypeError('Failed to fetch') });
  assert.equal(await h.fetch(), cached);
  assert.equal(h.waits.length, 1);
  await Promise.all(h.waits);
});

test('release-bound styles do not reuse an old unversioned stylesheet and remain available offline', async () => {
  const oldUrl = 'https://tracker.invalid/css/app-shell.css';
  const url = `${oldUrl}?v=new`;
  const entries = new Map([[oldUrl, new Response('old layout')]]);
  const online = fixture({ entries, url, network: new Response('new layout') });
  assert.equal(await (await online.fetch()).text(), 'new layout');
  assert.equal(online.writes[0][0].url, url);
  entries.set(url, online.writes[0][1]);
  const offline = fixture({ entries, url, network: new TypeError('Failed to fetch') });
  assert.equal(await (await offline.fetch()).text(), 'new layout');
  await Promise.all(offline.waits);
});

test('PWA uncached network failure reaches the caller', async () => {
  const h = fixture({ network: new TypeError('Failed to fetch') });
  await assert.rejects(h.fetch(), /Failed to fetch/);
});

test('PWA cache quota does not discard a valid navigation or asset response', async () => {
  for (const mode of ['navigate', 'cors']) {
    const response = new Response('network');
    const h = fixture({ quota: true, network: response, mode });
    assert.equal(await h.fetch(), response);
    await Promise.all(h.waits);
  }
});

test('PWA activation removes an old release and retains the new cache', async () => {
  const h = fixture(); h.activate(); await Promise.all(h.waits);
  assert.deepEqual(h.deleted, ['propio-old']);
});
