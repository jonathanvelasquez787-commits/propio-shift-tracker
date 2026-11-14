import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const rowSource = (() => {
  const js = fs.readFileSync(new URL('../js/higher-rate.js', import.meta.url), 'utf8');
  const start = js.indexOf('function renderHigherRateWindowRow');
  return js.slice(start, js.indexOf('let renderedHigherRateWindows', start));
})();
const modal = (() => {
  const start = html.indexOf('id="higherRateModal"');
  return html.slice(start, html.indexOf('id="higherRateReviewModal"', start));
})();

test('popup Higher Rate: los textos largos viven en un panel plegado detrás del botón "i"', () => {
  assert.match(modal, /<button[^>]*id="higherRateInfoBtn"[^>]*aria-expanded="false"[^>]*aria-controls="higherRateInfoPanel"|<button[^>]*aria-controls="higherRateInfoPanel"[^>]*aria-expanded="false"[^>]*id="higherRateInfoBtn"/);
  const panel = modal.match(/<div class="hr-info-panel" id="higherRateInfoPanel" hidden>([\s\S]*?)<\/div>/);
  assert.ok(panel, 'el panel empieza oculto');
  assert.match(panel[1], /Usá la fecha, horas y nivel del aviso de Propio/);
  assert.match(panel[1], /5 min antes de que la ventana comience/);
  assert.doesNotMatch(modal.replace(panel[0], ''), /Usá la fecha, horas y nivel|5 min antes de que la ventana comience/);
});

test('popup Higher Rate: estado de la ventana y números de hoy van en una sola tarjeta', () => {
  const summary = modal.match(/<div class="hr-summary">([\s\S]*?)\n<\/div>\n\n<div class="hr-section-head">/);
  assert.ok(summary, 'existe la tarjeta única');
  assert.match(summary[1], /id="higherRateLiveCard"/);
  assert.match(summary[1], /id="higherRateDayStats"/);
  assert.doesNotMatch(modal, /Tiempo y bono por día/);
});

test('popup Higher Rate: "Ventanas" y "+ Agregar" comparten fila', () => {
  const head = modal.match(/<div class="hr-section-head">([\s\S]*?)<\/div>\n<div class="hr-window-grid" id="higherRateWindowsList">/);
  assert.ok(head);
  assert.match(head[1], /hr-section-title">Ventanas</);
  assert.match(head[1], /id="higherRateActiveCountPill"/);
  assert.match(head[1], /id="addHigherRateWindowBtn"/);
  assert.doesNotMatch(modal, /hr-add-window-btn/);
});

test('popup Higher Rate: cada ventana ocupa dos líneas y sigue siendo editable', () => {
  const lines = rowSource.split('class="hr-window-line');
  assert.equal(lines.length, 3, 'dos líneas por ventana');
  const [, top, bottom] = lines;
  for (const cls of ['hr-window-date-input', 'hr-window-start-input', 'hr-window-end-input']) assert.match(top, new RegExp(cls));
  assert.match(bottom, /hr-window-tier-row/);
  assert.match(bottom, /data-remove-hr-window/);
  assert.match(rowSource, /hr-window-tier-input/);
  assert.match(rowSource, /hr-window-day-name/);
});

test('popup Higher Rate: el historial sigue plegado y conserva "Limpiar historial"', () => {
  assert.match(modal, /<details id="higherRateHistoryAccordion">/);
  assert.doesNotMatch(modal, /<details id="higherRateHistoryAccordion" open/);
  assert.match(modal, /id="purgeHigherRateWindowsBtn"[\s\S]*Limpiar historial/);
});
