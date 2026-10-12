import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parse } from 'acorn';

const source=fs.readFileSync(new URL('../js/app-main.js',import.meta.url),'utf8');
const declarations=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.map(n=>n.declaration||n);
const fn=name=>{const node=declarations.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);return source.slice(node.start,node.end);};

test('invalid backup call records are rejected before changing the existing account',()=>{
  const h=vm.createContext({translateText:value=>value});
  vm.runInContext(fn('validateImportPayload'),h);
  for(const call of [null,[],17,'invalid']) assert.equal(h.validateImportPayload({state:{},calls:[call]}).ok,false);
  assert.equal(h.validateImportPayload({state:{},calls:[{id:'legacy',durationMin:15}]}).ok,true);
  assert.equal(h.validateImportPayload({state:{},calls:[],settings:{}}).ok,true);
});

test('invalid backup event and pause records are rejected before replacing the current account', () => {
  const h = vm.createContext({translateText:value=>value});
  vm.runInContext(fn('validateImportPayload'), h);
  for (const key of ['events', 'pauseHistory']) {
    for (const record of [null, [], 17, 'invalid', {}]) {
      assert.equal(h.validateImportPayload({ state: { [key]: [record] }, calls: [] }).ok, false, key);
    }
    assert.equal(h.validateImportPayload({ state: { [key]: {} }, calls: [] }).ok, false);
  }
  for (const key of ['activeCall', 'activePause', 'pendingLiveCallBackup']) {
    assert.equal(h.validateImportPayload({ state: { [key]: [] }, calls: [] }).ok, false);
    assert.equal(h.validateImportPayload({ state: { [key]: null }, calls: [] }).ok, true);
  }
  assert.equal(h.validateImportPayload({ state: { events: [{ts:'not-a-date'}] }, calls: [] }).ok, false);
  assert.equal(h.validateImportPayload({ state: {
    events: [{type:'shiftStart', ts:1791807600000}],
    pauseHistory: [{type:'break', startedAt:'2026-10-12T12:00:00Z', endedAt:'2026-10-12T12:20:00Z'}]
  }, calls: [] }).ok, true);
});

test('backup normalization failure leaves both current state and calls untouched',()=>{
  let state={existing:true},calls=[{id:'existing'}];
  const h=vm.createContext({normalizeStateObject:value=>value,normalizeCallsArray(){throw Error('Invalid record');},
    setAppState:value=>{state=value;},setAppCalls:value=>{calls=value;}});
  vm.runInContext(fn('applyImportedPayload'),h);
  assert.throws(()=>h.applyImportedPayload({state:{imported:true},calls:[null]}),/Invalid record/);
  assert.deepEqual(state,{existing:true});assert.deepEqual(calls,[{id:'existing'}]);
});

test('backup import does not announce success when its local snapshot cannot be saved',()=>{
  const messages=[];
  const h=vm.createContext({translateText:value=>value,ui:(parts,...values)=>parts.reduce((out,part,i)=>out+part+(values[i]??''),''),
    MAX_IMPORT_JSON_BYTES:1000000,FileReader:class{readAsText(){this.result=JSON.stringify({state:{},calls:[]});this.onload();}},
    validateImportPayload:()=>({ok:true}),appConfirm:(_message,callback)=>callback(),applyImportedPayload:()=>false,
    toast:message=>messages.push(message)});
  vm.runInContext(fn('handleImportJsonFile'),h);
  h.handleImportJsonFile({target:{files:[{size:10}],value:'backup.json'}});
  assert.deepEqual(messages,[]);
});
