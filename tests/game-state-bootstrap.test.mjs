import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultGameState, normalizeGameState } from '../js/game.js';

test('normalizar el estado al arrancar no requiere el contexto de fechas y borra lo guardado del juego', () => {
  const persistedGame = {
    totalXp: 1640,
    level: 5,
    shields: 2,
    bestStreak: 9,
    accessories: ['Corona del ciclo'],
    equipment: { head: 'Corona del ciclo' },
    trophies: [{ id: 'first-day', label: 'Primer día', earnedOn: '09/28/2026' }],
    chest: { pending: true, sealedOn: '09/28/2026' },
    days: { '09/28/2026': { finalized: true, xp: 70, monster: { species: 'mon' } } },
    live: { dayKey: '09/28/2026', combo: 4, shiftAlarmAt: '2026-09-28T12:00:00.000Z' },
    ledger: {
      'call:qa-history': { callId: 'qa-history', callsXp: 25 },
      'loot:09/28/2026:5': { type: 'bonus-xp', applied: 5 },
      'money-hit:09/28/2026:50': true,
      'reinforce-call:09/28/2026:abc': { dayKey: '09/28/2026', feedback: true, surprise: true, gross: 5, applied: 5 },
      'pause-return:09/28/2026:123': { type: 'pause', dayKey: '09/28/2026', onTime: true, endedAt: '2026-09-28T13:00:00.000Z', applied: 5 },
    },
    reinforcement: { reflections: { c1: { callId: 'c1', outcome: 'good', dayKey: '09/28/2026' } } },
  };

  const loadedGame = normalizeGameState(persistedGame);
  assert.deepEqual(Object.keys(loadedGame).sort(), ['ledger', 'reinforcement', 'version']);
  assert.deepEqual(Object.keys(loadedGame.ledger).sort(), [
    'money-hit:09/28/2026:50',
    'pause-return:09/28/2026:123',
    'reinforce-call:09/28/2026:abc',
  ]);
  assert.deepEqual(loadedGame.ledger['reinforce-call:09/28/2026:abc'], { dayKey: '09/28/2026', feedback: true });
  assert.deepEqual(loadedGame.ledger['pause-return:09/28/2026:123'], { type: 'pause', dayKey: '09/28/2026', onTime: true, endedAt: '2026-09-28T13:00:00.000Z' });
  assert.equal(loadedGame.reinforcement.reflections.c1.dayKey, '09/28/2026');

  const reloaded = normalizeGameState(JSON.parse(JSON.stringify({ game: loadedGame })).game);
  assert.deepEqual(reloaded, loadedGame);
});

test('un estado vacío o dañado vuelve al estado por defecto del refuerzo', () => {
  assert.deepEqual(normalizeGameState(null), createDefaultGameState());
  assert.deepEqual(normalizeGameState([]), createDefaultGameState());
  assert.deepEqual(normalizeGameState({ ledger: 'x', reinforcement: 7 }), createDefaultGameState());
});
