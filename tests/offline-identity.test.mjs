import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../js/boot.js',import.meta.url),'utf8');
const helper=source.slice(source.indexOf('function readOfflineOwner()'),source.indexOf('async function mountOfflineApp'));
function cachedOwner(owner,session,hasData=true){
  const context=vm.createContext({URL,JSON,Object,SUPABASE_URL:'https://project.supabase.co',
    readMeta:()=>({userId:owner}),localHasData:()=>hasData,
    window:{localStorage:{getItem:key=>key==='sb-project-auth-token'?JSON.stringify(session):null}}});
  return vm.runInContext(helper+'\nreadOfflineOwner()',context);
}
test('offline identity accepts settings/call-only histories for the cached owner',()=>{
  assert.equal(cachedOwner('a',{user:{id:'a'},access_token:'expired'}).id,'a');
  assert.equal(cachedOwner('b',{user:{id:'a'},access_token:'expired'}),null);
  assert.equal(cachedOwner('a',{user:{id:'a'}},true),null);
  assert.equal(cachedOwner('a',{user:{id:'a'},access_token:'expired'},false),null);
});
