import {
  appConfirm,
  callDateToDate,
  calls,
  callsForDay,
  closeModal,
  computeComplianceStreak,
  convertedAmountText,
  cycleBoundsForOffset,
  cycleEarningsForOffset,
  dayAdherence,
  dayComplianceStatus,
  dayConfigFor,
  dayIsEffectivelyOff,
  effectiveCycleGoal,
  effectiveDailyGoal,
  escapeHtml,
  financeConvertedInline,
  financeRowIsMeta,
  formatCallDayLabel,
  formatMinutes,
  higherRateBonusForCall,
  higherRateLiveStatus,
  importedCallStats,
  money,
  openModal,
  parseMoney,
  productiveMinutesForDay,
  saveSettingsOnly,
  saveStateOnly,
  settings,
  state,
  todayCallDateKey,
  toast,
  weekdayKeyForDayKey,
} from './app-main.js';
import { MONSTER_CATALOG, monsterForWeekday, monsterSvg } from './monsters.js';

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
]);

export function createDefaultGameState() {
  return {
    version: 1,
    totalXp: 0,
    level: 1,
    shields: 0,
    bestStreak: 0,
    accessories: [],
    trophies: [],
    chest: { pending: false, sealedOn: null },
    days: {},
    ledger: {},
    live: { dayKey: null, combo: 0, shiftAlarmAt: null },
  };
}

export function normalizeGameState(raw) {
  const fallback = createDefaultGameState();
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const chest = source.chest && typeof source.chest === 'object' ? source.chest : {};
  const live = source.live && typeof source.live === 'object' ? source.live : {};
  const days = source.days && typeof source.days === 'object' && !Array.isArray(source.days) ? source.days : {};
  const ledger = source.ledger && typeof source.ledger === 'object' && !Array.isArray(source.ledger) ? source.ledger : {};
  return {
    ...fallback,
    ...source,
    totalXp: Math.max(0, Number(source.totalXp) || 0),
    level: Math.max(1, Math.floor(Number(source.level) || 1)),
    shields: Math.max(0, Math.min(GAME_SHIELD_CAP, Math.floor(Number(source.shields) || 0))),
    bestStreak: Math.max(0, Math.floor(Number(source.bestStreak) || 0)),
    accessories: Array.from(new Set(Array.isArray(source.accessories) ? source.accessories.map(String) : [])),
    trophies: Array.isArray(source.trophies) ? source.trophies.filter(Boolean) : [],
    chest: { pending: !!chest.pending, sealedOn: chest.sealedOn ? String(chest.sealedOn) : null },
    days,
    ledger,
    live: {
      dayKey: live.dayKey ? String(live.dayKey) : null,
      combo: Math.max(0, Math.floor(Number(live.combo) || 0)),
      shiftAlarmAt: live.shiftAlarmAt ? String(live.shiftAlarmAt) : null,
    },
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

function ensureGameSettings() {
  if (!settings.game || typeof settings.game !== 'object' || Array.isArray(settings.game)) settings.game = {};
  if (typeof settings.game.enabled !== 'boolean') settings.game.enabled = true;
  if (!['subtle', 'arcade', 'off'].includes(settings.game.intensity)) settings.game.intensity = 'arcade';
  if (settings.game.intensity === 'off') settings.game.enabled = false;
  return settings.game;
}

export function ensureGameState() {
  const normalized = normalizeGameState(state.game);
  state.game = normalized;
  const today = todayCallDateKey();
  if (state.game.live.dayKey !== today) {
    state.game.live = { dayKey: today, combo: 0, shiftAlarmAt: null };
  }
  pruneGameDays();
  state.game.level = levelForXp(state.game.totalXp);
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
  return config.enabled && config.intensity !== 'off';
}

function arcadeEnabled() {
  return gameEnabled() && settings.game.intensity === 'arcade';
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
  if (!call || todayCallDateKey() !== dayKey || todayCallDateKey(new Date(call.importedAt || 0)) !== dayKey) return false;
  const ended = new Date(call.endISO).getTime();
  const imported = new Date(call.importedAt).getTime();
  if (!Number.isFinite(ended) || !Number.isFinite(imported)) return false;
  return imported - ended <= 30 * 60000;
}

function plannedPauseCount(dayKey) {
  const config = dayConfigFor(dayKey);
  return (Array.isArray(config?.blocks) ? config.blocks : [])
    .filter((block) => ['break', 'lunch'].includes(String(block?.type || '').toLowerCase())).length;
}

function missionSnapshot(dayKey, stats, goal, adherence) {
  const productiveOk = goal.min <= 0 || stats.productive >= goal.min - 0.5;
  const remainingProductive = Math.max(0, goal.min - stats.productive);
  const pauseCheckpoints = (adherence?.checkpoints || []).filter((item) => !['Entrada', 'Salida', 'Turno'].includes(item.label));
  const expectedPauses = plannedPauseCount(dayKey);
  const breaksOk = expectedPauses === 0 || (pauseCheckpoints.length >= expectedPauses && pauseCheckpoints.every((item) => item.ok));
  const missingBreaks = Math.max(0, expectedPauses - pauseCheckpoints.filter((item) => item.ok).length);
  const adherenceGoal = Number(settings.adherenceGoalPct) || 95;
  const adherencePct = Number(adherence?.scorePct);
  const adherenceOk = Number.isFinite(adherencePct) && adherencePct >= adherenceGoal;
  const missions = [
    {
      id: 'productive',
      label: 'Rompe la armadura de productividad',
      ok: productiveOk,
      detail: productiveOk ? `${formatMinutes(stats.productive)} min alcanzados` : `Faltan ${formatMinutes(remainingProductive)} min`,
    },
    {
      id: 'breaks',
      label: 'Protege tus Break/Lunch',
      ok: breaksOk,
      detail: breaksOk ? (expectedPauses ? 'Todos dentro de su ventana' : 'Sin pausas programadas') : `Faltan ${missingBreaks} pausa(s) a tiempo`,
    },
    {
      id: 'adherence',
      label: 'Defiende la Adherencia',
      ok: adherenceOk,
      detail: adherenceOk ? `${Math.round(adherencePct)}% de ${adherenceGoal}%` : Number.isFinite(adherencePct) ? `Faltan ${Math.max(0, Math.ceil(adherenceGoal - adherencePct))} puntos` : 'Aún sin datos suficientes',
    },
  ];
  return missions;
}

function callXp(call) {
  const critical = higherRateBonusForCall(call) > 0;
  return critical ? Math.ceil(3 * 1.5) : 3;
}

export function computeGameDay(dayKey = todayCallDateKey(), { ignoreLock = false } = {}) {
  ensureGameState();
  const dayCalls = callsForDay(dayKey);
  const stats = importedCallStats(dayCalls, dayKey);
  const goal = effectiveDailyGoal(dayKey);
  const adherence = dayAdherence(dayKey);
  const missions = missionSnapshot(dayKey, stats, goal, adherence);
  const eligibleCalls = dayCalls.filter((call) => callIsXpEligible(call, dayKey));
  const productivityXp = goal.min > 0 ? Math.round(Math.min(1, stats.productive / goal.min) * 50) : 50;
  const callsXp = Math.min(30, eligibleCalls.reduce((sum, call) => sum + callXp(call), 0));
  const adherencePct = Math.max(0, Number(adherence?.scorePct) || 0);
  const adherenceGoal = Number(settings.adherenceGoalPct) || 95;
  const adherenceXp = Math.round(Math.min(1, adherencePct / adherenceGoal) * 30);
  const punctualityXp = state.game.ledger[`reflex:${dayKey}`] ? 20 : 0;
  const missionXp = missions.every((mission) => mission.ok) ? 20 : 0;
  const bonusXp = Math.max(0, Number(state.game.days[dayKey]?.bonusXp) || 0);
  const rawXp = dayCalls.length ? Math.min(GAME_DAILY_XP_CAP, productivityXp + callsXp + adherenceXp + punctualityXp + missionXp + bonusXp) : 0;
  const lockedXp = ignoreLock ? Number.NaN : Number(state.game.days[dayKey]?.xpLocked);
  const xp = Number.isFinite(lockedXp) ? Math.min(rawXp, lockedXp) : rawXp;
  const completedMissions = missions.filter((mission) => mission.ok).length;
  const stars = dayCalls.length ? Math.max(1, completedMissions) : 0;
  const hpPct = goal.usd > 0 ? Math.max(0, Math.min(100, (1 - stats.earnings / goal.usd) * 100)) : 100;
  const defeated = goal.usd > 0 && hpPct <= 0;
  return {
    dayKey,
    stats,
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
  if (state.activePause || !state.shiftStartedAt || state.shiftEndedAt) return 'sleeping';
  if (higherRateLiveStatus()?.active) return 'fury';
  if (day.hpPct <= 25) return 'wounded';
  if (day.hpPct <= 50) return 'angry';
  return 'awake';
}

function monsterVariantFor(day) {
  if (higherRateLiveStatus()?.active) return 'gold';
  if (gameStreak() >= 7) return 'streak';
  return 'normal';
}

function yesterdayShadowPct() {
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const key = todayCallDateKey(yesterday);
  const cutoff = now.getHours() * 60 + now.getMinutes();
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

function renderArena() {
  const root = document.getElementById('gameArena');
  const classic = document.getElementById('classicDailyGoalCard');
  if (!root || !classic) return;
  const dayKey = todayCallDateKey();
  const day = computeGameDay(dayKey);
  const active = gameEnabled() && day.goal.usd > 0;
  root.hidden = !active;
  classic.style.display = active && settings.game.intensity === 'arcade' ? 'none' : '';
  if (!active) {
    lastArenaRenderKey = '';
    root.className = 'game-arena';
    root.removeAttribute('data-game-state');
    root.removeAttribute('data-game-intensity');
    return;
  }

  const subtle = settings.game.intensity === 'subtle';
  const monsterState = monsterStateFor(day);
  const variant = monsterVariantFor(day);
  const shadow = yesterdayShadowPct();
  const damage = Math.max(0, day.goal.usd - day.stats.earnings);
  const renderKey = [dayKey, subtle, monsterState, variant, day.stats.earnings.toFixed(2), Math.round(day.hpPct * 10), Math.round((shadow ?? -1) * 10), day.missions.map((mission) => mission.ok ? 1 : 0).join('')].join(':');
  if (renderKey === lastArenaRenderKey) return;
  lastArenaRenderKey = renderKey;
  root.className = `game-arena ${subtle ? 'game-arena--subtle' : 'game-arena--arcade'} game-${escapeHtml(monsterState)}`;
  root.dataset.gameState = monsterState;
  root.dataset.gameIntensity = subtle ? 'subtle' : 'arcade';
  root.innerHTML = `
    <div class="game-arena-copy">
      <div class="game-kicker">MONSTRUO DEL DÍA</div>
      <div class="game-arena-title-row"><h3>${escapeHtml(day.species.name)}</h3><span class="game-combo-badge">x${state.game.live.combo || 0}</span></div>
      <p class="game-monster-phrase">“${escapeHtml(day.species.phrase)}”</p>
      <div class="game-hp-label"><span>VIDA</span><strong>${Math.round(day.hpPct)}%</strong></div>
      <div class="game-hp-track" role="progressbar" aria-label="Vida del monstruo" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(day.hpPct)}">
        <div class="game-hp-fill" style="width:${day.hpPct}%"></div>
        ${shadow === null ? '' : `<span class="game-shadow-marker" style="left:${shadow}%" title="Ayer a esta hora: ${Math.round(shadow)}% de la meta"></span>`}
      </div>
      <div class="game-hp-foot"><span>${withConversion(damage)} de vida restante</span><span>${day.defeated ? 'Botín extra: las ganancias siguen, el XP no' : `${withConversion(day.stats.earnings)} de daño`}</span></div>
    </div>
    <div class="game-monster-stage">${monsterSvg({ species: day.species.id, state: monsterState, variant, hpPct: day.hpPct, sizeClass: subtle ? 'sm' : 'lg' })}</div>`;
}

function renderMissions() {
  const root = document.getElementById('gameMissions');
  if (!root) return;
  if (!gameEnabled()) {
    root.hidden = true;
    return;
  }
  root.hidden = false;
  const day = computeGameDay(todayCallDateKey());
  root.innerHTML = `
    <div class="game-section-head"><div><span class="game-kicker">3 ARMADURAS</span><h3>Misiones del día</h3></div><strong>${day.missions.filter((mission) => mission.ok).length}/3</strong></div>
    <div class="game-mission-grid">${day.missions.map((mission, index) => `
      <div class="game-mission ${mission.ok ? 'is-complete' : ''}">
        <span class="game-armor" aria-hidden="true">${mission.ok ? '✦' : '◆'}</span>
        <div><b>${index + 1}. ${escapeHtml(mission.label)}</b><span>${escapeHtml(mission.detail)}</span></div>
      </div>`).join('')}</div>`;
}

function renderHeroChips() {
  const enabled = gameEnabled();
  const streak = gameStreak();
  const level = gameLevelProgress();
  const combo = state.game.live.combo || 0;
  const chips = [
    ['gameStreakChip', 'gameStreakValue', `${streak} d`, true],
    ['gameComboChip', 'gameComboValue', `x${combo}`, combo > 0],
    ['gameLevelChip', 'gameLevelValue', String(level.level), true],
  ];
  chips.forEach(([chipId, valueId, value, visible]) => {
    const chip = document.getElementById(chipId);
    const valueNode = document.getElementById(valueId);
    if (valueNode) valueNode.textContent = value;
    if (chip) chip.hidden = !enabled || !visible;
  });
}
function cycleBossSnapshot() {
  const cycle = cycleEarningsForOffset(0);
  const goal = effectiveCycleGoal(0);
  const pct = goal > 0 ? Math.max(0, Math.min(100, (cycle.earnings / goal) * 100)) : 0;
  const hp = Math.max(0, 100 - pct);
  const defeated = goal > 0 && pct >= 100;
  const stateName = defeated ? 'defeated' : hp <= 25 ? 'wounded' : hp <= 50 ? 'angry' : 'awake';
  return { cycle, goal, pct, hp, defeated, stateName };
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
    if (title) title.textContent = boss.defeated ? 'JEFE DERROTADO' : 'El Guardián de la Quincena';
    if (status) status.textContent = boss.defeated ? 'DERROTADO' : boss.hp <= 25 ? 'CASI CAE' : 'EN MARCHA';
    if (subtitle) subtitle.textContent = boss.defeated
      ? 'Meta del ciclo cumplida. El botín real sigue siendo tu pago.'
      : `Progreso del ciclo: ${Math.round(boss.pct)}%.`;
    if (progress) progress.style.width = `${boss.pct}%`;
    if (earned) earned.textContent = withConversion(boss.cycle.earnings);
    if (goal) goal.textContent = `Meta ${withConversion(boss.goal)}`;
  });
}
function syncCycleBossAchievement() {
  if (!gameEnabled()) return false;
  const boss = cycleBossSnapshot();
  if (!boss.defeated) return false;
  const endKey = todayCallDateKey(boss.cycle.end);
  const key = `cycle-defeat:${endKey}`;
  if (state.game.ledger[key]) return false;
  state.game.ledger[key] = true;
  queueGameToast(`🏆 JEFE DEL CICLO DERROTADO · ${withConversion(boss.cycle.earnings)}`, 'record');
  return true;
}

function bestiarySnapshot() {
  const catalog = Object.values(MONSTER_CATALOG)
    .filter((entry, index, all) => all.findIndex((item) => item.id === entry.id) === index);
  const defeatedDays = Object.entries(state.game.days)
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
    return `<article class="game-collection-card ${found ? 'is-unlocked' : 'is-locked'}">
      <div class="game-bestiary-sprite">${monsterSvg({ species: entry.id, state: found ? 'defeated' : 'sleeping', variant: found?.monster?.variant || 'normal', hpPct: found ? 0 : 100, sizeClass: 'md' })}</div>
      <strong>${found ? escapeHtml(entry.name) : '???'}</strong>
      <small>${found ? `${formatCallDayLabel(found.key)} · ${'★'.repeat(found.stars || 1)}` : 'Derrota esta especie para revelarla'}</small>
    </article>`;
  }).join('');
  const accessoriesHtml = state.game.accessories.map((accessory) => `
    <article class="game-collection-card is-unlocked game-accessory-card">
      <div class="game-bestiary-sprite" aria-hidden="true">✦</div>
      <strong>${escapeHtml(accessory)}</strong>
      <small>Accesorio desbloqueado</small>
    </article>`).join('');
  list.innerHTML = speciesHtml + accessoriesHtml;
}

function renderAchievements() {
  const summary = document.getElementById('gameAchievementsSummary');
  if (!summary) return;
  const level = gameLevelProgress();
  const streak = gameStreak();
  const summaryValues = {
    streak: `${streak} días`,
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
    if (best) best.textContent = `Mejor: ${state.game.bestStreak}`;
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
        cell.title = formatCallDayLabel(key);
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
    setRole('next-level', `Siguiente: ${level.ceiling} XP`);
    const progress = levelRoot.querySelector('[data-game-role="level-progress"]');
    if (progress) progress.style.width = `${level.pct}%`;
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

  const trophies = document.getElementById('gameTrophies');
  if (trophies) {
    const count = trophies.querySelector('[data-game-role="trophy-count"]');
    const list = trophies.querySelector('[data-game-role="trophy-list"]');
    if (count) count.textContent = String(state.game.trophies.length);
    if (list) list.innerHTML = state.game.trophies.length
      ? state.game.trophies.map((item) => `<div class="game-trophy-row"><span>🏆 ${escapeHtml(item.label || item.id)}</span><strong>${item.earnedOn ? escapeHtml(formatCallDayLabel(item.earnedOn)) : 'Ganado'}</strong></div>`).join('')
      : '<div class="game-collection-empty">Tus próximos trofeos aparecerán aquí.</div>';
  }

  const records = document.getElementById('gameRecords');
  if (records) {
    const list = records.querySelector('[data-game-role="records-list"]');
    const longest = calls.reduce((best, call) => Math.max(best, Number(call.durationMin) || 0), 0);
    const biggest = calls.reduce((best, call) => Math.max(best, parseMoney(call.pay)), 0);
    if (list) list.innerHTML = `
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
      if (content) content.innerHTML = `<div class="game-clear-stars" aria-hidden="true"><span>${entry.stars >= 1 ? '★' : '☆'}</span><span>${entry.stars >= 2 ? '★' : '☆'}</span><span>${entry.stars >= 3 ? '★' : '☆'}</span></div><p>${entry.xp} XP · ${entry.monster?.defeated ? 'Monstruo derrotado' : 'Stage guardado'}</p>`;
      if (button) {
        button.hidden = false;
        button.dataset.dayKey = key;
      }
    } else {
      if (date) date.textContent = '—';
      if (content) content.innerHTML = '<div class="game-clear-stars" aria-hidden="true"><span>☆</span><span>☆</span><span>☆</span></div><p>Aún no hay un STAGE CLEAR guardado.</p>';
      if (button) {
        button.hidden = true;
        delete button.dataset.dayKey;
      }
    }
    let pendingChest = last.querySelector('[data-game-role="pending-chest"]');
    if (!pendingChest) {
      pendingChest = document.createElement('p');
      pendingChest.className = 'game-empty';
      pendingChest.dataset.gameRole = 'pending-chest';
      last.appendChild(pendingChest);
    }
    const hasPendingChest = !!state.game.chest.pending && !!state.game.chest.sealedOn;
    pendingChest.hidden = !hasPendingChest;
    pendingChest.textContent = hasPendingChest
      ? `🎁 Cofre sellado desde ${formatCallDayLabel(state.game.chest.sealedOn)} · se abre al iniciar tu próximo día`
      : '';
  }
}
function renderSettingsProfile() {
  const enabled = document.getElementById('gameEnabledInput');
  const intensity = document.getElementById('gameIntensityInput');
  const profile = document.getElementById('gameSettingsProfile');
  const level = gameLevelProgress();
  if (enabled) enabled.checked = gameEnabled();
  if (intensity) intensity.value = settings.game.intensity;
  if (!profile) return;
  const { seen } = bestiarySnapshot();
  const values = {
    level: `Nivel ${level.level}`,
    xp: `${state.game.totalXp} XP`,
    streak: `${state.game.bestStreak} días`,
    collection: String(seen.size),
  };
  Object.entries(values).forEach(([key, value]) => {
    const node = profile.querySelector(`[data-game-profile="${key}"]`);
    if (node) node.textContent = value;
  });
}
function syncFinanceRewards() {
  if (!gameEnabled() || !settings.financeCategories) return false;
  let changed = false;
  const month = new Date().toISOString().slice(0, 7);
  Object.values(settings.financeCategories).forEach((category) => {
    (category?.rows || []).forEach((row) => {
      const assigned = Number(row.assignedAmount) || 0;
      const target = Number(row.targetAmount) || 0;
      if (!(target > 0 && assigned >= target - 0.004)) return;
      if (financeRowIsMeta(row)) {
        const key = `finance-meta:${row.id}`;
        if (state.game.ledger[key]) return;
        state.game.ledger[key] = true;
        changed = true;
        state.game.trophies.push({ id: key, label: `Meta cumplida: ${row.name}`, earnedOn: todayCallDateKey() });
        grantDayBonus(todayCallDateKey(), 10);
        const accessory = nextUnownedAccessory(key);
        if (accessory) state.game.accessories.push(accessory);
        queueGameToast(`🏆 Trofeo desbloqueado: ${row.name}`);
      } else if (row.recurring && row.manualPaid) {
        const key = `finance-paid:${row.id}:${month}`;
        if (state.game.ledger[key]) return;
        state.game.ledger[key] = true;
        changed = true;
        const granted = grantDayBonus(todayCallDateKey(), 5);
        queueGameToast(granted > 0 ? `+${granted} XP · ${row.name} pagado a tiempo` : `${row.name} pagado · XP diario sellado`);
      }
    });
  });
  return changed;
}

function clearTransientGameUi() {
  const loot = document.getElementById('gameLootBox');
  if (loot) {
    loot.hidden = true;
    loot.classList.remove('is-revealing');
  }
  const record = document.getElementById('gameRecordBanner');
  if (record) record.hidden = true;
  const fx = document.getElementById('gameCallFx');
  if (fx) fx.innerHTML = '';
  document.querySelectorAll('.game-live-xp-float').forEach((node) => node.remove());
  const stack = document.getElementById('gameToastStack');
  if (stack) stack.replaceChildren();
  gameToastQueue.length = 0;
}

export function renderGame() {
  ensureGameSettings();
  ensureGameState();
  const enabled = gameEnabled();
  document.documentElement.classList.toggle('game-arcade', arcadeEnabled());
  document.documentElement.classList.toggle('game-subtle', enabled && settings.game.intensity === 'subtle');

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

  if (bossDefeatedNow) {
    triggerGameEvent('gameCycleBoss', 'clear', 1000);
    triggerGameEvent('gameCycleBossAchievements', 'clear', 1000);
    playGameTone('clear');
  }
  drainGameToasts();
}

export function renderGameLive() {
  if (!gameEnabled()) return drainGameToasts();
  renderArena();
  drainGameToasts();
}

const gameToastQueue = [];

export function queueGameToast(message, tone = '') {
  gameToastQueue.push({ message: String(message), tone });
  drainGameToasts();
}

function drainGameToasts() {
  const stack = document.getElementById('gameToastStack');
  if (!stack || document.querySelector('.modal-overlay.open')) return;
  while (gameToastQueue.length && stack.children.length < 3) {
    const item = gameToastQueue.shift();
    const toastElement = document.createElement('div');
    toastElement.className = `game-toast ${item.tone ? `game-toast--${item.tone}` : ''}`;
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

function playGameTone(kind = 'hit') {
  if (!arcadeEnabled()) return;
  const volume = Math.max(0, Math.min(1, (Number(settings.masterVolume) || 0) / 100));
  if (!volume) return;
  try {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContextCtor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = kind === 'clear' ? 'square' : 'triangle';
    oscillator.frequency.value = kind === 'critical' ? 720 : kind === 'clear' ? 520 : 360;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume * 0.12), context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + (kind === 'clear' ? 0.9 : 0.16));
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + (kind === 'clear' ? 0.92 : 0.18));
    oscillator.addEventListener('ended', () => context.close().catch(() => {}));
  } catch {}
}

function triggerGameEvent(rootId, eventName, duration = 900) {
  if (!arcadeEnabled()) return;
  const root = document.getElementById(rootId);
  if (!root) return;
  root.removeAttribute('data-game-event');
  void root.offsetWidth;
  root.dataset.gameEvent = eventName;
  setTimeout(() => {
    if (root.dataset.gameEvent === eventName) root.removeAttribute('data-game-event');
  }, duration);
}

function grantDayBonus(dayKey, amount) {
  const entry = dayEntry(dayKey);
  if (Number.isFinite(Number(entry.xpLocked))) return 0;
  const before = computeGameDay(dayKey).xp;
  if (before >= GAME_DAILY_XP_CAP) return 0;
  const previousBonus = Number(entry.bonusXp) || 0;
  entry.bonusXp = Math.max(0, previousBonus + Math.max(0, Number(amount) || 0));
  const recalculated = computeGameDay(dayKey);
  const delta = Math.max(0, recalculated.xp - before);
  if (entry.finalized) {
    entry.xp = recalculated.xp;
    state.game.totalXp += delta;
    state.game.level = levelForXp(state.game.totalXp);
  }
  return delta;
}

function showCallFx(call, xp, critical, mode = 'xp') {
  const root = document.getElementById('gameCallFx');
  if (!root) return;
  if (!arcadeEnabled()) {
    root.innerHTML = '';
    document.querySelectorAll('.game-live-xp-float').forEach((node) => node.remove());
    return;
  }
  const amount = parseMoney(call.pay) + higherRateBonusForCall(call);
  const message = mode === 'extra'
    ? `BOTÍN EXTRA · ${withConversion(amount)}`
    : xp > 0
      ? `+${xp} XP · ${withConversion(amount)}`
      : `XP DIARIO SELLADO · ${withConversion(amount)}`;
  const fxMarkup = `<span class="game-xp-float ${critical ? 'is-critical' : ''}">${message}</span>`;
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
  }
  setTimeout(() => {
    root.innerHTML = '';
    liveFx?.remove();
    arena?.classList.remove('is-hit', 'is-critical-hit');
  }, 2100);
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

function rewardLootBox(dayKey, callCount) {
  const ledgerKey = `loot:${dayKey}:${callCount}`;
  if (state.game.ledger[ledgerKey]) return;
  state.game.ledger[ledgerKey] = true;
  const root = document.getElementById('gameLootBox');
  const roll = hashText(ledgerKey) % 4;
  let reward;
  if (roll === 0) {
    const accessory = nextUnownedAccessory(`${ledgerKey}:accessory`);
    if (accessory) {
      state.game.accessories.push(accessory);
      reward = `Accesorio: ${accessory}`;
    } else {
      const granted = grantDayBonus(dayKey, 10);
      reward = granted > 0 ? `Colección completa · +${granted} XP` : 'Colección completa · XP diario sellado';
    }
  } else {
    const granted = grantDayBonus(dayKey, 10);
    reward = granted > 0 ? `+${granted} XP cosmético` : 'XP diario ya sellado';
  }
  if (root) {
    root.hidden = false;
    root.classList.toggle('is-revealing', arcadeEnabled());
    root.innerHTML = `<span class="game-loot-icon">?</span><div><b>CAJA ABIERTA</b><span>${escapeHtml(reward)}</span></div>`;
    setTimeout(() => {
      root.hidden = true;
      root.classList.remove('is-revealing');
    }, 4200);
  }
  queueGameToast(`🎁 ${reward}`, 'loot');
}

let gameRecordBannerTimer = null;

function showGameRecordBanner(message) {
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
    ? `NUEVO RÉCORD · ${formatMinutes(call.durationMin)} min`
    : `NUEVO RÉCORD · ${withConversion(parseMoney(call.pay))}`;
  showGameRecordBanner(message);
}

export function onGameCallSaved(call, source = 'manual') {
  if (!gameEnabled() || !call || !['manual', 'live'].includes(source)) return;
  const dayKey = todayCallDateKey();
  if (!callIsXpEligible(call, dayKey)) return;
  ensureGameState();
  const currentDay = computeGameDay(dayKey);
  const entry = dayEntry(dayKey);
  const xpLocked = Number.isFinite(Number(entry.xpLocked));
  const critical = higherRateBonusForCall(call) > 0;

  if (currentDay.defeated && xpLocked) {
    saveStateOnly();
    renderGame();
    showCallFx(call, 0, critical, 'extra');
    maybeShowRecord(call);
    playGameTone(critical ? 'critical' : 'hit');
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
      queueGameToast('💥 MONSTRUO DERROTADO · botín del día asegurado', 'record');
    }
  }

  const count = currentDay.eligibleCalls.length;
  if (count > 0 && count % 5 === 0) rewardLootBox(dayKey, count);
  saveStateOnly();
  renderGame();

  showCallFx(call, grantedXp, critical);
  maybeShowRecord(call);
  if (defeatedNow) {
    triggerGameEvent('gameArena', 'clear', 1000);
    playGameTone('clear');
  } else {
    playGameTone(critical ? 'critical' : 'hit');
  }
}

export function onGameGapSaved(dayKey, gapKey, label) {
  if (!gameEnabled()) return;
  ensureGameState();
  if (String(label).toLowerCase() === 'other') state.game.live.combo = 0;
  const key = `gap:${dayKey}:${gapKey}`;
  const perDayCount = Object.keys(state.game.ledger).filter((item) => item.startsWith(`gap:${dayKey}:`)).length;
  if (!state.game.ledger[key] && perDayCount < 3) {
    state.game.ledger[key] = true;
    const granted = grantDayBonus(dayKey, 5);
    queueGameToast(granted > 0 ? `+${granted} XP · Hueco clasificado` : 'Hueco clasificado · XP diario sellado');
  }
  saveStateOnly();
  renderGame();
}

export function onGameCallsChanged(dayKey) {
  const enabled = gameEnabled();
  ensureGameState();
  const normalizedDayKey = String(dayKey || '');
  const entry = state.game.days[normalizedDayKey];
  if (!entry?.finalized) {
    if (enabled) renderGame();
    return false;
  }

  const raw = computeGameDay(normalizedDayKey, { ignoreLock: true });
  const oldXp = Math.max(0, Number(entry.xp) || 0);
  const existingLock = Number(entry.xpLocked);
  const nextXp = raw.defeated && Number.isFinite(existingLock)
    ? Math.min(raw.xp, existingLock)
    : raw.xp;

  const shouldUseShield = dayComplianceStatus(normalizedDayKey) === 'failed';
  if (entry.shieldUsed && !shouldUseShield) {
    state.game.shields = Math.min(GAME_SHIELD_CAP, state.game.shields + 1);
    entry.shieldUsed = false;
  } else if (!entry.shieldUsed && shouldUseShield && state.game.shields > 0) {
    state.game.shields--;
    entry.shieldUsed = true;
  }

  entry.xp = nextXp;
  entry.xpBreakdown = { ...raw.xpBreakdown };
  entry.earnings = Number(raw.stats.earnings) || 0;
  entry.callCount = raw.stats.total || raw.eligibleCalls.length;
  entry.stars = raw.stars;
  entry.missions = raw.missions.map(({ id, ok, detail }) => ({ id, ok, detail }));
  entry.monster = {
    species: raw.species.id,
    variant: monsterVariantFor(raw),
    defeated: raw.defeated,
    hpPct: raw.hpPct,
  };
  if (raw.defeated) {
    entry.xpLocked = nextXp;
  } else {
    delete entry.xpLocked;
    delete state.game.ledger[`monster-defeat:${normalizedDayKey}`];
  }

  state.game.totalXp = Math.max(0, state.game.totalXp + nextXp - oldXp);
  state.game.level = levelForXp(state.game.totalXp);
  state.game.bestStreak = recomputeBestStreak();

  if (state.game.chest.pending && state.game.chest.sealedOn === normalizedDayKey && !(entry.callCount > 0)) {
    state.game.chest = { pending: false, sealedOn: null };
  }

  entry.comparisons = stageComparisonSnapshot(normalizedDayKey, entry.earnings);
  entry.totalXpAfter = state.game.totalXp;
  entry.levelAfter = state.game.level;
  entry.nextLevelXp = xpThresholdForLevel(state.game.level + 1);

  saveStateOnly();
  if (enabled) renderGame();
  return true;
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
  if (Number.isFinite(Number(rollback.shieldsBefore))) {
    state.game.shields = Math.max(0, Math.min(GAME_SHIELD_CAP, Number(rollback.shieldsBefore)));
  } else if (entry.shieldUsed) {
    state.game.shields = Math.min(GAME_SHIELD_CAP, state.game.shields + 1);
  }
  if (rollback.streakShieldAwardedKey) delete state.game.ledger[rollback.streakShieldAwardedKey];

  state.game.days[dayKey] = {
    bonusXp: Number(entry.bonusXp) || 0,
    ...(Number.isFinite(Number(entry.xpLocked)) ? { xpLocked: Number(entry.xpLocked) } : {}),
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

export function onGameShiftStarted({ continued = false } = {}) {
  ensureGameState();
  const dayKey = todayCallDateKey();
  const enabled = gameEnabled();

  if (continued) {
    revokeStageClear(dayKey, { silent: !enabled });
    saveStateOnly();
    if (enabled) renderGame();
    return;
  }
  if (!enabled) return;

  openPendingChest(dayKey);
  const firedAt = new Date(state.game.live.shiftAlarmAt || 0).getTime();
  const elapsed = Date.now() - firedAt;
  const key = `reflex:${dayKey}`;
  if (!state.game.ledger[key] && firedAt > 0 && elapsed >= 0 && elapsed <= 2 * 60000) {
    state.game.ledger[key] = true;
    queueGameToast('+20 XP · Reflejos perfectos', 'record');
  }
  saveStateOnly();
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

function freezeGameDay(dayKey) {
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
    callCount: snapshot.stats.total || snapshot.eligibleCalls.length,
    comparisons,
    stars: snapshot.stars,
    missions: snapshot.missions.map(({ id, ok, detail }) => ({ id, ok, detail })),
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
    showGameRecordBanner(`NUEVO RÉCORD · Racha ${state.game.bestStreak} días`);
  }
  const shieldKey = `streak-shield:${dayKey}:${streak}`;
  if (streak >= 7 && streak % 7 === 0 && !state.game.ledger[shieldKey] && state.game.shields < GAME_SHIELD_CAP) {
    state.game.ledger[shieldKey] = true;
    entry.rollback.streakShieldAwardedKey = shieldKey;
    state.game.shields++;
    queueGameToast('◆ Escudo ganado por racha semanal', 'loot');
  }
  if (state.game.level > oldLevel) queueGameToast(`NIVEL ${state.game.level} DESBLOQUEADO`, 'record');
  if (snapshot.stats.total || snapshot.eligibleCalls.length) {
    state.game.chest = { pending: true, sealedOn: dayKey };
  }
  pruneGameDays();
  return entry;
}

function stageClearMarkup(dayKey, entry) {
  const fallback = computeGameDay(dayKey);
  const callCount = Number(entry.callCount);
  if (!(callCount > 0) && !fallback.stats.total && !fallback.eligibleCalls.length) {
    return `<div class="game-stage-clear game-stage-clear--empty"><span class="game-kicker">TURNO CERRADO</span><h2>Descanso guardado</h2><p>No hubo llamadas hoy, así que no se congeló XP. Mañana será otro stage.</p></div>`;
  }

  const breakdown = entry.xpBreakdown || fallback.xpBreakdown;
  const earnings = Number.isFinite(Number(entry.earnings)) ? Number(entry.earnings) : fallback.stats.earnings;
  const comparisons = entry.comparisons || stageComparisonSnapshot(dayKey, earnings);
  const yesterdayDelta = earnings - (Number(comparisons.yesterdayEarnings) || 0);
  const yesterdayText = comparisons.yesterdayHasData
    ? `${withConversion(comparisons.yesterdayEarnings)} · ${yesterdayDelta >= 0 ? '+' : '−'}${withConversion(Math.abs(yesterdayDelta))}`
    : 'Sin referencia';
  const recordBefore = Math.max(0, Number(comparisons.recordBefore) || 0);
  const recordText = recordBefore > 0
    ? (earnings > recordBefore ? `NUEVO RÉCORD · +${withConversion(earnings - recordBefore)}` : withConversion(recordBefore))
    : 'Primer registro';
  const totalXpAfter = Number.isFinite(Number(entry.totalXpAfter)) ? Number(entry.totalXpAfter) : state.game.totalXp;
  const levelAfter = Math.max(1, Number(entry.levelAfter) || levelForXp(totalXpAfter));
  const nextLevelXp = Math.max(totalXpAfter, Number(entry.nextLevelXp) || xpThresholdForLevel(levelAfter + 1));
  const xpToNext = Math.max(0, nextLevelXp - totalXpAfter);
  const monster = entry.monster || { defeated: false, hpPct: fallback.hpPct };

  return `<div class="game-stage-clear">
    <span class="game-kicker">STAGE CLEAR</span>
    <h2>${'★'.repeat(entry.stars || 1)}${'☆'.repeat(Math.max(0, 3 - (entry.stars || 0)))}</h2>
    <p>${monster.defeated ? 'Monstruo derrotado' : `El monstruo escapó con ${Math.round(monster.hpPct)}% de vida`} · ${withConversion(earnings)}</p>
    <div class="game-stage-score"><strong>+${entry.xp} XP</strong><span>Tope diario ${GAME_DAILY_XP_CAP}</span></div>
    <div class="game-stage-comparisons">
      <div><span>Ayer</span><strong>${yesterdayText}</strong></div>
      <div><span>Récord diario previo</span><strong>${recordText}</strong></div>
    </div>
    <div class="game-stage-breakdown"><span>Productividad +${breakdown.productivityXp}</span><span>Llamadas +${breakdown.callsXp}</span><span>Adherencia +${breakdown.adherenceXp}</span><span>Puntualidad +${breakdown.punctualityXp}</span><span>Misiones +${breakdown.missionXp}</span></div>
    <div class="game-stage-missions">${entry.missions.map((mission) => `<span class="${mission.ok ? 'is-complete' : ''}">${mission.ok ? '✓' : '○'} ${escapeHtml(mission.detail)}</span>`).join('')}</div>
    <div class="game-stage-next-level"><span>Nivel ${levelAfter}</span><strong>${xpToNext > 0 ? `${xpToNext} XP para nivel ${levelAfter + 1}` : 'Nivel completado'}</strong></div>
    <div class="game-sealed-chest">🎁 Cofre sellado · se abre al iniciar tu próximo día</div>
  </div>`;
}

function openStageClear(dayKey, entry) {
  const root = document.getElementById('stageClearContent');
  if (!root) return;
  root.innerHTML = stageClearMarkup(dayKey, entry);
  openModal('stageClearModal');
  playGameTone('clear');
}

export function onGameShiftEnded() {
  if (!gameEnabled()) return;
  ensureGameState();
  const dayKey = todayCallDateKey();
  const entry = freezeGameDay(dayKey);
  saveStateOnly();
  renderGame();
  openStageClear(dayKey, entry);
}

function chestReward(sealedOn) {
  const roll = hashText(`chest:${sealedOn}`) % 3;
  if (roll === 0) {
    const accessory = nextUnownedAccessory(`${sealedOn}:accessory`);
    if (accessory) return { type: 'accessory', label: accessory };
    return { type: 'xp', amount: 25, label: '25 monedas de XP' };
  }
  return { type: 'xp', amount: roll === 1 ? 25 : 40, label: `${roll === 1 ? 25 : 40} monedas de XP` };
}

function openPendingChest(todayKey) {
  if (!state.game.chest.pending || !state.game.chest.sealedOn || state.game.chest.sealedOn === todayKey) return false;
  const sealedOn = state.game.chest.sealedOn;
  const key = `chest:${sealedOn}`;
  const reward = chestReward(sealedOn);
  const oldLevel = state.game.level;
  let granted = false;
  if (!state.game.ledger[key]) {
    state.game.ledger[key] = true;
    granted = true;
    if (reward.type === 'xp') state.game.totalXp += reward.amount;
    else if (!state.game.accessories.includes(reward.label)) state.game.accessories.push(reward.label);
    state.game.level = levelForXp(state.game.totalXp);
  }
  state.game.chest = { pending: false, sealedOn: null };

  const root = document.getElementById('chestContent');
  if (root) {
    root.innerHTML = `<div class="game-chest-open"><span class="game-kicker">COFRE ABIERTO</span><div class="game-chest-icon">🎁</div><h2>${escapeHtml(reward.label)}</h2><p>${reward.type === 'xp' ? 'Se sumó a tu perfil.' : 'Ya está disponible en tu bestiario.'}</p></div>`;
    openModal('chestModal');
  }
  if (granted) {
    queueGameToast(`🎁 Cofre abierto · ${reward.label}`, 'loot');
    if (state.game.level > oldLevel) queueGameToast(`NIVEL ${state.game.level} DESBLOQUEADO`, 'record');
  }
  playGameTone('clear');
  return true;
}

export function onGamePauseEnded() {
  if (!gameEnabled()) return;
  renderGame();
}

function recordPreviousCycleOutcome() {
  const bounds = cycleBoundsForOffset(-1);
  const endKey = todayCallDateKey(bounds.end);
  const endDate = callDateToDate(endKey);
  const todayDate = callDateToDate(todayCallDateKey());
  if (!endDate || !todayDate || endDate >= todayDate) return false;
  const key = `cycle-result:${endKey}`;
  if (state.game.ledger[key]) return false;
  const cycle = cycleEarningsForOffset(-1);
  const goal = effectiveCycleGoal(-1);
  if (!(goal > 0)) return false;
  state.game.ledger[key] = true;
  const pct = Math.max(0, Math.min(100, (cycle.earnings / goal) * 100));
  if (pct >= 100) {
    if (state.game.ledger[`cycle-defeat:${endKey}`]) return true;
    queueGameToast(`🏆 JEFE DEL CICLO DERROTADO · ${withConversion(cycle.earnings)}`, 'record');
  } else {
    queueGameToast(`JEFE HUYÓ HERIDO · ${Math.round(pct)}% · faltaron ${withConversion(Math.max(0, goal - cycle.earnings))}`);
  }
  return true;
}

export function onGameDayRollover() {
  ensureGameState();
  state.game.live = { dayKey: todayCallDateKey(), combo: 0, shiftAlarmAt: null };
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
    queueGameToast('◆ Escudo ganado por tu backup semanal', 'loot');
  } else {
    queueGameToast('Backup semanal listo · ya tienes 3 escudos');
  }
  saveStateOnly();
  renderGame();
}

function resetGameProgress() {
  appConfirm('¿Reiniciar todo el progreso de gamificación? Se borran XP, niveles, rachas, escudos, cofres, accesorios, trofeos y bestiario. Tus llamadas, turnos y finanzas no se tocan.', () => {
    state.game = createDefaultGameState();
    ensureGameState();
    saveStateOnly();
    renderGame();
    toast('Progreso de gamificación reiniciado');
  });
}

let gameInitialized = false;

export function initGame() {
  if (gameInitialized) return;
  gameInitialized = true;
  ensureGameSettings();
  ensureGameState();
  document.addEventListener('click', (event) => {
    const nav = event.target instanceof Element ? event.target.closest('[data-game-nav]') : null;
    if (nav) document.querySelector('.sidebar-link[data-page="achievements"]')?.click();
    const reopen = event.target instanceof Element ? event.target.closest('[data-reopen-stage], [data-game-action="open-last-clear"]') : null;
    if (reopen) {
      const key = reopen.getAttribute('data-reopen-stage') || reopen.dataset.dayKey;
      const entry = key ? state.game.days[key] : null;
      if (entry?.finalized) openStageClear(key, entry);
    }
  });
  document.getElementById('gameEnabledInput')?.addEventListener('change', (event) => {
    settings.game.enabled = !!event.target.checked;
    if (settings.game.enabled && settings.game.intensity === 'off') settings.game.intensity = 'arcade';
    saveSettingsOnly();
    renderGame();
  });
  document.getElementById('gameIntensityInput')?.addEventListener('change', (event) => {
    const value = event.target.value;
    settings.game.intensity = ['subtle', 'arcade', 'off'].includes(value) ? value : 'arcade';
    settings.game.enabled = settings.game.intensity !== 'off';
    saveSettingsOnly();
    renderGame();
  });
  document.getElementById('resetGameProgressBtn')?.addEventListener('click', resetGameProgress);
  document.getElementById('stageClearCloseBtn')?.addEventListener('click', () => closeModal('stageClearModal'));
  document.getElementById('chestCloseBtn')?.addEventListener('click', () => closeModal('chestModal'));
  document.addEventListener('app:modal-closed', drainGameToasts);
}
