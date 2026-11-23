import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { appMainSource } from './helpers/app-main-source.mjs';

const js = appMainSource();
const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');

test('bloques contraidos: los bloques de trabajo se llaman Bloque N', () => {
  assert.match(js, /name = ui`Bloque \$\{workIdx\+\+\}`/);
  assert.doesNotMatch(js, /Bloque de Trabajo \$\{/);
});

test('bloques contraidos: el subtitulo del modo freelancer sin descansos solo dice Modo freelancer', () => {
  assert.match(js, /translateText\('Modo freelancer'\)/);
  assert.doesNotMatch(js, /aquí ves los descansos que has tomado/);
});

test('bloques contraidos: la tarjeta contraida arma una linea con hora, usado y metas', () => {
  const at = js.indexOf("wrap.innerHTML = slotRows.join('');");
  const piece = js.slice(at, at + 1500);
  assert.match(piece, /\.sblk-card\.is-collapsed/);
  assert.match(piece, /sblk-collapsed-line/);
  assert.match(piece, /\.sblk-tile/);
  assert.match(piece, /\.sblk-bar-label-row/);
});

test('bloques contraidos: el CSS muestra la linea solo contraida y sin colores fijos', () => {
  const a = css.indexOf('/* bloques contraidos */');
  const b = css.indexOf('/* fin bloques contraidos */');
  assert.ok(a >= 0 && b > a);
  const block = css.slice(a, b);
  assert.match(block, /\.sblk-card \.sblk-collapsed-line \{ display: none; \}/);
  assert.match(block, /\.sblk-card\.is-collapsed \.sblk-collapsed-line \{ display: flex;/);
  assert.doesNotMatch(block, /#[0-9a-fA-F]{3,8}\b/);
});
