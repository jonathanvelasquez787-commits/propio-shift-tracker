import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync('extension/propio-bridge/popup.html', 'utf8');
const js = readFileSync('extension/propio-bridge/popup.js', 'utf8');
const worker = readFileSync('extension/propio-bridge/bridge-worker.js', 'utf8');

test('el recuadro de eventos pendientes tiene la lista de senales y el boton de descartar', () => {
  const box = html.slice(html.indexOf('id="pendingQueueDetail"'));
  const end = box.indexOf('</div><div class="actions"') > 0 ? box.indexOf('</div><div class="actions"') : box.length;
  const detail = box.slice(0, end);
  assert.ok(detail.includes('id="pendingSignalsList"'));
  assert.ok(detail.includes('id="reviewedQueue"'));
  assert.ok(detail.indexOf('pendingSignalsList') < detail.indexOf('reviewedQueue'));
});

test('el trabajador manda el tipo y la hora de cada senal pendiente, sin mas datos', () => {
  assert.match(worker, /queueItems: state\.queue\.slice\(0, 50\)\.map\(item => \(\{ type: item\.event\.type, at: item\.event\.at \}\)\)/);
});

test('descartar desde el recuadro avisa que quedo listo', () => {
  assert.match(js, /for \(const id of \['reviewed', 'reviewedQueue'\]\)/);
  assert.match(js, /kind: 'clear-reviewed' \}, 'Señales descartadas\./);
});
