import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const bloque = css.slice(css.indexOf('/* higher rate historial */'), css.indexOf('/* fin higher rate historial */'));
const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const js = readFileSync(new URL('../js/higher-rate.js', import.meta.url), 'utf8');

test('higher rate historial: textos largos van al panel de informacion y el vacio es corto', () => {
  const historial = html.slice(html.indexOf('id="higherRateHistoryAccordion"'), html.indexOf('</details>', html.indexOf('id="higherRateHistoryAccordion"')));
  assert.doesNotMatch(historial, /sched-hint|alert-hint/);
  const info = html.slice(html.indexOf('id="higherRateInfoPanel"'), html.indexOf('class="hr-summary"'));
  assert.match(info, /Limpiar historial/);
  assert.match(js, /Sin ventanas próximas\./);
});

test('higher rate historial: dias como tarjeta, boton de limpiar chico y sin colores fijos', () => {
  assert.ok(bloque.length > 200, 'falta el bloque higher rate historial');
  assert.match(bloque, /details\.polished-disclosure\{[^}]*border-radius:12px/);
  assert.match(bloque, /#purgeHigherRateWindowsBtn\{[^}]*font-size:12px/);
  assert.doesNotMatch(bloque, /#[0-9a-fA-F]{3,8}\b/);
});
