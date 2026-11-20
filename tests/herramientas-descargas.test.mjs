import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const html = readFileSync(new URL('../extension/propio-bridge/workspace.html', import.meta.url), 'utf8');
const build = readFileSync(new URL('../scripts/build-extension.mjs', import.meta.url), 'utf8');
const links = [...html.matchAll(/href="tools\/([^"]+)" download="([^"]+)"/g)].map(m => [m[1], m[2]]);

test('La seccion Herramientas de Windows ofrece cada archivo por separado', () => {
  assert.match(html, /<details class="disclosure" id="windows-tools">/);
  assert.equal(links.length, 9);
  for (const [href, name] of links) assert.equal(href, name);
  assert.ok(!/\.zip"/.test(html.slice(html.indexOf('id="windows-tools"'))));
  assert.match(html, /id="tools-export"[^]*id="tools-export-status"/);
});

test('El armado de la extension copia a tools/ cada archivo que se ofrece', () => {
  for (const [name] of links) assert.ok(build.includes(name), `build-extension no copia ${name}`);
  assert.match(build, /'tools'/);
});

test('Los archivos que se descargan existen en el repo', () => {
  for (const path of ['Reparar-notas.bat', 'scripts/install-desktop-workspace.ps1', 'windows/Open-Chrome-And-Notes.cs', 'herramientas-windows/optimizar-interpreter/optimizar_interpreter.bat', 'herramientas-windows/optimizar-interpreter/optimizar_chrome.ps1', 'herramientas-windows/grabadora/grabadora.pyw', 'herramientas-windows/grabadora/crear_exe.bat', 'herramientas-windows/grabadora/grabadora.ico', 'herramientas-windows/grabadora/timbre-propio.wav']) assert.ok(existsSync(new URL(`../${path}`, import.meta.url)), path);
});
