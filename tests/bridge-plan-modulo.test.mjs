import test from 'node:test';
import assert from 'node:assert/strict';
import { setAppState, setAppSettings, setAppCalls } from '../js/app-context.js';
import { getPropioBridgePlan, getWorkSessionStatus, configureBridgePlan, todayCallDateKey } from '../js/bridge-plan.js';
import { validateBridgePlan } from '../js/propio-bridge-rules.js';

// El worker de la extension carga aqui sus propios datos (sin pantalla ni textos traducidos) y calcula el plan.
const at = (day, hh, mm = 0) => new Date(2026, 10, day, hh, mm, 0, 0);
function load({ state = {}, settings = {}, calls = [], now }) {
  setAppState({ shiftStartedAt: null, shiftEndedAt: null, activeCall: null, activePause: null, pauseHistory: [], lastCallEndedAt: null, events: [], ...state });
  setAppSettings({ freelancer: { enabled: false }, lateArrivalMode: 'anchor', ...settings });
  setAppCalls(calls);
  test.mock.timers.enable({ apis: ['Date'], now: now.getTime() });
}
const done = () => { test.mock.timers.reset(); configureBridgePlan({ isCurrent: () => true }); };

test('el modulo del plan se importa y calcula sin pantalla ni sistema de idiomas', () => {
  load({ now: at(16, 10) }); // lunes 16-nov-2026, 10:00
  try {
    const plan = getPropioBridgePlan();
    assert.ok(plan, 'un dia de trabajo normal tiene plan');
    assert.equal(new Date(plan.startAt).getHours(), 7);
    assert.ok(Date.parse(plan.endAt) > Date.parse(plan.startAt));
    assert.ok(Array.isArray(plan.scheduledPauses));
    assert.equal(plan.hasCall, false);
    assert.equal(plan.ended, false);
    assert.ok(validateBridgePlan({ ...plan, acwVerified: true }, Date.now()), 'el plan pasa la validacion del worker');
  } finally { done(); }
});

test('el ACW del plan arranca en el fin de la ultima llamada y se renueva al instante', () => {
  const callEnd = at(16, 9, 40);
  load({ now: at(16, 9, 41), state: { shiftStartedAt: at(16, 7).toISOString(), lastCallEndedAt: callEnd.toISOString() },
    calls: [{ id: 'c1', startISO: at(16, 9, 30).toISOString(), endISO: callEnd.toISOString() }] });
  try {
    const plan = getPropioBridgePlan();
    assert.equal(plan.acw.startedAt, callEnd.toISOString());
    assert.equal(plan.acw.observedAt, at(16, 9, 41).toISOString());
    assert.equal(plan.hasCall, true);
    assert.equal(plan.lastCallEndedAt, callEnd.toISOString());
  } finally { done(); }
});

test('dia libre y modo freelancer sin turno no tienen plan; freelancer con turno usa el turno real', () => {
  load({ now: at(22, 10) }); // domingo
  try { assert.equal(getPropioBridgePlan(), null); } finally { done(); }
  load({ now: at(16, 10), settings: { freelancer: { enabled: true } } });
  try { assert.equal(getPropioBridgePlan(), null); } finally { done(); }
  load({ now: at(16, 10), settings: { freelancer: { enabled: true } }, state: { shiftStartedAt: at(16, 8).toISOString() } });
  try {
    const plan = getPropioBridgePlan();
    assert.equal(plan.startAt, at(16, 8).toISOString());
    assert.equal(Date.parse(plan.endAt) - Date.parse(plan.startAt), 86400000);
    assert.deepEqual(plan.scheduledPauses, []);
  } finally { done(); }
});

test('el guardia de pestana al dia y el estado del turno siguen funcionando fuera de la app', () => {
  load({ now: at(16, 10), state: { shiftStartedAt: at(16, 6, 55).toISOString() } });
  try {
    assert.equal(getWorkSessionStatus().manual, false);
    configureBridgePlan({ isCurrent: () => false });
    assert.equal(getPropioBridgePlan(), null);
    assert.equal(getWorkSessionStatus(), null);
    assert.equal(todayCallDateKey(at(16, 10)), '11/16/2026');
  } finally { done(); }
});
