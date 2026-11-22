import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = name => fs.readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

test('al pasar el mouse por la capsula en curso ninguna pieza sube sola', () => {
  const css = read('css/app-shell.css');
  const block = css.slice(css.indexOf('/* capsula sin subir */'), css.indexOf('/* fin capsula sin subir */'));
  assert.ok(block.length > 30);
  assert.match(block, /data-slot="call"/);
  assert.match(block, /data-slot="discard"/);
  assert.match(block, /> \.hbc:not/);
  assert.match(block, /transform: none !important/);
  assert.equal((block.match(/\{/g) || []).length, (block.match(/\}/g) || []).length);
  assert.doesNotMatch(block, /#[0-9a-fA-F]{3,8}\b/);
});
