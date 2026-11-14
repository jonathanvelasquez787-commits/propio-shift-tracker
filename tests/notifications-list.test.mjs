import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const modal = html.slice(html.indexOf('id="notificationsModal"'), html.indexOf('id="goalsModal"'));

test('Avisos: una sola lista unida, sin plegables ni tarjetas anidadas por grupo', () => {
  for (const id of ['notificationScheduleGroup', 'notificationCallsGroup', 'notificationProductivityGroup']) {
    assert.match(modal, new RegExp(`<section class="notif-group" id="${id}">`), `${id} es una sección plana`);
    assert.doesNotMatch(modal, new RegExp(`<details class="polished-setting" id="${id}"`), `${id} ya no es plegable`);
  }
  assert.equal((modal.match(/<section class="notif-group"/g) || []).length, 3);
  assert.equal((modal.match(/<\/section>/g) || []).length, 3, 'secciones bien cerradas');
  assert.equal((modal.match(/class="sched-compact-card notif-row"/g) || []).length, 6, 'seis avisos en fila');
  for (const t of ['Turno y descansos', 'Llamadas guardadas', 'Descanso por productividad']) {
    assert.match(modal, new RegExp(`<h4 class="notif-group-title">${t}</h4>`));
  }
});

test('Avisos: la lista unida no deja fondo ni borde propio en cada aviso', () => {
  assert.match(css, /#notificationsModal \.notif-group \.sched-compact-card\{[^}]*background:transparent[^}]*border:0/);
  assert.match(css, /\.notif-group\{[^}]*border-bottom:1px solid var\(--line\)/);
});

test('Avisos: se conservan los campos de cada aviso', () => {
  for (const id of ['shiftAlertMinInput', 'breakAlertMinInput', 'breakEndAlertMinInput', 'callEndedSoundEnabledInput',
    'callPastedSoundEnabledInput', 'callManualSoundEnabledInput', 'productiveBreakEarnMinInput', 'productiveBreakAwardMinInput',
    'masterVolumeInput', 'positiveSettingsAccordion', 'positiveInactivityMinutesInput']) {
    assert.equal(modal.split(`id="${id}"`).length, 2, `#${id} aparece una sola vez`);
  }
});
