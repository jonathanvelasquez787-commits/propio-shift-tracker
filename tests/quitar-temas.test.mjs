import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PALETTE_CHOICES, resolvePalette } from '../js/theme-palettes.js';

test('quitar temas: Cielo Azul, Lavanda Nocturna, Brisa Turquesa y Salvia Fresca ya no se ofrecen', () => {
  const names = PALETTE_CHOICES.map(item => item.name);
  for (const removed of ['Cielo Azul', 'Lavanda Nocturna', 'Brisa Turquesa', 'Salvia Fresca']) assert.ok(!names.includes(removed), removed);
  assert.equal(PALETTE_CHOICES.length, 8);
  const html = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');
  for (const removed of ['Cielo Azul', 'Lavanda Nocturna', 'Brisa Turquesa', 'Salvia Fresca']) assert.ok(!html.includes(removed), removed);
});

test('quitar temas: quien tenía guardado uno de los temas quitados pasa a Original', () => {
  for (const [id, mode] of [['royal', 'light'], ['lavender', 'dark'], ['ocean', 'light'], ['sage', 'light']]) {
    assert.equal(resolvePalette(id, mode).id, 'original', `${id}/${mode}`);
  }
});

test('quitar temas: los otros modos de esas paletas se conservan', () => {
  for (const [id, mode] of [['royal', 'dark'], ['lavender', 'light'], ['ocean', 'dark'], ['sage', 'dark']]) {
    assert.equal(resolvePalette(id, mode).id, id, `${id}/${mode}`);
  }
});
