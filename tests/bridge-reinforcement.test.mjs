import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setAppSettings } from '../js/app-context.js';
import { callFeedbackSilenced, reflectionPromptSilenced, reinforcementFeedbackSilenced, withBridgeCallFeedback, withSilentCallFeedback } from '../js/call-feedback.js';
import { normalizeReinforcementSettings } from '../js/positive-reinforcement.js';

const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const appMain = readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');

function inside(reinforcement) {
  setAppSettings({ reinforcement });
  return withBridgeCallFeedback(() => ({ all: callFeedbackSilenced(), celebrate: !reinforcementFeedbackSilenced(), ask: !reflectionPromptSilenced() }));
}

test('con los interruptores de la extensión apagados todo sigue en silencio', () => {
  const result = inside({ enabled: true });
  assert.deepEqual(result, { all: true, celebrate: false, ask: false });
});

test('cada interruptor de la extensión abre solo lo suyo', () => {
  assert.deepEqual(inside({ celebrateBridgeCalls: true }), { all: true, celebrate: true, ask: false });
  assert.deepEqual(inside({ askAfterBridgeCall: true }), { all: true, celebrate: false, ask: true });
  assert.deepEqual(inside({ celebrateBridgeCalls: true, askAfterBridgeCall: true }), { all: true, celebrate: true, ask: true });
});

test('importar historial sigue en silencio total aunque los interruptores estén prendidos', () => {
  setAppSettings({ reinforcement: { celebrateBridgeCalls: true, askAfterBridgeCall: true } });
  const result = withBridgeCallFeedback(() => withSilentCallFeedback(() => ({ celebrate: !reinforcementFeedbackSilenced(), ask: !reflectionPromptSilenced() })));
  assert.deepEqual(result, { celebrate: false, ask: false });
  assert.equal(callFeedbackSilenced(), false);
});

test('los ajustes nuevos arrancan apagados y solo aceptan true', () => {
  const base = normalizeReinforcementSettings({});
  assert.equal(base.celebrateBridgeCalls, false);
  assert.equal(base.askAfterBridgeCall, false);
  const on = normalizeReinforcementSettings({ celebrateBridgeCalls: true, askAfterBridgeCall: true });
  assert.equal(on.celebrateBridgeCalls, true);
  assert.equal(on.askAfterBridgeCall, true);
  assert.equal(normalizeReinforcementSettings({ celebrateBridgeCalls: 'si' }).celebrateBridgeCalls, false);
});

test('el menú lateral tiene un interruptor de la extensión para cada cosa', () => {
  for (const id of ['positiveBridgeCelebrateInput', 'positiveBridgeAskInput']) assert.match(html, new RegExp(`id="${id}" type="checkbox"`));
  assert.match(html, /id="positiveBridgeCelebrateRow"[^>]*hidden/);
  assert.match(html, /id="positiveBridgeAskRow"[^>]*hidden/);
});

test('la extensión usa los interruptores y el historial importado sigue silencioso', () => {
  const start = appMain.indexOf('export const applyPropioBridgeEvent = createPropioReceiver({');
  const block = appMain.slice(start, appMain.indexOf('save: saveAll,', start));
  assert.match(block, /end: event => withBridgeCallFeedback\(/);
  assert.match(block, /catchUp: event => withBridgeCallFeedback\(/);
  assert.match(block, /importHistory: records => withSilentCallFeedback\(/);
});
