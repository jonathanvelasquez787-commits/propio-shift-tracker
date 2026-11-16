import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const js = readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');

test('vista bloques guardada: el ajuste blocksViewMode existe con Bloques por defecto', () => {
  assert.match(js, /blocksViewMode: 'blocks'/);
  assert.match(js, /settings\.blocksViewMode !== 'calls'\) settings\.blocksViewMode = 'blocks'/);
});

test('vista bloques guardada: elegir Bloques o Llamadas se guarda en los ajustes', () => {
  const at = js.indexOf('function setBlocksViewMode(mode)');
  const body = js.slice(at, js.indexOf('\n}\n', at));
  assert.match(body, /settings\.blocksViewMode = next/);
  assert.match(body, /saveSettingsOnly\(\)/);
  assert.doesNotMatch(js, /let blocksViewMode = /);
});

test('vista bloques guardada: al abrir la app se aplica la vista guardada', () => {
  const at = js.indexOf('export function render() {');
  assert.match(js.slice(at, at + 200), /applyBlocksViewMode\(\)/);
  const fn = js.slice(js.indexOf('function applyBlocksViewMode()'), js.indexOf('function setBlocksViewMode'));
  assert.match(fn, /settings\.blocksViewMode === 'calls'/);
});
