import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const main = readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');
const settings = readFileSync(new URL('../js/settings.js', import.meta.url), 'utf8');
const review = readFileSync(new URL('../js/notification-review.js', import.meta.url), 'utf8');
const panel = html.slice(html.indexOf('id="setPanelAvisos"'), html.indexOf('/setPanelAvisos'));

test('Avisos en Ajustes: es la tercera pestaña, entre Dinero y Datos', () => {
  const tabs = [...html.matchAll(/data-set-tab="(\w+)"/g)].map((m) => m[1]);
  assert.deepEqual(tabs, ['general', 'dinero', 'avisos', 'datos']);
  assert.match(html, /id="setPanelAvisos" data-set-panel="avisos" role="tabpanel"/);
  assert.match(settings, /SETTINGS_TABS = \['general', 'dinero', 'avisos', 'datos'\]/);
});

test('Avisos en Ajustes: el contenido se movió con los mismos ids y ya no existe el pop up ni la campana', () => {
  assert.ok(panel.length > 1000);
  for (const id of ['notificationReview', 'masterVolumeInput', 'shiftAlertMinInput', 'positiveSettingsAccordion', 'positiveInactivityEnabledInput', 'notificationFilesReview']) {
    assert.ok(panel.includes(`id="${id}"`), id);
  }
  assert.doesNotMatch(html, /id="notificationsModal"/);
  assert.doesNotMatch(html, /id="avisosHeaderBtn"/);
  assert.doesNotMatch(main, /notificationsModal|avisosHeaderBtn/);
  assert.doesNotMatch(review, /notificationsModal/);
  assert.doesNotMatch(css, /#notificationsModal/);
});

test('Avisos en Ajustes: al abrir la pestaña se carga el resumen', () => {
  assert.match(settings, /app:settings-tab/);
  assert.match(main, /addEventListener\('app:settings-tab'[\s\S]*syncNotificationsModalFields\(\)[\s\S]*openNotificationReview\(\)/);
});
