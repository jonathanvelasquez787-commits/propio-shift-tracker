import test from 'node:test';
import assert from 'node:assert/strict';
import { readPropioSignal, readPropioRequestBody, propioRequestKind, TWILIO_EVENT_ORIGINS, createPropioReducer, validateBridgeEvent, PORTAL_ORIGIN, TRACKER_ORIGIN } from '../js/propio-bridge-rules.js';
import { createPropioReceiver, createStorageRevisionGuard, ignorePropioCall, installPropioBridge } from '../js/propio-bridge.js';
import { createBridgeWorker } from '../extension/propio-bridge/bridge-worker.js';
import { createPortalObserver, readPortalObservation, offlineStartButton, availableStopButton, controlKind } from '../extension/propio-bridge/portal-observer.js';

test('decorative icon text cannot hide exact call controls and heading statuses are observed', () => {
  const f = portalDocument(); f.document.welcome = f.element('Welcome, Synthetic User (12345)');
  const control = f.element('call START CALLS');
  control.cloneNode = () => { const clean = { textContent: 'call START CALLS', querySelectorAll: () => [{ remove() { clean.textContent = 'START CALLS'; } }] }; return clean; };
  f.document.controls = [control]; f.document.statuses = [f.element('OFFLINE')];
  const query = f.document.querySelectorAll;
  f.document.querySelectorAll = selector => selector.startsWith('[role="status"]') && !selector.split(',').includes('h5') ? [] : query(selector);
  assert.equal(controlKind(control), 'idle'); assert.equal(offlineStartButton(f.document), control);
  f.document.controls = [f.element('Start Calls tomorrow')]; assert.equal(offlineStartButton(f.document), null);
});

test('native old and new portal statuses support stopping availability and restarting from Not Available', () => {
  const f = portalDocument(); f.document.welcome = f.element('Welcome, Synthetic User (12345)');
  const start = f.element('Start Calls'), stop = f.element('Stop Calls');
  f.document.controls = [stop];
  for (const text of ['Available', 'Call Status: Available', 'Wrap Up', 'Call Status: Wrap Up']) {
    f.document.statuses = [f.element(text)]; assert.equal(availableStopButton(f.document), stop, text);
  }
  f.document.controls = [start];
  for (const text of ['Offline', 'Not Available', 'Call Status: Not Available']) {
    f.document.statuses = [f.element(text)]; assert.equal(offlineStartButton(f.document), start, text);
  }
  f.document.controls = [stop]; f.document.statuses = [f.element('Ringing')];
  assert.equal(availableStopButton(f.document), null);
  f.document.controls = [start]; assert.equal(offlineStartButton(f.document), null);
});

test('spacing follows an already running ACW through the threshold without waiting for a zero tick', async () => {
  for (const elapsed of [1000, 50000, 180001]) {
    const f = workerFixture();
    f.advance(elapsed);
    const sync = () => f.plan({ startAt: at, endAt: '2026-10-04T22:00:00.000Z', hasCall: true,
      lastCallEndedAt: new Date(f.now()).toISOString(), acw: { startedAt: at, observedAt: new Date(f.now()).toISOString() } });
    sync(); await enablePortal(f);
    await f.worker.message({ kind: 'spacing', enabled: true, minutes: 3 }, sender);
    const observe = extra => f.worker.message(portalPacket('authenticated', { call: 'idle', offline: true, ...extra }), portalSender);
    let result = await observe({ offline: false, available: true });
    assert.equal(result.stopCalls, elapsed < 180000);
    if (elapsed < 180000) {
      f.advance(180000 - elapsed - 1); sync(); assert.equal((await observe()).prepare, false);
      f.advance(2); sync();
    }
    assert.equal((await observe()).prepare, true);
    f.restart(); assert.equal((await observe()).prepare, false, 'no duplicate start after restart');
  }
});

test('early login ACW never overrides the first-call schedule or adds a cooldown at shift start', async () => {
  const f = workerFixture(), scheduled = '2026-10-04T18:30:00.000Z';
  f.plan({ startAt: scheduled, endAt: '2026-10-04T22:00:00.000Z', hasCall: false,
    acw: { startedAt: at, observedAt: at } });
  await enablePortal(f); await f.worker.message({ kind: 'prepare-first', enabled: true }, sender);
  await f.worker.message({ kind: 'spacing', enabled: true, minutes: 3 }, sender);
  const observe = () => f.worker.message(portalPacket('authenticated', { call: 'idle', offline: true }), portalSender);
  f.advance(180000); assert.equal((await observe()).prepare, false);
  f.advance(27 * 60000 - 1); assert.equal((await observe()).prepare, false);
  f.advance(1); assert.equal((await observe()).prepare, true);
  assert.equal(f.data['bridge-v1'].preparation.spacing.waitUntil, null);
});

test('spacing stops availability but never starts with stale, missing or pre-disconnection ACW snapshots', async () => {
  const f = workerFixture(), base = { startAt: at, endAt: '2026-10-04T22:00:00.000Z', hasCall: true };
  f.plan({ ...base, acw: null }); await enablePortal(f);
  await f.worker.message({ kind: 'spacing', enabled: true, minutes: 3 }, sender);
  const observe = extra => f.worker.message(portalPacket('authenticated', { call: 'idle', offline: true, ...extra }), portalSender);
  const sync = acw => f.plan({ ...base, acw });
  f.advance(240000);
  for (const acw of [undefined, null, { startedAt: at, observedAt: at }]) {
    sync(acw); const reply = await observe({ offline: false, available: true });
    assert.equal(reply.stopCalls, true); assert.equal((await observe()).prepare, false); f.advance(16000);
  }
  const beforeEnd = new Date(f.now()).toISOString();
  sync({ startedAt: at, observedAt: beforeEnd });
  await observe({ call: 'connected', signal: 'accepted', offline: false }); f.advance(1000);
  assert.equal((await observe({ signal: 'disconnected', offline: false, available: true })).stopCalls, true);
  assert.equal((await observe()).prepare, false);
  sync({ startedAt: at, observedAt: new Date(f.now()).toISOString() });
  assert.equal((await observe()).prepare, true, 'a new snapshot can resume even when the counter began earlier');
  for (const call of ['incoming', 'connected', 'unknown']) {
    const reply = await observe({ call, offline: false, available: true });
    assert.equal(reply.prepare, false); assert.equal(reply.stopCalls, false);
  }
});

test('spacing pause and schedule guards dominate elapsed ACW while explicit pause return keeps its priority', async () => {
  const f = workerFixture(), base = { startAt: at, endAt: '2026-10-04T22:00:00.000Z', hasCall: true };
  await enablePortal(f); await f.worker.message({ kind: 'spacing', enabled: true, minutes: 3 }, sender);
  f.advance(600000);
  const observe = () => f.worker.message(portalPacket('authenticated', { call: 'idle', offline: true }), portalSender);
  const pause = { type: 'break', startedAt: '2026-10-04T18:09:00.000Z', endsAt: '2026-10-04T18:20:00.000Z' };
  f.plan({ ...base, acw: { startedAt: at, observedAt: new Date(f.now()).toISOString() }, pause });
  await f.worker.message({ kind: 'resume-options', break: true, lunch: false, mode: 'manual' }, sender);
  assert.equal((await observe()).prepare, false);
  f.plan({ ...base, lastPause: { ...pause, endedAt: new Date(f.now()).toISOString() },
    acw: { startedAt: new Date(f.now()).toISOString(), observedAt: new Date(f.now()).toISOString() } });
  assert.equal((await observe()).prepare, true);
  f.plan({ ...base, ended: true }); f.advance(16000); assert.equal((await observe()).prepare, false);
});

test('connection refresh reloads only its single paired tracker and holds during calls, offers or ambiguous accounts', async () => {
  const f = workerFixture(); f.plan({ startAt: at, endAt: '2026-10-04T22:00:00.000Z', scheduleVerified: false });
  await enablePortal(f);
  assert.equal((await f.worker.message({ kind: 'refresh-tracker' }, sender)).ok, true); assert.deepEqual(f.reloads, [10]);
  f.targets([scope, scope]); assert.equal((await f.worker.message({ kind: 'refresh-tracker' }, sender)).reason, 'multiple-trackers');
  f.targets([other]); assert.equal((await f.worker.message({ kind: 'refresh-tracker' }, sender)).reason, 'tracker-closed');
  f.targets([scope]);
  for (const call of ['incoming', 'connected']) {
    await f.worker.message(portalPacket('authenticated', { call }), portalSender);
    assert.equal((await f.worker.message({ kind: 'refresh-tracker' }, sender)).reason, 'active-portal-call');
  }
  assert.deepEqual(f.reloads, [10]);
});

test('spacing waits from confirmed call end, stops availability once and survives restart without touching the next accepted call', async () => {
  const f = workerFixture(); f.plan({ startAt: at, endAt: '2026-10-04T22:00:00.000Z', hasCall: true });
  await enablePortal(f);
  await f.worker.message({ kind: 'spacing', enabled: true, minutes: 2 }, sender);
  const observe = extra => f.worker.message(portalPacket('authenticated', { call: 'idle', offline: true, ...extra }), portalSender);
  assert.equal((await observe()).prepare, false);
  await observe({ call: 'connected', offline: false, signal: 'accepted' });
  f.advance(60000);
  let result = await observe({ signal: 'disconnected', offline: false, available: true });
  assert.equal(result.prepare, false); assert.equal(result.stopCalls, true);
  assert.equal((await observe({ offline: false, available: true })).stopCalls, false);
  f.restart(); f.advance(119000); assert.equal((await observe()).prepare, false);
  f.advance(1000); assert.equal((await observe()).prepare, true);
  await observe({ call: 'incoming', offline: false });
  assert.equal((await observe({ call: 'incoming', offline: false })).prepare, false);
  result = await observe({ call: 'connected', offline: false, available: true, signal: 'accepted' });
  assert.equal(result.prepare, false); assert.equal(result.stopCalls, false);
  assert.equal(f.data['bridge-v1'].preparation.spacing.enabled, true);
});

test('spacing respects planned and active pauses, shift boundaries, disabled preferences and invalid intervals', async () => {
  const f = workerFixture(), plan = { startAt: at, endAt: '2026-10-04T22:00:00.000Z', hasCall: true, lastCallEndedAt: at };
  f.plan(plan); await enablePortal(f);
  for (const minutes of [0, -1, 1.5, 61, NaN, '2']) assert.equal((await f.worker.message({ kind: 'spacing', enabled: true, minutes }, sender)).ok, false);
  await f.worker.message({ kind: 'spacing', enabled: true, minutes: 1 }, sender);
  const observe = extra => f.worker.message(portalPacket('authenticated', { call: 'idle', offline: true, ...extra }), portalSender);
  f.advance(60000);
  f.plan({ ...plan, scheduledPauses: [{ type: 'lunch', startedAt: '2026-10-04T18:01:00.000Z', endedAt: '2026-10-04T18:10:00.000Z' }] });
  await f.worker.message({ kind: 'pair' }, sender); assert.equal((await observe()).prepare, false);
  assert.equal(f.data['bridge-v1'].preparation.waitReason, 'pause');
  f.plan({ ...plan, pause: { type: 'break', startedAt: '2026-10-04T18:01:00.000Z' } });
  await f.worker.message({ kind: 'pair' }, sender); assert.equal((await observe()).prepare, false);
  f.plan(plan); await f.worker.message({ kind: 'pair' }, sender);
  assert.equal((await observe()).prepare, true);
  await f.worker.message({ kind: 'spacing', enabled: false, minutes: 1 }, sender);
  f.advance(16000); assert.equal((await observe()).prepare, false);
  await f.worker.message({ kind: 'spacing', enabled: true, minutes: 1 }, sender);
  f.plan({ ...plan, ended: true }); await f.worker.message({ kind: 'pair' }, sender);
  assert.equal((await observe()).prepare, false);
  assert.equal(f.data['bridge-v1'].preparation.waitReason, 'shift-ended');
});

test('manual pause completion resumes timed mode even with unknown duration and missed active-pause observation', async () => {
  for (const observed of [true, false]) {
    const f = workerFixture(), plan = { startAt: at, endAt: '2026-10-04T22:00:00.000Z', hasCall: true };
    await enablePortal(f); f.advance(60000);
    const startedAt = '2026-10-04T18:01:00.000Z';
    f.plan({ ...plan, ...(observed ? { pause: { type: 'break', startedAt } } : {}) });
    await f.worker.message({ kind: 'resume-options', break: true, lunch: true, mode: 'timed' }, sender);
    const observe = extra => f.worker.message(portalPacket('authenticated', { call: 'idle', offline: true, ...extra }), portalSender);
    assert.equal((await observe()).prepare, false);
    f.advance(60000);
    f.plan({ ...plan, lastPause: { type: 'break', startedAt, endedAt: '2026-10-04T18:02:00.000Z' } });
    await f.worker.message({ kind: 'pair' }, sender); assert.equal((await observe()).prepare, true);
    await observe({ call: 'connected', signal: 'accepted', offline: false });
    f.advance(60000); await observe({ signal: 'disconnected' }); f.restart();
    await f.worker.message({ kind: 'pair' }, sender); assert.equal((await observe()).prepare, false);
  }
});

test('portal cooldown stops only a unique Available Stop Calls control and preserves incoming calls', async () => {
  const f = portalDocument(); f.document.welcome = f.element('Welcome, Synthetic User (12345)');
  const stop = f.element('Stop Calls'); let stops = 0; stop.click = () => stops++;
  f.document.controls = [stop]; f.document.statuses = [f.element('Available')];
  assert.equal(availableStopButton(f.document), stop);
  let clock = 10000;
  const observer = createPortalObserver({ document: f.document, documentId: 'spacing-document-1234', now: () => clock, send: async () => ({ ok: true, stopCalls: true }) });
  await observer.sample(); clock += 1000; await observer.sample(); assert.equal(stops, 1);
  f.document.controls = [f.element('Accept'), f.element('Reject'), stop]; assert.equal(availableStopButton(f.document), null);
  await observer.sample(); clock += 1000; await observer.sample(); assert.equal(stops, 1);
  f.document.controls = [stop, f.element('Stop Calls')]; assert.equal(availableStopButton(f.document), null);
  observer.stop();
});

test('official history count works in observation; automatic records survive a closed tracker, reconcile once and isolate accounts', async () => {
  const f = workerFixture();
  const record = { customerId: '91434', callDate: '10/04/2026', callStart: '1:00 AM', durationMin: 0, billable: 'Yes', dropped: 'No', pay: '$0.00' };
  const packet = { kind: 'portal-history', documentId: 'portal-document-12345', count: 2, invalid: 0, coverage: 'page', records: [record] };
  await f.worker.message(portalPacket('authenticated'), portalSender);
  assert.equal((await f.worker.message(packet, portalSender)).ok, true);
  assert.equal((await f.worker.message({kind:'status'},sender)).history.count, 2);
  assert.equal(f.data['bridge-v1'].queue.length, 0);
  await enablePortal(f); await f.worker.message(portalPacket('authenticated'), portalSender);
  f.targets([]);
  await f.worker.message(packet, portalSender); await f.worker.message(packet, portalSender);
  assert.equal(f.data['bridge-v1'].queue.length, 1);
  f.restart(); f.targets([scope]); await f.worker.flush();
  assert.equal(f.delivered.filter(p => p.event.type === 'history-records').length, 1);
  await f.worker.message(packet, portalSender);
  assert.equal(f.delivered.filter(p => p.event.type === 'history-records').length, 1);
  await f.worker.message({...packet,records:[{...record,durationMin:5,pay:'$0.60'}]},portalSender);
  assert.equal(f.delivered.filter(p => p.event.type === 'history-records').length, 2);
  assert.equal(await f.worker.message(packet,{...portalSender,url:'https://evil.invalid/'}),null);
  assert.equal((await f.worker.message({...packet,documentId:'other-document-1234'},portalSender)).ok,false);
  f.targets([other]); await f.worker.message({kind:'pair'},sender);
  assert.equal((await f.worker.message({kind:'status'},sender)).history,null);
  assert.deepEqual(f.data['bridge-v1'].historySeen,[]);
});

const at = '2026-10-04T18:00:00.000Z', ended = '2026-10-04T18:10:00.000Z';

test('a sole signed-in tracker automatically pairs a fresh extension and prepares startup while preserving later user choices across restart', async () => {
  const f=workerFixture(), ready={id:'extension-id',url:TRACKER_ORIGIN+'/',frameId:0,tab:{id:10}};
  f.targets([scope]);
  await f.worker.message({kind:'tracker-ready',accountScope:scope},ready);
  let status=await f.worker.message({kind:'status'},sender);
  assert.equal(status.paired,true);assert.equal(status.mode,'auto');assert.equal(status.preparation.enabled,true);
  await f.worker.message({kind:'mode',mode:'observe'},sender);await f.worker.message({kind:'prepare-first',enabled:false},sender);
  f.restart();await f.worker.message({kind:'tracker-ready',accountScope:scope},ready);
  status=await f.worker.message({kind:'status'},sender);
  assert.equal(status.paired,true);assert.equal(status.mode,'observe');assert.equal(status.preparation.enabled,false);
});

test('automatic pairing requires one authenticated target in the announcing tab and never replaces another account or pending queue', async () => {
  const f=workerFixture(), ready={id:'extension-id',url:TRACKER_ORIGIN+'/',frameId:0,tab:{id:10}};
  f.targets([scope,other]);await f.worker.message({kind:'tracker-ready',accountScope:scope},ready);
  assert.equal((await f.worker.message({kind:'status'},sender)).paired,false);
  assert.equal((await f.worker.message({kind:'status'},sender)).attention,'multiple-trackers');
  f.targets([scope]);await f.worker.message({kind:'tracker-ready',accountScope:scope},{...ready,tab:{id:11}});
  assert.equal((await f.worker.message({kind:'status'},sender)).paired,false);
  await f.worker.message({kind:'tracker-ready',accountScope:scope},ready);
  f.targets([other]);await f.worker.message({kind:'tracker-ready',accountScope:other},ready);
  assert.equal(f.data['bridge-v1'].accountScope,scope);
  f.data['bridge-v1'].accountScope=null;f.data['bridge-v1'].queue=[{accountScope:scope,event:start}];
  await f.worker.message({kind:'tracker-ready',accountScope:other},ready);
  assert.equal(f.data['bridge-v1'].accountScope,null);assert.equal(f.data['bridge-v1'].queue.length,1);
});

test('first-call preparation waits for the schedule, supports late arrival, retries only confirmed Offline and stops after manual connection across restart', async () => {
  const f = workerFixture();
  f.plan({ startAt: '2026-10-04T19:00:00.000Z', endAt: '2026-10-05T01:00:00.000Z', hasCall: false, ended: false });
  await enablePortal(f);
  await f.worker.message({kind:'prepare-first',enabled:true},sender);
  const observe = extra => f.worker.message(portalPacket('authenticated',{call:'idle',offline:true,...extra}),portalSender);
  assert.equal((await observe()).prepare,false);
  f.advance(2*3600000); // Late arrival is still inside the planned window.
  assert.equal((await observe()).prepare,true);
  assert.equal((await observe()).prepare,false);
  f.advance(16000); assert.equal((await observe({offline:false})).prepare,false);
  assert.equal((await observe({call:'incoming'})).prepare,false);
  assert.equal((await observe()).prepare,true);
  f.advance(16000);
  await observe({call:'connected',offline:false,signal:'accepted'});
  f.advance(60000); await observe({signal:'disconnected'}); f.restart();
  assert.equal((await observe()).prepare,false);
  await f.worker.message({kind:'prepare-first',enabled:false},sender);
  await f.worker.message({kind:'prepare-first',enabled:true},sender);
  assert.equal((await observe()).prepare,false);
});

test('late first-call preparation waits through scheduled Break and Lunch even without an active tool pause, then resumes at the boundary', async () => {
  const f = workerFixture(); f.advance(-6*3600000-15*60000);
  const plan = { startAt: '2026-10-04T12:00:00.000Z', endAt: '2026-10-04T20:00:00.000Z', hasCall: false, ended: false,
    scheduledPauses: [{type:'break',startedAt:'2026-10-04T15:00:00.000Z',endedAt:'2026-10-04T15:15:00.000Z'},
      {type:'lunch',startedAt:'2026-10-04T18:00:00.000Z',endedAt:'2026-10-04T19:00:00.000Z'}] };
  f.plan(plan); await enablePortal(f); await f.worker.message({kind:'prepare-first',enabled:true},sender);
  const observe = () => f.worker.message(portalPacket('authenticated',{call:'idle',offline:true}),portalSender);
  assert.equal((await observe()).prepare,false);
  f.advance(15*60000); assert.equal((await observe()).prepare,true);
  f.advance(3*3600000); f.restart(); assert.equal((await observe()).prepare,false);
  f.advance(15*60000-1); assert.equal((await observe()).prepare,false);
  f.advance(1); assert.equal((await observe()).prepare,true);
  f.advance(2*3600000+45*60000); assert.equal((await observe()).prepare,false);
  f.advance(3600000); assert.equal((await observe()).prepare,true);
  f.advance(3600000); assert.equal((await observe()).prepare,false);
});

test('a cached older tracker plan cannot start the first call until its scheduled pauses are confirmed', async () => {
  const f=workerFixture(),plan={startAt:at,endAt:'2026-10-04T22:00:00.000Z',hasCall:false,ended:false};
  f.plan({...plan,scheduleVerified:false});await enablePortal(f);await f.worker.message({kind:'prepare-first',enabled:true},sender);
  const observe=()=>f.worker.message(portalPacket('authenticated',{call:'idle',offline:true}),portalSender);
  assert.equal((await observe()).prepare,false);f.restart();assert.equal((await observe()).prepare,false);
  f.plan(plan);await f.worker.message({kind:'pair'},sender);assert.equal((await observe()).prepare,true);
});

test('Break and Lunch resume independently after manual completion or acknowledged timed closure; unknown duration and disabled choices hold', async () => {
  const f=workerFixture(); const startedAt='2026-10-04T18:10:00.000Z', endsAt='2026-10-04T18:20:00.000Z';
  const plan={startAt:at,endAt:'2026-10-04T22:00:00.000Z',hasCall:true,ended:false};
  await enablePortal(f); f.advance(600000); f.plan({...plan,pause:{type:'break',startedAt,endsAt}});
  await f.worker.message({kind:'resume-options',break:true,lunch:false,mode:'manual'},sender);
  const observe=extra=>f.worker.message(portalPacket('authenticated',{call:'idle',offline:true,...extra}),portalSender);
  assert.equal((await observe()).prepare,false);
  f.advance(600000);assert.equal((await observe()).prepare,false);
  f.plan({...plan,lastPause:{type:'break',startedAt,endedAt:endsAt}});await f.worker.message({kind:'pair'},sender);
  assert.equal((await observe()).prepare,true);
  await observe({call:'connected',offline:false,signal:'accepted'});f.advance(60000);await observe({signal:'disconnected'});f.restart();
  assert.equal((await observe()).prepare,false);
  const lunchStart='2026-10-04T18:21:00.000Z', lunchEnd='2026-10-04T18:31:00.000Z';
  f.plan({...plan,pause:{type:'lunch',startedAt:lunchStart,endsAt:lunchEnd}});await f.worker.message({kind:'pair'},sender);
  f.advance(600000);assert.equal((await observe()).prepare,false);
  await f.worker.message({kind:'resume-options',break:false,lunch:true,mode:'timed'},sender);
  f.ack({status:'blocked'});assert.equal((await observe()).prepare,false);
  assert.equal(f.data['bridge-v1'].queue.filter(item=>item.event.type==='pause-end').length,1);
  f.ack({status:'ok'});await f.worker.flush();assert.equal((await observe()).prepare,true);
  assert.equal(f.delivered.filter(event=>event.event.type==='pause-end').length,2);
  await f.worker.message({kind:'resume-options',break:false,lunch:false,mode:'manual'},sender);
  f.advance(16000);assert.equal((await observe()).prepare,false);
});

test('turning off timed resume cancels undelivered pause closure and an unknown pause duration cannot trigger it', async () => {
  const f=workerFixture();await enablePortal(f);f.advance(600000);
  const pause={type:'lunch',startedAt:at,endsAt:null};
  f.plan({startAt:at,endAt:'2026-10-04T22:00:00.000Z',hasCall:true,ended:false,pause});
  await f.worker.message({kind:'resume-options',break:false,lunch:true,mode:'timed'},sender);
  const observe=()=>f.worker.message(portalPacket('authenticated',{call:'idle',offline:true}),portalSender);
  assert.equal((await observe()).prepare,false);assert.equal(f.data['bridge-v1'].queue.length,0);
  f.plan({...f.data['bridge-v1'].preparation.plan,pause:{...pause,endsAt:ended}});await f.worker.message({kind:'pair'},sender);
  f.targets([]);await observe();assert.equal(f.data['bridge-v1'].queue.length,1);
  await f.worker.message({kind:'resume-options',break:false,lunch:false,mode:'manual'},sender);
  assert.equal(f.data['bridge-v1'].queue.length,0);
});

test('preparation is opt-in and holds outside the shift, after tool completion, with duplicate portal tabs or missing schedule', async () => {
  const f=workerFixture();await enablePortal(f);
  const observe = () => f.worker.message(portalPacket('authenticated',{call:'idle',offline:true}),portalSender);
  assert.equal((await observe()).prepare,false);
  await f.worker.message({kind:'prepare-first',enabled:true},sender);assert.equal((await observe()).prepare,false);
  f.plan({startAt:at,endAt:ended,hasCall:false,ended:false});await f.worker.message({kind:'pair'},sender);
  await f.worker.message(portalPacket('authenticated',{call:'idle',offline:true,documentId:'other-portal-123456'}),{...portalSender,tab:{id:2}});
  assert.equal((await observe()).prepare,false);
  f.advance(610000);assert.equal((await observe()).prepare,false);
  f.plan({startAt:at,endAt:'2026-10-04T22:00:00.000Z',hasCall:true,ended:false});await f.worker.message({kind:'pair'},sender);
  assert.equal((await observe()).prepare,false);
});

test('portal preparation clicks only an explicit Offline Start Calls button and never Accept or ambiguous controls', async () => {
  const f=portalDocument();f.document.welcome=f.element('Welcome, Synthetic User (12345)');
  const button=f.element('Start Calls');let starts=0, accepts=0;button.click=()=>starts++;
  f.document.controls=[button];f.document.statuses=[f.element('Offline')];
  assert.equal(offlineStartButton(f.document),button);
  let clock=10000;const observer=createPortalObserver({document:f.document,documentId:'prepare-document-1234',now:()=>clock,send:async()=>({ok:true,prepare:true})});
  await observer.sample();clock+=1000;await observer.sample();assert.equal(starts,1);
  const accept=f.element('Accept');accept.click=()=>accepts++;
  f.document.controls=[accept,f.element('Reject')];assert.equal(offlineStartButton(f.document),null);
  await observer.sample();clock+=1000;await observer.sample();assert.equal(accepts,0);
  f.document.controls=[button];f.document.statuses=[f.element('Available')];assert.equal(offlineStartButton(f.document),null);
  f.document.statuses=[f.element('Offline')];f.document.controls=[button,f.element('Start Calls')];assert.equal(offlineStartButton(f.document),null);
  observer.stop();
});
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

test('only a trusted native availability click pauses automation and delayed replies cannot undo it', async () => {
  const f = portalDocument(), sent = []; let clock = 10000, resolveObservation;
  f.document.welcome = f.element('Welcome, Synthetic User (12345)');
  const stop = f.element('Stop Calls'); f.document.controls = [stop]; f.document.statuses = [f.element('Available')];
  const observer = createPortalObserver({ document: f.document, documentId: 'manual-observer-doc-123', now: () => clock,
    send: async packet => { sent.push(packet); return packet.kind === 'portal-observation' ? new Promise(resolve => { resolveObservation = resolve; }) : { ok: true }; } });
  f.click(false); assert.equal(sent.length, 0);
  await observer.sample(); clock += 1000;
  const pending = observer.sample(); f.click(true);
  assert.equal(sent.filter(packet => packet.kind === 'portal-manual-availability' && packet.action === 'stop').length, 1);
  let clicks = 0; stop.click = () => clicks++;
  resolveObservation({ ok: true, stopCalls: true }); await pending;
  assert.equal(clicks, 0); observer.stop();
});
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
  const data = {}, delivered = [], reloads = [];
  let targets = [], portalTargets = [1], plan = null, ack = { status: 'ok' }, clock = Date.parse(at), n = 0;
  const api = { runtime: { id: 'extension-id', getURL: name => `chrome-extension://extension-id/${name}` },
    storage: { local: { async get(key) { return { [key]: structuredClone(data[key]) }; }, async set(update) { Object.assign(data, structuredClone(update)); } } },
    tabs: { async query(options) { return options?.url?.startsWith(PORTAL_ORIGIN) ? portalTargets.map(id => ({ id })) : targets.map((s, i) => ({ id: i + 10 })); }, async sendMessage(id, message) {
      if (message.kind === 'identify-tracker') {
        const bridge = data['bridge-v1'], latest = bridge?.preparation?.spacing?.lastEndedAt || plan?.lastCallEndedAt || plan?.startAt;
        const acw = plan?.pause || Object.values(bridge?.tabs || {}).some(tab => tab.active) ? null
          : { startedAt: plan?.lastPause?.endedAt || latest, observedAt: new Date(clock).toISOString() };
        return { accountScope: targets[id - 10], plan: plan && !Object.hasOwn(plan, 'acw') ? { ...plan, acw } : plan };
      }
      delivered.push(message); return ack;
    }, async create() {}, async reload(id) { reloads.push(id); } } };
  let worker = createBridgeWorker(api, { now: () => clock, randomId: () => `generated-id-${String(++n).padStart(12,'0')}` });
  async function signal(name, options = {}) {
    const requestId = `request-${++n}`;
    worker.beforeRequest({ requestId, method: 'POST', initiator: PORTAL_ORIGIN, url: endpoint, tabId: 1, timeStamp: clock,
      requestBody: { raw: [{ bytes: new TextEncoder().encode(JSON.stringify({ name, username: 'never-retained', token: 'never-retained' })).buffer }] }, ...options });
    await worker.completed({ requestId, statusCode: options.statusCode || 200 });
  }
  return { data, delivered, reloads, signal, get worker() { return worker; }, targets: value => { targets = value; }, portals: value => { portalTargets = value; },
    ack: value => { ack = value; }, plan: value => { plan = value ? {scheduledPauses:[],...value} : null; }, advance: milliseconds => { clock += milliseconds; }, now: () => clock,
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

test('an old completed pause cannot trigger availability in the next shift after tracker absence', async () => {
  const f = workerFixture(); await enablePortal(f);
  await f.worker.message({kind:'resume-options',break:true,lunch:true,mode:'manual'},sender);
  const original = {startAt:at,endAt:'2026-10-04T22:00:00.000Z',hasCall:true};
  f.advance(600000); f.plan({...original,lastPause:{type:'break',startedAt:at,endedAt:new Date(f.now()).toISOString()}});
  await f.worker.message({kind:'pair'},sender);
  f.targets([]); await f.worker.flush(); f.advance(86400000);
  f.targets([scope]);f.plan({startAt:'2026-10-05T18:00:00.000Z',endAt:'2026-10-05T22:00:00.000Z',hasCall:false});
  const reply=await f.worker.message(portalPacket('authenticated',{call:'idle',offline:true}),portalSender);
  assert.equal(reply.prepare,false);assert.equal(f.data['bridge-v1'].preparation.pendingPause,null);
});

test('extending an active timed pause cancels its older undelivered closure', async () => {
  const f=workerFixture();await enablePortal(f);f.advance(600000);
  const base={startAt:at,endAt:'2026-10-04T22:00:00.000Z',hasCall:true};
  const pause={type:'break',startedAt:at,endsAt:new Date(f.now()).toISOString()};
  f.plan({...base,pause});await f.worker.message({kind:'resume-options',break:true,lunch:true,mode:'timed'},sender);
  f.ack({status:'blocked'});
  await f.worker.message(portalPacket('authenticated',{call:'idle',offline:true}),portalSender);
  assert.equal(f.data['bridge-v1'].queue.filter(item=>item.event.type==='pause-end').length,1);
  f.plan({...base,pause:{...pause,endsAt:new Date(f.now()+600000).toISOString()}});f.ack({status:'ok'});
  await f.worker.flush();
  assert.equal(f.data['bridge-v1'].queue.some(item=>item.event.type==='pause-end'),false);
  assert.equal(f.data['bridge-v1'].preparation.pendingPause.requestId,null);
  assert.equal(f.data['bridge-v1'].preparation.pendingPause.endedAt,null);
});
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

test('a rejected late network acceptance cannot consume the first call of a different plan', async () => {
  const f = workerFixture(); await enablePortal(f);
  f.plan({startAt:at,endAt:'2026-10-04T22:00:00.000Z',hasCall:false});
  await f.worker.message({kind:'prepare-first',enabled:true},sender);
  await f.signal('accepted-by-local'); f.advance(60000); await f.signal('disconnected-by-local');
  const nextStart='2026-10-04T18:05:00.000Z'; f.advance(9*60000);
  f.plan({startAt:nextStart,endAt:'2026-10-04T22:00:00.000Z',hasCall:false}); await f.worker.flush();
  await f.signal('accepted-by-local',{timeStamp:Date.parse(at)});
  assert.notEqual(f.data['bridge-v1'].preparation.doneFor,nextStart);
  assert.equal(f.data['bridge-v1'].tabs[1].active,null);
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
  assert.equal(status.queueSummary.expired,true);assert.equal(status.queued,1);
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

test('original layout reload requires fresh Offline, one portal and no calls or offers; bridge data stays intact', async () => {
  const f = workerFixture(); await enablePortal(f);
  const revision = 'layout-revision-12345';
  f.data['propio-original-layout-v1'] = { enabled: true, revision };
  const apply = () => f.worker.message({ kind: 'apply-portal-layout', revision }, portalSender);
  for (const observation of [{ call: 'connected', offline: false }, { call: 'incoming', offline: false }, { call: 'unknown', offline: true }, { call: 'idle', offline: false }]) {
    await f.worker.message(portalPacket('authenticated', observation), portalSender);
    assert.equal((await apply()).reason, 'portal-busy');
  }
  await f.worker.message(portalPacket('authenticated', { call: 'idle', offline: true }), portalSender);
  f.advance(4000); assert.equal((await apply()).reason, 'portal-busy');
  await f.worker.message(portalPacket('authenticated', { call: 'idle', offline: true }), portalSender);
  f.portals([1, 2]); assert.equal((await apply()).reason, 'multiple-portals');
  f.portals([1]); const bridgeBefore = JSON.stringify(f.data['bridge-v1']);
  assert.equal((await apply()).ok, true); assert.deepEqual(f.reloads, [1]);
  assert.equal(JSON.stringify(f.data['bridge-v1']), bridgeBefore);
  f.restart(); assert.equal((await apply()).alreadyApplied, true); assert.deepEqual(f.reloads, [1]);
});

test('original layout rejects stale choices, foreign origins and frames without reloading', async () => {
  const f = workerFixture(); await enablePortal(f);
  f.data['propio-original-layout-v1'] = { enabled: false, revision: 'current-layout-1234' };
  await f.worker.message(portalPacket('authenticated', { call: 'idle', offline: true }), portalSender);
  const packet = { kind: 'apply-portal-layout', revision: 'previous-layout-1234' };
  assert.equal((await f.worker.message(packet, portalSender)).reason, 'layout-stale');
  assert.equal(await f.worker.message(packet, { ...portalSender, frameId: 1 }), null);
  assert.equal(await f.worker.message(packet, { ...portalSender, url: 'https://other.test/' }), null);
  assert.equal(await f.worker.message(packet, sender), null);
  assert.deepEqual(f.reloads, []);
});

test('original narrow header authenticates only its matching visible name and keeps call detection', () => {
  const f = portalDocument(); const name = f.element('Synthetic User (12345)'), welcome = f.element('Welcome, Synthetic User (12345)', false);
  f.document.welcome = welcome; f.document.controls = [f.element('Start Calls')]; f.document.statuses = [f.element('OFFLINE')];
  const query = f.document.querySelector;
  f.document.querySelector = selector => selector === 'app-header .app-interpreter-name' ? name : selector === 'app-header .header-welcome-message' ? welcome : query(selector);
  assert.equal(readPortalObservation(f.document).session, 'authenticated');
  assert.equal(offlineStartButton(f.document), f.document.controls[0]);
  name.textContent = 'Different User (12345)'; assert.equal(readPortalObservation(f.document).session, 'unknown');
  name.textContent = 'Synthetic User (12345)'; name.hidden = true; assert.equal(readPortalObservation(f.document).session, 'unknown');
});
