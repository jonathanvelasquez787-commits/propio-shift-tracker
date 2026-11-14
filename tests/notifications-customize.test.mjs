import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const modal = html.slice(html.indexOf('id="notificationsModal"'), html.indexOf('id="goalsModal"'));
const customize = [...modal.matchAll(/<details class="alert-customize">([\s\S]*?)<\/details>/g)].map((m) => m[1]);

test('Avisos: mensaje y sonido de cada aviso van dentro de "Personalizar" plegado', () => {
  assert.equal(customize.length, 7, 'un "Personalizar" por aviso (3 de turno, 3 de llamadas, 1 de productividad)');
  assert.doesNotMatch(modal, /<details class="alert-customize" open/);
  const inside = (id) => customize.some((c) => c.includes(`id="${id}"`));
  for (const id of [
    'shiftAlarmSoundInput', 'shiftAlarmSoundFile', 'breakStartAlarmSoundInput', 'breakEndAlarmSoundInput',
    'callEndedAlarmSoundInput', 'callPastedAlarmSoundInput', 'callManualAlarmSoundInput',
    'productiveBreakSoundInput', 'productiveBreakSoundFile', 'shiftAlarmMessagePreview', 'productiveBreakMessageFirstPreview',
  ]) assert.ok(inside(id), `#${id} dentro de Personalizar`);
  // Los campos principales siguen a la vista, fuera de Personalizar
  for (const id of ['shiftAlertMinInput', 'breakAlertMinInput', 'breakEndAlertMinInput', 'callEndedSoundEnabledInput',
    'callPastedSoundEnabledInput', 'callManualSoundEnabledInput', 'productiveBreakEarnMinInput', 'productiveBreakAwardMinInput', 'masterVolumeInput']) {
    assert.ok(modal.includes(`id="${id}"`), `#${id} existe`);
    assert.ok(!inside(id), `#${id} queda visible, fuera de Personalizar`);
  }
  assert.match(css, /\.alert-customize>summary/);
});
