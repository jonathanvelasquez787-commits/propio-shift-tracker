import test from 'node:test';
import assert from 'node:assert/strict';
import { readPropioSignal, createPropioReducer, validateBridgeEvent, PORTAL_ORIGIN, TRACKER_ORIGIN } from '../js/propio-bridge-rules.js';
import { createPropioReceiver, createStorageRevisionGuard, ignorePropioCall, installPropioBridge } from '../js/propio-bridge.js';
import { createBridgeWorker } from '../extension/propio-bridge/bridge-worker.js';

const at = '2026-10-04T18:00:00.000Z', ended = '2026-10-04T18:10:00.000Z';
const scope = 'a'.repeat(64), other = 'b'.repeat(64), callId = 'test-call-123456789';
const start = { version: 1, id: 'test-start-12345678', type: 'call-start', callId, at };
const end = { version: 1, id: 'test-end-123456789', type: 'call-end', callId, startedAt: at, at: ended };
const now = () => Date.parse(ended);
const endpoint = 'https://eventgw.twilio.com/v4/EndpointEvents';
const sender = { id: 'extension-id', url: 'chrome-extension://extension-id/popup.html' };

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
