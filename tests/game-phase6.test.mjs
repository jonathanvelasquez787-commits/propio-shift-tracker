import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('Fase 6 expone el catálogo semanal y renderiza SVG seguro para todos los estados', async () => {
  const monstersSource = read('js/monsters.js');
  assert.doesNotMatch(monstersSource, /^\s*import\s/m);
  assert.match(monstersSource, /export const MONSTER_CATALOG/);
  assert.match(monstersSource, /export function monsterSvg/);
  assert.match(monstersSource, /currentColor/);
  assert.match(monstersSource, /role="img"/);
  assert.match(monstersSource, /aria-label=/);
  assert.match(monstersSource, /replaceAll\('&', '&amp;'/);

  const monsters = await import(new URL('../js/monsters.js?phase6-test', import.meta.url));
  assert.deepEqual(Object.keys(monsters.MONSTER_CATALOG), ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
  assert.equal(monsters.MONSTER_CATALOG.sat.id, monsters.MONSTER_CATALOG.sun.id);

  for (const weekdayKey of Object.keys(monsters.MONSTER_CATALOG)) {
    assert.equal(monsters.monsterForWeekday(weekdayKey).weekdayKey, weekdayKey);
  }
  for (const state of ['sleeping', 'awake', 'angry', 'wounded', 'fury', 'defeated']) {
    for (const variant of ['normal', 'gold', 'streak']) {
      const svg = monsters.monsterSvg({ species: 'mon', state, variant, hpPct: 42, sizeClass: 'sm' });
      assert.match(svg, new RegExp(`monster-svg--${state}`));
      assert.match(svg, new RegExp(`monster-svg--${variant}`));
      assert.match(svg, /role="img"/);
      assert.match(svg, /currentColor/);
    }
  }
  const safe = monsters.monsterSvg({ species: 'mon', state: '<script>', sizeClass: 'x" onload="alert(1)' });
  assert.doesNotMatch(safe, /<script|onload=/i);
});

test('HTML integra la ruta de Logros, el arena, las misiones, ajustes y modales sin IDs duplicados', () => {
  const html = read('app.html');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual(duplicates, []);
  for (const id of [
    'gameArena', 'gameMissions', 'gameCycleBoss', 'gameCycleBossAchievements',
    'gameAchievementsSummary', 'gameStreakPanel', 'gameLevelPanel', 'gameBestiary',
    'gameTrophies', 'gameRecords', 'gameLastStageClear', 'gameToastStack',
    'gameEnabledInput', 'gameIntensityInput', 'gameSettingsProfile',
    'stageClearModal', 'stageClearContent', 'chestModal', 'chestContent',
  ]) assert.match(html, new RegExp(`\\bid="${id}"`), `missing #${id}`);
  assert.match(html, /<link rel="stylesheet" href="\/css\/game\.css"\s*\/>/);
  assert.match(html, /data-page="achievements"/);

  const appMain = read('js/app-main.js');
  assert.match(appMain, /'achievements'/);
  assert.match(appMain, /if \(page === 'achievements'\) renderGame\(\)/);
  assert.match(appMain, /onGameShiftStarted/);
  assert.match(appMain, /onGameShiftEnded/);
  assert.match(appMain, /onGamePauseEnded/);
  assert.match(appMain, /onGameGapSaved/);
});

test('state y settings conservan defaults y normalización de Fase 6', () => {
  const game = read('js/game.js');
  const appMain = read('js/app-main.js');
  assert.match(game, /export function createDefaultGameState\(\)/);
  assert.match(game, /chest: \{ pending: false, sealedOn: null \}/);
  assert.match(game, /live: \{ dayKey: null, combo: 0, shiftAlarmAt: null \}/);
  assert.match(game, /export function normalizeGameState\(raw\)/);
  assert.match(game, /shields: Math\.max\(0, Math\.min\(GAME_SHIELD_CAP/);
  assert.match(game, /if \(settings\.game\.intensity === 'off'\) settings\.game\.enabled = false/);
  assert.match(appMain, /game: createDefaultGameState\(\)/);
  assert.match(appMain, /game: normalizeGameState\(src\.game\)/);
  assert.match(appMain, /game: \{ enabled: true, intensity: 'arcade' \}/);
});

test('XP solo entra por llamadas actuales y oportunas, con tope diario y lock de snapshot', () => {
  const game = read('js/game.js');
  const calls = read('js/calls.js');
  assert.match(game, /export const GAME_DAILY_XP_CAP = 150/);
  assert.match(game, /Math\.min\(GAME_DAILY_XP_CAP/);
  assert.match(game, /dayCalls\.length \? Math\.min\(GAME_DAILY_XP_CAP/);
  assert.match(game, /todayCallDateKey\(\) !== dayKey/);
  assert.match(game, /todayCallDateKey\(new Date\(call\.importedAt \|\| 0\)\) !== dayKey/);
  assert.match(game, /imported - ended <= 30 \* 60000/);
  assert.match(game, /Number\.isFinite\(lockedXp\) \? Math\.min\(rawXp, lockedXp\) : rawXp/);
  assert.match(game, /!\['manual', 'live'\]\.includes\(source\)/);
  assert.match(calls, /onGameCallSaved\(candidate, 'manual'\)/);
  assert.match(calls, /onGameCallSaved\(candidate, 'live'\)/);
  assert.doesNotMatch(calls, /onGameCallSaved\([^\n]*import/i);
});

test('después de derrotar no entra XP nuevo pero sí se muestra botín extra', () => {
  const game = read('js/game.js');
  const handler = game.slice(game.indexOf('export function onGameCallSaved'), game.indexOf('export function onGameGapSaved'));
  assert.match(handler, /currentDay\.defeated && xpLocked/);
  assert.match(handler, /showCallFx\(call, 0, critical, 'extra'\)/);
  assert.match(handler, /monster-defeat:\$\{dayKey\}/);
  assert.match(handler, /MONSTRUO DERROTADO/);
  assert.match(game, /if \(Number\.isFinite\(Number\(entry\.xpLocked\)\)\) return 0/);
  assert.match(game, /xpLocked: Number\(entry\.xpLocked\)/);
});

test('cierre y cofre son idempotentes, y el dinero secundario aparece en la experiencia', () => {
  const game = read('js/game.js');
  assert.match(game, /if \(existing\.finalized\) return existing/);
  assert.match(game, /const key = `chest:\$\{sealedOn\}`/);
  assert.match(game, /if \(!state\.game\.ledger\[key\]\)/);
  assert.match(game, /state\.game\.chest = \{ pending: false, sealedOn: null \}/);
  assert.match(game, /if \(snapshot\.stats\.total \|\| snapshot\.eligibleCalls\.length\)/);
  assert.match(game, /convertedAmountText/);
  assert.match(game, /function withConversion/);
  assert.match(game, /withConversion\(parseMoney\(call\.pay\)\)/);
  assert.match(game, /withConversion\(snapshot\.stats\.earnings\)/);
});

test('CSS de juego cubre motion reducido, layout estrecho y responsive', () => {
  const css = read('css/game.css');
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /animation:\s*none\s*!important/);
  assert.match(css, /transition:\s*none\s*!important/);
  assert.match(css, /@media\s*\(max-width:\s*760px\)/);
  assert.match(css, /@media\s*\(max-width:\s*520px\)/);
  assert.match(css, /min-width:\s*0/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
});

test('build mantiene módulos fuente fuera de public y el worker precarga el CSS de juego', () => {
  const build = read('scripts/build.mjs');
  const worker = read('js/service-worker.js');
  assert.match(build, /sourcemap:\s*false/);
  assert.match(build, /inlineDynamicImports:\s*true/);
  assert.match(build, /Build listo en public\/ sin sourcemaps ni módulos fuente/);
  assert.match(build, /cp\(path\.join\(root, 'css'\), path\.join\(out, 'css'\)/);
  assert.match(worker, /const SHELL = \[/);
  assert.match(worker, /['"]\/css\/game\.css['"]/);

  const publicRoot = path.join(root, 'public');
  if (fs.existsSync(publicRoot)) {
    assert.equal(fs.existsSync(path.join(publicRoot, 'css', 'game.css')), true);
    assert.equal(fs.existsSync(path.join(publicRoot, 'js')), false);
    const files = [];
    const visit = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) visit(file);
        else files.push(file);
      }
    };
    visit(publicRoot);
    assert.deepEqual(files.filter((file) => file.endsWith('.map')), []);
  }
});

test('gamificación apagada respeta hidden y el render conserva la estructura visual', () => {
  const css = read('css/game.css');
  const game = read('js/game.js');
  assert.match(css, /\.game-chip\[hidden\][\s\S]*display:\s*none\s*!important/);
  assert.match(css, /\.game-loot-box\[hidden\]/);
  assert.match(css, /\.game-arena\[hidden\]/);
  assert.match(css, /\.monster-layer--face/);
  assert.match(game, /gameStreakValue/);
  assert.match(game, /gameComboValue/);
  assert.match(game, /gameLevelValue/);
  assert.doesNotMatch(game, /element\.innerHTML = html/);
  assert.match(game, /profile\.querySelector/);
  assert.match(game, /root\.dataset\.gameState = monsterState/);
  assert.match(game, /root\.dataset\.gameIntensity = subtle \? 'subtle' : 'arcade'/);
  assert.match(game, /root\.removeAttribute\('data-game-state'\)/);
});

test('Logros conserva las tarjetas de app.html y solo actualiza sus nodos internos', () => {
  const game = read('js/game.js');
  assert.doesNotMatch(game, /summary\.innerHTML\s*=/);
  assert.doesNotMatch(game, /streakRoot\.innerHTML\s*=/);
  assert.doesNotMatch(game, /levelRoot\.innerHTML\s*=/);
  assert.doesNotMatch(game, /trophies\.innerHTML\s*=/);
  assert.doesNotMatch(game, /records\.innerHTML\s*=/);
  assert.doesNotMatch(game, /last\.innerHTML\s*=/);
  assert.match(game, /data-game-role=["\']bestiary-list/);
  assert.match(game, /data-game-role=["\']trophy-list/);
  assert.match(game, /data-game-role=["\']records-list/);
  assert.match(game, /data-game-stat=["\']\$\{key\}/);
  assert.match(game, /collection:\s*String\(seen\.size\)/);
  assert.match(game, /data-game-action=["\']open-last-clear/);
});


test('edición y borrado reconcilian XP congelado sin dejar progreso fantasma', () => {
  const game = read('js/game.js');
  const calls = read('js/calls.js');
  const appMain = read('js/app-main.js');
  assert.match(game, /export function onGameCallsChanged\(dayKey\)/);
  assert.match(game, /computeGameDay\(normalizedDayKey, \{ ignoreLock: true \}\)/);
  assert.match(game, /state\.game\.totalXp = Math\.max\(0, state\.game\.totalXp \+ nextXp - oldXp\)/);
  assert.match(calls, /onGameCallsChanged\(affectedDayKey\)/);
  assert.match(calls, /onGameCallsChanged\(dayKey\)/);
  assert.match(appMain, /onGameCallsChanged\(dayKey\)/);
});

test('STAGE CLEAR reversible restaura escudos y racha, y conserva snapshot consistente', () => {
  const game = read('js/game.js');
  assert.match(game, /shieldsBefore/);
  assert.match(game, /bestStreakBefore/);
  assert.match(game, /streakShieldAwardedKey/);
  assert.match(game, /entry\.xpBreakdown \|\| fallback\.xpBreakdown/);
  assert.match(game, /entry\.earnings/);
  assert.match(game, /recomputeBestStreak\(\)/);
});

test('avisos y modales de juego se recuperan al cerrar', () => {
  const game = read('js/game.js');
  const appMain = read('js/app-main.js');
  assert.match(game, /app:modal-closed/);
  assert.match(appMain, /new CustomEvent\('app:modal-closed'/);
  assert.match(appMain, /closeModal\('stageClearModal'\)/);
  assert.match(appMain, /closeModal\('chestModal'\)/);
});

test('Logros muestra accesorios y cofre pendiente, y racha de Reportes respeta escudos', () => {
  const game = read('js/game.js');
  const reports = read('js/reports.js');
  assert.match(game, /game-accessory-card/);
  assert.match(game, /pending-chest/);
  assert.match(game, /nextUnownedAccessory/);
  assert.match(reports, /state\.game\?\.days\?\.\[dayKey\]\?\.shieldUsed/);
});

test('XP flotante representa concesión real y distingue XP sellado', () => {
  const game = read('js/game.js');
  assert.match(game, /const grantedXp = Math\.max\(0, currentDay\.xp - beforeCallXp\)/);
  assert.match(game, /XP DIARIO SELLADO/);
  assert.match(game, /BOTÍN EXTRA/);
});


test('pendientes finales de Phase 6 quedan conectados a comportamiento real', () => {
  const game = read('js/game.js');
  const css = read('css/game.css');

  assert.match(game, /if \(!arcadeEnabled\(\)\) \{[\s\S]*game-live-xp-float/);
  assert.match(game, /triggerGameEvent\('gameArena', 'clear'/);
  assert.match(game, /classList\.toggle\('is-revealing', arcadeEnabled\(\)\)/);
  assert.match(css, /game-arena--arcade\[data-game-event="clear"\]/);
  assert.match(css, /@keyframes game-pixel-burst/);

  assert.match(game, /game-stage-comparisons/);
  assert.match(game, /Récord diario previo/);
  assert.match(game, /XP para nivel/);
  assert.match(game, /stageComparisonSnapshot/);

  assert.match(game, /NUEVO RÉCORD · Racha/);
  assert.match(game, /Cofre abierto ·/);
  assert.match(game, /syncCycleBossAchievement/);
  assert.match(game, /cycle-defeat:\$\{endKey\}/);
});

test('consistencia de gamificación se mantiene aunque esté apagada', () => {
  const game = read('js/game.js');
  const changed = game.slice(game.indexOf('export function onGameCallsChanged'), game.indexOf('export function onGameShiftAlarmFired'));
  const started = game.slice(game.indexOf('export function onGameShiftStarted'), game.indexOf('function stageComparisonSnapshot'));
  assert.doesNotMatch(changed, /if \(!gameEnabled\(\)\) return false/);
  assert.match(changed, /const enabled = gameEnabled\(\)/);
  assert.match(started, /revokeStageClear\(dayKey, \{ silent: !enabled \}\)/);
});

test('modo sutil no reproduce pop ni sonido y reduced-motion solo elimina movimiento', () => {
  const game = read('js/game.js');
  const tone = game.slice(game.indexOf('function playGameTone'), game.indexOf('function triggerGameEvent'));
  assert.match(tone, /if \(!arcadeEnabled\(\)\) return/);
  assert.doesNotMatch(tone, /prefers-reduced-motion/);
});
