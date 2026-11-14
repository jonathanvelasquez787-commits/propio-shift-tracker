import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/game.css', import.meta.url), 'utf8');
const game = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
const page = html.slice(html.indexOf('<div class="app-page game-achievements-page"'), html.indexOf('</div><!-- /pageAchievements -->'));
const pane = (name) => {
  const start = page.indexOf(`data-logros-pane="${name}"`);
  assert.ok(start > -1, `sección ${name} existe`);
  const next = page.indexOf('data-logros-pane="', start + 20);
  return page.slice(start, next === -1 ? page.length : next);
};

test('Logros en tres secciones: Hoy, Colección e Historial con botones y solo una visible', () => {
  for (const name of ['hoy', 'coleccion', 'historial']) assert.match(page, new RegExp(`data-logros-tab="${name}"`));
  assert.ok(page.indexOf('id="gameAchievementsSummary"') < page.indexOf('data-logros-tab="hoy"'), 'el resumen de nivel y racha queda arriba, siempre visible');
  const hoy = pane('hoy'), coleccion = pane('coleccion'), historial = pane('historial');
  for (const id of ['gameMissions', 'gameMilestones', 'gameCycleBossAchievements']) assert.ok(hoy.includes(`id="${id}"`), `#${id} en Hoy`);
  for (const id of ['gameEquipmentPanel', 'gameBestiary', 'gameTrophies']) assert.ok(coleccion.includes(`id="${id}"`), `#${id} en Colección`);
  for (const id of ['gameLastStageClear', 'gameRecords', 'positiveHistoryPanel']) assert.ok(historial.includes(`id="${id}"`), `#${id} en Historial`);
  assert.match(page, /data-logros-pane="coleccion"[^>]*hidden/);
  assert.match(page, /data-logros-pane="historial"[^>]*hidden/);
  assert.doesNotMatch(page.slice(page.indexOf('data-logros-pane="hoy"') - 120, page.indexOf('data-logros-pane="hoy"') + 120), /data-logros-pane="hoy"[^>]*hidden/);
  assert.match(css, /\.game-logros-pane\[hidden\] \{ display:none; \}/);
  assert.match(game, /querySelectorAll\('\[data-logros-tab\]'\)/);
  assert.match(game, /pane\.hidden = pane\.dataset\.logrosPane !== name/);
});
