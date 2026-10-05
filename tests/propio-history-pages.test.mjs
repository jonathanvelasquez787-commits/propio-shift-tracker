import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePortalRange, collectPortalPages } from '../js/propio-history-pages.js';
function fixture({ count=285, size=15, index=0, identical=false, first=true }={}) {
  let page=index, context='range-A', total=count;
  const controller=new AbortController(), moves=[];
  const read=()=>{
    const start=total ? page*size+1 : 0, end=Math.min(total,(page+1)*size), n=total ? end-start+1 : 0;
    const value=identical ? 1 : page+1;
    return { range:{start,end,total,size}, context, hasFirst:first, signature:JSON.stringify([value,n]), summary:{count:n,minutes:n*value,pay:n*.12,missingMinutes:0,missingPay:0} };
  };
  const move=async(action)=>{moves.push(action);page=action==='first'?0:page+(action==='next'?1:-1);return read();};
  return {read,move,controller,moves,change:()=>{context='range-B';},shrink:()=>{total--;},get page(){return page;}};
}
test('Angular paginator range validates zero, grouped totals and English/Spanish labels',()=>{
 assert.deepEqual(parsePortalRange('1 – 15 of 285'),{start:1,end:15,total:285});
 assert.deepEqual(parsePortalRange('201 – 285 de 285'),{start:201,end:285,total:285});
 assert.deepEqual(parsePortalRange('1 – 15 of 1,285'),{start:1,end:15,total:1285});
 assert.deepEqual(parsePortalRange('0 of 0'),{start:0,end:0,total:0});
 for(const text of ['5 – 1 of 20','1 – 15 of 10','Loading','0 – 15 of 30'])assert.equal(parsePortalRange(text),null);
});
test('all 285 rows are counted exactly once, identical pages stay distinct and original page is restored',async()=>{
 const f=fixture({index:7,identical:true}), result=await collectPortalPages({read:f.read,move:f.move,signal:f.controller.signal});
 assert.equal(result.summary.count,285);assert.equal(result.summary.minutes,285);assert.equal(result.summary.pay,34.2);assert.equal(result.pages.size,19);assert.equal(f.page,7);
});
test('final partial page, one page, empty history and missing first-page button are supported',async()=>{
 for(const options of [{count:37,index:2,first:false},{count:5},{count:0}]){
  const f=fixture(options),result=await collectPortalPages({read:f.read,move:f.move});
  assert.equal(result.summary.count,options.count);assert.equal(f.page,options.index||0);
 }
});
test('cancel returns to the initial page and never returns a completed total',async()=>{
 const f=fixture({index:3});
 await assert.rejects(collectPortalPages({read:f.read,move:f.move,signal:f.controller.signal,progress:n=>{if(n===30)f.controller.abort();}}),/cancelado/);
 assert.equal(f.page,3);
});
test('changed filters or changing record count abort instead of mixing periods',async()=>{
 for(const change of ['change','shrink']){
  const f=fixture();
  await assert.rejects(collectPortalPages({read:f.read,move:async(action,opts)=>{const result=await f.move(action,opts);f[change]();return f.read();},canRestore:()=>false}),/cambió/);
  assert.deepEqual(f.moves,['next']);
 }
});
test('a skipped, stalled or incomplete page cannot become an official full-period total',async()=>{
 const f=fixture();
 await assert.rejects(collectPortalPages({read:f.read,move:async()=>f.read()}),/no avanzó/);
 await assert.rejects(collectPortalPages({read:()=>{const s=f.read();s.summary.count--;return s;},move:f.move}),/todas sus llamadas/);
});
