import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { IMPULSE_MILESTONES, LOOT_RARITIES, armorPlatesForDay, configureGameContext, lootRarityFor, monsterPhaseFor } from '../js/game.js';
import { monsterSvg } from '../js/monsters.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('las fases y placas son deterministas y no mezclan HP financiero', () => {
  assert.deepEqual(IMPULSE_MILESTONES, [3, 5, 8]);
  assert.equal(monsterPhaseFor({ hpPct: 0, missions: [] }), 'defeated');
  assert.equal(monsterPhaseFor({ hpPct: 70, missions: [{ applies: true, ok: false, status: 'pending' }] }), 'guarded');
  assert.equal(monsterPhaseFor({ hpPct: 70, combo: 5, missions: [{ applies: true, ok: false, status: 'pending' }] }), 'fury');
  assert.equal(monsterPhaseFor({ hpPct: 70, missions: [{ applies: true, ok: true, status: 'complete' }, { applies: true, ok: true, status: 'complete' }] }), 'vulnerable');
  const plates = armorPlatesForDay({ hpPct: 42, missions: [{ id: 'quality', label: 'Calidad', applies: true, ok: true, status: 'complete' }, { id: 'care', label: 'Cuidado', applies: false, ok: false, status: 'neutral' }, { id: 'adherence', label: 'Adherencia', applies: true, ok: false, status: 'pending' }] });
  assert.equal(plates.length, 3);
  assert.equal(plates[0].id, 'quality');
  assert.equal(plates[1].status, 'neutral');
  assert.equal(plates[2].complete, false);
});

test('Higher Rate vivo solo activa furia en el día actual', () => {
  configureGameContext({ todayCallDateKey: () => '2026-09-29', higherRateLiveStatus: () => ({ active: true }) });
  const mission = [{ applies: true, ok: false, status: 'pending' }];
  assert.equal(monsterPhaseFor({ dayKey: '2026-09-28', hpPct: 70, missions: mission }), 'guarded');
  assert.equal(monsterPhaseFor({ dayKey: '2026-09-29', hpPct: 70, missions: mission }), 'fury');
});

test('loot transparente y equipamiento SVG son deterministas y accesibles', () => {
  assert.equal(new Set(LOOT_RARITIES.map((item) => item.id)).size, 4);
  assert.equal(lootRarityFor('same-seed'), lootRarityFor('same-seed'));
  assert.notEqual(lootRarityFor('same-seed', true), 'common');
  const svg = monsterSvg({ equipment: { head: 'Corona del ciclo', body: 'Armadura cian' }, state: 'awake' });
  assert.match(svg, /monster-layer--equipment/);
  assert.match(svg, /equipado con Corona del ciclo, Armadura cian/);
  assert.doesNotMatch(svg, /<script|onload=/i);
});

test('la superficie dinámica mantiene controles, recibos, accesibilidad y AudioContext único', () => {
  const game = read('js/game.js');
  const html = read('app.html');
  const css = read('css/game.css');
  const surface = `${game}\n${html}`;
  for (const className of ['game-phase-meter', 'game-armor-row', 'game-armor-plate', 'game-next-goals', 'game-next-goal', 'game-mission-reward', 'game-equipment-grid', 'game-equipment-item', 'game-unlock-roadmap', 'game-cycle-choice']) {
    assert.match(surface, new RegExp(className.replaceAll('-', '\\-')));
  }
  for (const action of ['equip-accessory', 'claim-chest', 'choose-cycle-reward']) assert.match(game, new RegExp(`data-game-action=\\"${action}\\"`));
  assert.match(game, /gross, applied/);
  assert.match(game, /repairBonusReceipt/);
  assert.match(game, /from '\.\/game-audio\.js'/);
  assert.equal((read('js/game-audio.js').match(/new Constructor\(\)/g) || []).length, 1);
  assert.match(game, /gameStatusLive/);
  assert.doesNotMatch(surface, /choose-mission|gameDailyFocus/);
  assert.match(game, /item\.unlockLevel > state\.game\.level/);
  assert.match(game, /document\.getElementById\('gameEquipmentPanel'\)/);
  assert.match(game, /data-game-role="chest-claim"/);
  assert.match(game, /function reconcileMissionEvents/);
  assert.match(game, /Armadura rota/);
  assert.match(game, /`mission:\$\{dayKey\}:`/);
  assert.match(game, /function revokeAccessoryReceipt/);
  assert.match(game, /const frozenMonster = entry\.monster/);
  assert.match(html, /id="gameEquipmentPanel"/);
  assert.match(html, /id="gameChestClaim"/);
  assert.match(css, /data-game-phase="guarded"/);
  assert.match(css, /data-game-phase="vulnerable"/);
});
