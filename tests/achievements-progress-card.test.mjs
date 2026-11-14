import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const start = html.indexOf('id="gameAchievementsSummary"');
const end = html.indexOf('</section>', start);
const block = html.slice(start, end);

test('progreso de Logros: Nivel, XP, racha y escudos viven en una sola tarjeta sin escalera ni etiquetas', () => {
  assert.equal((block.match(/<article\b/g) || []).length, 1);
  assert.ok(block.indexOf('id="gameLevelPanel"') > -1);
  assert.ok(block.indexOf('id="gameStreakPanel"') > block.indexOf('id="gameLevelPanel"'));
  assert.match(block, /data-game-role="level-progress"/);
  assert.match(block, /data-game-role="streak-week"/);
  assert.match(block, /data-game-stat="shields"/);
  assert.doesNotMatch(block, /level-ladder/);
  assert.doesNotMatch(block, /game-panel-eyebrow/);
});
