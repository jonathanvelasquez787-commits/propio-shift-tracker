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
