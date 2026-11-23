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
  assert.deepEqual([m.showDiscard, m.showResume, m.showRefresh, m.refreshLocked], [false, true, true, false]);
  assert.deepEqual([m.problem, m.problemText], [false, '']);
  assert.equal(extensionQueueModel({ ...state, queueSummary: { expiresAt: '2026-11-22T10:00:00.000Z', expired: true } }, now).deadline, 'Hay señales vencidas; el registro necesita revisión.');
  assert.equal(extensionQueueModel({ ...state, queueSummary: {} }, now).deadline, 'Pendientes sin fecha confirmada; requieren revisión.');
  assert.equal(extensionQueueModel({ ...state, call: 'connected' }, now).refreshLocked, true);
  const verified = extensionQueueModel({ ...state, queued: 0, preparation: { spacing: { enabled: false }, plan: { scheduleVerified: true } } }, now);
  assert.deepEqual([verified.showDiscard, verified.showResume, verified.showRefresh], [false, false, false]);
  assert.equal(extensionQueueModel({ ...state, queued: 0, active: true }, now).showDiscard, false);
  assert.equal(extensionQueueModel(null, now).showDiscard, false);
});

test('cuadro de señales: cada boton manda el mismo paquete que la ventanita vieja', () => {
  const src = read('js/extension-box.js');
  for (const piece of ["kind: 'pause-availability', paused: false", "kind: 'refresh-tracker'", "kind: 'clear-reviewed'", 'Listo. Señales descartadas y el registro sigue activo.', '¿Ya revisaste o registraste estas llamadas']) assert.ok(src.includes(piece), piece);
  for (const id of ['extBoxQueue', 'extBoxMoreBtn', 'extBoxDiscard', 'extBoxResumeAvail', 'extBoxRefresh']) assert.ok(src.includes(`'${id}'`), id);
});

test('cuadro de señales: sin problema no sale nada; con problema una tarjeta y un boton que descarta y reactiva', () => {
  const base = { ok: true, paired: true, mode: 'auto', queued: 3, active: false, call: 'none', queueSummary: { expiresAt: '2026-11-22T20:00:00.000Z', expired: false } };
  const now = Date.parse('2026-11-22T15:00:00.000Z');
  assert.deepEqual([extensionQueueModel(base, now).problem, extensionQueueModel(base, now).showDiscard], [false, false]);
  assert.equal(extensionQueueModel({ ...base, attention: 'tracker-closed' }, now).problem, false);
  for (const attention of ['queue-full', 'expired-event', 'event-rejected', 'tracker-needs-review']) {
    const m = extensionQueueModel({ ...base, attention }, now);
    assert.deepEqual([m.problem, m.showDiscard, m.problemText.length > 10], [true, true, true], attention);
  }
  const src = read('js/extension-box.js');
  assert.ok(src.includes("Ya las revisé, seguir registrando"));
  assert.ok(src.includes("[{ kind: 'clear-reviewed' }, { kind: 'mode', mode: 'auto' }]"));
  assert.ok(src.includes('queueBox.hidden = !q.problem'));
  assert.ok(!src.includes("'Descartar señales revisadas'"));
});

test('cuadro de señales: Eventos pendientes se oculta en 0 y los tres botones van chicos en una linea', () => {
  const src = read('js/extension-box.js');
  assert.ok(src.includes('pend.hidden = !m.queued;'));
  const css = read('css/app-shell.css');
  assert.ok(css.includes('.ext-box-row[hidden] { display: none; }'));
  assert.match(css, /\.ext-box-actions \{ display: flex; flex-wrap: wrap;/);
  assert.match(css, /\.ext-box-actions \.ext-box-btn \{[^}]*white-space: nowrap/);
});
