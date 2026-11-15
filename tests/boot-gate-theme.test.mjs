import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const block = css.slice(css.indexOf('/* boot-gate-tema */'), css.indexOf('/* fin boot-gate-tema */'));

test('boot gate follows the colors of non-original themes', () => {
  assert.ok(block.length > 0, 'falta el bloque boot-gate-tema en app-shell.css');
  const selector = 'html[data-palette]:not([data-palette="original"])';
  assert.match(block, new RegExp(`${selector.replace(/[[\]().*+?^${}|]/g, '\\$&')} #bootGate\\s*{[^}]*background:\\s*var\\(--bg-page\\)`));
  assert.match(block, /#bootGate\s*{[^}]*color:\s*var\(--text\)/);
  assert.match(block, /\.boot-text\s*{[^}]*color:\s*var\(--muted\)/);
  assert.match(block, /\.boot-card\s*{[^}]*background:\s*var\(--panel\)/);
});

test('boot gate keeps its own colors for the original theme', () => {
  assert.match(css, /#bootGate\s*{[^}]*background:\s*#f8fafc/);
  assert.match(css, /html\.theme-dark #bootGate\s*{[^}]*background:\s*#080d1f/);
});
