import { rollup } from 'rollup';
import { deflateRawSync } from 'node:zlib';
import { mkdir, copyFile, writeFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
const out = path.resolve(process.argv[2] || 'work/propio-bridge');
if (out === root || out.startsWith(path.join(root, 'js') + path.sep)) throw new Error('Invalid extension output');
await mkdir(out, { recursive: true });
for (const legacy of ['portal-history.js', 'propio-resumen.user.js', 'summary-content.js']) await rm(path.join(out, legacy), { force: true });
const bundle = await rollup({ input: path.join(root, 'extension/propio-bridge/worker.js') });
await bundle.write({ file: path.join(out, 'worker.js'), format: 'es', inlineDynamicImports: true });
await bundle.close();
const portal = await rollup({ input: path.join(root, 'extension/propio-bridge/portal-content.js') });
await portal.write({ file: path.join(out, 'portal-content.js'), format: 'iife', inlineDynamicImports: true });
await portal.close();
const original = await rollup({ input: path.join(root, 'extension/propio-bridge/original-portal-entry.js') });
await original.write({ file: path.join(out, 'original-portal-content.js'), format: 'iife', inlineDynamicImports: true });
await original.close();
const popup = await rollup({ input: path.join(root, 'extension/propio-bridge/popup.js') });
await popup.write({ file: path.join(out, 'popup.js'), format: 'iife', inlineDynamicImports: true });
await popup.close();
for (const name of ['manifest.json', 'tracker-content.js', 'popup.html', 'popup.css', 'portal-dark.css', 'README.md', 'workspace.html', 'workspace.css', 'workspace.js', 'workspace-page.js', 'workspace-settings.js', 'workspace-setup.js', 'workspace-preferences.json', 'classic-portal.js']) {
  await copyFile(path.join(root, 'extension/propio-bridge', name), path.join(out, name));
}
await mkdir(path.join(out, 'icons'), { recursive: true });
for (const size of [16, 32, 48, 128]) await copyFile(path.join(root, `extension/propio-bridge/icons/icon-${size}.png`), path.join(out, `icons/icon-${size}.png`));
await mkdir(path.join(out, 'tools'), { recursive: true });
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = buffer => { let c = 0xffffffff; for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function zipFiles(entries) {
  const locals = [], centrals = []; let offset = 0;
  for (const { name, data } of entries) {
    const nameBytes = Buffer.from(name), packed = deflateRawSync(data), crc = crc32(data);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(8, 8); local.writeUInt16LE(0, 10); local.writeUInt16LE(0x21, 12); local.writeUInt32LE(crc, 14); local.writeUInt32LE(packed.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(nameBytes.length, 26);
    const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x0800, 8); central.writeUInt16LE(8, 10); central.writeUInt16LE(0, 12); central.writeUInt16LE(0x21, 14); central.writeUInt32LE(crc, 16); central.writeUInt32LE(packed.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(nameBytes.length, 28); central.writeUInt32LE(offset, 42);
    locals.push(local, nameBytes, packed); centrals.push(central, nameBytes); offset += 30 + nameBytes.length + packed.length;
  }
  const centralBuffer = Buffer.concat(centrals), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(centralBuffer.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuffer, end]);
}
const toolZips = {
  'Reparar-notas.zip': [['Reparar-notas.bat', 'Reparar-notas.bat'], ['scripts/install-desktop-workspace.ps1', 'scripts/install-desktop-workspace.ps1'], ['windows/Open-Chrome-And-Notes.cs', 'windows/Open-Chrome-And-Notes.cs']],
  'Optimizar-Interpreter-y-Chrome.zip': [['herramientas-windows/optimizar-interpreter/optimizar_interpreter.bat', 'optimizar_interpreter.bat'], ['herramientas-windows/optimizar-interpreter/optimizar_chrome.ps1', 'optimizar_chrome.ps1']],
  'Grabadora.zip': ['grabadora.pyw', 'crear_exe.bat', 'grabadora.ico', 'timbre-propio.wav'].map(file => [`herramientas-windows/grabadora/${file}`, file])
};
for (const [zipName, files] of Object.entries(toolZips)) await writeFile(path.join(out, 'tools', zipName), zipFiles(await Promise.all(files.map(async ([source, name]) => ({ name, data: await readFile(path.join(root, source)) })))));
const version = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')).version;
const manifest = JSON.parse(await readFile(path.join(out, 'manifest.json'), 'utf8'));
await writeFile(path.join(out, 'release.json'), JSON.stringify({ appVersion: version, extensionVersion: manifest.version }, null, 2));
console.log(`Extension built: ${out}`);
