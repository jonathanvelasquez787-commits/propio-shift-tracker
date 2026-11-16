import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const fin = readFileSync(new URL('../js/finance.js', import.meta.url), 'utf8');

test('pendientes una linea: la primera fila vive dentro del summary y el resto en el cuerpo', () => {
  const i = html.indexOf('id="financePreviewBox"');
  const fin2 = html.indexOf('</details>', i);
  const caja = html.slice(i, fin2);
  const sumEnd = caja.indexOf('</summary>');
  assert.ok(caja.slice(0, sumEnd).includes('id="financePreviewFirst"'), 'la fila 1 debe estar en el summary (visible cerrada)');
  assert.ok(caja.slice(sumEnd).includes('id="financePreviewRows"'), 'las demas filas van en el cuerpo plegable');
  assert.ok(caja.slice(sumEnd).includes('Acumulados de Finanzas'), 'la nota queda en el cuerpo');
  assert.ok(caja.includes('data-nav-page="finance"'), 'se conserva Ver Finanzas');
});

test('pendientes una linea: el JS reparte 3 pendientes entre fila 1 y cuerpo', () => {
  assert.match(fin, /financePendingPreviewItems\(3\)/);
  assert.match(fin, /getElementById\('financePreviewFirst'\)/);
  assert.match(fin, /items\.slice\(1\)\.map\(rowHtml\)/);
});

test('pendientes una linea: CSS propio con variables del tema', () => {
  const bloque = css.slice(css.indexOf('/* pendientes una linea */'), css.indexOf('/* fin pendientes una linea */'));
  assert.ok(bloque.length > 100);
  assert.match(bloque, /#financePreviewBox \.fin-preview-main \{ display: flex; flex-wrap: wrap;/);
  assert.match(bloque, /\.fin-preview-bar \{ flex: 0 0 100%/);
  assert.doesNotMatch(bloque, /#[0-9a-fA-F]{3,8}\b/);
});
