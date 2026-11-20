import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { callRecordTag, isToolOnlyCall, possibleRepeatPairs } from '../js/call-review-model.js';
import { joinCallRecords } from '../js/call-records-view.js';

const iso = (min, sec = 0) => new Date(Date.UTC(2026, 10, 16, 14, min, sec)).toISOString();
const toolCall = (id, min, seconds) => ({ id, customerId: 'Manual', source: 'live', callDate: '11/16/2026', startISO: iso(min), endISO: iso(min, seconds), durationMin: seconds / 60, pay: '0.96',
  records: { tool: { id, startISO: iso(min), endISO: iso(min, seconds), durationMs: seconds * 1000, pay: 0.96, detectedBy: 'tool' } } });
const propioCall = (id, min, minutes) => ({ id, customerId: 'C-' + id, source: 'import', callDate: '11/16/2026', startISO: iso(min), endISO: iso(min + minutes), durationMin: minutes, pay: '0.96',
  records: { propio: { startISO: iso(min), endISO: iso(min + minutes), durationMin: minutes, pay: 0.96, customerId: 'C-' + id } } });

test('Cada llamada lleva su etiqueta Propio, Tool o Propio + Tool', () => {
  const both = { ...propioCall('b', 0, 8), records: { ...toolCall('b', 0, 461).records, ...propioCall('b', 0, 8).records } };
  assert.equal(callRecordTag(both), 'both');
  assert.equal(callRecordTag(propioCall('p', 0, 5)), 'propio');
  assert.equal(callRecordTag(toolCall('t', 0, 461)), 'tool');
  assert.equal(callRecordTag({ id: 'm', source: 'manual' }), null);
  assert.equal(isToolOnlyCall(toolCall('t', 0, 461)), true);
  assert.equal(isToolOnlyCall(both), false);
});

test('La pista posible repetida sale con inicio a menos de 5 min y duracion a menos de 1 min', () => {
  const pairs = possibleRepeatPairs([toolCall('t', 0, 461), propioCall('p', 3, 8)]);
  assert.equal(pairs.size, 1);
  assert.equal(pairs.get('t').propioCall.id, 'p');
});

test('La pista NO sale si la duracion es distinta o el inicio esta lejos', () => {
  assert.equal(possibleRepeatPairs([toolCall('t', 0, 461), propioCall('p', 3, 5)]).size, 0);
  assert.equal(possibleRepeatPairs([toolCall('t', 0, 461), propioCall('p', 9, 8)]).size, 0);
});

test('La pista NO sale si la llamada de Propio ya tiene su propia medicion de la tool', () => {
  const second = { ...propioCall('p', 3, 8), records: { ...toolCall('p', 3, 480).records, ...propioCall('p', 3, 8).records } };
  assert.equal(possibleRepeatPairs([toolCall('t', 0, 461), second]).size, 0);
});

test('Cada llamada entra en una sola pista', () => {
  const pairs = possibleRepeatPairs([toolCall('t1', 0, 461), toolCall('t2', 1, 461), propioCall('p', 1, 8)]);
  assert.equal(pairs.size, 1);
  assert.equal(pairs.get('t2').propioCall.id, 'p');
});

test('Juntar conserva las dos mediciones, quita la fila repetida y no suma el pago dos veces', () => {
  let calls = [toolCall('t', 0, 461), propioCall('p', 3, 8)];
  const settings = {}, state = {};
  const context = { translateText: text => text, canPersistLocalChanges: () => true, data: () => ({ calls, state, settings }), callsOverlap: () => false,
    setCalls: value => { calls = value; }, setState: () => {}, reconcileLastCallEndedAt: () => {}, financeRunAutoFillCascade: () => {},
    saveAll: () => true, onReinforcementCallsChanged: () => {}, render: () => {}, toast: () => {} };
  const opened = { owner: settings, tool: JSON.stringify(calls[0]), propio: JSON.stringify(calls[1]) };
  assert.equal(joinCallRecords(context, 't', 'p', opened), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].id, 't');
  assert.equal(callRecordTag(calls[0]), 'both');
  assert.equal(calls[0].records.tool.durationMs, 461000);
  assert.equal(calls[0].records.propio.durationMin, 8);
  assert.equal(calls[0].customerId, 'C-p');
});

test('Juntar se detiene si las llamadas cambiaron mientras estaba abierta la confirmacion', () => {
  let calls = [toolCall('t', 0, 461), propioCall('p', 3, 8)];
  const settings = {}, state = {};
  const context = { translateText: text => text, canPersistLocalChanges: () => true, data: () => ({ calls, state, settings }), callsOverlap: () => false,
    setCalls: value => { calls = value; }, setState: () => {}, reconcileLastCallEndedAt: () => {}, financeRunAutoFillCascade: () => {},
    saveAll: () => true, onReinforcementCallsChanged: () => {}, render: () => {}, toast: () => {} };
  const opened = { owner: settings, tool: JSON.stringify(calls[0]), propio: JSON.stringify({ ...calls[1], pay: '1.50' }) };
  assert.equal(joinCallRecords(context, 't', 'p', opened), false);
  assert.equal(calls.length, 2);
});

test('La tabla muestra etiquetas, aviso solo-tool y boton Juntar sin colores fijos', () => {
  const view = readFileSync(new URL('../js/call-table-view.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
  assert.match(view, /call-origin-tag/);
  assert.match(view, /call-tool-only-notice/);
  assert.match(view, /data-call-join=/);
  const b = css.slice(css.indexOf('/* llamadas etiquetas */'), css.indexOf('/* fin llamadas etiquetas */'));
  assert.ok(b.length > 200);
  assert.doesNotMatch(b, /#[0-9a-fA-F]{3,8}\b/);
});
