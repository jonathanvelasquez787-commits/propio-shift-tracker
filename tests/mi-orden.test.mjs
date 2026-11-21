import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { disorderBreakdown, orderSummary, sanitizeOrderTope, favorMinutes, dayOrderStatus, walkStreak, rewardProgress } from '../js/orden-model.js';
import { renderMiOrden, setMiOrdenEditing } from '../js/orden-view.js';

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

test('mi orden cuenta como a favor lo trabajado despues de la hora de salida', () => {
  assert.equal(favorMinutes(at('15:00'), at('15:40')), 40);
  assert.equal(favorMinutes(at('15:00'), at('14:50')), 0);
  assert.equal(favorMinutes(at('15:00'), null), 0);
  const summary = orderSummary({ disorderMin: 95, topeMin: 60, favorMin: 20, ratePerMin: 0.12, started: true });
  assert.equal(summary.netMin, -40);
  assert.equal(summary.favorPct, 20 / 60);
});

test('mi orden da el estado de cada dia y la racha con su dia de perdon', () => {
  assert.equal(dayOrderStatus({ off: true }), 'off');
  assert.equal(dayOrderStatus({ started: false }), 'pending');
  assert.equal(dayOrderStatus({ started: true, ended: false, disorderMin: 0 }), 'pending');
  assert.equal(dayOrderStatus({ started: true, ended: true, disorderMin: 0 }), 'ok');
  assert.equal(dayOrderStatus({ started: true, ended: false, disorderMin: 12 }), 'bad');
  const day = (key, status) => ({ key, status });
  const five = ['a', 'b', 'c', 'd', 'e'].map(key => day(key, 'ok'));
  assert.deepEqual(walkStreak([...five, day('f', 'bad'), day('g', 'ok')]), { streak: 6, perdon: 0, forgiven: ['f'], lostToday: false });
  assert.deepEqual(walkStreak([day('a', 'ok'), day('b', 'ok'), day('c', 'bad')]), { streak: 0, perdon: 0, forgiven: [], lostToday: true });
  assert.equal(walkStreak([day('a', 'ok'), day('x', 'off'), day('b', 'ok')]).streak, 2);
  assert.equal(walkStreak([]).streak, 0);
});

test('mi orden calcula el avance de la recompensa que escribe el usuario', () => {
  assert.deepEqual(rewardProgress(4, 10), { okDays: 4, targetDays: 10, pct: 40, done: false });
  assert.equal(rewardProgress(12, 10).pct, 100);
  assert.equal(rewardProgress(12, 10).done, true);
  assert.equal(rewardProgress(3, 0).pct, 0);
});

function fakeDoc() {
  const els = { miOrdenChips: { innerHTML: '' }, miOrdenBody: { innerHTML: '' } };
  return { els, doc: { getElementById: id => els[id] || null, activeElement: null } };
}
const tools = { translateText: text => text, money: n => `$${n.toFixed(2)}` };
const emptyData = overrides => ({
  summary: orderSummary({ disorderMin: 95, topeMin: 60, favorMin: 0, ratePerMin: 0.12, started: true }),
  streak: { streak: 0, perdon: 0, forgiven: [], lostToday: true },
  week: { days: [{ status: 'bad', label: 'L', today: true }, { status: 'pending', label: 'M', today: false }] },
  reward: null,
  ...overrides,
});

test('mi orden dibuja balance, racha, semana, tope y el formulario de recompensa', () => {
  const { els, doc } = fakeDoc();
  setMiOrdenEditing(false);
  renderMiOrden(emptyData(), tools, doc);
  assert.match(els.miOrdenChips.innerHTML, /-60 min/);
  assert.match(els.miOrdenChips.innerHTML, /-\$11\.40/);
  assert.match(els.miOrdenChips.innerHTML, /Racha 0/);
  assert.match(els.miOrdenChips.innerHTML, /Semana 0\/2/);
  assert.match(els.miOrdenBody.innerHTML, /Debes 60 min/);
  assert.match(els.miOrdenBody.innerHTML, /Perdida hoy/);
  assert.match(els.miOrdenBody.innerHTML, /id="miOrdenTopeInput"[^>]*value="60"/);
  assert.match(els.miOrdenBody.innerHTML, /id="miOrdenRewardName"/);
  assert.match(els.miOrdenBody.innerHTML, /data-mo-action="save-reward"/);
});

test('mi orden muestra la recompensa con su avance y avisa cuando esta lista', () => {
  const { els, doc } = fakeDoc();
  setMiOrdenEditing(false);
  renderMiOrden(emptyData({ reward: { name: 'Salida <con> amigos', ...rewardProgress(4, 10) } }), tools, doc);
  assert.match(els.miOrdenChips.innerHTML, /40%/);
  assert.match(els.miOrdenBody.innerHTML, /Salida &lt;con&gt; amigos/);
  assert.match(els.miOrdenBody.innerHTML, /4 de 10 días en orden/);
  renderMiOrden(emptyData({ reward: { name: 'Salida', ...rewardProgress(10, 10) } }), tools, doc);
  assert.match(els.miOrdenBody.innerHTML, /¡Lista para ti!/);
});

test('mi orden no redibuja la tarjeta mientras el usuario escribe dentro de ella', () => {
  const { els, doc } = fakeDoc();
  setMiOrdenEditing(false);
  renderMiOrden(emptyData(), tools, doc);
  const before = els.miOrdenBody.innerHTML;
  els.miOrdenBody.contains = node => node === 'campo';
  doc.activeElement = 'campo';
  renderMiOrden(emptyData({ streak: { streak: 7, perdon: 1, forgiven: [], lostToday: false } }), tools, doc);
  assert.equal(els.miOrdenBody.innerHTML, before);
  assert.match(els.miOrdenChips.innerHTML, /Racha 7/);
});

test('mi orden sin turno muestra el aviso y sin desorden se ve en orden', () => {
  const { els, doc } = fakeDoc();
  setMiOrdenEditing(false);
  renderMiOrden(emptyData({ summary: orderSummary({ started: false }) }), tools, doc);
  assert.match(els.miOrdenChips.innerHTML, /Sin turno todavía/);
  assert.match(els.miOrdenBody.innerHTML, /Cuando empieces el turno/);
  renderMiOrden(emptyData({ summary: orderSummary({ disorderMin: 0, started: true, earned: 5 }) }), tools, doc);
  assert.match(els.miOrdenChips.innerHTML, /En orden/);
  assert.match(els.miOrdenBody.innerHTML, /\+\$5\.00/);
});

test('mi orden tiene su tarjeta plegable con id fijo y estilos del tema', () => {
  const html = readFileSync('app.html', 'utf8');
  assert.match(html, /<details class="accordion-card mi-orden-card" id="miOrdenAccordion">/);
  for (const id of ['miOrdenChips', 'miOrdenBody']) assert.ok(html.includes(`id="${id}"`), id);
  assert.ok(!html.includes('id="miOrdenTopeInput"'), 'el tope vive dentro de la tarjeta, no en Ajustes');
  const css = readFileSync('css/app-shell.css', 'utf8');
  for (const name of ['mi orden', 'mi orden completa']) {
    const block = css.slice(css.indexOf(`/* ${name} */`), css.indexOf(`/* fin ${name} */`));
    assert.ok(block.length > 100, name);
    assert.equal(block.split('{').length, block.split('}').length, name);
    assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(block), `sin hexadecimales en ${name}`);
  }
});
