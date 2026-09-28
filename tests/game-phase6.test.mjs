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


test('edición y borrado corrigen datos sin reescribir XP ya congelado por STAGE CLEAR', () => {
  const game = read('js/game.js');
  const calls = read('js/calls.js');
  assert.match(game, /STAGE CLEAR congela XP/);
  const changed = game.slice(game.indexOf('export function onGameCallsChanged'), game.indexOf('export function onGameShiftAlarmFired'));
  assert.doesNotMatch(changed, /state\.game\.totalXp\s*=/);
  assert.doesNotMatch(changed, /entry\.xp\s*=/);
  assert.match(changed, /entry\.earnings\s*=/);
  assert.match(changed, /entry\.monster\s*=/);
  assert.match(calls, /onGameCallsChanged\(affectedDayKey\)/);
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


test('simulación mensual: pegar llamadas usa hooks de juego y reemplaza live provisional', () => {
  const appMain = read('js/app-main.js');
  const calls = read('js/calls.js');
  const game = read('js/game.js');

  assert.match(appMain, /isReplaceableLiveCall/);
  assert.match(appMain, /source:\s*'import'/);
  assert.match(appMain, /onGameCallSaved\(item\.call, 'import'\)/);
  assert.match(appMain, /importedDates\.forEach\(dayKey => onGameCallsChanged\(dayKey\)\)/);
  assert.match(calls, /source:\s*'live'/);
  assert.match(calls, /source:\s*'manual'/);
  assert.match(game, /\['manual', 'live', 'import'\]/);
});

test('simulación mensual: llamadas y Break Lunch no pueden ocupar los mismos minutos', () => {
  const appMain = read('js/app-main.js');
  assert.match(appMain, /subtractCallsFromPauseInterval/);
  assert.match(appMain, /pauseDurationExcludingCalls/);
  assert.match(appMain, /if \(state\.activeCall\) return true/);
  assert.match(appMain, /Termina la llamada antes de iniciar Break\/Lunch/);
  assert.match(appMain, /terminado automáticamente al iniciar la llamada/);
});

test('simulación mensual: llamada no salta ventana temprana ni reescribe entrada salida manual', () => {
  const appMain = read('js/app-main.js');
  const startCall = appMain.slice(appMain.indexOf('function startCall()'), appMain.indexOf('function endCall()'));
  assert.match(startCall, /shiftStartTooEarly\(\)/);
  assert.match(appMain, /Las sesiones explícitas mandan/);
  assert.match(appMain, /startIsAutomatic/);
  assert.match(appMain, /endIsAutomatic/);
});

test('simulación mensual: XP solo para llamadas productivas ya terminadas', () => {
  const game = read('js/game.js');
  const eligibility = game.slice(game.indexOf('function callIsXpEligible'), game.indexOf('function plannedPauseCount'));
  assert.match(eligibility, /countsAsProductive/);
  assert.match(eligibility, /billable/);
  assert.match(eligibility, /dropped/);
  assert.match(eligibility, /lag >= 0/);
  assert.match(eligibility, /lag <= 30 \* 60000/);
});

test('simulación mensual: llamada manual futura se rechaza y live conserva segundos', () => {
  const calls = read('js/calls.js');
  assert.match(calls, /La hora de la llamada no puede estar en el futuro/);
  assert.match(calls, /Math\.round\(\(elapsedMs \/ 60000\) \* 100\) \/ 100/);
  assert.doesNotMatch(calls, /Math\.max\(1, Math\.round\(\(new Date\(endedAtISO\)/);
});


test('segunda simulación mensual: importaciones tardías no dan XP indirecto', () => {
  const game = read('js/game.js');
  const compute = game.slice(game.indexOf('export function computeGameDay'), game.indexOf('function yesterdayShadowPct'));
  assert.match(compute, /const xpStats = importedCallStats\(eligibleCalls, dayKey\)/);
  assert.match(compute, /missionSnapshot\(dayKey, xpStats/);
  assert.match(compute, /xpStats\.productive/);
  assert.match(compute, /const rawXp = eligibleCalls\.length/);
});

test('segunda simulación mensual: segunda sesión reabre el cierre antes de volver a congelar', () => {
  const game = read('js/game.js');
  const started = game.slice(game.indexOf('export function onGameShiftStarted'), game.indexOf('function stageComparisonSnapshot'));
  assert.match(started, /hadFinalizedDay/);
  assert.match(started, /revokeStageClear\(dayKey, \{ silent: true \}\)/);
  assert.match(started, /STAGE CLEAR reabierto/);
});

test('segunda simulación mensual: caja y combo se reconcilian al corregir una live', () => {
  const game = read('js/game.js');
  assert.match(game, /function reconcileLiveComboAndLoot/);
  assert.match(game, /rollbackLootReceipt/);
  assert.match(game, /latestOtherGapResetTime/);
  assert.match(game, /state\.game\.live\.combo = eligible/);
  assert.match(game, /receipt = \{ type: 'accessory'/);
});

test('segunda simulación mensual: Propio puede corregir una llamada ya importada', () => {
  const appMain = read('js/app-main.js');
  assert.match(appMain, /sameImportedCallIdentity/);
  assert.match(appMain, /replacementKind: 'import'/);
  assert.match(appMain, /item\.replaces\.importedAt \|\| importTs/);
  assert.match(appMain, /oficial\(es\) corregida\(s\)/);
});

test('segunda simulación mensual: finalizar turno no cierra si falla el guardado de la llamada', () => {
  const appMain = read('js/app-main.js');
  const calls = read('js/calls.js');
  assert.match(calls, /return true;[\s\S]*openManualCallModalFromLiveCall[\s\S]*return false;/);
  assert.match(appMain, /const saved = endCall\(\);/);
  assert.match(appMain, /if \(saved\) endShift\(\)/);
});

test('segunda simulación mensual: ninguna llamada manual editada o pegada puede terminar en el futuro', () => {
  const calls = read('js/calls.js');
  const appMain = read('js/app-main.js');
  assert.match(calls, /new Date\(candidate\.endISO\)\.getTime\(\) > Date\.now\(\)/);
  assert.match(calls, /if \(end\.getTime\(\) > Date\.now\(\)\)/);
  assert.match(appMain, /const endsAt = new Date\(c\.endISO\)\.getTime\(\)/);
  assert.match(appMain, /endsAt > importNow/);
});

test('segunda simulación mensual: descartar no reinicia ACW y reemplazar live corrige su fin', () => {
  const appMain = read('js/app-main.js');
  const discard = appMain.slice(appMain.indexOf('function discardActiveCall()'), appMain.indexOf('function discardActivePause()'));
  assert.doesNotMatch(discard, /lastCallEndedAt\s*=/);
  assert.match(appMain, /state\.lastCallEndedAt = item\.call\.endISO/);
});

test('segunda simulación mensual: STAGE CLEAR usa el día del inicio del turno al cruzar medianoche', () => {
  const appMain = read('js/app-main.js');
  const game = read('js/game.js');
  assert.match(appMain, /const shiftDayKey = todayCallDateKey\(new Date\(state\.shiftStartedAt\)\)/);
  assert.match(appMain, /onGameShiftEnded\(shiftDayKey\)/);
  assert.match(game, /export function onGameShiftEnded\(dayKey = todayCallDateKey\(\)\)/);
});


test('tercera simulación mensual: Finanzas nunca queda sobreasignada al bajar ganancias', () => {
  const finance = read('js/finance.js');
  const calls = read('js/calls.js');
  const appMain = read('js/app-main.js');
  assert.match(finance, /function financeTrimAssignmentsToEarnings/);
  assert.match(finance, /reverseAllocationOrder/);
  assert.match(finance, /export function financeReconcileAssignmentsToEarnings/);
  assert.match(finance, /const trimmed = financeTrimAssignmentsToEarnings\(\)/);
  assert.match(calls, /financeRunAutoFillCascade\(\);[\s\S]*saveAll\(\);[\s\S]*onGameCallsChanged/);
  assert.match(appMain, /function applyImportedPayload[\s\S]*financeRunAutoFillCascade\(\)/);
});

test('tercera simulación mensual: reset y vaciado limpian estados derivados sin romper XP congelado', () => {
  const game = read('js/game.js');
  const appMain = read('js/app-main.js');
  assert.match(game, /export function onGameDayReset/);
  assert.match(game, /delete state\.game\.days\[normalized\]/);
  assert.match(game, /entry\.callCount === 0 && state\.game\.chest\.pending/);
  assert.match(game, /if \(entry\.finalized \|\| Number\.isFinite/);
  assert.match(appMain, /onGameDayReset\(dayKey\)/);
  assert.match(appMain, /delete state\.dayInterruptions\[normalizedDayKey\]/);
  assert.match(appMain, /state\.lastCallEndedAt = null/);
});

test('tercera simulación mensual: gamificación apagada no revoca cierre y filas de cero minutos no dan XP', () => {
  const game = read('js/game.js');
  const eligibility = game.slice(game.indexOf('function callIsXpEligible'), game.indexOf('function plannedPauseCount'));
  const started = game.slice(game.indexOf('export function onGameShiftStarted'), game.indexOf('function stageComparisonSnapshot'));
  assert.match(eligibility, /Number\(call\.durationMin\) > 0/);
  assert.match(eligibility, /call\.shiftDayKey/);
  assert.match(started, /if \(enabled && hadFinalizedDay\)/);
  assert.doesNotMatch(started, /if \(hadFinalizedDay\) \{\s*revokeStageClear/);
});

test('tercera simulación mensual: turno nocturno conserva día contable y correcciones oficiales', () => {
  const calls = read('js/calls.js');
  const appMain = read('js/app-main.js');
  assert.match(calls, /const accountingCallDate = belongsToTrackedShift/);
  assert.match(calls, /shiftDayKey: accountingCallDate/);
  assert.match(appMain, /calendarCallDate: call\.callDate, callDate: activeShiftDayKey, shiftDayKey: activeShiftDayKey/);
  assert.match(appMain, /shiftDayKey: replacingLive/);
  assert.match(appMain, /startISO ya contiene la fecha real/);
});

test('tercera simulación mensual: horario y meta históricos quedan congelados antes de cambios globales', () => {
  const appMain = read('js/app-main.js');
  const schedule = read('js/schedule.js');
  const settings = read('js/settings.js');
  assert.match(appMain, /export function snapshotHistoricalPlanning/);
  assert.match(appMain, /settings\.scheduleHistoryByDay/);
  assert.match(appMain, /settings\.goalHistoryByDay/);
  assert.match(appMain, /const historical = normalized && settings\.scheduleHistoryByDay/);
  assert.match(appMain, /const historical = normalized && settings\.goalHistoryByDay/);
  assert.match(schedule, /snapshotHistoricalPlanning\(\)/);
  assert.match(settings, /snapshotHistoricalPlanning\(\);[\s\S]*settings\.productiveGoalMin/);
});

test('tercera simulación mensual: recompensas financieras son reversibles', () => {
  const game = read('js/game.js');
  assert.match(game, /function rollbackFinanceReward/);
  assert.match(game, /state\.game\.trophies = state\.game\.trophies\.filter/);
  assert.match(game, /accessory: accessory \|\| null/);
  assert.match(game, /!validMetaKeys\.has\(key\)/);
  assert.match(game, /!validPaidKeys\.has\(key\)/);
});

test('tercera simulación mensual: ACW se recalcula al editar borrar o vaciar llamadas', () => {
  const calls = read('js/calls.js');
  assert.match(calls, /function reconcileLastCallEndedAt/);
  assert.match(calls, /reconcileLastCallEndedAt\(affectedDayKey\)/);
  assert.match(calls, /reconcileLastCallEndedAt\(dayKey\)/);
});

test('tercera simulación mensual: pegar llamadas de hoy vuelve a auto iniciar el turno', () => {
  const appMain = read('js/app-main.js');
  const importing = appMain.slice(appMain.indexOf('function importCalls()'), appMain.indexOf('function clearCallInputBox'));
  assert.match(importing, /autoStartShiftFromCalls\(true\)/);
  assert.match(importing, /!state\.shiftStartedAt && !state\.shiftEndedAt/);
});

test('tercera simulación mensual: editar estado manual del día reconcilia gamificación', () => {
  const appMain = read('js/app-main.js');
  const game = read('js/game.js');
  assert.match(appMain, /onGameDayMetadataChanged\(normalized\)/);
  assert.match(game, /export function onGameDayMetadataChanged/);
  assert.match(game, /state\.game\.bestStreak = recomputeBestStreak\(\)/);
});


test('runtime smoke: helpers de renderGame existen para Logros y Higher Rate', () => {
  const game = read('js/game.js');
  for (const name of ['gameStreak', 'recomputeBestStreak', 'gameLevelProgress', 'withConversion', 'monsterStateFor', 'monsterVariantFor']) {
    assert.match(game, new RegExp('function\\s+' + name + '\\s*\\('), name + ' debe existir');
  }
  const appMain = read('js/app-main.js');
  const higherRate = read('js/higher-rate.js');
  assert.match(appMain, /if \(page === 'achievements'\) renderGame\(\)/);
  assert.match(higherRate, /export function addHigherRateWindowRow\(\)/);
  assert.match(higherRate, /saveHigherRateWindowsFromEditor\(\)/);
});


test('cuarta simulación mensual: llamadas live antes y después del turno nunca quedan bloqueadas', () => {
  const appMain = read('js/app-main.js');
  const startCall = appMain.slice(appMain.indexOf('function startCall()'), appMain.indexOf('function toggleCall()', appMain.indexOf('function startCall()')));
  const disabled = appMain.slice(appMain.indexOf('function callActionDisabled()'), appMain.indexOf('function callActionTimer()', appMain.indexOf('function callActionDisabled()')));
  assert.doesNotMatch(startCall, /shiftStartTooEarly\(\)/);
  assert.match(startCall, /const needsAutoShift = !state\.shiftStartedAt \|\| !!state\.shiftEndedAt/);
  assert.match(startCall, /Shift iniciado automáticamente por llamada/);
  assert.doesNotMatch(disabled, /state\.shiftEndedAt/);
});

test('cuarta simulación mensual: descartar la primera live revierte el turno que esa llamada abrió', () => {
  const appMain = read('js/app-main.js');
  assert.match(appMain, /autoStartedShift: needsAutoShift/);
  assert.match(appMain, /previousShiftStartedAt/);
  assert.match(appMain, /previousShiftEndedAt/);
  assert.match(appMain, /state\.events = state\.events\.filter\(event => event\?\.id !== discarded\.autoShiftEventId\)/);
  assert.match(appMain, /state\.shiftStartedAt = discarded\.previousShiftStartedAt \|\| null/);
});

test('cuarta simulación mensual: llamada manual de hoy auto inicia turno igual que pegar llamadas', () => {
  const calls = read('js/calls.js');
  assert.match(calls, /autoStartShiftFromCalls/);
  assert.match(calls, /callDate === todayCallDateKey\(\) && !state\.shiftStartedAt && !state\.shiftEndedAt/);
  assert.match(calls, /autoStartShiftFromCalls\(true\)/);
});

test('cuarta simulación mensual: backup JSON realmente incluye y restaura settings', () => {
  const appMain = read('js/app-main.js');
  const html = read('app.html');
  assert.match(appMain, /schemaVersion: 2, state, calls, settings/);
  assert.match(appMain, /settings = restoredSettings/);
  assert.match(appMain, /backups viejos \(sin settings\)/i);
  assert.match(html, /respaldo completo: llamadas, turnos, pausas, horario, metas, Finanzas, Higher Rate, gamificación y ajustes/);
});


test('cuarta simulación mensual: Higher Rate cruza medianoche sin perder bonos', () => {
  const hr = read('js/higher-rate.js');
  assert.match(hr, /function higherRateWindowBounds/);
  assert.match(hr, /endMin === startMin/);
  assert.match(hr, /end = new Date\(end\.getFullYear\(\), end\.getMonth\(\), end\.getDate\(\) \+ 1/);
  assert.match(hr, /const windows = settings\.higherRateWindows \|\| \[\]/);
  assert.doesNotMatch(hr, /filter\(w => w\.date === call\.callDate\)/);
  assert.match(hr, /const bounds = higherRateWindowBounds\(w\)/);
  assert.doesNotMatch(hr, /todavía no se soporta, no aplicará a ninguna llamada/);
});


test('cuarta simulación mensual: llamadas antes o después del checkpoint cuentan como presencia sin mover Entrada/Salida', () => {
  const appMain = read('js/app-main.js');
  assert.match(appMain, /function callPresenceIntervalsForDay/);
  assert.match(appMain, /function presenceIntervalsForDay/);
  assert.match(appMain, /presenceIntervalsForDay\(normalized, sessions\)/);
  assert.match(appMain, /callsForDay\(normalized\)\.forEach\(call =>/);
  assert.match(appMain, /return mergeIntervals\(intervals\)\.reduce/);
  assert.match(appMain, /Las sesiones explícitas mandan/);
});


test('cuarta simulación mensual: descartar live también revierte efectos de gamificación del auto-turno', () => {
  const appMain = read('js/app-main.js');
  assert.match(appMain, /const gameBeforeAutoShift = needsAutoShift[\s\S]*onGameShiftStarted\(\{ continued: false \}\)[\s\S]*gameBeforeAutoShift,/);
  assert.match(appMain, /discarded\.gameBeforeAutoShift/);
});
