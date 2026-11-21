import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { disorderBreakdown, orderSummary, sanitizeOrderTope } from '../js/orden-model.js';
import { renderMiOrden } from '../js/orden-view.js';

const at = hhmm => new Date(`2026-11-16T${hhmm}:00-06:00`);

test('mi orden cuenta empezar tarde, cortar antes y pasarse del descanso, pero no salir tarde', () => {
  const day = { plannedStart: at('07:00'), plannedEnd: at('15:00'), graceMin: 3 };
  assert.deepEqual(disorderBreakdown({ ...day, shiftStart: at('08:35'), shiftEnd: at('15:00') }), { late: 95, early: 0, overrun: 0, total: 95 });
  assert.equal(disorderBreakdown({ ...day, shiftStart: at('07:00'), shiftEnd: at('14:30') }).early, 30);
  assert.equal(disorderBreakdown({ ...day, shiftStart: at('07:00'), shiftEnd: at('16:00') }).total, 0);
  assert.equal(disorderBreakdown({ ...day, shiftStart: at('07:00'), shiftEnd: at('15:00'), pauses: [{ plannedMin: 20, actualMin: 35 }, { plannedMin: 50, actualMin: 40 }] }).overrun, 15);
});

test('mi orden no cuenta nada dentro de la gracia ni sin turno iniciado', () => {
  const day = { plannedStart: at('07:00'), plannedEnd: at('15:00'), graceMin: 3 };
  assert.equal(disorderBreakdown({ ...day, shiftStart: at('07:03'), shiftEnd: at('14:57') }).total, 0);
  assert.equal(disorderBreakdown({ ...day, shiftStart: null, shiftEnd: null }).total, 0);
  assert.equal(orderSummary({ disorderMin: 0, started: false, earned: 9 }).inOrderMoney, 0);
});

test('mi orden limita la deuda al tope pero el dinero perdido no tiene tope', () => {
  const summary = orderSummary({ disorderMin: 95, topeMin: 60, ratePerMin: 0.12, started: true });
  assert.equal(summary.debtMin, 60);
  assert.equal(summary.debtPct, 1);
  assert.ok(Math.abs(summary.lostMoney - 11.4) < 1e-9);
  assert.equal(orderSummary({ disorderMin: 20, topeMin: 60, ratePerMin: 0.12, started: true }).debtMin, 20);
  assert.equal(orderSummary({ disorderMin: 0, topeMin: 60, ratePerMin: 0.12, earned: 12.5, started: true }).inOrderMoney, 12.5);
  assert.equal(sanitizeOrderTope('abc'), 60);
  assert.equal(sanitizeOrderTope('0'), 60);
  assert.equal(sanitizeOrderTope('90'), 90);
});

test('mi orden dibuja chips y tarjetas con desorden y sin turno', () => {
  const els = { miOrdenChips: { innerHTML: '' }, miOrdenBody: { innerHTML: '' }, miOrdenTopeInput: { value: '' } };
  const doc = { getElementById: id => els[id] || null, activeElement: null };
  const tools = { translateText: text => text, money: n => `$${n.toFixed(2)}` };
  renderMiOrden(orderSummary({ disorderMin: 95, topeMin: 60, ratePerMin: 0.12, started: true }), tools, doc);
  assert.match(els.miOrdenChips.innerHTML, /-60 min/);
  assert.match(els.miOrdenChips.innerHTML, /-\$11\.40/);
  assert.match(els.miOrdenBody.innerHTML, /Debes 60 min/);
  assert.equal(els.miOrdenTopeInput.value, '60');
  renderMiOrden(orderSummary({ started: false }), tools, doc);
  assert.match(els.miOrdenChips.innerHTML, /Sin turno todavía/);
});

test('mi orden tiene su tarjeta plegable con id fijo y su ajuste de tope', () => {
  const html = readFileSync('app.html', 'utf8');
  assert.match(html, /<details class="accordion-card mi-orden-card" id="miOrdenAccordion">/);
  for (const id of ['miOrdenChips', 'miOrdenBody', 'miOrdenTopeInput']) assert.ok(html.includes(`id="${id}"`), id);
  const css = readFileSync('css/app-shell.css', 'utf8');
  const block = css.slice(css.indexOf('/* mi orden */'), css.indexOf('/* fin mi orden */'));
  assert.ok(block.length > 100);
  assert.equal(block.split('{').length, block.split('}').length);
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(block), 'sin hexadecimales');
});
