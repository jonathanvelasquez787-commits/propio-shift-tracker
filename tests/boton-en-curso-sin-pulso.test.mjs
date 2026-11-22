import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const js = fs.readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');

test('al quedar en curso, el boton cancela el pulso que lo retraia a oscuro', () => {
  assert.match(js, /function keepActiveButtonFilled\(btn\)/);
  const fn = js.slice(js.indexOf('function keepActiveButtonFilled'), js.indexOf('function wireActionButtonPress'));
  assert.match(fn, /classList\.contains\('is-active'\)/);
  assert.match(fn, /\.action-ripple, \.action-label, \.action-sub/);
  assert.match(fn, /a\.cancel\(\)/);
  const wire = js.slice(js.indexOf('function wireActiveButtonKeepFilled'), js.indexOf('function wireActionButtonPress'));
  assert.match(wire, /addEventListener\('click'[\s\S]*keepActiveButtonFilled\(btn\)/);
});
