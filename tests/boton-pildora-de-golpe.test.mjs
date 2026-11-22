import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = name => fs.readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

test('boton y pildora de golpe: sin transiciones propias en el relleno, el texto ni el borde', () => {
  const css = read('css/app-shell.css');
  const block = css.slice(css.indexOf('/* boton pildora de golpe */'), css.indexOf('/* fin boton pildora de golpe */'));
  assert.ok(block.length > 100);
  assert.match(block, /#breakControlBtn,#lunchControlBtn,#callControlBtn/);
  assert.match(block, /:is\(\.action-ripple,\.action-label,\.action-sub,\.action-icon\) \{ transition: none; \}/);
  // el borde del boton no se anima (antes tardaba 180 ms y dejaba una costura junto a la pildora)
  const btnRule = block.split('\n').find(l => l.includes('transition: transform'));
  assert.ok(btnRule && !/border-color/.test(btnRule));
  assert.equal((block.match(/\{/g) || []).length, (block.match(/\}/g) || []).length);
  assert.doesNotMatch(block, /#[0-9a-fA-F]{3,8}\b/);
});

test('boton y pildora de golpe: tocar Break, Lunch o Llamada no corre un pulso solo en el boton', () => {
  const js = read('js/app-main.js');
  const start = js.indexOf('function wireActionButtonPress');
  const block = js.slice(start, start + 1800);
  assert.match(block, /btn\.matches\('#breakControlBtn, #lunchControlBtn, #callControlBtn'\)\) return;/);
});
