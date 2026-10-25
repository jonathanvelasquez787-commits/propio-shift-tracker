import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { rollup } from 'rollup';
const read = file => fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
test('unified extension keeps session detection separate from original layout and removes its custom summary',()=>{
 const manifest=JSON.parse(read('extension/propio-bridge/manifest.json'));
 assert.deepEqual(manifest.content_scripts.map(s=>s.matches),[['https://interpreters.propio-ls.com/portal*'],['https://interpreters.propio-ls.com/portal*'],['https://interpreters.propio-ls.com/*'],['https://propio-shift-tracker.vercel.app/*']]);
 assert.deepEqual(manifest.content_scripts[2].js,['portal-content.js']);
 assert.deepEqual(manifest.permissions,['storage','webRequest','alarms','webNavigation']);
 assert.equal(fs.existsSync(new URL('../extension/propio-bridge/summary-content.js',import.meta.url)),false);
 assert.doesNotMatch(read('extension/propio-bridge/popup.html'),/summaryEnabled|summaryForm|summaryPreferences/);
 assert.match(read('extension/propio-bridge/popup.html'),/originalLayout/);
 for(const size of [16,32,48,128]) {
   assert.equal(manifest.icons[size],`icons/icon-${size}.png`);
   const png=fs.readFileSync(new URL(`../extension/propio-bridge/icons/icon-${size}.png`,import.meta.url));
   assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);
 }
 assert.equal(fs.existsSync(new URL('../extension/propio-bridge/portal-history.js',import.meta.url)),false);
});

test('compiled popup displays the installed manifest version even when its worker cannot respond',async()=>{
 const html=read('extension/propio-bridge/popup.html'),manifest=JSON.parse(read('extension/propio-bridge/manifest.json'));
 assert.match(html,/id="extensionVersion"/);assert.doesNotMatch(html,/<span class="version"[^>]*>\d+\.\d+\.\d+</);
 const bundle=await rollup({input:fileURLToPath(new URL('../extension/propio-bridge/popup.js',import.meta.url))});
 try{
  const {output}=await bundle.generate({format:'iife',inlineDynamicImports:true});
  for(const version of [manifest.version,'99.4.7']){
   const nodes=new Map([...html.matchAll(/id="([^"]+)"/g)].map(([,id])=>[id,{textContent:'',classList:{toggle(){}},addEventListener(){}}]));
   const context=vm.createContext({document:{getElementById:id=>nodes.get(id)},
    chrome:{runtime:{getManifest:()=>({...manifest,version}),sendMessage:async()=>{throw Error('worker disconnected');}},
     storage:{onChanged:{addListener(){}},local:{get:async()=>({})}}},setInterval(){}});
   vm.runInContext(output[0].code,context);await new Promise(resolve=>setImmediate(resolve));
   assert.equal(nodes.get('extensionVersion').textContent,version);
   assert.match(nodes.get('status').textContent,/No se pudo guardar/);
  }
 }finally{await bundle.close();}
});


test('automation diagnostics belong to the extension and optional work metadata remains bounded',async()=>{
 const {validateBridgePlan}=await import('../js/propio-bridge-rules.js');
 const now=Date.parse('2026-10-25T18:00:00Z'),startAt='2026-10-25T12:00:00Z',endAt='2026-10-25T22:00:00Z';
 const work={startedAt:'2026-10-25T11:55:00Z',endedAt:null,manual:true,callAtStart:false,privateNote:'never copied'};
 const plan=validateBridgePlan({startAt,endAt,workSession:work},now);
 assert.deepEqual(plan.workSession,{startedAt:new Date(work.startedAt).toISOString(),endedAt:null,manual:true,callAtStart:false});
 assert.equal(validateBridgePlan({startAt,endAt,workSession:{startedAt:'invalid'}},now).workSession,null);
 assert.equal(validateBridgePlan({startAt,endAt,workSession:{startedAt:'2026-10-20T10:00:00Z'}},now).workSession,null);
 assert.equal(validateBridgePlan({startAt,endAt},now).workSession,null);
 assert.doesNotMatch(read('app.html'),/id="automationPanel"/);
 assert.doesNotMatch(read('js/boot.js'),/installAutomationStatusUi|automationUi/);
 assert.match(read('extension/propio-bridge/popup.html'),/id="automationPanel"/);
 assert.ok(read('extension/propio-bridge/popup.js').includes('automationUi.update(state.automationStatus'));
});


test('compiled popup saves the optional dark preference and restores its choice after a failed write',async()=>{
 const html=read('extension/propio-bridge/popup.html');
 const bundle=await rollup({input:fileURLToPath(new URL('../extension/propio-bridge/popup.js',import.meta.url))});
 try {
  const {output}=await bundle.generate({format:'iife',inlineDynamicImports:true});
  const handlers=new Map(),nodes=new Map([...html.matchAll(/id="([^"]+)"/g)].map(([,id])=>[id,{textContent:'',checked:false,disabled:false,classList:{toggle(){}},addEventListener:(kind,fn)=>handlers.set(id+':'+kind,fn)}]));
  let fail=false;const saved=[];
  const context=vm.createContext({document:{getElementById:id=>nodes.get(id)},chrome:{runtime:{getManifest:()=>({version:'2.3.7'}),sendMessage:async()=>{throw Error('worker unavailable');}},storage:{onChanged:{addListener(){}},local:{get:async()=>({}),set:async value=>{if(fail)throw Error('storage');saved.push(value);}}}},setInterval(){}});
  vm.runInContext(output[0].code,context);await new Promise(resolve=>setImmediate(resolve));
  const toggle=nodes.get('portalDark');assert.equal(toggle.checked,false);
  toggle.checked=true;await handlers.get('portalDark:change')({target:toggle});assert.equal(toggle.checked,true);assert.equal(saved[0]['propio-dark-mode-v1'].enabled,true);assert.equal(toggle.disabled,false);
  fail=true;toggle.checked=false;await handlers.get('portalDark:change')({target:toggle});assert.equal(toggle.checked,true);assert.match(nodes.get('portalDarkStatus').textContent,/No se pudo guardar/);assert.equal(toggle.disabled,false);
  assert.deepEqual(JSON.parse(read('extension/propio-bridge/manifest.json')).content_scripts[1].css,['portal-dark.css']);
  assert.doesNotMatch(read('extension/propio-bridge/portal-dark.css'),/filter\s*:|invert\(|video\s*\{|img\s*\{/);
 } finally {await bundle.close();}
});
