import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { carryDebtMin } from '../js/orden-model.js';
import { renderMiOrden } from '../js/orden-view.js';

const day = (key, status, disorderMin = 0, favorMin = 0) => ({ key, status, disorderMin, favorMin });

test('castigo: la deuda del dia anterior se suma a la meta de hoy, con el tope', () => {
  assert.equal(carryDebtMin([day('d1', 'ok'), day('d2', 'bad', 95)], 60), 60);
  assert.equal(carryDebtMin([day('d1', 'ok'), day('d2', 'bad', 20)], 60), 20);
  assert.equal(carryDebtMin([day('d1', 'bad', 95), day('d2', 'ok')], 60), 0);
});

test('castigo: un dia libre no borra la deuda del ultimo dia de trabajo, pero siete dias si', () => {
  assert.equal(carryDebtMin([day('d1', 'bad', 30), day('d2', 'off'), day('d3', 'off')], 60), 30);
  const old = [day('d0', 'bad', 30), ...Array.from({ length: 7 }, (_, i) => day('o' + i, 'off'))];
  assert.equal(carryDebtMin(old, 60), 0);
});

test('castigo: el dia perdonado no se cobra y la compensacion a favor paga primero', () => {
  const five = Array.from({ length: 5 }, (_, i) => day('k' + i, 'ok'));
  assert.equal(carryDebtMin([...five, day('mal', 'bad', 40)], 60), 0);
  assert.equal(carryDebtMin([day('d1', 'ok'), day('mal', 'bad', 50, 20)], 60), 30);
});

test('castigo: la tarjeta avisa de la deuda de ayer y de la de mañana', () => {
  const box = { innerHTML: '' };
  const doc = { getElementById: id => (id === 'miOrdenBody' ? box : { innerHTML: '' }), activeElement: null };
  const summary = { started: true, netMin: -30, topeMin: 60, debtMin: 30, debtPct: 0.5, favorMin: 0, favorPct: 0, lostMoney: 3, inOrderMoney: 0, carryMin: 15, owedMin: 30 };
  renderMiOrden({ summary, streak: { streak: 0, perdon: 0, lostToday: true }, week: { days: [] }, reward: null }, { translateText: t => t, money: n => String(n) }, doc);
  assert.match(box.innerHTML, /Tu meta de hoy incluye la deuda de ayer: \+15 min/);
  assert.match(box.innerHTML, /Si cierras así, mañana tu meta sube 30 min/);
});

test('castigo: Ajustes pide la meta sin deuda para no guardarla como meta fija', () => {
  const settings = readFileSync(new URL('../js/settings.js', import.meta.url), 'utf8');
  assert.equal((settings.match(/effectiveDailyGoal\([^)]*\), \{ withDebt: false \}\)|effectiveDailyGoal\(dayKey, \{ withDebt: false \}\)/g) || []).length, 4);
  assert.doesNotMatch(settings, /effectiveDailyGoal\((getActiveDayKey\(\)|dayKey)\)/);
});
