import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const bloque = css.slice(css.indexOf('/* avisos compactos */'), css.indexOf('/* fin avisos compactos */'));

test('avisos compactos: cada aviso queda en una linea con el boton Personalizar al lado', () => {
  assert.ok(bloque.length > 300, 'falta el bloque avisos compactos');
  assert.match(bloque, /\.notif-row \{[^}]*display:\s*flex/);
  assert.match(bloque, /\.alert-customize\[open\] \{[^}]*flex:\s*1 1 100%/);
  assert.match(bloque, /\.alert-customize > summary small \{ display: none/);
});

test('avisos compactos: usa variables del tema y no colores fijos', () => {
  assert.match(bloque, /var\(--line\)/);
  assert.doesNotMatch(bloque, /#[0-9a-fA-F]{3,8}\b/);
});
