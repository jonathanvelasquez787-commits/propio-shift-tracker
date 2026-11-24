import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { automationStatusView } from '../js/automation-status.js';
import { acwPillModel } from '../extension/propio-bridge/acw-pill.js';

const NOW = Date.parse('2026-11-16T14:00:00Z');
const iso = ms => new Date(ms).toISOString();
const snapshot = { version: 1, reportedAt: iso(NOW), observedAt: iso(NOW), reason: 'first-call-wait', recording: true, paused: false, devicePassive: false,
  coordinationConfirmed: true, portal: 'authenticated', call: 'idle', review: false, scheduleVerified: true, startAt: iso(NOW - 600000), endAt: iso(NOW + 3600000),
  options: { first: false, spacing: true, minutes: 6, break: false, lunch: false, timed: false } };

test('sin inicio automatico y con ACW encendido, el estado dice que espera la primera llamada', () => {
  assert.equal(automationStatusView(snapshot, NOW).key, 'first-call-wait');
  assert.deepEqual(acwPillModel(snapshot, NOW), { tone: 'info', text: 'Esperando tu primera llamada' });
});

test('el worker usa first-call-wait solo si el inicio automatico esta apagado, hay ACW y aun no hay llamadas', () => {
  const src = readFileSync(new URL('../extension/propio-bridge/bridge-worker.js', import.meta.url), 'utf8');
  assert.match(src, /!prep\.enabled && spacing\.enabled === true && !plan\.hasCall \? 'first-call-wait' : 'off'/);
});
