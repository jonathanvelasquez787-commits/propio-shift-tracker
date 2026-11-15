import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const main = fs.readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const footer = html.slice(html.indexOf('class="modal-actions mc-action-row sched-footer"'), html.indexOf('<!-- /scheduleConfigAccordion -->'));

test('Horario C: el pie tiene Guardar día y un menú Copiar a otros días con Lunes a Viernes y Sábado y Domingo', () => {
  assert.ok(footer.includes('id="saveShiftWindowBtn"'));
  assert.match(footer, /id="schedCopyMenuBtn"[^>]*aria-haspopup="true"[^>]*aria-expanded="false"/);
  const menu = footer.slice(footer.indexOf('id="schedCopyMenu"'));
  assert.match(menu, /id="schedCopyMenu" role="menu" hidden/);
  assert.ok(menu.indexOf('id="copyDayToAllBtn"') > 0 && menu.indexOf('id="copyWeekendBtn"') > menu.indexOf('id="copyDayToAllBtn"'));
  assert.ok(!footer.includes('Lunes-Viernes') && !footer.includes('Sábado-Domingo'));
});

test('Horario C: el menú se abre con el botón y se cierra al elegir, al tocar afuera y con Escape', () => {
  assert.match(main, /schedCopyMenuBtn[\s\S]{0,400}setCopyMenu\(copyMenu\.hidden\)/);
  assert.match(main, /copyMenu\.addEventListener\('click', \(\) => setCopyMenu\(false\)\)/);
  assert.match(main, /event\.key === 'Escape' && !copyMenu\.hidden/);
  assert.match(main, /closest\('#schedCopyWrap'\)/);
});

test('Horario C: estilos en su bloque, Guardar día ocupa el espacio y en celular el botón de copiar queda solo con íconos', () => {
  const block = css.slice(css.indexOf('/* horario rediseño C */'), css.indexOf('/* fin horario rediseño C */'));
  assert.ok(block.length > 100);
  assert.match(block, /#saveShiftWindowBtn \{ flex: 1 1 0;/);
  assert.match(block, /\.sched-copy-label \{ display: none; \}/);
  assert.match(block, /\.sched-copy-menu\[hidden\] \{ display: none; \}/);
});
