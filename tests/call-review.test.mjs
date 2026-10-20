import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parse} from 'acorn';
import {callRecordSource,matchesCallReview} from '../js/call-review-model.js';
import {renderImportOutcome} from '../js/call-review-view.js';
import {pendingQueueSummary,createBridgeWorker} from '../extension/propio-bridge/bridge-worker.js';
const source=fs.readFileSync(new URL('../js/app-main.js',import.meta.url),'utf8');
const declarations=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.map(node=>node.declaration||node);
const fn=name=>{const node=declarations.find(node=>node.type==='FunctionDeclaration'&&node.id.name===name);return source.slice(node.start,node.end).replace(/^export /,'');};
const ui=(parts,...values)=>parts.reduce((out,part,i)=>out+part+(values[i]??''),'');

test('call review distinguishes estimates, official corrections, user corrections and unverified legacy sources',()=>{
  assert.equal(callRecordSource({source:'live'}),'estimated');
  assert.equal(callRecordSource({source:'import',propioBridge:{payEstimated:true}}),'estimated');
  assert.equal(callRecordSource({source:'import',propioBridge:{payEstimated:false},officialCorrection:{kind:'reconciled'}}),'official');
  assert.equal(callRecordSource({source:'import',officialCorrection:{kind:'corrected'}}),'official-correction');
  assert.equal(callRecordSource({source:'import',manualCorrectionAt:'2026-10-19T14:00:00Z'}),'manual-correction');
  assert.equal(callRecordSource({source:'manual'}),'manual');assert.equal(callRecordSource({}),'unknown');
});

test('Customer ID and source filters compose without changing the saved records',()=>{
  const call=Object.freeze({customerId:'AB-59143',source:'import',officialCorrection:Object.freeze({kind:'corrected'})});
  assert.equal(matchesCallReview(call,'591','corrected'),true);assert.equal(matchesCallReview(call,'ab-','corrected'),true);
  assert.equal(matchesCallReview(call,'591','estimated'),false);assert.equal(matchesCallReview(call,'other','corrected'),false);
  assert.equal(matchesCallReview(call,'','all'),true);
});

function parser(){
  const h=vm.createContext({MAX_CALL_DURATION_MIN:1440,makeLocalId:()=> 'id'});
  vm.runInContext(['parseMoney','toDateFromInputs','callDedupeKey','parseCalls'].map(fn).join('\n'),h);return h.parseCalls;
}
const row=(id='59143',duration='10',extra={})=>[id,'10/19/2026','08:00 AM',duration,'Yes','No','1.20'].map((value,index)=>extra[index]??value);

test('the real import parser reports duplicated input once without treating parser passes as duplicate rows',()=>{
  const parse=parser(),single=row().join('\t');const once=parse(single);assert.equal(once.length,1);assert.equal(once.diagnostics.length,0);
  const twice=parse(single+'\n'+single);assert.equal(twice.length,1);assert.equal(twice.diagnostics.length,1);assert.equal(twice.diagnostics[0].reason,'duplicate-input');
});

test('the real parser supports vertical Propio data and keeps zero-minute calls',()=>{
  const result=parser()(['Customer ID','Call Date','Call Start','Duration (Minutes)','Billable','Dropped','Pay',...row('59143','0')].join('\n'));
  assert.equal(result.length,1);assert.equal(result[0].durationMin,0);assert.equal(result.diagnostics.length,0);
});

test('the real parser explains bad dates, duration, payment, flags and unreadable rows',()=>{
  const samples=[[row('1','10',{1:'02/30/2026'}),'date-time'],[row('2','-1'),'duration'],[row('3','10',{6:'not-money'}),'pay'],
    [row('4','10',{4:'maybe'}),'flags'],[['broken'],'format']];
  for(const [parts,reason] of samples){const result=parser()(parts.join('\t'));assert.equal(result.length,0);assert.equal(result.diagnostics[0].reason,reason);}
});

test('import outcome lists successful, updated and omitted rows with escaped identifiers',()=>{
  const node={style:{},innerHTML:''};globalThis.document={getElementById:()=>node};
  const escapeHtml=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  const context={ui,translateText:x=>x,escapeHtml};
  try{renderImportOutcome(context,[{customerId:'duplicate'}],[],[],[],[],[{customerId:'<img onerror=bad>'}],[{customerId:'bad',line:8,reason:'pay'}]);}
  finally{delete globalThis.document;}
  assert.match(node.innerHTML,/Agregada/);assert.match(node.innerHTML,/Sin cambios/);assert.match(node.innerHTML,/Pago inválido/);
  assert.match(node.innerHTML,/Línea 8/);assert.doesNotMatch(node.innerHTML,/<img onerror/);assert.match(node.innerHTML,/&lt;img/);
});

test('pending queue deadlines use the oldest signal and stop at the existing 24-hour limit',()=>{
  const now=Date.parse('2026-10-19T15:00:00Z'),queue=[{event:{at:new Date(now-2*3600000).toISOString()}},{event:{at:new Date(now-3600000).toISOString()}}];
  const summary=pendingQueueSummary(queue,now);assert.equal(Date.parse(summary.expiresAt),now+22*3600000);assert.equal(summary.expired,false);
  assert.equal(pendingQueueSummary(queue,now+23*3600000).expired,true);assert.equal(queue.length,2);
  assert.equal(pendingQueueSummary([{event:{at:'invalid'}}],now),null);
});

test('opening the tracker reuses an existing tab rather than adding another writer',async()=>{
  const actions=[],api={runtime:{id:'extension',getURL:name=>'chrome-extension://extension/'+name},
    tabs:{query:async()=>[{id:7,windowId:9}],update:async(id,options)=>actions.push({id,options}),create:async()=>{throw Error('Duplicate tab');}},
    windows:{update:async(id,options)=>actions.push({id,options})}};
  const worker=createBridgeWorker(api);const result=await worker.message({kind:'open-tracker'},{id:'extension',url:api.runtime.getURL('popup.html')});
  assert.equal(result.ok,true);assert.deepEqual(actions,[{id:7,options:{active:true}},{id:9,options:{focused:true}}]);
});
