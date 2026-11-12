import test from 'node:test';
import assert from 'node:assert/strict';
import { setAppSettings, setAppState, setAppCalls } from '../js/app-context.js';
import { configureReportsContext, dayComplianceStatus } from '../js/reports.js';

const TODAY = '01/15/2026';
const productive = { '01/10/2026': 90, '01/11/2026': 30, '01/12/2026': 0, '01/15/2026': 30 };
const started = { '01/10/2026': true, '01/11/2026': true, '01/12/2026': false, '01/15/2026': true };

function setup(freelancer) {
  setAppState({}); setAppCalls([]);
  setAppSettings({ adherenceGoalPct: 95, freelancer });
  configureReportsContext({
    todayCallDateKey: () => TODAY,
    callDateToDate: (key) => { const [m, d, y] = String(key).split('/').map(Number); return new Date(y, m - 1, d); },
    dayIsEffectivelyOff: () => false,
    dayAdherence: () => null,
    effectiveDailyGoal: () => ({ min: 60 }),
    productiveMinutesForDay: (key) => productive[key] || 0,
    dayShiftBounds: (key) => ({ start: started[key] ? new Date() : null }),
  });
}

test('modo freelancer: el día cumple al alcanzar la meta productiva, sin Adherencia', () => {
  setup({ enabled: true, since: '01/01/2026' });
  assert.equal(dayComplianceStatus('01/10/2026'), 'compliant');
});

test('modo freelancer: un día pasado por debajo de la meta falla y uno sin actividad se salta', () => {
  setup({ enabled: true, since: '01/01/2026' });
  assert.equal(dayComplianceStatus('01/11/2026'), 'failed');
  assert.equal(dayComplianceStatus('01/12/2026'), 'off');
});

test('modo freelancer: hoy por debajo de la meta queda pendiente, no fallido', () => {
  setup({ enabled: true, since: '01/01/2026' });
  assert.equal(dayComplianceStatus(TODAY), 'pending');
});

test('modo freelancer: los días anteriores a la fecha de activación siguen con la lógica de Adherencia', () => {
  setup({ enabled: true, since: '01/14/2026' });
  assert.equal(dayComplianceStatus('01/10/2026'), 'off');
});

test('sin modo freelancer no cambia el comportamiento previo', () => {
  setup({ enabled: false, since: '' });
  assert.equal(dayComplianceStatus('01/10/2026'), 'off');
  assert.equal(dayComplianceStatus(TODAY), 'pending');
});
