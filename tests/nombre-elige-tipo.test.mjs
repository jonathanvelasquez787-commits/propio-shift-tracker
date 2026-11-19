import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const js = readFileSync(new URL('../js/schedule.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const main = readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');

test('el nombre del bloque es un selector con Trabajo, Break y Lunch', () => {
  assert.match(js, /<select class="block-type-input sched-bk-name-select"/);
  for (const v of ['work', 'break', 'lunch']) assert.match(js, new RegExp(`<option value="${v}"`));
  assert.doesNotMatch(js, /<input type="hidden" class="block-type-input"/);
});

test('al cambiar el nombre se cambia el tipo de bloque', () => {
  assert.match(main, /row\.setAttribute\('data-block-type', typeInput\.value\)/);
  assert.match(main, /closest\('\.block-type-input'\)/);
});

test('el selector del nombre tiene estilos y llaves balanceadas', () => {
  const m = css.match(/\/\* nombre elige tipo \*\/([\s\S]*)\/\* fin nombre elige tipo \*\//);
  assert.ok(m);
  assert.equal((m[1].match(/\{/g) || []).length, (m[1].match(/\}/g) || []).length);
  assert.doesNotMatch(m[1], /#[0-9a-fA-F]{3,8}\b/);
});
