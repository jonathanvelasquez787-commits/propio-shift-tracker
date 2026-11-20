import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { zipFiles } from '../scripts/zip-lib.mjs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const html = read('app.html');
const panel = html.slice(html.indexOf('id="setPanelDatos"'), html.indexOf('id="setPanelDatos"') + 40000);

test('Ajustes, pestana Datos, ofrece descargar la extension con los pasos para instalarla', () => {
  const section = panel.slice(panel.indexOf('id="settingsExtensionSection"'));
  assert.ok(panel.includes('id="settingsExtensionSection"'));
  assert.match(section, /id="extensionDownloadBtn" href="\/extension\/propio-bridge\.zip" download="propio-bridge\.zip"/);
  assert.match(section, /<details class="set-fold" id="settingsExtensionSteps">/);
  assert.equal((section.slice(0, section.indexOf('</details>')).match(/<li>/g) || []).length, 4);
  assert.equal((html.match(/id="settingsExtensionSteps"/g) || []).length, 1);
});

test('El armado del sitio publica la extension como zip y el service worker no la intercepta', () => {
  const build = read('scripts/build.mjs');
  assert.match(build, /extension\/propio-bridge\.zip/);
  assert.match(build, /build-extension\.mjs/);
  assert.match(read('js/service-worker.js'), /startsWith\('\/extension\/'\)/);
});

test('El zip propio guarda los archivos con su ruta y es un zip valido', () => {
  const bytes = zipFiles([{ name: 'propio-bridge/a.txt', data: Buffer.from('hola') }, { name: 'propio-bridge/icons/b.txt', data: Buffer.from('mundo') }]);
  assert.equal(bytes.readUInt32LE(0), 0x04034b50);
  assert.equal(bytes.readUInt16LE(bytes.length - 12), 2);
  assert.ok(bytes.includes(Buffer.from('propio-bridge/icons/b.txt')));
});

test('El estilo de la descarga usa colores del tema y no hexadecimales', () => {
  const css = read('css/app-shell.css');
  const block = css.slice(css.indexOf('/* extension descarga */'), css.indexOf('/* fin extension descarga */'));
  assert.ok(block.length > 80);
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(block));
  assert.equal((block.match(/{/g) || []).length, (block.match(/}/g) || []).length);
});
