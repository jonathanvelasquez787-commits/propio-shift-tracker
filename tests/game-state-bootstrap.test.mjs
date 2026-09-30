import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGameState } from '../js/game.js';

test('normalizar gamificación durante el arranque no requiere el contexto de fechas y conserva el historial persistido', () => {
  const persistedGame = {
    totalXp: 1640,
    level: 5,
    days: {
      '09/28/2026': {
        finalized: true,
        xp: 70,
        xpLocked: 70,
        finalizedAt: '2026-09-29T01:00:00.000Z',
        xpBreakdown: { callsXp: 25, productivityXp: 20, adherenceXp: 10, punctualityXp: 5, missionXp: 10, bonusXp: 0 },
        monster: { species: 'mon', variant: 'gold', defeated: true, hpPct: 0 },
      },
      ' 09/27/2026 ': { finalized: true, xp: 30, finalizedAt: '2026-09-28T01:00:00.000Z' },
      '02/30/2026': { finalized: true, xp: 99 },
      '9/28/2026': { finalized: true, xp: 99 },
    },
    ledger: { 'call:qa-history': { callId: 'qa-history', callsXp: 25, dayKey: '09/28/2026' } },
    trophies: [{ id: 'first-day', label: 'Primer día', earnedOn: '09/28/2026' }],
  };

  const loadedGame = normalizeGameState(persistedGame);
  assert.equal(loadedGame.totalXp, 1640);
  assert.deepEqual(Object.keys(loadedGame.days), ['09/28/2026', ' 09/27/2026 ']);
  assert.equal(loadedGame.days['09/28/2026'].xp, 70);
  assert.equal(loadedGame.days['09/28/2026'].xpLocked, 70);
  assert.equal(loadedGame.days[' 09/27/2026 '].xp, 30);
  assert.equal(loadedGame.ledger['call:qa-history'].callId, 'qa-history');
  assert.deepEqual(loadedGame.trophies[0], { id: 'first-day', label: 'Primer día', earnedOn: '09/28/2026' });

  const reloaded = normalizeGameState(JSON.parse(JSON.stringify({ game: loadedGame })).game);
  assert.equal(reloaded.totalXp, 1640);
  assert.equal(reloaded.days['09/28/2026'].xp, 70);
  assert.equal(reloaded.days[' 09/27/2026 '].xp, 30);
  assert.equal(reloaded.ledger['call:qa-history'].callId, 'qa-history');
});
