import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../extension/propio-bridge/popup.html', import.meta.url), 'utf8');

test('popup: "Pausar disponibilidad automática" se explica sin jerga', () => {
  const start = html.indexOf('for="availabilityPaused"');
  const row = html.slice(start, html.indexOf('</label>', start));
  assert.ok(row.includes('Pausar disponibilidad automática'));
  assert.ok(row.includes('Si la encendés, pausa el ponerte disponible. No pausa el guardado de llamadas.'));
  assert.ok(!row.includes('Start Calls'), 'el texto de ayuda ya no menciona Start Calls');
});

test('popup: las opciones de volver a estar disponible dicen "Estar disponible"', () => {
  const rowOf = (id) => { const i = html.indexOf(`for="${id}"`); return html.slice(i, html.indexOf('</label>', i)); };
  assert.ok(rowOf('prepareFirst').includes('Estar disponible al iniciar el turno'));
  assert.ok(rowOf('resumeBreak').includes('Estar disponible después del Break'));
  assert.ok(rowOf('resumeLunch').includes('Estar disponible después del Lunch'));
  assert.ok(!html.includes('Volver después de'));
});
