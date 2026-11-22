import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = name => fs.readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

test('sin horario la pildora en curso se muestra con su nombre y cronometro', () => {
  const appMain = read('js/app-main.js');
  assert.match(appMain, /pillHost\.hidden = !info && !pillHost\.querySelector\('\.hbc-stack'\)\?\.dataset\.sig/);
  assert.match(appMain, /host\.hidden = !host\.closest\?\.\('\.hero-shift-actions'\)\?\.dataset\.liveType/);
});

test('sin horario la pildora en curso se pinta con el color de su boton', () => {
  const css = read('css/app-shell.css');
  const block = css.slice(css.indexOf('/* pildora sin horario */'), css.indexOf('/* fin pildora sin horario */'));
  assert.match(block, /data-live-type="call"/);
  assert.match(block, /background: var\(--hbc-live-fill/);
  assert.doesNotMatch(block, /#[0-9a-fA-F]{3,8}\b/);
});

test('la ventanita del icono se desplaza como ventana para que la barra de acciones quede pegada', () => {
  const guard = read('extension/propio-bridge/panel-guard.js');
  assert.match(guard, /html\{width:500px;height:600px;overflow-x:hidden;overflow-y:auto\}/);
  assert.doesNotMatch(guard, /body\{[^}]*overflow-y:auto/);
  assert.match(read('js/app-main.js'), /window\.addEventListener\('scroll', schedule/);
});
