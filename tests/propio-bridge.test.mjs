import test from 'node:test';
import assert from 'node:assert/strict';
import { readPropioSignal, readPropioRequestBody, propioRequestKind, TWILIO_EVENT_ORIGINS, createPropioReducer, validateBridgeEvent, PORTAL_ORIGIN, TRACKER_ORIGIN } from '../js/propio-bridge-rules.js';
import { createPropioReceiver, createStorageRevisionGuard, ignorePropioCall, installPropioBridge } from '../js/propio-bridge.js';
import { createBridgeWorker } from '../extension/propio-bridge/bridge-worker.js';
import { createPortalObserver, readPortalObservation } from '../extension/propio-bridge/portal-observer.js';

const at = '2026-10-04T18:00:00.000Z', ended = '2026-10-04T18:10:00.000Z';
const scope = 'a'.repeat(64), other = 'b'.repeat(64), callId = 'test-call-123456789';
const start = { version: 1, id: 'test-start-12345678', type: 'call-start', callId, at };
const end = { version: 1, id: 'test-end-123456789', type: 'call-end', callId, startedAt: at, at: ended };
const now = () => Date.parse(ended);
const endpoint = 'https://eventgw.twilio.com/v4/EndpointEvents';
const sender = { id: 'extension-id', url: 'chrome-extension://extension-id/popup.html' };

function portalDocument() {
  const listeners = new Map(), view = { getComputedStyle: () => ({ visibility: 'visible', display: 'block' }) };
  const document = { welcome: null, login: null, controls: [], statuses: [], defaultView: view,
    querySelector: () => document.login,
    querySelectorAll: selector => selector.startsWith('h1') ? document.welcome ? [document.welcome] : [] : selector.startsWith('button') ? document.controls : document.statuses,
    addEventListener: (kind, fn) => listeners.set(kind, fn), removeEventListener: kind => listeners.delete(kind) };
  const element = (text, shown = true) => ({ textContent: text, ownerDocument: document, hidden: !shown,
    getClientRects: () => shown ? [{}] : [], closest: selector => selector.startsWith('button') ? document.controls[0] : null, getAttribute: () => null });
  return { document, element, click: isTrusted => listeners.get('click')?.({ isTrusted, target: document.controls[0] }) };
}
test('portal UI requires visible authentication and explicit call evidence; availability alone never becomes a call', () => {
  const f = portalDocument(); f.document.welcome = f.element('Welcome, Synthetic User (12345)', false);
  f.document.login = f.element('Interpreter Login', false);
  assert.deepEqual(readPortalObservation(f.document), { session: 'unknown', call: 'unknown' });
  f.document.login = f.element('Interpreter Login');
  assert.equal(readPortalObservation(f.document).session, 'logged-out');
  f.document.login = null; f.document.welcome = f.element('Welcome, Synthetic User (12345)');
  f.document.controls = [f.element('Start Calls')];
  assert.equal(readPortalObservation(f.document).call, 'idle');
  f.document.controls = [f.element('Accept'), f.element('Reject')];
  assert.equal(readPortalObservation(f.document).call, 'incoming');
  f.document.controls = [f.element('End Call')]; f.document.statuses = [f.element('Available')];
  assert.equal(readPortalObservation(f.document).call, 'unknown');
  f.document.statuses = [f.element('Call in progress')];
  assert.equal(readPortalObservation(f.document).call, 'connected');
  f.document.controls = []; f.document.statuses = [f.element('Call ended')];
  assert.equal(readPortalObservation(f.document).call, 'idle');
});
test('portal observer waits for connection after a trusted answer and stops after extension invalidation', async () => {
  const f = portalDocument(), sent = []; let clock = 10000;
  f.document.welcome = f.element('Welcome, Synthetic User (12345)');
  f.document.controls = [f.element('Accept'), f.element('Reject')];
  const observer = createPortalObserver({ document: f.document, documentId: 'observer-document-123', now: () => clock,
    send: async packet => { sent.push(packet); return { ok: true }; } });
  const stable = async () => { await observer.sample(); clock += 1000; await observer.sample(); };
  await stable(); f.click(true); await stable();
  assert.equal(sent.some(p => p.signal === 'accepted'), false);
  f.document.controls = [f.element('End Call')]; await stable();
  assert.equal(sent.filter(p => p.signal === 'accepted').length, 1);
  f.document.controls = []; f.document.statuses = [f.element('Call ended')]; await stable();
  assert.equal(sent.filter(p => p.signal === 'disconnected').length, 1);
  assert.doesNotMatch(JSON.stringify(sent), /Synthetic User|12345/);
  observer.stop(); const count = sent.length; await stable(); assert.equal(sent.length, count);
  const invalidated = createPortalObserver({ document: f.document, documentId: 'invalidated-document-123', now: () => clock,
    send: async () => { throw Error('Extension context invalidated.'); } });
  await invalidated.sample(); clock += 1000; await invalidated.sample(); assert.equal(invalidated.isStopped(), true);
});
test('opening the extension during a visible call or synthetic answer click cannot fabricate an acceptance', async () => {
  const f = portalDocument(), sent = []; let clock = 10000;
  f.document.welcome = f.element('Welcome, Synthetic User (12345)');
  f.document.controls = [f.element('Accept'), f.element('Reject')];
  const observer = createPortalObserver({ document: f.document, documentId: 'baseline-document-123', now: () => clock,
    send: async packet => { sent.push(packet); return { ok: true }; } });
  f.click(false); f.document.controls = [f.element('End Call')];
  await observer.sample(); clock += 1000; await observer.sample();
  assert.equal(sent.some(p => p.signal === 'accepted'), false);
  observer.stop();
  f.document.statuses = [f.element('Call in progress')];
  const baseline = createPortalObserver({ document: f.document, documentId: 'in-call-document-123', now: () => clock,
    send: async packet => { sent.push(packet); return { ok: true }; } });
  await baseline.sample(); clock += 1000; await baseline.sample();
  assert.equal(sent.some(p => p.signal === 'accepted'), false);
  baseline.stop();
});

test('trusted Sign out sends intent before navigation while synthetic, hidden and unauthenticated clicks do not', async () => {
  const f = portalDocument(), sent = [];
  f.document.welcome = f.element('Welcome, Synthetic User (12345)'); f.document.controls = [f.element('SIGN OUT')];
  const observer = createPortalObserver({ document: f.document, documentId: 'signout-document-123', send: packet => { sent.push(packet); return Promise.resolve({ ok: true }); } });
  f.click(false); assert.equal(sent.length, 0);
  f.click(true); assert.deepEqual(sent, [{ kind: 'portal-sign-out', documentId: 'signout-document-123' }]);
  f.document.controls = [f.element('Sign out', false)]; f.click(true); assert.equal(sent.length, 1);
  f.document.controls = [f.element('Sign out')]; f.document.welcome = null; f.click(true); assert.equal(sent.length, 1);
  observer.stop();
});

test('el puente bloquea una pestaña desactualizada incluso si se descarta el aviso o vuelve el valor anterior', () => {
  const values = new Map([['calls','[]'], ['state','{}'], ['settings','{}']]);
  const storage = { getItem: key => values.get(key) ?? null };
  const guard = createStorageRevisionGuard(storage, [...values.keys()]);
  const state = {}, calls = [];
  const receive = createPropioReceiver({ getState: () => state, getCalls: () => calls, now,
    canReceive: () => guard.isCurrent(), start: () => assert.fail(), end: () => assert.fail(),
    catchUp: () => { calls.push({id:'bridge'}); }, save: () => { values.set('calls', JSON.stringify(calls)); return true; } });
  values.set('calls', '[{"id":"newer-other-tab"}]');
  assert.equal(receive(end).reason, 'stale-tab');
  assert.equal(values.get('calls'), '[{"id":"newer-other-tab"}]');
  assert.deepEqual(state, {});
  values.set('calls', '[]');
  assert.equal(receive(end).reason, 'stale-tab');
});

test('el puente acepta escrituras propias y una nueva revisión tras recargar', () => {
  const values = new Map([['calls','[]']]);
  const storage = { getItem: key => values.get(key) ?? null };
  const guard = createStorageRevisionGuard(storage, ['calls']);
  assert.equal(guard.isCurrent(), true);
  values.set('calls', '[{"id":"own"}]'); guard.record('calls', values.get('calls'));
  assert.equal(guard.isCurrent(), true);
  values.set('calls', '[{"id":"other"}]');
  assert.equal(guard.isCurrent(), false);
  assert.equal(createStorageRevisionGuard(storage, ['calls']).isCurrent(), true);
  assert.equal(createStorageRevisionGuard({getItem(){throw Error('Denied');}},['calls']).isCurrent(), false);
});
function receiverFixture(clock = now) {
  const state = {}, calls = [], operations = [];
  let saved = true;
  const receive = createPropioReceiver({ getState: () => state, getCalls: () => calls, now: clock,
    start: event => { operations.push('start'); state.activeCall = { startedAt: event.at, propioBridge: { callId: event.callId } }; return saved; },
    end: event => { operations.push('end'); state.activeCall = null; calls.push({ id: `propio_${event.callId}` }); return saved; },
    catchUp: event => { operations.push('catch-up'); calls.push({ id: `propio_${event.callId}`, propioBridge: { callId: event.callId } }); return saved; },
    save: () => saved });
  return { state, calls, operations, receive, setSaved: value => { saved = value; } };
}
function workerFixture() {
  const data = {}, delivered = [];
  let targets = [], ack = { status: 'ok' }, clock = Date.parse(at), n = 0;
  const api = { runtime: { id: 'extension-id', getURL: name => `chrome-extension://extension-id/${name}` },
    storage: { local: { async get(key) { return { [key]: structuredClone(data[key]) }; }, async set(update) { Object.assign(data, structuredClone(update)); } } },
    tabs: { async query() { return targets.map((s, i) => ({ id: i + 10 })); }, async sendMessage(id, message) {
      if (message.kind === 'identify-tracker') return { accountScope: targets[id - 10] };
      delivered.push(message); return ack;
    }, async create() {} } };
  let worker = createBridgeWorker(api, { now: () => clock, randomId: () => `generated-id-${String(++n).padStart(12,'0')}` });
  async function signal(name, options = {}) {
    const requestId = `request-${++n}`;
    worker.beforeRequest({ requestId, method: 'POST', initiator: PORTAL_ORIGIN, url: endpoint, tabId: 1, timeStamp: clock,
      requestBody: { raw: [{ bytes: new TextEncoder().encode(JSON.stringify({ name, username: 'never-retained', token: 'never-retained' })).buffer }] }, ...options });
    await worker.completed({ requestId, statusCode: options.statusCode || 200 });
  }
  return { data, delivered, signal, get worker() { return worker; }, targets: value => { targets = value; },
    ack: value => { ack = value; }, advance: milliseconds => { clock += milliseconds; },
    restart() { worker = createBridgeWorker(api, { now: () => clock, randomId: () => `generated-id-${String(++n).padStart(12,'0')}` }); } };
}

const portalSender = { id: 'extension-id', frameId: 0, tab: { id: 1 }, url: PORTAL_ORIGIN + '/' };
const portalPacket = (session, extra = {}) => ({ kind: 'portal-observation', documentId: 'portal-document-12345', session, call: 'unknown', ...extra });
const signOutPacket = { kind: 'portal-sign-out', documentId: 'portal-document-12345' };
const publicRedirect = { tabId: 1, frameId: 0, url: 'https://propio.com/', transitionType: 'link', transitionQualifiers: ['server_redirect'] };
async function enablePortal(f) {
  f.targets([scope]); await f.worker.message({ kind: 'pair' }, sender);
  await f.worker.message({ kind: 'mode', mode: 'auto' }, sender);
}
test('portal login and confirmed logout queue shift events once across reload and worker restart', async () => {
  const f = workerFixture(); await enablePortal(f);
  await f.worker.message(portalPacket('authenticated'), portalSender);
  f.restart(); f.advance(1000);
  await f.worker.message(portalPacket('authenticated', { documentId: 'reloaded-document-1234' }), portalSender);
  await f.worker.message(portalPacket('unknown'), portalSender);
  assert.deepEqual(f.delivered.map(x => x.event.type), ['session-start']);
  f.advance(60000);
  await f.worker.message(portalPacket('logged-out'), portalSender);
  await f.worker.message(portalPacket('logged-out'), portalSender);
  assert.deepEqual(f.delivered.map(x => x.event.type), ['session-start', 'session-end']);
  assert.equal(f.delivered[1].event.sessionId, f.delivered[0].event.sessionId);
  assert.equal(f.delivered[1].event.startedAt, f.delivered[0].event.at);
});

test('Sign out completes on a public-site redirect without revisiting Login, persists across restart and closes calls first', async () => {
  const f = workerFixture(); await enablePortal(f);
  await f.worker.message(portalPacket('authenticated', { call: 'connected', signal: 'accepted' }), portalSender);
  assert.equal((await f.worker.message(signOutPacket, portalSender)).ok, true);
  assert.deepEqual(f.delivered.map(p => p.event.type), ['session-start', 'call-start']);
  f.advance(60000); f.restart();
  await f.worker.navigationCommitted({ ...publicRedirect, url: 'https://www.propio.com/?private-token=do-not-retain' });
  assert.deepEqual(f.delivered.map(p => p.event.type), ['session-start', 'call-start', 'call-end', 'session-end']);
  await f.worker.navigationCommitted(publicRedirect);
  await f.worker.message(portalPacket('authenticated'), portalSender);
  await f.worker.message(portalPacket('logged-out'), portalSender);
  assert.equal(f.delivered.filter(p => p.event.type === 'session-end').length, 1);
  assert.equal(f.delivered.filter(p => p.event.type === 'session-start').length, 1);
  assert.doesNotMatch(JSON.stringify(f.data), /private-token|do-not-retain|https:\/\//);
});

test('public navigation never closes a session without matching recent intent in the same authenticated tab', async () => {
  const f = workerFixture(); await enablePortal(f);
  await f.worker.message(portalPacket('authenticated'), portalSender);
  await f.worker.navigationCommitted(publicRedirect); assert.equal(f.delivered.length, 1);
  for (const badSender of [{ ...portalSender, frameId: 1 }, { ...portalSender, url: 'https://propio.com/' }, { ...portalSender, id: 'other-extension' }])
    assert.equal(await f.worker.message(signOutPacket, badSender), null);
  assert.equal((await f.worker.message({ ...signOutPacket, documentId: 'stale-document-1234' }, portalSender)).ok, false);
  await f.worker.message(signOutPacket, portalSender);
  for (const navigation of [{ ...publicRedirect, tabId: 2 }, { ...publicRedirect, frameId: 1 },
    { ...publicRedirect, url: 'https://propio.com.evil.test/' }, { ...publicRedirect, url: 'http://propio.com/' },
    { ...publicRedirect, transitionType: 'typed', transitionQualifiers: ['from_address_bar'] },
    { ...publicRedirect, transitionType: 'reload', transitionQualifiers: [] },
    { ...publicRedirect, transitionQualifiers: ['forward_back'] }]) await f.worker.navigationCommitted(navigation);
  assert.equal(f.delivered.length, 1);
  f.advance(60001); await f.worker.navigationCommitted(publicRedirect); assert.equal(f.delivered.length, 1);
});

test('a renewed portal document cancels old Sign out intent and ordinary navigation cannot reuse it', async () => {
  const f = workerFixture(); await enablePortal(f);
  await f.worker.message(portalPacket('authenticated'), portalSender);
  await f.worker.message(signOutPacket, portalSender);
  await f.worker.message(portalPacket('authenticated', { documentId: 'new-portal-document-123' }), portalSender);
  await f.worker.navigationCommitted(publicRedirect);
  assert.deepEqual(f.delivered.map(p => p.event.type), ['session-start']);
});

test('an intermediate unknown logout page preserves Sign out intent until the public redirect commits', async () => {
  const f = workerFixture(); await enablePortal(f);
  await f.worker.message(portalPacket('authenticated'), portalSender);
  await f.worker.message(signOutPacket, portalSender);
  await f.worker.message(portalPacket('unknown', { documentId: 'intermediate-document-123' }), portalSender);
  f.advance(1000); await f.worker.navigationCommitted(publicRedirect);
  assert.deepEqual(f.delivered.map(p => p.event.type), ['session-start', 'session-end']);
});
test('portal observations reject untrusted frames and never retain supplied personal data', async () => {
  const f = workerFixture(); await enablePortal(f);
  const packet = portalPacket('authenticated', { name: 'private-interpreter-name', token: 'private-token' });
  for (const sender of [{ ...portalSender, frameId: 1 }, { ...portalSender, url: 'https://evil.test/' }, { ...portalSender, id: 'other' }])
    assert.equal(await f.worker.message(packet, sender), null);
  assert.equal(f.delivered.length, 0);
  await f.worker.message(packet, portalSender);
  assert.doesNotMatch(JSON.stringify(f.data), /private-interpreter-name|private-token/);
});
test('UI and network share call IDs; confirmed logout closes calls before the shift and stale tabs cannot reopen it', async () => {
  const f = workerFixture(); await enablePortal(f);
  await f.worker.message(portalPacket('authenticated', { call: 'idle' }), portalSender);
  const secondSender = { ...portalSender, tab: { id: 2 } };
  await f.worker.message(portalPacket('authenticated', { documentId: 'second-document-12345' }), secondSender);
  await f.worker.message(portalPacket('authenticated', { call: 'connected', signal: 'accepted' }), portalSender);
  await f.signal('accepted-by-local');
  f.advance(60000);
  await f.worker.message(portalPacket('logged-out'), portalSender);
  await f.worker.message(portalPacket('authenticated', { documentId: 'second-document-12345' }), secondSender);
  await f.signal('disconnected-by-remote');
  assert.deepEqual(f.delivered.map(x => x.event.type), ['session-start', 'call-start', 'call-end', 'session-end']);
  assert.equal((await f.worker.message({ kind: 'status' }, sender)).completed, 1);
  f.advance(1000);
  await f.worker.message(portalPacket('authenticated', { documentId: 'fresh-document-12345' }), secondSender);
  assert.equal(f.delivered.at(-1).event.type, 'session-start');
});
test('auto activation during an existing portal session starts the shift on the next observation', async () => {
  const f = workerFixture(); f.targets([scope]);
  await f.worker.message(portalPacket('authenticated'), portalSender);
  assert.equal(f.delivered.length, 0);
  await enablePortal(f);
  await f.worker.message(portalPacket('authenticated'), portalSender);
  assert.deepEqual(f.delivered.map(x => x.event.type), ['session-start']);
});
test('session receiver starts and closes linked shifts at observed times and protects newer manual shifts', () => {
  const state = {}, calls = [], sessionId = 'portal-session-123456';
  const receive = createPropioReceiver({ getState: () => state, getCalls: () => calls, save: () => true, now,
    startSession: e => { state.shiftStartedAt = e.at; state.shiftEndedAt = null; }, endSession: e => { state.shiftEndedAt = e.at; } });
  const login = { version: 1, id: 'portal-login-123456', type: 'session-start', sessionId, at };
  const logout = { version: 1, id: 'portal-logout-123456', type: 'session-end', sessionId, startedAt: at, at: ended };
  assert.equal(receive(login).status, 'ok'); assert.equal(state.shiftStartedAt, at);
  assert.equal(receive(login).duplicate, true);
  state.activeCall = { manual: true };
  assert.equal(receive(logout).reason, 'another-active-call'); assert.equal(state.shiftEndedAt, null);
  state.activeCall = null;
  assert.equal(receive(logout).status, 'ok'); assert.equal(state.shiftEndedAt, ended);
  state.shiftStartedAt = '2026-10-04T18:09:00.000Z'; state.shiftEndedAt = null;
  assert.equal(receive({ ...login, id: 'late-login-123456789' }).status, 'ok');
  assert.equal(receive({ ...logout, id: 'late-logout-12345678' }).status, 'ok');
  assert.equal(state.shiftEndedAt, null);
});
test('network acceptance completed after a UI end cannot resurrect an earlier call', () => {
  const reduce = createPropioReducer({ randomId: () => 'generated-call-12345' });
  const active = reduce(null, 'accepted', at).state;
  const closed = reduce(active, 'disconnected', ended).state;
  assert.equal(reduce(closed, 'accepted', at).event, null);
});

test('signals require exact endpoints and allowlisted primitive names', () => {
  assert.equal(readPropioSignal(endpoint, { name: 'accepted-by-local' }), 'accepted');
  assert.equal(readPropioSignal(endpoint, { name: '__proto__' }), null);
  assert.equal(readPropioSignal(endpoint, { name: 'constructor' }), null);
  assert.equal(readPropioSignal(endpoint + '/extra', { name: 'incoming' }), null);
  assert.equal(readPropioSignal('https://evil.test/v4/EndpointEvents', { name: 'incoming' }), null);
  assert.equal(readPropioSignal(`${PORTAL_ORIGIN}/api/Interpreter/UpdateInterpreterStatus`, { status: 'AV' }), 'available');
  assert.equal(readPropioSignal(endpoint, [{ name: 'incoming' }]), null);
});
test('event validation rejects future, expired, zero-length and malformed values and strips unknown data', () => {
  assert.deepEqual(validateBridgeEvent({ ...end, credentials: 'secret' }, now()), end);
  for (const value of [null, [], { ...end, version: 2 }, { ...end, id: '__proto__' }, { ...end, at: at },
    { ...end, at: '2026-10-04T18:11:00Z' }, { ...end, startedAt: '2026-10-01T18:00:00Z' }]) assert.equal(validateBridgeEvent(value, now()), null);
});
test('formularios y regiones documentadas conservan el ciclo de llamada y rechazan destinos ajenos', async () => {
  for (const origin of TWILIO_EVENT_ORIGINS) {
    const f = workerFixture();
    await f.signal('ignored', { url: origin + '/v4/EndpointEvents', requestBody: { formData: { name: ['accepted-by-local'], token: ['secret-not-retained'] } } });
    f.advance(60000);
    await f.signal('ignored', { url: origin + '/v4/EndpointEvents', requestBody: { raw: [{ bytes: new TextEncoder().encode('name=disconnected-by-local&token=secret-not-retained').buffer }] } });
    const status = await f.worker.message({ kind: 'status' }, sender);
    assert.equal(status.completed, 1);
    assert.equal(status.diagnostic.recognized, 2);
    assert.equal(JSON.stringify(f.data).includes('secret-not-retained'), false);
    assert.equal(readPropioSignal(origin + '.evil.test/v4/EndpointEvents', { name: 'accepted-by-local' }), null);
    assert.equal(readPropioSignal(origin + '/v4/EndpointEvents/extra', { name: 'accepted-by-local' }), null);
  }
  assert.deepEqual(readPropioRequestBody({ formData: { status: ['AV'], password: ['never-read'] } }), { body: { status: 'AV' }, format: 'form' });
  assert.equal(readPropioSignal(`${PORTAL_ORIGIN}/api/Interpreter/UpdateInterpreterStatus`, readPropioRequestBody({ formData: { status: ['AV', 'LO'] } }).body), null);
  assert.equal(readPropioRequestBody({ raw: [{ bytes: new Uint8Array(65537).buffer }] }).format, 'oversized');
});

test('el diagnóstico no lee otras API del portal ni guarda cuerpos, rutas o credenciales', async () => {
  const f = workerFixture();
  const request = { requestId: 'private-request', method: 'POST', initiator: PORTAL_ORIGIN, url: PORTAL_ORIGIN + '/api/Login?token=private-value', tabId: 1, timeStamp: Date.parse(at) };
  Object.defineProperty(request, 'requestBody', { get() { assert.fail('No debe leer el cuerpo del login'); } });
  f.worker.beforeRequest(request);
  await f.worker.completed({ requestId: request.requestId, statusCode: 200 });
  await f.signal('unsupported-event');
  const status = await f.worker.message({ kind: 'status' }, sender);
  assert.equal(status.diagnostic.requests, 2);
  assert.equal(status.diagnostic.recognized, 0);
  assert.equal(status.diagnostic.last[0].kind, 'portal-api');
  assert.equal(status.completed, 0);
  assert.equal(status.queued, 0);
  assert.equal(JSON.stringify(f.data).includes('private-value'), false);
  assert.equal(JSON.stringify(f.data).includes('unsupported-event'), false);
  assert.equal(propioRequestKind('https://evil.test/api/Login'), null);
  const before = JSON.stringify(f.data);
  f.worker.beforeRequest({ ...request, requestId: 'wrong-origin', initiator: 'https://evil.test', requestBody: {} });
  await f.worker.completed({ requestId: 'wrong-origin', statusCode: 200 });
  assert.equal(JSON.stringify(f.data), before);
});

test('reducer ignores incoming/rejected/unmatched ends and collapses repeated starts and ends', () => {
  const reduce = createPropioReducer({ randomId: () => 'generated-call-id' });
  let state;
  for (const signal of ['incoming','rejected','disconnected']) { const result = reduce(state, signal, at); state = result.state; assert.equal(result.event, null); }
  let result = reduce(state, 'accepted', at); state = result.state; assert.equal(result.event.type, 'call-start');
  assert.equal(reduce(state, 'accepted', at).event, null);
  assert.equal(reduce(state, 'disconnected', 'garbage').event, null);
  result = reduce(state, 'disconnected', ended); assert.equal(result.event.startedAt, at); assert.equal(result.state.completed, 1);
  assert.equal(reduce(result.state, 'disconnected', ended).event, null);
});
test('receiver saves offline pairs once and recognizes official replacement metadata', () => {
  const f = receiverFixture();
  assert.equal(f.receive(start).status, 'ok'); assert.deepEqual(f.operations, []);
  assert.equal(f.receive(end).status, 'ok'); assert.deepEqual(f.operations, ['catch-up']);
  assert.equal(f.receive(end).duplicate, true);
  f.state.propioBridgeReceipts = [];
  f.calls[0] = { id: 'official-id', source: 'import', propioBridge: { callId } };
  assert.equal(f.receive(end).status, 'ok'); assert.deepEqual(f.operations, ['catch-up']);
});
test('receiver live lifecycle blocks manual conflict, mismatched start and pending backup', () => {
  let clock = Date.parse(at); const f = receiverFixture(() => clock);
  f.state.activeCall = { startedAt: at };
  assert.equal(f.receive(start).reason, 'another-active-call');
  f.state.activeCall = null;
  assert.equal(f.receive(start).status, 'ok'); assert.deepEqual(f.operations, ['start']);
  clock = now();
  assert.equal(f.receive({ ...end, startedAt: '2026-10-04T18:01:00Z' }).reason, 'start-mismatch');
  f.state.pendingLiveCallBackup = {};
  assert.equal(f.receive(end).reason, 'pending-call-review');
  f.state.pendingLiveCallBackup = null;
  assert.equal(f.receive(end).status, 'ok'); assert.deepEqual(f.operations, ['start','end']);
});
test('storage failure blocks ack, then retry persists without replaying financial mutation', () => {
  const f = receiverFixture(); f.setSaved(false);
  assert.equal(f.receive(end).status, 'blocked');
  f.setSaved(true); assert.equal(f.receive(end).status, 'ok'); assert.deepEqual(f.operations, ['catch-up']);
});
test('explicit discard prevents queued end from resurrecting a deleted bridge call', () => {
  const f = receiverFixture(); ignorePropioCall(f.state, callId, now());
  assert.equal(f.receive(end).status, 'ok'); assert.deepEqual(f.operations, []);
});
test('availability never guesses a call or a pause; corrupt receipt data is handled', () => {
  const f = receiverFixture(); f.state.propioBridgeReceipts = {};
  assert.equal(f.receive({ ...start, type: 'available' }).status, 'ok');
  assert.deepEqual(f.operations, []); assert.equal(f.state.activeCall, undefined);
});
test('a delayed acceptance cannot end a newer manual pause before it started', () => {
  const f = receiverFixture(() => Date.parse(at) + 30000);
  f.state.activePause = { startedAt: '2026-10-04T18:00:10.000Z' };
  assert.equal(f.receive(start).reason, 'pause-after-call-start'); assert.deepEqual(f.operations, []);
});
test('observation survives worker restart without writing the tracker or retaining payload data', async () => {
  const f = workerFixture(); f.targets([scope]);
  assert.equal((await f.worker.message({ kind: 'mode', mode: 'auto' }, sender)).ok, false);
  await f.signal('accepted-by-local'); f.restart(); f.advance(600000); await f.signal('disconnected-by-remote');
  const status = await f.worker.message({ kind: 'status' }, sender);
  assert.equal(status.completed, 1); assert.equal(status.mode, 'observe'); assert.equal(f.delivered.length, 0);
  assert.equal(JSON.stringify(f.data).includes('never-retained'), false);
});
test('worker ignores failed requests, foreign initiators, and non-call events', async () => {
  const f = workerFixture();
  await f.signal('accepted-by-local', { statusCode: 500 });
  await f.signal('accepted-by-local', { initiator: 'https://evil.test' });
  await f.signal('incoming'); await f.signal('rejected-by-local'); f.advance(600000); await f.signal('disconnected-by-remote');
  assert.equal((await f.worker.message({ kind: 'status' }, sender)).completed, 0);
  assert.equal((await f.worker.message({ kind: 'status' }, { ...sender, id: 'foreign' })), null);
  assert.equal((await f.worker.message({ kind: 'pair' }, { ...sender, tab: { id: 7 }, url: TRACKER_ORIGIN + '/' })), null);
});
async function activate(f) {
  f.targets([scope]); await f.worker.message({ kind: 'pair' }, sender);
  await f.signal('accepted-by-local'); f.advance(600000); await f.signal('disconnected-by-remote');
  assert.equal((await f.worker.message({ kind: 'mode', mode: 'auto' }, sender)).ok, true);
}

test('paired users can enable auto before the first observed call and save that first accepted pair once', async () => {
  const f = workerFixture();
  assert.equal((await f.worker.message({kind:'mode',mode:'auto'},sender)).reason,'account-needed');
  f.targets([scope]); await f.worker.message({kind:'pair'},sender);
  assert.equal((await f.worker.message({kind:'status'},sender)).completed,0);
  assert.equal((await f.worker.message({kind:'mode',mode:'auto'},sender)).ok,true);
  await f.signal('incoming'); await f.signal('rejected-by-local'); await f.signal('disconnected-by-remote');
  assert.equal(f.delivered.length,0);
  await f.signal('accepted-by-local'); f.advance(600000); await f.signal('disconnected-by-local');
  await f.signal('disconnected-by-remote');
  assert.deepEqual(f.delivered.map(packet=>packet.event.type),['call-start','call-end']);
  assert.equal((await f.worker.message({kind:'status'},sender)).completed,1);
});

test('enabling before a completed observation does not fabricate an already accepted call', async()=>{
  const f=workerFixture();f.targets([scope]);await f.worker.message({kind:'pair'},sender);
  await f.signal('accepted-by-local');f.advance(60000);
  await f.worker.message({kind:'mode',mode:'auto'},sender);
  await f.signal('disconnected-by-local');assert.equal(f.delivered.length,0);
  await f.signal('accepted-by-local');f.advance(60000);await f.signal('disconnected-by-local');
  assert.deepEqual(f.delivered.map(packet=>packet.event.type),['call-start','call-end']);
});
test('activation does not fabricate the end of an already observed call; auto delivers pairs once', async () => {
  const f = workerFixture(); await activate(f);
  await f.signal('disconnected-by-remote'); assert.equal(f.delivered.length, 0);
  await f.signal('accepted-by-local'); await f.signal('accepted-by-local'); f.advance(600000);
  await f.signal('disconnected-by-local'); await f.signal('disconnected-by-remote');
  assert.deepEqual(f.delivered.map(packet => packet.event.type), ['call-start','call-end']);
  assert.equal((await f.worker.message({ kind: 'status' }, sender)).queued, 0);
});
test('closed tracker queues across restart, prevents cross-account pairing and pauses expired data', async () => {
  const f = workerFixture(); await activate(f); f.targets([]);
  await f.signal('accepted-by-local'); f.advance(600000); await f.signal('disconnected-by-local');
  f.restart(); f.targets([other]); assert.equal((await f.worker.message({ kind: 'pair' }, sender)).reason, 'pending-account');
  await f.worker.flush(); assert.equal(f.delivered.length, 0);
  f.targets([scope]); await f.worker.flush(); assert.equal(f.delivered.length, 2);
  f.targets([]); await f.signal('accepted-by-local'); f.advance(25*60*60*1000); f.targets([scope]); await f.worker.flush();
  const status = await f.worker.message({ kind: 'status' }, sender); assert.equal(status.mode, 'observe'); assert.equal(status.attention, 'expired-event');
});
test('multiple writable tracker tabs and rejected app acknowledgments hold queue', async () => {
  const f = workerFixture(); await activate(f); f.targets([scope, scope]);
  await f.signal('accepted-by-local'); assert.equal(f.delivered.length, 0);
  assert.equal((await f.worker.message({ kind: 'status' }, sender)).attention, 'multiple-trackers');
  f.targets([scope]); f.ack({ status: 'blocked' }); await f.worker.flush();
  assert.equal((await f.worker.message({ kind: 'status' }, sender)).queued, 1);
  f.ack({ status: 'rejected' }); await f.worker.flush(); assert.equal((await f.worker.message({ kind: 'status' }, sender)).mode, 'observe');
});
test('reviewed pending signals require a popup action and return to observation', async () => {
  const f = workerFixture(); await activate(f); f.targets([]); await f.signal('accepted-by-local');
  assert.equal(await f.worker.message({kind:'clear-reviewed'}, {...sender,url:TRACKER_ORIGIN+'/'}), null);
  assert.equal((await f.worker.message({kind:'status'}, sender)).queued, 1);
  assert.equal((await f.worker.message({kind:'clear-reviewed'}, sender)).ok, true);
  const status = await f.worker.message({kind:'status'}, sender); assert.equal(status.queued, 0); assert.equal(status.mode, 'observe');
});
test('reconnecting a paired account is idempotent; changing account or pausing cannot orphan an active call', async () => {
  const f = workerFixture(); await activate(f); await f.signal('accepted-by-local');
  assert.equal((await f.worker.message({kind:'pair'},sender)).ok,true);
  assert.equal((await f.worker.message({kind:'status'},sender)).mode,'auto');
  assert.equal((await f.worker.message({kind:'mode',mode:'observe'},sender)).reason,'active-portal-call');
  f.targets([other]); assert.equal((await f.worker.message({kind:'pair'},sender)).reason,'active-portal-call');
  f.targets([scope]); f.advance(600000); await f.signal('disconnected-by-local');
  assert.equal(f.delivered.at(-1).event.type,'call-end');
  assert.equal((await f.worker.message({kind:'mode',mode:'observe'},sender)).ok,true);
});
test('window bridge validates source, origin, scope and nonce, and stops after logout', async () => {
  const posted = [], listeners = new Set(); let applied = 0;
  const host = { crypto: { randomUUID: () => 'nonce-123456789012' }, location: { origin: TRACKER_ORIGIN }, navigator: {},
    postMessage(packet) { posted.push(packet); }, addEventListener(_, fn) { listeners.add(fn); }, removeEventListener(_, fn) { listeners.delete(fn); } };
  const stop = installPropioBridge({ host, accountScope: scope, receive: () => { applied++; return { status: 'ok' }; } });
  const ready = posted[0], dispatch = data => { for (const fn of listeners) fn(data); };
  const packet = { protocol: ready.protocol, direction: 'extension', kind: 'event', nonce: ready.nonce, accountScope: scope, requestId: 'request-id-123456789', event: end };
  dispatch({ source: host, origin: 'https://evil.test', data: packet });
  dispatch({ source: host, origin: TRACKER_ORIGIN, data: { ...packet, nonce: 'wrong' } });
  dispatch({ source: {}, origin: TRACKER_ORIGIN, data: packet });
  await Promise.resolve(); assert.equal(applied, 0);
  dispatch({ source: host, origin: TRACKER_ORIGIN, data: packet }); await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(applied, 1); assert.equal(posted.at(-1).kind, 'ack');
  stop(); dispatch({ source: host, origin: TRACKER_ORIGIN, data: packet }); assert.equal(applied, 1);
});
