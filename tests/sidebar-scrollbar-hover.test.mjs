import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const block = css.slice(css.indexOf('/* menu lateral barra al pasar el mouse */'), css.indexOf('/* fin menu lateral barra al pasar el mouse */'));

test('La barra del menu lateral esta oculta y aparece solo al pasar el mouse', () => {
  assert.match(block, /@media \(hover: hover\) and \(pointer: fine\)/);
  assert.match(block, /\.sidebar-nav \{ scrollbar-width: thin; scrollbar-color: transparent transparent; \}/);
  assert.match(block, /\.sidebar-nav:hover \{ scrollbar-color: color-mix\(in srgb, var\(--muted\)/);
  assert.doesNotMatch(block, /#[0-9a-fA-F]{3,8}\b/);
});
