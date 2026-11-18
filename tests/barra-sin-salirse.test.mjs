import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const a = css.indexOf('/* barra sin salirse */');
const b = css.indexOf('/* fin barra sin salirse */');
const block = css.slice(a, b);

test('barra sin salirse: de 761 a 1179 px, sin actividad, los botones se achican de 108 a 50 px en vez de salirse de la barra', () => {
  assert.ok(a >= 0 && b > a, 'faltan los marcadores del bloque CSS');
  assert.match(block, /@media \(min-width: 761px\) and \(max-width: 1179px\)/);
  assert.match(block, /:not\(\[data-live-type\]\) \.action-slot:not\(\[data-slot="discard"\]\) \{ width: auto !important; min-width: 50px !important; flex: 0 1 108px !important; \}/);
  assert.match(block, /> \.action-btn \{ width: 100% !important; min-width: 0 !important; \}/);
  assert.doesNotMatch(block, /#[0-9a-fA-F]{3,8}\b/);
  assert.equal(block.split('{').length, block.split('}').length);
});
