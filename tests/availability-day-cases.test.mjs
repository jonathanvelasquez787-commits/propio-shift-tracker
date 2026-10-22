import test from 'node:test';
import assert from 'node:assert/strict';
import { createBridgeWorker } from '../extension/propio-bridge/bridge-worker.js';
import { PORTAL_ORIGIN, TRACKER_ORIGIN } from '../js/propio-bridge-rules.js';

const start = Date.parse('2026-10-15T14:00:00Z'), scope = 'a'.repeat(64);
function fixture(offset = 600000) {
  let clock = start + offset, serial = 0, targets = [scope], plan = {}, result = { status: 'ok' };
  const coordinationOwner = '11111111-1111-4111-8111-111111111111';
  const storage = { 'bridge-v1': { schema: 1, coordinationOwner } }, events = [];
  const iso = value => new Date(value).toISOString();
  const api = { runtime: { id: 'day-fixture', getURL: path => 'chrome-extension://day-fixture/' + path },
    storage: { local: { get: async key => ({ [key]: structuredClone(storage[key]) }), set: async value => Object.assign(storage, structuredClone(value)) } },
    tabs: { query: async options => options.url.startsWith(TRACKER_ORIGIN) ? targets.map((_, index) => ({ id: index + 10 })) : [{ id: 1 }],
      sendMessage: async (id, packet) => {
        if (packet.kind === 'identify-tracker') return { accountScope: targets[id - 10], plan: {
          startAt: iso(start), endAt: iso(start + 8 * 3600000), scheduledPauses: [], hasCall: true,
          lastCallEndedAt: iso(start), acw: { startedAt: iso(start), observedAt: iso(clock) },
          automationLease: { version: 1, owner: coordinationOwner, grantedAt: iso(clock), expiresAt: iso(clock + 25000) }, ...plan } };
        events.push(packet); return result;
      } } };
  const create = () => createBridgeWorker(api, { now: () => clock, randomId: () => 'day-case-event-' + String(++serial).padStart(12, '0') });
  let worker = create();
  const popup = { id: api.runtime.id, url: api.runtime.getURL('popup.html') };
  const portal = { id: api.runtime.id, url: PORTAL_ORIGIN + '/portal', tab: { id: 1 }, frameId: 0 };
  const documentId = 'day-case-document-1234';
  const send = packet => worker.message(packet, popup);
  const observe = (extra = {}, sender = portal) => worker.message({ kind: 'portal-observation', session: 'authenticated', call: 'idle',
    offline: true, documentId, observedAt: iso(clock), ...extra }, sender);
  return { storage, events, iso, send, observe, portal, documentId, now: () => clock,
    plan: update => { plan = update; }, advance: amount => { clock += amount; }, targets: values => { targets = values; },
    ack: value => { result = value; }, restart: () => { worker = create(); },
    native: (action, sender = portal, doc = documentId) => worker.message({ kind: 'portal-manual-availability', action, documentId: doc }, sender),
    async enable() { await send({ kind: 'pair' }); await send({ kind: 'mode', mode: 'auto' }); await send({ kind: 'spacing', enabled: true, minutes: 3 }); } };
}

test('disabled Break and Lunch return cannot be bypassed by elapsed ACW or a first-call initiator', async () => {
  for (const type of ['break', 'lunch']) for (const hasCall of [false, true]) {
    const f = fixture();
    f.plan({ hasCall, lastPause: { type, startedAt: f.iso(start + 60000), endedAt: f.iso(start + 120000) } });
    await f.enable(); await f.send({ kind: 'prepare-first', enabled: true });
    const response = await f.observe(); assert.equal(response.prepare, false);
    assert.equal(response.stopCalls, false); assert.equal(f.storage['bridge-v1'].preparation.waitReason, 'pause-return-off');
    await f.observe({ call: 'connected', offline: false, signal: 'accepted' });
    f.advance(60000); await f.observe({ signal: 'disconnected' });
    f.plan({ hasCall: true, lastCallEndedAt: f.iso(f.now()), lastPause: { type, startedAt: f.iso(start + 60000), endedAt: f.iso(start + 120000) },
      acw: { startedAt: f.iso(f.now()), observedAt: f.iso(f.now()) } });
    assert.equal((await f.observe()).prepare, false);
    f.advance(180001);
    f.plan({ hasCall: true, lastCallEndedAt: f.iso(f.now() - 180001), lastPause: { type, startedAt: f.iso(start + 60000), endedAt: f.iso(start + 120000) } });
    assert.equal((await f.observe()).prepare, true, 'a real call after the pause starts ordinary spacing again');
  }
});

test('enabled pause return wins over a short ACW but cannot skip a different scheduled pause', async () => {
  for (const type of ['break', 'lunch']) {
    const f = fixture(); await f.enable();
    await f.send({ kind: 'resume-options', break: true, lunch: true, mode: 'manual' });
    const pause = { type, startedAt: f.iso(start + 300000), endedAt: f.iso(f.now()) };
    f.plan({ lastPause: pause, acw: { startedAt: pause.endedAt, observedAt: pause.endedAt } });
    assert.equal((await f.observe()).prepare, true, 'no extra cooldown after an enabled return');
    f.advance(16000);
    f.plan({ lastPause: pause, scheduledPauses: [{ type: type === 'break' ? 'lunch' : 'break', startedAt: f.iso(start + 600000), endedAt: f.iso(start + 1200000) }] });
    assert.equal((await f.observe()).prepare, false);
    assert.equal(f.storage['bridge-v1'].preparation.waitReason, 'pause');
  }
});

test('explicitly ending a matching pause early overrides that scheduled block only', async () => {
  const f = fixture(); await f.enable();
  await f.send({ kind: 'resume-options', break: true, lunch: false, mode: 'manual' });
  f.plan({ lastPause: { type: 'break', startedAt: f.iso(start + 300000), endedAt: f.iso(start + 540000) },
    scheduledPauses: [{ type: 'break', startedAt: f.iso(start + 300000), endedAt: f.iso(start + 1200000) }] });
  assert.equal((await f.observe()).prepare, true);
  const other = fixture(); await other.enable();
  await other.send({ kind: 'resume-options', break: true, lunch: false, mode: 'manual' });
  other.plan({ lastPause: { type: 'break', startedAt: other.iso(start), endedAt: other.iso(start + 60000) },
    scheduledPauses: [{ type: 'break', startedAt: other.iso(start + 300000), endedAt: other.iso(start + 1200000) }] });
  assert.equal((await other.observe()).prepare, false, 'an older unrelated break does not override this block');
});

test('manual Stop pauses availability across reload and worker restart without stopping call recording', async () => {
  const f = fixture(); await f.enable();
  await f.observe({ offline: false, available: true });
  assert.equal((await f.native('stop')).ok, true);
  f.restart(); f.advance(20000);
  assert.equal((await f.observe({ documentId: 'reloaded-day-document-1234' })).prepare, false);
  assert.equal(f.storage['bridge-v1'].preparation.waitReason, 'manual-paused');
  assert.equal(f.storage['bridge-v1'].mode, 'auto');
  await f.observe({ call: 'connected', offline: false, signal: 'accepted' }); f.advance(60000);
  await f.observe({ signal: 'disconnected' });
  assert.equal(f.events.filter(packet => packet.event.type === 'call-end').length, 1);
  f.advance(180001); assert.equal((await f.observe()).prepare, false);
  assert.equal((await f.native('start')).ok, true);
  assert.equal((await f.observe()).prepare, true);
});

test('explicit popup pause preserves all preferences and blocks timed pause completion until resumed', async () => {
  const f = fixture(); await f.enable();
  await f.send({ kind: 'resume-options', break: true, lunch: true, mode: 'timed' });
  f.plan({ pause: { type: 'break', startedAt: f.iso(start), endsAt: f.iso(start + 300000) } });
  assert.equal((await f.send({ kind: 'pause-availability', paused: true })).ok, true);
  await f.observe(); assert.equal(f.events.some(packet => packet.event.type === 'pause-end'), false);
  f.restart(); assert.equal(f.storage['bridge-v1'].preparation.spacing.minutes, 3);
  await f.send({ kind: 'pause-availability', paused: false }); await f.observe();
  assert.equal(f.events.filter(packet => packet.event.type === 'pause-end').length, 0, 'a restarted worker confirms its lease before closing a pause');
  await f.observe();
  assert.equal(f.events.filter(packet => packet.event.type === 'pause-end').length, 1);
});

test('manual availability messages require this authenticated top-level portal document', async () => {
  const f = fixture(); await f.enable(); await f.observe({ call: 'incoming', offline: false });
  for (const sender of [{ ...f.portal, frameId: 1 }, { ...f.portal, url: TRACKER_ORIGIN }, { ...f.portal, id: 'foreign-id' }]) {
    assert.equal(await f.native('stop', sender), null);
  }
  assert.equal((await f.native('stop', f.portal, 'wrong-document-1234')).ok, false);
  f.advance(15001); assert.equal((await f.native('stop')).ok, false);
  assert.equal(f.storage['bridge-v1'].preparation.availabilityPaused, false);
});

test('pausing availability cancels an undelivered timed pause closure while preserving call events', async () => {
  const f = fixture(); await f.enable();
  await f.send({ kind: 'resume-options', break: true, lunch: true, mode: 'timed' });
  f.plan({ pause: { type: 'break', startedAt: f.iso(start), endsAt: f.iso(start + 300000) } });
  f.ack({ status: 'blocked' }); await f.observe(); await f.observe();
  assert.equal(f.storage['bridge-v1'].queue.filter(item => item.event.type === 'pause-end').length, 1);
  await f.send({ kind: 'pause-availability', paused: true });
  assert.equal(f.storage['bridge-v1'].queue.some(item => item.event.type === 'pause-end'), false);
  assert.equal(f.storage['bridge-v1'].queue.some(item => item.event.type === 'session-start'), true);
});

test('closing or switching the tracker discards cached readiness even with an empty delivery queue', async () => {
  for (const targets of [[], ['b'.repeat(64)], [scope, scope]]) {
    const f = fixture(); await f.enable(); await f.observe({ offline: false, available: true });
    assert.equal(f.storage['bridge-v1'].queue.length, 0);
    f.targets(targets); f.advance(16000);
    const response = await f.observe(); assert.equal(response.prepare, false); assert.equal(response.stopCalls, false);
    assert.equal(f.storage['bridge-v1'].preparation.plan, null);
    f.targets([scope]); assert.equal((await f.observe()).prepare, true);
  }
});

test('changing cooldown minutes uses the same ACW and disabling it performs no availability action', async () => {
  const f = fixture(120000); await f.enable();
  await f.send({ kind: 'spacing', enabled: true, minutes: 5 });
  assert.equal((await f.observe({ offline: false, available: true })).stopCalls, true);
  assert.equal(f.storage['bridge-v1'].preparation.spacing.waitUntil, f.iso(start + 300000));
  f.advance(60000); await f.send({ kind: 'spacing', enabled: true, minutes: 2 });
  assert.equal((await f.observe()).prepare, true);
  await f.send({ kind: 'spacing', enabled: false, minutes: 2 }); f.advance(16000);
  assert.deepEqual(await f.observe(), { ok: true, prepare: false, stopCalls: false, historyEnabled: true });
});

test('rejected offers do not restart elapsed ACW and accepted calls are never interrupted', async () => {
  const f = fixture(); await f.enable(); assert.equal((await f.observe()).prepare, true);
  assert.equal((await f.observe({ call: 'incoming', signal: 'incoming', offline: false, available: true })).stopCalls, false);
  await f.observe({ signal: 'rejected' }); f.advance(16000);
  assert.equal((await f.observe()).prepare, true);
  await f.observe({ call: 'connected', signal: 'accepted', offline: false });
  f.advance(20000);
  const response = await f.observe({ call: 'connected', offline: false, available: true });
  assert.equal(response.prepare, false); assert.equal(response.stopCalls, false);
});

test('resume after suspension checks the current shift, pauses and clock before one action', async () => {
  for (const offset of [-3600000, 9 * 3600000]) {
    const f = fixture(); await f.enable(); await f.observe({ offline: false, available: true });
    f.advance(offset); f.restart();
    const reply = await f.observe(); assert.equal(reply.prepare, false); assert.equal(reply.stopCalls, false);
  }
  const f = fixture(); await f.enable(); f.advance(3600000); f.restart();
  assert.equal((await f.observe()).prepare, true);
  assert.equal((await f.observe()).prepare, false, 'no catch-up batch after suspension');
});

test('future ACW snapshots cannot advance availability after the PC clock moves backward', async () => {
  const f = fixture(); await f.enable();
  f.plan({ acw: { startedAt: f.iso(start), observedAt: f.iso(f.now() + 500) } });
  const reply = await f.observe({ offline: false, available: true });
  assert.equal(reply.prepare, false); assert.equal(reply.stopCalls, true);
});

test('a real early call consumes first-call preparation but never overrides the planned shift boundary', async () => {
  const f = fixture(-600000); await f.enable(); await f.send({ kind: 'prepare-first', enabled: true });
  f.plan({ hasCall: true, lastCallEndedAt: null });
  await f.observe({ call: 'connected', offline: false, signal: 'accepted' });
  f.advance(60000); assert.equal((await f.observe({ signal: 'disconnected' })).prepare, false);
  const ended = f.iso(f.now());
  f.advance(540000); f.plan({ hasCall: true, acw: { startedAt: ended, observedAt: f.iso(f.now()) } });
  assert.equal((await f.observe()).prepare, true);
  assert.equal(f.storage['bridge-v1'].preparation.doneFor, f.iso(start));
});

test('manual acceptance during cooldown creates one new wait after that call ends', async () => {
  const f = fixture(60000); await f.enable();
  assert.equal((await f.observe({ offline: false, available: true })).stopCalls, true);
  await f.observe({ call: 'connected', offline: false, signal: 'accepted' });
  f.advance(60000); await f.observe({ signal: 'disconnected' });
  const endedAt = f.iso(f.now());
  f.plan({ lastCallEndedAt: endedAt, acw: { startedAt: endedAt, observedAt: endedAt } });
  assert.equal((await f.observe()).prepare, false);
  assert.equal(f.storage['bridge-v1'].preparation.spacing.waitUntil, f.iso(f.now() + 180000));
  assert.equal(f.events.filter(packet => packet.event.type === 'call-end').length, 1);
});

test('closing and reopening the same scheduled shift does not repeat its first-call initiator', async () => {
  const f = fixture(); await f.enable(); await f.send({ kind: 'prepare-first', enabled: true });
  await f.send({ kind: 'spacing', enabled: false, minutes: 3 });
  f.plan({ hasCall: false }); assert.equal((await f.observe()).prepare, true);
  await f.observe({ call: 'connected', offline: false, signal: 'accepted' });
  await f.observe({ signal: 'disconnected' });
  f.plan({ ended: true }); assert.equal((await f.observe()).prepare, false);
  f.advance(20000); f.restart(); f.plan({ hasCall: false });
  assert.equal((await f.observe()).prepare, false);
});

test('overnight cooldown survives midnight and a late pause return still respects shift end', async () => {
  const f = fixture(10 * 3600000); await f.enable();
  const nightStart = start + 8 * 3600000, nightEnd = start + 16 * 3600000;
  f.plan({ startAt: f.iso(nightStart), endAt: f.iso(nightEnd), lastCallEndedAt: f.iso(nightStart) });
  assert.equal((await f.observe()).prepare, true);
  f.advance(6 * 3600000); await f.send({ kind: 'resume-options', break: true, lunch: true, mode: 'manual' });
  f.plan({ startAt: f.iso(nightStart), endAt: f.iso(nightEnd),
    lastPause: { type: 'lunch', startedAt: f.iso(nightEnd - 600000), endedAt: f.iso(nightEnd) } });
  assert.equal((await f.observe()).prepare, false);
  assert.equal(f.storage['bridge-v1'].preparation.waitReason, 'shift-ended');
});

test('official-history changes follow the visible ACW instead of an independent elapsed timer', async () => {
  const f = fixture(120000); await f.enable();
  await f.observe(); assert.equal(f.storage['bridge-v1'].preparation.spacing.waitUntil, f.iso(start + 180000));
  f.plan({ acw: { startedAt: f.iso(start + 60000), observedAt: f.iso(f.now()) } });
  assert.equal((await f.observe()).prepare, false);
  assert.equal(f.storage['bridge-v1'].preparation.spacing.waitUntil, f.iso(start + 240000));
  f.advance(120001);
  f.plan({ acw: { startedAt: f.iso(start + 60000), observedAt: f.iso(f.now()) } });
  assert.equal((await f.observe()).prepare, true);
});
