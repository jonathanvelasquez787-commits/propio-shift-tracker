import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const bloque = css.slice(css.indexOf('/* higher rate tarjeta compacta */'), css.indexOf('/* fin higher rate tarjeta compacta */'));
const vista = readFileSync(new URL('../js/detail-views.js', import.meta.url), 'utf8');

test('higher rate compacta: la tarjeta de hoy no repite la fecha y usa textos cortos', () => {
  assert.doesNotMatch(vista, /class="hero-today-date"/);
  assert.match(vista, /Bono de hoy/);
  assert.match(vista, /hero-fig-label">en llamada</);
  assert.match(vista, /hero-fig-label">ventana total</);
});

test('higher rate compacta: la franja de ventana activa se oculta, la insignia queda en la misma fila y sin colores fijos', () => {
  assert.ok(bloque.length > 200, 'falta el bloque higher rate tarjeta compacta');
  assert.match(bloque, /#higherRateLiveCard\.tone-active \{?[^}]*display:\s*none|#higherRateLiveCard\.tone-active\{display:none\}/);
  assert.match(bloque, /\.hero-today-top\{[^}]*flex-wrap:nowrap/);
  assert.doesNotMatch(bloque, /#[0-9a-fA-F]{3,8}\b/);
});
