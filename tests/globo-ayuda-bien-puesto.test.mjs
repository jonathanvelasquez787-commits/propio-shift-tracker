import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const js = readFileSync(new URL('../js/presentation-accessibility.js', import.meta.url), 'utf8');

test('globo de ayuda: despues de colocarse se corrige si una tarjeta con desenfoque lo desvio de la pantalla', () => {
  assert.match(js, /const wantLeft = parseFloat\(tooltip\.style\.left\)/);
  assert.match(js, /const dx = wantLeft - placed\.left, dy = wantTop - placed\.top;/);
  assert.match(js, /tooltip\.style\.left = `\$\{wantLeft \+ dx\}px`;/);
  assert.match(js, /tooltip\.style\.top = `\$\{wantTop \+ dy\}px`;/);
});
