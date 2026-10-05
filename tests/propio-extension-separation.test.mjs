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
test('bridge only installs its tracker content script and does not build or inject a history summary',()=>{
 const manifest=JSON.parse(read('extension/propio-bridge/manifest.json'));
 assert.deepEqual(manifest.content_scripts.map(s=>s.matches),[['https://propio-shift-tracker.vercel.app/*']]);
 assert.doesNotMatch(read('scripts/build-extension.mjs'),/rollup\(\{ input:.*summary|portal-history.*input/);
 assert.equal(fs.existsSync(new URL('../extension/propio-bridge/portal-history.js',import.meta.url)),false);
});
