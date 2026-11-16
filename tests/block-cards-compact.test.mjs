import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const main = fs.readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');
const shell = fs.readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const start = main.indexOf('const progressLabel = slot.type');
const end = main.indexOf("wrap.innerHTML = slotRows.join('');");
const card = main.slice(start, end);
const css = shell.slice(shell.indexOf('/* tarjetas de bloques del dia */'), shell.indexOf('/* fin tarjetas de bloques del dia */'));

test('la tarjeta del bloque junta Productividad, Meta y ACW en una sola fila', () => {
  assert.ok(start > 0 && end > start);
  assert.match(card, /class="sblk-tiles"/);
  assert.match(card, /<small>Productividad<\/small>/);
  assert.match(card, /translateText\('Meta'\)/);
  assert.match(card, /<small>ACW<\/small>/);
  assert.match(card, /formatDuration\(blockAcwMin \* 60000\)/);
});

test('la barra Usado conserva tiempo, total y porcentaje, sin la línea repetida', () => {
  assert.match(card, /<span>Usado<\/span><span><strong>\$\{formatDuration\(stats\.filledMin \* 60000\)\} \/ \$\{formatDuration\(stats\.durationMin \* 60000\)\}<\/strong> · \$\{Math\.round\(stats\.pct\)\}%<\/span>/);
  assert.doesNotMatch(card, /usedProgressLabel|acwProgressLabel/);
  assert.doesNotMatch(card, /\} de \$\{formatDuration/);
});

test('siguen apareciendo Actividad real, Pausa real, el estado y la adherencia del bloque', () => {
  assert.match(card, /Actividad real: /);
  assert.match(card, /Pausa real: /);
  assert.match(card, /\$\{progressLineHtml\}\$\{statusDetailLine\}/);
  assert.match(card, /\$\{adherenceBarHtml\}/);
  assert.match(card, /sblk-tile\$\{g\.met \? ' is-met' : ''\}/);
  assert.match(card, /\$\{goalIconHtml\}/);
});

test('los estilos nuevos usan variables del tema, ocultan los textos al contraer y no usan hexadecimales', () => {
  assert.ok(css.length > 100);
  assert.match(css, /\.sblk-card\.is-collapsed \.sblk-subs \{ display: none; \}/);
  assert.match(css, /\.sblk-tiles \{ display: grid; grid-template-columns: repeat\(3/);
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b/);
});
