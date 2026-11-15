import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('app.html', 'utf8');
const css = fs.readFileSync('css/app-shell.css', 'utf8');
const ids = ['shiftControlBtn', 'breakControlBtn', 'lunchControlBtn', 'liveDiscardBtn', 'callControlBtn', 'pasteCallsBtn', 'addCallManualBtn'];
const openTag = id => html.match(new RegExp('<button[^>]*id="' + id + '"[^>]*>'))?.[0] || '';
const start = css.indexOf('/* acciones sin nombre en celular */');
const end = css.indexOf('/* fin acciones sin nombre en celular */');
const block = css.slice(start, end);

test('Barra de acciones: cada botón tiene un aviso (title) que dice para qué sirve', () => {
  for (const id of ids) {
    const tag = openTag(id);
    assert.ok(tag, id + ' existe');
    const title = tag.match(/\btitle="([^"]+)"/)?.[1] || '';
    assert.ok(title.length > 8, id + ' tiene title con una explicación');
  }
});

test('Barra de acciones: en celular se ocultan los nombres cortos y en compu siguen a la vista', () => {
  assert.ok(start > 0 && end > start, 'el bloque CSS está marcado');
  assert.match(block, /@media \(max-width: 760px\)[\s\S]*\.action-slot > \.action-short \{ display: none; \}/);
  assert.doesNotMatch(block, /min-width/);
  assert.match(css, /\.chips > \.hero-shift-actions \.action-slot > \.action-short \{ display: block;/);
});

test('Barra de acciones: sin los nombres, cada botón conserva su nombre para lectores de pantalla', () => {
  for (const id of ids.filter(id => id !== 'liveDiscardBtn')) {
    const at = html.indexOf('id="' + id + '"');
    const inner = html.slice(at, html.indexOf('</button>', at));
    assert.match(inner, /class="action-label"/, id + ' tiene su etiqueta');
  }
  assert.match(openTag('liveDiscardBtn'), /aria-label="[^"]+"/);
  assert.match(css, /\.action-label \{ position: absolute; width: 1px; height: 1px; overflow: hidden;/);
});
