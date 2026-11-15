import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../extension/propio-bridge/popup.html', import.meta.url), 'utf8');

test('popup: "Pausar disponibilidad automática" se explica sin jerga', () => {
  const start = html.indexOf('for="availabilityPaused"');
  const row = html.slice(start, html.indexOf('</label>', start));
  assert.ok(row.includes('Pausar disponibilidad automática'));
  assert.ok(row.includes('Pausa el ponerte disponible. No pausa el guardado de llamadas.'));
  assert.ok(!row.includes('Start Calls'), 'el texto de ayuda ya no menciona Start Calls');
});
