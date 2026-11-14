import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const page = html.slice(html.indexOf('<div class="app-page game-achievements-page"'), html.indexOf('</div><!-- /pageAchievements -->'));
const pane = (name) => {
  const start = page.indexOf(`data-logros-pane="${name}"`);
  const next = page.indexOf('data-logros-pane="', start + 20);
  return page.slice(start, next === -1 ? page.length : next);
};

test('Ajustes de Logros: cuatro filas cortas y "Mis premios" en Colección', () => {
  const settings = page.slice(page.indexOf('id="gameSettingsFold"'), page.indexOf('id="gameLevelPanel"'));
  for (const id of ['gameSettingsAccordion', 'gameSoundSettingRow', 'gameWeaponsSettingRow', 'gameResetAccordion']) {
    assert.ok(settings.includes(`id="${id}"`), `#${id} es una fila de Ajustes`);
  }
  assert.ok(settings.indexOf('gameResetAccordion') > settings.indexOf('gameWeaponsSettingRow'), 'Reiniciar progreso va al final');
  for (const id of ['monsterNameInput', 'gameSoundVolumeInput', 'resetGameProgressBtn']) assert.ok(settings.includes(`id="${id}"`), `#${id} sigue en Ajustes`);
  assert.doesNotMatch(settings, /positiveRewardsAccordion|physicalRewardSelected|physicalRewardCatalog/, 'los premios ya no están en Ajustes');
  const coleccion = pane('coleccion');
  for (const id of ['positiveRewardsAccordion', 'physicalRewardSelected', 'physicalRewardCatalog', 'physicalRewardPresetSelect']) {
    assert.ok(coleccion.includes(`id="${id}"`), `#${id} en Colección`);
  }
  assert.match(settings, /id="gameSoundHelp" role="tooltip"/, 'el texto largo del volumen queda detrás de una "i"');
});
