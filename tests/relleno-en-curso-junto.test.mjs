import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = name => fs.readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

test('el boton en curso se llena de color al mismo tiempo que la pildora', () => {
  const css = read('css/app-shell.css');
  const block = css.slice(css.indexOf('/* relleno en curso */'), css.indexOf('/* fin relleno en curso */'));
  assert.ok(block.length > 30);
  assert.match(block, /\.action-btn\.is-active \.action-ripple \{ transition: none; \}/);
  assert.match(block, /\.action-label/);
  assert.equal((block.match(/\{/g) || []).length, (block.match(/\}/g) || []).length);
  assert.doesNotMatch(block, /#[0-9a-fA-F]{3,8}\b/);
});
