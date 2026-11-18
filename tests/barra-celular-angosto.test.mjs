import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const bloque = css.split('/* barra en celular angosto */')[1]?.split('/* fin barra en celular angosto */')[0] || '';

test('la barra de acciones se achica a 320 px para no salirse', () => {
  assert.ok(bloque.length > 0, 'falta el bloque barra en celular angosto');
  assert.match(bloque, /@media \(max-width: 340px\)/);
  assert.match(bloque, /\.action-slot \{[^}]*flex: 0 1 40px !important/);
  assert.match(bloque, /min-width: 34px !important/);
});

test('la regla de celular angosto tambien vale con Break, Lunch o Llamada en curso', () => {
  assert.ok(!bloque.includes('data-live-type'), 'no debe excluir las actividades en curso');
});

test('el CSS de la barra angosta tiene las llaves balanceadas', () => {
  assert.equal(css.split('{').length, css.split('}').length);
});
