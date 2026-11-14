import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/appearance.css', import.meta.url), 'utf8');

test('selector de temas: tarjetas compactas, modo en la línea del nombre y descripción solo para lectores de pantalla', () => {
  assert.match(css, /\.appearance-palette-colors \{ display:flex; height:26px; \}/);
  assert.match(css, /\.appearance-palette-text \{ display:flex; align-items:baseline; justify-content:space-between;/);
  const small = css.match(/\.appearance-palette-text small \{[^}]*\}/)[0];
  assert.match(small, /clip:rect\(0 0 0 0\)/);
  assert.doesNotMatch(small, /min-height/);
});
