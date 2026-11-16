import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const main = fs.readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');

test('el menú lateral tiene la fila Modo freelancer justo debajo de Bloques y llamadas', () => {
  const blocks = html.indexOf('data-essential-option="schedule"');
  const row = html.indexOf('id="sidebarFreelancerRow"');
  const appearance = html.indexOf('id="sidebarAppearanceBtn"');
  assert.ok(blocks > 0 && row > blocks && row < appearance, 'va entre Bloques y llamadas y Temas y colores');
  const rowHtml = html.slice(row, html.indexOf('</label>', row));
  assert.ok(rowHtml.includes('id="sidebarFreelancerInput"') && rowHtml.includes('id="sidebarFreelancerConfigBtn"'));
  assert.ok(rowHtml.includes('Modo freelancer') && rowHtml.includes('Configurar'));
  assert.match(rowHtml, /id="sidebarFreelancerConfigBtn" type="button" hidden/, 'Configurar empieza oculto');
});

test('el interruptor ya no está debajo de los bloques del día y vuelve a Más opciones', () => {
  assert.ok(!html.includes('sched-freelancer-row') && !html.includes('sched-freelancer-switch'));
  assert.ok(!html.includes('Se activa debajo de los bloques del día.'));
  const more = html.slice(html.indexOf('id="schedMoreCard"'), html.indexOf('<!-- /schedMoreCard -->'));
  assert.ok(more.includes('id="freelancerEnabledInput"') && more.includes('Activar modo freelancer'));
  assert.equal(html.split('id="freelancerEnabledInput"').length - 1, 1, 'el id existe una sola vez');
});

test('el interruptor del menú se sincroniza con los ajustes y Configurar lleva a Más opciones > Modo freelancer', () => {
  assert.match(main, /const sideEnabled = document\.getElementById\('sidebarFreelancerInput'\);\s+if \(sideEnabled\) sideEnabled\.checked = fl\.enabled === true;/);
  assert.match(main, /sideConfig\.hidden = fl\.enabled !== true/);
  assert.match(main, /freelancerEnabledInput'\)\.checked = sideSwitch\.checked; updateFreelancerSettings\(\);/);
  assert.match(main, /sideConfig\.addEventListener\('click', openFreelancerConfig\)/);
  const click = main.slice(main.indexOf('const openFreelancerConfig = () =>'), main.indexOf('const openFreelancerConfig = () =>') + 700);
  assert.match(click, /navigateToPage\('schedule'\)/);
  assert.match(click, /schedMoreToggle/);
  assert.match(click, /data-more-toggle="freelancer"/);
});

test('la fila del menú tiene su bloque de estilos con variables del tema', () => {
  const a = css.indexOf('/* menu lateral modo freelancer */'), b = css.indexOf('/* fin menu lateral modo freelancer */');
  assert.ok(a > 0 && b > a);
  assert.doesNotMatch(css.slice(a, b), /#[0-9a-fA-F]{3,8}\b/);
  assert.ok(!css.includes('/* horario freelancer interruptor */'));
});
