import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/operations.js';
function response(){
  const result={headers:{}};
  return {result,setHeader(k,v){result.headers[k]=v},status(code){result.status=code;return this},json(body){result.body=body},end(){}};
}
test('operations require the independent secret before requesting private data',async t=>{
  const old=process.env.CRON_SECRET,oldFetch=globalThis.fetch;
  t.after(()=>{globalThis.fetch=oldFetch;if(old===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=old});
  process.env.CRON_SECRET='test-only-operations';globalThis.fetch=()=>assert.fail('unauthorized database access');
  for(const authorization of [undefined,'Bearer wrong','Bearer test-only-operationx']){
    const res=response();await handler({method:'GET',headers:{authorization},query:{mode:'backup'}},res);
    assert.equal(res.result.status,401);
  }
});
test('monitor verifies database readiness and the live app headers, records failures',async t=>{
  const old=process.env.CRON_SECRET,oldFetch=globalThis.fetch;
  t.after(()=>{globalThis.fetch=oldFetch;if(old===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=old});
  process.env.CRON_SECRET='test-only-operations';const records=[];
  for(const healthy of [true,false]){
    globalThis.fetch=async(url,options)=>{
      if(String(url).endsWith('/app'))return {ok:healthy,headers:new Headers({'content-security-policy':"default-src 'self'",'strict-transport-security':'max-age=31536000'})};
      if(String(url).endsWith('/record_operation'))records.push(JSON.parse(options.body));
      return {ok:true,text:async()=>String(url).endsWith('/record_operation')?'':JSON.stringify({ok:true})};
    };
    const res=response();await handler({method:'GET',headers:{authorization:'Bearer test-only-operations'},query:{mode:'monitor'}},res);
    assert.equal(res.result.status,healthy?200:503);
    assert.equal(records.at(-1).p_ok,healthy);
  }
});
