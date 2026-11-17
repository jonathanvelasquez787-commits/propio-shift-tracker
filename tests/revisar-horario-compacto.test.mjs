import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { confirmSchedulePlan } from '../js/shift-work-review.js';

const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');

function run(plan) {
  const els = new Map();
  const get = id => { if (!els.has(id)) els.set(id, { textContent: '', className: '', innerHTML: '' }); return els.get(id); };
  globalThis.document = { getElementById: get };
  const ui = (s, ...v) => s.reduce((a, p, i) => a + p + (i < v.length ? v[i] : ''), '');
  const esc = v => String(v);
  confirmSchedulePlan({ ui, translateText: t => t, escapeHtml: esc, appConfirm() {}, signature: () => 'x', toast() {}, valid: () => true,
    timeLabel: t => t, blockLabel: t => t }, plan, () => true);
  return get('confirmModalDetails');
}
const cfg = { start: '06:00', end: '14:00', blocks: [{ type: 'work', start: '06:00', dur: 480 }] };
const days = [{ label: 'Lunes', before: cfg }, { label: 'Martes', before: cfg }, { label: 'Miércoles', before: cfg }];

test('revisar horario compacto: sin cambios muestra una sola fila rv-same', () => {
  const el = run({ config: cfg, keys: ['mon', 'tue', 'wed'], order: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], days, scope: '' });
  assert.match(el.className, /sched-review/);
  assert.match(el.innerHTML, /rv-same/);
  assert.doesNotMatch(el.innerHTML, /rv-diff/);
  assert.doesNotMatch(el.innerHTML, /polished-days/);
  assert.match(el.innerHTML, /Lunes a Miércoles/);
});

test('revisar horario compacto: si cambia muestra Antes y Después en rv-diff', () => {
  const after = { ...cfg, start: '07:00', end: '15:00' };
  const el = run({ config: after, keys: ['mon', 'tue', 'wed'], order: ['mon', 'tue', 'wed'], days, scope: '' });
  assert.match(el.innerHTML, /rv-diff/);
  assert.doesNotMatch(el.innerHTML, /rv-same/);
});

test('revisar horario compacto: el CSS cuida solo este pop up y no usa colores fijos', () => {
  const a = css.indexOf('/* revisar horario */'), b = css.indexOf('/* fin revisar horario */');
  assert.ok(a > 0 && b > a);
  const block = css.slice(a, b);
  assert.match(block, /:has\(\.sched-review\) \.modal-actions/);
  assert.equal(/:\s*#[0-9a-fA-F]{3,8}/.test(block), false);
});
