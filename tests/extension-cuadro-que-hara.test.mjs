import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('cuadro «Qué hará la extensión ahora»: usa el mismo motor y los mismos ids que la ventanita vieja', () => {
  const src = read('js/extension-box.js');
  assert.ok(src.includes("import { installAutomationStatusUi } from './automation-ui.js'"));
  assert.ok(src.includes('automationUi.update('));
  const popup = read('extension/propio-bridge/popup.html');
  for (const id of ['automationPanel', 'automationTitle', 'automationCountdown', 'automationDetail', 'automationAcwProgress', 'automationAcwProgressBar', 'automationAcwProgressLabel', 'automationTrackerCheck', 'automationPortalCheck', 'automationConnectionCheck', 'automationWorkCheck', 'automationScheduleCheck', 'automationHoursCheck', 'automationFirstCheck', 'automationReturnsCheck', 'automationPauseCheck', 'automationOptionsCheck']) {
    assert.ok(popup.includes(`id="${id}"`), `popup: ${id}`);
    assert.ok(src.includes(`'${id}'`), `cuadro: ${id}`);
  }
  assert.ok(src.includes('Qué hará la extensión ahora') && src.includes('Sobre estos horarios'));
});

test('cuadro «Qué hará la extensión ahora»: empieza abierta y recuerda si la cierran', () => {
  const src = read('js/extension-box.js');
  assert.ok(src.includes('doingBody.hidden = false'));
  assert.ok(src.includes('extBoxDoingOpen'));
});
