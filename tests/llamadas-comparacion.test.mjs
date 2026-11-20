import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { preserveCallRecords } from '../js/call-records.js';
import { openCallRecords } from '../js/call-records-view.js';

const base = Date.parse('2026-11-16T10:00:00-06:00');
const iso = seconds => new Date(base + seconds * 1000).toISOString();
const tool = { id: 'live', source: 'live', startISO: iso(0), endISO: iso(461), durationMin: 461 / 60, callDate: '11/16/2026', pay: '0.96', customerId: 'Propio' };
const propio = (minutes, pay) => ({ id: 'imp', source: 'import', customerId: 'C-48977', startISO: iso(0), endISO: iso(minutes * 60), durationMin: minutes, callDate: '11/16/2026', pay });

function render(call) {
  const original = globalThis.document, content = { innerHTML: '', querySelectorAll: () => [] }, subtitle = { textContent: '' };
  globalThis.document = { getElementById: id => id === 'callRecordsContent' ? content : subtitle };
  try {
    openCallRecords({ data: () => ({ calls: [call], state: {}, settings: {} }), ui: (strings, ...values) => strings.reduce((s, part, i) => s + part + (values[i] ?? ''), ''), translateText: x => x,
      escapeHtml: String, money: x => '$' + x.toFixed(2), financeConvertedInline: () => '', displayLocale: () => 'en-US', formatDuration: ms => '00:0' + Math.floor(ms / 60000) + ':' + String(Math.floor(ms / 1000) % 60).padStart(2, '0'), openModal() {} }, call.id);
  } finally { globalThis.document = original; }
  return content.innerHTML;
}

test('La ventana de detalle muestra la comparacion con dos barras y las etiquetas de diferencia', () => {
  const html = render(preserveCallRecords(propio(3, '$0.36'), tool, iso(500)));
  assert.match(html, /class="record-compare"/);
  assert.match(html, /data-source="propio"/);
  assert.match(html, /data-source="tool"/);
  assert.match(html, /Duración: la tool midió .* más/);
  assert.match(html, /Pago: la tool estimó \$0\.60 más/);
  assert.ok(!html.includes('fin-row-converted'), 'las etiquetas son texto simple');
  assert.match(html, /Cuenta Propio \(tiene prioridad\)/);
  assert.ok(!html.includes('record-difference-line'));
});

test('Si Propio y la tool miden lo mismo no sale la comparacion', () => {
  const same = { ...tool, durationMin: 8, endISO: iso(480), pay: '0.96' };
  const html = render(preserveCallRecords({ ...propio(8, '$0.96'), endISO: iso(480) }, same, iso(500)));
  assert.ok(!html.includes('class="record-compare"'));
});

test('La comparacion usa colores del tema y no hexadecimales', () => {
  const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
  const block = css.slice(css.indexOf('/* llamadas comparacion */'), css.indexOf('/* fin llamadas comparacion */'));
  assert.ok(block.length > 100);
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(block));
  assert.equal((block.match(/{/g) || []).length, (block.match(/}/g) || []).length);
});
