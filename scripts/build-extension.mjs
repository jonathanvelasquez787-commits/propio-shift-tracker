import { rollup } from 'rollup';
import { mkdir, copyFile, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
const out = path.resolve(process.argv[2] || 'work/propio-bridge');
if (out === root || out.startsWith(path.join(root, 'js') + path.sep)) throw new Error('Invalid extension output');
await mkdir(out, { recursive: true });
const bundle = await rollup({ input: path.join(root, 'extension/propio-bridge/worker.js') });
await bundle.write({ file: path.join(out, 'worker.js'), format: 'es', inlineDynamicImports: true });
await bundle.close();
for (const name of ['manifest.json', 'tracker-content.js', 'popup.html', 'popup.css', 'popup.js']) {
  await copyFile(path.join(root, 'extension/propio-bridge', name), path.join(out, name));
}
const version = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')).version;
await writeFile(path.join(out, 'release.json'), JSON.stringify({ appVersion: version, extensionVersion: '1.0.0' }, null, 2));
console.log(`Extension built: ${out}`);
