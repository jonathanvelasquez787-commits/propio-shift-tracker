import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const main = readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');
const start = css.indexOf('/* barra cambiar lado */');
const block = css.slice(start, css.indexOf('/* fin barra cambiar lado */'));

test('barra de acciones: la raya del medio es un botón que cambia los botones de lado', () => {
  assert.match(main, /const sep = document\.createElement\('button'\);/, 'la raya es un botón real');
  assert.match(main, /sep\.setAttribute\('aria-label', sepLabel\)/, 'tiene nombre para lectores de pantalla');
  assert.match(main, /sep\.addEventListener\('click', toggleHeroActionsSide\)/, 'al tocarla cambia de lado');
  assert.doesNotMatch(main, /sep\.setAttribute\('aria-hidden', 'true'\)/, 'ya no está oculta para lectores');
  assert.match(main, /hero\.classList\.toggle\('is-swapped', swapped\)/, 'la barra usa la clase is-swapped');
});

test('barra de acciones: el lado elegido se guarda en los ajustes', () => {
  assert.match(main, /heroActionsSwapped: false,/, 'por defecto no está cambiada');
  assert.match(main, /if \(typeof settings\.heroActionsSwapped !== 'boolean'\) settings\.heroActionsSwapped = false;/, 'se normaliza al cargar');
  assert.match(main, /settings\.heroActionsSwapped = !previous;/, 'cada toque la cambia');
  assert.match(main, /if \(saveSettingsOnly\(\) === false\) \{\s*settings\.heroActionsSwapped = previous;/, 'si no se puede guardar, vuelve atrás');
});

test('barra de acciones: cambiada, las llamadas van a la izquierda y el turno a la derecha', () => {
  assert.ok(start > 0 && block.length > 200, 'existe el bloque de cambiar lado');
  for (const [slot, order] of [['call', 10], ['paste', 20], ['add', 30], ['shift', 50], ['break', 60], ['lunch', 70]]) {
    assert.match(block, new RegExp(`is-swapped \\.action-slot\\[data-slot="${slot}"\\] \\{ order: ${order};`), `${slot} queda en el lugar ${order}`);
  }
  assert.match(block, /\[data-live-type="call"\] \.action-slot\[data-slot="discard"\] \{ order: 15; \}/, 'descartar sigue a la llamada');
  assert.match(block, /\[data-live-type="break"\] \.action-slot\[data-slot="discard"\] \{ order: 65; \}/, 'descartar sigue al break');
  assert.match(block, /\[data-live-type="lunch"\] \.action-slot\[data-slot="discard"\] \{ order: 75; \}/, 'descartar sigue al lunch');
  assert.match(block, /\[data-slot="call"\] \{ order: 10; margin-left: auto; \}/, 'el margen de afuera pasa a las llamadas');
  assert.match(block, /\[data-slot="lunch"\] \{ order: 70; margin-right: auto; \}/, 'y el otro margen al lunch');
});
