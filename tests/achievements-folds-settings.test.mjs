import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const page = html.slice(html.indexOf('<div class="app-page game-achievements-page"'), html.indexOf('</div><!-- /pageAchievements -->'));
const foldOf = (id) => {
  const start = page.indexOf(`id="${id}"`);
  assert.ok(start > -1, `#${id} existe`);
  const open = page.lastIndexOf('<details', start);
  return page.slice(open, page.indexOf('</details>', start));
};

test('Logros: Equipo, Bestiario, Trofeos e Historial son filas plegadas con conteo y sin tarjetas vacías', () => {
  for (const [id, count] of [['gameEquipmentPanel', 'data-game-role="equipment-count"'], ['gameBestiary', 'data-game-role="bestiary-count"'], ['gameTrophies', 'data-game-role="trophy-count"'], ['positiveHistoryPanel', 'id="positiveHistoryCount"']]) {
    const fold = foldOf(id);
    assert.match(fold, /^<details[^>]*game-fold/);
    const summary = fold.slice(fold.indexOf('<summary'), fold.indexOf('</summary>'));
    assert.ok(summary.includes(count), `${id}: el conteo está en el resumen`);
    assert.doesNotMatch(summary, /<details/);
  }
  assert.doesNotMatch(page, /gameEquipmentFilter|Próximo accesorio|equipment-empty|Derrota tu primer monstruo|game-panel-intro/);
  assert.match(page, /data-game-role="equipment-list"/);
  assert.match(page, /data-game-role="bestiary-list"/);
  assert.match(page, /data-game-role="trophy-list"/);
  assert.match(page, /id="positiveHistoryToggle"/);
});

test('Logros: los ajustes van plegados justo debajo de Activar Logros', () => {
  const settings = page.slice(page.lastIndexOf('<details', page.indexOf('id="gameSettingsFold"')));
  for (const id of ['gameSettingsAccordion', 'gameSoundSettingRow', 'gameWeaponsSettingRow', 'gameResetAccordion', 'monsterNameInput', 'gameSoundVolumeInput', 'resetGameProgressBtn']) {
    assert.ok(settings.includes(`id="${id}"`), `#${id} dentro de Ajustes`);
  }
  assert.ok(page.indexOf('id="gameSettingsFold"') > page.indexOf('id="gameEnabledInput"'));
  assert.ok(page.indexOf('id="gameSettingsFold"') < page.indexOf('id="gameLevelPanel"'));
  assert.doesNotMatch(page, /gameSettingsGearBtn/);
  assert.doesNotMatch(readFileSync(new URL('../js/game.js', import.meta.url), 'utf8'), /gameSettingsGearBtn/);
});
