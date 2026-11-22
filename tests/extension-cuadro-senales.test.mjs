import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extensionQueueModel } from '../js/extension-box.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('cuadro de señales: muestra pendientes, vencimiento y botones como la ventanita vieja', () => {
  const now = Date.parse('2026-11-22T15:00:00.000Z');
  const state = { ok: true, paired: true, mode: 'auto', queued: 2, active: false, call: 'none',
    queueSummary: { expiresAt: '2026-11-22T20:22:00.000Z', expired: false },
    queueItems: [{ type: 'history-records', at: '2026-11-22T14:00:00.000Z' }, { type: 'otra', at: 'x' }],
    preparation: { availabilityPaused: true, spacing: { enabled: true }, plan: { scheduleVerified: false, acwVerified: false } } };
  const m = extensionQueueModel(state, now);
  assert.equal(m.queued, 2);
  assert.equal(m.deadline, 'La señal más antigua vence en 5 h 22 min.');
  assert.deepEqual(m.items.map(i => i.name), ['Historial de llamadas', 'Señal']);
  assert.deepEqual([m.showDiscard, m.showResume, m.showRefresh, m.refreshLocked], [true, true, true, false]);
  assert.equal(extensionQueueModel({ ...state, queueSummary: { expiresAt: '2026-11-22T10:00:00.000Z', expired: true } }, now).deadline, 'Hay señales vencidas; el registro necesita revisión.');
  assert.equal(extensionQueueModel({ ...state, queueSummary: {} }, now).deadline, 'Pendientes sin fecha confirmada; requieren revisión.');
  assert.equal(extensionQueueModel({ ...state, call: 'connected' }, now).refreshLocked, true);
  const verified = extensionQueueModel({ ...state, queued: 0, preparation: { spacing: { enabled: false }, plan: { scheduleVerified: true } } }, now);
  assert.deepEqual([verified.showDiscard, verified.showResume, verified.showRefresh], [false, false, false]);
  assert.equal(extensionQueueModel({ ...state, queued: 0, active: true }, now).showDiscard, true);
  assert.equal(extensionQueueModel(null, now).showDiscard, false);
});

test('cuadro de señales: cada boton manda el mismo paquete que la ventanita vieja', () => {
  const src = read('js/extension-box.js');
  for (const piece of ["kind: 'pause-availability', paused: false", "kind: 'refresh-tracker'", "kind: 'clear-reviewed'", 'Señales descartadas. Volvió el modo de observación.', '¿Ya revisaste o registraste estas llamadas']) assert.ok(src.includes(piece), piece);
  for (const id of ['extBoxQueue', 'extBoxSignalsBtn', 'extBoxHowBtn', 'extBoxDiscard', 'extBoxResumeAvail', 'extBoxRefresh']) assert.ok(src.includes(`'${id}'`), id);
});
