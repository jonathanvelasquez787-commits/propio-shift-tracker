import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { setAppSettings } from '../js/app-context.js';
import { configureReinforcementFeedback, notifyReinforcement, reinforcementFeedbackEnabled, resetFeedbackForTests } from '../js/reinforcement-feedback.js';

const read = (file) => fs.readFileSync(file, 'utf8');

test('los ajustes viejos del juego (enabled e intensity) se borran al cargar y ya no se crean', () => {
  const app = read('js/app-main.js');
  const game = read('js/reinforcement.js');
  assert.match(app, /delete settings\.game\.enabled;/);
  assert.match(app, /delete settings\.game\.intensity;/);
  assert.match(app, /game: \{ soundEnabled: true, soundVolume: 40 \}/);
  assert.match(game, /delete settings\.game\.enabled;/);
  assert.doesNotMatch(game, /settings\.game\.enabled = |settings\.game\.intensity = /);
  assert.doesNotMatch(app, /settings\.game\.enabled = |settings\.game\.intensity = /);
});

test('sin Celebrar llamadas todo queda mudo aunque el ajuste viejo diga enabled', () => {
  for (const personal of [false, true]) {
    setAppSettings({ game: { enabled: true, intensity: 'arcade', soundEnabled: true }, reinforcement: { enabled: personal } });
    resetFeedbackForTests();
    const toasts = [], sounds = [];
    configureReinforcementFeedback({ queueToast: (...args) => toasts.push(args), playSound: (...args) => sounds.push(args) });
    assert.equal(reinforcementFeedbackEnabled(), personal);
    assert.equal(notifyReinforcement('Aviso', { sound: 'pause' }), personal);
    assert.equal(toasts.length, Number(personal));
    assert.equal(sounds.length, Number(personal));
  }
});

test('el audio y los avisos ya no tienen canal "game"', () => {
  for (const file of ['js/reinforcement.js', 'js/reinforcement-audio.js', 'js/reinforcement-feedback.js', 'js/positive-reinforcement.js']) {
    assert.doesNotMatch(read(file), /channel\s*[:=]\s*'(game|personal|either)'|\{ channel[ ,}]|gameToastChannel/, file);
  }
});
