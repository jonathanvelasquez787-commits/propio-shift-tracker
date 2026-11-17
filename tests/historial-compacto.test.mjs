import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const js = readFileSync(new URL('../js/call-recovery.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');

test('historial compacto: sin tarjeta grande, con pastilla con cuenta y Actualizar chico', () => {
  assert.doesNotMatch(js, /class="recovery-overview"/);
  assert.match(js, /class="pp-bar"/);
  assert.match(js, /data-recovery-filter="ready">Recuperables<em>\$\{ready\}<\/em>/);
  assert.match(js, /data-recovery-refresh>↻ Actualizar/);
});

test('historial compacto: textos explicativos en ¿Cómo funciona? y vacío en una fila', () => {
  assert.match(js, /<details class="pp-how"><summary>¿Cómo funciona\?<\/summary>/);
  assert.match(js, /class="pp-empty"/);
  assert.doesNotMatch(js, /class="recovery-empty"/);
  assert.doesNotMatch(js, /<p class="note">Hasta 50 cambios/);
});

test('historial compacto: el CSS vive en su bloque y no usa colores fijos', () => {
  const a = css.indexOf('/* historial compacto */'), b = css.indexOf('/* fin historial compacto */');
  assert.ok(a > 0 && b > a);
  const block = css.slice(a, b);
  assert.match(block, /#callRecoveryBody \.pp-empty/);
  assert.equal(/:\s*#[0-9a-fA-F]{3,8}/.test(block), false);
});
