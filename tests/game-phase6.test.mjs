import test from 'node:test';
import { beforeEach } from 'node:test';
import { callPayMinutes } from '../js/pay-estimate.js';
import { translateText, ui, displayLocale } from '../js/i18n.js';
import assert from 'node:assert/strict';

// Keep Date.now() and generated call-day keys deterministic across midnight.
beforeEach(t => t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-10T18:00:00Z') }));
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setAppCalls, setAppSettings, setAppState } from '../js/app-context.js';
import { ACCESSORY_CATALOG, computeGameDay, configureGameContext, createDefaultGameState, normalizeGameState, onGameCallSaved, onGameCallsChanged } from '../js/game.js';
import { configurePositiveReinforcementContext, createDefaultReinforcementState, normalizeReinforcementState } from '../js/positive-reinforcement.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replaceAll('\r\n', '\n');
const between = (source, startMarker, endMarker) => source.slice(source.indexOf(startMarker), source.indexOf(endMarker, source.indexOf(startMarker)));

function validCallDate(key) {
  const match = String(key).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const date = new Date(Number(match[3]), Number(match[1]) - 1, Number(match[2]));
  return date.getFullYear() === Number(match[3]) && date.getMonth() === Number(match[1]) - 1 && date.getDate() === Number(match[2]) ? date : null;
}

test('Fase 6 expone el catálogo semanal y renderiza SVG seguro para todos los estados', async () => {
  const monstersSource = read('js/monsters.js');
  assert.match(monstersSource, /from '\.\/i18n\.js'/);
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
    'gameEnabledInput', 'sidebarAchievementsInput', 'gameSettingsProfile',
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

test('Logros simplifica ajustes, comparte activación lateral y admite nombre personalizado seguro', () => {
  const html = read('app.html');
  const achievements = between(html, '<div class="app-page game-achievements-page"', '</div><!-- /pageAchievements -->');
  const gameEditor = between(achievements, '<details class="game-panel game-settings-accordion" id="gameSettingsAccordion">', '<details class="game-settings-accordion game-reward-settings" id="positiveRewardsAccordion">');
  const settingsModal = between(html, '<div aria-hidden="true" class="modal-overlay" id="goalsModal">', '<div aria-hidden="true" class="modal-overlay game-modal-overlay" id="stageClearModal">');
  const allIds = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(allIds.filter((id, index) => allIds.indexOf(id) !== index), []);
  assert.doesNotMatch(achievements, /gameDailyFocus|gameIntensityInput|positiveWeeklyBudgetInput/);
  assert.match(achievements, /id="gameEnabledInput"/);
  assert.match(gameEditor, /id="monsterNameInput"[^>]*maxlength="60"/);
  assert.match(gameEditor, /id="monsterNameSaveBtn"/);
  assert.equal((gameEditor.match(/<option\b/g) || []).length, 0);
  for (const id of [
    'gameEnabledInput', 'gameIntensityInput', 'gameSettingsProfile', 'positiveReinforcementEnabledInput',
    'positiveAskAfterCallInput', 'positiveWeeklyBudgetInput', 'physicalRewardSelected', 'physicalRewardCatalog',
  ]) assert.doesNotMatch(settingsModal, new RegExp(`\\bid="${id}"`), `#${id} should be under Logros`);
  const game = read('js/game.js');
  const sanitizerSource = between(game, 'function sanitizeMonsterName(value)', '\n\nfunction ensureGameSettings');
  const sanitize = new Function(`${sanitizerSource}; return sanitizeMonsterName;`)();
  assert.equal(sanitize('  Ogre\u0001<script>  '), 'Ogre<script>');
  assert.equal(sanitize('😀'.repeat(70)), '😀'.repeat(60));
  assert.equal(sanitize({ name: 'no' }), '');
  assert.doesNotMatch(game, /intensity === 'off'\) settings\.game\.enabled = false/);
  assert.match(game, /config\.monsterName = name/);
  assert.match(game, /monsterNameInput'\)\?\.addEventListener\('input'/);
  assert.match(game, /lastSettingsMonsterName !== savedMonsterName/);
  assert.match(game, /monsterName && !monsterNameDraftDirty && document\.activeElement !== monsterName/);
  assert.match(game, /variant, displayName, day\.combo, day\.stats\.earnings/);
  assert.match(game, /Monstruo derrotado: \$\{monsterName\}/);
  assert.match(game, /monsterImageLabel/);
});

test('state y settings conservan defaults y normalización de Fase 6', () => {
  const game = read('js/game.js');
  const appMain = read('js/app-main.js');
  assert.match(game, /export function createDefaultGameState\(\)/);
  assert.match(game, /chest: \{ pending: false, sealedOn: null \}/);
  assert.match(game, /live: \{ dayKey: null, combo: 0, shiftAlarmAt: null \}/);
  assert.match(game, /export function normalizeGameState\(raw\)/);
  assert.match(game, /shields: boundedGameNumber\(source\.shields, GAME_SHIELD_CAP, true\)/);
  assert.doesNotMatch(game, /intensity === 'off'\) settings\.game\.enabled = false/);
  assert.match(appMain, /game: createDefaultGameState\(\)/);
  assert.match(appMain, /game: normalizeGameState\(src\.game\)/);
  assert.match(appMain, /game: \{ enabled: false, intensity: 'arcade', soundEnabled: true, soundVolume: 40 \}/);
  assert.match(game, /if \(typeof settings\.game\.enabled !== 'boolean'\) settings\.game\.enabled = false/);
});

test('XP solo entra por llamadas actuales y oportunas, con tope diario y lock de snapshot', () => {
  const game = read('js/game.js');
  const calls = read('js/calls.js');
  assert.match(game, /export const GAME_DAILY_XP_CAP = 150/);
  assert.match(game, /Math\.min\(GAME_DAILY_XP_CAP/);
  assert.match(game, /eligibleCalls\.length\s*\? Math\.min\(GAME_DAILY_XP_CAP/);
  assert.match(game, /const importedDay = todayCallDateKey\(new Date\(imported\)\)/);
  assert.match(game, /if \(importedDay === dayKey\) return true/);
  assert.match(game, /return callDateKeyFromValue\(call\.shiftDayKey\) === dayKey/);
  assert.match(game, /if \(lag < 0 \|\| lag > 30 \* 60000\) return false/);
  assert.match(game, /Number\.isFinite\(lockedXp\) \? Math\.min\(rawXp, lockedXp\) : rawXp/);
  assert.match(game, /!\['manual', 'live', 'import'\]\.includes\(source\)/);
  assert.match(calls, /onGameCallSaved\(candidate, pendingBackup \? 'live' : 'manual'\)/);
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
  assert.match(handler, /if \(currentDay\.defeated && xpLocked\)/);
  assert.match(handler, /showCallFx\(call, 0, critical, 'extra'\)/);
  assert.match(game, /xpLocked: Number\(entry\.xpLocked\)/);
});

test('el hook real conserva el botín XP de la quinta llamada al reconciliar y recargar', () => {
  const keyFor = (date = new Date()) => `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
  const parseDayKey = (value) => {
    const match = String(value ?? '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;
    const date = new Date(Number(match[3]), Number(match[1]) - 1, Number(match[2]));
    return date.getFullYear() === Number(match[3]) && date.getMonth() === Number(match[1]) - 1 && date.getDate() === Number(match[2]) ? date : null;
  };
  const dayKeyFromValue = (value) => {
    const raw = String(value ?? '').trim();
    if (parseDayKey(raw)) return raw;
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? keyFor(date) : null;
  };
  let currentState;
  let callRows = [];
  const currentSettings = {
    game: { enabled: true, intensity: 'subtle' },
    reinforcement: { enabled: false, askAfterCall: false, rewards: [] },
    adherenceGoalPct: 95,
  };
  const callsForDay = (dayKey) => callRows.filter((call) => dayKeyFromValue(call.shiftDayKey || call.callDate) === dayKey);
  const importedCallStats = (calls = []) => ({
    productive: calls.reduce((total, call) => total + (Number(call.durationMin) || 0), 0),
    total: calls.length, zeroCount: 0, dropped: 0, gapTotal: 0,
    earnings: calls.reduce((total, call) => total + (Number(call.pay) || 0), 0),
  });
  const effectiveDailyGoal = () => ({ min: 1000, usd: 10000 });
  const convertedAmountText = () => '';
  const escapeHtml = (value) => String(value);
  const saveStateOnly = () => {};
  const saveSettingsOnly = () => {};
  const toast = () => {};
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  globalThis.window = { matchMedia: () => ({ matches: true }) };
  globalThis.document = {
    activeElement: null,
    documentElement: { classList: { toggle() {} } },
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
  };
  setAppSettings(currentSettings);
  configureGameContext({
    callDateKeyFromValue: dayKeyFromValue,
    callsForDay,
    cycleEarningsForOffset: () => ({ earnings: 0, start: new Date(), end: new Date() }),
    effectiveCycleGoal: () => 1000,
    dayAdherence: () => ({ scorePct: 0, checkpoints: [] }),
    dayConfigFor: () => ({ blocks: [] }),
    effectiveDailyGoal,
    formatCallDayLabel: (value) => String(value),
    formatMinutes: (value) => String(value),
    computeComplianceStreak: () => ({ days: 0 }),
    higherRateBonusForCall: () => null,
    higherRateLiveStatus: () => ({ active: false }),
    importedCallStats,
    parseMoney: (value) => Number(value) || 0,
    saveStateOnly,
    todayCallDateKey: keyFor,
    weekdayKeyForDayKey: () => 'mon',
  });
  configurePositiveReinforcementContext({
    callDateKeyFromValue: dayKeyFromValue, callsForDay, closeModal: () => {}, convertedAmountText,
    effectiveDailyGoal, escapeHtml, importedCallStats, openModal: () => {}, saveSettingsOnly,
    saveStateOnly, toast, todayCallDateKey: keyFor,
  });

  const resetScenario = ({ bonusXp = 0, xpLocked } = {}) => {
    const game = createDefaultGameState();
    // Owning the entire catalog guarantees XP even on dates whose loot is cosmetic.
    game.accessories = ACCESSORY_CATALOG.map(item => item.label);
    game.days[keyFor()] = { bonusXp, ...(xpLocked === undefined ? {} : { xpLocked }) };
    currentState = { game, gapAnnotations: {} };
    callRows = [];
    setAppState(currentState);
    setAppCalls(callRows);
    const baseNow = Date.now() - 240000;
    for (let index = 0; index < 5; index++) {
      const start = baseNow + index * 20000;
      const end = start + 10000;
      const call = {
        id: `loot-call-${index + 1}`,
        callDate: keyFor(),
        shiftDayKey: keyFor(),
        billable: 'Yes',
        dropped: 'No',
        countsAsProductive: true,
        durationMin: 1,
        pay: 0,
        startISO: new Date(start).toISOString(),
        endISO: new Date(end).toISOString(),
        importedAt: new Date(end + 1000).toISOString(),
      };
      callRows.push(call);
      setAppCalls(callRows);
      onGameCallSaved(call, 'manual', { random: () => 0.99 });
    }
    return keyFor();
  };

  try {
    const dayKey = resetScenario();
    const lootKey = `loot:${dayKey}:5`;
    const receipt = currentState.game.ledger[lootKey];
    assert.equal(receipt.type, 'bonusXp');
    assert.ok(receipt.applied > 0, 'la quinta llamada debe aplicar XP por debajo del tope diario');
    assert.equal(currentState.game.days[dayKey].bonusXp, receipt.applied);
    assert.ok(computeGameDay(dayKey).xp < 150);

    currentState = { ...currentState, game: normalizeGameState(JSON.parse(JSON.stringify(currentState.game))) };
    setAppState(currentState);
    onGameCallsChanged(dayKey);
    assert.equal(currentState.game.ledger[lootKey].applied, receipt.applied);
    assert.equal(currentState.game.days[dayKey].bonusXp, receipt.applied);
    assert.equal(Object.keys(currentState.game.ledger).filter((key) => key.startsWith(`loot:${dayKey}:`)).length, 1);

    const lockedDay = resetScenario({ xpLocked: 80 });
    assert.equal(currentState.game.ledger[`loot:${lockedDay}:5`].applied, 0);
    assert.equal(currentState.game.days[lockedDay].bonusXp, 0);

    const cappedDay = resetScenario({ bonusXp: 150 });
    assert.equal(currentState.game.ledger[`loot:${cappedDay}:5`].applied, 0);
    assert.equal(currentState.game.days[cappedDay].bonusXp, 150);
  } finally {
    setAppState(null);
    setAppCalls([]);
    setAppSettings({});
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test('el bono manual de Higher Rate no se suma dos veces y los tiles conservan su efecto fuera de ventana', () => {
  const calls = read('js/calls.js');
  const helper = between(calls, 'function manualCallPayWithoutDuplicateRateBonus', 'export function saveManualCall');
  const calculateWithMinutes = new Function('callPayMinutes', 'HIGHER_RATE_TIERS', 'manualCallSelectedRateTile', 'higherRateBonusForCall', 'parseMoney', `${helper}; return manualCallPayWithoutDuplicateRateBonus;`);
  const calculate = (...args) => calculateWithMinutes(callPayMinutes, ...args);
  const tiers = { gold: { bonusPerMin: 0.04 } };
  const withinWindow = calculate(tiers, 'gold', () => ({ amount: 0.12 }), (value) => Number(value) || 0);
  const outsideWindow = calculate(tiers, 'gold', () => null, (value) => Number(value) || 0);
  const durationMin = 3;
  const estimatedGoldPay = 1.62;
  const normalizedBasePay = withinWindow({ durationMin }, estimatedGoldPay);
  assert.equal(Number(normalizedBasePay) + 0.12, estimatedGoldPay);
  assert.equal(outsideWindow({ durationMin }, estimatedGoldPay), estimatedGoldPay);
  assert.match(calls, /if \(!callStart\)\s*\{\s*toast\(translateText\('Elige una hora válida'\)\)/);
});

test('la hora manual vacía no se convierte en 07:00 y las horas futuras no se guardan ni reciben XP', () => {
  const calls = read('js/calls.js');
  const timeHelper = between(calls, 'function callStartLabelFromHHMM', '// El pago estimado');
  const formatHHMM = (value) => {
    const [hour, minute] = value.split(':').map(Number);
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  };
  const toLabel = new Function('formatHHMM', 'pad', 'translateText', `${timeHelper}; return callStartLabelFromHHMM;`)(formatHHMM, (value) => String(value).padStart(2, '0'), translateText);
  assert.equal(toLabel(''), null);
  assert.equal(toLabel('24:00'), null);
  assert.equal(toLabel('07:05'), '7:05 AM');
  assert.match(calls, /new Date\(candidate\.endISO\)\.getTime\(\) > Date\.now\(\)/);
  assert.match(calls, /La llamada no puede terminar en el futuro/);

  const game = read('js/game.js');
  const eligibilitySource = between(game, 'function callIsXpEligible', 'function plannedPauseCount');
  const now = new Date(2026, 8, 28, 12, 0, 0).getTime();
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const dayKeyFor = (date = new FixedDate()) => `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
  const eligible = new Function('todayCallDateKey', 'callDateKeyFromValue', 'Date', `return (${eligibilitySource});`)(dayKeyFor, value => value || null, FixedDate);
  const baseCall = { billable: 'Yes', dropped: 'No', durationMin: 1, importedAt: new FixedDate(now).toISOString(), startISO: new FixedDate(now - 120000).toISOString(), endISO: new FixedDate(now - 60000).toISOString() };
  assert.equal(eligible(baseCall, dayKeyFor()), true);
  assert.equal(eligible({ ...baseCall, startISO: new FixedDate(now + 60000).toISOString(), endISO: new FixedDate(now + 120000).toISOString() }, dayKeyFor()), false);
});

test('la normalización profunda contiene xp, estrellas, misiones y monstruo corruptos importados', () => {
  const game = read('js/game.js');
  const normalizerSource = between(game, 'export function createDefaultGameState()', '\n\nexport function xpThresholdForLevel').replace(/^export /gm, '');
  const catalog = { mon: { id: 'mon' }, tue: { id: 'tue' } };
  const normalize = new Function('GAME_DAILY_XP_CAP', 'GAME_SHIELD_CAP', 'GAME_DAY_LIMIT', 'callDateToDate', 'MONSTER_CATALOG', 'createDefaultReinforcementState', 'normalizeReinforcementState', `${normalizerSource}; return normalizeGameState;`)(150, 3, 400, validCallDate, catalog, createDefaultReinforcementState, normalizeReinforcementState);
  const payload = {
    totalXp: '<svg onload=alert(1)>',
    days: {
      '09/28/2026': {
        finalized: true,
        xp: '<img src=x onerror=alert(1)>',
        stars: -1,
        missions: '<script>alert(1)</script>',
        monster: { species: '<svg onload=alert(1)>', variant: '<script>', defeated: 'true', hpPct: 'NaN' },
      },
      '99/99/2026': { finalized: true, xp: 50, stars: 2 },
    },
  };
  const normalized = normalize(payload);
  const day = normalized.days['09/28/2026'];
  assert.equal(normalized.totalXp, 0);
  assert.deepEqual(Object.keys(normalized.days), ['09/28/2026']);
  assert.equal(day.xp, 0);
  assert.equal(day.stars, 0);
  assert.deepEqual(day.missions, []);
  assert.deepEqual(day.monster, { species: 'mon', variant: 'normal', defeated: false, hpPct: 0 });
  assert.doesNotMatch(JSON.stringify(normalized), /<script|onerror=|onload=/i);
});

test('derrota no debe seguir produciendo golpes/recompensas posteriores', () => {
  const game = read('js/game.js');
  const handler = game.slice(game.indexOf('export function onGameCallSaved'), game.indexOf('export function onGameGapSaved'));
  const defeatGuard = handler.indexOf('currentDay.defeated');
  const fx = handler.indexOf('showCallFx(call, grantedXp');
  const reward = handler.indexOf('rewardLootBox');
  assert.ok(defeatGuard >= 0, 'onGameCallSaved debe reconocer el estado derrotado');
  assert.ok(defeatGuard < fx, 'la derrota debe bloquear el feedback de golpe');
  assert.ok(defeatGuard < reward, 'la derrota debe bloquear recompensas posteriores');
  assert.match(game, /if \(entry\.finalized \|\| Number\.isFinite\(Number\(entry\.xpLocked\)\)\) return 0/);
  assert.match(game, /xpLocked: Number\(entry\.xpLocked\)/);
});

test('STAGE CLEAR bloquea recompensas posteriores y solo vuelve a habilitarse al revocar', () => {
  const game = read('js/game.js');
  const callHandler = between(game, 'export function onGameCallSaved', '\n\nexport function onGameGapSaved');
  const finalizedGuard = callHandler.indexOf('if (state.game.days[dayKey]?.finalized) {');
  assert.ok(finalizedGuard >= 0);
  for (const sideEffect of ['showCallFx(call, grantedXp, critical)', 'maybeShowRecord(call)', 'rewardLootBox(dayKey, count)']) {
    assert.ok(finalizedGuard < callHandler.indexOf(sideEffect), `${sideEffect} must stay behind the finalization guard`);
  }
  const gapHandler = between(game, 'export function onGameGapSaved', '\n\nexport function onGameShiftAlarmFired');
  assert.ok(gapHandler.indexOf('if (state.game.days[dayKey]?.finalized) {') < gapHandler.indexOf('state.game.ledger[key] = true'));
  assert.match(game, /state\.game\.days\[currentGameDayKey\(\)\]\?\.finalized/);
  const shiftStartHandler = between(game, 'export function onGameShiftStarted', 'function stageComparisonSnapshot');
  assert.ok(shiftStartHandler.indexOf('if (!state.game.days[dayKey]?.finalized) {') < shiftStartHandler.indexOf('const firedAt'));
  assert.match(game, /hasActivity: !!\(snapshot\.stats\.total \|\| snapshot\.eligibleCalls\.length\)/);
  assert.match(game, /earnings: Number\(snapshot\.stats\.earnings\) \|\| 0/);
  assert.match(game, /xpBreakdown: \{ \.\.\.snapshot\.xpBreakdown \}/);
  assert.match(game, /const breakdown = entry\.xpBreakdown \|\| fallback\.xpBreakdown/);
  assert.match(game, /rollback\.streakShieldAwardedKey && state\.game\.ledger\[rollback\.streakShieldAwardedKey\]/);
  assert.match(game, /if \(entry\.shieldUsed\) \{\s*state\.game\.shields = Math\.min\(GAME_SHIELD_CAP, state\.game\.shields \+ 1\)/);
  assert.doesNotMatch(game, /state\.game\.shields = Math\.max\(0, Math\.min\(GAME_SHIELD_CAP, Number\(rollback\.shieldsBefore\)\)\)/);
});

test('barras, misiones y racha exponen estado accesible', () => {
  const game = read('js/game.js');
  const html = read('app.html');
  assert.match(html, /aria-label="Progreso contra el jefe del ciclo" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"/);
  assert.match(html, /aria-label="Progreso hacia el siguiente nivel" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"/);
  assert.match(game, /parentElement\?\.setAttribute\('aria-valuenow', String\(Math\.round\(boss\.pct\)\)\)/);
  assert.match(game, /parentElement\?\.setAttribute\('aria-valuenow', String\(Math\.round\(level\.pct\)\)\)/);
  assert.match(game, /game-mission-grid" role="list" aria-label="Misiones del día"/);
  assert.match(game, /role="listitem" aria-label="\$\{escapeHtml\(ui`Misión/);
  assert.match(html, /game-streak-week" data-game-role="streak-week" role="list"/);
  assert.match(game, /cell\.setAttribute\('aria-label', label\)/);
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
  assert.match(game, /withConversion\(earnings\)/);
  assert.match(game, /money\(day\.stats\.earnings\)/);
  assert.match(game, /convertedAmountText\(day\.stats\.earnings\)/);
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
  const bundleOptions = read('scripts/bundle-entry.mjs');
  assert.match(bundleOptions, /sourcemap:\s*false/);
  assert.match(bundleOptions, /inlineDynamicImports:\s*true/);
  assert.match(build, /Build listo en public\/ sin sourcemaps ni módulos fuente/);
  assert.match(build, /cp\(path\.join\(root, 'css'\), path\.join\(out, 'css'\)/);
  assert.match(worker, /const SHELL = \[/);
  assert.match(worker, /`\/css\/game\.css\?v=\$\{BUILD_VERSION\}`/);

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
  assert.match(game, /root\.dataset\.gameIntensity = 'arcade'/);
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
  const changed = game.slice(game.indexOf('export function onGameCallsChanged'), game.indexOf('export function onGameDayReset'));
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
  assert.match(game, /data-game-role="chest-claim"/);
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

  assert.match(game, /if \(!arcadeEnabled\(\) \|\| window\.matchMedia[\s\S]*game-live-xp-float/);
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
  assert.match(started, /if \(hadFinalizedDay\)/);
  assert.match(started, /revokeStageClear\(dayKey, \{ silent: !enabled \}\)/);
});

test('Arcade fijo y reduced-motion solo elimina movimiento', () => {
  const game = read('js/game.js');
  const tone = between(game, 'function playGameTone', '\nconst gameEventVersions');
  assert.match(tone, /reinforcementFeedbackEnabled\(channel\)/);
  assert.match(tone, /dayKey === currentGameDayKey\(\)/);
  assert.match(tone, /playGameSound\(kind, \{ allowed, channel \}\)/);
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
  assert.match(appMain, /interruptedPauseRollback = endPause\(\{ silent: true, deferSave: true/);
});

test('simulación mensual: llamada no salta ventana temprana ni reescribe entrada salida manual', () => {
  const appMain = read('js/app-main.js');
  const startCall = appMain.slice(appMain.indexOf('function startCall('), appMain.indexOf('function endCall('));
  assert.doesNotMatch(startCall, /shiftStartTooEarly\(\)/);
  assert.match(startCall, /const needsAutoShift = !state\.shiftStartedAt \|\| !!state\.shiftEndedAt/);
  assert.match(appMain, /startIsAutomatic/);
  assert.match(appMain, /endIsAutomatic/);
});

test('simulación mensual: XP solo para llamadas productivas ya terminadas', () => {
  const game = read('js/game.js');
  const eligibility = game.slice(game.indexOf('function callIsXpEligible'), game.indexOf('function plannedPauseCount'));
  assert.match(eligibility, /countsAsProductive/);
  assert.match(eligibility, /billable/);
  assert.match(eligibility, /dropped/);
  assert.match(eligibility, /if \(lag < 0 \|\| lag > 30 \* 60000\) return false/);
});

test('simulación mensual: llamada manual futura se rechaza y live conserva segundos', () => {
  const calls = read('js/calls.js');
  assert.match(calls, /La llamada no puede terminar en el futuro/);
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
  assert.match(started, /revokeStageClear\(dayKey, \{ silent: !enabled \}\)/);
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
  assert.match(appMain, /replaceAcceptedCall\(c, previous, 'import'\)/);
  assert.match(appMain, /item\.replaces\.importedAt \|\| importTs/);
  assert.match(appMain, /oficial\(es\) corregida\(s\)/);
});

test('segunda simulación mensual: finalizar turno no cierra si falla el guardado de la llamada', () => {
  const appMain = read('js/app-main.js');
  const calls = read('js/calls.js');
  assert.match(calls, /return true;[\s\S]*openManualCallModalFromLiveCall[\s\S]*return false;/);
  assert.match(appMain, /if \(state\.activeCall && !endCall\(\)\) \{[^}]*return false; \}/);
  assert.match(appMain, /return endShift\(\);/);
});

test('segunda simulación mensual: ninguna llamada manual editada o pegada puede terminar en el futuro', () => {
  const calls = read('js/calls.js');
  const appMain = read('js/app-main.js');
  assert.match(calls, /new Date\(candidate\.endISO\)\.getTime\(\) > Date\.now\(\)/);
  assert.match(read('js/call-recovery.js'), /end\.getTime\(\) > Date\.now\(\)/);
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
  assert.match(game, /export function onGameShiftEnded\(dayKey = currentGameDayKey\(\)\)/);
});


test('tercera simulación mensual: Finanzas nunca queda sobreasignada al bajar ganancias', () => {
  const finance = read('js/finance.js');
  const calls = read('js/calls.js');
  const appMain = read('js/app-main.js');
  assert.match(finance, /function financeTrimAssignmentsToEarnings/);
  assert.match(finance, /reverseAllocationOrder/);
  assert.match(finance, /export function financeReconcileAssignmentsToEarnings/);
  assert.match(finance, /const trimmed = financeTrimAssignmentsToEarnings\(\)/);
  assert.match(calls, /financeRunAutoFillCascade\(\);[\s\S]*if \(saveAll\(\) === false\) \{[\s\S]*setAppState\(previous.state\)[\s\S]*return false;[\s\S]*onGameCallsChanged/);
  assert.match(appMain, /function applyImportedPayload[\s\S]*financeRunAutoFillCascade\(\)/);
});

test('tercera simulación mensual: reset y vaciado limpian estados derivados sin romper XP congelado', () => {
  const game = read('js/game.js');
  const appMain = read('js/app-main.js');
  assert.match(game, /export function onGameDayReset/);
  assert.match(game, /delete state\.game\.days\[normalized\]/);
  assert.match(game, /entry\.callCount === 0 && state\.game\.chest\.pending/);
  assert.match(game, /if \(entry\.finalized \|\| Number\.isFinite/);
  assert.match(appMain, /onGameDayReset\(normalizedDayKey \|\| dayKey\)/);
  assert.match(appMain, /delete state\.dayInterruptions\[normalizedDayKey\]/);
  assert.match(appMain, /state\.lastCallEndedAt = null/);
});

test('tercera simulación mensual: gamificación apagada mantiene consistencia y filas de cero minutos no dan XP', () => {
  const game = read('js/game.js');
  const eligibility = game.slice(game.indexOf('function callIsXpEligible'), game.indexOf('function plannedPauseCount'));
  const started = game.slice(game.indexOf('export function onGameShiftStarted'), game.indexOf('function stageComparisonSnapshot'));
  assert.match(eligibility, /Number\(call\.durationMin\) > 0/);
  assert.match(eligibility, /call\.shiftDayKey/);
  assert.match(started, /if \(hadFinalizedDay\)/);
  assert.match(started, /revokeStageClear\(dayKey, \{ silent: !enabled \}\)/);
});

test('tercera simulación mensual: turno nocturno conserva día contable y correcciones oficiales', () => {
  const calls = read('js/calls.js');
  const appMain = read('js/app-main.js');
  assert.match(calls, /const accountingCallDate = belongsToTrackedShift/);
  assert.match(calls, /shiftDayKey: accountingCallDate/);
  assert.match(appMain, /calendarCallDate: call\.callDate, callDate: activeShiftDayKey, shiftDayKey: activeShiftDayKey/);
  assert.match(appMain, /const replacingExisting = \(preserveOfficialIdentity \|\| replacingLive\) \? item\.replaces : null/);
  assert.match(appMain, /callDate: replacingExisting \? replacingExisting\.callDate : item\.call\.callDate/);
  assert.match(appMain, /shiftDayKey: replacingExisting/);
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
  const importing = appMain.slice(appMain.indexOf('function importCalls('), appMain.indexOf('function clearCallInputBox'));
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
  assert.match(higherRate, /export async function addHigherRateWindowRow\(\)/);
  assert.match(higherRate, /saveHigherRateWindowsFromEditor\(\)/);
});


test('cuarta simulación mensual: llamadas live antes y después del turno permiten días laborales y bloquean nuevos inicios en días libres', () => {
  const appMain = read('js/app-main.js');
  const startCall = appMain.slice(appMain.indexOf('function startCall('), appMain.indexOf('function endCall(', appMain.indexOf('function startCall(')));
  const disabled = appMain.slice(appMain.indexOf('function callActionDisabled()'), appMain.indexOf('function callActionTimer()', appMain.indexOf('function callActionDisabled()')));
  assert.doesNotMatch(startCall, /shiftStartTooEarly\(\)/);
  assert.match(startCall, /const needsAutoShift = !state\.shiftStartedAt \|\| !!state\.shiftEndedAt/);
  assert.match(startCall, /Shift iniciado automáticamente por llamada/);
  assert.doesNotMatch(disabled, /state\.shiftEndedAt/);
  assert.match(disabled, /!state\.activeCall && liveCallDayIsOff\(\)/);
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
  assert.match(calls, /const affectedDayKey = callDateKeyFromValue\(candidate\.callDate\) \|\| callDate/);
  assert.match(calls, /affectedDayKey === todayCallDateKey\(\) && !state\.shiftStartedAt && !state\.shiftEndedAt/);
  assert.match(calls, /autoStartShiftFromCalls\(true\)/);
});

test('cuarta simulación mensual: backup JSON realmente incluye y restaura settings', () => {
  const appMain = read('js/app-main.js');
  const html = read('app.html');
  assert.match(appMain, /schemaVersion: 2, state, calls, settings/);
  assert.match(appMain, /setAppSettings\(restoredSettings\)/);
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
  assert.match(appMain, /presenceIntervalsForDay\(normalized, sessions, lastSlotEnd\)/);
  assert.match(appMain, /callsForDay\(normalized\)\.forEach\(call =>/);
  assert.match(appMain, /return mergeIntervals\(intervals\)\.reduce/);
  assert.match(appMain, /function callPresenceIntervalsForDay/);
  assert.match(appMain, /return mergeIntervals\(intervals\)\.reduce/);
});


test('cuarta simulación mensual: descartar live también revierte efectos de gamificación del auto-turno', () => {
  const appMain = read('js/app-main.js');
  assert.match(appMain, /const gameBeforeAutoShift = needsAutoShift[\s\S]*gameBeforeAutoShift,[\s\S]*if \(needsAutoShift\) onGameShiftStarted\(\{ continued: false, captureState:/);
  assert.match(appMain, /discarded\.gameBeforeAutoShift/);
});


test('cuarta simulación mensual: gamificación nocturna no se parte a medianoche', () => {
  const game = read('js/game.js');
  assert.match(game, /function currentGameDayKey\(\)/);
  assert.match(game, /return todayCallDateKey\(startedAt\)/);
  assert.match(game, /ensureGameState\(preferredDayKey = null\)/);
  assert.match(game, /const dayKey = callDateKeyFromValue\(call\.shiftDayKey\)/);
  assert.match(game, /ensureGameState\(dayKey\)/);
  assert.match(game, /const dayKey = currentGameDayKey\(\);[\s\S]*computeGameDay\(dayKey\)/);
  assert.doesNotMatch(game, /onGameDayRollover\(\)[\s\S]{0,180}state\.game\.live = \{ dayKey: todayCallDateKey\(\)/);
});


test('promotion list opens its single editor and the editor previews the selected effect before saving', () => {
  const appMain = read('js/app-main.js');
  const higherRate = read('js/higher-rate.js');
  assert.match(higherRate, /export function hrWindowWeekdayLabel\(/);
  assert.match(higherRate, /export function hrTierButtonLabel\(/);
  assert.match(appMain, /hrTierButtonLabel,/);
  assert.match(appMain, /hrWindowWeekdayLabel,/);
  const clickHandler = appMain.slice(appMain.indexOf("document.getElementById('higherRateModal').addEventListener('click'"), appMain.indexOf("document.getElementById('daySelector').addEventListener('change'"));
  assert.match(clickHandler, /saveHigherRateWindowDraft\(/);
  assert.doesNotMatch(higherRate, /data-save-hr-window|data-review-hr-window/);
  assert.doesNotMatch(clickHandler, /saveHigherRateWindowsFromEditor\(\)/);
  const editor=read('js/higher-rate-review.js');
  assert.match(editor,/data-hr-field="date"/); assert.match(editor,/data-hr-field="tier"/);
  assert.match(editor,/data-hr-mode/); assert.match(editor,/context\.apply\(windowId, current.value, current.stamp, current.mode\)/);
});

test('quinta simulación mensual: descartar live iniciada durante Break Lunch restaura la pausa', () => {
  const appMain = read('js/app-main.js');
  assert.match(appMain, /let interruptedPauseRollback = null/);
  assert.match(appMain, /interruptedPauseRollback = endPause\(\{ silent: true, deferSave: true, endedAt: nowISO \}\)/);
  assert.match(appMain, /interruptedPauseRollback,/);
  assert.match(appMain, /rollback\.pauseHistoryId/);
  assert.match(appMain, /rollback\.pauseEndEventId/);
  assert.match(appMain, /state\.activePause = \{ \.\.\.rollback\.pause \}/);
});

test('quinta simulación mensual: respaldo live sobrevive refresh y descartar revierte turno ACW', () => {
  const appMain = read('js/app-main.js');
  const calls = read('js/calls.js');
  assert.match(appMain, /pendingLiveCallBackup: null/);
  assert.match(appMain, /autoSaveLiveCall\(startedAt, endedAt, liveContext\)/);
  assert.match(appMain, /restorePendingLiveCallBackup\(\);/);
  assert.match(calls, /state\.pendingLiveCallBackup = \{/);
  assert.match(calls, /export function restorePendingLiveCallBackup\(\)/);
  assert.match(calls, /function rollbackPendingLiveBackup\(\)/);
  assert.match(calls, /state\.shiftStartedAt = context\.previousShiftStartedAt \|\| null/);
  assert.match(calls, /reconcileLastCallEndedAt\(affectedDayKey\)/);
  assert.doesNotMatch(calls, /let manualCallLiveBackupPending = !!state\.pendingLiveCallBackup/);
});

test('quinta simulación mensual: respaldo live conserva duración decimal y día contable nocturno', () => {
  const calls = read('js/calls.js');
  assert.match(calls, /function callAccountingFields\(start, fallbackCallDate\)/);
  assert.match(calls, /const accountingCallDate = belongsToTrackedShift \? todayCallDateKey\(shiftStart\) : calendarCallDate/);
  assert.match(calls, /const accounting = callAccountingFields\(start, callDate\)/);
  assert.match(calls, /const accounting = callAccountingFields\(start, todayCallDateKey\(start\)\)/);
  assert.match(calls, /Math\.round\(\(elapsedMs \/ 60000\) \* 100\) \/ 100/);
  assert.doesNotMatch(calls, /durationMin = Math\.max\(1, Math\.round\(\(end\.getTime\(\) - start\.getTime\(\)\) \/ 60000\)\)/);
  assert.match(calls, /calendarDayKey = callDateKeyFromValue\(originalCandidate\?\.calendarCallDate\) \|\| todayCallDateKey\(start\)/);
  assert.match(calls, /source: 'live'/);
});

test('quinta simulación mensual: Break Lunch y reset respetan día contable de turno nocturno', () => {
  const appMain = read('js/app-main.js');
  assert.match(appMain, /function currentShiftAccountingDayKey\(fallbackDate = new Date\(\)\)/);
  assert.match(appMain, /state\.activePause = \{ type, startedAt: now\.toISOString\(\), shiftDayKey: dayKey \}/);
  assert.match(appMain, /const pauseRecord = \{ id: makeLocalId\(\), type: endedPause\.type, startedAt: endedPause\.startedAt, endedAt: now, shiftDayKey, startEventId:/);
  assert.match(appMain, /const resetsTrackedShift = trackedShiftDayKey === normalizedDayKey/);
  assert.match(appMain, /belongsToTrackedShift\(p\.startedAt\) \|\| belongsToTrackedShift\(p\.endedAt\)/);
  assert.match(appMain, /const accountingDay = callDateKeyFromValue\(e\?\.shiftDayKey\)/);
});
