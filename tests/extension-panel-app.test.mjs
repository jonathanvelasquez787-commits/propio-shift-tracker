import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const manifest = JSON.parse(read('extension/propio-bridge/manifest.json'));

test('la extension declara el panel lateral, el permiso de entrada y un ID fijo', () => {
  assert.equal(manifest.side_panel.default_path, 'panel.html');
  assert.ok(manifest.permissions.includes('sidePanel'));
  assert.ok(manifest.permissions.includes('identity'));
  const id = [...createHash('sha256').update(Buffer.from(manifest.key, 'base64')).digest('hex').slice(0, 32)]
    .map(c => String.fromCharCode(97 + parseInt(c, 16))).join('');
  assert.equal(id, 'fpdhiecihjndclfjjlchipnjnpmnepkg');
});

test('la extension arma panel.html con la app y sin analitica ni service worker', () => {
  const build = read('scripts/build-extension.mjs');
  assert.ok(build.includes("'panel.html'"));
  assert.ok(build.includes('panel-guard.js'));
  assert.ok(build.includes('insights') && build.includes('monitoring') && build.includes('register-sw'));
  const web = read('scripts/build.mjs');
  assert.ok(web.indexOf('build-extension.mjs') > web.indexOf("'app.html'"), 'la extension se arma despues de app.html');
});

test('dentro de la extension la app muestra el boton de Google en vez de irse a la web', () => {
  const boot = read('js/boot.js');
  assert.ok(boot.includes("window.location.protocol === 'chrome-extension:'"));
  assert.ok(boot.includes('showExtensionLogin'));
  assert.ok(read('extension/propio-bridge/panel-guard.js').includes('navigation.addEventListener'), 'las salidas a la web recargan el panel');
  const auth = read('js/auth.js');
  assert.ok(auth.includes('chrome.identity.launchWebAuthFlow') && auth.includes('exchangeCodeForSession'));
});

test('la ventanita de la extension tiene el boton para abrir el panel lateral', () => {
  assert.ok(read('extension/propio-bridge/popup.html').includes('id="openPanel"'));
  assert.ok(read('extension/propio-bridge/popup.js').includes('chrome.sidePanel.open'));
});
