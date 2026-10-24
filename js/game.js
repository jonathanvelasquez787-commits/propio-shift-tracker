import { ui, translateText, translateStoredText, translateMarkup, displayLocale } from './i18n.js';
import { callFeedbackSilenced } from './call-feedback.js';
import { calls, settings, state } from './app-context.js';
import { initGameAudio, playGameSound, previewGameSound, syncGameAudio, stopGameSounds, gameSoundsSilenced } from './game-audio.js';
import { battleWorkMode } from './game-duel.js';
import { battleMarkup, syncBattle, playBattleCall, stopBattle, normalizeBattleWeapon } from './game-battle.js';
import { financeReservationComplete } from './finance.js';
import { activeWorkSinceLastCall, monetaryMilestones, supportiveDayEvidence, surpriseDecision } from './reinforcement-rules.js';
import { chooseCallFeedback, configureReinforcementFeedback, normalizeInactivityMinutes, notifyReinforcement, reinforcementFeedbackEnabled, reinforcementText } from './reinforcement-feedback.js';
let reviewGame,appConfirm, callDateKeyFromValue, callDateToDate, callsForDay, closeModal, computeComplianceStreak, convertedAmountText;
let cycleBoundsForOffset, cycleEarningsForOffset, dayAdherence, dayComplianceStatus, dayConfigFor;
let dayIsEffectivelyOff, effectiveCycleGoal, effectiveDailyGoal, escapeHtml, financeConvertedInline;
let financeRowIsMeta, formatCallDayLabel, formatMinutes, higherRateBonusForCall, higherRateLiveStatus;
let importedCallStats, money, openModal, parseMoney, productiveMinutesForDay, saveSettingsOnly;
let saveStateOnly, todayCallDateKey, toast, weekdayKeyForDayKey, getReinforcementWorkIntervals, renderHeader;

export function configureGameContext(context) {
  reviewGame=context.reviewGame;
  ({ appConfirm, callDateKeyFromValue, callDateToDate, callsForDay, closeModal, computeComplianceStreak, convertedAmountText,
    cycleBoundsForOffset, cycleEarningsForOffset, dayAdherence, dayComplianceStatus, dayConfigFor,
    dayIsEffectivelyOff, effectiveCycleGoal, effectiveDailyGoal, escapeHtml, financeConvertedInline,
    financeRowIsMeta, formatCallDayLabel, formatMinutes, higherRateBonusForCall, higherRateLiveStatus,
    importedCallStats, money, openModal, parseMoney, productiveMinutesForDay, saveSettingsOnly,
    saveStateOnly, todayCallDateKey, toast, weekdayKeyForDayKey, getReinforcementWorkIntervals, renderHeader } = context);
  configureReinforcementFeedback({ queueToast: queueGameToast, triggerEffect: () => triggerGameEvent('gameArena', 'clear', 900), playSound: playGameTone });
}
import { MONSTER_CATALOG, monsterForWeekday, monsterSvg, gamePixelIcon, gamePixelChest } from './monsters.js';
import {
  createDefaultReinforcementState,
  initPositiveReinforcement,
  normalizeReinforcementState,
  onPositiveCallSaved,
  onPositiveRewardWindow,
  reconcilePositiveCalls,
  resetPositiveDay,
  renderPositiveReinforcement,
} from './positive-reinforcement.js';

export const GAME_DAILY_XP_CAP = 150;
export const GAME_SHIELD_CAP = 3;
const GAME_DAY_LIMIT = 400;
const ACCESSORIES = Object.freeze([
  'Corona del ciclo',
  'Cuernos dorados',
  'Bufanda de racha',
  'Alas pixel',
  'Armadura cian',
  'Ojo de rubí',
  'Visor violeta',
]);

export const ACCESSORY_CATALOG = Object.freeze([
  { id: 'corona-del-ciclo', label: 'Corona del ciclo', slot: 'head', unlockLevel: 4 },
  { id: 'cuernos-dorados', label: 'Cuernos dorados', slot: 'head', unlockLevel: 7 },
  { id: 'bufanda-de-racha', label: 'Bufanda de racha', slot: 'neck', unlockLevel: 3 },
  { id: 'alas-pixel', label: 'Alas pixel', slot: 'back', unlockLevel: 6 },
  { id: 'armadura-cian', label: 'Armadura cian', slot: 'body', unlockLevel: 2 },
  { id: 'ojo-de-rubi', label: 'Ojo de rubí', slot: 'face', unlockLevel: 9 },
  { id: 'visor-violeta', label: 'Visor violeta', slot: 'face', unlockLevel: 1 },
]);
const ACCESSORY_BY_LABEL = Object.freeze(Object.fromEntries(ACCESSORY_CATALOG.map((item) => [item.label, item])));
const ACCESSORY_BY_ID = Object.freeze(Object.fromEntries(ACCESSORY_CATALOG.map((item) => [item.id, item])));
const EQUIPMENT_SLOTS = Object.freeze(['head', 'neck', 'back', 'body', 'face']);
export const MISSION_FOCUSES = Object.freeze(['balanced', 'quality', 'care']);
const MISSION_IDS = new Set(['productive', 'breaks', 'adherence', 'quality', 'steady', 'care']);
export const IMPULSE_MILESTONES = Object.freeze([3, 5, 8]);
export const LOOT_RARITIES = Object.freeze([
  { id: 'common', label: translateText('Común'), weight: 60 },
  { id: 'uncommon', label: translateText('Poco común'), weight: 27 },
  { id: 'rare', label: translateText('Raro'), weight: 10 },
  { id: 'epic', label: translateText('Épico'), weight: 3 },
]);
export const UNLOCK_ROADMAP = Object.freeze([
  { level: 2, id: 'armor', label: translateText('Placas de armadura visibles') },
  { level: 3, id: 'equipment', label: translateText('Ranura de cuello') },
  { level: 4, id: 'cycle-crown', label: translateText('Cosméticos de ciclo') },
  { level: 6, id: 'back', label: translateText('Ranura de espalda') },
  { level: 9, id: 'face', label: translateText('Ranura facial') },
]);
const PHASE_LABELS = Object.freeze({ guarded: translateText('Con armadura'), fury: translateText('Furia'), vulnerable: 'Vulnerable', defeated: translateText('Derrotado') });

export function createDefaultGameState() {
  const equipmentSlots = ['head', 'neck', 'back', 'body', 'face'];
  return {
    version: 1,
    totalXp: 0,
    level: 1,
    shields: 0,
    bestStreak: 0,
    accessories: [],
    trophies: [],
    chest: { pending: false, sealedOn: null },
    cycleReward: { pending: false, cycleKey: null, options: [] },
    equipment: Object.fromEntries(equipmentSlots.map((slot) => [slot, null])),
    days: {},
    ledger: {},
    live: { dayKey: null, combo: 0, shiftAlarmAt: null },
    reinforcement: createDefaultReinforcementState(),
  };
}

function boundedGameNumber(value, max, integer = false) {
  if ((typeof value !== 'number' && typeof value !== 'string') || (typeof value === 'string' && !value.trim())) return 0;
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(max, integer ? Math.floor(number) : number));
}

function gameDayDateFromKey(value) {
  const match = String(value ?? '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const parsed = new Date(year, month - 1, day, 0, 0, 0, 0);
  return parsed.getMonth() === month - 1 && parsed.getDate() === day ? parsed : null;
}

function validGameDayKey(value) {
  const key = String(value ?? '');
  return gameDayDateFromKey(key) ? key : null;
}

function normalizeGameDayEntry(rawEntry) {
  if (!rawEntry || typeof rawEntry !== 'object' || Array.isArray(rawEntry)) return null;
  const missionFocusValues = ['balanced', 'quality', 'care'];
  const validMissionIds = new Set(['productive', 'breaks', 'adherence', 'quality', 'steady', 'care']);
  const impulseMilestones = [3, 5, 8];
  const validPhaseValues = new Set(['guarded', 'fury', 'vulnerable', 'defeated']);
  const equipmentItems = [
    ['corona-del-ciclo', 'Corona del ciclo', 'head'], ['cuernos-dorados', 'Cuernos dorados', 'head'],
    ['bufanda-de-racha', 'Bufanda de racha', 'neck'], ['alas-pixel', 'Alas pixel', 'back'],
    ['armadura-cian', 'Armadura cian', 'body'], ['ojo-de-rubi', 'Ojo de rubí', 'face'],
    ['visor-violeta', 'Visor violeta', 'face'],
  ];
  const validEquipment = new Map(equipmentItems.flatMap(([id, label, slot]) => [[id, { label, slot }], [label, { label, slot }]]));
  const entry = { bonusXp: boundedGameNumber(rawEntry.bonusXp, GAME_DAILY_XP_CAP) };
  if(rawEntry.goalChestAdjustedAt&&Number.isFinite(new Date(rawEntry.goalChestAdjustedAt).getTime()))entry.goalChestAdjustedAt=new Date(rawEntry.goalChestAdjustedAt).toISOString();
  if (rawEntry.closingEvidence && typeof rawEntry.closingEvidence === 'object') {
    entry.closingEvidence = {
      things: (Array.isArray(rawEntry.closingEvidence.things) ? rawEntry.closingEvidence.things : []).slice(0, 3).map((text) => String(text).replace(/[<>]/g, '').slice(0, 350)),
      projection: rawEntry.closingEvidence.projection ? String(rawEntry.closingEvidence.projection).replace(/[<>]/g, '').slice(0, 250) : null,
    };
  }
  const lockedXp = boundedGameNumber(rawEntry.xpLocked, GAME_DAILY_XP_CAP);
  if ((typeof rawEntry.xpLocked === 'number' || typeof rawEntry.xpLocked === 'string') && String(rawEntry.xpLocked).trim() && Number.isFinite(Number(rawEntry.xpLocked))) {
    entry.xpLocked = lockedXp;
  }
  if (rawEntry.reopened === true) entry.reopened = true;
  if (missionFocusValues.includes(rawEntry.missionChoice)) entry.missionChoice = rawEntry.missionChoice;
  if (rawEntry.impulse && typeof rawEntry.impulse === 'object') {
    entry.impulse = { hits: impulseMilestones.reduce((all, milestone) => ({ ...all, [milestone]: rawEntry.impulse.hits?.[milestone] === true }), {}), last: boundedGameNumber(rawEntry.impulse.last, 10000, true) };
  }
  if (rawEntry.finalized !== true) return entry;

  const missionIds = new Set();
  const missions = (Array.isArray(rawEntry.missions) ? rawEntry.missions : []).slice(0, 3).flatMap((mission) => {
    if (!mission || typeof mission !== 'object' || Array.isArray(mission) || !validMissionIds.has(mission.id) || missionIds.has(mission.id)) return [];
    missionIds.add(mission.id);
    return [{ id: mission.id, ok: mission.ok === true, applies: mission.applies !== false, status: ['complete', 'pending', 'neutral'].includes(mission.status) ? mission.status : (mission.ok === true ? 'complete' : 'pending'), rewardXp: boundedGameNumber(mission.rewardXp, 20, true), detail: String(mission.detail ?? '').replace(/[<>]/g, '').slice(0, 160) }];
  });
  const rawMonster = rawEntry.monster && typeof rawEntry.monster === 'object' && !Array.isArray(rawEntry.monster) ? rawEntry.monster : {};
  const speciesIds = new Set(Object.values(MONSTER_CATALOG).map((monster) => monster.id));
  const rawBreakdown = rawEntry.xpBreakdown && typeof rawEntry.xpBreakdown === 'object' && !Array.isArray(rawEntry.xpBreakdown) ? rawEntry.xpBreakdown : null;
  const species = speciesIds.has(rawMonster.species) ? rawMonster.species : MONSTER_CATALOG.mon.id;
  const finalizedAt = rawEntry.finalizedAt && Number.isFinite(new Date(rawEntry.finalizedAt).getTime()) ? new Date(rawEntry.finalizedAt).toISOString() : null;
  const finalized = {
    ...entry,
    finalized: true,
    finalizedAt,
    xp: boundedGameNumber(rawEntry.xp, GAME_DAILY_XP_CAP, true),
    stars: boundedGameNumber(rawEntry.stars, 3, true),
    missions,
    shieldUsed: rawEntry.shieldUsed === true,
    monster: {
      species,
      variant: ['normal', 'gold', 'streak'].includes(rawMonster.variant) ? rawMonster.variant : 'normal',
      defeated: rawMonster.defeated === true,
      hpPct: boundedGameNumber(rawMonster.hpPct, 100),
    },
    hasActivity: typeof rawEntry.hasActivity === 'boolean' ? rawEntry.hasActivity : (boundedGameNumber(rawEntry.xp, GAME_DAILY_XP_CAP) > 0 || boundedGameNumber(rawEntry.stars, 3) > 0 || boundedGameNumber(rawEntry.earnings, 1000000000) > 0),
  };
  if (missionFocusValues.includes(rawEntry.missionChoice)) finalized.missionChoice = rawEntry.missionChoice;
  if (validPhaseValues.has(rawEntry.phase)) finalized.phase = rawEntry.phase;
  if (validPhaseValues.has(rawMonster.phase)) finalized.monster.phase = rawMonster.phase;
  const rawMonsterEquipment = Array.isArray(rawMonster.equipment)
    ? rawMonster.equipment
    : rawMonster.equipment && typeof rawMonster.equipment === 'object' ? Object.values(rawMonster.equipment) : [];
  const monsterEquipment = Object.fromEntries(['head', 'neck', 'back', 'body', 'face'].map((slot) => [slot, null]));
  rawMonsterEquipment.slice(0, 5).forEach((value) => {
    const item = validEquipment.get(String(value ?? ''));
    if (item) monsterEquipment[item.slot] = item.label;
  });
  if (Object.values(monsterEquipment).some(Boolean)) finalized.monster.equipment = monsterEquipment;
  if (Array.isArray(rawEntry.armor)) finalized.armor = rawEntry.armor.slice(0, 3).flatMap((plate) => {
    if (!plate || typeof plate !== 'object') return [];
    return [{ id: validMissionIds.has(plate.id) ? plate.id : 'productive', active: plate.active !== false, complete: plate.complete === true, status: ['complete', 'pending', 'neutral'].includes(plate.status) ? plate.status : (plate.complete ? 'complete' : 'pending') }];
  });
  if (rawEntry.impulse && typeof rawEntry.impulse === 'object') {
    finalized.impulse = { hits: impulseMilestones.reduce((all, milestone) => ({ ...all, [milestone]: rawEntry.impulse.hits?.[milestone] === true }), {}), last: boundedGameNumber(rawEntry.impulse.last, 10000, true) };
  }
  if (rawBreakdown) finalized.xpBreakdown = Object.fromEntries(['productivityXp', 'callsXp', 'adherenceXp', 'punctualityXp', 'missionXp', 'bonusXp'].map((key) => [key, boundedGameNumber(rawBreakdown[key], GAME_DAILY_XP_CAP, true)]));
  if ((typeof rawEntry.earnings === 'number' || typeof rawEntry.earnings === 'string') && String(rawEntry.earnings).trim() && Number.isFinite(Number(rawEntry.earnings))) {
    finalized.earnings = boundedGameNumber(rawEntry.earnings, 1000000000);
  }
  for (const [field, max] of [['callCount', 1000000], ['totalXpAfter', 1000000000], ['levelAfter', 100], ['nextLevelXp', 1000000000]]) {
    if ((typeof rawEntry[field] === 'number' || typeof rawEntry[field] === 'string') && String(rawEntry[field]).trim() && Number.isFinite(Number(rawEntry[field]))) {
      finalized[field] = boundedGameNumber(rawEntry[field], max, true);
      if (field === 'levelAfter') finalized[field] = Math.max(1, finalized[field]);
    }
  }
  if (rawEntry.comparisons && typeof rawEntry.comparisons === 'object' && !Array.isArray(rawEntry.comparisons)) {
    finalized.comparisons = {
      earnings: boundedGameNumber(rawEntry.comparisons.earnings, 1000000000),
      yesterdayKey: validGameDayKey(rawEntry.comparisons.yesterdayKey),
      yesterdayEarnings: boundedGameNumber(rawEntry.comparisons.yesterdayEarnings, 1000000000),
      yesterdayHasData: rawEntry.comparisons.yesterdayHasData === true,
      recordBefore: boundedGameNumber(rawEntry.comparisons.recordBefore, 1000000000),
      recordDayKey: validGameDayKey(rawEntry.comparisons.recordDayKey),
    };
  }
  if (rawEntry.rollback && typeof rawEntry.rollback === 'object' && !Array.isArray(rawEntry.rollback)) {
    const rollback = {};
    for (const [field, max] of [['shieldsBefore', GAME_SHIELD_CAP], ['bestStreakBefore', 1000000]]) {
      const value = rawEntry.rollback[field];
      if ((typeof value === 'number' || typeof value === 'string') && String(value).trim() && Number.isFinite(Number(value))) rollback[field] = boundedGameNumber(value, max, true);
    }
    const shieldKey = String(rawEntry.rollback.streakShieldAwardedKey ?? '').match(/^streak-shield:(\d{2}\/\d{2}\/\d{4}):(\d{1,7})$/);
    rollback.streakShieldAwardedKey = shieldKey && validGameDayKey(shieldKey[1]) ? shieldKey[0] : null;
    finalized.rollback = rollback;
  }
  if (typeof rawEntry.metadataShieldRestored === 'boolean') finalized.metadataShieldRestored = rawEntry.metadataShieldRestored;
  if (rawEntry.correctedAt && Number.isFinite(new Date(rawEntry.correctedAt).getTime())) finalized.correctedAt = new Date(rawEntry.correctedAt).toISOString();
  return finalized;
}

export function normalizeGameState(raw) {
  const equipmentSlots = ['head', 'neck', 'back', 'body', 'face'];
  const accessoryIds = new Set(['corona-del-ciclo', 'cuernos-dorados', 'bufanda-de-racha', 'alas-pixel', 'armadura-cian', 'ojo-de-rubi', 'visor-violeta']);
  const accessoryLabels = new Set(['Corona del ciclo', 'Cuernos dorados', 'Bufanda de racha', 'Alas pixel', 'Armadura cian', 'Ojo de rubí', 'Visor violeta']);
  const fallback = createDefaultGameState();
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const chest = source.chest && typeof source.chest === 'object' ? source.chest : {};
  const live = source.live && typeof source.live === 'object' ? source.live : {};
  const rawDays = source.days && typeof source.days === 'object' && !Array.isArray(source.days) ? source.days : {};
  const days = Object.fromEntries(Object.entries(rawDays)
    .map(([key, value]) => [validGameDayKey(key), value])
    .filter(([key]) => key)
    .sort((a, b) => (gameDayDateFromKey(b[0])?.getTime() || 0) - (gameDayDateFromKey(a[0])?.getTime() || 0))
    .slice(0, GAME_DAY_LIMIT)
    .flatMap(([key, value]) => {
      const entry = normalizeGameDayEntry(value);
      return entry ? [[key, entry]] : [];
    }));
  const rawLedger = source.ledger && typeof source.ledger === 'object' && !Array.isArray(source.ledger) ? source.ledger : {};
  const ledger = Object.fromEntries(Object.entries(rawLedger).filter(([key, value]) => typeof key === 'string' && key.length <= 180 && (value === true || (value && typeof value === 'object' && !Array.isArray(value)))).slice(-30000).map(([key, value]) => {
    if (value === true) return [key, true];
    const safe = Object.fromEntries(Object.entries(value).slice(0, 16).flatMap(([field, fieldValue]) => {
      if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(field)) return [];
      if (typeof fieldValue === 'boolean') return [[field, fieldValue]];
      if (typeof fieldValue === 'number' && Number.isFinite(fieldValue)) return [[field, Math.max(0, Math.min(1000000000, fieldValue))]];
      if (typeof fieldValue === 'string') return [[field, fieldValue.slice(0, 180)]];
      return [];
    }));
    return [key, typeof repairBonusReceipt === 'function' ? repairBonusReceipt(safe) : safe];
  }));
  const sealedOn = validGameDayKey(chest.sealedOn);
  const alarmAt = live.shiftAlarmAt && Number.isFinite(new Date(live.shiftAlarmAt).getTime()) ? new Date(live.shiftAlarmAt).toISOString() : null;
  const trophies = (Array.isArray(source.trophies) ? source.trophies : []).slice(-200).flatMap((item) => {
    if (typeof item === 'string') return [{ id: item.slice(0, 100), label: item.slice(0, 120) }];
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const id = String(item.id ?? '').slice(0, 100);
    const label = String(item.label ?? id).slice(0, 120);
    return id || label ? [{ id, label, earnedOn: validGameDayKey(item.earnedOn) }] : [];
  });
  const equipmentSource = source.equipment && typeof source.equipment === 'object' && !Array.isArray(source.equipment) ? source.equipment : {};
  const equipment = Object.fromEntries(equipmentSlots.map((slot) => {
    const value = equipmentSource[slot];
    const token = String(value ?? '').trim();
    const item = accessoryIds.has(token) ? { label: ({ 'corona-del-ciclo': 'Corona del ciclo', 'cuernos-dorados': 'Cuernos dorados', 'bufanda-de-racha': 'Bufanda de racha', 'alas-pixel': 'Alas pixel', 'armadura-cian': 'Armadura cian', 'ojo-de-rubi': 'Ojo de rubí', 'visor-violeta': 'Visor violeta' })[token] } : accessoryLabels.has(token) ? { label: token } : null;
    return [slot, item ? item.label : null];
  }));
  const cycleRewardSource = source.cycleReward && typeof source.cycleReward === 'object' ? source.cycleReward : {};
  const cycleRewardOptions = Array.isArray(cycleRewardSource.options) ? cycleRewardSource.options.slice(0, 3).flatMap((option) => {
    if (!option || typeof option !== 'object') return [];
    const id = String(option.id ?? '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
    const label = String(option.label ?? id).replace(/[<>]/g, '').slice(0, 140);
    const accessory = typeof option.accessory === 'string' && accessoryLabels.has(option.accessory) ? option.accessory : null;
    return id && label ? [{ id, label, type: ['xp', 'accessory'].includes(option.type) ? option.type : 'xp', amount: boundedGameNumber(option.amount, GAME_DAILY_XP_CAP, true), accessory }] : [];
  }) : [];
  const cycleRewardKey = validGameDayKey(cycleRewardSource.cycleKey);
  const normalizedCycleRewardOptions = cycleRewardSource.pending === true && cycleRewardKey && !cycleRewardOptions.length
    ? [{ id: 'cycle-xp', type: 'xp', amount: 35, label: translateText('35 XP de temporada'), accessory: null }]
    : cycleRewardOptions;
  return {
    ...fallback,
    totalXp: boundedGameNumber(source.totalXp, 1000000000, true),
    level: Math.max(1, Math.min(100, Math.floor(Number(source.level) || 1))),
    shields: boundedGameNumber(source.shields, GAME_SHIELD_CAP, true),
    bestStreak: boundedGameNumber(source.bestStreak, 1000000, true),
    accessories: Array.from(new Set((Array.isArray(source.accessories) ? source.accessories : []).filter((item) => typeof item === 'string' && ACCESSORIES.includes(item)))),
    trophies,
    chest: { pending: chest.pending === true && !!sealedOn, sealedOn: sealedOn && chest.pending === true ? sealedOn : null },
    cycleReward: { pending: cycleRewardSource.pending === true && !!cycleRewardKey, cycleKey: cycleRewardKey, options: cycleRewardKey ? normalizedCycleRewardOptions : [] },
    equipment,
    days,
    ledger,
    live: {
      dayKey: validGameDayKey(live.dayKey),
      combo: boundedGameNumber(live.combo, 10000, true),
      shiftAlarmAt: alarmAt,
    },
    reinforcement: normalizeReinforcementState(source.reinforcement),
  };
}

export function xpThresholdForLevel(level) {
  const normalized = Math.max(1, Math.floor(Number(level) || 1));
  return 150 * ((normalized - 1) * normalized) / 2;
}

export function levelForXp(totalXp) {
  const xp = Math.max(0, Number(totalXp) || 0);
  let level = 1;
  while (level < 100 && xp >= xpThresholdForLevel(level + 1)) level++;
  return level;
}

function sanitizeMonsterName(value) {
  if (typeof value !== 'string') return '';
  return Array.from(value.replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim()).slice(0, 60).join('').trim();
}

function ensureGameSettings() {
  if (!settings.game || typeof settings.game !== 'object' || Array.isArray(settings.game)) settings.game = {};
  if (typeof settings.game.enabled !== 'boolean') settings.game.enabled = false;
  settings.game.intensity = 'arcade';
  settings.game.weapon = normalizeBattleWeapon(settings.game.weapon);
  if (typeof settings.game.soundEnabled !== 'boolean') settings.game.soundEnabled = true;
  const soundVolume = Number(settings.game.soundVolume);
  settings.game.soundVolume = Number.isFinite(soundVolume) ? Math.max(0, Math.min(100, soundVolume)) : 40;
  const monsterName = sanitizeMonsterName(settings.game.monsterName);
  if (monsterName) settings.game.monsterName = monsterName;
  else delete settings.game.monsterName;
  return settings.game;
}

function saveGamePreference(key, value) {
  const owner = settings, game = ensureGameSettings(), previous = game[key];
  game[key] = value;
  if (saveSettingsOnly() !== false) return true;
  if (settings === owner && settings.game === game) game[key] = previous;
  return false;
}

function currentGameDayKey() {
  const startedAt = state.shiftStartedAt ? new Date(state.shiftStartedAt) : null;
  if (startedAt && !Number.isNaN(startedAt.getTime()) && !state.shiftEndedAt) {
    return todayCallDateKey(startedAt);
  }
  return todayCallDateKey();
}

export function ensureGameState(preferredDayKey = null) {
  const normalized = normalizeGameState(state.game);
  const existingDays = state.game?.days || {};
  Object.entries(normalized.days).forEach(([key, value]) => {
    const existing = existingDays[key];
    if (!existing || typeof existing !== 'object') return;
    Object.keys(existing).forEach((field) => { if (!(field in value)) delete existing[field]; });
    Object.assign(existing, value);
    normalized.days[key] = existing;
  });
  state.game = normalized;
  const targetDay = callDateKeyFromValue(preferredDayKey) || currentGameDayKey();
  if (state.game.live.dayKey !== targetDay) {
    state.game.live = { dayKey: targetDay, combo: 0, shiftAlarmAt: null };
  }
  pruneGameDays();
  state.game.level = levelForXp(state.game.totalXp);
  EQUIPMENT_SLOTS.forEach((slot) => {
    const item = ACCESSORY_BY_LABEL[state.game.equipment[slot]];
    if (!item || !state.game.accessories.includes(item.label) || item.unlockLevel > state.game.level) state.game.equipment[slot] = null;
  });
  return state.game;
}

function pruneGameDays() {
  if (!state.game?.days) return;
  const keys = Object.keys(state.game.days);
  if (keys.length <= GAME_DAY_LIMIT) return;
  keys.sort((a, b) => (callDateToDate(b)?.getTime() || 0) - (callDateToDate(a)?.getTime() || 0));
  keys.slice(GAME_DAY_LIMIT).forEach((key) => delete state.game.days[key]);
}

function gameEnabled() {
  const config = ensureGameSettings();
  return config.enabled;
}

function arcadeEnabled() {
  return gameEnabled();
}

function hashText(value) {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function dayEntry(dayKey) {
  ensureGameState();
  if (!state.game.days[dayKey] || typeof state.game.days[dayKey] !== 'object') {
    state.game.days[dayKey] = { bonusXp: 0 };
  }
  if (!Number.isFinite(Number(state.game.days[dayKey].bonusXp))) state.game.days[dayKey].bonusXp = 0;
  return state.game.days[dayKey];
}

function callIsXpEligible(call, dayKey) {
  if (!call) return false;
  const productive = typeof call.countsAsProductive === 'boolean'
    ? call.countsAsProductive
    : String(call.billable).toLowerCase() === 'yes' && String(call.dropped).toLowerCase() !== 'yes';
  if (!productive || !(Number(call.durationMin) > 0)) return false;

  const started = new Date(call.startISO).getTime();
  const ended = new Date(call.endISO).getTime();
  const imported = new Date(call.importedAt).getTime();
  const now = Date.now();
  if (!Number.isFinite(started) || !Number.isFinite(ended) || !Number.isFinite(imported)
    || started > now || ended > now || imported > now) return false;
  const lag = imported - ended;
  if (lag < 0 || lag > 30 * 60000) return false;

  const importedDay = todayCallDateKey(new Date(imported));
  if (importedDay !== todayCallDateKey()) return false;
  if (importedDay === dayKey) return true;

  // Turno nocturno: una llamada puede pertenecer al día contable en que comenzó el shift aunque
  // termine/importarse después de medianoche. Se conserva el límite de importación reciente.
  return callDateKeyFromValue(call.shiftDayKey) === dayKey;
}

function plannedPauseCount(dayKey) {
  const config = dayConfigFor(dayKey);
  return (Array.isArray(config?.blocks) ? config.blocks : [])
    .filter((block) => ['break', 'lunch'].includes(String(block?.type || '').toLowerCase())).length;
}

function missionFocusForEntry(entry) {
  const sealed = entry?.finalized || Number.isFinite(Number(entry?.xpLocked));
  return sealed && MISSION_FOCUSES.includes(entry?.missionChoice) ? entry.missionChoice : 'balanced';
}

function missionSnapshot(dayKey, stats, goal, adherence, dayState = null) {
  const focus = missionFocusForEntry(dayState);
  const productiveApplies = goal.min > 0;
  const productiveOk = productiveApplies && stats.productive >= goal.min - 0.5;
  const remainingProductive = Math.max(0, goal.min - stats.productive);
  const pauseCheckpoints = (adherence?.checkpoints || []).filter((item) => !['Entrada', 'Salida', 'Turno'].includes(item.label));
  const expectedPauses = plannedPauseCount(dayKey);
  const breaksApplies = expectedPauses > 0;
  const breaksOk = breaksApplies && pauseCheckpoints.length >= expectedPauses && pauseCheckpoints.every((item) => item.ok);
  const missingBreaks = Math.max(0, expectedPauses - pauseCheckpoints.filter((item) => item.ok).length);
  const adherenceGoal = Number(settings.adherenceGoalPct) || 95;
  const adherencePct = Number(adherence?.scorePct);
  const adherenceApplies = Number.isFinite(adherencePct);
  const adherenceOk = adherenceApplies && adherencePct >= adherenceGoal;
  const qualityApplies = stats.total > 0;
  const qualityOk = qualityApplies && stats.zeroCount === 0 && stats.dropped === 0;
  const steadyApplies = productiveApplies;
  const steadyOk = steadyApplies && stats.gapTotal >= 0 && (expectedPauses === 0 || breaksOk);
  const careApplies = breaksApplies;
  const careOk = careApplies && breaksOk && (!adherenceApplies || adherenceOk);
  const candidates = {
    productive: { id: 'productive', label: translateText('Rompe la armadura de productividad'), applies: productiveApplies, ok: productiveOk, rewardXp: 8, detail: productiveApplies ? (productiveOk ? ui`${formatMinutes(stats.productive)} min alcanzados` : ui`Faltan ${formatMinutes(remainingProductive)} min`) : translateText('No aplica sin meta productiva') },
    breaks: { id: 'breaks', label: translateText('Protege tus Break/Lunch'), applies: breaksApplies, ok: breaksOk, rewardXp: 6, detail: breaksApplies ? (breaksOk ? translateText('Todos dentro de su ventana') : ui`Faltan ${missingBreaks} pausa(s) a tiempo`) : translateText('Neutral: no hay pausas programadas') },
    adherence: { id: 'adherence', label: translateText('Defiende la Adherencia'), applies: adherenceApplies, ok: adherenceOk, rewardXp: 6, detail: adherenceOk ? ui`${Math.round(adherencePct)}% de ${adherenceGoal}%` : adherenceApplies ? ui`Faltan ${Math.max(0, Math.ceil(adherenceGoal - adherencePct))} puntos` : translateText('Neutral: aún sin datos suficientes') },
    quality: { id: 'quality', label: translateText('Cuida la calidad de cada llamada'), applies: qualityApplies, ok: qualityOk, rewardXp: 6, detail: qualityApplies ? (qualityOk ? translateText('Sin llamadas caídas ni filas de cero minutos') : translateText('Revisa llamadas caídas o de cero minutos')) : translateText('Neutral: aún no hay llamadas') },
    steady: { id: 'steady', label: translateText('Mantén un ritmo sostenible'), applies: steadyApplies, ok: steadyOk, rewardXp: 6, detail: steadyApplies ? (steadyOk ? translateText('Ritmo y pausas compatibles') : translateText('Ajusta el ritmo sin saltarte pausas')) : translateText('Neutral: no hay meta productiva') },
    care: { id: 'care', label: translateText('Cuida tus pausas programadas'), applies: careApplies, ok: careOk, rewardXp: 6, detail: careApplies ? (careOk ? translateText('Pausas y adherencia cuidadas') : translateText('Las pausas son parte del turno')) : translateText('Neutral: no hay pausas programadas') },
  };
  const ids = focus === 'quality' ? ['productive', 'quality', 'adherence'] : focus === 'care' ? ['breaks', 'care', 'adherence'] : ['productive', 'breaks', 'adherence'];
  return ids.map((id) => {
    const mission = candidates[id];
    const status = !mission.applies ? 'neutral' : mission.ok ? 'complete' : 'pending';
    return { ...mission, status, ok: status === 'complete', reward: { type: 'xp', amount: status === 'neutral' ? 0 : mission.rewardXp } };
  });
}

function higherRateBonusAmount(call) {
  return Number(higherRateBonusForCall(call)?.amount) || 0;
}

function callXp(call) {
  const critical = higherRateBonusAmount(call) > 0;
  return critical ? Math.ceil(3 * 1.5) : 3;
}

export function monsterPhaseFor(day = {}) {
  if (day.defeated === true || Number(day.hpPct) <= 0) return 'defeated';
  const missions = Array.isArray(day.missions) ? day.missions : [];
  const applicable = missions.filter((mission) => mission?.applies !== false && mission?.status !== 'neutral');
  const completed = applicable.filter((mission) => mission?.ok === true || mission?.status === 'complete').length;
  const liveDayKey = typeof todayCallDateKey === 'function' ? (state ? currentGameDayKey() : todayCallDateKey()) : null;
  const currentHigherRate = !!day.dayKey && typeof todayCallDateKey === 'function'
    && day.dayKey === liveDayKey && higherRateLiveStatus?.()?.active;
  const furyThreshold = day.fury === true || day.eventThreshold === 'fury' || Number(day.combo) >= 5 || currentHigherRate;
  if (furyThreshold && completed < Math.max(1, applicable.length)) return 'fury';
  if (applicable.length > 0 && completed >= Math.max(1, applicable.length - 1)) return 'vulnerable';
  return 'guarded';
}

export function armorPlatesForDay(day = {}) {
  const missions = Array.isArray(day.missions) ? day.missions : [];
  const fallback = ['productive', 'breaks', 'adherence'].map((id) => ({ id, label: id, applies: false, ok: false, status: 'neutral', rewardXp: 0, detail: 'Neutral' }));
  return (missions.length ? missions.slice(0, 3) : fallback).map((mission, index) => {
    const id = mission.id || fallback[index]?.id || `mission-${index + 1}`;
    return { id, index: index + 1, active: mission.applies !== false && mission.status !== 'neutral', complete: mission.ok === true, status: mission.status || (mission.ok ? 'complete' : 'pending'), label: mission.label, rewardXp: mission.rewardXp || 0, detail: translateStoredText(mission.detail) };
  });
}

export function phaseEventFor(day = {}, previousPhase = null) {
  const phase = monsterPhaseFor(day);
  return phase !== previousPhase && phase !== 'guarded' ? phase : null;
}

export const getMonsterPhase = monsterPhaseFor;
export const getArmorPlates = armorPlatesForDay;

export function computeGameDay(dayKey = todayCallDateKey(), { ignoreLock = false } = {}) {
  ensureGameState();
  const dayCalls = callsForDay(dayKey);
  const stats = importedCallStats(dayCalls, dayKey);
  const goal = effectiveDailyGoal(dayKey);
  const adherence = dayAdherence(dayKey);
  const eligibleCalls = dayCalls.filter((call) => callIsXpEligible(call, dayKey));
  const xpStats = importedCallStats(eligibleCalls, dayKey);
  const savedEntry = state.game.days[dayKey] || {};
  const missions = missionSnapshot(dayKey, xpStats, goal, adherence, savedEntry);
  const productivityXp = goal.min > 0 ? Math.round(Math.min(1, xpStats.productive / goal.min) * 50) : 50;
  const callsXp = Math.min(30, eligibleCalls.reduce((sum, call) => sum + callXp(call), 0));
  const adherencePct = Math.max(0, Number(adherence?.scorePct) || 0);
  const adherenceGoal = Number(settings.adherenceGoalPct) || 95;
  const adherenceXp = Math.round(Math.min(1, adherencePct / adherenceGoal) * 30);
  const punctualityXp = state.game.ledger[`reflex:${dayKey}`] ? 20 : 0;
  const missionXp = Math.min(20, missions.reduce((sum, mission) => sum + (mission.ok ? Number(mission.rewardXp) || 0 : 0), 0));
  const bonusXp = Math.max(0, Number(state.game.days[dayKey]?.bonusXp) || 0);
  // Una importación tardía/histórica no abre la puerta a XP indirecto de productividad,
  // adherencia o misiones. Tiene que existir al menos una llamada elegible de hoy.
  const rawXp = eligibleCalls.length
    ? Math.min(GAME_DAILY_XP_CAP, productivityXp + callsXp + adherenceXp + punctualityXp + missionXp + bonusXp)
    : 0;
  const lockedXp = ignoreLock ? Number.NaN : Number(state.game.days[dayKey]?.xpLocked);
  const xp = Number.isFinite(lockedXp) ? Math.min(rawXp, lockedXp) : rawXp;
  const completedMissions = missions.filter((mission) => mission.ok).length;
  const stars = eligibleCalls.length ? Math.max(1, completedMissions) : 0;
  const defeated = goal.usd > 0 && monetaryMilestones(stats.earnings, goal.usd).claimed.includes(100);
  const hpPct = defeated ? 0 : goal.usd > 0 ? Math.max(0, Math.min(100, (1 - stats.earnings / goal.usd) * 100)) : 100;
  const snapshot = {
    dayKey,
    stats,
    xpStats,
    goal,
    adherence,
    missions,
    eligibleCalls,
    xp,
    xpBreakdown: { productivityXp, callsXp, adherenceXp, punctualityXp, missionXp, bonusXp },
    stars,
    hpPct,
    defeated,
    species: monsterForWeekday(weekdayKeyForDayKey(dayKey)),
  };
  snapshot.armor = armorPlatesForDay(snapshot);
  snapshot.combo = state.game.live.dayKey === dayKey ? state.game.live.combo : 0;
  snapshot.eventThreshold = state.game.live.dayKey === dayKey && state.game.live.combo >= 5 && state.game.live.combo % 5 === 0 ? 'fury' : null;
  snapshot.phase = monsterPhaseFor(snapshot);
  return snapshot;
}

export function gameReviewSnapshot() {
  const day=computeGameDay(currentGameDayKey());
  return {enabled:gameEnabled(),dayLabel:formatCallDayLabel(day.dayKey),level:gameLevelProgress(),collection:{owned:ACCESSORY_CATALOG.filter(item=>state.game.accessories.includes(item.label)).length,total:ACCESSORY_CATALOG.length},pendingRewards:state.game.reinforcement?.pendingRewards?.length||0,xp:day.xp,eligibleCalls:day.eligibleCalls.length,callCount:callsForDay(day.dayKey).length,breakdown:day.xpBreakdown,cap:GAME_DAILY_XP_CAP,workMode:battleWorkMode(state),chest:{defeated:day.defeated,claimed:!!state.game.ledger[`chest:${day.dayKey}`],adjustedAt:state.game.days[day.dayKey]?.goalChestAdjustedAt||null}};
}

function gameStreak() {
  ensureGameState();
  return Math.max(0, Number(computeComplianceStreak()?.days) || 0);
}

function recomputeBestStreak() {
  let best = 0;
  let current = 0;
  let cursor = callDateToDate(todayCallDateKey()) || new Date();
  for (let i = 0; i < GAME_DAY_LIMIT; i++) {
    const key = todayCallDateKey(cursor);
    const status = dayComplianceStatus(key);
    if (status === 'pending') {
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1);
      continue;
    }
    if (status === 'off') {
      if (settings.streakSkipOffDays !== false) {
        cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1);
        continue;
      }
      current = 0;
    } else if (status === 'compliant' || state.game.days[key]?.shieldUsed) {
      current++;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1);
  }
  return best;
}

function gameLevelProgress() {
  ensureGameState();
  const level = levelForXp(state.game.totalXp);
  const floor = xpThresholdForLevel(level);
  const ceiling = xpThresholdForLevel(level + 1);
  return {
    level,
    floor,
    ceiling,
    current: state.game.totalXp,
    pct: ceiling > floor ? Math.max(0, Math.min(100, ((state.game.totalXp - floor) / (ceiling - floor)) * 100)) : 100,
    remaining: Math.max(0, ceiling - state.game.totalXp),
  };
}

function withConversion(amount) {
  const converted = convertedAmountText(amount);
  return `${money(amount)}${converted ? ` (${escapeHtml(converted)})` : ''}`;
}

function monsterStateFor(day) {
  if (day.defeated) return 'defeated';
  if (day.dayKey !== currentGameDayKey()) return 'sleeping';
  if (state.activePause || !state.shiftStartedAt || state.shiftEndedAt) return 'sleeping';
  if (higherRateLiveStatus()?.active) return 'fury';
  if (day.hpPct <= 25) return 'wounded';
  if (day.hpPct <= 50) return 'angry';
  return 'awake';
}

function monsterVariantFor(day) {
  if (day.dayKey !== currentGameDayKey()) return state.game.days[day.dayKey]?.monster?.variant || 'normal';
  if (higherRateLiveStatus()?.active) return 'gold';
  if (gameStreak() >= 7) return 'streak';
  return 'normal';
}

function displayedGameDayKey() {
  return callDateKeyFromValue(state.activeDayKey) || currentGameDayKey();
}

function yesterdayShadowPct(dayKey = currentGameDayKey()) {
  const now = new Date();
  const selected = callDateToDate(dayKey);
  if (!selected) return null;
  const yesterday = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate() - 1);
  const key = todayCallDateKey(yesterday);
  const cutoff = dayKey === currentGameDayKey() ? now.getHours() * 60 + now.getMinutes() : 1440;
  const partial = callsForDay(key).filter((call) => {
    const start = new Date(call.startISO);
    return start.getHours() * 60 + start.getMinutes() <= cutoff;
  });
  if (!partial.length) return null;
  const goal = effectiveDailyGoal(key).usd;
  if (!(goal > 0)) return null;
  return Math.max(0, Math.min(100, (importedCallStats(partial, key).earnings / goal) * 100));
}

let lastArenaRenderKey = '';
let monsterNameDraftDirty = false;
let lastSettingsMonsterName = null;

function compactCollectionMarkup(dayKey) {
  const level = gameLevelProgress();
  const receipt = state.game.ledger[`chest:${dayKey}`];
  const latest = ACCESSORY_BY_LABEL[receipt?.accessory] || ACCESSORY_BY_LABEL[state.game.accessories.at(-1)] || ACCESSORY_BY_ID['visor-violeta'];
  const owned = state.game.accessories.includes(latest.label);
  const available = owned && latest.unlockLevel <= level.level;
  const equipped = state.game.equipment[latest.slot] === latest.label;
  const victories = Object.keys(state.game.ledger).filter(key => key.startsWith('monster-defeat:')).length;
  return ui`<div class="game-compact-collection-head"><h4>Tu colección</h4><span>Nivel ${level.level} · ${state.game.totalXp} XP</span></div>
    <div class="game-compact-collection-item"><span class="game-compact-collection-icon" aria-hidden="true">${gamePixelIcon('gem')}</span><div class="game-compact-collection-copy"><strong>${escapeHtml(translateText(latest.label))}</strong><small>${equipped ? translateText('Equipado') : available ? translateText('Desbloqueado') : owned ? ui`Disponible en nivel ${latest.unlockLevel}` : translateText('En el próximo cofre')}</small></div><button type="button" data-game-action="equip-accessory" data-accessory="${latest.id}" aria-pressed="${equipped}" ${available ? '' : 'disabled'}>${equipped ? translateText('Quitar') : translateText('Equipar')}</button></div>
    <div class="game-compact-collection-item"><span class="game-compact-collection-icon" aria-hidden="true">${gamePixelIcon('sword')}</span><div class="game-compact-collection-copy"><strong>Monstruos vencidos</strong><small>Tu colección de victorias</small></div><b>${victories}</b></div>
    <button type="button" class="game-compact-view-all" data-game-nav>Ver todos mis Logros →</button>`;
}

function compactVictoryMarkup(day) {
  if (!day.defeated) return '';
  const receipt = state.game.ledger[`chest:${day.dayKey}`];
  if (receipt) {
    const reward = receipt.accessory ? translateText(receipt.accessory) : ui`+${Number(receipt.gross) || 0} XP`;
    return ui`<div class="game-compact-reward-open"><strong>${escapeHtml(reward)}</strong><small>Cofre abierto · recompensa guardada</small></div>`;
  }
  return ui`<span class="game-compact-win-label">META CUMPLIDA</span><strong>¡Cofre ganado!</strong>${day.dayKey === currentGameDayKey() ? ui`<button type="button" data-game-action="open-daily-chest" data-game-day="${day.dayKey}" ${state.activeCall ? 'disabled' : ''}>${gamePixelChest()} Abrir cofre</button>` : ui`<button type="button" data-game-nav>Ver mis Logros</button>`}`;
}

function renderArena() {
  const root = document.getElementById('gameArena');
  const classic = document.getElementById('classicDailyGoalCard');
  if (!root || !classic) return;
  const dayKey = displayedGameDayKey();
  const day = computeGameDay(dayKey);
  const active = gameEnabled() && day.goal.usd > 0;
  root.hidden = !active;
  classic.style.display = active ? 'none' : '';
  const progressHome = classic.querySelector('[data-game-progress-home]');
  const milestoneDetails = document.getElementById('gameMilestones');
  const progress = document.getElementById('earningsBar')?.closest('.earnings-goal-progress');
  const nextMilestone = document.getElementById('earningsNextMilestone');
  if (progressHome && milestoneDetails && progress && nextMilestone) {
    const progressTarget = active ? milestoneDetails.querySelector('[data-game-milestone-progress]') : progressHome;
    const nextTarget = active ? milestoneDetails.querySelector('[data-game-milestone-next]') : progressHome;
    if (progress.parentElement !== progressTarget) progressTarget.append(progress);
    if (nextMilestone.parentElement !== nextTarget) nextTarget.append(nextMilestone);
  }
  if (!active) {
    stopBattle();
    lastArenaRenderKey = '';
    root.className = 'game-arena';
    root.removeAttribute('data-game-state');
    root.removeAttribute('data-game-phase');
    root.removeAttribute('data-game-intensity');
    return;
  }

  const monsterState = monsterStateFor(day);
  const monsterPhase = day.phase || monsterPhaseFor(day);
  const variant = monsterVariantFor(day);
  const customName = sanitizeMonsterName(settings.game.monsterName);
  const displayName = customName || translateText(day.species.name);
  const remaining = Math.max(0, day.goal.usd - day.stats.earnings);
  const dayCalls = callsForDay(dayKey);
  const callSignatures = Object.fromEntries(dayCalls.map(call => [String(call.id), JSON.stringify([call.pay, higherRateBonusAmount(call), call.durationMin, call.startISO, call.endISO, call.billable, call.dropped])]));
  const workMode = battleWorkMode(state);
  const receipt = state.game.ledger[`chest:${dayKey}`];
  const toastStack = document.getElementById('gameToastStack');
  if (toastStack) toastStack.hidden = workMode === 'call';
  if (workMode === 'call') {
    stopGameSounds();
    root.classList.remove('is-hit', 'is-critical-hit');
    root.removeAttribute('data-game-event');
    document.getElementById('gameCallFx')?.replaceChildren();
    document.querySelectorAll('.game-pixel-fx-layer, .game-live-xp-float').forEach(node => node.remove());
  }
  const victories = Object.keys(state.game.ledger).filter(key => key.startsWith('monster-defeat:')).length;
  const renderKey = [workMode, dayKey, monsterState, monsterPhase, variant, displayName, day.combo, day.stats.earnings.toFixed(2), Math.round(day.hpPct * 10), Object.values(state.game.equipment || {}).join('|'), day.xp, state.game.totalXp, victories, state.game.accessories.join('|'), JSON.stringify(receipt), settings.game.weapon, settings.game.soundEnabled, settings.currencyLabel, settings.exchangeRate, displayLocale(), day.goal.usd, JSON.stringify(callSignatures)].join(':');
  if (renderKey === lastArenaRenderKey) return;
  lastArenaRenderKey = renderKey;
  if (root.dataset.gameDayKey && root.dataset.gameDayKey !== dayKey) delete root.dataset.gameEvent;
  root.className = `game-arena game-arena--arcade game-arena--battle game-${escapeHtml(monsterState)}`;
  root.dataset.gameState = monsterState;
  root.dataset.gameDayKey = dayKey;
  root.dataset.gameHp = String(day.hpPct);
  root.dataset.gamePhase = monsterPhase;
  root.dataset.gameIntensity = 'arcade';
  const monsterImageLabel = ui`${displayName}, ${Math.round(100 - day.hpPct)}% de la meta completada`;
  const battleMonsterState = monsterState === 'sleeping' && dayKey === currentGameDayKey() && workMode !== 'call' ? 'angry' : monsterState;
  const sprite = monsterSvg({ species: day.species.id, state: battleMonsterState, variant, hpPct: day.hpPct, sizeClass: 'lg', equipment: state.game.equipment })
    .replace(/ role="img" aria-label="[^"]*"/, ' aria-hidden="true"');
  if (!root.querySelector('.game-battle')) {
    stopBattle();
    root.innerHTML = battleMarkup();
  }
  const heading = root.querySelector('[data-battle-heading]');
  heading.innerHTML = ui`<span class="game-kicker">${dayKey === currentGameDayKey() ? translateText('TU RETO DE HOY') : formatCallDayLabel(dayKey)}</span><h3>${escapeHtml(displayName)}</h3>`;
  const converted = convertedAmountText(day.stats.earnings);
  const convertedGoal = convertedAmountText(day.goal.usd);
  const convertedRemaining = convertedAmountText(remaining);
  const status = day.defeated ? receipt ? translateText('Cofre abierto. ¡Seguí sumando!') : translateText('Meta alcanzada. Este cofre es tuyo.') : translateText('Cada llamada te acerca al cofre.');
  root.querySelector('[data-battle-health-slot]').innerHTML = ui`
    <div class="game-compact-goal-line"><span>${dayKey === currentGameDayKey() ? translateText('Meta de hoy') : translateText('Meta de este día')}</span><strong>${money(day.stats.earnings)} <small>/ ${money(day.goal.usd)}</small></strong></div>
    <div class="game-compact-goal-track" role="progressbar" aria-label="Avance hacia la meta y el cofre" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(100 - day.hpPct)}"><i class="game-compact-goal-fill" style="width:${100 - day.hpPct}%"></i><span class="game-compact-goal-chest" aria-hidden="true">${gamePixelChest(!!receipt)}</span></div>
    <div class="game-compact-goal-foot"><span>${converted ? ui`${escapeHtml(converted)} / ${escapeHtml(convertedGoal)}` : ''}</span><span>${day.defeated ? receipt ? translateText('Recompensa guardada') : translateText('Cofre conseguido') : ui`Te faltan ${money(remaining)}${convertedRemaining ? ` (${escapeHtml(convertedRemaining)})` : ''}`}</span></div>`;
  const victory = root.querySelector('[data-battle-victory]');
  const victoryMarkup = compactVictoryMarkup(day);
  if (victory.innerHTML !== victoryMarkup) victory.innerHTML = victoryMarkup;
  victory.dataset.rewardOpened = String(!!receipt);
  syncBattle(root, { dayKey, currentDay: dayKey === currentGameDayKey(), workMode, enabled: active, weapon: settings.game.weapon, callSignatures, goalUsd: day.goal.usd, monsterMarkup: sprite, monsterLabel: translateText('Tu meta de hoy'), monsterDescription: monsterImageLabel, monsterName: displayName, heroLabel: translateText('Tu héroe'), heroEquipment: equipmentForState(), soundEnabled: settings.game.soundEnabled, goalStatus: status, collectionMarkup: compactCollectionMarkup(dayKey), defeated: day.defeated, hpPct: day.hpPct }, {
    onWeaponChange: weapon => { if (!saveGamePreference('weapon', normalizeBattleWeapon(weapon))) { lastArenaRenderKey = ''; renderArena(); } },
    onToggleSound: () => { saveGamePreference('soundEnabled', !settings.game.soundEnabled); syncGameAudio(); lastArenaRenderKey = ''; renderGame(); },
    onSound: kind => {
      if (kind === 'practice-hit') return;
      playGameSound(kind, { allowed: () => {
        const bounds = root.querySelector('.game-battle')?.getBoundingClientRect();
        return !state.activeCall && gameEnabled() && dayKey === displayedGameDayKey() && !root.hidden && !!root.getClientRects().length && !!bounds && bounds.bottom > 0 && bounds.top < window.innerHeight;
      } });
    },
    onPause: stopGameSounds,
  });
}


function renderMissions() {
  const root = document.getElementById('gameMissions');
  if (!root) return;
  if (!gameEnabled()) {
    root.hidden = true;
    return;
  }
  root.hidden = false;
  const dayKey = displayedGameDayKey();
  const day = computeGameDay(dayKey);
  const plates = armorPlatesForDay(day);
  root.innerHTML = ui`
    <summary class="game-missions-summary"><span>Misiones</span><strong>${day.missions.filter((mission) => mission.ok).length}/3</strong><small>${day.missions.filter((mission) => mission.applies !== false && !mission.ok).length} armaduras pendientes</small></summary>
    <div class="game-missions-body">
    <div class="game-section-head"><span class="game-kicker">3 ARMADURAS</span><div class="game-missions-status"><span>Misiones automáticas</span>
    <div class="game-armor-row" role="list" aria-label="Placas de armadura">${plates.map((plate, index) => ui`<div class="game-armor-plate ${plate.complete ? 'is-complete' : ''} ${plate.status === 'neutral' ? 'is-neutral' : ''}" data-armor-id="${escapeHtml(plate.id)}" role="listitem" aria-label="Placa ${index + 1}: ${escapeHtml(plate.label)}. ${plate.status === 'neutral' ? translateText('Neutral') : plate.complete ? translateText('Completada') : translateText('Pendiente')}"><span aria-hidden="true">${gamePixelIcon(plate.complete ? 'check' : 'shield')}</span><b>${index + 1}</b></div>`).join('')}</div></div></div>
    <div class="game-mission-grid" role="list" aria-label="Misiones del día">${day.missions.map((mission, index) => ui`
      <div class="game-mission ${mission.ok ? 'is-complete' : ''} ${mission.status === 'neutral' ? 'is-neutral' : ''}" role="listitem" aria-label="${escapeHtml(ui`Misión ${index + 1}: ${mission.label}. ${mission.status === 'neutral' ? translateText('Neutral') : mission.ok ? translateText('Completada') : translateText('Pendiente')}. ${mission.detail}`)}">
        <span class="game-armor" aria-hidden="true">${gamePixelIcon(mission.ok ? 'check' : index === 0 ? 'sword' : index === 1 ? 'cup' : 'shield')}</span>
        <div><b>${index + 1}. ${escapeHtml(mission.label)}</b><span>${escapeHtml(translateStoredText(mission.detail))}</span></div>
        <small class="game-mission-reward">${mission.status === 'neutral' ? translateText('Sin recompensa: no aplica') : ui`Recompensa individual · ${mission.rewardXp} XP`}</small>
      </div>`).join('')}</div></div>`;
}

function renderHeroChips() {
  const streak = gameStreak();
  const level = gameLevelProgress();
  const combo = state.game.live.combo || 0;
  const chips = [
    ['gameStreakChip', 'gameStreakValue', `${streak} d`, true],
    ['gameComboChip', 'gameComboValue', `x${combo}`, combo > 0],
    ['gameLevelChip', 'gameLevelValue', String(level.level), true],
  ];
  chips.forEach(([chipId, valueId, value]) => {
    const chip = document.getElementById(chipId);
    const valueNode = document.getElementById(valueId);
    if (valueNode) valueNode.textContent = value;
    if (chip) chip.hidden = true;
  });
}
function cycleBossSnapshot() {
  const cycle = cycleEarningsForOffset(0);
  const goal = effectiveCycleGoal(0);
  const defeated = goal > 0 && monetaryMilestones(cycle.earnings, goal).claimed.includes(100);
  const pct = defeated ? 100 : goal > 0 ? Math.max(0, Math.min(100, (cycle.earnings / goal) * 100)) : 0;
  const hp = Math.max(0, 100 - pct);
  const stateName = defeated ? 'defeated' : hp <= 25 ? 'wounded' : hp <= 50 ? 'angry' : 'awake';
  return { cycle, goal, pct, hp, defeated, stateName };
}

function cycleRewardOptionsFor(cycleKey) {
  const accessory = nextUnownedAccessory(`cycle-reward:${cycleKey}`);
  return [
    { id: 'cycle-xp', type: 'xp', amount: 35, label: translateText('35 XP de temporada') },
    ...(accessory ? [{ id: 'cycle-accessory', type: 'accessory', accessory, amount: 0, label: accessory }] : []),
  ];
}

export function nextRewardsSnapshot(dayKey = currentGameDayKey()) {
  ensureGameState();
  const day = computeGameDay(dayKey);
  const eligibleCount = day.eligibleCalls.length;
  const nextImpulse = IMPULSE_MILESTONES.find((milestone) => milestone > eligibleCount) || null;
  const nextLoot = eligibleCount < 5 ? 5 : Math.ceil((eligibleCount + 1) / 5) * 5;
  const level = gameLevelProgress();
  const unlocks = [...UNLOCK_ROADMAP, ...ACCESSORY_CATALOG.map((item) => ({ level: item.unlockLevel, id: item.id, label: item.label }))]
    .filter((item) => item.level > level.level)
    .sort((a, b) => a.level - b.level)
    .slice(0, 3);
  return {
    dayKey,
    nextImpulse,
    nextImpulseRemaining: nextImpulse ? Math.max(0, nextImpulse - eligibleCount) : 0,
    nextLoot,
    nextLootRemaining: Math.max(0, nextLoot - eligibleCount),
    level: { current: level.level, next: level.level + 1, xpRemaining: level.remaining },
    unlocks,
    pendingChest: !!state.game.chest.pending,
    pendingCycleReward: !!state.game.cycleReward?.pending,
  };
}

export const getNextRewards = nextRewardsSnapshot;
export const nextRewardsForDay = nextRewardsSnapshot;

export function unlocksForLevel(level = 1) {
  const numeric = Math.max(1, Math.floor(Number(level) || 1));
  return [
    ...UNLOCK_ROADMAP.filter((item) => item.level <= numeric).map((item) => item.id),
    ...ACCESSORY_CATALOG.filter((item) => item.unlockLevel <= numeric).map((item) => item.id),
  ];
}

export function equipmentForState(equipment = state.game?.equipment) {
  const source = equipment && typeof equipment === 'object' ? equipment : {};
  return Object.fromEntries(EQUIPMENT_SLOTS.map((slot) => {
    const value = source[slot];
    const item = ACCESSORY_BY_ID[String(value ?? '')] || ACCESSORY_BY_LABEL[String(value ?? '')];
    return [slot, item ? item.label : null];
  }));
}

export function chooseCycleReward(choiceId) {
  if (!gameEnabled()) return false;
  ensureGameState();
  const owner = state, game = state.game;
  const pending = state.game.cycleReward;
  if (!pending?.pending || !pending.cycleKey) return false;
  const key = `cycle-reward:${pending.cycleKey}`;
  if (state.game.ledger[key]) {
    state.game.cycleReward = { pending: false, cycleKey: null, options: [] };
    return false;
  }
  const option = (pending.options || []).find((item) => item.id === String(choiceId));
  if (!option) return false;
  if (option.type === 'accessory' && state.game.accessories.includes(option.accessory)) return false;
  const previous = { totalXp: state.game.totalXp, level: state.game.level, accessories: [...state.game.accessories], cycleReward: pending };
  const oldLevel = state.game.level;
  let applied = 0;
  if (option.type === 'accessory' && option.accessory) {
    if (!state.game.accessories.includes(option.accessory)) state.game.accessories.push(option.accessory);
  } else {
    const before = state.game.totalXp;
    state.game.totalXp = Math.max(0, Math.floor(before + (Number(option.amount) || 0)));
    applied = state.game.totalXp - before;
  }
  state.game.level = levelForXp(state.game.totalXp);
  state.game.ledger[key] = { type: 'cycle-reward', cycleKey: pending.cycleKey, choiceId: option.id, gross: Number(option.amount) || 0, applied, accessory: option.accessory || null };
  state.game.cycleReward = { pending: false, cycleKey: null, options: [] };
  if (saveStateOnly() === false) {
    if (state === owner && state.game === game) {
      Object.assign(game, previous);
      delete game.ledger[key];
    }
    return false;
  }
  queueGameToast(ui`🏆 Recompensa del ciclo · ${option.label}`, 'loot');
  renderGame();
  playGameSound(state.game.level > oldLevel ? 'level' : 'reward');
  return true;
}

function renderCycleBosses() {
  const boss = cycleBossSnapshot();
  const startLabel = formatCallDayLabel(todayCallDateKey(boss.cycle.start));
  const endLabel = formatCallDayLabel(todayCallDateKey(boss.cycle.end));
  const seasonLabel = document.querySelector('[data-game-role="season-label"]');
  if (seasonLabel) seasonLabel.textContent = `${startLabel} – ${endLabel}`;
  ['gameCycleBoss', 'gameCycleBossAchievements'].forEach((id) => {
    const root = document.getElementById(id);
    if (!root) return;
    root.hidden = !gameEnabled();
    if (!gameEnabled()) return;
    root.dataset.gameState = boss.stateName;
    const role = (name) => root.querySelector(`[data-game-role="${name}"]`);
    const title = role('cycle-title');
    const status = role('cycle-status');
    const subtitle = role('cycle-subtitle');
    const progress = role('cycle-progress');
    const earned = role('cycle-earned');
    const goal = role('cycle-goal');
    if (title) title.textContent = boss.defeated ? translateText('JEFE DERROTADO') : translateText('El Guardián de la Quincena');
    if (status) status.textContent = boss.defeated ? translateText('DERROTADO') : boss.hp <= 25 ? translateText('CASI CAE') : translateText('EN MARCHA');
    if (subtitle) subtitle.textContent = ui`Ciclo ${startLabel} — ${endLabel} · ${Math.round(boss.pct)}% de la meta.`;
    if (progress) {
      progress.style.width = `${boss.pct}%`;
      progress.parentElement?.setAttribute('aria-valuenow', String(Math.round(boss.pct)));
    }
    if (earned) earned.textContent = withConversion(boss.cycle.earnings);
    if (goal) goal.textContent = ui`Meta ${withConversion(boss.goal)}`;
    let choice = root.querySelector('[data-game-dynamic="cycle-choice"]');
    if (!choice) {
      choice = document.createElement('div');
      choice.dataset.gameDynamic = 'cycle-choice';
      root.appendChild(choice);
    }
    const pending = state.game.cycleReward?.pending && state.game.cycleReward.options?.length;
    const claimed = Object.values(state.game.ledger).filter(item => item?.type === 'cycle-reward' && item.cycleKey)
      .sort((a, b) => (callDateToDate(b.cycleKey)?.getTime() || 0) - (callDateToDate(a.cycleKey)?.getTime() || 0))[0];
    choice.className = 'game-cycle-choice';
    choice.hidden = !pending && !claimed;
    choice.innerHTML = pending ? ui`<strong>Elige tu recompensa del ciclo</strong><small>Premio del ciclo con cierre ${escapeHtml(formatCallDayLabel(state.game.cycleReward.cycleKey))}. Cumpliste su meta; este premio de juego no confirma un pago recibido.</small><div>${state.game.cycleReward.options.filter((option) => option.type !== 'accessory' || !state.game.accessories.includes(option.accessory)).map((option) => ui`<button type="button" data-game-action="choose-cycle-reward" data-cycle-reward="${escapeHtml(option.id)}">${escapeHtml(translateStoredText(option.label))}</button>`).join('')}</div>` : claimed ? ui`<strong>Recompensa del ciclo guardada</strong><small>Ciclo con cierre ${escapeHtml(formatCallDayLabel(claimed.cycleKey))} · ${escapeHtml(claimed.accessory ? translateText(claimed.accessory) : ui`${Number(claimed.gross) || 0} XP`)}. Ya fue reclamada; no se vuelve a entregar al abrir esta sección.</small>` : '';
  });
}
function syncCycleBossAchievement() {
  if (!gameEnabled()) return false;
  const boss = cycleBossSnapshot();
  if (!boss.defeated) return false;
  if (state.game.cycleReward?.pending) return false;
  const endKey = todayCallDateKey(boss.cycle.end);
  const key = `cycle-defeat:${endKey}`;
  if (state.game.ledger[key]) return false;
  state.game.ledger[key] = true;
  state.game.cycleReward = { pending: true, cycleKey: endKey, options: cycleRewardOptionsFor(endKey) };
  queueGameToast(ui`🏆 JEFE DEL CICLO DERROTADO · ${withConversion(boss.cycle.earnings)}`, 'record');
  return true;
}

function bestiarySnapshot() {
  const catalog = Object.values(MONSTER_CATALOG)
    .filter((entry, index, all) => all.findIndex((item) => item.id === entry.id) === index);
  const currentDate = callDateToDate(currentGameDayKey())?.getTime();
  const defeatedDays = Object.entries(state.game.days).map(([key, value]) => {
    if (value?.monster?.defeated || !(callDateToDate(key)?.getTime() < currentDate) || !state.game.ledger[`monster-defeat:${key}`]) return [key, value];
    const day = computeGameDay(key);
    return [key, day.defeated ? { ...value, monster: { defeated: true, species: day.species.id, variant: monsterVariantFor(day) } } : value];
  })
    .filter(([, value]) => value?.monster?.defeated)
    .sort((a, b) => (callDateToDate(b[0])?.getTime() || 0) - (callDateToDate(a[0])?.getTime() || 0));
  const seen = new Map();
  defeatedDays.forEach(([key, value]) => {
    if (!seen.has(value.monster.species)) seen.set(value.monster.species, { key, ...value });
  });
  return { catalog, seen };
}

function renderBestiary() {
  const root = document.getElementById('gameBestiary');
  if (!root) return;
  const { catalog, seen } = bestiarySnapshot();
  const count = root.querySelector('[data-game-role="bestiary-count"]');
  const list = root.querySelector('[data-game-role="bestiary-list"]');
  if (count) count.textContent = `${seen.size} / ${catalog.length}`;
  if (!list) return;
  const speciesHtml = catalog.map((entry) => {
    const found = seen.get(entry.id);
    return ui`<article class="game-collection-card ${found ? 'is-unlocked' : 'is-locked'}">
      <div class="game-bestiary-sprite">${monsterSvg({ species: entry.id, state: found ? 'defeated' : 'sleeping', variant: found?.monster?.variant || 'normal', hpPct: found ? 0 : 100, sizeClass: 'md' })}</div>
      <strong>${found ? escapeHtml(translateText(entry.name)) : '???'}</strong>
      <small>${found ? `${formatCallDayLabel(found.key)} · ${'★'.repeat(found.stars || 1)}` : translateText('Derrota esta especie para revelarla')}</small>
    </article>`;
  }).join('');
  const accessoriesHtml = state.game.accessories.map((accessory) => ui`
    <article class="game-collection-card is-unlocked game-accessory-card">
      <div class="game-bestiary-sprite" aria-hidden="true">✦</div>
      <strong>${escapeHtml(translateText(accessory))}</strong>
      <small>Accesorio desbloqueado</small>
    </article>`).join('');
  list.innerHTML = speciesHtml + accessoriesHtml;
}

function dynamicPanelNode(parent, key, className) {
  if (!parent) return null;
  let node = parent.querySelector(`[data-game-dynamic="${key}"]`);
  if (!node) {
    node = document.createElement('div');
    node.dataset.gameDynamic = key;
    parent.appendChild(node);
  }
  node.className = className;
  node.hidden = !gameEnabled();
  return node;
}

function renderGameProgressRoadmap() {
  const level = gameLevelProgress();
  const next = nextRewardsSnapshot(currentGameDayKey());
  const nextGoals = dynamicPanelNode(document.getElementById('gameAchievementsSummary'), 'next-goals', 'game-next-goals');
  if (nextGoals) {
    nextGoals.innerHTML = ui`<strong>Próximas recompensas<span class="sched-help-wrap game-help-wrap"><button class="sched-compact-info-btn" type="button" aria-label="Acerca de Próximas recompensas" aria-describedby="nextRewardsInfo">i</button><span class="sched-help-tooltip" id="nextRewardsInfo" role="tooltip">Impulso: bonus de XP por mantener una serie de llamadas. Caja: recompensa de juego por llamadas completadas. Los contadores indican cuánto falta para cada hito; respetan los límites diarios y no cambian tu pago.</span></span></strong><div>${[
      next.nextImpulse ? ui`Impulso x${next.nextImpulse} · ${next.nextImpulseRemaining} llamada(s)` : translateText('Impulsos del día completados'),
      ui`Caja x${next.nextLoot} · ${next.nextLootRemaining} llamada(s)`,
      ui`Nivel ${next.level.next} · ${next.level.xpRemaining} XP`,
    ].map((label) => ui`<span class="game-next-goal">${escapeHtml(label)}</span>`).join('')}</div>`;
  }

  const levelRoot = document.getElementById('gameLevelPanel');
  const roadmap = dynamicPanelNode(levelRoot, 'unlock-roadmap', 'game-unlock-roadmap');
  if (roadmap) {
    const roadmapItems = [...UNLOCK_ROADMAP, ...ACCESSORY_CATALOG.map((item) => ({ level: item.unlockLevel, id: item.id, label: ui`${translateText(item.label)} · ranura ${slotLabel(item.slot)}` }))];
    roadmap.innerHTML = roadmapItems.map((item) => ui`<div class="${item.level <= level.level ? 'is-unlocked' : 'is-locked'}"><strong>Nivel ${item.level}</strong><small>${escapeHtml(translateText(item.label))}</small></div>`).join('');
    roadmap.setAttribute('aria-label', ui`Desbloqueos del nivel ${level.level}`);
  }

  const equipmentPanel = document.getElementById('gameEquipmentPanel');
  const equipmentRoot = equipmentPanel?.querySelector('[data-game-role="equipment-list"]');
  if (equipmentPanel && equipmentRoot) {
    const equipped = equipmentForState();
    const previews = new Set([...equipmentRoot.querySelectorAll('details[open]')].map(node => node.dataset.equipmentPreview));
    const day = computeGameDay(currentGameDayKey());
    const renderKey = JSON.stringify([equipped, state.game.accessories, level.level, day.species.id, displayLocale()]);
    if (equipmentRoot.dataset.renderKey === renderKey) return;
    equipmentRoot.dataset.renderKey = renderKey;
    const ownedCount = ACCESSORY_CATALOG.filter((item) => state.game.accessories.includes(item.label)).length;
    const count = equipmentPanel.querySelector('[data-game-role="equipment-count"]');
    const empty = equipmentPanel.querySelector('[data-game-role="equipment-empty"]');
    if (count) count.textContent = `${ownedCount} / ${ACCESSORY_CATALOG.length}`;
    if (empty) empty.hidden = ownedCount > 0;
    equipmentRoot.innerHTML = ACCESSORY_CATALOG.map((item) => {
      const owned = state.game.accessories.includes(item.label);
      const levelUnlocked = level.level >= item.unlockLevel;
      const active = equipped[item.slot] === item.label;
      const available = owned && levelUnlocked;
      const lockedLabel = !owned ? translateText('Por encontrar') : ui`Disponible en nivel ${item.unlockLevel}`;
      const stateName = active ? 'equipped' : available ? 'available' : 'locked';
      const control = available
        ? ui`<button type="button" class="game-text-button game-equipment-state" data-game-action="equip-accessory" data-accessory="${escapeHtml(item.id)}" aria-pressed="${active}">${active ? translateText('Quitar') : translateText('Equipar')}</button>`
        : ui`<span class="game-equipment-state">${escapeHtml(lockedLabel)}</span>`;
      const preview = monsterSvg({ species: day.species.id, state: 'awake', variant: 'normal', hpPct: 100, sizeClass: 'sm', equipment: { ...equipped, [item.slot]: item.label } });
      return ui`<article class="game-equipment-item ${active ? 'is-equipped' : available ? 'is-owned' : 'is-locked'}" data-equipment-state="${stateName}" role="listitem"><span class="game-equipment-icon" aria-hidden="true">${gamePixelIcon(item.slot === 'body' ? 'shield' : item.slot === 'head' ? 'crown' : 'gem')}</span><span class="game-equipment-copy"><strong>${escapeHtml(translateText(item.label))}</strong><small>Ranura ${escapeHtml(slotLabel(item.slot))} · nivel ${item.unlockLevel}</small><details class="review-details" data-equipment-preview="${item.id}" ${previews.has(item.id) ? 'open' : ''}><summary>Vista previa</summary><div class="review-detail-body">${preview}<small>Vista previa sin equipar ni guardar cambios.</small></div></details></span>${control}</article>`;
    }).join('');
  }
}

function slotLabel(slot) {
  return ({ head: translateText('Cabeza'), neck: translateText('Cuello'), body: translateText('Cuerpo'), back: translateText('Espalda'), face: translateText('Rostro') })[slot] || slot;
}

function trophyLabel(item) {
  const label = String(item.label || item.id || '');
  const streak = label.match(/^(?:Racha de (\d+) días|(\d+)-day streak)$/);
  if (streak) return ui`Racha de ${streak[1] || streak[2]} días`;
  const goal = label.match(/^(?:Meta cumplida|Goal completed): (.*)$/);
  if (String(item.id).startsWith('finance-meta:') && goal) return ui`Meta cumplida: ${goal[1]}`;
  return translateText(label);
}

function renderAchievements() {
  const summary = document.getElementById('gameAchievementsSummary');
  if (!summary) return;
  const level = gameLevelProgress();
  const streak = gameStreak();
  const summaryValues = {
    streak: ui`${streak} días`,
    level: String(level.level),
    xp: String(state.game.totalXp),
    shields: String(state.game.shields),
  };
  Object.entries(summaryValues).forEach(([key, value]) => {
    const node = summary.querySelector(`[data-game-stat="${key}"]`);
    if (node) node.textContent = value;
  });

  const streakRoot = document.getElementById('gameStreakPanel');
  if (streakRoot) {
    const best = streakRoot.querySelector('[data-game-role="streak-best"]');
    const shields = streakRoot.querySelector('[data-game-role="shields"]');
    const week = streakRoot.querySelector('[data-game-role="streak-week"]');
    if (best) best.textContent = ui`Mejor: ${state.game.bestStreak}`;
    if (shields) shields.textContent = `${state.game.shields}/${GAME_SHIELD_CAP}`;
    if (week) {
      const cells = Array.from(week.querySelectorAll('.game-streak-day'));
      const todayKey = todayCallDateKey();
      const today = callDateToDate(todayKey) || new Date();
      const mondayOffset = (today.getDay() + 6) % 7;
      const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayOffset);
      cells.forEach((cell, index) => {
        const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index);
        const key = todayCallDateKey(date);
        const status = dayComplianceStatus(key);
        const shieldUsed = !!state.game.days[key]?.shieldUsed;
        const isToday = key === todayKey;
        const displayState = shieldUsed ? 'shield'
          : status === 'compliant' ? 'done'
          : status === 'off' ? 'off'
          : isToday ? 'today'
          : status === 'failed' ? 'failed'
          : 'empty';
        cell.dataset.dayState = displayState;
        const stateLabel = ({ shield: translateText('Protegido con escudo'), done: translateText('Cumplido'), off: translateText('Día libre'), today: translateText('Hoy'), failed: translateText('No cumplido'), empty: translateText('Sin datos') })[displayState];
        const label = `${formatCallDayLabel(key)}: ${stateLabel}`;
        cell.title = label;
        cell.setAttribute('aria-label', label);
        const mark = cell.querySelector('em');
        if (mark) mark.textContent = shieldUsed ? '◆' : status === 'compliant' ? '✓' : status === 'off' ? '·' : isToday ? '○' : status === 'failed' ? '×' : '—';
      });
    }
  }

  const levelRoot = document.getElementById('gameLevelPanel');
  if (levelRoot) {
    const setRole = (name, value) => {
      const node = levelRoot.querySelector(`[data-game-role="${name}"]`);
      if (node) node.textContent = value;
      return node;
    };
    setRole('level', String(level.level));
    setRole('level-emblem', String(level.level));
    setRole('level-xp', `${state.game.totalXp} XP`);
    setRole('next-level', ui`Siguiente: ${level.ceiling} XP`);
    const progress = levelRoot.querySelector('[data-game-role="level-progress"]');
    if (progress) {
      progress.style.width = `${level.pct}%`;
      progress.parentElement?.setAttribute('aria-valuenow', String(Math.round(level.pct)));
    }
    const ladder = levelRoot.querySelector('[data-game-role="level-ladder"]');
    if (ladder) {
      const steps = ladder.querySelectorAll('span');
      steps.forEach((step, index) => {
        step.textContent = String(level.level + index);
        step.classList.toggle('is-current', index === 0);
      });
    }
  }
  renderBestiary();
  renderGameProgressRoadmap();

  const trophies = document.getElementById('gameTrophies');
  if (trophies) {
    const count = trophies.querySelector('[data-game-role="trophy-count"]');
    const list = trophies.querySelector('[data-game-role="trophy-list"]');
    if (count) count.textContent = String(state.game.trophies.length);
    if (list) list.innerHTML = state.game.trophies.length
      ? state.game.trophies.map((item) => ui`<div class="game-trophy-row"><span>${gamePixelIcon('star')} ${escapeHtml(trophyLabel(item))}</span><strong>${item.earnedOn ? escapeHtml(formatCallDayLabel(item.earnedOn)) : translateText('Ganado')}</strong></div>`).join('')
      : translateMarkup('<div class="game-collection-empty">Tus próximos trofeos aparecerán aquí.</div>');
  }

  const records = document.getElementById('gameRecords');
  if (records) {
    const list = records.querySelector('[data-game-role="records-list"]');
    const longest = calls.reduce((best, call) => Math.max(best, Number(call.durationMin) || 0), 0);
    const biggest = calls.reduce((best, call) => Math.max(best, parseMoney(call.pay)), 0);
    if (list) list.innerHTML = ui`
      <div class="game-record-row"><span>Mayor pago</span><strong>${withConversion(biggest)}</strong></div>
      <div class="game-record-row"><span>Llamada más larga</span><strong>${formatMinutes(longest)} min</strong></div>
      <div class="game-record-row"><span>Mejor racha semanal</span><strong>${state.game.bestStreak} días</strong></div>`;
  }

  const last = document.getElementById('gameLastStageClear');
  if (last) {
    const latest = Object.entries(state.game.days)
      .filter(([, value]) => value?.finalized)
      .sort((a, b) => (callDateToDate(b[0])?.getTime() || 0) - (callDateToDate(a[0])?.getTime() || 0))[0];
    const date = last.querySelector('[data-game-role="last-clear-date"]');
    const content = last.querySelector('[data-game-role="last-clear-content"]');
    const button = last.querySelector('[data-game-action="open-last-clear"]');
    if (latest) {
      const [key, entry] = latest;
      if (date) date.textContent = formatCallDayLabel(key);
      if (content) content.innerHTML = ui`${pixelStars(entry.stars)}<p>${entry.xp} XP · ${entry.monster?.defeated ? translateText('Monstruo derrotado') : translateText('Stage guardado')}</p>`;
      if (button) {
        button.hidden = false;
        button.dataset.dayKey = key;
      }
    } else {
      if (date) date.textContent = '—';
      if (content) content.innerHTML = ui`${pixelStars(0)}<p>Aún no hay un STAGE CLEAR guardado.</p>`;
      if (button) {
        button.hidden = true;
        delete button.dataset.dayKey;
      }
    }
    const pendingChest = last.querySelector('[data-game-role="chest-claim"]');
    const hasPendingChest = !!state.game.chest.pending && !!state.game.chest.sealedOn;
    if (pendingChest) {
      pendingChest.hidden = !hasPendingChest;
      pendingChest.innerHTML = hasPendingChest
        ? ui`<span aria-hidden="true" class="game-chest-claim-icon">${gamePixelChest()}</span><span class="game-chest-claim-copy"><strong>Cofre sellado desde ${escapeHtml(formatCallDayLabel(state.game.chest.sealedOn))}</strong><small>Tu recompensa ya está lista.</small><button type="button" class="game-text-button" data-game-action="claim-chest">Reclamar ahora</button></span>`
        : '';
    }
  }
}
function renderSettingsProfile() {
  const enabled = document.getElementById('gameEnabledInput');
  const monsterName = document.getElementById('monsterNameInput');
  const profile = document.getElementById('gameSettingsProfile');
  const level = gameLevelProgress();
  if (enabled) enabled.checked = gameEnabled();
  const sidebarEnabled = document.getElementById('sidebarAchievementsInput');
  if (sidebarEnabled) sidebarEnabled.checked = gameEnabled();
  const soundEnabled = document.getElementById('sidebarGameSoundInput');
  if (soundEnabled) {
    soundEnabled.checked = settings.game.soundEnabled;
    soundEnabled.disabled = false;
  }
  const soundVolume = document.getElementById('gameSoundVolumeInput');
  if (soundVolume && document.activeElement !== soundVolume) soundVolume.value = settings.game.soundVolume;
  const soundValue = document.getElementById('gameSoundVolumeValue');
  if (soundValue) soundValue.textContent = `${settings.game.soundVolume}%`;
  const savedMonsterName = sanitizeMonsterName(settings.game.monsterName);
  if (lastSettingsMonsterName !== savedMonsterName) {
    monsterNameDraftDirty = false;
    lastSettingsMonsterName = savedMonsterName;
  }
  if (monsterName && !monsterNameDraftDirty && document.activeElement !== monsterName) monsterName.value = savedMonsterName;
  if (!profile) return;
  const { seen } = bestiarySnapshot();
  const values = {
    level: ui`Nivel ${level.level}`,
    xp: `${state.game.totalXp} XP`,
    streak: ui`${state.game.bestStreak} días`,
    collection: String(seen.size),
  };
  Object.entries(values).forEach(([key, value]) => {
    const node = profile.querySelector(`[data-game-profile="${key}"]`);
    if (node) node.textContent = value;
  });
}

function revokeAccessoryReceipt(accessory, excludedKey) {
  const grantedElsewhere = Object.entries(state.game.ledger).some(([key, receipt]) => (
    key !== excludedKey && receipt && typeof receipt === 'object' && receipt.accessory === accessory
  ));
  if (grantedElsewhere) return false;
  state.game.accessories = state.game.accessories.filter((item) => item !== accessory);
  EQUIPMENT_SLOTS.forEach((slot) => {
    if (state.game.equipment?.[slot] === accessory) state.game.equipment[slot] = null;
  });
  return true;
}

function rollbackFinanceReward(key) {
  const receipt = state.game.ledger[key];
  if (key.startsWith('finance-meta:')) {
    state.game.trophies = state.game.trophies.filter((item) => item?.id !== key);
  }
  if (receipt && typeof receipt === 'object') {
    if (receipt.accessory) revokeAccessoryReceipt(receipt.accessory, key);
    const appliedBonus = Number.isFinite(Number(receipt.applied)) ? Number(receipt.applied) : Number(receipt.bonusXp) || 0;
    if (receipt.dayKey && appliedBonus > 0) {
      const entry = state.game.days[receipt.dayKey];
      if (entry && typeof entry === 'object') {
        entry.bonusXp = Math.max(0, (Number(entry.bonusXp) || 0) - appliedBonus);
      }
    }
  }
  delete state.game.ledger[key];
}

function rollbackChestReward(dayKey) {
  const key = `chest:${dayKey}`;
  const receipt = state.game.ledger[key];
  if (!receipt || typeof receipt !== 'object') return false;
  const applied = Math.max(0, Number(receipt.applied) || 0);
  if (applied) state.game.totalXp = Math.max(0, state.game.totalXp - applied);
  if (receipt.accessory) revokeAccessoryReceipt(receipt.accessory, key);
  delete state.game.ledger[key];
  return true;
}

function reconcileGoalChest(dayKey, snapshot) {
  if (snapshot.defeated || state.game.ledger[`chest:${dayKey}`]?.goalReward !== true) return false;
  rollbackChestReward(dayKey);
  dayEntry(dayKey).goalChestAdjustedAt=new Date().toISOString();
  state.game.level = levelForXp(state.game.totalXp);
  return true;
}

function syncFinanceRewards() {
  if (!settings.financeCategories) return false;
  const enabled = gameEnabled();
  if (state.game.days[currentGameDayKey()]?.finalized) return false;
  let changed = false;
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const validMetaKeys = new Set();
  const validPaidKeys = new Set();

  Object.values(settings.financeCategories).forEach((category) => {
    (category?.rows || []).forEach((row) => {
      const assigned = Number(row.assignedAmount) || 0;
      const target = Number(row.targetAmount) || 0;

      if (financeRowIsMeta(row)) {
        const key = `finance-meta:${row.id}`;
        const complete = target > 0 && assigned > 0 && assigned >= target - 0.004;
        if (complete) validMetaKeys.add(key);
        if (!complete || state.game.ledger[key] || !enabled) return;

        const dayKey = todayCallDateKey();
        const bonus = grantDayBonusReceipt(dayKey, 10);
        const granted = bonus.applied;
        const accessory = nextUnownedAccessory(key);
        if (accessory) state.game.accessories.push(accessory);
        state.game.trophies.push({ id: key, label: ui`Meta cumplida: ${row.name}`, earnedOn: dayKey });
        state.game.ledger[key] = { type: 'finance-meta', dayKey, bonusXp: granted, gross: bonus.gross, applied: bonus.applied, accessory: accessory || null };
        changed = true;
        queueGameToast(ui`🏆 Trofeo desbloqueado: ${row.name}`);
        return;
      }

      if (row.recurring) {
        const key = `finance-paid:${row.id}:${month}`;
        const paid = financeReservationComplete(row);
        if (paid) validPaidKeys.add(key);
        if (!paid || state.game.ledger[key] || !enabled) return;
        const dayKey = todayCallDateKey();
        const bonus = grantDayBonusReceipt(dayKey, 5);
        const granted = bonus.applied;
        state.game.ledger[key] = { type: 'finance-paid', dayKey, bonusXp: granted, gross: bonus.gross, applied: bonus.applied };
        changed = true;
        queueGameToast(granted > 0 ? ui`+${granted} XP · ${row.name} con reserva completa` : ui`${row.name} con reserva completa · XP diario sellado`);
      }
    });
  });

  Object.keys(state.game.ledger).forEach((key) => {
    if (key.startsWith('finance-meta:') && !validMetaKeys.has(key)) {
      rollbackFinanceReward(key);
      changed = true;
    }
    if (key.startsWith('finance-paid:') && key.endsWith(`:${month}`) && !validPaidKeys.has(key)) {
      rollbackFinanceReward(key);
      changed = true;
    }
  });

  return changed;
}

function clearTransientGameUi() {
  stopBattle();
  callFxVersion += 1;
  const arena = document.getElementById('gameArena');
  arena?.classList.remove('is-hit', 'is-critical-hit');
  arena?.removeAttribute('data-game-event');
  const loot = document.getElementById('gameLootBox');
  if (loot) {
    loot.hidden = true;
    loot.classList.remove('is-revealing');
  }
  const record = document.getElementById('gameRecordBanner');
  if (record) record.hidden = true;
  const fx = document.getElementById('gameCallFx');
  if (fx) fx.innerHTML = '';
  document.querySelectorAll('.game-pixel-fx-layer').forEach((node) => node.remove());
  document.querySelectorAll('.game-live-xp-float').forEach((node) => node.remove());
  const live = document.getElementById('gameStatusLive');
  if (live && !reinforcementFeedbackEnabled('either')) live.textContent = '';
  for (const id of ['stageClearModal', 'chestModal']) {
    if (document.getElementById(id)?.classList.contains('open')) closeModal(id);
  }
}

export function renderGame() {
  ensureGameSettings();
  ensureGameState();
  syncGameAudio();
  const enabled = gameEnabled();
  document.documentElement.classList.toggle('game-arcade', arcadeEnabled());
  document.documentElement.classList.toggle('game-subtle', false);

  pruneDisabledGameToasts();

  if (!enabled) clearTransientGameUi();

  const financeChanged = syncFinanceRewards();
  const bossDefeatedNow = syncCycleBossAchievement();
  if (financeChanged || bossDefeatedNow) saveStateOnly();

  renderHeroChips();
  renderArena();
  renderMissions();
  renderCycleBosses();
  renderAchievements();
  renderSettingsProfile();
  renderPositiveReinforcement();
  reviewGame?.();

  if (bossDefeatedNow) {
    triggerGameEvent('gameCycleBoss', 'clear', 1000);
    triggerGameEvent('gameCycleBossAchievements', 'clear', 1000);
    playGameTone('cycle');
  }
  drainGameToasts();
}

export function renderGameLive() {
  if (!gameEnabled()) return drainGameToasts();
  renderArena();
  drainGameToasts();
}

const gameToastQueue = [];
let lastGameToastText = '';
let lastDisplayedToastText = '';
const TOAST_PRIORITIES = Object.freeze({ record: 4, loot: 3, impulse: 2, critical: 2, '': 1 });

export function announceGameStatus(message, { channel = 'game' } = {}) {
  if (callFeedbackSilenced()) return;
  if (!reinforcementFeedbackEnabled(channel) || state.activeCall) return;
  const live = document.getElementById('gameStatusLive');
  if (!live || !message) return;
  live.textContent = '';
  live.textContent = String(message);
}

export function queueGameToast(message, tone = '', options = {}) {
  if (callFeedbackSilenced()) return;
  const text = String(message ?? '').trim();
  const channel = options.channel || 'game';
  const allowed = reinforcementFeedbackEnabled(channel);
  if (!text || !allowed || (options.repeat !== true && text === lastGameToastText)) return;
  const key = `${tone}:${text}`;
  if (gameToastQueue.some((item) => item.key === key) || Array.from(document.querySelectorAll('#gameToastStack [data-game-toast-key]')).some((node) => node.dataset.gameToastKey === key)) return;
  const priority = Number.isFinite(Number(options.priority)) ? Number(options.priority) : (TOAST_PRIORITIES[tone] || 1);
  lastGameToastText = text;
  gameToastQueue.push({ key, message: text, tone, priority, channel, repeat: options.repeat === true });
  gameToastQueue.sort((a, b) => b.priority - a.priority);
  if (options.announce !== false) announceGameStatus(text, { channel });
  drainGameToasts();
}

function pruneDisabledGameToasts() {
  const stack = document.getElementById('gameToastStack');
  for (const node of Array.from(stack?.children || [])) {
    if (!reinforcementFeedbackEnabled(node.dataset.gameToastChannel || 'game')) node.remove();
  }
  for (let index = gameToastQueue.length - 1; index >= 0; index--) {
    if (!reinforcementFeedbackEnabled(gameToastQueue[index].channel)) gameToastQueue.splice(index, 1);
  }
}

function drainGameToasts() {
  const stack = document.getElementById('gameToastStack');
  if (stack) stack.hidden = !!state.activeCall;
  if (!stack || state.activeCall || document.querySelector('.modal-overlay.open')) return;
  while (gameToastQueue.length && stack.children.length < 3) {
    const item = gameToastQueue.shift();
    const allowed = reinforcementFeedbackEnabled(item.channel);
    if (!allowed) continue;
    if (!item.repeat && item.message === lastDisplayedToastText) continue;
    lastDisplayedToastText = item.message;
    const toastElement = document.createElement('div');
    toastElement.className = `game-toast ${item.tone ? `game-toast--${item.tone}` : ''}`;
    toastElement.dataset.gameToastKey = item.key;
    toastElement.dataset.gameToastChannel = item.channel;
    toastElement.textContent = item.message;
    stack.appendChild(toastElement);
    requestAnimationFrame(() => toastElement.classList.add('show'));
    setTimeout(() => {
      toastElement.classList.remove('show');
      setTimeout(() => {
        toastElement.remove();
        drainGameToasts();
      }, 220);
    }, 2600);
  }
}

function playGameTone(kind = 'hit', dayKey = currentGameDayKey(), channel = 'game') {
  const allowed = () => !state.activeCall && reinforcementFeedbackEnabled(channel) && dayKey === currentGameDayKey()
    && (channel === 'personal' || dayKey === displayedGameDayKey());
  if (!allowed()) return false;
  return playGameSound(kind, { allowed, channel });
}

const gameEventVersions = new WeakMap();

function pixelBurst(root, kind, damageText = '') {
  if (state.activeCall || !arcadeEnabled() || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  if (!root || root.hidden || typeof document.createElement !== 'function' || typeof root.appendChild !== 'function') return;
  const host = root.querySelector('.game-monster-stage') || root;
  if (host.getClientRects && !host.getClientRects().length) return;
  if (!damageText && ['hit', 'critical'].includes(kind) && host.querySelector('.game-pixel-damage')) return;
  host.querySelector('.game-pixel-fx-layer')?.remove();
  host.classList.add('game-pixel-fx-host');
  const layer = document.createElement('div');
  layer.className = `game-pixel-fx-layer game-pixel-fx--${kind}`;
  layer.setAttribute('aria-hidden', 'true');
  const count = kind === 'clear' || kind === 'loot' ? 20 : kind === 'mission' ? 14 : 8;
  for (let index = 0; index < count; index++) {
    const bit = document.createElement('i');
    const angle = index / count * Math.PI * 2;
    bit.className = 'game-pixel-particle';
    bit.style.setProperty('--pixel-x', `${Math.round(Math.cos(angle) * (34 + index % 4 * 10))}px`);
    bit.style.setProperty('--pixel-y', `${Math.round(Math.sin(angle) * 45 - 16)}px`);
    layer.appendChild(bit);
  }
  if (damageText) {
    const damage = document.createElement('span');
    damage.className = 'game-pixel-damage';
    damage.textContent = damageText;
    layer.appendChild(damage);
  }
  host.appendChild(layer);
  setTimeout(() => layer.remove(), 950);
}

function triggerGameEvent(rootId, eventName, duration = 900) {
  if (callFeedbackSilenced()) return;
  if (!arcadeEnabled() || state.activeCall) return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const root = document.getElementById(rootId);
  if (!root) return;
  const version = (gameEventVersions.get(root) || 0) + 1;
  gameEventVersions.set(root, version);
  root.removeAttribute('data-game-event');
  void root.offsetWidth;
  root.dataset.gameEvent = eventName;
  queueMicrotask(() => {
    if (gameEventVersions.get(root) === version && root.dataset.gameEvent === eventName) pixelBurst(root, eventName);
  });
  setTimeout(() => {
    if (gameEventVersions.get(root) === version && root.dataset.gameEvent === eventName) root.removeAttribute('data-game-event');
  }, duration);
}

function grantDayBonus(dayKey, amount) {
  const snapshot = computeGameDay(dayKey);
  const before = snapshot.xp;
  const entry = dayEntry(dayKey);
  if (entry.finalized || Number.isFinite(Number(entry.xpLocked))) return 0;
  if (before >= GAME_DAILY_XP_CAP || !snapshot.eligibleCalls.length) return 0;
  const previousBonus = Number(entry.bonusXp) || 0;
  entry.bonusXp = Math.min(GAME_DAILY_XP_CAP, previousBonus + Math.min(GAME_DAILY_XP_CAP - before, Math.max(0, Number(amount) || 0)));
  const recalculated = computeGameDay(dayKey);
  return Math.max(0, recalculated.xp - before);
}

function grantDayBonusReceipt(dayKey, grossAmount) {
  const gross = Math.max(0, Math.floor(Number(grossAmount) || 0));
  const applied = grantDayBonus(dayKey, gross);
  return { gross, applied: Math.max(0, Math.min(gross, applied)), amount: Math.max(0, Math.min(gross, applied)) };
}

let callFxVersion = 0;

function showCallFx(call, xp, critical, mode = 'xp') {
  if (callFeedbackSilenced()) return true;
  const root = document.getElementById('gameCallFx');
  if (!root) return false;
  const version = ++callFxVersion;
  if (state.activeCall) return true;
  const amount = parseMoney(call.pay) + higherRateBonusAmount(call);
  const dayKey = callDateKeyFromValue(call.shiftDayKey) || callDateKeyFromValue(call.callDate) || currentGameDayKey();
  const battlePlayed = dayKey === currentGameDayKey() && dayKey === displayedGameDayKey() && playBattleCall({ dayKey, amountText: ui`−${money(amount)} ${convertedAmountText(amount)}`.trim(), xp, critical, silentSound: gameSoundsSilenced() });
  if (battlePlayed) {
    root.innerHTML = '';
    document.querySelectorAll('.game-live-xp-float').forEach(node => node.remove());
    return true;
  }
  if (!arcadeEnabled() || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    root.innerHTML = '';
    document.querySelectorAll('.game-live-xp-float').forEach((node) => node.remove());
    return battlePlayed;
  }
  const message = mode === 'recorded'
    ? ui`LLAMADA REGISTRADA · ${withConversion(amount)} · sin XP por esta llamada`
    : mode === 'extra'
    ? ui`BOTÍN EXTRA · ${withConversion(amount)}`
    : xp > 0
      ? ui`+${xp} XP · ${withConversion(amount)}`
      : ui`XP DIARIO SELLADO · ${withConversion(amount)}`;
  const fxMarkup = ui`<span class="game-xp-float ${critical ? 'is-critical' : ''}">${message}</span>`;
  root.innerHTML = fxMarkup;
  const liveBar = document.getElementById('liveActivityBar');
  const liveFx = liveBar?.classList.contains('show') ? document.createElement('span') : null;
  if (liveFx) {
    liveFx.className = `game-xp-float game-live-xp-float ${critical ? 'is-critical' : ''}`;
    liveFx.innerHTML = message;
    liveBar.appendChild(liveFx);
  }
  const arena = document.getElementById('gameArena');
  if (arena) {
    arena.classList.remove('is-hit', 'is-critical-hit');
    void arena.offsetWidth;
    arena.classList.add(critical ? 'is-critical-hit' : 'is-hit');
    if (!battlePlayed) pixelBurst(arena, critical ? 'critical' : 'hit', `−${money(amount)}`);
  }
  setTimeout(() => {
    liveFx?.remove();
    if (version !== callFxVersion) return;
    root.innerHTML = '';
    arena?.classList.remove('is-hit', 'is-critical-hit');
  }, 2100);
  return battlePlayed;
}

function nextUnownedAccessory(seed) {
  if (!ACCESSORIES.length) return null;
  const start = hashText(seed) % ACCESSORIES.length;
  for (let offset = 0; offset < ACCESSORIES.length; offset++) {
    const accessory = ACCESSORIES[(start + offset) % ACCESSORIES.length];
    if (!state.game.accessories.includes(accessory)) return accessory;
  }
  return null;
}

export function lootRarityFor(seed, improved = false) {
  const total = LOOT_RARITIES.reduce((sum, rarity) => sum + rarity.weight, 0);
  let roll = hashText(`${seed}:rarity`) % total;
  if (improved) roll = Math.min(total - 1, roll + Math.floor(total * 0.2));
  let cursor = 0;
  const result = LOOT_RARITIES.find((rarity) => {
    cursor += rarity.weight;
    return roll < cursor;
  })?.id || 'common';
  return improved && result === 'common' ? 'uncommon' : result;
}

export const getLootRarity = lootRarityFor;

function lootRarityLabel(id) {
  return LOOT_RARITIES.find((rarity) => rarity.id === id)?.label || translateText('Común');
}

function repairBonusReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object' || !['bonusXp', 'bonus-xp'].includes(receipt.type)) return receipt;
  const gross = Math.max(0, Math.floor(Number(receipt.gross ?? receipt.amount) || 0));
  const appliedValue = Number(receipt.applied ?? receipt.amount);
  const applied = Number.isFinite(appliedValue) ? Math.max(0, Math.min(gross, Math.floor(appliedValue))) : 0;
  receipt.gross = gross;
  receipt.applied = applied;
  receipt.amount = applied;
  return receipt;
}

function rewardLootBox(dayKey, callCount, { improved = false, source = 'calls' } = {}) {
  const ledgerKey = `loot:${dayKey}:${callCount}${improved ? ':improved' : ''}`;
  if (state.game.ledger[ledgerKey]) return;
  const root = document.getElementById('gameLootBox');
  const roll = hashText(ledgerKey) % 4;
  const rarity = lootRarityFor(ledgerKey, improved);
  let reward;
  let receipt = { type: 'none', dayKey, gross: 0, applied: 0, rarity, improved, source };
  if (roll === 0 || improved) {
    const accessory = nextUnownedAccessory(`${ledgerKey}:accessory`);
    if (accessory) {
      state.game.accessories.push(accessory);
      receipt = { type: 'accessory', accessory, dayKey, gross: 0, applied: 0, rarity, improved, source };
      reward = ui`Accesorio ${lootRarityLabel(rarity)}: ${accessory}`;
    } else {
      const bonus = grantDayBonusReceipt(dayKey, improved ? 20 : 10);
      receipt = { type: 'bonusXp', dayKey, ...bonus, rarity, improved, source };
      reward = bonus.applied > 0 ? ui`Colección completa · +${bonus.applied} XP` : translateText('Colección completa · XP diario sellado');
    }
  } else {
    const bonus = grantDayBonusReceipt(dayKey, 10);
    receipt = { type: 'bonusXp', dayKey, ...bonus, rarity, improved, source };
    reward = bonus.applied > 0 ? `+${bonus.applied} XP ${lootRarityLabel(rarity).toLowerCase()}` : translateText('XP diario ya sellado');
  }
  state.game.ledger[ledgerKey] = receipt;
  if (root && gameEnabled()) {
    root.hidden = false;
    root.classList.toggle('is-revealing', arcadeEnabled());
    root.innerHTML = ui`<span class="game-loot-icon">?</span><div><b>CAJA ${escapeHtml(lootRarityLabel(rarity).toUpperCase())}</b><span>${escapeHtml(reward)}</span></div>`;
    setTimeout(() => {
      root.hidden = true;
      root.classList.remove('is-revealing');
    }, 4200);
  }
  queueGameToast(`🎁 ${reward}`, 'loot');
  playGameTone('loot', dayKey);
}

function rollbackLootReceipt(dayKey, ledgerKey) {
  const receipt = state.game.ledger[ledgerKey];
  if (receipt && typeof receipt === 'object') {
    if (receipt.type === 'accessory' && receipt.accessory) {
      revokeAccessoryReceipt(receipt.accessory, ledgerKey);
    } else if (receipt.type === 'bonusXp') {
      repairBonusReceipt(receipt);
      const entry = dayEntry(dayKey);
      entry.bonusXp = Math.max(0, (Number(entry.bonusXp) || 0) - (Number(receipt.applied) || 0));
    }
  }
  delete state.game.ledger[ledgerKey];
}

function latestOtherGapResetTime(dayKey) {
  const bucket = state.gapAnnotations?.[dayKey];
  if (!bucket || typeof bucket !== 'object') return Number.NEGATIVE_INFINITY;
  let latest = Number.NEGATIVE_INFINITY;
  Object.entries(bucket).forEach(([gapKey, value]) => {
    if (String(value?.label || '').toLowerCase() !== 'other') return;
    const parts = String(gapKey).split('|');
    const currentStart = parts[3];
    const time = new Date(currentStart || 0).getTime();
    if (Number.isFinite(time)) latest = Math.max(latest, time);
  });
  return latest;
}

function reconcileLiveComboAndLoot(dayKey, snapshot, { allowRewards = true } = {}) {
  const eligible = [...(snapshot?.eligibleCalls || [])].sort((a, b) => new Date(a.startISO) - new Date(b.startISO));

  if (dayKey === currentGameDayKey()) {
    const pauses = [...(state.pauseHistory || []), ...(state.activePause ? [state.activePause] : [])];
    const pauseResetAt = pauses.filter((pause) => (callDateKeyFromValue(pause.shiftDayKey) || todayCallDateKey(new Date(pause.startedAt))) === dayKey)
      .reduce((last, pause) => Math.max(last, new Date(pause.startedAt).getTime() || 0), Number.NEGATIVE_INFINITY);
    const resetAt = Math.max(latestOtherGapResetTime(dayKey), pauseResetAt);
    state.game.live.combo = eligible.filter((call) => new Date(call.startISO).getTime() >= resetAt).length;
  }

  const validMilestones = new Set();
  for (let count = 5; count <= eligible.length; count += 5) validMilestones.add(count);
  const prefix = `loot:${dayKey}:`;

  Object.keys(state.game.ledger)
    .filter((key) => key.startsWith(prefix))
    .forEach((key) => {
      const count = Number(key.slice(prefix.length).replace(':improved', ''));
      const isImproved = key.endsWith(':improved');
      if ((isImproved ? count !== 8 || eligible.length < 8 : !validMilestones.has(count))) rollbackLootReceipt(dayKey, key);
    });

  const impulsePrefix = `impulse:${dayKey}:`;
  Object.keys(state.game.ledger)
    .filter((key) => key.startsWith(impulsePrefix))
    .forEach((key) => {
      const milestone = Number(key.slice(impulsePrefix.length));
      if (!IMPULSE_MILESTONES.includes(milestone) || eligible.length < milestone) {
        delete state.game.ledger[key];
        if (state.game.days[dayKey]?.impulse?.hits) delete state.game.days[dayKey].impulse.hits[milestone];
      }
    });

  if (allowRewards) {
    validMilestones.forEach((count) => {
      const key = `${prefix}${count}`;
      if (!state.game.ledger[key]) rewardLootBox(dayKey, count);
    });
    IMPULSE_MILESTONES.filter((milestone) => eligible.length >= milestone).forEach((milestone) => {
      const key = `${impulsePrefix}${milestone}`;
      if (!state.game.ledger[key]) {
        const impulse = dayEntry(dayKey).impulse || { hits: {}, last: 0 };
        impulse.hits = { ...(impulse.hits || {}), [milestone]: true };
        impulse.last = Math.max(Number(impulse.last) || 0, milestone);
        dayEntry(dayKey).impulse = impulse;
        state.game.ledger[key] = { type: 'impulse', dayKey, milestone, applied: 0, gross: 0 };
        if (milestone === 8) rewardLootBox(dayKey, milestone, { improved: true, source: 'impulse' });
        if (milestone === 3) queueGameToast(translateText('Buen ritmo · 3 llamadas elegibles'), 'impulse');
        if (milestone === 5) queueGameToast(translateText('Impulso estable · tu caja de 5 llamadas se conserva'), 'impulse');
        if (milestone === 8) queueGameToast(translateText('Impulso mejorado · caja de rareza elevada'), 'loot');
        triggerGameEvent('gameArena', milestone === 8 ? 'clear' : 'hit', 700);
        playGameTone('impulse', dayKey);
      }
    });
  }
}

function recordPhaseEvent(dayKey, phase, previousPhase = null) {
  if (!['fury', 'vulnerable', 'defeated'].includes(phase) || phase === previousPhase) return false;
  const key = `phase:${dayKey}:${phase}`;
  if (state.game.ledger[key]) return false;
  state.game.ledger[key] = { type: 'phase-event', dayKey, phase, gross: 0, applied: 0 };
  if (dayKey !== currentGameDayKey() || dayKey !== displayedGameDayKey()) return true;
  const message = phase === 'defeated' ? translateText('Monstruo derrotado') : phase === 'vulnerable' ? translateText('Armadura abierta · el monstruo es vulnerable') : translateText('El monstruo entra en furia');
  queueGameToast(message, phase === 'defeated' ? 'record' : 'impulse');
  announceGameStatus(message);
  triggerGameEvent('gameArena', phase === 'defeated' ? 'clear' : 'hit', 850);
  playGameTone(phase === 'defeated' ? 'clear' : phase === 'fury' ? 'fury' : 'vulnerable', dayKey);
  return true;
}

function reconcileMissionEvents(dayKey, snapshot, { allowFeedback = true } = {}) {
  const prefix = `mission:${dayKey}:`;
  const completed = new Map((snapshot?.missions || []).filter((mission) => mission.ok).map((mission) => [mission.id, mission]));
  Object.keys(state.game.ledger).filter((key) => key.startsWith(prefix)).forEach((key) => {
    if (!completed.has(key.slice(prefix.length))) delete state.game.ledger[key];
  });
  if (!allowFeedback) return false;
  let changed = false;
  completed.forEach((mission, id) => {
    const key = `${prefix}${id}`;
    if (state.game.ledger[key]) return;
    state.game.ledger[key] = { type: 'mission', dayKey, missionId: id, gross: Number(mission.rewardXp) || 0, applied: 0 };
    queueGameToast(ui`Armadura rota · ${mission.label} · +${mission.rewardXp} XP al cierre`, 'impulse');
    triggerGameEvent('gameMissions', 'mission', 700);
    playGameTone('mission', dayKey);
    changed = true;
  });
  return changed;
}

let gameRecordBannerTimer = null;

function showGameRecordBanner(message) {
  if (callFeedbackSilenced()) return;
  if (!gameEnabled() || state.activeCall) return;
  const root = document.getElementById('gameRecordBanner');
  if (!root || !message) return;
  if (gameRecordBannerTimer) clearTimeout(gameRecordBannerTimer);
  root.hidden = false;
  root.textContent = message;
  queueGameToast(`🏆 ${message}`, 'record');
  gameRecordBannerTimer = setTimeout(() => {
    root.hidden = true;
    gameRecordBannerTimer = null;
  }, 3000);
}

function maybeShowRecord(call) {
  const callDate = new Date(call.startISO);
  if (!Number.isFinite(callDate.getTime())) return;
  const weekday = (callDate.getDay() + 6) % 7;
  const weekStart = new Date(callDate.getFullYear(), callDate.getMonth(), callDate.getDate() - weekday);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7);
  const prior = calls.filter((item) => {
    if (item.id === call.id) return false;
    const itemDate = new Date(item.startISO);
    return Number.isFinite(itemDate.getTime()) && itemDate >= weekStart && itemDate < weekEnd;
  });
  const durationRecord = prior.every((item) => (Number(call.durationMin) || 0) > (Number(item.durationMin) || 0));
  const payRecord = prior.every((item) => parseMoney(call.pay) > parseMoney(item.pay));
  if (!durationRecord && !payRecord) return;
  const message = durationRecord
    ? ui`NUEVO RÉCORD · ${formatMinutes(call.durationMin)} min`
    : ui`NUEVO RÉCORD · ${withConversion(parseMoney(call.pay))}`;
  showGameRecordBanner(message);
}

function reinforcementCallKey(call, dayKey) {
  return `reinforce-call:${dayKey}:${String(call.id || `${call.startISO}:${call.customerId}`).slice(0, 120)}`;
}

export function migrateGameCallReferences(oldId, newId) {
  if (!oldId || !newId || oldId === newId) return;
  ensureGameState();
  Object.keys(state.game.ledger).forEach((key) => {
    if (!key.startsWith('reinforce-call:') || !key.endsWith(`:${oldId}`)) return;
    const nextKey = `${key.slice(0, -String(oldId).length)}${newId}`;
    state.game.ledger[nextKey] = state.game.ledger[key];
    delete state.game.ledger[key];
  });
}

export function onGameMonetaryProgress(dayKey, earnings, goal, { silent = false, record = true } = {}) {
  ensureGameState();
  const claimed = [25, 50, 75, 100].filter((pct) => state.game.ledger[`money-hit:${dayKey}:${pct}`]);
  const progress = monetaryMilestones(earnings, goal, claimed);
  if (!record) return progress;
  progress.crossed.forEach((pct) => { state.game.ledger[`money-hit:${dayKey}:${pct}`] = true; });
  if (progress.crossed.length) {
    saveStateOnly();
    if (!silent) notifyReinforcement(reinforcementText('milestone', { percent: progress.crossed.join('%, '), amount: `${money?.(earnings) || `$${Number(earnings).toFixed(2)}`} ${convertedAmountText?.(earnings) || ''}`.trim() }), { channel: 'either', effect: true, sound: 'impulse', dayKey });
  }
  return progress;
}

export function rewardSurpriseForCall(call, dayKey, { random = Math.random } = {}) {
  if (!callIsXpEligible(call, dayKey)) return null;
  ensureGameState();
  const key = reinforcementCallKey(call, dayKey);
  let receipt = state.game.ledger[key];
  if (receipt && typeof receipt === 'object' && typeof receipt.surprise === 'boolean') return receipt;
  const surprise = surpriseDecision(random);
  // La decisión queda guardada incluso si el día está sellado o el premio es cero.
  state.game.ledger[key] = { ...(receipt || {}), dayKey, surprise, gross: 0, applied: 0 };
  if (surprise) {
    const bonus = grantDayBonusReceipt(dayKey, 5);
    state.game.ledger[key] = { ...state.game.ledger[key], ...bonus };
    if (gameEnabled() && !callFeedbackSilenced()) {
      const root = document.getElementById('gameLootBox');
      if (root) {
        root.hidden = false;
        root.classList.toggle('is-revealing', arcadeEnabled() && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
        root.innerHTML = ui`<span class="game-loot-icon">🎁</span><div><b>COFRE SORPRESA</b><span>${bonus.applied ? `+${bonus.applied} XP` : translateText('Tu constancia cuenta · XP diario sellado')}</span></div>`;
        setTimeout(() => { root.hidden = true; root.classList.remove('is-revealing'); }, 4200);
      }
      queueGameToast(bonus.applied ? ui`🎁 Cofre sorpresa · +${bonus.applied} XP` : translateText('🎁 Cofre sorpresa · XP diario sellado'), 'loot');
      playGameTone('loot', dayKey);
    }
  }
  saveStateOnly();
  return state.game.ledger[key];
}

export function checkReinforcementInactivity(now = Date.now()) {
  if (!state?.shiftStartedAt || state.shiftEndedAt || state.activePause || state.activeCall) return false;
  ensureGameState();
  const interruptions = Object.values(state.dayInterruptions || {}).flatMap((items) => Array.isArray(items) ? items : [])
    .map((item) => ({ startedAt: item.gapStart, endedAt: item.gapEnd }));
  const workIntervals = getReinforcementWorkIntervals?.(currentGameDayKey());
  if (Array.isArray(workIntervals) && !workIntervals.some((interval) => new Date(interval.startedAt).getTime() <= Number(now) && new Date(interval.endedAt).getTime() > Number(now))) return false;
  const elapsed = activeWorkSinceLastCall({ ...state, calls, now, workIntervals, pauseHistory: [...(state.pauseHistory || []), ...interruptions] });
  const interval = normalizeInactivityMinutes(settings.reinforcement?.inactivityMinutes) * 60000;
  if (elapsed < interval) return false;
  const lastCall = calls.filter((call) => new Date(call.endISO).getTime() <= Number(now))
    .filter((call) => new Date(call.endISO).getTime() >= new Date(state.shiftStartedAt).getTime())
    .sort((a, b) => new Date(b.endISO) - new Date(a.endISO))[0];
  const dayKey = currentGameDayKey();
  const key = `idle-support:${dayKey}:${hashText(lastCall?.endISO || state.shiftStartedAt)}`;
  const previous = state.game.ledger[key];
  if (previous) {
    if (settings.reinforcement?.inactivityRepeat !== true) return false;
    // Legacy receipts have no delivery time; establish a baseline without replaying them.
    if (previous === true || !Number.isFinite(previous.elapsedMs) || elapsed < previous.elapsedMs) {
      state.game.ledger[key] = { elapsedMs: elapsed };
      saveStateOnly();
      return false;
    }
    if (elapsed - previous.elapsedMs < interval) return false;
  }
  state.game.ledger[key] = { elapsedMs: elapsed };
  saveStateOnly();
  notifyReinforcement(reinforcementText('idle'), { channel: 'either', repeat: settings.reinforcement?.inactivityRepeat === true });
  return true;
}

function processCallReinforcement(call, source, dayKey, options) {
  ensureGameState();
  const key = reinforcementCallKey(call, dayKey);
  const existing = state.game.ledger[key];
  if (existing?.feedback) return false;
  const dropped = String(call.dropped).toLowerCase() === 'yes';
  if (dropped) {
    const end = new Date(call.endISO).getTime();
    const imported = new Date(call.importedAt).getTime();
    if (!Number.isFinite(end) || !Number.isFinite(imported) || imported < end || imported - end > 1800000 || end > Date.now() || imported > Date.now()) return false;
    const droppedKey = `dropped-support:${dayKey}`;
    state.game.ledger[key] = { dayKey, feedback: true, surprise: false, gross: 0, applied: 0 };
    state.game.reinforcement.recoveryPending = { callId: String(call.id), dayKey, endISO: call.endISO };
    if (!state.game.ledger[droppedKey]) {
      state.game.ledger[droppedKey] = true;
      notifyReinforcement(reinforcementText('dropped'), { channel: 'either' });
    }
    saveStateOnly();
    return false;
  }
  if (!callIsXpEligible(call, dayKey)) return false;
  rewardSurpriseForCall(call, dayKey, options);
  state.game.ledger[key].feedback = true;
  const previousCalls = callsForDay(dayKey).filter((item) => item.id !== call.id);
  notifyReinforcement(chooseCallFeedback(call, { previousCalls, bonus: higherRateBonusAmount, money, convertedAmountText }), { channel: 'either' });
  const stats = importedCallStats(callsForDay(dayKey), dayKey);
  onGameMonetaryProgress(dayKey, stats.earnings, effectiveDailyGoal(dayKey).usd);
  saveStateOnly();
  return true;
}

function claimCallVisualFeedback(call, dayKey, firstEvent) {
  if (!gameEnabled() || dayKey !== currentGameDayKey() || String(call.dropped).toLowerCase() === 'yes') return false;
  const started = new Date(call.startISO).getTime();
  const ended = new Date(call.endISO).getTime();
  const imported = new Date(call.importedAt).getTime();
  if (!(Number(call.durationMin) > 0) || !Number.isFinite(started) || !Number.isFinite(ended)
    || !Number.isFinite(imported) || ended <= started || imported < ended || imported > Date.now()) return false;
  const key = reinforcementCallKey(call, dayKey);
  const receipt = state.game.ledger[key] || {};
  // Los recibos anteriores ya presentaron su feedback; migrarlos no debe repetirlo.
  if (receipt.visual || (!firstEvent && receipt.feedback)) return false;
  state.game.ledger[key] = { ...receipt, dayKey, visual: true };
  return true;
}

export function onGameCallSaved(call, source = 'manual', options = {}) {
  if (!call || !['manual', 'live', 'import'].includes(source)) return;
  const dayKey = callDateKeyFromValue(call.shiftDayKey)
    || callDateKeyFromValue(call.callDate)
    || currentGameDayKey();
  const firstEvent = processCallReinforcement(call, source, dayKey, options);
  onPositiveCallSaved(call, source, dayKey);
  if (!gameEnabled()) {
    if (firstEvent) reconcileLiveComboAndLoot(dayKey, computeGameDay(dayKey), { allowRewards: false });
    saveStateOnly();
    return;
  }
  const firstVisualEvent = claimCallVisualFeedback(call, dayKey, firstEvent);
  if (!firstEvent) {
    if (firstVisualEvent) {
      saveStateOnly();
      renderGame();
      const battlePlayed = showCallFx(call, 0, higherRateBonusAmount(call) > 0, 'recorded');
      if (!battlePlayed) playGameTone('hit', dayKey);
    }
    return;
  }
  if (!callIsXpEligible(call, dayKey)) return;
  ensureGameState(dayKey);
  if (state.game.days[dayKey]?.finalized) {
    onGameCallsChanged(dayKey);
    if (firstVisualEvent) showCallFx(call, 0, higherRateBonusAmount(call) > 0, 'recorded');
    return;
  }
  const currentDay = computeGameDay(dayKey);
  const entry = dayEntry(dayKey);
  const xpLocked = Number.isFinite(Number(entry.xpLocked));
  const critical = higherRateBonusAmount(call) > 0;

  if (currentDay.defeated && xpLocked) {
    saveStateOnly();
    renderGame();
    const battlePlayed = firstVisualEvent && showCallFx(call, 0, critical, 'extra');
    maybeShowRecord(call);
    if (!battlePlayed) playGameTone(critical ? 'critical' : 'hit', dayKey);
    return;
  }

  state.game.live.combo += 1;
  const priorCallsXp = Math.min(30, currentDay.eligibleCalls
    .filter((item) => item.id !== call.id)
    .reduce((sum, item) => sum + callXp(item), 0));
  const nonCallXp = currentDay.xpBreakdown.productivityXp
    + currentDay.xpBreakdown.adherenceXp
    + currentDay.xpBreakdown.punctualityXp
    + currentDay.xpBreakdown.missionXp
    + currentDay.xpBreakdown.bonusXp;
  const beforeCallXp = Math.min(GAME_DAILY_XP_CAP, nonCallXp + priorCallsXp);
  const grantedXp = Math.max(0, currentDay.xp - beforeCallXp);
  let defeatedNow = false;

  if (currentDay.defeated && !xpLocked) {
    entry.xpLocked = currentDay.xp;
    const defeatKey = `monster-defeat:${dayKey}`;
    if (!state.game.ledger[defeatKey]) {
      state.game.ledger[defeatKey] = true;
      defeatedNow = true;
      queueGameToast(translateText('💥 MONSTRUO DERROTADO · botín del día asegurado'), 'record');
    }
  }

  const count = currentDay.eligibleCalls.length;
  if (count > 0 && count % 5 === 0) rewardLootBox(dayKey, count);
  reconcileLiveComboAndLoot(dayKey, currentDay, { allowRewards: true });
  reconcileMissionEvents(dayKey, currentDay);
  const phaseNow = computeGameDay(dayKey).phase;
  const previousPhase = entry.phase || 'guarded';
  entry.phase = phaseNow;
  recordPhaseEvent(dayKey, phaseNow, previousPhase);
  saveStateOnly();
  renderGame();

  const battlePlayed = firstVisualEvent && showCallFx(call, grantedXp, critical);
  maybeShowRecord(call);
  if (defeatedNow) {
    triggerGameEvent('gameArena', 'clear', 1000);
    playGameTone('clear', dayKey);
  } else if (!battlePlayed) {
    playGameTone(critical ? 'critical' : 'hit', dayKey);
  }
}

export function onGameGapSaved(dayKey, gapKey, label) {
  if (!gameEnabled()) return;
  ensureGameState();
  if (dayKey === currentGameDayKey() && String(label).toLowerCase() === 'other') state.game.live.combo = 0;
  if (state.game.days[dayKey]?.finalized) {
    saveStateOnly();
    renderGame();
    return;
  }
  const key = `gap:${dayKey}:${gapKey}`;
  const perDayCount = Object.keys(state.game.ledger).filter((item) => item.startsWith(`gap:${dayKey}:`)).length;
  if (!state.game.ledger[key] && perDayCount < 3) {
    const granted = grantDayBonus(dayKey, 5);
    if (granted > 0) {
      state.game.ledger[key] = true;
      queueGameToast(ui`+${granted} XP · Hueco clasificado`);
    } else {
      queueGameToast('Hueco clasificado · XP diario sellado');
    }
  }
  reconcileMissionEvents(dayKey, computeGameDay(dayKey));
  saveStateOnly();
  renderGame();
}

export function onGameCallsChanged(dayKey) {
  const enabled = gameEnabled();
  ensureGameState();
  const normalizedDayKey = String(dayKey || '');
  reconcilePositiveCalls(normalizedDayKey);
  let entry = state.game.days[normalizedDayKey];
  if (!entry?.finalized) {
    Object.entries(state.game.ledger).forEach(([key, receipt]) => {
      if (!key.startsWith(`reinforce-call:${normalizedDayKey}:`) || !receipt?.applied) return;
      const call = callsForDay(normalizedDayKey).find((item) => reinforcementCallKey(item, normalizedDayKey) === key);
      if (call && callIsXpEligible(call, normalizedDayKey)) return;
      const current = dayEntry(normalizedDayKey);
      current.bonusXp = Math.max(0, current.bonusXp - receipt.applied);
      state.game.ledger[key] = { ...receipt, applied: 0, amount: 0 };
    });
  }

  const beforeRewards = computeGameDay(normalizedDayKey, { ignoreLock: true });
  reconcileGoalChest(normalizedDayKey, beforeRewards);
  onGameMonetaryProgress(normalizedDayKey, beforeRewards.stats.earnings, beforeRewards.goal.usd, { silent: normalizedDayKey !== currentGameDayKey() });
  if (!entry?.finalized) reconcileLiveComboAndLoot(normalizedDayKey, beforeRewards, { allowRewards: enabled });
  const raw = computeGameDay(normalizedDayKey, { ignoreLock: true });
  entry = state.game.days[normalizedDayKey];
  if (!entry && callsForDay(normalizedDayKey).length) entry = dayEntry(normalizedDayKey);

  if (!entry?.finalized) {
    reconcileMissionEvents(normalizedDayKey, raw, { allowFeedback: enabled });
    if (entry) {
      const existingLock = Number(entry.xpLocked);
      const defeatKey = `monster-defeat:${normalizedDayKey}`;
      const previousPhase = entry.phase || 'guarded';
      entry.phase = raw.phase;
      if (enabled) recordPhaseEvent(normalizedDayKey, raw.phase, previousPhase);
      if (raw.defeated) {
        entry.xpLocked = Number.isFinite(existingLock) ? Math.min(existingLock, raw.xp) : raw.xp;
        if (!state.game.ledger[defeatKey]) {
          state.game.ledger[defeatKey] = true;
          if (enabled) queueGameToast(ui`💥 MONSTRUO DEL ${formatCallDayLabel(normalizedDayKey)} DERROTADO · datos reconciliados`, 'record');
        }
      } else {
        delete entry.xpLocked;
        delete state.game.ledger[defeatKey];
      }
      saveStateOnly();
    }
    if (enabled) renderGame();
    return !!entry;
  }

  // STAGE CLEAR congela XP, estrellas, misiones, escudos y nivel. Una corrección posterior solo
  // actualiza los hechos del día que pueden venir de Propio: dinero, llamadas y vida del monstruo.
  entry.earnings = Number(raw.stats.earnings) || 0;
  entry.callCount = callsForDay(normalizedDayKey).length;
  if (entry.callCount === 0 && state.game.chest.pending && state.game.chest.sealedOn === normalizedDayKey) {
    state.game.chest = { pending: false, sealedOn: null };
  }
  const frozenMonster = entry.monster && typeof entry.monster === 'object' ? entry.monster : {};
  entry.monster = {
    ...frozenMonster,
    species: raw.species.id,
    variant: frozenMonster.variant || monsterVariantFor(raw),
    defeated: raw.defeated,
    hpPct: raw.hpPct,
  };
  entry.comparisons = stageComparisonSnapshot(normalizedDayKey, entry.earnings);
  entry.closingEvidence = closingEvidenceForDay(normalizedDayKey, raw, entry.comparisons);
  entry.correctedAt = new Date().toISOString();

  // Este lock solo importa si el usuario decide reabrir el turno después de la corrección.
  if (raw.defeated) {
    entry.xpLocked = Math.min(Math.max(0, Number(entry.xp) || 0), raw.xp);
    const defeatKey = `monster-defeat:${normalizedDayKey}`;
    if (!state.game.ledger[defeatKey]) {
      state.game.ledger[defeatKey] = true;
      if (enabled && !frozenMonster.defeated) queueGameToast(ui`💥 MONSTRUO DEL ${formatCallDayLabel(normalizedDayKey)} DERROTADO · ganancias actualizadas`, 'record');
    }
  }
  else {
    delete entry.xpLocked;
    delete state.game.ledger[`monster-defeat:${normalizedDayKey}`];
  }

  saveStateOnly();
  if (enabled) renderGame();
  return true;
}

export function onGameDayReset(dayKey) {
  ensureGameState();
  const normalized = String(dayKey || '');
  resetPositiveDay(normalized);
  const entry = state.game.days[normalized];

  Object.keys(state.game.ledger)
    .filter((key) => key.startsWith(`loot:${normalized}:`))
    .forEach((key) => rollbackLootReceipt(normalized, key));
  rollbackChestReward(normalized);

  if (entry?.finalized) {
    state.game.totalXp = Math.max(0, state.game.totalXp - (Number(entry.xp) || 0));
    const awardedKey = entry.rollback?.streakShieldAwardedKey;
    if (awardedKey && state.game.ledger[awardedKey]) {
      delete state.game.ledger[awardedKey];
      if (state.game.shields > 0) state.game.shields--;
    }
    if (entry.shieldUsed && state.game.shields < GAME_SHIELD_CAP) state.game.shields++;
  }

  const prefixes = [
    `gap:${normalized}:`,
    `monster-defeat:${normalized}`,
    `impulse:${normalized}:`,
    `mission:${normalized}:`,
    `phase:${normalized}:`,
    `reflex:${normalized}`,
    `streak-shield:${normalized}:`,
    `reinforce-call:${normalized}:`,
    `money-hit:${normalized}:`,
    `pause-return:${normalized}:`,
    `idle-support:${normalized}:`,
    `dropped-support:${normalized}`,
  ];
  Object.keys(state.game.ledger).forEach((key) => {
    if (prefixes.some((prefix) => key.startsWith(prefix))) delete state.game.ledger[key];
  });

  if (state.game.chest.pending && state.game.chest.sealedOn === normalized) {
    state.game.chest = { pending: false, sealedOn: null };
  }
  delete state.game.days[normalized];
  if (normalized === currentGameDayKey()) state.game.live.combo = 0;
  state.game.level = levelForXp(state.game.totalXp);
  state.game.bestStreak = recomputeBestStreak();
  saveStateOnly();
  if (gameEnabled()) renderGame();
}

export function onGameDayMetadataChanged(dayKey) {
  ensureGameState();
  const normalized = String(dayKey || '');
  const progressDay = computeGameDay(normalized);
  reconcileGoalChest(normalized, progressDay);
  onGameMonetaryProgress(normalized, progressDay.stats.earnings, progressDay.goal.usd, { silent: normalized !== currentGameDayKey() });
  const entry = state.game.days[normalized];
  if (entry?.finalized) {
    const status = dayComplianceStatus(normalized);
    const shouldUseShield = status === 'failed';

    if (entry.shieldUsed && !shouldUseShield) {
      const restored = state.game.shields < GAME_SHIELD_CAP;
      if (restored) state.game.shields++;
      entry.shieldUsed = false;
      entry.metadataShieldRestored = restored;
    } else if (!entry.shieldUsed && shouldUseShield) {
      if (entry.metadataShieldRestored) {
        if (state.game.shields > 0) state.game.shields--;
        entry.shieldUsed = true;
        delete entry.metadataShieldRestored;
      } else if (state.game.shields > 0) {
        state.game.shields--;
        entry.shieldUsed = true;
      }
    }
  }
  state.game.bestStreak = recomputeBestStreak();
  saveStateOnly();
  if (gameEnabled()) renderGame();
}

export function onGameShiftAlarmFired(dayKey, firedAt = new Date().toISOString()) {
  ensureGameState();
  if (dayKey !== todayCallDateKey()) return;
  state.game.live.shiftAlarmAt = firedAt;
  saveStateOnly();
}

function revokeStageClear(dayKey, { silent = false } = {}) {
  const entry = state.game.days[dayKey];
  if (!entry?.finalized) return;
  state.game.totalXp = Math.max(0, state.game.totalXp - (Number(entry.xp) || 0));

  const rollback = entry.rollback && typeof entry.rollback === 'object' ? entry.rollback : {};
  // Reverse this closing receipt, preserving shields earned or restored after closing.
  if (rollback.streakShieldAwardedKey && state.game.ledger[rollback.streakShieldAwardedKey]) {
    state.game.shields = Math.max(0, state.game.shields - 1);
  }
  if (entry.shieldUsed) {
    state.game.shields = Math.min(GAME_SHIELD_CAP, state.game.shields + 1);
  }
  if (rollback.streakShieldAwardedKey) delete state.game.ledger[rollback.streakShieldAwardedKey];
  state.game.days[dayKey] = {
    bonusXp: Number(entry.bonusXp) || 0,
    ...(Number.isFinite(Number(entry.xpLocked)) ? { xpLocked: Number(entry.xpLocked) } : {}),
    ...(MISSION_FOCUSES.includes(entry.missionChoice) ? { missionChoice: entry.missionChoice } : {}),
    ...(entry.impulse ? { impulse: entry.impulse } : {}),
    reopened: true,
  };
  if (state.game.chest.pending && state.game.chest.sealedOn === dayKey) state.game.chest = { pending: false, sealedOn: null };
  state.game.level = levelForXp(state.game.totalXp);
  state.game.bestStreak = Number.isFinite(Number(rollback.bestStreakBefore))
    ? Math.max(0, Number(rollback.bestStreakBefore))
    : recomputeBestStreak();
  if (!silent) {
    closeModal('stageClearModal');
    queueGameToast('STAGE CLEAR revocado · turno continuado');
  }
}

export function onGameShiftStarted({ continued = false, captureState = null } = {}) {
  const dayKey = currentGameDayKey();
  ensureGameState(dayKey);
  const enabled = gameEnabled();
  const hadFinalizedDay = !!state.game.days[dayKey]?.finalized;
  const persist = () => {
    captureState?.(JSON.parse(JSON.stringify(state.game)));
    saveStateOnly();
  };

  // La consistencia del día no depende de que la capa visual de gamificación esté encendida.
  // Si se reabre un turno con STAGE CLEAR previo, hay que revocarlo siempre; de lo contrario,
  // apagar gamificación, reabrir turno y volverla a encender deja XP/cofre/finalizado congelados.
  if (hadFinalizedDay) {
    revokeStageClear(dayKey, { silent: !enabled });
    onGameCallsChanged(dayKey);
    if (enabled) queueGameToast(translateText('STAGE CLEAR reabierto · el nuevo turno se sumará al cierre de hoy'));
  }

  if (continued) {
    persist();
    if (enabled) renderGame();
    return;
  }
  if (!enabled) {
    if (hadFinalizedDay || captureState) persist();
    return;
  }

  if (!state.game.days[dayKey]?.finalized) {
    openPendingChest(dayKey);
    const firedAt = new Date(state.game.live.shiftAlarmAt || 0).getTime();
    const elapsed = Date.now() - firedAt;
    const key = `reflex:${dayKey}`;
    if (!state.game.ledger[key] && firedAt > 0 && elapsed >= 0 && elapsed <= 2 * 60000) {
      state.game.ledger[key] = true;
      queueGameToast('+20 XP · Reflejos perfectos', 'record');
    }
  }
  persist();
  renderGame();
}

function stageComparisonSnapshot(dayKey, earnings) {
  const dayDate = callDateToDate(dayKey);
  let yesterdayKey = null;
  let yesterdayEarnings = 0;
  let yesterdayHasData = false;
  if (dayDate) {
    const previous = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate() - 1);
    yesterdayKey = todayCallDateKey(previous);
    const yesterdayCalls = callsForDay(yesterdayKey);
    yesterdayHasData = yesterdayCalls.length > 0;
    yesterdayEarnings = Number(importedCallStats(yesterdayCalls, yesterdayKey).earnings) || 0;
  }

  let recordBefore = 0;
  let recordDayKey = null;
  Object.entries(state.game.days).forEach(([key, value]) => {
    if (key === dayKey || !value?.finalized) return;
    let valueEarnings = Number(value.earnings);
    if (!Number.isFinite(valueEarnings)) {
      valueEarnings = Number(importedCallStats(callsForDay(key), key).earnings) || 0;
    }
    if (valueEarnings > recordBefore) {
      recordBefore = valueEarnings;
      recordDayKey = key;
    }
  });

  return {
    earnings: Math.max(0, Number(earnings) || 0),
    yesterdayKey,
    yesterdayEarnings,
    yesterdayHasData,
    recordBefore,
    recordDayKey,
  };
}

function closingEvidenceForDay(dayKey, snapshot, comparisons, { projectStreak = false } = {}) {
  const completed = callsForDay(dayKey).filter((call) => String(call.dropped).toLowerCase() !== 'yes' && new Date(call.endISO).getTime() <= Date.now());
  return supportiveDayEvidence({
    callCount: completed.length, earnings: snapshot.stats.earnings,
    bestCallAmount: Math.max(0, ...completed.map((call) => parseMoney(call.pay) + higherRateBonusAmount(call))),
    yesterdayEarnings: comparisons.yesterdayEarnings, yesterdayHasData: comparisons.yesterdayHasData,
    onTimePauses: Object.entries(state.game.ledger).filter(([key, value]) => key.startsWith(`pause-return:${dayKey}:`) && value?.onTime).length,
    recoveries: (state.game.reinforcement?.recoveries || []).filter((item) => item.dayKey === dayKey).length,
    streak: gameStreak(), compliant: projectStreak && dayComplianceStatus(dayKey) === 'compliant',
    formatAmount: (amount) => `${money(amount)}${convertedAmountText(amount) ? ` (${convertedAmountText(amount)})` : ''}`,
  });
}

function freezeGameDay(dayKey, { projectStreak = false } = {}) {
  const snapshot = computeGameDay(dayKey);
  const existing = dayEntry(dayKey);
  if (existing.finalized) return existing;
  const shieldsBefore = state.game.shields;
  const bestStreakBefore = state.game.bestStreak;
  const comparisons = stageComparisonSnapshot(dayKey, snapshot.stats.earnings);
  const shieldNeeded = dayComplianceStatus(dayKey) === 'failed' && state.game.shields > 0;
  const entry = {
    ...existing,
    finalized: true,
    finalizedAt: new Date().toISOString(),
    xp: snapshot.xp,
    xpBreakdown: { ...snapshot.xpBreakdown },
    earnings: Number(snapshot.stats.earnings) || 0,
    callCount: callsForDay(dayKey).length,
    comparisons,
    closingEvidence: closingEvidenceForDay(dayKey, snapshot, comparisons, { projectStreak }),
    stars: snapshot.stars,
    missions: snapshot.missions.map(({ id, ok, applies, status, rewardXp, detail }) => ({ id, ok, applies, status, rewardXp, detail })),
    missionChoice: missionFocusForEntry(state.game.days[dayKey]),
    phase: snapshot.phase,
    armor: snapshot.armor.map(({ id, active, complete, status }) => ({ id, active, complete, status })),
    impulse: state.game.days[dayKey]?.impulse || { hits: {}, last: 0 },
    hasActivity: !!(snapshot.stats.total || snapshot.eligibleCalls.length),
    shieldUsed: shieldNeeded,
    rollback: {
      shieldsBefore,
      bestStreakBefore,
      streakShieldAwardedKey: null,
    },
    monster: {
      species: snapshot.species.id,
      variant: monsterVariantFor(snapshot),
      defeated: snapshot.defeated,
      hpPct: snapshot.hpPct,
      phase: snapshot.phase,
      equipment: equipmentForState(),
    },
  };
  if (shieldNeeded) state.game.shields--;
  state.game.days[dayKey] = entry;
  state.game.totalXp += snapshot.xp;
  const oldLevel = state.game.level;
  state.game.level = levelForXp(state.game.totalXp);
  entry.totalXpAfter = state.game.totalXp;
  entry.levelAfter = state.game.level;
  entry.nextLevelXp = xpThresholdForLevel(state.game.level + 1);
  const streak = gameStreak();
  state.game.bestStreak = recomputeBestStreak();
  if (state.game.bestStreak > bestStreakBefore) {
    showGameRecordBanner(ui`NUEVO RÉCORD · Racha ${state.game.bestStreak} días`);
  }
  const shieldKey = `streak-shield:${dayKey}:${streak}`;
  if (streak >= 7 && streak % 7 === 0 && !state.game.ledger[shieldKey] && state.game.shields < GAME_SHIELD_CAP) {
    state.game.ledger[shieldKey] = true;
    entry.rollback.streakShieldAwardedKey = shieldKey;
    state.game.shields++;
    queueGameToast(translateText('◆ Escudo ganado por racha semanal'), 'loot');
  }
  if (state.game.level > oldLevel) queueGameToast(ui`NIVEL ${state.game.level} DESBLOQUEADO`, 'record');
  if (snapshot.stats.total || snapshot.eligibleCalls.length) {
    if (!state.game.ledger[`chest:${dayKey}`]) state.game.chest = { pending: true, sealedOn: dayKey };
  }
  pruneGameDays();
  return entry;
}

function pixelStars(count) {
  return ui`<div class="game-clear-stars game-pixel-stars" role="img" aria-label="${Number(count) || 0} de 3 estrellas">${[1, 2, 3].map((index) => ui`<span class="${index <= count ? 'is-earned' : 'is-empty'}">${gamePixelIcon('star')}</span>`).join('')}</div>`;
}

function stageClearMarkup(dayKey, entry) {
  const fallback = computeGameDay(dayKey);
  const hasActivity = typeof entry.hasActivity === 'boolean'
    ? entry.hasActivity
    : Number(entry.callCount) > 0 || !!fallback.stats.total || !!fallback.eligibleCalls.length;
  if (!hasActivity) {
    return ui`<div class="game-stage-clear game-stage-clear--empty"><span class="game-kicker">TURNO CERRADO</span><h2>Día guardado</h2><p>Hoy no hubo llamadas completadas. Puedes descansar y retomar mañana a tu ritmo.</p></div>`;
  }

  const breakdown = entry.xpBreakdown || fallback.xpBreakdown;
  const earnings = Number.isFinite(Number(entry.earnings)) ? Number(entry.earnings) : fallback.stats.earnings;
  const comparisons = entry.comparisons || stageComparisonSnapshot(dayKey, earnings);
  const yesterdayDelta = earnings - (Number(comparisons.yesterdayEarnings) || 0);
  const yesterdayText = comparisons.yesterdayHasData
    ? `${withConversion(comparisons.yesterdayEarnings)} · ${yesterdayDelta >= 0 ? '+' : '−'}${withConversion(Math.abs(yesterdayDelta))}`
    : translateText('Sin referencia');
  const recordBefore = Math.max(0, Number(comparisons.recordBefore) || 0);
  const recordText = recordBefore > 0
    ? (earnings > recordBefore ? ui`NUEVO RÉCORD · +${withConversion(earnings - recordBefore)}` : withConversion(recordBefore))
    : translateText('Primer registro');
  const totalXpAfter = Number.isFinite(Number(entry.totalXpAfter)) ? Number(entry.totalXpAfter) : state.game.totalXp;
  const levelAfter = Math.max(1, Number(entry.levelAfter) || levelForXp(totalXpAfter));
  const nextLevelXp = Math.max(totalXpAfter, Number(entry.nextLevelXp) || xpThresholdForLevel(levelAfter + 1));
  const xpToNext = Math.max(0, nextLevelXp - totalXpAfter);
  const monster = entry.monster || { defeated: false, hpPct: fallback.hpPct };
  const monsterName = sanitizeMonsterName(settings.game.monsterName) || fallback.species.name;
  const monsterOutcome = monster.defeated
    ? ui`Monstruo derrotado: ${monsterName}`
    : ui`Escapó con ${Math.round(monster.hpPct)}% de vida: ${monsterName}`;
  const evidence = closingEvidenceForDay(dayKey, { ...fallback, stats: { ...fallback.stats, earnings } }, comparisons);
  evidence.projection = entry.closingEvidence?.projection || null;
  const evidenceMarkup = ui`<div class="game-stage-missions"><h3>${evidence.things.length === 3 ? translateText('Tres cosas que hiciste bien hoy') : translateText('Lo que hiciste bien hoy')}</h3>${evidence.things.map((text) => ui`<p>${escapeHtml(text)}</p>`).join('')}${evidence.projection ? ui`<p>${escapeHtml(translateStoredText(evidence.projection))}</p>` : ''}</div>`;
  if (!settings.game.enabled) return ui`<div class="game-stage-clear"><span class="game-kicker">DÍA GUARDADO</span>${evidenceMarkup}<p>Puedes descansar y retomar mañana a tu ritmo.</p></div>`;

  return ui`<div class="game-stage-clear">
    <span class="game-kicker">STAGE CLEAR</span>
    <h2 class="game-pixel-clear-title">STAGE CLEAR</h2>
    ${pixelStars(entry.stars || 1)}
    <p>${escapeHtml(monsterOutcome)} · ${withConversion(earnings)}</p>
    ${evidenceMarkup}
    <div class="game-stage-score"><strong>+${entry.xp} XP</strong><span>Tope diario ${GAME_DAILY_XP_CAP}</span></div>
    <div class="game-stage-comparisons">
      <div><span>Ayer</span><strong>${yesterdayText}</strong></div>
      <div><span>Récord diario previo</span><strong>${recordText}</strong></div>
    </div>
    <div class="game-stage-breakdown"><span>Productividad +${breakdown.productivityXp}</span><span>Llamadas +${breakdown.callsXp}</span><span>Adherencia +${breakdown.adherenceXp}</span><span>Puntualidad +${breakdown.punctualityXp}</span><span>Misiones +${breakdown.missionXp}</span></div>
    <div class="game-stage-missions">${entry.missions.map((mission) => ui`<span class="${mission.ok ? 'is-complete' : ''}">${mission.ok ? '✓' : '○'} ${escapeHtml(translateStoredText(mission.detail))}</span>`).join('')}</div>
    <div class="game-stage-next-level"><span>Nivel ${levelAfter}</span><strong>${xpToNext > 0 ? ui`${xpToNext} XP para nivel ${levelAfter + 1}` : translateText('Nivel completado')}</strong></div>
    <div class="game-sealed-chest">${gamePixelChest(!!state.game.ledger[`chest:${dayKey}`])}<span>${state.game.ledger[`chest:${dayKey}`] ? translateText('Cofre abierto · recompensa guardada') : translateText('Cofre sellado · reclámalo en Logros o al iniciar tu próximo día')}</span></div>
  </div>`;
}

function openStageClear(dayKey, entry, { celebrate = false, leveledUp = false } = {}) {
  if (!gameEnabled()) return;
  const root = document.getElementById('stageClearContent');
  if (!root) return;
  root.innerHTML = stageClearMarkup(dayKey, entry);
  openModal('stageClearModal');
  pixelBurst(root, 'clear');
  if (celebrate) playGameTone(leveledUp ? 'level' : 'stage', dayKey);
}

export function onGameShiftEnded(dayKey = currentGameDayKey()) {
  if (!gameEnabled()) return onPositiveRewardWindow('shift-end');
  const normalizedDayKey = callDateKeyFromValue(dayKey) || currentGameDayKey();
  ensureGameState(normalizedDayKey);
  const alreadyFinalized = state.game.days[normalizedDayKey]?.finalized;
  const trackedStart = new Date(state.shiftStartedAt || NaN);
  const trackedEnd = new Date(state.shiftEndedAt || NaN);
  const justClosedTrackedDay = Number.isFinite(trackedStart.getTime()) && Number.isFinite(trackedEnd.getTime())
    && trackedEnd.getTime() >= trackedStart.getTime() && trackedEnd.getTime() <= Date.now()
    && todayCallDateKey(trackedStart) === normalizedDayKey && todayCallDateKey(trackedEnd) === todayCallDateKey();
  const oldLevel = state.game.level;
  const entry = freezeGameDay(normalizedDayKey, { projectStreak: normalizedDayKey === currentGameDayKey() || justClosedTrackedDay });
  saveStateOnly();
  renderGame();
  if (!alreadyFinalized && gameEnabled()) openStageClear(normalizedDayKey, entry, { celebrate: true, leveledUp: state.game.level > oldLevel });
  onPositiveRewardWindow('shift-end');
}

function chestReward(sealedOn, { goalReward = false } = {}) {
  if (goalReward) {
    const visor = ACCESSORY_BY_ID['visor-violeta'];
    const cosmetic = !state.game.accessories.includes(visor.label) ? visor : ACCESSORY_CATALOG.find(item => item.unlockLevel <= state.game.level && !state.game.accessories.includes(item.label));
    if (cosmetic) return { type: 'accessory', label: cosmetic.label, rarity: 'rare' };
    return { type: 'xp', amount: 25, label: translateText('25 monedas de XP'), rarity: 'common' };
  }
  const roll = hashText(`chest:${sealedOn}`) % 3;
  const rarity = lootRarityFor(`chest:${sealedOn}`);
  if (roll === 0) {
    const accessory = nextUnownedAccessory(`${sealedOn}:accessory`);
    if (accessory) return { type: 'accessory', label: accessory, rarity };
    return { type: 'xp', amount: rarity === 'epic' ? 50 : 25, label: ui`${rarity === 'epic' ? 50 : 25} monedas de XP`, rarity };
  }
  const amount = roll === 1 ? 25 : 40;
  return { type: 'xp', amount, label: ui`${amount} monedas de XP`, rarity };
}

function grantChestReward(sealedOn, { goalReward = false, showModal = true } = {}) {
  const owner = state, game = state.game;
  const key = `chest:${sealedOn}`;
  const existing = state.game.ledger[key];
  if (existing) return false;
  const reward = chestReward(sealedOn, { goalReward });
  const displayReward = `${lootRarityLabel(reward.rarity)} · ${translateStoredText(reward.label)}`;
  const oldLevel = state.game.level;
  const previous = { totalXp: state.game.totalXp, level: oldLevel, accessories: [...state.game.accessories], chest: state.game.chest };
  let granted = false;
  if (!state.game.ledger[key]) {
    state.game.ledger[key] = { type: 'chest', sealedOn, goalReward, rarity: reward.rarity, gross: reward.type === 'xp' ? reward.amount : 0, applied: reward.type === 'xp' ? reward.amount : 0, accessory: reward.type === 'accessory' ? reward.label : null };
    granted = true;
    if (reward.type === 'xp') state.game.totalXp += reward.amount;
    else if (!state.game.accessories.includes(reward.label)) state.game.accessories.push(reward.label);
    state.game.level = levelForXp(state.game.totalXp);
  }
  if (state.game.chest.sealedOn === sealedOn) state.game.chest = { pending: false, sealedOn: null };
  if (saveStateOnly() === false) {
    if (state === owner && state.game === game) {
      Object.assign(game, previous);
      delete game.ledger[key];
    }
    return false;
  }

  const root = document.getElementById('chestContent');
  if (root && showModal) {
    root.innerHTML = ui`<div class="game-chest-open"><span class="game-kicker">COFRE ABIERTO</span><div class="game-chest-icon">${gamePixelChest(true)}</div><h2>${escapeHtml(displayReward)}</h2><p>${reward.type === 'xp' ? translateText('Se sumó a tu perfil.') : translateText('Ya está disponible en tu bestiario.')}</p></div>`;
    openModal('chestModal');
    pixelBurst(root, 'loot');
  }
  if (granted) {
    queueGameToast(ui`🎁 Cofre abierto · ${displayReward}`, 'loot');
    if (state.game.level > oldLevel) queueGameToast(ui`NIVEL ${state.game.level} DESBLOQUEADO`, 'record');
    playGameSound(state.game.level > oldLevel ? 'level' : 'loot');
  }
  return true;
}

function openPendingChest(todayKey, { allowSameDay = false } = {}) {
  if (!gameEnabled()) return false;
  if (!state.game.chest.pending || !state.game.chest.sealedOn || (!allowSameDay && state.game.chest.sealedOn === todayKey)) return false;
  const sealedOn = state.game.chest.sealedOn;
  if (state.game.ledger[`chest:${sealedOn}`]) {
    const owner = state, game = state.game;
    const previous = state.game.chest;
    state.game.chest = { pending: false, sealedOn: null };
    if (saveStateOnly() === false) {
      if (state === owner && state.game === game) game.chest = previous;
      return false;
    }
    return true;
  }
  return grantChestReward(sealedOn);
}

export function openDailyGoalChest(dayKey = currentGameDayKey()) {
  if (!gameEnabled() || state.activeCall || dayKey !== currentGameDayKey()) return false;
  ensureGameState(dayKey);
  if (!computeGameDay(dayKey).defeated) return false;
  if (!grantChestReward(dayKey, { goalReward: true, showModal: false })) return false;
  renderGame();
  return true;
}

export function claimPendingChest() {
  const claimed = openPendingChest(currentGameDayKey(), { allowSameDay: true });
  if (claimed) {
    renderGame();
  }
  return claimed;
}

export function onGamePauseEnded(pauseRecord, { onTime = false } = {}) {
  ensureGameState();
  if (pauseRecord && ['break', 'lunch'].includes(pauseRecord.type)) {
    const dayKey = callDateKeyFromValue(pauseRecord.shiftDayKey) || currentGameDayKey();
    const key = `pause-return:${dayKey}:${hashText(`${pauseRecord.type}:${pauseRecord.startedAt}`)}`;
    const previous = state.game.ledger[key];
    if (!previous || previous.endedAt !== pauseRecord.endedAt) {
      if (previous?.applied) dayEntry(dayKey).bonusXp = Math.max(0, dayEntry(dayKey).bonusXp - previous.applied);
      const bonus = onTime ? grantDayBonusReceipt(dayKey, 5) : { gross: 0, applied: 0 };
      state.game.ledger[key] = { type: 'pause', dayKey, onTime, endedAt: pauseRecord.endedAt, ...bonus };
      saveStateOnly();
      if (onTime) notifyReinforcement(reinforcementText('pause', { pause: pauseRecord.type === 'lunch' ? translateText('Lunch') : translateText('Break'), xp: bonus.applied ? ` · +${bonus.applied} XP` : '' }, pauseRecord.startedAt), { channel: 'either', sound: 'pause', dayKey });
    }
  }
  if (gameEnabled()) renderGame();
}

export function onGamePauseStarted(type) {
  ensureGameState();
  const pause = state.activePause;
  if (pause) {
    const dayKey = callDateKeyFromValue(pause.shiftDayKey) || currentGameDayKey();
    const key = `pause-return:${dayKey}:${hashText(`${type}:${pause.startedAt}`)}`;
    const receipt = state.game.ledger[key];
    if (receipt) {
      if (receipt.applied) dayEntry(dayKey).bonusXp = Math.max(0, dayEntry(dayKey).bonusXp - receipt.applied);
      state.game.ledger[key] = { ...receipt, onTime: false, applied: 0, amount: 0, endedAt: '' };
    }
  }
  state.game.live.combo = 0;
  saveStateOnly();
  if (gameEnabled()) renderGame();
  return onPositiveRewardWindow(type === 'lunch' ? 'lunch' : 'break');
}

export function equipAccessory(accessoryLabel) {
  if (!gameEnabled()) return false;
  ensureGameState();
  const owner = state, game = state.game;
  const value = String(accessoryLabel ?? '');
  const item = ACCESSORY_BY_LABEL[value] || ACCESSORY_BY_ID[value];
  if (!item || !state.game.accessories.includes(item.label) || item.unlockLevel > state.game.level) return false;
  const currently = state.game.equipment[item.slot];
  state.game.equipment[item.slot] = currently === item.label ? null : item.label;
  if (saveStateOnly() === false) {
    if (state === owner && state.game === game) {
      if (currently === undefined) delete game.equipment[item.slot];
      else game.equipment[item.slot] = currently;
    }
    return false;
  }
  renderGame();
  announceGameStatus(state.game.equipment[item.slot] ? ui`${translateText(item.label)} equipado` : ui`${translateText(item.label)} retirado`);
  playGameSound('equip');
  return true;
}

function recordPreviousCycleOutcome() {
  const bounds = cycleBoundsForOffset(-1);
  const endKey = todayCallDateKey(bounds.end);
  const endDate = callDateToDate(endKey);
  const todayDate = callDateToDate(todayCallDateKey());
  if (!endDate || !todayDate || endDate >= todayDate) return false;
  const key = `cycle-result:${endKey}`;
  if (state.game.ledger[key]) return false;
  if (state.game.cycleReward?.pending) return false;
  const cycle = cycleEarningsForOffset(-1);
  const goal = effectiveCycleGoal(-1);
  if (!(goal > 0)) return false;
  state.game.ledger[key] = true;
  const pct = Math.max(0, Math.min(100, (cycle.earnings / goal) * 100));
  if (monetaryMilestones(cycle.earnings, goal).claimed.includes(100)) {
    if (state.game.ledger[`cycle-defeat:${endKey}`]) return true;
    state.game.ledger[`cycle-defeat:${endKey}`] = true;
    state.game.cycleReward = { pending: true, cycleKey: endKey, options: cycleRewardOptionsFor(endKey) };
    queueGameToast(ui`🏆 JEFE DEL CICLO DERROTADO · ${withConversion(cycle.earnings)}`, 'record');
  } else {
    queueGameToast(ui`JEFE HUYÓ HERIDO · ${Math.round(pct)}% · faltaron ${withConversion(Math.max(0, goal - cycle.earnings))}`);
  }
  return true;
}

export function onGameDayRollover() {
  // ensureGameState conserva el día en que arrancó un turno nocturno todavía activo. Solo cambia
  // al nuevo día de calendario cuando ya no hay una sesión cruzando medianoche.
  ensureGameState();
  if (gameEnabled()) recordPreviousCycleOutcome();
  saveStateOnly();
}

export function onGameBackupExported() {
  if (!gameEnabled()) return;
  ensureGameState();
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const week = Math.floor((now - start) / (7 * 86400000));
  const key = `backup-shield:${now.getFullYear()}-${week}`;
  if (state.game.ledger[key]) return;
  state.game.ledger[key] = true;
  if (state.game.shields < GAME_SHIELD_CAP) {
    state.game.shields++;
    queueGameToast(translateText('◆ Escudo ganado por tu backup semanal'), 'loot');
    playGameSound('reward');
  } else {
    queueGameToast(translateText('Backup semanal listo · ya tienes 3 escudos'));
  }
  saveStateOnly();
  renderGame();
}

function resetGameProgress() {
  const owner = state, settingsOwner = settings, signature = JSON.stringify(state?.game);
  let consumed = false;
  appConfirm(translateText('¿Reiniciar todo el progreso de gamificación? Se borran XP, niveles, rachas, escudos, cofres, accesorios, trofeos y bestiario. Tus llamadas, turnos y finanzas no se tocan.'), () => {
    if (consumed || state !== owner || settings !== settingsOwner || JSON.stringify(state?.game) !== signature) return false;
    consumed = true;
    const previous = state.game;
    const reinforcement = normalizeReinforcementState(state.game?.reinforcement);
    state.game = { ...createDefaultGameState(), reinforcement };
    ensureGameState();
    const game = state.game;
    if (saveStateOnly() === false) {
      if (state === owner && state.game === game) state.game = previous;
      return false;
    }
    renderGame();
    toast(translateText('Progreso de gamificación reiniciado'));
    return true;
  });
}

function saveMonsterName() {
  const input = document.getElementById('monsterNameInput');
  if (!input) return;
  const name = sanitizeMonsterName(input.value);
  const config = ensureGameSettings();
  const previous = config.monsterName;
  if (name) config.monsterName = name;
  else delete config.monsterName;
  if (saveSettingsOnly() === false) {
    if (previous === undefined) delete config.monsterName;
    else config.monsterName = previous;
    return false;
  }
  monsterNameDraftDirty = false;
  const status = document.getElementById('monsterNameSaveStatus');
  if (status) status.textContent = name ? ui`Nombre guardado: ${name}.` : translateText('Se usarán los nombres del catálogo.');
  renderGame();
}

let gameInitialized = false;

export function setGameEnabled(enabled) {
  const saved = saveGamePreference('enabled', enabled === true);
  renderGame();
  renderHeader?.();
  return saved;
}

export function initGame() {
  if (gameInitialized) return;
  gameInitialized = true;
  ensureGameSettings();
  ensureGameState();
  initGameAudio();
  Object.keys(state.game.days).concat(currentGameDayKey()).forEach((key) => {
    const snapshot = computeGameDay(key);
    onGameMonetaryProgress(key, snapshot.stats.earnings, snapshot.goal.usd, { silent: true });
  });
  initPositiveReinforcement();
  document.addEventListener('click', (event) => {
    const nav = event.target instanceof Element ? event.target.closest('[data-game-nav]') : null;
    if (nav) document.querySelector('.sidebar-link[data-page="achievements"]')?.click();
    const action = event.target instanceof Element ? event.target.closest('[data-game-action]') : null;
    if (action) {
      const actionName = action.dataset.gameAction;
      if (['equip-accessory', 'equip'].includes(actionName)) equipAccessory(action.dataset.accessory);
      if (['claim-chest', 'claim-coffer'].includes(actionName)) claimPendingChest();
      if (actionName === 'open-daily-chest') openDailyGoalChest(action.dataset.gameDay);
      if (['choose-cycle-reward', 'claim-cycle-reward'].includes(actionName)) chooseCycleReward(action.dataset.cycleReward);
    }
    const reopen = event.target instanceof Element ? event.target.closest('[data-reopen-stage], [data-game-action="open-last-clear"]') : null;
    if (reopen) {
      const key = reopen.getAttribute('data-reopen-stage') || reopen.dataset.dayKey;
      const entry = key ? state.game.days[key] : null;
      if (entry?.finalized) openStageClear(key, entry);
    }
  });
  for (const id of ['gameEnabledInput', 'sidebarAchievementsInput']) {
    document.getElementById(id)?.addEventListener('change', (event) => {
      setGameEnabled(!!event.target.checked);
    });
  }
  document.getElementById('sidebarGameSoundInput')?.addEventListener('change', (event) => {
    saveGamePreference('soundEnabled', !!event.target.checked);
    syncGameAudio();
    renderSettingsProfile();
    renderArena();
  });
  document.getElementById('gameSoundVolumeInput')?.addEventListener('input', (event) => {
    if (!saveGamePreference('soundVolume', Math.max(0, Math.min(100, Number(event.target.value) || 0)))) event.target.value = settings.game.soundVolume;
    syncGameAudio();
    renderSettingsProfile();
  });
  document.getElementById('gameSoundPreviewBtn')?.addEventListener('click', (event) => {
    previewGameSound('loot', event);
    const status = document.getElementById('gameSoundStatus');
    if (status) status.textContent = !settings.game.soundVolume || Number(settings.masterVolume) === 0 ? translateText('Sube el volumen de Logros y el volumen general para escuchar los efectos.') : '';
  });
  document.addEventListener('input', (event) => { if (event.target?.id === 'masterVolumeInput') syncGameAudio(); });
  document.getElementById('monsterNameSaveBtn')?.addEventListener('click', saveMonsterName);
  document.getElementById('monsterNameInput')?.addEventListener('input', () => {
    monsterNameDraftDirty = true;
    const status = document.getElementById('monsterNameSaveStatus');
    if (status) status.textContent = '';
  });
  document.getElementById('resetGameProgressBtn')?.addEventListener('click', resetGameProgress);
  document.getElementById('stageClearCloseBtn')?.addEventListener('click', () => closeModal('stageClearModal'));
  document.getElementById('chestCloseBtn')?.addEventListener('click', () => closeModal('chestModal'));
  document.addEventListener('app:modal-closed', drainGameToasts);
}
