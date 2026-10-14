import { rollup } from 'rollup';
import { mkdir, copyFile, writeFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
const out = path.resolve(process.argv[2] || 'work/propio-bridge');
if (out === root || out.startsWith(path.join(root, 'js') + path.sep)) throw new Error('Invalid extension output');
await mkdir(out, { recursive: true });
for (const legacy of ['portal-history.js', 'propio-resumen.user.js']) await rm(path.join(out, legacy), { force: true });
const bundle = await rollup({ input: path.join(root, 'extension/propio-bridge/worker.js') });
await bundle.write({ file: path.join(out, 'worker.js'), format: 'es', inlineDynamicImports: true });
await bundle.close();
const portal = await rollup({ input: path.join(root, 'extension/propio-bridge/portal-content.js') });
await portal.write({ file: path.join(out, 'portal-content.js'), format: 'iife', inlineDynamicImports: true });
await portal.close();
const summary = await rollup({ input: path.join(root, 'extension/propio-bridge/summary-content.js') });
await summary.write({ file: path.join(out, 'summary-content.js'), format: 'iife', inlineDynamicImports: true });
await summary.close();
const popup = await rollup({ input: path.join(root, 'extension/propio-bridge/popup.js') });
await popup.write({ file: path.join(out, 'popup.js'), format: 'iife', inlineDynamicImports: true });
await popup.close();
for (const name of ['manifest.json', 'tracker-content.js', 'popup.html', 'popup.css', 'README.md', 'workspace.html', 'workspace.css', 'workspace.js', 'workspace-page.js', 'workspace-preferences.json']) {
  await copyFile(path.join(root, 'extension/propio-bridge', name), path.join(out, name));
}
await mkdir(path.join(out, 'icons'), { recursive: true });
for (const size of [16, 32, 48, 128]) await copyFile(path.join(root, `extension/propio-bridge/icons/icon-${size}.png`), path.join(out, `icons/icon-${size}.png`));
const version = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')).version;
const manifest = JSON.parse(await readFile(path.join(out, 'manifest.json'), 'utf8'));
await writeFile(path.join(out, 'release.json'), JSON.stringify({ appVersion: version, extensionVersion: manifest.version }, null, 2));
console.log(`Extension built: ${out}`);
