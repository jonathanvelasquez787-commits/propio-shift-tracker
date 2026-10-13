import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePortalRecord, portalRecordsText } from '../js/propio-history-records.js';
import { validateBridgeEvent, validateBridgePlan } from '../js/propio-bridge-rules.js';
import { createPropioReceiver } from '../js/propio-bridge.js';

const now = new Date(2026, 9, 13, 14).getTime();
const row = { customerId: '91434', callDate: '10/13/2026', callStart: '11:54 AM', durationMin: '0', billable: 'Yes', dropped: 'No', pay: '$0.00' };
const event = { version: 1, id: 'official-history-12345', type: 'history-records', at: new Date(now).toISOString(), records: [row] };

test('scheduled pause metadata is bounded to the shift and rejects malformed ranges while stripping unrelated data', () => {
  const startAt = new Date(now-3600000).toISOString(), endAt = new Date(now+3600000).toISOString();
  const slot = {type:'break',startedAt:new Date(now).toISOString(),endedAt:new Date(now+900000).toISOString()};
  const plan = {startAt,endAt,scheduledPauses:[{...slot,customer:'must-not-leave'}]};
  assert.deepEqual(validateBridgePlan(plan,now).scheduledPauses,[slot]);
  for(const scheduledPauses of [null,{},Array(101).fill(slot),[{...slot,type:'work'}],[{...slot,endedAt:slot.startedAt}],
    [{...slot,startedAt:new Date(now-7200000).toISOString()}],[{...slot,endedAt:new Date(now+7200000).toISOString()}]]) assert.equal(validateBridgePlan({...plan,scheduledPauses},now),null);
  assert.deepEqual(validateBridgePlan({startAt,endAt},now).scheduledPauses,[]);
  assert.equal(validateBridgePlan({startAt,endAt},now).scheduleVerified,false);
  assert.equal(validateBridgePlan(validateBridgePlan({startAt,endAt},now),now).scheduleVerified,false);
  assert.equal(validateBridgePlan(plan,now).scheduleVerified,true);
});

test('official history validates seven fields, preserves zero-minute rows and strips unrelated client data', () => {
  const valid = validatePortalRecord({ ...row, name: 'must-not-leave', notes: 'must-not-leave', token: 'must-not-leave' }, now);
  assert.deepEqual(valid, { ...row, durationMin: 0 });
  assert.equal(portalRecordsText([valid]), '91434\t10/13/2026\t11:54 AM\t0\tYes\tNo\t$0.00');
  assert.equal(validatePortalRecord({ ...row, durationMin: '5.5', pay: '$1.23' }, now).durationMin, 5.5);
  for (const patch of [{customerId:'name'}, {callDate:'02/30/2026'}, {callDate:'13/13/2026'}, {callStart:'0:54 AM'}, {callStart:'12:61 PM'}, {callStart:'2:01 PM'},
    {durationMin:''}, {durationMin:-1}, {durationMin:1441}, {durationMin:'pending'}, {billable:'Maybe'}, {dropped:'unknown'}, {pay:''}, {pay:'$-1'}, {pay:'NaN'}, {pay:100001}]) {
    assert.equal(validatePortalRecord({ ...row, ...patch }, now), null, JSON.stringify(patch));
  }
});

test('history events are bounded, revalidate rows in the tracker and cannot hide bad fields in a batch', () => {
  assert.equal(validateBridgeEvent(event, now).records.length, 1);
  assert.equal(validateBridgeEvent({ ...event, records: [] }, now), null);
  assert.equal(validateBridgeEvent({ ...event, records: Array(101).fill(row) }, now), null);
  assert.equal(validateBridgeEvent({ ...event, records: [row, {...row, pay:'pending'}] }, now), null);
  assert.equal(validateBridgeEvent({ ...event, at: new Date(now - 86400001).toISOString() }, now), null);
});

test('history delivery respects account revision and active-call review, retries storage rejection and receipts prevent replay', () => {
  const state = {}; let current = true, imported = 0, saved = false;
  const receive = createPropioReceiver({ getState: () => state, getCalls: () => [], now: () => now, canReceive: () => current,
    importHistory: () => { imported++; return saved; }, save: () => saved });
  current = false; assert.equal(receive(event).reason, 'stale-tab'); assert.equal(imported, 0);
  current = true; state.activeCall = {}; assert.equal(receive(event).reason, 'pending-call-review'); assert.equal(imported, 0);
  state.activeCall = null; state.pendingLiveCallBackup = {}; assert.equal(receive(event).reason, 'pending-call-review');
  state.pendingLiveCallBackup = null; assert.equal(receive(event).status, 'blocked'); assert.equal(state.propioBridgeReceipts, undefined);
  saved = true; assert.equal(receive(event).status, 'ok'); assert.equal(imported, 2);
  assert.equal(receive(event).duplicate, true); assert.equal(imported, 2);
});

test('scheduled pause end closes only its matching pause, blocks calls and never closes a newer pause or a finished shift', () => {
  const state={activePause:{type:'break',startedAt:new Date(now-600000).toISOString()}};let ended=0;
  const receive=createPropioReceiver({getState:()=>state,getCalls:()=>[],now:()=>now,save:()=>true,endScheduledPause:()=>{ended++;state.activePause=null;return true;}});
  const pauseEvent={version:1,id:'scheduled-pause-12345',type:'pause-end',at:new Date(now).toISOString(),startedAt:state.activePause.startedAt,pauseType:'break'};
  state.activeCall={};assert.equal(receive(pauseEvent).status,'blocked');state.activeCall=null;
  assert.equal(receive(pauseEvent).status,'ok');assert.equal(ended,1);
  assert.equal(receive(pauseEvent).duplicate,true);assert.equal(ended,1);
  state.activePause={type:'lunch',startedAt:new Date(now-300000).toISOString()};
  assert.equal(receive({...pauseEvent,id:'stale-pause-123456'}).superseded,true);assert.equal(state.activePause.type,'lunch');
  state.shiftEndedAt=new Date(now).toISOString();
  assert.equal(receive({...pauseEvent,id:'ended-pause-123456',pauseType:'lunch',startedAt:state.activePause.startedAt}).superseded,true);assert.equal(ended,1);
});
