import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const a = css.indexOf('/* finanzas sin desborde */');
const b = css.indexOf('/* fin finanzas sin desborde */');
const block = css.slice(a, b);

test('finanzas sin desborde: la pagina de Finanzas recorta lo que se sale por el lado para que no se ensanche', () => {
  assert.ok(a >= 0 && b > a, 'faltan los marcadores del bloque CSS');
  assert.match(block, /#pageFinance \{ overflow-x: clip; \}/);
  assert.doesNotMatch(block, /#[0-9a-fA-F]{3,8}\b/);
  assert.equal(css.split('{').length - css.split('}').length, 0);
});
