import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/game.css', import.meta.url), 'utf8');
const start = html.indexOf('<div class="game-missions-column">');
const end = html.indexOf('</div><!-- /pageAchievements -->', start);
const block = html.slice(start, end);

test('Logros: Misiones e Hitos comparten fila y Última victoria con Récords van como tira, sin etiquetas pequeñas', () => {
  const column = block.slice(0, block.indexOf('<section class="game-panel game-cycle-panel"'));
  assert.match(column, /id="gameMissions"/);
  assert.match(column, /id="gameMilestones"/);
  assert.match(css, /\.game-missions-column \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.game-achievements-page \.game-achievements-grid-bottom \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.ok(block.indexOf('id="gameLastStageClear"') < block.indexOf('id="gameRecords"'));
  assert.doesNotMatch(block, /game-panel-eyebrow/);
  assert.doesNotMatch(block, /ARMADURA/);
  assert.match(block, /Sin STAGE CLEAR aún\./);
  assert.doesNotMatch(block, /Aún no hay un STAGE CLEAR guardado|Llamada más larga/);
});
