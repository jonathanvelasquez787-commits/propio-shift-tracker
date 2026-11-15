import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('Avisos: los minutos de "antes" muestran "min" a la derecha y la etiqueta queda solo para lectores de pantalla', () => {
  for (const id of ['shiftAlertMinInput', 'breakAlertMinInput', 'breakEndAlertMinInput']) {
    const at = html.indexOf(`id="${id}"`);
    assert.ok(at > 0, id);
    const labelAt = html.lastIndexOf('<label', at);
    const label = html.slice(labelAt, html.indexOf('</label>', labelAt) + 8);
    assert.ok(label.includes(`for="${id}"`) && label.includes('class="sr-only"') && label.includes('Min antes'), `${id}: etiqueta oculta pero presente`);
    const after = html.slice(at, html.indexOf('</div>', at));
    assert.match(after, /<span class="notif-unit" aria-hidden="true">min<\/span>/, `${id}: unidad a la derecha`);
  }
});

test('Avisos: el campo de minutos se ajusta a su contenido para que "min" no se salga de la ventana', () => {
  assert.match(css, /#notificationsModal \.notif-group \.notif-row \.sched-compact-row \.sched-compact-field\.narrow\{flex:0 0 auto\}/);
  assert.match(css, /#notificationsModal \.notif-group \.notif-row \.notif-unit\{/);
});
