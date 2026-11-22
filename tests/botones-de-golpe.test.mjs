import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = name => fs.readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

test('botones de golpe: todos los botones de la barra cambian sin animar borde, relleno, texto ni icono', () => {
  const css = read('css/app-shell.css');
  const block = css.slice(css.indexOf('/* botones de golpe */'), css.indexOf('/* fin botones de golpe */'));
  assert.ok(block.length > 100);
  assert.match(block, /\.hero-shift-actions \.action-slot > \.action-btn \{ transition: transform \.14s ease, opacity \.14s ease; \}/);
  assert.match(block, /:is\(\.action-ripple,\.action-label,\.action-sub,\.action-icon\) \{ transition: none; \}/);
  assert.doesNotMatch(block, /border-color/);
  assert.equal((block.match(/\{/g) || []).length, (block.match(/\}/g) || []).length);
  assert.doesNotMatch(block, /#[0-9a-fA-F]{3,8}\b/);
});

test('botones de golpe: con mouse el pulso al tocar no retrae el relleno que ya dio el hover', () => {
  const js = read('js/app-main.js');
  const start = js.indexOf('function wireActionButtonPress');
  const block = js.slice(start, start + 2200);
  assert.match(block, /matchMedia\('\(hover: hover\) and \(pointer: fine\)'\)\.matches\) return;/);
  assert.match(block, /typeof window\.matchMedia === 'function'/);
});
