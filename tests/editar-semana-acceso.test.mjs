import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const main = readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');

test('editar semana: hay un acceso discreto en Inicio (bajo el subtítulo) y otro en el menú', () => {
  assert.equal((html.match(/data-open-week-edit/g) || []).length, 2);
  assert.match(html, /<p id="scheduleSubtitle">[^<]*<\/p>\s*<div class="sched-quick-row"><button type="button" class="week-edit-link" data-open-week-edit>Corregir días/);
  assert.match(html, /data-open-schedule-edit>Cambiar horario/);
  assert.match(html, /id="homeFreelancerInput" type="checkbox"/);
  assert.match(main, /homeFreelancerInput/);
  assert.match(html, /<span class="home-fl-row"><button type="button" class="week-edit-link" data-open-freelancer-config>Freelancer /);
  assert.match(main, /data-open-freelancer-config\]'\)\?\.addEventListener\('click'[^\n]*openFreelancerConfig\(\)/);
  const menu = html.slice(html.indexOf('id="sidebarProgressCard"'), html.indexOf('class="sidebar-footer"'));
  assert.match(menu, /class="week-edit-link sidebar-week-edit" data-open-week-edit/);
});

test('editar semana: al tocarlo abre Reportes > Semana con el resumen abierto sin cerrar la tarjeta', () => {
  const a = main.indexOf("closest('[data-open-week-edit]')");
  assert.ok(a > 0);
  const b = main.slice(a, a + 700);
  assert.match(b, /e\.preventDefault\(\)/);
  assert.match(b, /navigateToPage\('reports'\)/);
  assert.match(b, /setReportsTab\('semana'\)/);
  assert.match(b, /weekSummaryAccordion/);
  assert.match(b, /acc\.open = true/);
});

test('editar semana: estilo discreto con variables del tema', () => {
  const b = css.slice(css.indexOf('/* editar semana acceso */'), css.indexOf('/* fin editar semana acceso */'));
  assert.ok(b.length > 200);
  assert.match(b, /\.week-edit-link \{ background: none; border: 0;/);
  assert.match(b, /color: var\(--cyan\)/);
  assert.doesNotMatch(b, /#[0-9a-fA-F]{3,8}\b/);
});

test('editar semana: la fila Corregir días / Cambiar horario / Freelancer no se parte en dos líneas', () => {
  assert.match(css, /#scheduleAccordion \.sched-quick-row \{ display: flex; flex-wrap: nowrap;/, 'la fila no salta de línea');
  assert.doesNotMatch(css, /#scheduleAccordion \.sched-quick-row \{[^}]*flex-wrap: wrap/, 'ya no queda flex-wrap: wrap');
  assert.match(css, /@media \(max-width: 340px\) \{\s*#scheduleAccordion \.sched-quick-row/, 'pantallas muy chicas la compactan');
});
