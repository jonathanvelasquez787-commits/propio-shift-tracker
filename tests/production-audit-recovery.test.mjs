import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { generateKeyPairSync } from 'node:crypto';
import { encryptRecoveryBundle, decryptRecoveryBundle } from '../lib/recovery-crypto.js';
import { ui, translateText, translateMarkup, displayLocale } from '../js/i18n.js';
const syncSource = fs.readFileSync(new URL('../js/sync.js',import.meta.url),'utf8')
  .replace(/^import .*;\r?$/gm,'').replace(/\bexport (?=(?:async )?(?:function|const))/g,'')
  .replace(/^export \{ DATA_SCHEMA_VERSION \};\r?$/gm,'');
function harness() {
  const values=new Map(),requests=[];let reject=false;
  const storage={getItem:key=>values.get(key)??null,removeItem:key=>values.delete(key),setItem:(key,value)=>{
    if(reject&&key==='propio_recovery_copies_v1')throw Error('QuotaExceededError');values.set(key,value);
  }};
  const context=vm.createContext({ui,translateText,translateMarkup,displayLocale,window:{localStorage:storage},navigator:{userAgent:'Test',onLine:false},DATA_SCHEMA_VERSION:2,
    getSupabase:()=>({rpc:(name,payload)=>new Promise(resolve=>requests.push({name,payload,resolve})),from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})})})}),
    setTimeout:()=>1,clearTimeout:()=>{}});
  vm.runInContext(syncSource,context);
  return {values,requests,rejectArchive:()=>{reject=true},run:code=>vm.runInContext(code,context)};
}
test('choosing cloud retains the discarded local version and restoring it retains the current version',()=>{
  const h=harness();h.run("adoptLocal('A');writeLocalSnapshot({state:{},calls:[{id:'only-local'}],settings:{rate:.21}})");
  h.run("adoptCloud({state:{},calls:[],settings:{rate:.12},updated_at:'cloud'},'A')");
  assert.equal(h.run("listRecoveryCopies('A')[0].snapshot.calls[0].id"),'only-local');
  h.run("restoreRecoveryCopy(listRecoveryCopies('A')[0].id,'A')");
  assert.equal(h.run('readLocalSnapshot().calls[0].id'),'only-local');
  assert.equal(h.run('readMeta().dirty'),true);
  assert.equal(h.run("listRecoveryCopies('A').length"),2);
});
test('a different account cannot see pending copies; returning to the owner restores its pending work',async()=>{
  const h=harness();h.run("adoptLocal('A');writeLocalSnapshot({state:{work:true},calls:[{id:'A-only'}],settings:{}});resetForUser('B');setAccessToken('token-B','B')");
  assert.equal(h.run("listRecoveryCopies('A').length"),0);
  assert.equal(h.run('readLocalSnapshot().calls.length'),0);
  h.run("setAccessToken('token-A','A')");await h.run("resolveBoot('A')");
  assert.equal(h.run('readLocalSnapshot().calls[0].id'),'A-only');
  assert.equal(h.run('readMeta().dirty'),true);
  assert.equal(h.run("listRecoveryCopies('A')[0].reason"),'recovered-account');
});
test('quota exhaustion blocks destructive adoption and account switching without touching the only copy',()=>{
  for(const action of ["adoptCloud({state:{},calls:[],settings:{},updated_at:'cloud'},'A')","resetForUser('B')"]) {
    const h=harness();h.run("adoptLocal('A');writeLocalSnapshot({state:{work:true},calls:[{id:'keep'}],settings:{}})");
    const before=new Map(h.values);h.rejectArchive();assert.throws(()=>h.run(action));assert.deepEqual(h.values,before);
  }
});
test('four allowed sound files are rejected by the aggregate budget before persistence',()=>{
  const h=harness();h.run("sounds=Object.fromEntries(['a','b','c','d'].map(key=>[key,'data:audio/wav;base64,'+'A'.repeat(409600)]))");
  assert.equal(h.run('settingsWithinBudget(sounds)'),false);
  assert.equal(h.run("settingsWithinBudget({sound:'A'.repeat(400000)})"),true);
  assert.equal(h.run("jsonbBytes({x:'ñ',y:[1,2]})"),Buffer.byteLength('{"x": "ñ", "y": [1, 2]}'));
});
test('large histories upload in bounded batches with a new expected revision at each commit',async()=>{
  const h=harness();h.run("adoptLocal('A');writeLocalSnapshot({state:{},settings:{},calls:Array.from({length:10000},(_,i)=>({id:String(i),notes:'x'.repeat(1000)}))})");
  const push=h.run('pushSnapshot()');let index=0;
  while(index<3) {
    await new Promise(resolve=>setImmediate(resolve));
    const request=h.requests[index];assert.ok(request);assert.ok(Buffer.byteLength(JSON.stringify(request.payload.p_call_upserts))<5*1024*1024);
    assert.equal(request.payload.p_expected_updated_at,index?`revision-${index}`:null);
    request.resolve({data:{ok:true,updated_at:`revision-${++index}`},error:null});
  }
  const result=await push;assert.equal(result.ok,true);assert.equal(h.run('readMeta().dirty'),false);
  assert.equal(h.requests.flatMap(r=>r.payload.p_call_upserts).length,10000);
  assert.equal(new Set(h.requests.flatMap(r=>r.payload.p_call_upserts.map(c=>c.id))).size,10000);
});
test('a failed later batch keeps confirmed calls and revision so retry sends only unfinished work',async()=>{
  const h=harness();h.run("adoptLocal('A');writeLocalSnapshot({state:{},settings:{},calls:Array.from({length:6000},(_,i)=>({id:String(i),notes:'x'.repeat(1000)}))})");
  const first=h.run('pushSnapshot()');await new Promise(r=>setImmediate(r));h.requests[0].resolve({data:{ok:true,updated_at:'partial'},error:null});
  await new Promise(r=>setImmediate(r));const remaining=h.requests[1].payload.p_call_upserts.map(c=>c.id);h.requests[1].resolve({data:null,error:{message:'Failed to fetch'}});
  assert.ok((await first).error);assert.equal(h.run('readMeta().lastSyncedUpdatedAt'),'partial');assert.equal(h.run('readMeta().dirty'),true);
  const retry=h.run('pushSnapshot()');await new Promise(r=>setImmediate(r));assert.deepEqual(Array.from(h.requests[2].payload.p_call_upserts,c=>c.id),Array.from(remaining));
  h.requests[2].resolve({data:{ok:true,updated_at:'finished'},error:null});assert.equal((await retry).ok,true);
});
test('portable backups round trip with an offline private key and reject ciphertext tampering',()=>{
  const {publicKey,privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
  const source={format:'pst-backup-v1',created_at:'2026-10-10',auth_users:[{id:'synthetic'}],calls:[{id:'one'}]};
  const envelope=encryptRecoveryBundle(source,publicKey);assert.deepEqual(decryptRecoveryBundle(envelope,privateKey),source);
  const ciphertext=Buffer.from(envelope.ciphertext,'base64');ciphertext[0]^=1;
  assert.throws(()=>decryptRecoveryBundle({...envelope,ciphertext:ciphertext.toString('base64')},privateKey));
});
