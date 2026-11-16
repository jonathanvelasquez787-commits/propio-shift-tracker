import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const bloque = css.slice(css.indexOf('/* meta diaria una linea */'), css.indexOf('/* fin meta diaria una linea */'));

test('meta diaria una linea: la tarjeta ya no se pliega y conserva todos sus datos', () => {
  const i = html.indexOf('id="classicDailyGoalCard"');
  assert.ok(i > 0);
  assert.match(html.slice(html.lastIndexOf('<', i), i), /^<div /);
  const fin = html.indexOf('id="financePreviewBox"', i);
  const trozo = html.slice(i, fin);
  for (const id of ['goalDailyLabel', 'goalAmountBadge', 'goalAmountConvertedText', 'goalMinBadge', 'earningsBar', 'remainingText']) {
    assert.ok(trozo.includes(`id="${id}"`), `falta ${id}`);
  }
  assert.ok(!trozo.includes('<summary'));
});

test('meta diaria una linea: CSS en una fila con la barra debajo y sin colores fijos', () => {
  assert.ok(bloque.length > 50);
  assert.match(bloque, /flex-wrap:\s*wrap/);
  assert.match(bloque, /flex:\s*0 0 100%/);
  assert.doesNotMatch(bloque, /#[0-9a-fA-F]{3,8}\b/);
});

test('meta diaria una linea: en celular achica el texto para que quepa en una linea', () => {
  const bloque = css.slice(css.indexOf('/* meta diaria una linea */'), css.indexOf('/* fin meta diaria una linea */'));
  const m = bloque.match(/@media \(max-width: 760px\) \{([\s\S]*?)\n\}\n/);
  assert.ok(m, 'falta la regla para celular dentro del bloque');
  assert.match(m[1], /#classicDailyGoalCard \.gp-label \{ font-size: 8\.5px/);
  assert.match(m[1], /white-space: nowrap/);
  assert.doesNotMatch(bloque, /#[0-9a-fA-F]{3,8}\b/);
});
