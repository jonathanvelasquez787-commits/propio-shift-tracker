import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');

test('vaciar fila celular: Historial de cambios y Vaciar datos del dia comparten una fila', () => {
  const at = html.indexOf('<div class="call-actions-row">');
  assert.ok(at > 0);
  const row = html.slice(at, html.indexOf('</div>', at));
  assert.match(row, /id="callRecoveryBtn"/);
  assert.match(row, /id="clearDayCallsBtn"/);
});

test('vaciar fila celular: solo en celular se pone en fila, en compu no cambia nada', () => {
  const a = css.indexOf('/* vaciar fila celular */');
  const b = css.indexOf('/* fin vaciar fila celular */');
  assert.ok(a >= 0 && b > a);
  const block = css.slice(a, b);
  assert.match(block, /\.call-actions-row \{ display: contents; \}/);
  assert.match(block, /@media \(max-width: 760px\)[\s\S]*display: flex/);
  assert.doesNotMatch(block, /#[0-9a-fA-F]{3,8}\b/);
});
