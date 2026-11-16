import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');

test('inicio celular: se oculta la columna de horas de Bloques del día y se conserva la línea', () => {
  const b = css.slice(css.indexOf('/* inicio celular sin columna de horas */'), css.indexOf('/* fin inicio celular sin columna de horas */'));
  assert.ok(b.length > 100);
  assert.match(b, /@media \(max-width: 760px\)/);
  assert.match(b, /#scheduleList\.sblk-timeline \.sblk-item \{ grid-template-columns: 16px 1fr; \}/);
  assert.match(b, /#scheduleList\.sblk-timeline \.sblk-hour \{ display: none; \}/);
  assert.doesNotMatch(b, /sblk-rail/);
  assert.doesNotMatch(b, /#[0-9a-fA-F]{3,8}\b/);
});

test('inicio celular: la hora sigue visible dentro de cada tarjeta y en compu la columna se queda', () => {
  const main = readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');
  assert.match(main, /<div class="sblk-hour">\$\{slot\.start\}<\/div>/);
  const core = readFileSync(new URL('../css/app-core.css', import.meta.url), 'utf8');
  assert.match(core, /\.sblk-item \{\s+display: grid;\s+grid-template-columns: 44px 22px 1fr;/);
});
