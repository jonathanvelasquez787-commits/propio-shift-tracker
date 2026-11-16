import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');

test('tarjetas plegables: Pendientes de reservar es details con id y summary', () => {
  for (const id of ['financePreviewBox']) {
    const i = html.indexOf(`id="${id}"`);
    assert.ok(i > 0, `falta ${id}`);
    const tag = html.slice(html.lastIndexOf('<', i), i);
    assert.match(tag, /^<details /, `${id} debe ser <details> para guardar su estado`);
    const fin = html.indexOf('</details>', i);
    assert.ok(html.slice(i, fin).includes('<summary'), `${id} necesita summary`);
  }
  assert.ok(html.includes('id="financePreviewRows"') && html.includes('id="goalAmountBadge"'));
});

test('tarjetas plegables: CSS propio con variables del tema', () => {
  const bloque = css.slice(css.indexOf('/* tarjetas plegables inicio */'), css.indexOf('/* fin tarjetas plegables inicio */'));
  assert.ok(bloque.length > 50);
  assert.match(bloque, /gh-fold-chevron/);
  assert.doesNotMatch(bloque, /#[0-9a-fA-F]{3,8}\b/);
});
