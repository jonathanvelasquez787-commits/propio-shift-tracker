import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../js/extension-box.js', import.meta.url), 'utf8');

test('punto del cuadro: revisa cada segundo al abrir y para al ponerse verde', () => {
  const start = src.indexOf('let quickLeft = 30;');
  assert.ok(start > 0, 'falta el sondeo rapido');
  const block = src.slice(start, start + 520);
  assert.match(block, /setInterval\([\s\S]*1000\)/);
  assert.ok(block.includes("extDot === 'on'"));
  assert.ok(block.includes('quickLeft <= 0'));
  assert.ok(src.includes('clearInterval(quick)'));
  assert.ok(src.includes('}, 10000);'), 'el sondeo lento de 10 s se conserva');
});
