import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const js = fs.readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');

test('pildora en curso: tocarla responde tambien sin tarjetas (Freelancer o sin horario)', () => {
  const start = js.indexOf('function advanceHeroBlockCard');
  const block = js.slice(start, js.indexOf('function wireHeroBlockCard'));
  const liveClick = block.indexOf('liveBtn.click()');
  const cardCount = block.indexOf("querySelectorAll('.hbc-slide').length");
  assert.ok(liveClick > 0 && cardCount > 0);
  // el toque sobre el boton en curso va antes de contar las tarjetas
  assert.ok(liveClick < cardCount);
});

test('pildora en curso: el toque se conecta antes de salir por "sin tarjetas"', () => {
  const start = js.indexOf('function renderBlockSummaryStrip');
  const block = js.slice(start, start + 900);
  const wire = block.indexOf('wireHeroBlockCard();');
  const empty = block.indexOf('!cards.length');
  assert.ok(wire > 0 && empty > 0);
  assert.ok(wire < empty);
});
