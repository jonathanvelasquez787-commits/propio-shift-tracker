import test from 'node:test';
import assert from 'node:assert/strict';
import { observedCallRecord, reportedCallRecord, preserveCallRecords, compareCallRecords, acwCallRecord, callElapsedMs } from '../js/call-records.js';
import { linkCallRecordReview, openCallRecords } from '../js/call-records-view.js';
const iso=seconds=>new Date(Date.parse('2026-10-21T08:00:00-06:00')+seconds*1000).toISOString();
const live=(id='live',start=39,end=500)=>({id,source:'live',startISO:iso(start),endISO:iso(end),durationMin:(end-start)/60,callDate:'10/21/2026',pay:'0.96',customerId:'Propio',propioBridge:{callId:'bridge-call-123456',payEstimated:true,timingEstimated:true}});
const official=(duration=7,pay='$0.84')=>({id:'official',source:'import',customerId:'59143',startISO:iso(0),endISO:iso(duration*60),durationMin:duration,callDate:'10/21/2026',pay});

test('a 7:41 observation retains exact milliseconds independently of estimated paid minutes',()=>{
 const call=live(),record=observedCallRecord(call);
 assert.equal(record.durationMs,461000);assert.equal(record.startISO,iso(39));assert.equal(record.endISO,iso(500));
 assert.equal(callElapsedMs(call),461000);assert.equal(record.pay,.96);assert.equal(record.detectedBy,'extension');
});
test('official reconciliation and later corrections preserve original times and estimate through JSON reload',()=>{
 const source=live(),snapshot=JSON.stringify(source);
 const first=preserveCallRecords(official(),source,iso(501));
 const next=JSON.parse(JSON.stringify(preserveCallRecords(official(8,'$0.96'),first,iso(600))));
 assert.equal(JSON.stringify(source),snapshot);assert.deepEqual(next.records.tool,first.records.tool);
 assert.equal(next.records.tool.durationMs,461000);assert.equal(next.records.propio.durationMin,8);
 assert.equal(next.records.changes[0].durationMin,7);assert.equal(next.records.tool.pay,.96);
 assert.equal(compareCallRecords(first).differenceMs,80000);assert.equal(compareCallRecords(first).payDifference,.12);
 assert.equal(acwCallRecord([first],iso(420)),first);
});
test('zero is an official record while absent history leaves the observation available',()=>{
 const call=live();assert.equal(reportedCallRecord(call),null);assert.ok(compareCallRecords(call).tool);
 const zero=preserveCallRecords(official(0,'$0.00'),call,iso(501));
 assert.equal(zero.pay,'$0.00');assert.equal(zero.records.propio.pay,0);assert.equal(zero.records.tool.durationMs,461000);
 assert.equal(zero.records.tool.pay,.96);
});
test('legacy official rows do not fabricate unavailable observed seconds',()=>{
 assert.equal(observedCallRecord(official()),null);assert.equal(reportedCallRecord(official()).durationMin,7);
 assert.equal(compareCallRecords(official()).differenceMs,null);
});

function fixture(){
 let calls=[live('a',5,20),live('b',30,50)],state={callRecordReviews:[{id:'review',call:official(0,'$0.00'),candidateIds:['a','b'],receivedAt:iso(60)}]},settings={financeCategories:{rows:[]}};
 const messages=[];let accept=true,writes=0;
 const context={data:()=>({calls,state,settings}),canPersistLocalChanges:()=>true,translateText:x=>x,toast:x=>messages.push(x),
  setCalls:value=>{calls=value;},setState:value=>{state=value;},reconcileLastCallEndedAt(){},financeRunAutoFillCascade(){},
  saveAll(){writes++;return accept;},onGameCallsChanged(){},render(){},
  callsOverlap:(a,b)=>Date.parse(a.startISO)<Date.parse(b.endISO)&&Date.parse(b.startISO)<Date.parse(a.endISO)};
 const opened=()=>({owner:settings,review:JSON.stringify(state.callRecordReviews[0]),candidates:JSON.stringify(calls)});
 return {context,opened,messages,get calls(){return calls;},get state(){return state;},get settings(){return settings;},reject:()=>{accept=false;},writes:()=>writes};
}
test('explicit linking preserves the selected backup and every other call without duplicating the official row',()=>{
 const f=fixture(),other=JSON.stringify(f.calls[1]);
 assert.equal(linkCallRecordReview(f.context,'review','a',f.opened()),true);
 assert.equal(f.calls.length,2);assert.equal(JSON.stringify(f.calls[1]),other);
 assert.equal(f.calls[0].source,'import');assert.equal(f.calls[0].records.tool.durationMs,15000);
 assert.equal(f.state.callRecordReviews.length,0);assert.equal(f.writes(),1);
});
test('linking rejects stale account or candidates and preserves the pending record',()=>{
 const changed=fixture(),previous=changed.opened();changed.calls[0].pay='9.00';
 assert.equal(linkCallRecordReview(changed.context,'review','a',previous),false);assert.equal(changed.writes(),0);
 const f=fixture(),opened=f.opened();opened.owner={};assert.equal(linkCallRecordReview(f.context,'review','a',opened),false);
 assert.equal(f.writes(),0);assert.equal(f.state.callRecordReviews.length,1);
});
test('failed persistence restores both calls and the pending link',()=>{
 const f=fixture(),before=JSON.stringify(f.context.data());f.reject();
 assert.equal(linkCallRecordReview(f.context,'review','a',f.opened()),false);
 assert.equal(JSON.stringify(f.context.data()),before);
 const thrown=fixture(),prior=JSON.stringify(thrown.context.data());
 thrown.context.financeRunAutoFillCascade=()=>{throw Error('interrupted');};
 assert.equal(linkCallRecordReview(thrown.context,'review','a',thrown.opened()),false);
 assert.equal(JSON.stringify(thrown.context.data()),prior);
});
test('linking refuses to overwrite another real overlapping call',()=>{
 const f=fixture();Object.assign(f.state.callRecordReviews[0].call,official(7));const before=JSON.stringify(f.context.data());
 assert.equal(linkCallRecordReview(f.context,'review','a',f.opened()),false);assert.equal(f.writes(),0);
 assert.equal(JSON.stringify(f.context.data()),before);
});
test('comparison renders observed seconds and official zero without combining their payments',()=>{
 const original=globalThis.document;const content={innerHTML:'',querySelectorAll:()=>[]},subtitle={textContent:''};
 globalThis.document={getElementById:id=>id==='callRecordsContent'?content:subtitle};
 try{
  const call=preserveCallRecords(official(0,'$0.00'),live(),iso(501));
  openCallRecords({data:()=>({calls:[call],state:{},settings:{}}),ui:(strings,...values)=>strings.reduce((s,part,i)=>s+part+(values[i]??''),''),translateText:x=>x,
   escapeHtml:x=>String(x).replaceAll('<','&lt;'),money:x=>'$'+x.toFixed(2),financeConvertedInline:()=>'',displayLocale:()=> 'en-US',formatDuration:ms=>Math.floor(ms/1000)+' s',openModal(){}},call.id);
  assert.match(content.innerHTML,/461000 ms/);assert.match(content.innerHTML,/\$0\.00/);assert.match(content.innerHTML,/\$0\.96/);
  assert.match(content.innerHTML,/Propio informa cero/);
  assert.ok(!content.innerHTML.includes('class="record-equation"'), 'historical review must not invent a current ACW');
 }finally{globalThis.document=original;}
});
