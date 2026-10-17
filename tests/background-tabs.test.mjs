import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import { installBackgroundTabs } from '../extension/propio-bridge/background-tabs.js';
import { createBridgeWorker } from '../extension/propio-bridge/bridge-worker.js';

const event = () => ({ listeners: [], addListener(fn) { this.listeners.push(fn); }, fire(...args) { this.listeners.forEach(fn => fn(...args)); } });
function fixture() {
  const rows = new Map([[1, { id: 1, url: 'https://interpreters.propio-ls.com/portal', autoDiscardable: true }],
    [2, { id: 2, url: 'https://propio-shift-tracker.vercel.app/', autoDiscardable: true }],
    [3, { id: 3, url: 'https://app.useinterpreter.com/', autoDiscardable: false }],
    [4, { id: 4, url: 'https://unrelated.test/', autoDiscardable: true }]]);
  const store = {}, updates = [], alarms = [], messages = [];
  let refreshed = 0, failRestore = false;
  const api = { storage: { session: {
    get: async key => ({ [key]: structuredClone(store[key]) }),
    set: async values => Object.assign(store, structuredClone(values)),
  } }, tabs: {
    query: async () => [...rows.values()], get: async id => { if (!rows.has(id)) throw Error('closed'); return { ...rows.get(id) }; },
    update: async (id, patch) => { if (failRestore && patch.autoDiscardable) throw Error('dragging'); updates.push({id,...patch}); Object.assign(rows.get(id),patch); },
    sendMessage: async (id, message) => { messages.push({id,...message}); return null; },
    onUpdated: event(), onRemoved: event(),
  }, runtime: { onStartup: event(), onInstalled: event() }, alarms: { create: async (...args) => alarms.push(args), onAlarm: event() } };
  return { api, rows, store, updates, alarms, messages, failRestore() { failRestore = true; },
    start() { return installBackgroundTabs(api, async () => { refreshed++; }); }, get refreshed() { return refreshed; } };
}

test('background protection changes only exact work origins without activating, reloading or widening permissions', async () => {
  const f=fixture();f.rows.set(5,{id:5,url:'https://interpreters.propio-ls.com.evil.test/',autoDiscardable:true});
  f.rows.set(6,{id:6,url:'https://propio-shift-tracker.vercel.app/',autoDiscardable:true,incognito:true});
  const guard=f.start();await guard.check();
  assert.deepEqual(f.updates,[{id:1,autoDiscardable:false},{id:2,autoDiscardable:false}]);
  assert.deepEqual(f.alarms,[['work-tabs-maintenance',{periodInMinutes:0.5}]]);
  assert.equal(f.refreshed,1);
  f.api.alarms.onAlarm.fire({name:'unrelated'});await guard.check();assert.equal(f.refreshed,2);
});

test('protection restores only owned flags after navigation and survives a service-worker restart', async () => {
  const f=fixture();let guard=f.start();await guard.check();
  f.rows.get(1).url='https://unrelated.test/';f.rows.get(3).url='https://unrelated.test/';
  guard=f.start();await guard.check();
  assert.equal(f.rows.get(1).autoDiscardable,true);assert.equal(f.rows.get(3).autoDiscardable,false);
  assert.deepEqual(f.store['work-tabs-protection'],{'2':true});
  f.rows.delete(2);await guard.check();assert.deepEqual(f.store['work-tabs-protection'],{});
});

test('a failed restoration remains owned for retry rather than leaving unrelated tabs protected', async () => {
  const f=fixture(),guard=f.start();await guard.check();f.failRestore();f.rows.get(1).url='https://unrelated.test/';
  await guard.check();assert.equal(f.store['work-tabs-protection']['1'],true);
});

test('background refresh requests current tracker data and samples hidden portals, skipping discarded/frozen ones', async () => {
  const messages=[],scope='a'.repeat(64),store={};
  const api={runtime:{id:'test'},storage:{local:{get:async k=>({[k]:store[k]}),set:async x=>Object.assign(store,x)}},tabs:{
    query:async q=>q.url.includes('propio-shift-tracker')?[{id:10}]:[{id:1,active:false},{id:2,discarded:true},{id:3,frozen:true}],
    sendMessage:async(id,packet)=>{messages.push({id,...packet});return packet.kind==='identify-tracker'?{accountScope:scope}:{};},
  }};
  await createBridgeWorker(api).refreshBackground();
  assert.deepEqual(messages,[{id:10,kind:'identify-tracker',refresh:true},{id:1,kind:'sample-portal'}]);
});

test('portal can sample from an extension message with its interval stopped and coalesces overlapping requests', async () => {
  const source=fs.readFileSync(new URL('../extension/propio-bridge/portal-content.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'');
  const listeners=new Map();let onMessage,samples=0,release,stopped=false;
  const window={top:null,addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)};window.top=window;
  const document={addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)};
  const runtime={id:'test',onMessage:{addListener:fn=>onMessage=fn,removeListener:()=>{onMessage=null;}}};
  vm.runInNewContext(source,{location:{origin:'https://interpreters.propio-ls.com'},window,document,chrome:{runtime},crypto:{randomUUID:()=> 'document-1234567'},
    setInterval:()=>1,clearInterval:()=>{},
    createPortalObserver:()=>({sample:()=>{samples++;return new Promise(resolve=>release=resolve);},stop:()=>{stopped=true;},isStopped:()=>stopped}),
    createHistoryObserver:()=>({sample:async()=>{},stop:()=>{}}),
  });
  assert.equal(samples,1);release();await new Promise(resolve=>setImmediate(resolve));
  const replies=[];assert.equal(onMessage({kind:'sample-portal'},{id:'other'},()=>{}),undefined);assert.equal(samples,1);
  assert.equal(onMessage({kind:'sample-portal'},{id:'test'},x=>replies.push(x.ok)),true);
  onMessage({kind:'sample-portal'},{id:'test'},x=>replies.push(x.ok));assert.equal(samples,2);
  release();await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(replies,[true,true]);
  listeners.get('resume')();assert.equal(samples,3);release();await new Promise(resolve=>setImmediate(resolve));
  listeners.get('pagehide')({persisted:false});assert.equal(stopped,true);assert.equal(onMessage,null);assert.equal(listeners.has('resume'),false);
});
