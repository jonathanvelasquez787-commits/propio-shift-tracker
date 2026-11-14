import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const start = html.indexOf('<div class="app-page game-achievements-page"');
const end = html.indexOf('id="gameAchievementsSummary"', start);
const header = html.slice(start, end);

test('encabezado de Logros compacto: sin kicker, sin frase y con notas dentro del botón i', () => {
  assert.doesNotMatch(header, /game-page-kicker/);
  assert.doesNotMatch(header, /Tu racha, tu nivel y cada criatura/);
  const headerSinAjustes = header.slice(0, header.lastIndexOf('<details', header.indexOf('id="gameSettingsFold"')));
  assert.doesNotMatch(headerSinAjustes, /<details/);
  assert.doesNotMatch(headerSinAjustes, /<p class="note">/);
  assert.match(header, /<h1>Logros<\/h1>/);
  assert.match(header, /data-game-role="season-label"/);
  assert.match(header, /id="gameEnabledInput"/);
  assert.match(header, /aria-describedby="gameHeaderInfo"/);
  assert.match(header, /id="gameHeaderInfo" role="tooltip"/);
});
