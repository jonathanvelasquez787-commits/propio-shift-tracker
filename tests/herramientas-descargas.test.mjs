import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const html = readFileSync(new URL('../extension/propio-bridge/workspace.html', import.meta.url), 'utf8');
const links = [...html.matchAll(/href="tools\/([^"]+)" download="([^"]+)"/g)].map(m => [m[1], m[2]]);

test('La seccion Herramientas de Windows ofrece un zip por herramienta', () => {
  assert.match(html, /<details class="disclosure" id="windows-tools">/);
  assert.deepEqual(links.map(l => l[0]), ['Reparar-notas.zip', 'Optimizar-Interpreter-y-Chrome.zip', 'Grabadora.zip']);
  for (const [href, name] of links) assert.equal(href, name);
  assert.match(html, /id="tools-export"[^]*id="tools-export-status"/);
});

test('El armado de la extension crea cada zip con los archivos de la herramienta', () => {
  const out = join(mkdtempSync(join(tmpdir(), 'ext-')), 'propio-bridge');
  execFileSync('node', ['scripts/build-extension.mjs', out], { cwd: fileURLToPath(new URL('..', import.meta.url)), stdio: 'pipe' });
  const expected = { 'Reparar-notas.zip': ['Reparar-notas.bat', 'scripts/install-desktop-workspace.ps1', 'windows/Open-Chrome-And-Notes.cs'], 'Optimizar-Interpreter-y-Chrome.zip': ['optimizar_interpreter.bat', 'optimizar_chrome.ps1'], 'Grabadora.zip': ['grabadora.pyw', 'crear_exe.bat', 'grabadora.ico', 'timbre-propio.wav'] };
  for (const [zip, names] of Object.entries(expected)) {
    const bytes = readFileSync(join(out, 'tools', zip));
    assert.equal(bytes.readUInt32LE(0), 0x04034b50, `${zip} es un zip`);
    assert.equal(bytes.readUInt16LE(bytes.length - 12), names.length, `${zip} trae ${names.length} archivos`);
    for (const name of names) assert.ok(bytes.includes(Buffer.from(name)), `${zip} trae ${name}`);
  }
});

test('Los archivos que se empaquetan existen en el repo', () => {
  for (const path of ['Reparar-notas.bat', 'scripts/install-desktop-workspace.ps1', 'windows/Open-Chrome-And-Notes.cs', 'herramientas-windows/optimizar-interpreter/optimizar_interpreter.bat', 'herramientas-windows/optimizar-interpreter/optimizar_chrome.ps1', 'herramientas-windows/grabadora/grabadora.pyw', 'herramientas-windows/grabadora/crear_exe.bat', 'herramientas-windows/grabadora/grabadora.ico', 'herramientas-windows/grabadora/timbre-propio.wav']) assert.ok(existsSync(new URL(`../${path}`, import.meta.url)), path);
});
