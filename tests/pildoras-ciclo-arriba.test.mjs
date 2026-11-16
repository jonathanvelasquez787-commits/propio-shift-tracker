import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const boot = readFileSync(new URL('../js/boot.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');

test('pildoras ciclo arriba: las pildoras van antes de la tarjeta Meta del ciclo', () => {
  const tags = html.indexOf('id="cycleTagsRow"');
  const week = html.indexOf('id="cycleWeek1ProductiveTag"');
  const total = html.indexOf('id="cycleTotalProductiveTag"');
  const goal = html.indexOf('id="cycleGoalCard"');
  assert.ok(tags > 0 && week > tags && total > week && goal > total);
  assert.match(html.slice(tags, goal), /gh-info-pill[\s\S]*gh-info-pill/);
});

test('pildoras ciclo arriba: la Proyeccion se inserta despues de la tarjeta de meta', () => {
  const goal = html.indexOf('id="cycleGoalCard"');
  const box = html.indexOf('id="cycleProjectionBox"');
  assert.ok(goal > 0 && box > goal);
  assert.ok(boot.includes('function injectCycleProjection()'));
});

test('pildoras ciclo arriba: el CSS junta las pildoras en una fila sin colores fijos', () => {
  const a = css.indexOf('/* pildoras ciclo arriba */');
  const b = css.indexOf('/* fin pildoras ciclo arriba */');
  assert.ok(a >= 0 && b > a);
  const block = css.slice(a, b);
  assert.match(block, /#cycleTagsRow \{ display: flex; flex-wrap: wrap;/);
  assert.match(block, /display: contents/);
  assert.doesNotMatch(block, /#[0-9a-fA-F]{3,8}\b/);
});
