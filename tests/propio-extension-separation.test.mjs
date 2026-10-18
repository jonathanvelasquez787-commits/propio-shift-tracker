import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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
