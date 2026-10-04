import { rollup } from 'rollup';
import { mkdir, copyFile, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
const sourceManifest = JSON.parse(await readFile(path.join(root, 'extension/propio-bridge/manifest.json'), 'utf8'));
const out = path.resolve(process.argv[2] || 'work/propio-bridge');
if (out === root || out.startsWith(path.join(root, 'js') + path.sep)) throw new Error('Invalid extension output');
await mkdir(out, { recursive: true });
const bundle = await rollup({ input: path.join(root, 'extension/propio-bridge/worker.js') });
await bundle.write({ file: path.join(out, 'worker.js'), format: 'es', inlineDynamicImports: true });
await bundle.close();
const portal = await rollup({ input: path.join(root, 'extension/propio-bridge/portal-history.js') });
await portal.write({ file: path.join(out, 'portal-history.js'), format: 'iife', inlineDynamicImports: true });
const userscriptHeader = `// ==UserScript==\n// @name         Resumen de minutos y pago de Propio\n// @namespace    propio-shift-tracker\n// @version      ${sourceManifest.version}\n// @description  Suma Duration (Minutes) y Pay de las filas visibles del historial.\n// @match        https://interpreters.propio-ls.com/*\n// @grant        none\n// @run-at       document-idle\n// ==/UserScript==\n`;
await portal.write({ file: path.join(out, 'propio-resumen.user.js'), format: 'iife', inlineDynamicImports: true, banner: userscriptHeader });
await portal.close();
for (const name of ['manifest.json', 'tracker-content.js', 'popup.html', 'popup.css', 'popup.js', 'README.md']) {
  await copyFile(path.join(root, 'extension/propio-bridge', name), path.join(out, name));
}
const version = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')).version;
const manifest = JSON.parse(await readFile(path.join(out, 'manifest.json'), 'utf8'));
await writeFile(path.join(out, 'release.json'), JSON.stringify({ appVersion: version, extensionVersion: manifest.version }, null, 2));
console.log(`Extension built: ${out}`);
