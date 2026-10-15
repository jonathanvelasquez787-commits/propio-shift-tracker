import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = file => fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
test('independent summary is scoped to Propio and has no call observer, tracker or messaging capabilities',()=>{
 const manifest=JSON.parse(read('extension/propio-summary/manifest.json'));
 assert.deepEqual(manifest.permissions,['storage']);
 assert.deepEqual(manifest.host_permissions,['https://interpreters.propio-ls.com/*']);
 assert.equal(manifest.background,undefined);assert.equal(manifest.externally_connectable,undefined);
 assert.deepEqual(manifest.content_scripts.map(s=>s.matches),[['https://interpreters.propio-ls.com/*']]);
 const source=read('extension/propio-summary/summary.js');
 assert.doesNotMatch(source,/sendMessage|postMessage|webRequest|twilio|propio-shift-tracker|fetch\(/);
 assert.match(source,/aria-describedby="period-explanation"/);assert.match(source,/sum-period'\)\.title/);
 assert.match(read('extension/propio-summary/i18n.js'),/Elegí Start Date y End Date en Propio y actualizá el historial/);
});
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
