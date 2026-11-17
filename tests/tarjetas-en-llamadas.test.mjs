import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

test('tarjetas en llamadas: Shift, Break y Lunch viven en la barra de acciones, fuera de Bloques y de Llamadas, y se ven siempre', () => {
  const tarjeta = html.indexOf('id="heroBlockCard"');
  const acordeon = html.indexOf('id="scheduleAccordion"');
  const bloques = html.indexOf('<div id="blocksView">');
  const llamadas = html.indexOf('<div id="blocksCallsView"');
  assert.ok(tarjeta > 0 && acordeon > tarjeta, 'la tarjeta esta arriba, en la tarjeta de Inicio');
  assert.ok(bloques > acordeon && llamadas > bloques);
  assert.doesNotMatch(html, /id="blockSummaryStrip"/);
});
