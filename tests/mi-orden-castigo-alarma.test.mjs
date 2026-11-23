import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { breakOverrunMinute } from '../js/orden-model.js';

const MIN = 60000;

test('el descanso dentro de lo planeado no da alarma de pasado', () => {
  assert.equal(breakOverrunMinute(0, 15, 14 * MIN + 59000), null);
});

test('al pasarse suena el primer aviso (0) y luego sube un número cada minuto', () => {
  assert.equal(breakOverrunMinute(0, 15, 15 * MIN), 0);
  assert.equal(breakOverrunMinute(0, 15, 15 * MIN + 59000), 0);
  assert.equal(breakOverrunMinute(0, 15, 16 * MIN), 1);
  assert.equal(breakOverrunMinute(0, 15, 20 * MIN + 5000), 5);
});

test('sin duración planeada o con datos malos no hay alarma', () => {
  assert.equal(breakOverrunMinute(0, 0, 99 * MIN), null);
  assert.equal(breakOverrunMinute(0, null, 99 * MIN), null);
  assert.equal(breakOverrunMinute(NaN, 15, 99 * MIN), null);
});

test('la app revisa la alarma de descanso pasado en cada tick y no la usa en Freelancer', () => {
  const main = readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');
  assert.ok(main.includes('checkBreakOverrunAlarm();'));
  const i = main.indexOf('function checkBreakOverrunAlarm');
  const body = main.slice(i, i + 1600);
  assert.ok(body.includes('freelancerActive()'));
  assert.ok(body.includes('playConfiguredAlarmSound(settings.breakEndAlarmSound'));
});
