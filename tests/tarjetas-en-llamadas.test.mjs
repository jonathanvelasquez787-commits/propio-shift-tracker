import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('tarjetas en llamadas: Shift, Break y Lunch quedan fuera de la vista Bloques para verse tambien en Llamadas', () => {
  const strip = html.indexOf('id="blockSummaryStrip"');
  const bloques = html.indexOf('<div id="blocksView">');
  const llamadas = html.indexOf('<div id="blocksCallsView"');
  const cuerpo = html.indexOf('<div class="accordion-body">', html.indexOf('id="scheduleAccordion"'));
  assert.ok(strip > cuerpo && cuerpo > 0, 'las tarjetas deben estar dentro de Bloques del dia');
  assert.ok(strip < bloques, 'las tarjetas no pueden ir dentro de #blocksView (se ocultan en Llamadas)');
  assert.ok(bloques < llamadas);
});
