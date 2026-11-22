import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = name => fs.readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

test('el boton en curso y su pildora tienen el mismo color de borde', () => {
  const css = read('css/app-shell.css');
  const block = css.slice(css.indexOf('/* union boton pildora */'), css.indexOf('/* fin union boton pildora */'));
  assert.ok(block.length > 30);
  assert.match(block, /#callControlBtn\)\.is-active \{ border-color: var\(--hbc-live-fill\); \}/);
  assert.equal((block.match(/\{/g) || []).length, (block.match(/\}/g) || []).length);
  assert.doesNotMatch(block, /#[0-9a-fA-F]{3,8}\b/);
});
