import { renderWeekSummary as renderWeekSummaryView } from './weekly-summary.js';
import { ui, translateText, translateMarkup, displayLocale, translateDocument } from './i18n.js';
import { applyAppearance, wireAppearance } from './appearance.js';
import { loadDetailViews } from './detail-views-loader.js';
import { wireAchievementHelp } from './help-tooltips.js';
import { wireFinancePlanning, financeInputUsd } from './finance-planning.js';
import { validFinanceSettings } from './finance-plan-model.js';
import { normalizeBattleWeapon } from './game-battle.js';
import { createPropioReceiver, createStorageRevisionGuard, ignorePropioCall } from './propio-bridge.js';
import { portalRecordsText } from './propio-history-records.js';
import { callFeedbackSilenced, withSilentCallFeedback } from './call-feedback.js';
import { settingsWithinBudget, reportLocalPersistenceFailure, readMeta, jsonbBytes, preserveRecoveryCopy, listRecoveryCopies } from './sync.js';
// Boot importa este módulo solo después de verificar la sesión e hidratar sus datos.

import { FINANCE_CATEGORIES, FINANCE_CUSTOM_CATEGORY_PALETTE, financeRowIsMeta, renderFinanceSection, renderFinancePreview, setFinanceTab, syncFinanceRowTargetFields, financeConvertedInline, financeConvertedNote, financeSwapPriority, financeFindRow, financeApplySignedAmount, reviewFinanceAction, financeToggleManualPaid, financeDeleteRow, openFinanceRowModal, saveFinanceRowModal, selectFinanceCategoryChip, openFinanceNewCatPanel, closeFinanceNewCatPanel, createFinanceCategory, financeDeleteCategory, updateFinanceTotalsScrollHint, financeRunAutoFillCascade, configureFinanceContext } from './finance.js';

import {
  REPORTS_MONTHLY_PAGE_SIZE,
  computeComplianceStreak,
  cycleGoalPace,
  dayComplianceStatus,
  renderReportsDashboard,
  renderReportsMonthlyChart,
  reportsCycleProjection,
  configureReportsContext,
} from './reports.js';

import {
  backToCalYearView,
  effectiveHistoryStartDate,
  openCalMonthFromYear,
  openCalYearGoalEditor,
  openHistoryStartDateEditor,
  renderCalYear,
  renderCalendarMonth,
  saveCalHistoryStartModal,
  saveCalYearGoalModal,
  syncCalViewVisibility,
  useAutoCalHistoryStartModal,
  useAutoCalYearGoalModal,
  configureCalendarContext,
} from './calendar.js';

import { updateScheduleRowSummary, addBlockRow, applyScheduleOffset, copyDayToAll, copyDayToWeekend, ensureScheduleWeekOverride, formatBlockDurationLabel, removeBlockRowAt, removeScheduleWeekOverride, saveShiftWindow, scheduleFormIsDirty, scheduleWeekHasCustom, scheduleWeekIsPast, syncShiftModalFields, syncScheduleOffsetUI, configureScheduleContext } from './schedule.js';


import {
  applyRateTileToManualCall,
  autoSaveLiveCall,
  clearActiveDayCalls,
  clearManualCallRateTile,
  deleteCallRecord,
  getManualCallSelectedRateTile,
  hasPendingManualCallBackup,
  markManualCallPayDirty,
  openCallEditor,
  openCallRecovery,
  openManualCallModal,
  renderDayStatsCards,
  renderTable,
  requestCloseManualCallModal,
  restorePendingLiveCallBackup,
  resetCallEditorState,
  saveCallEditor,
  saveManualCall,
  setTableFilterMode,
  updateManualCallPreview,
  configureCallsContext,
} from './calls.js';


import {
  addHigherRateWindowRow,
  openHigherRateReview,
  higherRateBonusBreakdownForCalls,
  higherRateBonusChipsHtml,
  higherRateBonusForCall,
  higherRateBonusForCalls,
  higherRateBreakdownTagsHtml,
  higherRateLiveStatus,
  hrTierButtonLabel,
  hrWindowWeekdayLabel,
  higherRateTierBadgeHtml,
  purgePastHigherRateWindows,
  refreshHigherRateWindowsIfNeeded,
  removeHigherRateWindowRowAt,
  renderHigherRateLiveCard,
  saveHigherRateWindowsFromEditor,
  syncHigherRateModalFields,
  configureHigherRateContext,
} from './higher-rate.js';


import {
  applyPendingGoalChange,
  applyGoalValues,
  cancelPendingGoalChange,
  clearActiveDayGoalOverride,
  finishOnboarding,
  formatGoalFields,
  openSettingsModal,
  renderEmojiPicker,
  requestGoalChange,
  saveAccountProfile,
  syncEmojiPickerSelection,
  toggleEmojiPickerMetas,
  toggleEmojiPickerOnboarding,
  updateCurrencySettings,
  updateRate,
  wireEmojiPicker,
  wireSettingsLanguage,
  configureSettingsContext,
} from './settings.js';

import {
  createDefaultGameState,
  initGame,
  normalizeGameState,
  onGameBackupExported,
  onGameCallSaved,
  onGameMonetaryProgress,
  migrateGameCallReferences,
  checkReinforcementInactivity,
  onGameCallsChanged,
  onGameDayRollover,
  onGameDayReset,
  onGameDayMetadataChanged,
  onGameGapSaved,
  onGamePauseEnded,
  onGamePauseStarted,
  onGameShiftAlarmFired,
  onGameShiftEnded,
  onGameShiftStarted,
  renderGame,
  renderGameLive,
  configureGameContext,
} from './game.js';
import {
  configurePositiveReinforcementContext,
  migratePositiveCallIdReferences,
} from './positive-reinforcement.js';
import { acwMinutesForBlock } from './block-acw.js';

import { activeAppKeys } from './sync.js';

import {
  state, calls, settings, reportsMonthlyOffset, calMonthOffset, calViewMode, calYearOffset,
  scheduleEditDay, scheduleOffsetMin, scheduleViewMode, scheduleWeekOffset,
  setAppState, setAppCalls, setAppSettings, setReportsMonthlyOffset as setContextReportsMonthlyOffset,
  setCalMonthOffset as setContextCalMonthOffset, setCalViewMode as setContextCalViewMode,
  setCalYearOffset as setContextCalYearOffset, setScheduleEditDay as setContextScheduleEditDay,
  setScheduleOffsetMin as setContextScheduleOffsetMin, setScheduleViewMode as setContextScheduleViewMode,
  setScheduleWeekOffset as setContextScheduleWeekOffset,
} from './app-context.js';

export {
  state, calls, settings, reportsMonthlyOffset, calMonthOffset, calViewMode, calYearOffset,
  scheduleEditDay, scheduleOffsetMin, scheduleViewMode, scheduleWeekOffset,
} from './app-context.js';

export { effectiveHistoryStartDate } from './calendar.js';
export { financeConvertedInline, financeConvertedNote, financeRowIsMeta, financeRunAutoFillCascade };
export { higherRateBonusForCall, higherRateBonusForCalls, higherRateTierBadgeHtml };
export { higherRateLiveStatus };
export { formatBlockDurationLabel };
export { renderEmojiPicker };
export { computeComplianceStreak, dayComplianceStatus };
export { onGameCallSaved, onGameCallsChanged, onGameDayMetadataChanged };

    const ACTIVE_APP_KEYS = activeAppKeys();
    const STORAGE_KEY = ACTIVE_APP_KEYS.state;
    const CALLS_KEY = ACTIVE_APP_KEYS.calls;
    const SETTINGS_KEY = ACTIVE_APP_KEYS.settings;
    export const RATE = 0.12;
    const ICON = {
      menu: '<line x1=\"3\" y1=\"6\" x2=\"21\" y2=\"6\"/><line x1=\"3\" y1=\"12\" x2=\"21\" y2=\"12\"/><line x1=\"3\" y1=\"18\" x2=\"21\" y2=\"18\"/>',
      close: '<line x1=\"18\" y1=\"6\" x2=\"6\" y2=\"18\"/><line x1=\"6\" y1=\"6\" x2=\"18\" y2=\"18\"/>',
      pin: '<circle cx=\"12\" cy=\"9\" r=\"4\"/><line x1=\"12\" y1=\"13\" x2=\"12\" y2=\"21\"/>',
      bell: '<path d=\"M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6\"/><path d=\"M10 20a2 2 0 0 0 4 0\"/>',
      flame: '<path d=\"M12 2c2 3-1 4-1 7a3 3 0 1 0 6 0c0-1-.5-2-.5-2 2 1 3 3.5 3 6a7 7 0 1 1-14 0c0-4 2-6 3.5-8 .5 2 1 2.5 3-3Z\"/>',
      shield: '<path d=\"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z\"/>',
      trophy: '<path d=\"M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z\"/><path d=\"M7 6H4v2a4 4 0 0 0 4 4M17 6h3v2a4 4 0 0 1-4 4\"/>',
      gift: translateMarkup('<rect x=\"3\" y=\"8\" width=\"18\" height=\"13\" rx=\"2\"/><path d=\"M12 8v13M3 12h18M7.5 8C5 8 4 6.5 4.8 5.2 6 3.2 9.5 5.4 12 8M16.5 8c2.5 0 3.5-1.5 2.7-2.8C18 3.2 14.5 5.4 12 8\"/>'),
      settings: '<circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z\"/>',
      reset: '<path d=\"M21 12a9 9 0 1 1-3-6.7\"/><polyline points=\"21 3 21 9 15 9\"/>',
      coffee: '<path d=\"M17 8h1a4 4 0 1 1 0 8h-1\"/><path d=\"M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z\"/><line x1=\"6\" y1=\"2\" x2=\"6\" y2=\"4\"/><line x1=\"10\" y1=\"2\" x2=\"10\" y2=\"4\"/><line x1=\"14\" y1=\"2\" x2=\"14\" y2=\"4\"/>',
      utensils: '<path d=\"M7 2v6a2 2 0 0 0 4 0V2\"/><path d=\"M9 8v14\"/><path d=\"M17 2c-1.5 0-3 1.5-3 4s1.5 4 3 5v11\"/>',
      briefcase: translateMarkup('<rect x=\"2\" y=\"7\" width=\"20\" height=\"14\" rx=\"2\"/><path d=\"M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2\"/><line x1=\"2\" y1=\"12\" x2=\"22\" y2=\"12\"/>'),
      phone: '<path d=\"M15.05 5A5 5 0 0 1 19 8.95M15.05 1A9 9 0 0 1 23 8.94m-1 7.98v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.68 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.32 1.85.55 2.81.68A2 2 0 0 1 22 16.92Z\"/>',
      clipboard: translateMarkup('<rect x=\"8\" y=\"2\" width=\"8\" height=\"4\" rx=\"1\"/><path d=\"M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3\"/><line x1=\"9\" y1=\"12\" x2=\"15\" y2=\"12\"/><line x1=\"9\" y1=\"16\" x2=\"15\" y2=\"16\"/>'),
      plus: '<line x1=\"12\" y1=\"5\" x2=\"12\" y2=\"19\"/><line x1=\"5\" y1=\"12\" x2=\"19\" y2=\"12\"/>',
      home: '<path d=\"M3 10.5 12 3l9 7.5\"/><path d=\"M5 9.5V21h14V9.5\"/>',
      calendar: translateMarkup('<rect x=\"3\" y=\"4\" width=\"18\" height=\"18\" rx=\"2\"/><line x1=\"16\" y1=\"2\" x2=\"16\" y2=\"6\"/><line x1=\"8\" y1=\"2\" x2=\"8\" y2=\"6\"/><line x1=\"3\" y1=\"10\" x2=\"21\" y2=\"10\"/>'),
      clock: '<circle cx=\"12\" cy=\"12\" r=\"9\"/><polyline points=\"12 7 12 12 15.5 14\"/>',
      chevronDown: '<polyline points=\"6 9 12 15 18 9\"/>',
      help: '<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1.5 1-1.5 2.2\"/><line x1=\"12\" y1=\"17\" x2=\"12\" y2=\"17.01\"/>',
      target: '<circle cx=\"12\" cy=\"12\" r=\"9\"/><circle cx=\"12\" cy=\"12\" r=\"5\"/><circle cx=\"12\" cy=\"12\" r=\"1\"/>',
      timer: '<line x1=\"10\" y1=\"2\" x2=\"14\" y2=\"2\"/><line x1=\"12\" y1=\"6\" x2=\"12\" y2=\"2.5\"/><circle cx=\"12\" cy=\"13\" r=\"8\"/><polyline points=\"12 9 12 13 15 15\"/>',
      volume: '<polygon points=\"4 9 8 9 12 5 12 19 8 15 4 15\"/><path d=\"M17 8a5 5 0 0 1 0 8\"/><path d=\"M19.5 5.5a9 9 0 0 1 0 13\"/>',
      alarmClock: '<circle cx=\"12\" cy=\"13\" r=\"8\"/><polyline points=\"12 9 12 13 14.5 14.5\"/><path d=\"M5 3 2 6\"/><path d=\"M22 6 19 3\"/>',
      checkCircle: '<circle cx=\"12\" cy=\"12\" r=\"9\"/><polyline points=\"8 12.5 11 15.5 16 9\"/>',
      alertTriangle: '<path d=\"M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z\"/><line x1=\"12\" y1=\"9\" x2=\"12\" y2=\"13\"/><line x1=\"12\" y1=\"17\" x2=\"12\" y2=\"17.01\"/>',
      moon: '<path d=\"M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z\"/>',
      lock: translateMarkup('<rect x=\"4\" y=\"11\" width=\"16\" height=\"10\" rx=\"2\"/><path d=\"M8 11V7a4 4 0 0 1 8 0v4\"/>'),
      eye: '<path d=\"M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>',
      repeat: '<path d=\"M17 2 21 6 17 10\"/><path d=\"M3 12v-2a4 4 0 0 1 4-4h14\"/><path d=\"M7 22 3 18 7 14\"/><path d=\"M21 12v2a4 4 0 0 1-4 4H3\"/>',
      trash: '<line x1=\"4\" y1=\"7\" x2=\"20\" y2=\"7\"/><path d=\"M6 7V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v3\"/><path d=\"M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13\"/><line x1=\"10\" y1=\"11\" x2=\"10\" y2=\"17\"/><line x1=\"14\" y1=\"11\" x2=\"14\" y2=\"17\"/>',
      history: translateMarkup('<rect x=\"3\" y=\"4\" width=\"18\" height=\"4\" rx=\"1\"/><path d=\"M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8\"/><line x1=\"10\" y1=\"13\" x2=\"14\" y2=\"13\"/>'),
      edit: '<path d=\"M12 20h9\"/><path d=\"M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z\"/>',
      check: '<polyline points=\"5 12 10 17 19 6\"/>',
      medal: '<circle cx=\"12\" cy=\"15\" r=\"5\"/><path d=\"M9 9 6 3h2l4 6 4-6h2l-3 6\"/>',
      chart: '<line x1=\"4\" y1=\"20\" x2=\"4\" y2=\"10\"/><line x1=\"10\" y1=\"20\" x2=\"10\" y2=\"4\"/><line x1=\"16\" y1=\"20\" x2=\"16\" y2=\"14\"/><line x1=\"21\" y1=\"20\" x2=\"3\" y2=\"20\"/>',
      sparkles: '<path d=\"M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8\"/>',
      flag: '<path d=\"M5 3v18\"/><path d=\"M5 4h9l-1 3 1 3H5\"/>',
      zap: '<polygon points=\"13 2 3 14 12 14 11 22 21 10 12 10 13 2\"/>',
      circle: '<circle cx=\"12\" cy=\"12\" r=\"8\"/>',
      play: '<polygon points=\"6 3 20 12 6 21\" fill=\"currentColor\" stroke=\"none\"/>',
      wallet: '<path d=\"M20 12V8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1v-4\"/><path d=\"M20 12a2 2 0 0 1 0 4h-3a2 2 0 0 1 0-4Z\"/>',
      car: translateMarkup('<path d=\"M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11\"/><rect x=\"3\" y=\"11\" width=\"18\" height=\"6\" rx=\"2\"/><circle cx=\"7.5\" cy=\"17.5\" r=\"1.5\"/><circle cx=\"16.5\" cy=\"17.5\" r=\"1.5\"/>'),
      creditCard: translateMarkup('<rect x=\"2\" y=\"5\" width=\"20\" height=\"14\" rx=\"2\"/><line x1=\"2\" y1=\"10\" x2=\"22\" y2=\"10\"/>'),
      piggyBank: '<path d=\"M4 12a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v1a2 2 0 0 1-2 2h-1v2a1 1 0 0 1-2 0v-2h-6v2a1 1 0 0 1-2 0v-2H8a4 4 0 0 1-4-4Z\"/><circle cx=\"16\" cy=\"11\" r=\"1\" fill=\"currentColor\" stroke=\"none\"/><path d=\"M4 11H2\"/><path d=\"M17 7l1-2\"/>',
      moreHorizontal: '<circle cx=\"5\" cy=\"12\" r=\"1.5\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"12\" cy=\"12\" r=\"1.5\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"19\" cy=\"12\" r=\"1.5\" fill=\"currentColor\" stroke=\"none\"/>',
      star: '<polygon points=\"12 2 15 8.5 22 9.5 17 14.5 18.5 21.5 12 18 5.5 21.5 7 14.5 2 9.5 9 8.5 12 2\"/>',
      chevronUp: '<polyline points=\"18 15 12 9 6 15\"/>',
      chevronRight: '<polyline points=\"9 18 15 12 9 6\"/>',
      info: '<circle cx=\"12\" cy=\"12\" r=\"9\"/><line x1=\"12\" y1=\"16\" x2=\"12\" y2=\"12\"/><line x1=\"12\" y1=\"8\" x2=\"12.01\" y2=\"8\"/>',
    };
    export function iconHtml(name, extraClass) {
      const inner = ICON[name] || '';
      const cls = extraClass ? `ic-svg ${extraClass}` : 'ic-svg';
      return ui`<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`;
    }
    // Emoji que acompaña el nombre en el saludo (ver greetingText). Es el valor con el que se
    // prellena el campo del popup de bienvenida y el fallback si settings.userEmoji queda
    // vacío/inválido.
    export const DEFAULT_USER_EMOJI = '🙂';
    // Lista corta de emojis para el selector visual (ver renderEmojiPicker). El primero ('') es la
    // opción "Sin emoji" — un botón de limpiar, no un emoji real, para poder quitar el emoji sin
    // tener que vaciar el campo de texto a mano.
    export const EMOJI_CHOICES = ['', '🙂', '😄', '😎', '🤩', '🥳', '😴', '☕', '🔥', '💪', '🚀', '⭐', '🎯', '⚡', '🌟', '🙌', '👋', '🐱', '🌮', '🎧'];
    const DEFAULT_GOAL_MINUTES = 360;
    const DEFAULT_GOAL_DOLLARS = Number((DEFAULT_GOAL_MINUTES * RATE).toFixed(2));
    // Tope duro de duración para una sola llamada (pegada, editada o agregada a mano) — sin esto,
    // un valor como "1e10" o negativo pasa el chequeo de Number.isFinite y genera un endISO absurdo
    // (años en el futuro/pasado) que rompe callsOverlap para el resto de llamadas.
    export const MAX_CALL_DURATION_MIN = 1440;

    // Higher Rate Opportunity ---- Propio manda avisos por correo con una fecha y una o más
    // ventanas horarias donde aplica un bono sobre la tasa por minuto.
    export const HIGHER_RATE_TIERS = {
      bronze: { label: translateText('Bronce'), bonusPerMin: 0.01, colorVar: '--tier-bronze', colorRgb: '181,101,29' },
      silver: { label: translateText('Silver'), bonusPerMin: 0.02, colorVar: '--tier-silver', colorRgb: '167,177,187' },
      gold: { label: translateText('Gold'), bonusPerMin: 0.03, colorVar: '--tier-gold', colorRgb: '234,179,8' },
    };
    // Una llamada iniciada hasta 5 min antes de que empiece la ventana también cuenta.
    export const HIGHER_RATE_EARLY_GRACE_MIN = 5;

    // Página "Finanzas" ---- Categorías fijas, mismo patrón que HIGHER_RATE_TIERS — no viven en
    // settings, solo sus filas (ver settings.financeCategories).
    const RATE_TILE_DEFS = [
      { key: 'normal', label: translateText('Normal'), icon: iconHtml('circle'), bonus: 0 },
      { key: 'bronze', label: translateText('Bronce'), icon: iconHtml('medal'), bonus: HIGHER_RATE_TIERS.bronze.bonusPerMin },
      { key: 'silver', label: translateText('Silver'), icon: iconHtml('medal'), bonus: HIGHER_RATE_TIERS.silver.bonusPerMin },
      { key: 'gold', label: translateText('Gold'), icon: iconHtml('medal'), bonus: HIGHER_RATE_TIERS.gold.bonusPerMin },
    ];

    // $/min de un tile: tasa base de settings.rate + el bono fijo del nivel.
    export function rateTilePerMin(tileKey) {
      const baseRate = Number(settings.rate) > 0 ? Number(settings.rate) : RATE;
      const def = RATE_TILE_DEFS.find(t => t.key === tileKey);
      return baseRate + (def ? def.bonus : 0);
    }

    // Pinta los 4 tiles dentro de `containerId`, marcando `selectedKey` como activo. Se recalculan
    // los montos en cada llamada (no se cachean) para reflejar siempre la tasa base actual de
    // settings.rate.
    export function renderRateTiles(containerId, selectedKey) {
      const el = document.getElementById(containerId);
      if (!el) return;
      el.innerHTML = RATE_TILE_DEFS.map(t => {
        const rate = rateTilePerMin(t.key);
        return ui`
          <button type="button" class="rate-tile ${t.key === selectedKey ? 'selected' : ''}" data-rate-tile="${t.key}">
            <span class="rate-tile-top"><span class="rate-tile-icon" data-tier="${t.key}">${t.icon}</span><span class="rate-tile-amount">$${rate.toFixed(2)}/min</span></span>
            <span class="rate-tile-label">${t.label}</span>
          </button>
        `;
      }).join('');
    }

    // Horario semanal (plantilla planeada, editable por día)
    export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const WEEKDAY_JS_INDEX = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
    export const WEEKDAY_LABELS = { mon: translateText('Lunes'), tue: translateText('Martes'), wed: translateText('Miércoles'), thu: translateText('Jueves'), fri: translateText('Viernes'), sat: translateText('Sábado'), sun: translateText('Domingo') };
    export const WEEKDAY_LABELS_SHORT = { mon: translateText('Lun'), tue: translateText('Mar'), wed: translateText('Mié'), thu: translateText('Jue'), fri: translateText('Vie'), sat: translateText('Sáb'), sun: translateText('Dom') };

    // Todo vive en `blocks[]`: cada bloque es {type, start, dur} y Trabajo lleva además goalMin.
    export function defaultDaySchedule(isWorkDay) {
      return {
        off: !isWorkDay,
        start: '06:00',
        end: '14:00',
        blocks: [
          { type: 'work', start: '06:00', dur: 130, goalMin: 120 },
          { type: 'break', start: '08:10', dur: 20 },
          { type: 'work', start: '08:30', dur: 130, goalMin: 120 },
          { type: 'break', start: '10:40', dur: 20 },
          { type: 'work', start: '11:00', dur: 65, goalMin: 60 },
          { type: 'lunch', start: '12:05', dur: 50 },
          { type: 'work', start: '12:55', dur: 65, goalMin: 60 },
        ],
      };
    }

    function defaultWeeklySchedule() {
      return {
        mon: defaultDaySchedule(true),
        tue: defaultDaySchedule(true),
        wed: defaultDaySchedule(true),
        thu: defaultDaySchedule(true),
        fri: defaultDaySchedule(true),
        sat: defaultDaySchedule(false),
        sun: defaultDaySchedule(false),
      };
    }

    // Migración: días guardados en el formato viejo (breaks[]/lunch{}, de antes de unificar todo en
    // blocks[]) pasan al nuevo modelo la primera vez que se cargan.
    function migrateDayConfigToBlocks(dayCfg) {
      if (!dayCfg || typeof dayCfg !== 'object') return dayCfg;
      if (Array.isArray(dayCfg.blocks)) return dayCfg;
      const legacyBreaks = Array.isArray(dayCfg.breaks) ? dayCfg.breaks : [];
      const legacyLunch = dayCfg.lunch;
      const blocks = [];
      legacyBreaks.forEach(b => {
        if (b && b.start && Number(b.dur) > 0) blocks.push({ type: 'break', start: formatHHMM(b.start), dur: Number(b.dur) });
      });
      if (legacyLunch && legacyLunch.start && Number(legacyLunch.dur) > 0) {
        blocks.push({ type: 'lunch', start: formatHHMM(legacyLunch.start), dur: Number(legacyLunch.dur) });
      }
      if (!dayCfg.off && dayCfg.start && dayCfg.end) {
        const sortedNonWork = [...blocks].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
        let cursor = toMinutes(formatHHMM(dayCfg.start));
        const endMin = toMinutes(formatHHMM(dayCfg.end));
        sortedNonWork.forEach(b => {
          const s = toMinutes(b.start);
          if (s > cursor) blocks.push({ type: 'work', start: minutesToHHMM(cursor), dur: s - cursor });
          cursor = Math.max(cursor, s + b.dur);
        });
        if (endMin > cursor) blocks.push({ type: 'work', start: minutesToHHMM(cursor), dur: endMin - cursor });
      }
      return { off: !!dayCfg.off, start: dayCfg.start, end: dayCfg.end, blocks };
    }

    // Reemplazar el ratio global de "Margen" por una Meta de Productividad en minutos CONFIGURABLE
    // POR BLOQUE de Trabajo. Migración: un bloque de Trabajo guardado ANTES de este cambio no tiene
    // `goalMin`.
    function ensureBlockProductivityGoals(dayCfg) {
      if (!dayCfg || !Array.isArray(dayCfg.blocks)) return dayCfg;
      dayCfg.blocks = dayCfg.blocks.map(b => {
        if (!b) return b;
        const type = String(b.type || '').toLowerCase();
        if (type !== 'work') {
          if (Object.prototype.hasOwnProperty.call(b, 'goalMin')) {
            const { goalMin, ...rest } = b;
            return rest;
          }
          return b;
        }
        const dur = Number(b.dur) || 0;
        const goalMin = Number(b.goalMin);
        // `goalMin > 0` trataba un 0 configurado A PROPÓSITO (para desactivar la meta de ese
        // bloque) igual que "sin valor"
        if (Number.isFinite(goalMin) && goalMin >= 0) return b;
        return { ...b, goalMin: dur };
      });
      return dayCfg;
    }

    export function ensureWeeklySchedule() {
      if (!settings.weeklySchedule || typeof settings.weeklySchedule !== 'object') {
        // Migración: si ya tenías un shiftStart/shiftEnd guardado, úsalo como base de lunes a
        // viernes en vez de perder tu configuración anterior.
        const legacyStart = settings.shiftStart ? formatHHMM(settings.shiftStart) : '07:00';
        const legacyEnd = settings.shiftEnd ? formatHHMM(settings.shiftEnd) : '16:00';
        settings.weeklySchedule = defaultWeeklySchedule();
        WEEKDAYS.forEach(k => {
          if (!settings.weeklySchedule[k].off) {
            settings.weeklySchedule[k].start = legacyStart;
            settings.weeklySchedule[k].end = legacyEnd;
          }
        });
      }
      WEEKDAYS.forEach(k => { if (!settings.weeklySchedule[k]) settings.weeklySchedule[k] = defaultDaySchedule(k !== 'sat' && k !== 'sun'); });
      WEEKDAYS.forEach(k => { settings.weeklySchedule[k] = migrateDayConfigToBlocks(settings.weeklySchedule[k]); });
      WEEKDAYS.forEach(k => { settings.weeklySchedule[k] = ensureBlockProductivityGoals(settings.weeklySchedule[k]); });
      if (!settings.lateArrivalMode) settings.lateArrivalMode = 'anchor';
    }

    export function weekdayKeyForDayKey(dayKey) {
      const d = callDateToDate(dayKey) || new Date();
      const idx = d.getDay();
      return Object.keys(WEEKDAY_JS_INDEX).find(k => WEEKDAY_JS_INDEX[k] === idx) || 'mon';
    }

    // Overrides puntuales por semana, anclados al mismo inicio de semana de 7 días que usa "Resumen
    // semanal" (startOfCycleWeek).
    export function weekStartKeyFromDate(date) {
      const d = startOfCycleWeek(date);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }

    function weekStartKeyForDayKey(dayKey) {
      const d = callDateToDate(dayKey) || new Date();
      return weekStartKeyFromDate(d);
    }

    // Una semana queda protegida (solo lectura) una vez que TERMINÓ por completo — no basta con que
    // ya haya empezado. La semana actual (la que contiene "hoy") sigue editable hasta que pase su
    // último día.
    export function isScheduleWeekPast(weekStartDate) {
      const weekEnd = new Date(weekStartDate.getFullYear(), weekStartDate.getMonth(), weekStartDate.getDate() + 6);
      return weekEnd < todayRange();
    }

    function baseDayConfigFor(dayKey) {
      ensureWeeklySchedule();
      const wd = weekdayKeyForDayKey(dayKey);
      const weekKey = weekStartKeyForDayKey(dayKey);
      const overrideWeek = settings.scheduleOverridesByWeek && settings.scheduleOverridesByWeek[weekKey];
      if (overrideWeek && overrideWeek[wd]) return overrideWeek[wd];
      return settings.weeklySchedule[wd] || { off: true };
    }

    function clonePlanningValue(value) {
      try { return JSON.parse(JSON.stringify(value)); } catch { return value; }
    }

    function earliestTrackedPlanningDate() {
      const candidates = [];
      const addDayKey = (key) => {
        const d = callDateToDate(callDateKeyFromValue(key));
        if (d && Number.isFinite(d.getTime())) candidates.push(d);
      };
      calls.forEach(c => addDayKey(c.callDate));
      (state.events || []).forEach(e => {
        const d = new Date(e?.ts || 0);
        if (Number.isFinite(d.getTime())) candidates.push(todayRange(d));
      });
      (state.pauseHistory || []).forEach(p => {
        const d = new Date(p?.startedAt || 0);
        if (Number.isFinite(d.getTime())) candidates.push(todayRange(d));
      });
      Object.keys(state.game?.days || {}).forEach(addDayKey);
      Object.keys(state.dayNotes || {}).forEach(addDayKey);
      Object.keys(settings.dailyGoalOverrides || {}).forEach(addDayKey);
      if (!candidates.length) return null;
      return new Date(Math.min(...candidates.map(d => todayRange(d).getTime())));
    }

    export function snapshotHistoricalPlanning() {
      if (!settings.scheduleHistoryByDay || typeof settings.scheduleHistoryByDay !== 'object') settings.scheduleHistoryByDay = {};
      if (!settings.goalHistoryByDay || typeof settings.goalHistoryByDay !== 'object') settings.goalHistoryByDay = {};
      const start = earliestTrackedPlanningDate();
      const today = todayRange();
      if (!start || start >= today) return false;
      let changed = false;
      let cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      let guard = 0;
      while (cursor < today && guard++ < 5000) {
        const key = todayCallDateKey(cursor);
        if (!settings.scheduleHistoryByDay[key]) {
          settings.scheduleHistoryByDay[key] = clonePlanningValue(baseDayConfigFor(key));
          changed = true;
        }
        if (!settings.goalHistoryByDay[key]) {
          const override = getDailyGoalOverride(key);
          settings.goalHistoryByDay[key] = override
            ? { min: override.min, usd: override.usd }
            : { min: Number(settings.productiveGoalMin) || 0, usd: Number(settings.earningsGoal) || 0 };
          changed = true;
        }
        cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
      }
      return changed;
    }

    export function dayConfigFor(dayKey) {
      const normalized = callDateKeyFromValue(dayKey);
      const historical = normalized && settings.scheduleHistoryByDay && settings.scheduleHistoryByDay[normalized];
      if (historical && typeof historical === 'object') return historical;
      return baseDayConfigFor(dayKey);
    }

    // Un día "libre" del horario se sigue tratando como libre SALVO que haya actividad real ese día
    // (llamadas importadas o un turno real/estimado).
    export function dayIsEffectivelyOff(dayKey) {
      const forced = getDayNote(dayKey)?.forcedStatus;
      if (forced === 'work') return false;
      if (forced === 'off') return true;
      const cfg = dayConfigFor(dayKey);
      if (!cfg || !cfg.off) return false;
      return !dayShiftBounds(dayKey).start;
    }

    // Convierte la config de un día (inicio/fin + blocks[]) en una lista de slots Work/Break/Lunch,
    // SIEMPRE anclados al plan — no a la hora real en que empezaste.
    function buildPlannedSlots(dayConfig) {
      if (!dayConfig || dayConfig.off || !dayConfig.start || !dayConfig.end) return [];
      const rawBlocks = Array.isArray(dayConfig.blocks) ? dayConfig.blocks : [];
      const points = [];
      rawBlocks.forEach((b) => {
        if (!b || !b.start || !(Number(b.dur) > 0)) return;
        const type = String(b.type || '').toLowerCase();
        if (type !== 'break' && type !== 'lunch' && type !== 'work') return;
        points.push({ rawType: type, start: formatHHMM(b.start), dur: Number(b.dur), goalMin: b.goalMin });
      });
      // El nombre ("Break 1", "Lunch 2", "Bloque de Trabajo 3") se asigna DESPUÉS de ordenar
      // cronológicamente, no según el orden del arreglo.
      const anchor = toMinutes(formatHHMM(dayConfig.start));
      const offset = time => (toMinutes(time) - anchor + 1440) % 1440 + anchor;
      points.sort((a, b) => offset(a.start) - offset(b.start));

      let breakIdx = 1, lunchIdx = 1, workIdx = 1;
      const toHHMM = (mins) => { const m = ((mins % 1440) + 1440) % 1440; return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; };

      return points.map(p => {
        const pStart = offset(p.start);
        let type, name;
        if (p.rawType === 'break') { type = 'Break'; name = `Break ${breakIdx++}`; }
        else if (p.rawType === 'lunch') { type = 'Lunch'; name = `Lunch ${lunchIdx++}`; }
        else { type = 'Work'; name = ui`Bloque de Trabajo ${workIdx++}`; }
        const slot = { type, name, start: toHHMM(pStart), end: toHHMM(pStart + p.dur), startMin: pStart, endMin: pStart + p.dur };
        // Meta de Productividad configurable POR BLOQUE (minutos productivos que ese bloque de
        // Trabajo debe alcanzar, reemplaza al viejo ratio global de "Margen"). Solo los bloques de
        // Work la llevan.
        if (type === 'Work') slot.goalMin = Number(p.goalMin) || 0;
        return slot;
      });
    }

    function defaultState() {
      return {
        shiftStartedAt: null,
        shiftEndedAt: null,
        activePause: null,
        // Llamada en curso desde el botón "Iniciar llamada" (ver toggleCall).
        activeCall: null,
        // Respaldo persistente de una llamada ya colgada cuyo auto-guardado falló. Así un refresh
        // mientras está abierto "Guardar llamada" no puede borrar ese tiempo.
        pendingLiveCallBackup: null,
        // Momento en que colgaste tu última llamada, aunque todavía no la hayas confirmado/guardado
        // en el modal "Guardar llamada".
        lastCallEndedAt: null,
        pauseHistory: [],
        events: [],
        activeDayKey: null,
        gapAnnotations: {},
        // Notas por día (Resumen semanal → "Editar"): categoría (sick, día festivo, power outage,
        // etc.) + comentario libre, para dejar registro de por qué un día se vio distinto de lo
        // normal. Es solo informativo.
        dayNotes: {},
        // Interrupciones ACCIDENTALES de un turno/Break/Lunch.
        dayInterruptions: {},
        productiveGoalMin: 59,
        earningsGoal: 7.08,
        // Qué día de calendario real ("hoy") conocía la app la última vez que se revisó (al cargar
        // la página o en cada tick del reloj).
        lastCalendarDay: null,
        game: createDefaultGameState(),
      };
    }

    const expectedAppOwner = window[Symbol.for('propio.expectedAppOwner')];
    function verifyAppOwner() {
      if (expectedAppOwner !== undefined && readMeta().userId !== expectedAppOwner) throw new Error('APP_OWNER_CHANGED');
    }
    verifyAppOwner();
    setAppState(loadState());
    setAppCalls(loadCalls());
    export function setCalls(value) { setAppCalls(value); }
    setAppSettings(loadSettings());
    verifyAppOwner();
    const localStorageRevision = createStorageRevisionGuard(localStorage, [STORAGE_KEY, CALLS_KEY, SETTINGS_KEY]);
    ensureCurrencySettings();
    translateDocument();
    applyTheme();
    wireAppearance({ getSettings: () => settings, save: saveSettingsOnly, applyTheme });
    wireSettingsLanguage({ getSettings: () => settings, save: saveSettingsOnly });
    // La hora es clickeable — al tocarla se oculta (muestra un placeholder enmascarado en vez del
    // valor real) y al volver a tocarla se muestra de nuevo. Visible por defecto. Vive en memoria,
    // no en localStorage.
    let clockTimeVisible = true;

    // Toma un objeto de "state" crudo (de localStorage o de un archivo JSON importado) y aplica el
    // mismo merge + migración de ids que ya hacía loadState en línea.
    function normalizeStateObject(parsed) {
      const src = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
      const merged = {
        ...defaultState(),
        ...src,
        pauseHistory: Array.isArray(src.pauseHistory) ? src.pauseHistory : [],
        events: Array.isArray(src.events) ? src.events : [],
        gapAnnotations: src.gapAnnotations && typeof src.gapAnnotations === 'object' ? src.gapAnnotations : {},
        dayNotes: src.dayNotes && typeof src.dayNotes === 'object' && !Array.isArray(src.dayNotes) ? src.dayNotes : {},
        dayInterruptions: src.dayInterruptions && typeof src.dayInterruptions === 'object' && !Array.isArray(src.dayInterruptions) ? src.dayInterruptions : {},
        game: normalizeGameState(src.game),
        activeDayKey: src.activeDayKey ? String(src.activeDayKey) : null,
        pendingLiveCallBackup: src.pendingLiveCallBackup && typeof src.pendingLiveCallBackup === 'object' && !Array.isArray(src.pendingLiveCallBackup)
          ? src.pendingLiveCallBackup
          : null,
      };
      merged.events = merged.events.map(e => (e && !e.id) ? { ...e, id: makeLocalId() } : e);
      merged.pauseHistory = merged.pauseHistory.map(p => (p && !p.id) ? { ...p, id: makeLocalId() } : p);
      return merged;
    }

    // Mismo patrón que normalizeStateObject: asigna un id estable a cualquier llamada que no lo
    // traiga, reutilizado por loadCalls y por "Importar JSON".
    function normalizeCallsArray(parsed) {
      const src = Array.isArray(parsed) ? parsed : [];
      return src.map(c => {
        const next = { ...c, importedAt: c.importedAt || null };
        if (!next.id) next.id = makeLocalId();
        return next;
      });
    }

    function loadState() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaultState();
        const parsed = JSON.parse(raw);
        const merged = normalizeStateObject(parsed);
        // Migración: los eventos y pausas guardados antes de que existiera el sistema de IDs no
        // tienen 'id'. Su botón de borrar comparaba contra '' y como ningún registro viejo tiene id
        // === '', el filtro no quitaba nada.
        const hadMissingIds = (Array.isArray(parsed.events) && parsed.events.some(e => e && !e.id))
          || (Array.isArray(parsed.pauseHistory) && parsed.pauseHistory.some(p => p && !p.id));
        if (hadMissingIds) {
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch {}
        }
        return merged;
      } catch {
        return defaultState();
      }
    }

    function loadCalls() {
      try {
        const raw = localStorage.getItem(CALLS_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed)) return [];
        // Migración: llamadas guardadas antes de que existiera un 'id' propio se identificaban por
        // una combinación de sus propios datos (fecha + hora + duración + pago).
        const withIds = normalizeCallsArray(parsed);
        const hadMissingIds = parsed.some(c => c && !c.id);
        if (hadMissingIds) {
          try { localStorage.setItem(CALLS_KEY, JSON.stringify(withIds)); } catch {}
        }
        return withIds;
      } catch {
        return [];
      }
    }

    function defaultSettings() {
      return {
        productiveGoalMin: DEFAULT_GOAL_MINUTES,
        earningsGoal: DEFAULT_GOAL_DOLLARS,
        shiftStart: '06:00',
        shiftEnd: '14:00',
        lateArrivalMode: 'anchor', // 'anchor' = la hora de fin no se mueve (pierdes el tiempo) | 'shift' = se corre todo el turno.
        weeklySchedule: defaultWeeklySchedule(),
        // Horario real por SEMANA ESPECÍFICA (con su propia fecha de inicio), aparte de la
        // plantilla recurrente de arriba (weeklySchedule). La plantilla sigue siendo el default.
        scheduleOverridesByWeek: {},
        userName: '',
        // Emoji opcional que se muestra junto al nombre en el saludo (ver greetingText), editable
        // en Metas junto con "Tu nombre".
        userEmoji: DEFAULT_USER_EMOJI,
        // La primera vez que alguien nuevo abre la app (localStorage completamente vacío, sin
        // settings ni estado viejo) debe salir un popup pidiendo su nombre (y emoji) UNA SOLA VEZ.
        onboarded: false,
        // La tasa por minuto ($0.12) ya no es fija en el código — se vuelve editable en Metas (ver
        // rateInput).
        rate: RATE,
        // Conversión de moneda secundaria (ej. Lempiras): símbolo/código libre + tasa de cambio
        // (unidades de esa moneda por $1), ambos editables en Metas.
        currencyLabel: 'L',
        exchangeRate: 26.80,
        earningsPreferSecondary: false,
        cycleAnchorDate: '2025-05-03',
        cyclePayOffsetDays: 5,
        // Aviso con sonido X minutos antes de la hora de inicio planeada de hoy, si todavía no
        // diste click en "Iniciar shift". Editable en Horario, global (no por día) — 0 lo
        // desactiva.
        alertBeforeShiftMin: 2,
        // Mismo tipo de aviso (toast + alarma) pero para Break/Lunch, con dos números
        // INDEPENDIENTES entre sí y del aviso de turno.
        alertBeforeBreakMin: 2,
        alertBeforeBreakEndMin: 2,
        shiftAlarmSound: 'classic',
        shiftAlarmCustomSoundDataUrl: '',
        shiftAlarmCustomSoundName: '',
        shiftAlarmMessage: '🔔 ¡Conéctate ya! Tu turno empieza a las {hora}',
        breakStartAlarmSound: 'classic',
        breakStartAlarmCustomSoundDataUrl: '',
        breakStartAlarmCustomSoundName: '',
        breakStartAlarmMessage: '🔔 Tu {tipo} empieza a las {hora}',
        breakEndAlarmSound: 'classic',
        breakEndAlarmCustomSoundDataUrl: '',
        breakEndAlarmCustomSoundName: '',
        breakEndAlarmMessage: '⏰ Tu {tipo} termina pronto ({hora})',
        callEndedSoundEnabled: false,
        callEndedAlarmSound: 'classic',
        callEndedAlarmCustomSoundDataUrl: '',
        callEndedAlarmCustomSoundName: '',
        callPastedSoundEnabled: false,
        callPastedAlarmSound: 'classic',
        callPastedAlarmCustomSoundDataUrl: '',
        callPastedAlarmCustomSoundName: '',
        callManualSoundEnabled: false,
        callManualAlarmSound: 'classic',
        callManualAlarmCustomSoundDataUrl: '',
        callManualAlarmCustomSoundName: '',
        // Adherencia estilo Calabrio (minuto a minuto, ver computeMinuteAdherence) con ventana de
        // gracia configurable alrededor de cada transición planeada (inicio/fin de Trabajo/
        // Break/Lunch).
        adherenceGraceMin: 3,
        // Meta de Adherencia en % (como ya existen Meta en minutos/dólares/moneda), editable en
        // Horario junto a la ventana de gracia. Default 95 — umbral típico de un WFM real.
        adherenceGoalPct: 95,
        // La tarjeta de ACW en "Turno de Hoy" se llena contra esta meta máxima (editable con el ✎
        // de la tarjeta, ver #acwGoalModal) en vez de contra la duración total del turno. Default
        // 60 min.
        acwMaxGoalMin: 60,
        // Aviso (toast + sonido) al completar N minutos productivos acumulados desde tu última
        // pausa (o desde el inicio del turno si no has tomado ninguna hoy) — avisa que ya tienes
        // derecho a M minutos de descanso.
        productiveBreakEarnMin: 30,
        productiveBreakAwardMin: 5,
        // Mensaje editable también para este aviso — dos plantillas independientes (primera vez del
        // turno / repeticiones siguientes, ver checkProductiveBreakEarnedAlarm) con variables
        // `{productivo}`/`{descanso}`.
        productiveBreakMessageFirst: '☕ ¡Ganaste un descanso! {productivo} min productivos — tienes derecho a {descanso} min.',
        productiveBreakMessageRepeat: '☕ ¡Otro descanso ganado! {productivo} min productivos — llevas {descanso} min de descanso acumulados.',
        // Sonido del aviso: 'classic'/'chime' son tonos sintetizados con Web Audio; 'custom' usa el
        // audio subido por el usuario, guardado como Data URL.
        productiveBreakSound: 'classic',
        productiveBreakCustomSoundDataUrl: '',
        productiveBreakCustomSoundName: '',
        // Higher Rate Opportunity — ventanas configuradas a mano (fecha + hora + nivel), ver
        // HIGHER_RATE_TIERS arriba. Global, no por día de la semana (cada ventana ya trae su propia
        // fecha).
        higherRateWindows: [],
        // Modo claro/oscuro — 'auto' (default) sigue el sistema operativo (prefers-color-scheme);
        // 'light'/'dark' fuerzan el tema sin importar el sistema. Ver applyTheme/themeToggleBtn.
        theme: 'auto',
        palette: 'original',
        language: 'en',
        // Volumen maestro (0-100) que escala TODOS los sonidos del programa desde un solo lugar.
        masterVolume: 100,
        // Estado abierto/cerrado de cada <details> con id propio, para que sobreviva a la recarga.
        accordionState: {},
        // En escritorio el sidebar arranca fijado por defecto.
        sidebarPinned: true,
        // Toggle "Contraer bloques al terminar" dentro de "Bloques del día" (ver
        // #collapseCompletedBlocksBtn)
        collapseCompletedBlocks: false,
        weekSummaryTipDismissed: false,
        // Un día libre/sin turno puede cortar la racha o simplemente saltarse, a elección del
        // usuario.
        streakSkipOffDays: true,
        // Meta del ciclo editable (✎ en Reportes o Ajustes → Ciclo de pago); vacía = cálculo
        // automático.
        cycleGoalOverrides: {},
        // Meta anual del Calendario de productividad (vista anual) — mismo patrón que
        // cycleGoalOverrides de arriba, aquí con clave = año ("YYYY") en vez de fecha de ciclo.
        yearGoalOverrides: {},
        // Meta diaria "solo para este día" — clave = dayKey "MM/DD/YYYY", valor { min, usd }. Vacío
        // = se usa la meta general de arriba.
        dailyGoalOverrides: {},
        // Fecha desde la que "empieza" el historial para la vista anual (mes de arranque del año
        // que la contiene + piso de autoCalYearGoal) — vacío = automático (la llamada más antigua
        // en `calls`, ver effectiveHistoryStartDate).
        historyStartDateOverride: '',
        // Página "Finanzas" — categorías fijas (ver FINANCE_CATEGORIES), cada una con sus propias
        // filas de gasto/meta.
        financeCategories: { casa: { rows: [] }, servicios: { rows: [] }, transporte: { rows: [] }, comida: { rows: [] }, deuda: { rows: [] }, ahorro: { rows: [] }, otro: { rows: [] } },
        // Categorías propias creadas desde "+ Nueva categoría" (modal Agregar gasto/meta). Cada una:
        // { id, label, emoji, rgb }. Se combinan con FINANCE_CATEGORIES al armar la grilla — ver
        // financeAllCategories/financeCategoryDef.
        customFinanceCategories: [],
        // Reparte el Disponible SOLO (Gastos primero, luego Metas, ambos en su propio orden de
        // prioridad) cada vez que se guarda una llamada, en vez de exigir "Aplicar" manual en cada
        // fila.
        financeAutoFill: false,
        game: { enabled: false, intensity: 'arcade', soundEnabled: true, soundVolume: 40 },
      };
    }

    // Una fecha sin ceros a la izquierda ("1/5/2026", "2026-1-5") es válida pero no matchea los
    // regex de validación: se acolcha antes de validarla.
    function normalizeSlashDate(value) {
      const raw = String(value ?? '').trim();
      const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (!match) return raw;
      return `${pad(Number(match[1]))}/${pad(Number(match[2]))}/${match[3]}`;
    }

    function normalizeIsoDateKey(value) {
      const raw = String(value ?? '').trim();
      const match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (!match) return raw;
      return `${match[1]}-${pad(Number(match[2]))}-${pad(Number(match[3]))}`;
    }

    // Parche de compatibilidad para settings guardados antes de que existieran
    // rate/currencyLabel/exchangeRate/cycleAnchorDate/ cyclePayOffsetDays (mismo patrón que
    // ensureWeeklySchedule ya usa).
    export function ensureCurrencySettings() {
      const fallback = defaultSettings();
      if (!['en', 'es'].includes(settings.language)) settings.language = fallback.language;
      if (!Number.isFinite(Number(settings.rate)) || Number(settings.rate) <= 0) settings.rate = fallback.rate;
      if (!Number.isFinite(Number(settings.exchangeRate)) || Number(settings.exchangeRate) < 0 || !Number.isFinite(Number(settings.exchangeRate) * 1e9)) settings.exchangeRate = fallback.exchangeRate;
      if (typeof settings.currencyLabel !== 'string') settings.currencyLabel = fallback.currencyLabel;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(settings.cycleAnchorDate || ''))) settings.cycleAnchorDate = fallback.cycleAnchorDate;
      if (!Number.isFinite(Number(settings.cyclePayOffsetDays)) || Number(settings.cyclePayOffsetDays) < 0) settings.cyclePayOffsetDays = fallback.cyclePayOffsetDays;
      if (!Number.isFinite(Number(settings.alertBeforeShiftMin)) || Number(settings.alertBeforeShiftMin) < 0) settings.alertBeforeShiftMin = fallback.alertBeforeShiftMin;
      if (!Number.isFinite(Number(settings.alertBeforeBreakMin)) || Number(settings.alertBeforeBreakMin) < 0) settings.alertBeforeBreakMin = fallback.alertBeforeBreakMin;
      if (!Number.isFinite(Number(settings.alertBeforeBreakEndMin)) || Number(settings.alertBeforeBreakEndMin) < 0) settings.alertBeforeBreakEndMin = fallback.alertBeforeBreakEndMin;
      if (!Number.isFinite(Number(settings.adherenceGraceMin)) || Number(settings.adherenceGraceMin) < 0) settings.adherenceGraceMin = fallback.adherenceGraceMin;
      if (!Number.isFinite(Number(settings.adherenceGoalPct)) || Number(settings.adherenceGoalPct) <= 0 || Number(settings.adherenceGoalPct) > 100) settings.adherenceGoalPct = fallback.adherenceGoalPct;
      if (!Number.isFinite(Number(settings.acwMaxGoalMin)) || Number(settings.acwMaxGoalMin) <= 0) settings.acwMaxGoalMin = fallback.acwMaxGoalMin;
      if (!['auto', 'light', 'dark'].includes(settings.theme)) settings.theme = fallback.theme;
      if (!Number.isFinite(Number(settings.masterVolume)) || Number(settings.masterVolume) < 0 || Number(settings.masterVolume) > 100) settings.masterVolume = fallback.masterVolume;
      if (!settings.accordionState || typeof settings.accordionState !== 'object' || Array.isArray(settings.accordionState)) settings.accordionState = {};
      if (typeof settings.sidebarPinned !== 'boolean') settings.sidebarPinned = true;
      if (typeof settings.collapseCompletedBlocks !== 'boolean') settings.collapseCompletedBlocks = false;
      if (typeof settings.weekSummaryTipDismissed !== 'boolean') settings.weekSummaryTipDismissed = false;
      if (typeof settings.streakSkipOffDays !== 'boolean') settings.streakSkipOffDays = true;
      if (!Number.isFinite(Number(settings.productiveBreakEarnMin)) || Number(settings.productiveBreakEarnMin) <= 0) settings.productiveBreakEarnMin = fallback.productiveBreakEarnMin;
      if (!Number.isFinite(Number(settings.productiveBreakAwardMin)) || Number(settings.productiveBreakAwardMin) < 0) settings.productiveBreakAwardMin = fallback.productiveBreakAwardMin;
      if (!['classic', 'chime', 'custom'].includes(settings.productiveBreakSound)) settings.productiveBreakSound = fallback.productiveBreakSound;
      if (typeof settings.productiveBreakCustomSoundDataUrl !== 'string') settings.productiveBreakCustomSoundDataUrl = fallback.productiveBreakCustomSoundDataUrl;
      if (typeof settings.productiveBreakCustomSoundName !== 'string') settings.productiveBreakCustomSoundName = fallback.productiveBreakCustomSoundName;
      // Si quedó en 'custom' pero sin ningún sonido guardado (ej. se borró a mano el localStorage
      // parcialmente), cae de vuelta a 'classic'.
      if (settings.productiveBreakSound === 'custom' && !settings.productiveBreakCustomSoundDataUrl) settings.productiveBreakSound = 'classic';
      if (typeof settings.productiveBreakMessageFirst !== 'string' || !settings.productiveBreakMessageFirst.trim()) settings.productiveBreakMessageFirst = fallback.productiveBreakMessageFirst;
      if (typeof settings.productiveBreakMessageRepeat !== 'string' || !settings.productiveBreakMessageRepeat.trim()) settings.productiveBreakMessageRepeat = fallback.productiveBreakMessageRepeat;
      // Mismo tratamiento defensivo que productiveBreak* de arriba, replicado para los 3 avisos de
      // turno/Break/Lunch.
      ['shift', 'breakStart', 'breakEnd'].forEach((kind) => {
        const soundKey = `${kind}AlarmSound`;
        const urlKey = `${kind}AlarmCustomSoundDataUrl`;
        const nameKey = `${kind}AlarmCustomSoundName`;
        const msgKey = `${kind}AlarmMessage`;
        if (!['classic', 'chime', 'custom'].includes(settings[soundKey])) settings[soundKey] = fallback[soundKey];
        if (typeof settings[urlKey] !== 'string') settings[urlKey] = fallback[urlKey];
        if (typeof settings[nameKey] !== 'string') settings[nameKey] = fallback[nameKey];
        if (settings[soundKey] === 'custom' && !settings[urlKey]) settings[soundKey] = 'classic';
        if (typeof settings[msgKey] !== 'string' || !settings[msgKey].trim()) settings[msgKey] = fallback[msgKey];
      });
      ['callEnded', 'callPasted', 'callManual'].forEach(kind => {
        const soundKey = `${kind}AlarmSound`, urlKey = `${kind}AlarmCustomSoundDataUrl`, nameKey = `${kind}AlarmCustomSoundName`;
        if (typeof settings[`${kind}SoundEnabled`] !== 'boolean') settings[`${kind}SoundEnabled`] = false;
        if (!['classic','chime','custom'].includes(settings[soundKey])) settings[soundKey] = 'classic';
        if (typeof settings[urlKey] !== 'string' || settings[urlKey].length > 411000 || (settings[urlKey] && !/^data:audio\/[^;,]+;base64,[A-Za-z0-9+/]+={0,2}$/.test(settings[urlKey]))) settings[urlKey] = '';
        if (typeof settings[nameKey] !== 'string') settings[nameKey] = '';
        if (settings[soundKey] === 'custom' && !settings[urlKey]) settings[soundKey] = 'classic';
      });
      // Se descarta cualquier ventana mal formada (sin fecha/horario válido o nivel desconocido).
      if (!settings.scheduleOverridesByWeek || typeof settings.scheduleOverridesByWeek !== 'object' || Array.isArray(settings.scheduleOverridesByWeek)) {
        settings.scheduleOverridesByWeek = {};
      }
      // Se acolcha cada clave (ver normalizeIsoDateKey) ANTES de validar contra
      // /^\d{4}-\d{2}-\d{2}$/ — una clave como "2026-1-5" (válida, solo sin ceros) ya no se pierde
      // solo por eso.
      {
        const rawOverrides = settings.scheduleOverridesByWeek;
        const normalizedOverrides = {};
        let discardedWeekCount = 0;
        Object.keys(rawOverrides).forEach((weekKey) => {
          const normalizedKey = normalizeIsoDateKey(weekKey);
          const weekObj = rawOverrides[weekKey];
          if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedKey) || !weekObj || typeof weekObj !== 'object' || Array.isArray(weekObj)) {
            discardedWeekCount++;
            return;
          }
          WEEKDAYS.forEach((wd) => {
            if (!weekObj[wd]) return;
            weekObj[wd] = migrateDayConfigToBlocks(weekObj[wd]);
            weekObj[wd] = ensureBlockProductivityGoals(weekObj[wd]);
          });
          if (!normalizedOverrides[normalizedKey]) normalizedOverrides[normalizedKey] = weekObj;
        });
        settings.scheduleOverridesByWeek = normalizedOverrides;
        if (discardedWeekCount > 0) {
          toast(ui`⚠️ ${discardedWeekCount} semana(s) personalizada(s) de Horario con datos inválidos se descartaron al cargar.`);
        }
      }
      if (!settings.cycleGoalOverrides || typeof settings.cycleGoalOverrides !== 'object' || Array.isArray(settings.cycleGoalOverrides)) {
        settings.cycleGoalOverrides = {};
      }
      Object.keys(settings.cycleGoalOverrides).forEach((key) => {
        const val = Number(settings.cycleGoalOverrides[key]);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !Number.isFinite(val) || val <= 0) delete settings.cycleGoalOverrides[key];
        else settings.cycleGoalOverrides[key] = val;
      });
      // Mismo criterio defensivo que cycleGoalOverrides arriba, aquí con clave = año ("YYYY") en
      // vez de fecha de ciclo.
      if (!settings.yearGoalOverrides || typeof settings.yearGoalOverrides !== 'object' || Array.isArray(settings.yearGoalOverrides)) {
        settings.yearGoalOverrides = {};
      }
      Object.keys(settings.yearGoalOverrides).forEach((key) => {
        const val = Number(settings.yearGoalOverrides[key]);
        if (!/^\d{4}$/.test(key) || !Number.isFinite(val) || val <= 0) delete settings.yearGoalOverrides[key];
        else settings.yearGoalOverrides[key] = val;
      });
      if (!settings.dailyGoalOverrides || typeof settings.dailyGoalOverrides !== 'object' || Array.isArray(settings.dailyGoalOverrides)) {
        settings.dailyGoalOverrides = {};
      }
      Object.keys(settings.dailyGoalOverrides).forEach((key) => {
        const raw = settings.dailyGoalOverrides[key];
        const min = Number(raw && raw.min);
        const usd = Number(raw && raw.usd);
        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(key) || !Number.isFinite(min) || min < 0 || !Number.isFinite(usd) || usd < 0) {
          delete settings.dailyGoalOverrides[key];
        } else {
          settings.dailyGoalOverrides[key] = { min, usd };
        }
      });
      if (typeof settings.historyStartDateOverride !== 'string' || (settings.historyStartDateOverride && (!/^\d{4}-\d{2}-\d{2}$/.test(settings.historyStartDateOverride) || Number.isNaN(new Date(`${settings.historyStartDateOverride}T00:00:00`).getTime())))) {
        settings.historyStartDateOverride = '';
      }
      if (!Array.isArray(settings.higherRateWindows)) settings.higherRateWindows = [];
      // Se acolcha `w.date` (ver normalizeSlashDate) ANTES de validar contra
      // /^\d{2}\/\d{2}\/\d{4}$/ — una fecha como "1/5/2026" (válida, solo sin ceros) ya no se
      // pierde solo por eso.
      {
        const rawWindows = settings.higherRateWindows;
        const validWindows = [];
        let discardedWindowCount = 0;
        rawWindows.forEach(w => {
          const normalizedDate = w && typeof w === 'object' ? normalizeSlashDate(w.date) : '';
          if (!w || typeof w !== 'object' || !/^\d{2}\/\d{2}\/\d{4}$/.test(normalizedDate) || !HIGHER_RATE_TIERS[w.tier]) {
            discardedWindowCount++;
            return;
          }
          validWindows.push({
            id: w.id || makeLocalId(),
            date: normalizedDate,
            start: formatHHMM(w.start),
            end: formatHHMM(w.end),
            tier: w.tier,
          });
        });
        settings.higherRateWindows = validWindows;
        if (discardedWindowCount > 0) {
          toast(ui`⚠️ ${discardedWindowCount} ventana(s) de Higher Rate con datos inválidos se descartaron al cargar.`);
        }
      }
      // Categorías propias del usuario (ver PENDIENTES) — se descarta cualquier entrada mal
      // formada, mismo criterio defensivo que el resto de esta función.
      if (!Array.isArray(settings.customFinanceCategories)) settings.customFinanceCategories = [];
      settings.customFinanceCategories = settings.customFinanceCategories.filter(c =>
        c && typeof c === 'object' && String(c.id || '').trim() && String(c.label || '').trim()
      ).map(category => ({...category,id:String(category.id),label:String(category.label)}));
      const seenFinanceCategories = new Set(Object.keys(FINANCE_CATEGORIES));
      settings.customFinanceCategories = settings.customFinanceCategories.filter(category => {
        if (seenFinanceCategories.has(category.id) || ['__proto__','constructor','prototype'].includes(category.id)) return false;
        seenFinanceCategories.add(category.id); return true;
      });
      settings.customFinanceCategories.forEach((c) => {
        c.emoji = String(c.emoji || '').trim() || '🏷️';
        if (!FINANCE_CUSTOM_CATEGORY_PALETTE.includes(c.rgb)) c.rgb = FINANCE_CUSTOM_CATEGORY_PALETTE[0];
      });
      // Finanzas: se recrea cualquier categoría faltante/mal formada con { rows: [] }, y se
      // descarta cualquier row sin id/name/targetAmount numérico válido (mismo criterio defensivo
      // que cycleGoalOverrides/ higherRateWindows arriba). Incluye tanto las categorías fijas como
      // las propias del usuario.
      if (!settings.financeCategories || typeof settings.financeCategories !== 'object' || Array.isArray(settings.financeCategories)) {
        settings.financeCategories = {};
      }
      const allFinCategoryIds = [...new Set([...Object.keys(FINANCE_CATEGORIES), ...settings.customFinanceCategories.map(c => c.id), ...Object.keys(settings.financeCategories)])];
      allFinCategoryIds.forEach((catId) => {
        const cat = settings.financeCategories[catId];
        if (!cat || typeof cat !== 'object' || Array.isArray(cat) || !Array.isArray(cat.rows)) {
          settings.financeCategories[catId] = { rows: [] };
          return;
        }
        cat.rows = cat.rows.filter(r => r && typeof r === 'object' && String(r.id || '').trim() && String(r.name || '').trim() && Number.isFinite(Number(r.targetAmount)) && Number(r.targetAmount) >= 0);
        cat.rows.forEach(row => {
          row.id = String(row.id);
          row.name = String(row.name);
          row.categoryId = catId;
          const assigned = Number(row.assignedAmount);
          row.assignedAmount = Number.isFinite(assigned) && assigned >= 0 ? assigned : 0;
        });
      });
      if (typeof settings.financeAutoFill !== 'boolean') settings.financeAutoFill = false;
      if (!settings.game || typeof settings.game !== 'object' || Array.isArray(settings.game)) settings.game = { ...fallback.game };
      if (typeof settings.game.enabled !== 'boolean') settings.game.enabled = fallback.game.enabled;
      settings.game.intensity = 'arcade';
      settings.game.weapon = normalizeBattleWeapon(settings.game.weapon);
      if (typeof settings.game.soundEnabled !== 'boolean') settings.game.soundEnabled = true;
      const gameSoundVolume = Number(settings.game.soundVolume);
      settings.game.soundVolume = Number.isFinite(gameSoundVolume) ? Math.max(0, Math.min(100, gameSoundVolume)) : 40;
      // Cada cola (Gastos, Metas) queda con prioridades únicas 1..n, conservando el orden actual. El
      // "tipo" de cada fila (Gasto vs Meta) ya no se deduce de su categoría — una Meta puede tener
      // cualquier categoría desde que se permitió elegirla libremente — así que se decide por
      // financeRowIsMeta() (row.kind, con 'ahorro' como respaldo para filas viejas sin ese campo).
      const gastoQueue = [];
      const metaQueue = [];
      allFinCategoryIds.forEach(catId => {
        settings.financeCategories[catId].rows.forEach(r => (financeRowIsMeta(r) ? metaQueue : gastoQueue).push(r));
      });
      [gastoQueue, metaQueue].forEach(queue => {
        queue.map((r, i) => ({ r, i }))
          .sort((a, b) => ((Number(a.r.priority) || 0) - (Number(b.r.priority) || 0)) || (a.i - b.i))
          .forEach((x, idx) => { x.r.priority = idx + 1; });
      });
    }

    // 'auto' sigue el sistema vía @media (prefers-color-scheme); 'light'/'dark' fuerzan el tema con
    // html.theme-light/html.theme-dark.
    function applyTheme() {
      const root = document.documentElement;
      root.classList.remove('theme-light', 'theme-dark');
      if (settings.theme === 'light') root.classList.add('theme-light');
      else if (settings.theme === 'dark') root.classList.add('theme-dark');
      applyAppearance(settings);
      updateThemeButtonUI();
    }

    // Ciclo simple de 3 estados para el botón del header: auto -> light -> dark -> auto ->...
    function cycleTheme(current) {
      if (current === 'auto') return 'light';
      if (current === 'light') return 'dark';
      return 'auto';
    }

    function themeButtonLabel(theme) {
      if (theme === 'light') return translateText('☀️ Claro');
      if (theme === 'dark') return translateText('🌙 Oscuro');
      return '🌓 Auto';
    }

    // El switch "Modo oscuro" del sidebar necesita saber si el tema resultante es oscuro AHORA
    // MISMO.
    function isEffectivelyDark() {
      const root = document.documentElement;
      if (root.classList.contains('theme-light')) return false;
      if (root.classList.contains('theme-dark')) return true;
      return !(window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches);
    }

    function updateThemeButtonUI() {
      const sidebarSwitch = document.getElementById('sidebarDarkModeInput');
      if (sidebarSwitch) sidebarSwitch.checked = isEffectivelyDark();
    }

    function toggleTheme() {
      settings.theme = cycleTheme(settings.theme);
      if (saveSettingsOnly() === false) return false;
      applyTheme();
      toast(ui`Tema: ${themeButtonLabel(settings.theme)}`);
    }

    // Switch de Modo oscuro en el sidebar — mismo dato (settings.theme) que ya controla
    // `#themeToggleBtn`, pero como on/off simple en vez del ciclo de 3 estados (Auto/Claro/Oscuro).
    function setThemeFromSidebarSwitch(isDark) {
      settings.theme = isDark ? 'dark' : 'light';
      saveSettingsOnly();
      applyTheme();
    }

    // Cada <details> con id propio recupera aquí su estado guardado.
    function applyAccordionState() {
      const saved = settings.accordionState || {};
      document.querySelectorAll('details[id]').forEach(el => {
        if (Object.prototype.hasOwnProperty.call(saved, el.id)) {
          el.open = !!saved[el.id];
        }
      });
    }

    // Un solo listener por <details> (asignado una sola vez al cargar la página)
    function wireAccordionPersistence() {
      document.querySelectorAll('details[id]').forEach(el => {
        el.addEventListener('toggle', () => {
          if (!settings.accordionState || typeof settings.accordionState !== 'object') settings.accordionState = {};
          settings.accordionState[el.id] = el.open;
          saveSettingsOnly();
        });
      });
    }

    // Texto "≈ L 123.45" para mostrar el equivalente en la moneda secundaria junto a un monto en
    // dólares.
    export function usdCeilFromCurrencyAmount(currencyAmount, exchangeRate) {
      if (!Number.isFinite(currencyAmount) || !Number.isFinite(exchangeRate) || exchangeRate <= 0) return 0;
      return Math.ceil((currencyAmount / exchangeRate) * 100) / 100;
    }

    // Dirección inversa de usdCeilFromCurrencyAmount: convierte una META en dólares a la moneda
    // secundaria, redondeando SIEMPRE hacia arriba — para que la meta mostrada/editada en esa
    // moneda nunca se vea más floja que la meta real en dólares.
    export function currencyCeilFromUsdAmount(usdAmount, exchangeRate) {
      if (!Number.isFinite(usdAmount) || !Number.isFinite(exchangeRate) || exchangeRate <= 0) return 0;
      return Math.ceil(usdAmount * exchangeRate * 100) / 100;
    }

    export function convertedAmountText(usdAmount) {
      const rate = Number(settings.exchangeRate);
      const label = String(settings.currencyLabel || '').trim();
      if (!Number.isFinite(rate) || rate <= 0 || !label) return '';
      const converted = (Number.isFinite(usdAmount) ? usdAmount : 0) * rate;
      if (!Number.isFinite(converted)) return `≈ ${label} —`;
      // Redondeado a unidades enteras: el monto real vive en dólares, y convertirlo de vuelta con 2
      // decimales expone un desfase de centavos que confunde sin aportar nada.
      return `≈ ${label} ${Math.round(converted)}`;
    }

    function renderEarningsCurrency(valueId, convertedId, usdAmount) {
      const value = document.getElementById(valueId), other = document.getElementById(convertedId);
      if (!value) return;
      const converted = convertedAmountText(usdAmount);
      const canSwitch = !!converted && !converted.endsWith('—');
      const secondary = canSwitch && settings.earningsPreferSecondary === true;
      value.textContent = secondary ? converted.replace(/^≈\s*/, '') : money(usdAmount);
      if (other) other.textContent = secondary ? `≈ ${money(usdAmount)}` : converted;
      const control = value.closest('[data-earnings-currency]');
      if (!control) return;
      const label = secondary ? translateText('Mostrar dólares como moneda principal') : ui`Mostrar ${String(settings.currencyLabel || '').trim()} como moneda principal`;
      control.setAttribute('aria-label', label);
      control.setAttribute('title', canSwitch ? label : translateText('Configura tu moneda secundaria en Metas para intercambiarla'));
      control.setAttribute('aria-disabled', String(!canSwitch));
      control.tabIndex = canSwitch ? 0 : -1;
    }

    function toggleEarningsCurrency() {
      const rate = Number(settings.exchangeRate), label = String(settings.currencyLabel || '').trim();
      if (!label || !Number.isFinite(rate) || rate <= 0) return;
      const previous = settings.earningsPreferSecondary;
      settings.earningsPreferSecondary = previous !== true;
      if (saveSettingsOnly() === false) settings.earningsPreferSecondary = previous;
      render();
    }

    // Cada ciclo dura 14 días fijos; solo el ancla (cycleAnchorDate) y los días hasta el pago son
    // editables.
    export const CYCLE_LENGTH_DAYS = 14;

    function cycleAnchorDate() {
      const parsed = new Date(`${settings.cycleAnchorDate || '2025-05-03'}T00:00:00`);
      return Number.isNaN(parsed.getTime()) ? new Date(2025, 4, 3) : parsed;
    }

    function cycleBoundsForDate(date = new Date()) {
      const anchor = cycleAnchorDate();
      // El 5 es solo un respaldo defensivo: ensureCurrencySettings ya valida
      // settings.cyclePayOffsetDays al cargar.
      const payOffsetDays = Number(settings.cyclePayOffsetDays) >= 0 ? Number(settings.cyclePayOffsetDays) : 5;
      const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const diffDays = Math.round((target.getTime() - anchor.getTime()) / 86400000);
      const cycleIndex = Math.floor(diffDays / CYCLE_LENGTH_DAYS);
      const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + cycleIndex * CYCLE_LENGTH_DAYS);
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + CYCLE_LENGTH_DAYS - 1);
      const payDate = new Date(end.getFullYear(), end.getMonth(), end.getDate() + payOffsetDays);
      return { start, end, payDate };
    }

    // Suma las ganancias (pay de llamadas reales) de todos los días dentro de un ciclo ya
    // delimitado (start/end).
    function cycleEarningsForBounds(start, end, payDate) {
      const inCycleCalls = calls.filter(c => {
        const d = callDateToDate(c.callDate);
        return d && d >= start && d <= end;
      });
      // El bono de Higher Rate se suma a las ganancias reportadas por Propio, que no lo expone en
      // los datos importados.
      const higherRateBonus = higherRateBonusForCalls(inCycleCalls);
      // Mismo desglose por nivel (Bronce/Silver/Gold) que "Ganancias de hoy".
      const higherRateBreakdown = higherRateBonusBreakdownForCalls(inCycleCalls);
      const earnings = inCycleCalls.reduce((a, c) => a + parseMoney(c.pay), 0) + higherRateBonus;

      // Horas productivas de cada semana del ciclo (el ciclo siempre dura CYCLE_LENGTH_DAYS=14
      // días, sin importar en qué día de la semana calendario empiece) + el total de ambas.
      let week1ProductiveMin = 0;
      let week2ProductiveMin = 0;
      for (let i = 0; i < CYCLE_LENGTH_DAYS; i++) {
        const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        const dayKey = todayCallDateKey(d);
        const productive = productiveMinutesForDay(dayKey);
        if (i < 7) week1ProductiveMin += productive;
        else week2ProductiveMin += productive;
      }

      return {
        start, end, payDate, earnings, higherRateBonus, higherRateBreakdown, callCount: inCycleCalls.length,
        week1ProductiveMin, week2ProductiveMin,
        totalProductiveMin: week1ProductiveMin + week2ProductiveMin,
      };
    }

    // Suma las ganancias del ciclo que contiene a dayKey (día activo).
    function cycleEarnings(dayKey = getActiveDayKey()) {
      const base = callDateToDate(dayKey) || new Date();
      const { start, end, payDate } = cycleBoundsForDate(base);
      return cycleEarningsForBounds(start, end, payDate);
    }

    // No había forma de ver el ciclo ANTERIOR sin cambiar manualmente "Día activo" a un día
    // específico de esa quincena (y si no había llamadas importadas ese día, ni siquiera aparecía
    // en el selector).
    export function cycleBoundsForOffset(offset = cycleViewOffset) {
      const today = new Date();
      const shifted = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset * CYCLE_LENGTH_DAYS);
      return cycleBoundsForDate(shifted);
    }

    export function cycleEarningsForOffset(offset = cycleViewOffset) {
      const { start, end, payDate } = cycleBoundsForOffset(offset);
      return cycleEarningsForBounds(start, end, payDate);
    }

    function loadSettings() {
      try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const merged = { ...defaultSettings(), ...parsed };
          // Ya existía un SETTINGS_KEY guardado desde antes de que existiera el campo 'onboarded'
          // (parsed no lo trae) → es un usuario que ya venía usando la app, no alguien "nuevo".
          if (!('onboarded' in parsed)) merged.onboarded = true;
          return merged;
        }
      } catch {}
      try {
        const rawState = localStorage.getItem(STORAGE_KEY);
        if (rawState) {
          const parsed = JSON.parse(rawState);
          const minutes = Number(parsed?.productiveGoalMin);
          const dollars = Number(parsed?.earningsGoal);
          const shiftStart = String(parsed?.shiftStart || '07:00');
          const shiftEnd = String(parsed?.shiftEnd || '16:00');
          if (Number.isFinite(minutes) && minutes !== 59) {
            // Hay un STORAGE_KEY viejo aunque nunca haya existido SETTINGS_KEY: tampoco es un
            // usuario nuevo, se completa con los demás defaults.
            return {
              productiveGoalMin: minutes,
              earningsGoal: Number.isFinite(dollars) ? dollars : Number((minutes * RATE).toFixed(2)),
              shiftStart,
              shiftEnd,
              onboarded: true,
            };
          }
        }
      } catch {}
      return defaultSettings();
    }

    // `localStorage.setItem` puede lanzar (típicamente `QuotaExceededError`) si el navegador ya no
    // tiene espacio — fácil de alcanzar con meses de llamadas + varios sonidos personalizados de
    // ~300KB cada uno.
    function safeLocalStorageSet(key, jsonValue) {
      try {
        localStorageRevision.isCurrent();
        localStorage.setItem(key, jsonValue);
        localStorageRevision.record(key, jsonValue);
        return true;
      } catch {
        return false;
      }
    }

    const STORAGE_QUOTA_TOAST = translateText('⚠️ No se pudo guardar — el almacenamiento del navegador está lleno. Libera espacio (por ejemplo, un sonido personalizado en Avisos) y vuelve a intentar el cambio.');
    let storageSnapshotPending = false;

    function canPersistLocalChanges() {
      const expectedOwner = typeof window === 'undefined' ? undefined : window[Symbol.for('propio.expectedAppOwner')];
      const ownerChanged = expectedOwner !== undefined && readMeta().userId !== expectedOwner;
      if (!ownerChanged && localStorageRevision.isCurrent()) return true;
      reportLocalPersistenceFailure('stale');
      toast(translateText('Otra pestaña guardó cambios más recientes. Recarga antes de guardar; tus datos guardados se conservaron.'));
      return false;
    }

    export function saveAll(options = {}) {
      const ok = persistFullSnapshot();
      if (options.render !== false) render();
      return ok;
    }

    function persistFullSnapshot() {
      if (!canPersistLocalChanges()) return false;
      if (!settingsWithinBudget(settings)) {
        storageSnapshotPending = true;
        reportLocalPersistenceFailure('budget');
        toast(translateText('Tus ajustes superan el espacio permitido para sincronizar. Reduce un sonido personalizado o el tamaño de tus ajustes antes de guardar.'));
        return false;
      }
      const keys = [STORAGE_KEY, CALLS_KEY, SETTINGS_KEY];
      const previous = {};
      try {
        keys.forEach(key => { previous[key] = localStorage.getItem(key); });
      } catch {
        storageSnapshotPending = true;
        reportLocalPersistenceFailure('quota');
        toast(STORAGE_QUOTA_TOAST);
        return false;
      }

      const next = {
        [STORAGE_KEY]: JSON.stringify(state),
        [CALLS_KEY]: JSON.stringify(calls),
        [SETTINGS_KEY]: JSON.stringify(settings),
      };
      let ok = true;
      const written = [];
      for (const key of keys) {
        if (!safeLocalStorageSet(key, next[key])) {
          ok = false;
          break;
        }
        written.push(key);
      }

      storageSnapshotPending = !ok;
      if (!ok) {
        // Restaura solo las claves escritas; no borres datos intactos si tampoco se pueden reescribir.
        written.forEach(key => {
          if (previous[key] !== null) safeLocalStorageSet(key, previous[key]);
          else { try { localStorage.removeItem(key); localStorageRevision.record(key, null); } catch {} }
        });
        toast(STORAGE_QUOTA_TOAST);
      }
      reportLocalPersistenceFailure(ok ? null : 'quota');
      return ok;
    }

    export function saveStateOnly() {
      if (!canPersistLocalChanges()) return false;
      // Tras un fallo, cualquier guardado debe incluir también las llamadas y ajustes pendientes.
      if (storageSnapshotPending) return persistFullSnapshot();
      const ok = safeLocalStorageSet(STORAGE_KEY, JSON.stringify(state));
      if (!ok) { storageSnapshotPending = true; toast(STORAGE_QUOTA_TOAST); }
      reportLocalPersistenceFailure(ok ? null : 'quota');
      return ok;
    }

    export function saveSettingsOnly() {
      if (!canPersistLocalChanges()) return false;
      if (!settingsWithinBudget(settings)) {
        storageSnapshotPending = true;
        reportLocalPersistenceFailure('budget');
        toast(translateText('Tus ajustes superan el espacio permitido para sincronizar. Reduce un sonido personalizado o el tamaño de tus ajustes antes de guardar.'));
        return false;
      }
      if (storageSnapshotPending) return persistFullSnapshot();
      const ok = safeLocalStorageSet(SETTINGS_KEY, JSON.stringify(settings));
      if (!ok) { storageSnapshotPending = true; toast(STORAGE_QUOTA_TOAST); }
      reportLocalPersistenceFailure(ok ? null : 'quota');
      return ok;
    }

    export function pad(n) { return String(n).padStart(2, '0'); }

    export function formatDuration(ms) {
      const s = Math.max(0, Math.floor(ms / 1000));
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      return `${pad(h)}:${pad(m)}:${pad(sec)}`;
    }

    // Formato específico para "Tiempo llamadas" — H:MM:SSh (horas SIN cero a la izquierda, a
    // diferencia de formatDuration) + " - Nmins" (minutos totales redondeados).
    function formatCallTimeLabel(totalMin) {
      const totalSeconds = Math.max(0, Math.round((Number.isFinite(totalMin) ? totalMin : 0) * 60));
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      const roundedMin = Math.round(Number.isFinite(totalMin) ? totalMin : 0);
      return `${h}:${pad(m)}:${pad(s)}h - ${roundedMin}mins`;
    }

    export function formatMinutes(mins) {
      const n = Number.isFinite(mins) ? mins : 0;
      const rounded = Math.round(n * 10) / 10;
      return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    }

    export function money(n) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number.isFinite(n) ? n : 0);
    }

    export function parseMoney(value) {
      const cleaned = String(value ?? '').replace(/[^0-9.-]/g, '');
      const n = Number(cleaned);
      return Number.isFinite(n) ? n : 0;
    }


    function fmtDate(date) {
      return new Intl.DateTimeFormat(displayLocale(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(date);
    }

    function fmtTime(date) {
      return new Intl.DateTimeFormat(displayLocale(), { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(date);
    }

    // Un saludo dinámico tipo "Buenos días/tardes/noches, {nombre}" en vez del "Buen día" fijo de
    // siempre — mismo criterio de franjas horarias que usa Claude (mañana antes de las 12, tarde
    // antes de las 19, noche después).
    function greetingText(date = new Date()) {
      const h = date.getHours();
      const base = h < 12 ? translateText('Buenos días') : h < 19 ? translateText('Buenas tardes') : translateText('Buenas noches');
      const name = String(settings.userName || '').trim();
      const emoji = String(settings.userEmoji || '').trim();
      // El emoji solo se muestra si también hay nombre — sin nombre no hay "Buenas tardes, {emoji}"
      // (se vería raro), se cae al saludo solo.
      if (!name) return base;
      return emoji ? `${base}, ${name} ${emoji}` : `${base}, ${name}`;
    }

    export function toDateFromInputs(dateStr, timeStr) {
      const d = String(dateStr).trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      const t = String(timeStr).trim().match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
      if (!d || !t) return null;
      const month = Number(d[1]);
      const day = Number(d[2]);
      const year = Number(d[3]);
      let hour = Number(t[1]);
      const minute = Number(t[2]);
      const ampm = t[3].toUpperCase();
      // Sin este chequeo, `new Date` desborda en silencio (21/09/2026 -> septiembre de 2027) y
      // genera una llamada con una fecha que no corresponde a ningún día navegable.
      if (month < 1 || month > 12 || day < 1 || day > 31 || hour < 1 || hour > 12 || minute > 59) return null;
      if (ampm === 'PM' && hour !== 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;
      const parsed = new Date(year, month - 1, day, hour, minute, 0, 0);
      if (parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null;
      return parsed;
    }

    export function toMinutes(hhmm) {
      const [h, m] = hhmm.split(':').map(Number);
      return h * 60 + m;
    }

    function msBetween(a, b) { return Math.max(0, b.getTime() - a.getTime()); }

    function overlapMinutes(aStart, aEnd, bStart, bEnd) {
      const start = Math.max(aStart.getTime(), bStart.getTime());
      const end = Math.min(aEnd.getTime(), bEnd.getTime());
      return Math.max(0, (end - start) / 60000);
    }

    // Bounds "reales o estimados" del turno de HOY.
    function todayShiftBounds() {
      return dayShiftBounds(todayCallDateKey());
    }

    function currentStateLabel() {
      const bounds = todayShiftBounds();
      if (!bounds.start) return 'No iniciado';
      if (bounds.end && !bounds.live) return 'Finalizado';
      if (state.activePause) return state.activePause.type === 'lunch' ? 'Lunch' : 'Break';
      // El chip de Estado no distinguía "En llamada" — una llamada en vivo (state.activeCall, botón
      // "Iniciar llamada") siempre caía en el genérico 'Working'. Se revisa DESPUÉS de Break/Lunch
      // a propósito.
      if (state.activeCall) return 'En llamada';
      if (bounds.live && !dayWorkBounds(todayCallDateKey()).live) return 'Conectado';
      return 'Working';
    }

    // ACW uses work time; opening an authenticated portal early is only a connection.
    function computeCurrentAcwStart() {
      const dayKey = todayCallDateKey();
      const bounds = dayWorkBounds(dayKey);
      if (!bounds.live) return null;
      if (state.activePause) return null;
      if (state.activeCall) return null;

      const now = new Date();
      const candidates = [bounds.start.getTime()];
      callsForDay(dayKey).forEach(c => candidates.push(new Date(c.endISO).getTime()));
      dayPauseIntervals(dayKey).forEach(p => candidates.push(p.end.getTime()));
      // Sin este candidato, colgar una llamada no se reflejaba aquí hasta confirmarla en el modal
      // de guardado.
      if (state.lastCallEndedAt) candidates.push(new Date(state.lastCallEndedAt).getTime());
      const valid = candidates.filter(t => Number.isFinite(t) && t <= now.getTime());
      if (!valid.length) return null;
      return new Date(Math.max(...valid));
    }

    export function importedCallStats(sourceCalls = calls, dayKey = getActiveDayKey()) {
      const normalizedDayKey = callDateKeyFromValue(dayKey);
      const sorted = [...sourceCalls].sort((a, b) => new Date(a.startISO) - new Date(b.startISO));
      const productiveCalls = sorted.filter(c => c.countsAsProductive !== false);
      const billableCalls = sorted.filter(c => String(c.billable).toLowerCase() === 'yes');
      const droppedCalls = sorted.filter(c => String(c.dropped).toLowerCase() === 'yes');
      const productive = productiveCalls.reduce((a, c) => a + (c.durationMin || 0), 0);
      const total = sorted.reduce((a, c) => a + (c.durationMin || 0), 0);
      // Higher Rate Opportunity — el bono configurado a mano (ver higherRateBonusForCalls) se SUMA
      // a las ganancias reales reportadas por Propio (`pay`), ya que Propio no lo expone en los
      // datos que la app importa.
      const higherRateBonus = higherRateBonusForCalls(sorted);
      const earnings = sorted.reduce((a, c) => a + parseMoney(c.pay), 0) + higherRateBonus;
      const longest = sorted.length ? Math.max(...sorted.map(c => c.durationMin || 0)) : 0;
      const shortest = sorted.length ? Math.min(...sorted.map(c => c.durationMin || 0)) : 0;
      // "Más corta" puede caer en 0 min por una llamada real pero rarísima (Propio exporta
      // inicio=fin)
      const zeroCount = sorted.filter(c => (c.durationMin || 0) === 0).length;
      const nonZero = sorted.map(c => c.durationMin || 0).filter(d => d > 0);
      const shortestNonZero = nonZero.length ? Math.min(...nonZero) : null;
      const avg = sorted.length ? total / sorted.length : 0;
      const gapTotals = dayGapTotals(normalizedDayKey, sorted);
      return {
        productive,
        total,
        earnings,
        higherRateBonus,
        higherRateBreakdown: higherRateBonusBreakdownForCalls(sorted),
        billable: billableCalls.length,
        dropped: droppedCalls.length,
        longest,
        shortest,
        zeroCount,
        shortestNonZero,
        avg,
        gapTotal: gapTotals.acwTotal,
        rawGapTotal: gapTotals.rawGapTotal,
        possiblePauseTotal: gapTotals.possiblePauseTotal,
        breakGapTotal: gapTotals.breakTotal,
        lunchGapTotal: gapTotals.lunchTotal,
        otherGapTotal: gapTotals.otherTotal,
        gapAvg: gapTotals.gapCount ? gapTotals.acwTotal / gapTotals.gapCount : 0,
        gapLongest: gapTotals.gapLongest,
      };
    }

export function todayRange(base = new Date()) {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, 0, 0, 0);
}

function dateKey(date = new Date()) {
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()}`;
}

function dateAtTime(baseDate, hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), h, m, 0, 0);
}

function formatDeltaMinutes(mins) {
  const abs = Math.abs(mins);
  const rounded = Math.round(abs * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${mins >= 0 ? '+' : '-'}${text}m`;
}

// Restar 86400000 ms cae en el día equivocado tras el cambio de hora de primavera.
export function previousCalendarDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
}

export function todayCallDateKey(date = new Date()) {
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()}`;
}

export function callDateKeyFromValue(value) {
  const match = String(value ?? '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[1]}/${match[2]}/${match[3]}` : '';
}

export function callDateToDate(key) {
  return toDateFromInputs(callDateKeyFromValue(key), '12:00 AM');
}

// Conversión entre el formato interno de día (dayKey, "MM/DD/YYYY") y el formato que exige <input
// type="date"> ("YYYY-MM-DD").
export function isoDateFromDayKey(dayKey) {
  const d = callDateToDate(dayKey);
  if (!d) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function dayKeyFromIsoDate(isoValue) {
  const match = String(isoValue ?? '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  const [, y, m, d] = match;
  return `${m}/${d}/${y}`;
}

export function sameCallDay(iso, key) {
  if (!iso || !key) return false;
  return dateKey(new Date(iso)) === callDateKeyFromValue(key);
}

function callImportFlag(c) {
  if (!c.importedAt) return null;
  const lagMin = (new Date(c.importedAt).getTime() - new Date(c.endISO).getTime()) / 60000;
  if (sameCallDay(c.importedAt, c.callDate) || String(c.shiftDayKey || '') === callDateKeyFromValue(c.callDate)) {
    if (lagMin > 30) return { cls: 'imported-late', label: translateText('Importado tarde') };
    return null;
  }
  return { cls: 'imported-historic', label: translateText('Importación histórica') };
}

// Si el día activo guardado quedó en un calendario anterior a hoy (sesión vieja dejada abierta, o
// la pestaña siguió abierta y cruzó la medianoche sin recargar), lo reinicia a "hoy"
function resetActiveDayIfStale() {
  const stored = callDateKeyFromValue(state.activeDayKey);
  const today = todayCallDateKey();
  if (!stored) {
    state.lastCalendarDay = today;
    return;
  }
  const storedDate = callDateToDate(stored);
  // Si lastCalendarDay nunca se guardó (state de una versión anterior a este fix), se asume que la
  // selección fue intencional — NO se fuerza el salto a "Hoy" ni siquiera esta primera vez.
  const wasFollowingToday = typeof state.lastCalendarDay === 'string' && stored === state.lastCalendarDay;
  if (wasFollowingToday && stored !== today && storedDate) {
    state.activeDayKey = today;
  }
  state.lastCalendarDay = today;
  saveStateOnly();
}

// Detecta si cambió el día de calendario real mientras la pestaña sigue abierta (ej. te quedaste
// trabajando pasada la medianoche).
let lastKnownCalendarDay = todayCallDateKey();
function checkDayRollover() {
  const today = todayCallDateKey();
  if (today === lastKnownCalendarDay) return false;
  const wasFollowingToday = callDateKeyFromValue(state.activeDayKey) === lastKnownCalendarDay;
  lastKnownCalendarDay = today;
  // state.lastCalendarDay se actualiza siempre que se detecta un cambio de día real, haya avanzado
  // activeDayKey o no.
  state.lastCalendarDay = today;
  if (wasFollowingToday) {
    state.activeDayKey = today;
  }
  onGameDayRollover();
  saveStateOnly();
  render();
  return true;
}

let shiftAlarmIntervalId = null;
let shiftAlarmFiredForDate = null;
let shiftAlarmAudioCtx = null;
const SHIFT_ALARM_REPEAT_MS = 6000;

// Los sonidos basados en Web Audio (alarmas de turno/Break/Lunch, descanso por productividad)
// pueden fallar silenciosamente si el navegador bloquea el audio por política de autoplay.
let audioBlockedShown = false;

function notifyAudioBlockedIfNeeded(ctx) {
  if (!ctx || ctx.state === 'running' || audioBlockedShown) return;
  audioBlockedShown = true;
  const banner = document.getElementById('audioBlockedBanner');
  if (banner) banner.classList.add('show');
}

function hideAudioBlockedBanner() {
  const banner = document.getElementById('audioBlockedBanner');
  if (banner) banner.classList.remove('show');
}

function activateBlockedAudio() {
  try {
    if (!shiftAlarmAudioCtx) shiftAlarmAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    shiftAlarmAudioCtx.resume().catch(() => {});
  } catch {}
  try {
    if (!productiveBreakAudioCtx) productiveBreakAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    productiveBreakAudioCtx.resume().catch(() => {});
  } catch {}
  audioBlockedShown = false;
  hideAudioBlockedBanner();
  playShiftAlarmBeep();
  toast('🔊 Sonido activado');
}

// Beep sintetizado con Web Audio (dos tonos cortos ascendentes) — sin archivo de audio externo ni
// petición de red, funciona completamente offline/sandboxed.
function getMasterVolumeFraction() {
  const v = Number(settings.masterVolume);
  if (!Number.isFinite(v)) return 1;
  return Math.max(0, Math.min(100, v)) / 100;
}

function playShiftAlarmBeep() {
  try {
    if (!shiftAlarmAudioCtx) shiftAlarmAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = shiftAlarmAudioCtx;
    // `ctx.resume` puede fallar silenciosamente (política de autoplay sin gesto de usuario
    // reciente)
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {}).finally(() => notifyAudioBlockedIfNeeded(ctx));
    }
    const now = ctx.currentTime;
    const vol = getMasterVolumeFraction();
    [0, 0.18].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = i === 0 ? 880 : 1046.5;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, 0.25 * vol), now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.2);
    });
  } catch {}
}

function startShiftAlarm() {
  if (shiftAlarmIntervalId) return; // Ya está sonando, no duplicar el interval.
  const play = () => playConfiguredAlarmSound(settings.shiftAlarmSound, settings.shiftAlarmCustomSoundDataUrl);
  play();
  shiftAlarmIntervalId = setInterval(play, SHIFT_ALARM_REPEAT_MS);
}

function stopShiftAlarm() {
  if (shiftAlarmIntervalId) {
    clearInterval(shiftAlarmIntervalId);
    shiftAlarmIntervalId = null;
  }
}

// "así como se configuran los sonidos... se debería poder configurar el mensaje de cada aviso".
// Sustituye `{variable}` dentro de una plantilla guardada en settings (ej. `shiftAlarmMessage`) por
// su valor real.
function renderAlertTemplate(template, vars) {
  let str = String(template || '');
  Object.keys(vars || {}).forEach((key) => {
    str = str.split(`{${key}}`).join(String(vars[key]));
  });
  return str;
}

// Reproduce el sonido configurado para uno de los 3 avisos de turno/Break/Lunch.
function playConfiguredAlarmSound(sound, customSoundDataUrl) {
  if (getMasterVolumeFraction() === 0) return;
  if (sound === 'custom' && customSoundDataUrl) {
    try {
      const audio = new Audio(customSoundDataUrl);
      audio.volume = getMasterVolumeFraction();
      audio.play().catch(() => playShiftAlarmBeep());
      return;
    } catch {
      playShiftAlarmBeep();
      return;
    }
  }
  if (sound === 'chime') playProductiveBreakChimeTone();
  else playShiftAlarmBeep();
}

function playCallSavedSound(kind) {
  if (callFeedbackSilenced()) return;
  const cfg = ALARM_SOUND_CONFIGS[kind];
  if (!cfg?.enabledKey || settings[cfg.enabledKey] !== true || getMasterVolumeFraction() === 0) return;
  playConfiguredAlarmSound(settings[cfg.soundKey], settings[cfg.urlKey]);
}

// Revisa cada segundo si entramos a la ventana [hora planeada − alertBeforeShiftMin, hora
// planeada).
function checkShiftAlarm() {
  const cfg = dayConfigFor(todayCallDateKey());
  const alertMin = Number(settings.alertBeforeShiftMin);
  // Se usa dayShiftBounds().live y no state.shiftStartedAt: ese solo se llena con el click real de
  // "Iniciar shift".
  const shiftIsLive = dayShiftBounds(todayCallDateKey()).live;

  if (!cfg || cfg.off || !cfg.start || !Number.isFinite(alertMin) || alertMin <= 0 || shiftIsLive) {
    stopShiftAlarm();
    return;
  }

  const now = new Date();
  const plannedStart = dateAtTime(now, formatHHMM(cfg.start));
  const alertTime = new Date(plannedStart.getTime() - alertMin * 60000);
  const todayKey = todayCallDateKey();

  if (now >= plannedStart) {
    stopShiftAlarm();
    return;
  }

  if (now >= alertTime) {
    if (shiftAlarmFiredForDate !== todayKey) {
      shiftAlarmFiredForDate = todayKey;
      onGameShiftAlarmFired(todayKey, now.toISOString());
      toast(renderAlertTemplate(settings.shiftAlarmMessage, { hora: timeLabel(formatHHMM(cfg.start)) }));
    }
    startShiftAlarm();
  } else {
    stopShiftAlarm();
  }
}

// Avisos de Break/Lunch (inicio y fin) ---- Mismo motor de alarma que "Conéctate ya" (reutiliza
// playShiftAlarmBeep), pero con 2 checadores independientes entre sí y del aviso de turno: -
// checkBreakStartAlarm.
let breakStartAlarmIntervalId = null;
let breakStartAlarmActiveKey = null;
const breakStartAlarmFiredKeys = new Set();

function startBreakStartAlarm(key) {
  if (breakStartAlarmIntervalId && breakStartAlarmActiveKey === key) return;
  stopBreakStartAlarm();
  breakStartAlarmActiveKey = key;
  const play = () => playConfiguredAlarmSound(settings.breakStartAlarmSound, settings.breakStartAlarmCustomSoundDataUrl);
  play();
  breakStartAlarmIntervalId = setInterval(play, SHIFT_ALARM_REPEAT_MS);
}

function stopBreakStartAlarm() {
  if (breakStartAlarmIntervalId) {
    clearInterval(breakStartAlarmIntervalId);
    breakStartAlarmIntervalId = null;
  }
  breakStartAlarmActiveKey = null;
}

// Revisa los bloques de Break/Lunch planeados de HOY (ya efectivos, ver getEffectiveScheduleForDay)
// en orden cronológico y dispara el aviso para el primero que aún no se haya tomado y cuya hora
// caiga.
function checkBreakStartAlarm() {
  const alertMin = Number(settings.alertBeforeBreakMin);
  // Mismo problema que checkShiftAlarm.
  const shiftIsLive = dayShiftBounds(todayCallDateKey()).live;

  if (!Number.isFinite(alertMin) || alertMin <= 0 || !shiftIsLive || state.activePause) {
    stopBreakStartAlarm();
    return;
  }

  const dayKey = state.shiftStartedAt && !state.shiftEndedAt ? currentShiftAccountingDayKey() : todayCallDateKey();
  const planned = getEffectiveScheduleForDay(dayKey).filter(s => s.type === 'Break' || s.type === 'Lunch');
  const base = callDateToDate(dayKey) || new Date();
  const now = new Date();

  let candidate = null;
  for (const slot of planned) {
    if (pauseForSlot(slot, dayKey)) continue; // Ya tomado, no avisar.
    const slotStart = dateAtTime(base, slot.start);
    slotStart.setDate(slotStart.getDate() + Math.floor((slot.startMin ?? 0) / 1440));
    if (now >= slotStart) continue; // Ya pasó, se cede a "no tomado"
    const alertTime = new Date(slotStart.getTime() - alertMin * 60000);
    if (now >= alertTime) {
      candidate = { key: `${dayKey}|${slot.name}|${slot.start}`, slot };
      break; // Primer candidato cronológico dentro de ventana.
    }
  }

  if (!candidate) {
    stopBreakStartAlarm();
    return;
  }

  if (breakStartAlarmActiveKey !== candidate.key) {
    if (!breakStartAlarmFiredKeys.has(candidate.key)) {
      breakStartAlarmFiredKeys.add(candidate.key);
      const pretty = candidate.slot.type === 'Lunch' ? translateText('Lunch') : translateText('Break');
      toast(renderAlertTemplate(settings.breakStartAlarmMessage, { tipo: pretty, hora: timeLabel(candidate.slot.start) }));
    }
    startBreakStartAlarm(candidate.key);
  }
}

let breakEndAlarmIntervalId = null;
let breakEndAlarmActiveKey = null;
const breakEndAlarmFiredKeys = new Set();

function startBreakEndAlarm(key) {
  if (breakEndAlarmIntervalId && breakEndAlarmActiveKey === key) return;
  stopBreakEndAlarm();
  breakEndAlarmActiveKey = key;
  const play = () => playConfiguredAlarmSound(settings.breakEndAlarmSound, settings.breakEndAlarmCustomSoundDataUrl);
  play();
  breakEndAlarmIntervalId = setInterval(play, SHIFT_ALARM_REPEAT_MS);
}

function stopBreakEndAlarm() {
  if (breakEndAlarmIntervalId) {
    clearInterval(breakEndAlarmIntervalId);
    breakEndAlarmIntervalId = null;
  }
  breakEndAlarmActiveKey = null;
}

// Encuentra el slot planeado (ya efectivo) que corresponde a la pausa REAL en curso
// (state.activePause)
function findPlannedSlotForActivePause(dayKey) {
  if (!state.activePause) return null;
  const type = String(state.activePause.type || '').toLowerCase();
  const planned = getEffectiveScheduleForDay(dayKey).filter(s => s.type.toLowerCase() === type);
  for (const slot of planned) {
    const assigned = pauseForSlot(slot, dayKey);
    if (assigned && assigned.startedAt === state.activePause.startedAt) return slot;
  }
  return null;
}

// El aviso de fin también aplica a una pausa que no coincide exacto con un slot planeado: se usa la
// duración del primer slot de ese tipo.
function referenceDurationMinForActivePause(dayKey) {
  if (!state.activePause) return null;
  const matchedSlot = findPlannedSlotForActivePause(dayKey);
  if (matchedSlot) return toMinutes(matchedSlot.end) - toMinutes(matchedSlot.start);

  const type = String(state.activePause.type || '').toLowerCase();
  const planned = getEffectiveScheduleForDay(dayKey).filter(s => s.type.toLowerCase() === type);
  if (!planned.length) return null;
  const first = planned[0];
  return toMinutes(first.end) - toMinutes(first.start);
}

function checkBreakEndAlarm() {
  const alertMin = Number(settings.alertBeforeBreakEndMin);

  if (!Number.isFinite(alertMin) || alertMin <= 0 || !state.activePause || state.shiftEndedAt) {
    stopBreakEndAlarm();
    return;
  }

  const dayKey = todayCallDateKey();
  const plannedDurationMin = referenceDurationMinForActivePause(dayKey);
  if (plannedDurationMin === null) {
    // Ni siquiera hay un Break/Lunch de ese tipo configurado hoy — no hay ninguna duración
    // razonable con qué estimar el fin.
    stopBreakEndAlarm();
    return;
  }

  const startedAt = new Date(state.activePause.startedAt);
  const predictedEnd = new Date(startedAt.getTime() + plannedDurationMin * 60000);
  const alertTime = new Date(predictedEnd.getTime() - alertMin * 60000);
  const now = new Date();
  const key = state.activePause.startedAt;

  if (now >= predictedEnd) {
    stopBreakEndAlarm();
    return;
  }

  if (now < alertTime) {
    stopBreakEndAlarm();
    return;
  }

  if (breakEndAlarmActiveKey !== key) {
    if (!breakEndAlarmFiredKeys.has(key)) {
      breakEndAlarmFiredKeys.add(key);
      const pretty = state.activePause.type === 'lunch' ? translateText('Lunch') : translateText('Break');
      toast(renderAlertTemplate(settings.breakEndAlarmMessage, { tipo: pretty, hora: timeLabelFromDate(predictedEnd) }));
    }
    startBreakEndAlarm(key);
  }
}

// Descanso ganado por productividad ---- Aviso (toast + sonido) al acumular
// `productiveBreakEarnMin` minutos PRODUCTIVOS (tiempo real de llamadas billable/no-dropped) desde
// tu última pausa real (Break/Lunch)

// Reutiliza el mismo AudioContext que ya usa playShiftAlarmBeep (una sola instancia compartida,
// para no crear una nueva por cada beep)
let productiveBreakAudioCtx = null;
function getProductiveBreakAudioCtx() {
  if (!productiveBreakAudioCtx) productiveBreakAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (productiveBreakAudioCtx.state === 'suspended') {
    productiveBreakAudioCtx.resume().catch(() => {}).finally(() => notifyAudioBlockedIfNeeded(productiveBreakAudioCtx));
  }
  return productiveBreakAudioCtx;
}

// Sonido "Beep clásico": mismo patrón de 2 tonos ascendentes que ya usa playShiftAlarmBeep para los
// avisos de turno/Break — pero con su propio AudioContext para no acoplar ambas features entre sí.
function playProductiveBreakClassicTone() {
  try {
    const ctx = getProductiveBreakAudioCtx();
    const now = ctx.currentTime;
    const vol = getMasterVolumeFraction();
    [0, 0.18].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = i === 0 ? 880 : 1046.5;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, 0.25 * vol), now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.2);
    });
  } catch {}
}

// Sonido "Campanita": 3 notas ascendentes tipo campana (distinto patrón e instrumentación — onda
// triangular en vez de seno, notas más espaciadas y con más "cola" al soltarse) para que se
// distinga a simple oído del "Beep clásico"
function playProductiveBreakChimeTone() {
  try {
    const ctx = getProductiveBreakAudioCtx();
    const now = ctx.currentTime;
    const vol = getMasterVolumeFraction();
    [523.25, 659.25, 784.0].forEach((freq, i) => {
      const offset = i * 0.13;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, 0.22 * vol), now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.4);
    });
  } catch {}
}

// Reproduce el sonido configurado en settings.productiveBreakSound.
function playProductiveBreakSound() {
  const sound = settings.productiveBreakSound || 'classic';
  if (sound === 'custom' && settings.productiveBreakCustomSoundDataUrl) {
    try {
      const audio = new Audio(settings.productiveBreakCustomSoundDataUrl);
      audio.volume = getMasterVolumeFraction();
      audio.play().catch(() => playProductiveBreakClassicTone());
      return;
    } catch {
      playProductiveBreakClassicTone();
      return;
    }
  }
  if (sound === 'chime') playProductiveBreakChimeTone();
  else playProductiveBreakClassicTone();
}

// Ancla + minutos productivos acumulados desde esa ancla — extraído aparte para poder probarse
// igual que el resto de funciones "puras" de la app.
function minutesSinceLastProductiveBreakAnchor() {
  const dayKey = todayCallDateKey();
  // El guard de entrada seguía exigiendo isShiftStartedToday (turno con click real) incluso DESPUÉS
  // del fix de que ya reconcilia el ancla con dayShiftBounds más abajo.
  const bounds = dayShiftBounds(dayKey);
  if (!bounds.live || state.activePause) return null;
  // Pegar VARIAS llamadas hasta sumar 30+ min productivos no disparaba el aviso, pero pegar UNA
  // sola llamada de 30+ min sí. Causa.
  let anchor = bounds.start;
  state.pauseHistory
    .filter(p => sameCallDay(p.startedAt, dayKey))
    .forEach(p => {
      const end = new Date(p.endedAt);
      if (end > anchor) anchor = end;
    });
  const productiveMin = callsForDay(dayKey)
    .filter(c => c.countsAsProductive !== false && new Date(c.startISO).getTime() >= anchor.getTime())
    .reduce((sum, c) => sum + (Number(c.durationMin) || 0), 0);
  return { anchor, productiveMin };
}

// "cuando sumo 30 min productivos suena la alarma, cuando sumo otros 30 no, cuando sumo otros 30
// tampoco y no vuelve a sonar durante todo el shift". Causa.
const productiveBreakEarnedFiredTramoByAnchor = new Map();

function checkProductiveBreakEarnedAlarm() {
  const earnMin = Number(settings.productiveBreakEarnMin);
  const awardMin = Number(settings.productiveBreakAwardMin);
  if (!Number.isFinite(earnMin) || earnMin <= 0) return;

  const result = minutesSinceLastProductiveBreakAnchor();
  if (!result) return;

  // Cuántos tramos completos de `earnMin` se acumularon desde la ancla: 1 al llegar a 30, 2 al
  // llegar a 60, etc.
  const tramosCompleted = Math.floor(result.productiveMin / earnMin);
  const anchorKey = result.anchor.toISOString();
  // Primera lectura tras cargar la página: los tramos ya acumulados no se vuelven a avisar.
  if (!productiveBreakEarnedFiredTramoByAnchor.has(anchorKey)) {
    productiveBreakEarnedFiredTramoByAnchor.set(anchorKey, tramosCompleted);
    return;
  }
  const lastFiredTramo = productiveBreakEarnedFiredTramoByAnchor.get(anchorKey) || 0;
  if (tramosCompleted < 1 || tramosCompleted <= lastFiredTramo) return;
  productiveBreakEarnedFiredTramoByAnchor.set(anchorKey, tramosCompleted);

  const totalAwardMin = tramosCompleted * awardMin;
  const template = lastFiredTramo > 0 ? settings.productiveBreakMessageRepeat : settings.productiveBreakMessageFirst;
  const message = renderAlertTemplate(template, { productivo: formatMinutes(result.productiveMin), descanso: formatMinutes(totalAwardMin) });
  toast(message);
  playProductiveBreakSound();
}

export function mergeIntervals(intervals = []) {
  const sorted = intervals
    .map(i => ({ start: new Date(i.start), end: new Date(i.end) }))
    .filter(i => Number.isFinite(i.start.getTime()) && Number.isFinite(i.end.getTime()) && i.end > i.start)
    .sort((a, b) => a.start - b.start);

  const merged = [];
  for (const current of sorted) {
    const last = merged[merged.length - 1];
    if (!last || current.start > last.end) {
      merged.push({ start: new Date(current.start), end: new Date(current.end) });
    } else if (current.end > last.end) {
      last.end = new Date(current.end);
    }
  }
  return merged;
}

function overlapMinutesWithIntervals(rangeStart, rangeEnd, intervals = []) {
  const merged = mergeIntervals(intervals);
  let total = 0;
  for (const interval of merged) {
    const start = Math.max(rangeStart.getTime(), interval.start.getTime());
    const end = Math.min(rangeEnd.getTime(), interval.end.getTime());
    if (end > start) total += (end - start) / 60000;
  }
  return total;
}

// Huecos SIN pausa real encima (ni Break ni Lunch marcados con el botón) que duran más de este
// umbral se clasifican automáticamente como "Other" en vez de ACW por default (ej. apagón de luz,
// algo que te sacó de la app varias horas).
const GAP_AUTO_OTHER_THRESHOLD_MIN = 90;

// Cota de distancia para pauseAssignmentCache: no se fuerza el emparejamiento de una pausa real
// (botón o hueco manual) con un slot planeado (Break1/Break2/Lunch) si quedan a más de esta
// cantidad de minutos de diferencia.
const PAUSE_SLOT_MAX_DISTANCE_MIN = 180;

export function gapLabelText(label) {
  const map = { acw: 'ACW', break: 'Break', lunch: 'Lunch', other: translateText('Otro') };
  return map[String(label || '').toLowerCase()] || 'ACW';
}

function gapKeyFor(prevCall, curCall) {
  return [
    prevCall?.customerId || 'prev',
    prevCall?.startISO || '',
    curCall?.customerId || 'cur',
    curCall?.startISO || '',
  ].join('|');
}

function ensureGapBucket(dayKey = getActiveDayKey()) {
  const normalized = callDateKeyFromValue(dayKey);
  if (!state.gapAnnotations || typeof state.gapAnnotations !== 'object') state.gapAnnotations = {};
  if (!state.gapAnnotations[normalized]) state.gapAnnotations[normalized] = {};
  return state.gapAnnotations[normalized];
}

function getGapAnnotation(dayKey, gapKey) {
  const normalized = callDateKeyFromValue(dayKey);
  const bucket = state.gapAnnotations && state.gapAnnotations[normalized];
  const value = bucket && bucket[gapKey];
  if (!value || typeof value !== 'object') return null;
  return {
    label: String(value.label || 'acw').toLowerCase(),
    note: String(value.note || ''),
  };
}

function setGapAnnotation(dayKey, gapKey, patch = {}) {
  const before = JSON.parse(JSON.stringify(state.gapAnnotations || {}));
  const normalized = callDateKeyFromValue(dayKey);
  const bucket = ensureGapBucket(normalized);
  const current = bucket[gapKey] && typeof bucket[gapKey] === 'object' ? bucket[gapKey] : {};
  const next = { ...current, ...patch };
  if (!next.label) next.label = 'acw';
  if (!String(next.note || '').trim()) delete next.note;
  bucket[gapKey] = next;
  if (saveStateOnly() === false) { state.gapAnnotations = before; return false; }
  render();
  return true;
}

function suggestGapLabel(prevEnd, curStart, dayKey = getActiveDayKey()) {
  // Solo se sugiere Break/Lunch si el hueco coincide con una pausa REAL (botón de Break/Lunch
  // realmente presionado). El horario planeado ya NO se usa para sugerir la etiqueta.
  const actual = dayPauseIntervals(dayKey);
  const actualLunch = overlapMinutesWithIntervals(prevEnd, curStart, actual.filter(p => p.type === 'lunch'));
  const actualBreak = overlapMinutesWithIntervals(prevEnd, curStart, actual.filter(p => p.type === 'break'));
  if (actualLunch > 0 && actualLunch >= actualBreak) return 'lunch';
  if (actualBreak > 0) return 'break';
  const rawMinutes = Math.max(0, (curStart.getTime() - prevEnd.getTime()) / 60000);
  if (rawMinutes > GAP_AUTO_OTHER_THRESHOLD_MIN) return 'other';
  return 'acw';
}

function gapClassification(prevEnd, curStart, dayKey = getActiveDayKey(), gapKey = null) {
  const raw = Math.max(0, (curStart.getTime() - prevEnd.getTime()) / 60000);
  if (raw <= 0) {
    return {
      raw: 0,
      residual: 0,
      displayAmount: 0,
      acw: 0,
      break: 0,
      lunch: 0,
      other: 0,
      possiblePause: 0,
      suggested: 'acw',
      label: 'acw',
      note: '',
      manual: false,
    };
  }

  const actualPauses = mergeIntervals(dayPauseIntervals(dayKey));
  const actualCovered = overlapMinutesWithIntervals(prevEnd, curStart, actualPauses);
  // Scheduled pauses do not subtract time; only real pauses and work presence do.
  const annotation = gapKey ? getGapAnnotation(dayKey, gapKey) : null;
  const connections = annotation ? [] : dayShiftSessions(dayKey);
  const sessions = annotation ? [] : mergeIntervals(dayWorkSessions(dayKey));
  const connectedIntervals = connections.length ? sessions.map(session => ({
    start: new Date(Math.max(prevEnd.getTime(), session.start.getTime())),
    end: new Date(Math.min(curStart.getTime(), session.end.getTime())),
  })).filter(interval => interval.end > interval.start) : null;
  const residual = connectedIntervals
    ? connectedIntervals.reduce((sum, interval) => sum + Math.max(0,
      (interval.end - interval.start) / 60000 - overlapMinutesWithIntervals(interval.start, interval.end, actualPauses)), 0)
    : Math.max(0, raw - actualCovered);
  const suggested = suggestGapLabel(prevEnd, curStart, dayKey);
  const automaticLabel = residual > 1e-9
    ? (residual > GAP_AUTO_OTHER_THRESHOLD_MIN ? 'other' : 'acw') : suggested;
  const label = annotation ? String(annotation.label || suggested).toLowerCase() : automaticLabel;

  // "Posible pausa" solo tiene sentido cuando el hueco NO ha sido clasificado a mano (sin
  // anotación) Y la sugerencia automática detectó algo distinto de ACW plano (break/lunch por
  // overlap real, u "other" por ser muy largo).
  const isUnclassifiedPause = !annotation && label === 'other';

  const displayAmount = (label === 'break' || label === 'lunch')
    ? (annotation ? raw : overlapMinutesWithIntervals(prevEnd, curStart, dayPauseIntervals(dayKey).filter(p => p.type === label))) : residual;

  return {
    raw,
    residual,
    displayAmount,
    acw: label === 'acw' ? residual : 0,
    break: label === 'break' ? residual : 0,
    lunch: label === 'lunch' ? residual : 0,
    other: label === 'other' ? residual : 0,
    possiblePause: isUnclassifiedPause ? residual : 0,
    suggested,
    label,
    note: annotation?.note || '',
    manual: !!annotation,
    actualCovered,
    connectedIntervals,
  };
}

export function dayGapRows(dayKey = getActiveDayKey(), sourceCalls = callsForDay(dayKey)) {
  const normalized = callDateKeyFromValue(dayKey);
  const sorted = [...sourceCalls].sort((a, b) => new Date(a.startISO) - new Date(b.startISO));
  const rows = [];

  if (sorted.length) {
    const connectionStart = dayShiftSessions(normalized)[0]?.start;
    const shiftStart = dayWorkSessions(normalized)[0]?.start;
    const firstCallStart = new Date(sorted[0].startISO);
    if (shiftStart && shiftStart.getTime() < firstCallStart.getTime()) {
      // Keep the original key so existing gap annotations survive the work-time projection.
      const virtualPrev = { customerId: 'shift-start', startISO: (connectionStart || shiftStart).toISOString(), endISO: shiftStart.toISOString() };
      const gapKey = gapKeyFor(virtualPrev, sorted[0]);
      const info = gapClassification(shiftStart, firstCallStart, normalized, gapKey);
      if (info.displayAmount > 0 || info.manual) {
        rows.push({ gapKey, prev: virtualPrev, cur: sorted[0], isShiftStartGap: true, ...info });
      }
    }
  }

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    const gapKey = gapKeyFor(prev, cur);
    const info = gapClassification(new Date(prev.endISO), new Date(cur.startISO), normalized, gapKey);
    if (info.displayAmount > 0 || info.manual) {
      rows.push({ gapKey, prev, cur, ...info });
    }
  }
  return rows;
}

function dayGapTotals(dayKey = getActiveDayKey(), sourceCalls = callsForDay(dayKey)) {
  const gaps = dayGapRows(dayKey, sourceCalls);
  let rawGapTotal = 0;
  let acwTotal = 0;
  let breakTotal = 0;
  let lunchTotal = 0;
  let otherTotal = 0;
  let possiblePauseTotal = 0;
  let gapLongest = 0;
  for (const gap of gaps) {
    rawGapTotal += gap.raw;
    gapLongest = Math.max(gapLongest, gap.residual);
    if (gap.label === 'acw') acwTotal += gap.residual;
    else if (gap.label === 'other') otherTotal += gap.residual;
    possiblePauseTotal += gap.possiblePause;
  }
  for (const pause of actualPauseIntervalsForDay(dayKey)) {
    const duration = Math.max(0, (pause.end - pause.start) / 60000);
    if (pause.type === 'break') breakTotal += duration;
    else if (pause.type === 'lunch') lunchTotal += duration;
  }
  return { rawGapTotal, acwTotal, breakTotal, lunchTotal, otherTotal, possiblePauseTotal, gapLongest, gapCount: gaps.length };
}

export function formatCallDayLabel(key) {
  const d = callDateToDate(key);
  if (!d) return key || '—';
  return new Intl.DateTimeFormat(displayLocale(), {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

function earningsSectionLabel(dayKey = getActiveDayKey()) {
  const normalized = callDateKeyFromValue(dayKey);
  if (normalized === todayCallDateKey()) return translateText('Ganancias de hoy');
  return ui`Ganancias del ${formatCallDayLabel(normalized)}`;
}

function defaultActiveDayKey() {
  return todayCallDateKey();
}

export function getActiveDayKey() {
  const normalized = callDateKeyFromValue(state.activeDayKey);
  if (normalized) return normalized;
  return defaultActiveDayKey();
}

function setActiveDayKey(key, shouldRender = true) {
  const normalized = callDateKeyFromValue(key) || defaultActiveDayKey();
  state.activeDayKey = normalized;
  saveStateOnly();
  if (shouldRender) render();
}

// Flechitas ‹/› junto a "Día activo" (header) para moverse un día atrás/adelante sin abrir el date-
// picker nativo de #daySelector. Reutiliza getActiveDayKey/setActiveDayKey.
function shiftActiveDayBy(deltaDays) {
  const current = callDateToDate(getActiveDayKey()) || new Date();
  const next = new Date(current.getFullYear(), current.getMonth(), current.getDate() + deltaDays);
  if (deltaDays > 0 && next > todayRange()) {
    toast(translateText('📅 Ese día todavía no llega — vas a ver un día futuro sin datos.'));
  }
  setActiveDayKey(todayCallDateKey(next));
}

// Tocar "Día activo" salta directo a Hoy, mismo setActiveDayKey que las flechitas ‹/›.
function jumpActiveDayToToday() {
  if (isViewingToday()) return;
  setActiveDayKey(todayCallDateKey());
  toast(translateText('📅 Volviste a Hoy'));
}

// Los controles "en vivo" (Iniciar/Finalizar shift, Break, Lunch) escriben siempre en
// state.shiftStartedAt/shiftEndedAt/activePause/pauseHistory con la hora REAL de ahora — nunca
// miran getActiveDayKey.
function isViewingToday() {
  return getActiveDayKey() === todayCallDateKey();
}

export function callsForDay(dayKey = getActiveDayKey(), sourceCalls = calls) {
  const normalized = callDateKeyFromValue(dayKey);
  return sourceCalls.filter(c => callDateKeyFromValue(c.callDate) === normalized);
}

export function dayEvents(dayKey = getActiveDayKey()) {
  const normalized = callDateKeyFromValue(dayKey);
  return state.events.filter(e => {
    const accountingDay = callDateKeyFromValue(e?.shiftDayKey);
    return accountingDay ? accountingDay === normalized : sameCallDay(e.ts, normalized);
  });
}

function dayPauseIntervals(dayKey = getActiveDayKey()) {
  const normalized = callDateKeyFromValue(dayKey);
  const arr = state.pauseHistory
    .filter(p => {
      const accountingDay = callDateKeyFromValue(p?.shiftDayKey);
      return accountingDay ? accountingDay === normalized : sameCallDay(p.startedAt, normalized);
    })
    .map(p => ({ type: p.type, start: new Date(p.startedAt), end: new Date(p.endedAt) }));
  const activePauseDay = state.activePause
    ? (callDateKeyFromValue(state.activePause.shiftDayKey)
      || (state.shiftStartedAt ? todayCallDateKey(new Date(state.shiftStartedAt)) : todayCallDateKey(new Date(state.activePause.startedAt))))
    : '';
  if (activePauseDay === normalized && state.activePause && !state.shiftEndedAt) {
    arr.push({ type: state.activePause.type, start: new Date(state.activePause.startedAt), end: new Date() });
  }
  return arr;
}

// Margen de inactividad para el fallback de HOY sin click en "Iniciar shift"
const CONNECTED_LIVE_GRACE_MIN = 90;

export function dayShiftBounds(dayKey = getActiveDayKey()) {
  const normalized = callDateKeyFromValue(dayKey);
  const isToday = normalized === todayCallDateKey();
  const events = dayEvents(normalized);
  const startEvent = events.find(e => e.type === 'shift' && /iniciado/i.test(e.title || ''));
  const endEvent = events.find(e => e.type === 'shift' && /terminado/i.test(e.title || ''));
  let start = startEvent ? new Date(startEvent.ts) : null;
  let end = endEvent ? new Date(endEvent.ts) : null;
  let estimated = false;

  // Turno que cruza la medianoche: también pertenece a este día si empezó ayer y cerró hoy.
  const belongsToToday = isToday && !!state.shiftStartedAt && (
    !state.shiftEndedAt ||
    sameCallDay(state.shiftStartedAt, normalized) ||
    sameCallDay(state.shiftEndedAt, normalized)
  );
  if (belongsToToday) {
    start = new Date(state.shiftStartedAt);
    // Con el turno actual aún abierto, `end` debe quedar en null y no caer al evento de cierre
    // anterior del mismo día.
    end = state.shiftEndedAt ? new Date(state.shiftEndedAt) : null;
  }

  // Reconciliar el inicio contra la primera llamada del día completo podía cruzar hacia atrás un
  // turno anterior del mismo día.
  let priorShiftEndBoundary = null;
  if (start) {
    const priorEndEvent = events.find(e => e.type === 'shift' && /terminado/i.test(e.title || '') && new Date(e.ts).getTime() < start.getTime());
    if (priorEndEvent) priorShiftEndBoundary = new Date(priorEndEvent.ts);
  }

  // Reconciliación con llamadas reales solo para límites automáticos. Un inicio/fin manual no se
  // mueve por haber tomado una llamada extra antes o después del turno.
  if (start || end) {
    const dayCalls = callsForDay(normalized);
    if (dayCalls.length) {
      const ordered = [...dayCalls].sort((a, b) => new Date(a.startISO) - new Date(b.startISO));
      const relevantForStart = priorShiftEndBoundary
        ? ordered.filter(c => new Date(c.startISO).getTime() >= priorShiftEndBoundary.getTime())
        : ordered;
      const firstCallStart = relevantForStart.length ? new Date(relevantForStart[0].startISO) : null;
      const lastCallEnd = new Date(ordered[ordered.length - 1].endISO);
      const startIsAutomatic = !startEvent || String(startEvent.meta || '').toLowerCase() === 'auto';
      const endIsAutomatic = !endEvent || String(endEvent.meta || '').toLowerCase() === 'auto';
      if (startIsAutomatic && start && firstCallStart && firstCallStart.getTime() < start.getTime()) start = firstCallStart;
      if (endIsAutomatic && end && lastCallEnd.getTime() > end.getTime()) end = lastCallEnd;
    }
  }

  // Fallback: no hay ningún shift real registrado ese día (ni click de "Iniciar shift" ni evento en
  // el log) pero sí hay llamadas importadas.
  if (!start) {
    const dayCalls = callsForDay(normalized);
    if (dayCalls.length) {
      const ordered = [...dayCalls].sort((a, b) => new Date(a.startISO) - new Date(b.startISO));
      start = new Date(ordered[0].startISO);
      const lastCallEnd = new Date(ordered[ordered.length - 1].endISO);
      if (!isToday) {
        end = lastCallEnd;
      } else {
        const inactivityMin = (new Date().getTime() - lastCallEnd.getTime()) / 60000;
        if (inactivityMin > CONNECTED_LIVE_GRACE_MIN) end = lastCallEnd;
      }
      estimated = true;
    }
  }

  // Turno que arrancó este día pero se cerró en uno posterior: el fin se estima con la última
  // llamada real.
  if (!isToday && start && !end) {
    const dayCalls = callsForDay(normalized);
    if (dayCalls.length) {
      const ordered = [...dayCalls].sort((a, b) => new Date(a.startISO) - new Date(b.startISO));
      const lastCallEnd = new Date(ordered[ordered.length - 1].endISO);
      if (lastCallEnd.getTime() > start.getTime()) {
        end = lastCallEnd;
        estimated = true;
      }
    }
  }

  return {
    start,
    end,
    // 'live' unifica el caso de shift real activo y el estimado de hoy: hay inicio, es hoy, y
    // todavía no hay un fin (ni real ni congelado por inactividad).
    live: isToday && !!start && !end,
    estimated,
  };
}

// DayShiftBounds solo reconstruye el turno MÁS RECIENTE del día (usa `.find` sobre state.events,
// que con `unshift` deja los eventos más nuevos primero).
function dayShiftSessions(dayKey = getActiveDayKey()) {
  const normalized = callDateKeyFromValue(dayKey);
  const isToday = normalized === todayCallDateKey();

  // El cruce de medianoche se detecta con los eventos del día anterior, no con el turno global
  // actual.
  const prevDayKey = todayCallDateKey(previousCalendarDay(callDateToDate(normalized) || new Date()));
  const combinedEvents = [...dayEvents(prevDayKey), ...dayEvents(normalized)]
    .filter(e => e && e.type === 'shift' && (/iniciado/i.test(e.title || '') || /terminado/i.test(e.title || '')))
    .map(e => ({ ts: new Date(e.ts), isStart: /iniciado/i.test(e.title || '') }))
    .sort((a, b) => a.ts.getTime() - b.ts.getTime());

  const allSessions = [];
  let openStart = null;
  combinedEvents.forEach(ev => {
    if (ev.isStart) {
      if (!openStart) openStart = ev.ts;
    } else if (openStart) {
      allSessions.push({ start: openStart, end: ev.ts, live: false });
      openStart = null;
    }
  });

  if (openStart) {
    const matchesActiveShift = state.shiftStartedAt && !state.shiftEndedAt && Date.parse(state.shiftStartedAt) === openStart.getTime();
    if ((isToday || matchesActiveShift) && !state.shiftEndedAt) {
      // El turno activo conserva su día contable después de medianoche.
      allSessions.push({ start: openStart, end: new Date(), live: true });
    } else if (!isToday) {
      // Turno de un día pasado que nunca se cerró — estimar fin desde la última llamada real de ese
      // día (mismo fallback que dayShiftBounds).
      const dayCallsForOrphan = callsForDay(normalized);
      if (dayCallsForOrphan.length) {
        const orderedOrphan = [...dayCallsForOrphan].sort((a, b) => new Date(a.startISO) - new Date(b.startISO));
        const lastCallEnd = new Date(orderedOrphan[orderedOrphan.length - 1].endISO);
        if (lastCallEnd.getTime() > openStart.getTime()) {
          allSessions.push({ start: openStart, end: lastCallEnd, live: false });
        }
      }
      // Sin llamadas para estimar: se descarta esta sesión huérfana — ver nota de "limitación
      // conocida" arriba.
    }
    // (isToday && state.shiftEndedAt): estado inconsistente raro — se descarta en vez de inventar
    // un cierre.
  }

  // Se filtran solo las sesiones que de verdad tocan `normalized` — las que arrancan ese día, o las
  // que TERMINAN ese día (cubre el cruce de medianoche desde `prevDayKey`).
  const sessions = allSessions.filter(s => dateKey(s.start) === normalized || dateKey(s.end) === normalized);

  if (sessions.length) {
    // Una llamada antes de entrar o después de salir es trabajo real, pero no debe reescribir el
    // checkpoint de Entrada/Salida que el usuario marcó con los controles del turno. Las sesiones
    // explícitas mandan; el fallback por llamadas se usa solo cuando no existe ninguna sesión.
    return sessions;
  }

  // Fallback total: sin ningún evento de shift ni turno global vigente ese día — mismo estimado que
  // ya usa dayShiftBounds (primera/última llamada real).
  const bounds = dayShiftBounds(normalized);
  if (!bounds.start) return [];
  const end = bounds.end || (bounds.live ? new Date() : bounds.start);
  return [{ start: bounds.start, end, live: bounds.live }];
}

function workStartForConnection(connectionStart, sessionEnd = new Date()) {
  const dayKey = todayCallDateKey(connectionStart);
  const manual = dayEvents(dayKey).some(event => event.type === 'shift' && /iniciado/i.test(event.title || '') &&
    Date.parse(event.ts) === connectionStart.getTime() && String(event.meta || '').toLowerCase() === 'manual');
  if (manual) return new Date(connectionStart);
  const windowFor = key => {
    const cfg = dayConfigFor(key), forced = getDayNote(key)?.forcedStatus;
    if (!cfg || forced === 'off' || (cfg.off && forced !== 'work')) return null;
    const base = callDateToDate(key);
    if (!base) return null;
    const start = dateAtTime(base, formatHHMM(cfg.start)), end = dateAtTime(base, formatHHMM(cfg.end));
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return null;
    if (end <= start) end.setDate(end.getDate() + 1);
    return { start, end };
  };
  const previousKey = todayCallDateKey(previousCalendarDay(connectionStart));
  const previous = windowFor(previousKey);
  const planned = previous && previous.start <= connectionStart && previous.end > connectionStart
    ? previous : windowFor(dayKey);
  if (!planned) return new Date(connectionStart);
  let start = Math.max(connectionStart.getTime(), planned.start.getTime());
  const evidence = [...calls, ...(state.activeCall ? [state.activeCall] : [])];
  for (const call of evidence) {
    const from = Date.parse(call.startISO || call.startedAt), to = Date.parse(call.endISO || new Date().toISOString());
    if (Number.isFinite(from) && Number.isFinite(to) && to > connectionStart.getTime() && from <= sessionEnd.getTime() &&
        from < planned.start.getTime() && (to > from || (call === state.activeCall && to === from))) start = Math.min(start, Math.max(connectionStart.getTime(), from));
  }
  return new Date(start);
}

function dayWorkSessions(dayKey = getActiveDayKey()) {
  return dayShiftSessions(dayKey).map(session => ({ ...session, connectionStart: session.start, start: workStartForConnection(session.start, session.end) }))
    .filter(session => session.end > session.start || (session.live && session.end.getTime() === session.start.getTime()));
}

function dayWorkBounds(dayKey = getActiveDayKey()) {
  const bounds = dayShiftBounds(dayKey);
  if (!bounds.start) return bounds;
  const start = workStartForConnection(bounds.start, bounds.end || new Date());
  if (bounds.end && bounds.end < start) return { ...bounds, start: null, live: false };
  return { ...bounds, start, live: bounds.live && new Date() >= start };
}

function workingMinutesForDay(dayKey = getActiveDayKey()) {
  const base = callDateToDate(dayKey);
  if (!base) return 0;
  const end = new Date(base); end.setDate(end.getDate() + 1);
  const sessions = dayWorkSessions(dayKey).map(session => ({
    start: new Date(Math.max(base.getTime(), session.start.getTime())), end: new Date(Math.min(end.getTime(), session.end.getTime())),
  }));
  callsForDay(dayKey).forEach(call => sessions.push({
    start: new Date(Math.max(base.getTime(), Date.parse(call.startISO))), end: new Date(Math.min(end.getTime(), Date.parse(call.endISO))),
  }));
  return mergeIntervals(sessions).reduce((total, session) => total + (session.end - session.start) / 60000, 0);
}

function sessionsToPresenceIntervals(sessions, normalizedDayKey) {
  const minuteOfDay = (date) => date.getHours() * 60 + date.getMinutes();
  return sessions.map(s => {
    const startMin = dateKey(s.start) === normalizedDayKey ? minuteOfDay(s.start) : 0;
    const endMin = dateKey(s.end) === normalizedDayKey ? minuteOfDay(s.end) : 1440;
    return { startMin, endMin };
  }).filter(iv => iv.endMin > iv.startMin);
}

// Una llamada real implica presencia aunque haya ocurrido antes de dar "Iniciar shift" o después de
// haber marcado "Finalizar shift". Se suma como presencia SOLO durante la llamada; no reescribe los
// checkpoints manuales de Entrada/Salida ni inventa un turno completo alrededor de ella.
function callPresenceIntervalsForDay(dayKey) {
  const normalized = callDateKeyFromValue(dayKey);
  const base = callDateToDate(normalized);
  if (!normalized || !base) return [];
  const dayStart = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, 0, 0, 0).getTime();
  const dayEnd = new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1, 0, 0, 0, 0).getTime();
  return callsForDay(normalized).map(call => {
    const start = new Date(call.startISO).getTime();
    const end = new Date(call.endISO).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
    const clippedStart = Math.max(start, dayStart);
    const clippedEnd = Math.min(end, dayEnd);
    if (clippedEnd <= clippedStart) return null;
    const startDate = new Date(clippedStart);
    const endDate = new Date(clippedEnd);
    const startMin = clippedStart === dayStart ? 0 : startDate.getHours() * 60 + startDate.getMinutes();
    const endMin = clippedEnd === dayEnd ? 1440 : endDate.getHours() * 60 + endDate.getMinutes();
    return { startMin, endMin };
  }).filter(Boolean);
}

function presenceIntervalsForDay(dayKey, sessions, rangeEnd = 1440) {
  const normalized = callDateKeyFromValue(dayKey);
  if (rangeEnd > 1440) {
    const base = callDateToDate(normalized);
    if (!base) return [];
    return [...sessions, ...calls.map(call => ({ start: new Date(call.startISO), end: new Date(call.endISO) }))]
      .map(interval => ({ startMin: Math.max(0, Math.floor((interval.start - base) / 60000)),
        endMin: Math.min(rangeEnd, Math.floor((interval.end - base) / 60000)) }))
      .filter(interval => interval.endMin > interval.startMin);
  }
  return [...sessionsToPresenceIntervals(sessions, normalized), ...callPresenceIntervalsForDay(normalized)];
}

// El rango diario conserva su recorte; un plan nocturno puede incluir minutos del día siguiente.
function pauseIntervalsToMinuteRanges(pauses, normalizedDayKey, rangeEnd = 1440) {
  if (rangeEnd > 1440) {
    const base = callDateToDate(normalizedDayKey);
    if (!base) return [];
    return pauses.map(p => ({ type: p.type, startMin: Math.max(0, Math.floor((p.start - base) / 60000)),
      endMin: Math.min(rangeEnd, Math.floor((p.end - base) / 60000)) })).filter(interval => interval.endMin > interval.startMin);
  }
  return pauses.map(p => {
    const startMin = dateKey(p.start) === normalizedDayKey ? p.start.getHours() * 60 + p.start.getMinutes() : 0;
    const endMin = dateKey(p.end) === normalizedDayKey ? p.end.getHours() * 60 + p.end.getMinutes() : 1440;
    return { type: p.type, startMin, endMin };
  }).filter(iv => iv.endMin > iv.startMin);
}

// Usa dayShiftSessions (todas las sesiones del día), no solo la más reciente.
export function connectedMinutesForDay(dayKey = getActiveDayKey()) {
  // Sesiones explícitas + llamadas fuera de esas sesiones. Las llamadas se agregan como intervalos
  // reales de presencia y mergeIntervals evita contarlas doble cuando caen dentro de un turno.
  const normalized = callDateKeyFromValue(dayKey);
  const base = callDateToDate(normalized);
  const dayStart = base ? new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, 0, 0, 0).getTime() : null;
  const dayEnd = base ? new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1, 0, 0, 0, 0).getTime() : null;
  if (dayStart === null || dayEnd === null) return 0;

  const intervals = dayShiftSessions(normalized).map(session => ({
    start: new Date(Math.max(session.start.getTime(), dayStart)),
    end: new Date(Math.min((session.live ? new Date() : session.end).getTime(), dayEnd)),
  }));
  callsForDay(normalized).forEach(call => {
    const start = new Date(call.startISO).getTime();
    const end = new Date(call.endISO).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return;
    const from = Math.max(start, dayStart);
    const to = Math.min(end, dayEnd);
    if (to > from) intervals.push({ start: new Date(from), end: new Date(to) });
  });

  return mergeIntervals(intervals).reduce((total, interval) => total + (interval.end.getTime() - interval.start.getTime()) / 60000, 0);
}

export function productiveMinutesForDay(dayKey = getActiveDayKey()) {
  return importedCallStats(callsForDay(dayKey), dayKey).productive;
}

function manualGapPauseIntervals(dayKey, type) {
  const normalized = callDateKeyFromValue(dayKey);
  return dayGapRows(normalized)
    .filter(row => row.manual && row.label === type && row.raw > 0)
    .map(row => ({ type, startedAt: row.prev.endISO, endedAt: row.cur.startISO, source: 'gap', gapKey: row.gapKey }));
}

// Las pausas reales conservan su tipo; una clasificación manual sólo agrega los minutos
// restantes. Fusionar por tipo evita duplicar una pausa confirmada sobre el mismo hueco.
function dayPausesForSlotStats(dayKey) {
  const normalized = callDateKeyFromValue(dayKey);
  const byType = {};
  const push = (type, startedAt, endedAt) => {
    const t = String(type || '').toLowerCase();
    (byType[t] = byType[t] || []).push({ type: t, startedAt, endedAt });
  };
  const real = dayPauseIntervals(normalized);
  real.forEach(p => push(p.type, p.start.toISOString(), p.end.toISOString()));
  ['break', 'lunch'].forEach(t => manualGapPauseIntervals(normalized, t).forEach(p => {
    let segments = [{start: new Date(p.startedAt), end: new Date(p.endedAt)}];
    real.filter(pause => pause.type !== t).forEach(pause => {
      segments = segments.flatMap(segment => {
        if (pause.end <= segment.start || pause.start >= segment.end) return [segment];
        const pieces = [];
        if (pause.start > segment.start) pieces.push({start:segment.start,end:pause.start});
        if (pause.end < segment.end) pieces.push({start:pause.end,end:segment.end});
        return pieces;
      });
    });
    segments.forEach(segment => push(t, segment.start.toISOString(), segment.end.toISOString()));
  }));
  const out = [];
  Object.keys(byType).forEach(t => {
    mergeOverlappingPauseEntries(byType[t]).forEach(p => out.push({ type: t, start: new Date(p.startedAt), end: new Date(p.endedAt) }));
  });
  return out;
}

// El motor de Adherencia minuto a minuto (computeMinuteAdherence, vía dayPauseIntervals) solo
// conocía pausas REALES tomadas con el botón.
function subtractCallsFromPauseInterval(interval, dayKey) {
  const normalized = callDateKeyFromValue(dayKey);
  let segments = [{ start: new Date(interval.start), end: new Date(interval.end) }]
    .filter(seg => Number.isFinite(seg.start.getTime()) && Number.isFinite(seg.end.getTime()) && seg.end > seg.start);

  const dayCalls = [...callsForDay(normalized)]
    .map(call => ({ start: new Date(call.startISO), end: new Date(call.endISO) }))
    .filter(call => Number.isFinite(call.start.getTime()) && Number.isFinite(call.end.getTime()) && call.end > call.start)
    .sort((a, b) => a.start - b.start);

  dayCalls.forEach(call => {
    segments = segments.flatMap(seg => {
      if (call.end <= seg.start || call.start >= seg.end) return [seg];
      const pieces = [];
      if (call.start > seg.start) pieces.push({ start: seg.start, end: new Date(Math.min(call.start.getTime(), seg.end.getTime())) });
      if (call.end < seg.end) pieces.push({ start: new Date(Math.max(call.end.getTime(), seg.start.getTime())), end: seg.end });
      return pieces.filter(piece => piece.end > piece.start);
    });
  });

  return segments.map(seg => ({ ...seg, type: interval.type }));
}

function pauseDurationExcludingCalls(startedAt, endedAt, dayKey) {
  const start = new Date(startedAt);
  const end = new Date(endedAt);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return 0;
  return subtractCallsFromPauseInterval({ type: 'pause', start, end }, dayKey)
    .reduce((sum, segment) => sum + Math.max(0, (segment.end - segment.start) / 60000), 0);
}

function actualPauseIntervalsForDay(dayKey) {
  const normalized = callDateKeyFromValue(dayKey);
  return dayPausesForSlotStats(normalized)
    .flatMap(interval => subtractCallsFromPauseInterval(interval, normalized));
}

// Empareja cada slot planeado (Break 1, Break 2, Lunch...) con la pausa REAL más cercana en el
// tiempo, de forma 1:1 (greedy por distancia).
function mergeOverlappingPauseEntries(history) {
  const withTimes = history
    .map(h => ({ ...h, _s: new Date(h.startedAt).getTime(), _e: new Date(h.endedAt).getTime() }))
    .sort((a, b) => a._s - b._s);
  const merged = [];
  for (const cur of withTimes) {
    const last = merged[merged.length - 1];
    if (last && cur._s < last._e) {
      if (cur._e > last._e) { last.endedAt = cur.endedAt; last._e = cur._e; }
    } else {
      merged.push({ ...cur });
    }
  }
  return merged.map(({ _s, _e, ...rest }) => rest);
}

function pauseAssignmentCache(dayKey, type) {
  const normalized = callDateKeyFromValue(dayKey);
  const base = callDateToDate(normalized) || new Date();

  const rawHistory = dayPausesForSlotStats(normalized)
    .filter(p => p.type === type)
    .map(p => ({type:p.type,startedAt:p.start.toISOString(),endedAt:p.end.toISOString()}));

  // Fusiona duplicados traslapados (ver mergeOverlappingPauseEntries) ANTES de emparejar contra los
  // slots — así una pausa real + un hueco manual clasificado encima cuentan como UNA sola
  // ocurrencia, no dos.
  const history = mergeOverlappingPauseEntries(rawHistory).map(p => ({
    ...p,
    effectiveDurationMin: pauseDurationExcludingCalls(p.startedAt, p.endedAt, normalized),
  }));

  // Se usa el horario EFECTIVO: buildPlannedSlots en crudo ignora el corrimiento de lateArrivalMode
  // === 'shift'.
  const matchingSlots = getEffectiveScheduleForDay(normalized).filter(s => s.type.toLowerCase() === type);
  const assignment = new Array(matchingSlots.length).fill(null);
  if (!history.length || !matchingSlots.length) return { matchingSlots, assignment };

  const slotStarts = matchingSlots.map(s => {
    const start = dateAtTime(base, s.start);
    start.setDate(start.getDate() + Math.floor((s.startMin ?? 0) / 1440));
    return start.getTime();
  });
  const pairs = [];
  matchingSlots.forEach((s, si) => {
    history.forEach((p, pi) => {
      const dist = Math.abs(new Date(p.startedAt).getTime() - slotStarts[si]);
      // Cota de distancia: no se fuerza el emparejamiento si quedan a más de
      // PAUSE_SLOT_MAX_DISTANCE_MIN minutos.
      if (dist > PAUSE_SLOT_MAX_DISTANCE_MIN * 60000) return;
      pairs.push({ si, pi, dist });
    });
  });
  pairs.sort((a, b) => a.dist - b.dist);

  const usedSlots = new Set();
  const usedPauses = new Set();
  for (const pair of pairs) {
    if (usedSlots.has(pair.si) || usedPauses.has(pair.pi)) continue;
    assignment[pair.si] = history[pair.pi];
    usedSlots.add(pair.si);
    usedPauses.add(pair.pi);
  }

  return { matchingSlots, assignment };
}

function pauseForSlot(slot, dayKey = getActiveDayKey()) {
  if (slot.type === 'Work') return null;
  const desiredType = String(slot.type).toLowerCase();
  const normalized = callDateKeyFromValue(dayKey);
  const { matchingSlots, assignment } = pauseAssignmentCache(normalized, desiredType);
  const slotIndex = matchingSlots.findIndex(s => s.start === slot.start && s.end === slot.end);
  if (slotIndex === -1) return null;
  return assignment[slotIndex] || null;
}

function slotStats(slot, dayCalls = calls, dayPauses = dayPauseIntervals(getActiveDayKey()), shiftStart = null, shiftEnd = null, dayKey = getActiveDayKey(), extendStart = null, extendEnd = null) {
  const base = callDateToDate(dayKey) || new Date();
  const slotStart = dateAtTime(base, slot.start);
  const slotEnd = dateAtTime(base, slot.end);
  slotStart.setDate(slotStart.getDate() + Math.floor((slot.startMin ?? 0) / 1440));
  slotEnd.setDate(slotEnd.getDate() + Math.floor((slot.endMin ?? 0) / 1440));
  if (slotEnd <= slotStart) slotEnd.setDate(slotEnd.getDate() + 1);
  const durationMin = Math.max(0, (slotEnd.getTime() - slotStart.getTime()) / 60000);
  const sortedCalls = [...dayCalls].sort((a, b) => new Date(a.startISO) - new Date(b.startISO));

  // El tiempo de llamadas en "Bloques del día" no coincidía con "Tiempo llamadas" de Ganancias de
  // hoy. Causa: este cálculo solo contaba llamadas dentro de [slotStart, slotEnd] — la ventana
  // PLANEADA del bloque.
  const callWindowStart = (extendStart && extendStart.getTime() < slotStart.getTime()) ? extendStart : slotStart;
  const callWindowEnd = (extendEnd && extendEnd.getTime() > slotEnd.getTime()) ? extendEnd : slotEnd;

  let callMin = 0;
  let acwMin = 0;
  let pauseMin = 0;
  // Minutos de llamadas que SÍ cuentan como productivas (billable=Yes y dropped=No, mismo criterio
  // que countsAsProductive en parseCalls/ importedCallStats), traslapadas con la ventana del slot.
  let productiveCallMin = 0;
  // Una pausa de Lunch que empieza dentro de la ventana de un Break no debe contarse como uso de
  // ese Break.
  let pauseMinSameType = 0;
  const slotTypeLower = String(slot.type || '').toLowerCase();

  for (const c of sortedCalls) {
    const overlap = overlapMinutes(callWindowStart, callWindowEnd, new Date(c.startISO), new Date(c.endISO));
    callMin += overlap;
    if (c.countsAsProductive !== false) productiveCallMin += overlap;
  }

  for (let i = 1; i < sortedCalls.length; i++) {
    const prevEnd = new Date(sortedCalls[i - 1].endISO);
    const curStart = new Date(sortedCalls[i].startISO);
    if (curStart > prevEnd) acwMin += overlapMinutes(callWindowStart, callWindowEnd, prevEnd, curStart);
  }

  // El lapso entre "Iniciar shift" y la primera llamada del día no se contaba como ACW en NINGÚN
  // lado.
  if (shiftStart && sortedCalls.length) {
    const firstCallStart = new Date(sortedCalls[0].startISO);
    if (shiftStart.getTime() < firstCallStart.getTime()) {
      acwMin += overlapMinutes(callWindowStart, callWindowEnd, shiftStart, firstCallStart);
    }
  }

  // Intervalos de llamadas reales, sin recortar a la ventana del slot, para poder restarle a cada
  // pausa SOLO la porción que ya coincide con una llamada real.
  const callIntervalsForNetting = sortedCalls.map(c => ({ start: new Date(c.startISO), end: new Date(c.endISO) }));

  for (const p of dayPauses) {
    const overlapStart = new Date(Math.max(slotStart.getTime(), p.start.getTime()));
    const overlapEnd = new Date(Math.min(slotEnd.getTime(), p.end.getTime()));
    if (overlapEnd <= overlapStart) continue;
    const rawOverlap = (overlapEnd.getTime() - overlapStart.getTime()) / 60000;
    // Un break/lunch cerrado tarde se solapa con llamadas reales: esa porción no se cuenta dos
    // veces.
    const callCoverage = overlapMinutesWithIntervals(overlapStart, overlapEnd, callIntervalsForNetting);
    const netOverlap = Math.max(0, rawOverlap - callCoverage);
    pauseMin += netOverlap;
    if (p.type === slotTypeLower) pauseMinSameType += netOverlap;
  }

  const workUsed = Math.max(0, Math.min(durationMin, callMin + acwMin - pauseMin));
  const pauseUsed = Math.max(0, Math.min(durationMin, pauseMinSameType));
  const filledMin = slot.type === 'Work' ? workUsed : pauseUsed;
  const pct = durationMin > 0 ? Math.min(100, (filledMin / durationMin) * 100) : 0;

  // Reemplaza el viejo ratio global de "Margen" por una Meta de Productividad EN MINUTOS,
  // configurable POR BLOQUE de Trabajo (`slot.goalMin`, ver buildPlannedSlots/el editor de bloques
  // en Horario).
  let productivityGoal = null;
  if (slot.type === 'Work') {
    const goalMinConfigured = Number(slot.goalMin) || 0;
    if (goalMinConfigured > 0) {
      const pct = Math.min(100, (productiveCallMin / goalMinConfigured) * 100);
      productivityGoal = {
        goalMin: goalMinConfigured,
        achievedMin: productiveCallMin,
        pct,
        met: productiveCallMin >= goalMinConfigured - 0.05,
      };
    }
  }

  // Barra de Productividad dentro de cada bloque de Trabajo — % de la duración planeada del bloque
  // que fue tiempo de llamada productiva (productiveCallMin, ya calculado arriba).
  const productivityPct = slot.type === 'Work'
    ? (durationMin > 0 ? Math.min(100, (productiveCallMin / durationMin) * 100) : 0)
    : null;

  const now = new Date();
  const actualPause = pauseForSlot(slot, dayKey);
  let actualPauseRange = null;
  if (actualPause) {
    const aStart = new Date(actualPause.startedAt);
    const aEnd = actualPause.endedAt ? new Date(actualPause.endedAt) : null;
    actualPauseRange = {
      start: aStart,
      end: aEnd,
      live: !aEnd,
      durationMin: ((aEnd || now).getTime() - aStart.getTime()) / 60000,
    };
  }

  // Igual que Break/Lunch ya muestran la hora real de inicio/fin de la pausa (actualPauseRange),
  // los slots de Trabajo deben mostrar la hora real en que empezó/terminó la actividad de llamadas
  // dentro de esa ventana.
  let realActivityRange = null;
  if (slot.type === 'Work') {
    const overlappingCalls = sortedCalls.filter(c => {
      const cs = new Date(c.startISO);
      const ce = new Date(c.endISO);
      return ce > callWindowStart && cs < callWindowEnd;
    });
    if (overlappingCalls.length) {
      const starts = overlappingCalls.map(c => new Date(c.startISO).getTime());
      const ends = overlappingCalls.map(c => new Date(c.endISO).getTime());
      realActivityRange = {
        start: new Date(Math.min(...starts)),
        end: new Date(Math.max(...ends)),
        callCount: overlappingCalls.length,
      };
    }
  }

  let status = translateText('Pendiente');
  let statusTone = 'muted';
  let detail = slot.type === 'Work'
    ? ui`Usado ${formatDuration(workUsed * 60000)} · ${formatDuration(callMin * 60000)} llamadas · ${formatDuration(acwMin * 60000)} ACW${pauseMin ? ui` · ${formatDuration(pauseMin * 60000)} pausa` : ''}`
    : ui`Usado ${formatDuration(pauseUsed * 60000)} de ${formatDuration(durationMin * 60000)}`;

  if (slot.type === 'Work') {
    const startDelta = shiftStart ? (shiftStart.getTime() - slotStart.getTime()) / 60000 : null;
    const endDelta = shiftEnd ? (shiftEnd.getTime() - slotEnd.getTime()) / 60000 : null;

    if (!shiftStart) {
      status = translateText('Sin shift');
    } else if (shiftStart > slotEnd) {
      status = translateText('Omitido');
      statusTone = 'bad';
    } else if (startDelta !== null && startDelta > 1) {
      status = ui`Entrada tarde ${formatDeltaMinutes(startDelta)}`;
      statusTone = 'warn';
    } else if (endDelta !== null && endDelta < -1) {
      status = ui`Salida temprana -${formatMinutes(Math.abs(endDelta))}m`;
      statusTone = 'warn';
    } else if (dayKey === todayCallDateKey() && !state.shiftEndedAt && now >= slotStart && now < slotEnd) {
      status = translateText('En curso');
      statusTone = 'good';
    } else if (pct >= 95) {
      status = translateText('Completo');
      statusTone = 'good';
    } else if (filledMin > 0) {
      status = translateText('Parcial');
      statusTone = 'warn';
    } else {
      // Un bloque de Trabajo ya pasado y sin actividad no es "Pendiente": se marca "Sin actividad".
      const isPastSlot = dayKey === todayCallDateKey() ? now >= slotEnd : !!(shiftEnd && shiftEnd >= slotEnd);
      status = isPastSlot ? translateText('Sin actividad') : translateText('Pendiente');
      statusTone = 'muted';
    }
  } else if (actualPause) {
    const actualStart = actualPauseRange.start;
    const actualEnd = actualPauseRange.end || now;
    const startDelta = (actualStart.getTime() - slotStart.getTime()) / 60000;
    const endDelta = (actualEnd.getTime() - slotEnd.getTime()) / 60000;
    const parts = [];
    if (startDelta > 1) {
      parts.push(ui`Tarde ${formatDeltaMinutes(startDelta)}`);
      statusTone = 'warn';
    } else if (startDelta < -1) {
      parts.push(ui`Antes -${formatMinutes(Math.abs(startDelta))}m`);
      statusTone = 'warn';
    } else {
      parts.push(translateText('A tiempo'));
      statusTone = 'good';
    }
    if (endDelta > 1) {
      parts.push(ui`+${formatMinutes(endDelta)}m extra`);
      statusTone = 'warn';
    } else if (endDelta < -1) {
      parts.push(ui`-${formatMinutes(Math.abs(endDelta))}m menos`);
    }
    status = parts.join(' · ');
  } else if (now >= slotEnd) {
    status = slot.type === 'Lunch' ? translateText('Lunch no tomado') : translateText('Break no tomado');
    statusTone = 'bad';
  } else if (now >= slotStart && now < slotEnd) {
    status = ui`Pendiente`;
    statusTone = 'warn';
  }

  return { slotStart, slotEnd, callWindowStart, callWindowEnd, durationMin, callMin, acwMin, pauseMin, filledMin, pct, productivityPct, detail, status, statusTone, actualPauseRange, realActivityRange, productivityGoal };
}

// Adherencia: plan (horario semanal) vs real (lo que de verdad pasó)
const ADHERENCE_TOLERANCE_MIN = 5;
// Cada checkpoint da crédito parcial según qué tan cerca estuvo del plan, no todo-o-nada.
const ADHERENCE_FALLOFF_SHIFT_MIN = 60; // Entrada/Salida: 0% de crédito a partir de 60 min de diferencia.
const ADHERENCE_FALLOFF_PAUSE_MIN = 30; // Break/Lunch (inicio y duración): 0% de crédito a partir de 30 min de diferencia.
function adherenceProximityScore(deltaAbsMin, falloffMin) {
  if (!Number.isFinite(deltaAbsMin)) return 0;
  if (deltaAbsMin <= ADHERENCE_TOLERANCE_MIN) return 1;
  if (deltaAbsMin >= falloffMin) return 0;
  return 1 - (deltaAbsMin - ADHERENCE_TOLERANCE_MIN) / (falloffMin - ADHERENCE_TOLERANCE_MIN);
}

const EXCEPTION_REASON_LABELS = {
  ausente: translateText('Ausencia/llegada tarde'),
  break_extra: translateText('Break tomado fuera de horario'),
  lunch_extra: translateText('Lunch tomado fuera de horario'),
  break_perdido: translateText('Break no tomado a tiempo'),
  lunch_perdido: translateText('Lunch no tomado a tiempo'),
  lunch_encima_break: translateText('Lunch encima de tu Break'),
  break_encima_lunch: translateText('Break encima de tu Lunch'),
};

// Mapa planeado|real → motivo. Combinaciones no listadas (ej. algo fuera de cualquier slot
// planeado) no producen motivo — solo restan al total, igual que antes.
const EXCEPTION_REASON_MAP = {
  'work|none': 'ausente', 'work|break': 'break_extra', 'work|lunch': 'lunch_extra',
  'break|work': 'break_perdido', 'break|none': 'ausente', 'break|lunch': 'lunch_encima_break',
  'lunch|work': 'lunch_perdido', 'lunch|none': 'ausente', 'lunch|break': 'break_encima_lunch',
};

// Motivo dominante (el que más minutos acumuló) de un objeto `reasons` — para mostrar un solo
// motivo corto junto al %, en vez de la lista completa.
function dominantExceptionReason(reasons) {
  const entries = Object.entries(reasons || {}).filter(([, m]) => m > 0);
  if (!entries.length) return null;
  entries.sort((a, b) => b[1] - a[1]);
  const [key, minutes] = entries[0];
  return { key, minutes, label: EXCEPTION_REASON_LABELS[key] || key };
}

function computeMinuteAdherence({ plannedSlots, actualIntervals, presenceIntervals, rangeStart, rangeEnd, graceMin }) {
  if (!(rangeEnd > rangeStart)) return null; // Sin minutos medibles todavía.

  function plannedStateAt(m) {
    for (const s of plannedSlots) if (m >= s.startMin && m < s.endMin) return s.type;
    return 'none';
  }
  // Recibe varios intervalos de presencia: un día puede tener más de una sesión de turno.
  function isPresent(m) {
    return presenceIntervals.some(iv => m >= iv.startMin && m < iv.endMin);
  }
  function actualStateAt(m) {
    if (!isPresent(m)) return 'none';
    for (const p of actualIntervals) if (m >= p.startMin && m < p.endMin) return p.type;
    return 'work'; // No estás en Break/Lunch → disponible/trabajando (no exige estar en llamada activa)
  }

  const transitions = [];
  plannedSlots.forEach(s => { transitions.push(s.startMin); transitions.push(s.endMin); });

  let total = 0;
  let exceptionMinutes = 0;
  const reasons = {};
  for (let m = rangeStart; m < rangeEnd; m++) {
    const planned = plannedStateAt(m);
    if (planned === 'none') continue;
    total++;
    const actual = actualStateAt(m);
    if (planned === actual) continue;
    const nearTransition = transitions.some(t => Math.abs(m - t) <= graceMin);
    if (nearTransition) continue; // Perdonado por la ventana de gracia.
    exceptionMinutes++;
    const reasonKey = EXCEPTION_REASON_MAP[`${planned}|${actual}`];
    if (reasonKey) reasons[reasonKey] = (reasons[reasonKey] || 0) + 1;
  }

  const adherentMinutes = total - exceptionMinutes;
  const pct = total > 0 ? Math.round((adherentMinutes / total) * 100) : 100;
  return { total, exceptionMinutes, adherentMinutes, pct, reasons };
}

// Slots planeados ORIGINALES (sin correr, ver decisión de diseño arriba) para un día — aplica el
// mismo ajuste que getEffectiveScheduleForDay para "día libre trabajado" (dayIsEffectivelyOff)
function originalPlannedSlotsForDay(dayKey) {
  const cfg = dayConfigFor(dayKey);
  const effectiveCfg = (cfg && cfg.off && !dayIsEffectivelyOff(dayKey)) ? { ...cfg, off: false } : cfg;
  return buildPlannedSlots(effectiveCfg);
}

function plannedMinuteSlots(slots) {
  return slots.map(slot => ({ type: slot.type.toLowerCase(), startMin: slot.startMin ?? toMinutes(slot.start), endMin: slot.endMin ?? toMinutes(slot.end) }));
}

// Arma los inputs de computeMinuteAdherence a partir del estado real de la app para un día dado —
// separado de dayAdherence para poder probarse (y reutilizarse) sin depender de todo el flujo de
// checkpoints.
function minuteAdherenceForDay(dayKey, sessions) {
  const normalized = callDateKeyFromValue(dayKey);
  const isToday = normalized === todayCallDateKey();
  // Recibe todas las sesiones del día: con 2+ sesiones el hueco entre ellas debe contar como
  // ausencia, no como trabajo.
  if (!sessions.length && isToday) return null;

  const plannedRaw = originalPlannedSlotsForDay(normalized);
  if (!plannedRaw.length) return null;

  const plannedSlots = plannedMinuteSlots(plannedRaw);
  const rangeStart = plannedSlots[0].startMin;
  const lastSlotEnd = plannedSlots[plannedSlots.length - 1].endMin;
  const base = callDateToDate(normalized) || new Date();
  const minuteOfDay = date => Math.floor((date - base) / 60000);
  const actualIntervals = pauseIntervalsToMinuteRanges(actualPauseIntervalsForDay(normalized), normalized, lastSlotEnd);
  const presenceIntervals = presenceIntervalsForDay(normalized, sessions, lastSlotEnd);
  const anySessionLive = sessions.some(s => s.live);
  const rangeEnd = anySessionLive ? Math.min(minuteOfDay(new Date()), lastSlotEnd) : lastSlotEnd;

  const graceMin = Number.isFinite(Number(settings.adherenceGraceMin)) && Number(settings.adherenceGraceMin) >= 0 ? Number(settings.adherenceGraceMin) : 3;
  return computeMinuteAdherence({ plannedSlots, actualIntervals, presenceIntervals, rangeStart, rangeEnd, graceMin });
}

// Saber si AHORA MISMO (este minuto) estás fuera de adherencia — para un indicador en vivo, no solo
// el % acumulado del día.
function isRightNowOutOfAdherence() {
  if (!state.shiftStartedAt || state.shiftEndedAt) return false;
  const dayKey = currentShiftAccountingDayKey();
  // Un día forzado a Libre desde "Editar día" (Resumen semanal) ya no exige Adherencia.
  if (dayIsEffectivelyOff(dayKey)) return false;
  const plannedRaw = originalPlannedSlotsForDay(dayKey);
  if (!plannedRaw.length) return false;

  const plannedSlots = plannedMinuteSlots(plannedRaw);
  const base = callDateToDate(dayKey) || new Date();
  const minuteOfDay = date => Math.floor((date - base) / 60000);
  const endMin = Math.max(1440, ...plannedSlots.map(slot => slot.endMin));
  const actualIntervals = pauseIntervalsToMinuteRanges(actualPauseIntervalsForDay(dayKey), dayKey, endMin);
  const realStartMin = sameCallDay(state.shiftStartedAt, dayKey) ? minuteOfDay(new Date(state.shiftStartedAt)) : 0;
  const nowMin = minuteOfDay(new Date());
  const graceMin = Number.isFinite(Number(settings.adherenceGraceMin)) && Number(settings.adherenceGraceMin) >= 0 ? Number(settings.adherenceGraceMin) : 3;
  const presenceIntervals = [{ startMin: realStartMin, endMin }];

  const result = computeMinuteAdherence({ plannedSlots, actualIntervals, presenceIntervals, rangeStart: nowMin, rangeEnd: nowMin + 1, graceMin });
  return !!(result && result.exceptionMinutes > 0);
}

// Cada bloque individual ("Bloques del día") lleva su PROPIA adherencia minuto a minuto, además
// (aparte) del % global de arriba (que sigue viniendo de minuteAdherenceForDay, sin cambios).
function slotMinuteAdherence(dayKey, originalSlot, sessions) {
  const normalized = callDateKeyFromValue(dayKey);
  const isToday = normalized === todayCallDateKey();
  // Un día forzado a Libre desde "Editar día" (Resumen semanal) ya no exige Adherencia.
  if (dayIsEffectivelyOff(normalized)) return null;
  // Recibe todas las sesiones del día (dayShiftSessions), no solo la más reciente.
  if (!sessions.length && isToday) return null;
  // Esta guarda solo cubría "hoy sin turno"
  const base = callDateToDate(normalized) || new Date();
  if (base > todayRange()) return null;

  const plannedRaw = originalPlannedSlotsForDay(normalized);
  if (!plannedRaw.length) return null;

  const plannedSlots = plannedMinuteSlots(plannedRaw);
  const minuteOfDay = date => Math.floor((date - base) / 60000);
  const lastSlotEnd = plannedSlots[plannedSlots.length - 1].endMin;

  const actualIntervals = pauseIntervalsToMinuteRanges(actualPauseIntervalsForDay(normalized), normalized, lastSlotEnd);
  const presenceIntervals = presenceIntervalsForDay(normalized, sessions, lastSlotEnd);

  const slotStartMin = originalSlot.startMin ?? toMinutes(originalSlot.start);
  const slotEndMin = originalSlot.endMin ?? toMinutes(originalSlot.end);
  const rangeStart = slotStartMin;
  const anySessionLive = sessions.some(s => s.live);
  const rangeEnd = anySessionLive ? Math.min(minuteOfDay(new Date()), slotEndMin) : slotEndMin;
  if (!(rangeEnd > rangeStart)) return null; // El bloque aún no empieza.

  const graceMin = Number.isFinite(Number(settings.adherenceGraceMin)) && Number(settings.adherenceGraceMin) >= 0 ? Number(settings.adherenceGraceMin) : 3;
  return computeMinuteAdherence({ plannedSlots, actualIntervals, presenceIntervals, rangeStart, rangeEnd, graceMin });
}

export function dayAdherence(dayKey) {
  const normalized = callDateKeyFromValue(dayKey);
  const cfg = dayConfigFor(normalized);
  // Un día "libre" con actividad real (llamadas o turno) sí se evalúa, no se salta.
  if (!cfg || dayIsEffectivelyOff(normalized)) return null;

  // Usa todas las sesiones del día: con 2+ sesiones, Entrada y Salida deben comparar contra la
  // primera y la última.
  const sessions = dayWorkSessions(normalized);
  const isToday = normalized === todayCallDateKey();
  const base = callDateToDate(normalized) || new Date();

  if (!sessions.length) {
    if (isToday) return null;
    if (base > todayRange()) return null;
    return { dayKey: normalized, checkpoints: [{ label: 'Turno', ok: false, score: 0, note: translateText('No se inició el turno') }], scorePct: 0 };
  }

  const checkpoints = [];
  const plannedStart = dateAtTime(base, formatHHMM(cfg.start));
  const firstSessionStart = sessions[0].start;
  const startDelta = (firstSessionStart.getTime() - plannedStart.getTime()) / 60000;
  checkpoints.push({
    label: 'Entrada',
    ok: Math.abs(startDelta) <= ADHERENCE_TOLERANCE_MIN,
    score: adherenceProximityScore(Math.abs(startDelta), ADHERENCE_FALLOFF_SHIFT_MIN),
    note: startDelta > ADHERENCE_TOLERANCE_MIN ? ui`Tarde ${formatDeltaMinutes(startDelta)}` : startDelta < -ADHERENCE_TOLERANCE_MIN ? ui`Temprano ${formatDeltaMinutes(startDelta)}` : translateText('A tiempo'),
  });

  // Se usa el horario EFECTIVO (getEffectiveScheduleForDay), no buildPlannedSlots(cfg) en crudo.
  // pauseForSlot empareja cada slot con su pausa real haciendo match exacto de start/end contra el
  // horario efectivo (ver pauseAssignmentCache)
  const planned = getEffectiveScheduleForDay(normalized);
  const lastSession = sessions[sessions.length - 1];

  if (!lastSession.live) {
    const effectiveEnd = planned.length ? planned[planned.length - 1].end : formatHHMM(cfg.end);
    const plannedEnd = dateAtTime(base, effectiveEnd);
    plannedEnd.setDate(plannedEnd.getDate() + Math.floor((planned.at(-1)?.endMin ?? 0) / 1440));
    if (plannedEnd <= plannedStart) plannedEnd.setDate(plannedEnd.getDate() + 1);
    const endDelta = (lastSession.end.getTime() - plannedEnd.getTime()) / 60000;
    checkpoints.push({
      label: 'Salida',
      ok: Math.abs(endDelta) <= ADHERENCE_TOLERANCE_MIN,
      score: adherenceProximityScore(Math.abs(endDelta), ADHERENCE_FALLOFF_SHIFT_MIN),
      note: endDelta < -ADHERENCE_TOLERANCE_MIN ? ui`Temprano ${formatDeltaMinutes(endDelta)}` : endDelta > ADHERENCE_TOLERANCE_MIN ? ui`Tarde +${formatMinutes(endDelta)}m` : translateText('A tiempo'),
    });
  } else if (!isToday && !(state.shiftStartedAt && !state.shiftEndedAt && sameCallDay(state.shiftStartedAt, normalized))) {
    // Día pasado sin hora de fin registrada ni llamadas para estimarla: cuenta como checkpoint
    // fallado.
    checkpoints.push({ label: 'Salida', ok: false, score: 0, note: translateText('No se registró la salida') });
  }

  for (const slot of planned) {
    if (slot.type === 'Work') continue;
    const slotStart = dateAtTime(base, slot.start);
    const slotEnd = dateAtTime(base, slot.end);
    slotStart.setDate(slotStart.getDate() + Math.floor((slot.startMin ?? 0) / 1440));
    slotEnd.setDate(slotEnd.getDate() + Math.floor((slot.endMin ?? 0) / 1440));
    if (slotEnd <= slotStart) slotEnd.setDate(slotEnd.getDate() + 1);
    const plannedDur = (slotEnd.getTime() - slotStart.getTime()) / 60000;
    const actual = pauseForSlot(slot, normalized);

    if (!actual) {
      const skip = lastSession.live && now_isBefore(slotEnd);
      if (skip) continue; // No penalizar una pausa futura del turno abierto.
      checkpoints.push({ label: slot.name, ok: false, score: 0, note: translateText('No tomado') });
      continue;
    }

    const aStart = new Date(actual.startedAt);
    const aEnd = new Date(actual.endedAt || new Date().toISOString());
    const startD = (aStart.getTime() - slotStart.getTime()) / 60000;
    const actualDurationMin = Number.isFinite(Number(actual.effectiveDurationMin))
      ? Number(actual.effectiveDurationMin)
      : (aEnd.getTime() - aStart.getTime()) / 60000;
    const durD = actualDurationMin - plannedDur;
    const ok = Math.abs(startD) <= ADHERENCE_TOLERANCE_MIN && Math.abs(durD) <= ADHERENCE_TOLERANCE_MIN;
    // Crédito parcial = promedio de qué tan cerca estuvo el inicio y qué tan cerca estuvo la
    // duración de lo planeado.
    const score = (adherenceProximityScore(Math.abs(startD), ADHERENCE_FALLOFF_PAUSE_MIN) + adherenceProximityScore(Math.abs(durD), ADHERENCE_FALLOFF_PAUSE_MIN)) / 2;
    const notes = [];
    if (startD > ADHERENCE_TOLERANCE_MIN) notes.push(ui`empezó tarde ${formatDeltaMinutes(startD)}`);
    else if (startD < -ADHERENCE_TOLERANCE_MIN) notes.push(ui`empezó antes ${formatDeltaMinutes(startD)}`);
    if (durD > ADHERENCE_TOLERANCE_MIN) notes.push(ui`se pasó ${formatMinutes(durD)}`);
    else if (durD < -ADHERENCE_TOLERANCE_MIN) notes.push(ui`cortó ${formatMinutes(Math.abs(durD))}`);
    checkpoints.push({ label: slot.name, ok, score, note: notes.length ? notes.join(' · ') : translateText('A tiempo') });
  }

  // scorePct sale del cálculo minuto a minuto (computeMinuteAdherence) cuando hay minutos medibles;
  // si no, del promedio de checkpoints.
  const minuteResult = minuteAdherenceForDay(normalized, sessions);
  let scorePct;
  if (minuteResult) {
    scorePct = minuteResult.pct;
  } else {
    // Sin minutos medibles todavía (ej. la hora planeada de inicio de hoy aún no llega, aunque el
    // turno ya se haya iniciado temprano)
    const totalScore = checkpoints.reduce((a, c) => a + (Number.isFinite(c.score) ? c.score : (c.ok ? 1 : 0)), 0);
    scorePct = checkpoints.length ? Math.round((totalScore / checkpoints.length) * 100) : 100;
  }
  return { dayKey: normalized, checkpoints, scorePct, reasons: minuteResult ? minuteResult.reasons : {} };
}

function now_isBefore(date) { return new Date() < date; }

// Suma goalMin/achievedMin de los bloques de Trabajo del día que tienen meta configurada.
function dayProductivityGoalTotals(dayKey = getActiveDayKey()) {
  const dayCalls = callsForDay(dayKey);
  const dayPauses = dayPausesForSlotStats(dayKey);
  const { start: shiftStart, end: shiftEnd } = dayWorkBounds(dayKey);
  const plannedSlots = getEffectiveScheduleForDay(dayKey);
  const firstWorkIndex = plannedSlots.findIndex(s => s.type === 'Work');
  let lastWorkIndex = -1;
  for (let i = plannedSlots.length - 1; i >= 0; i--) {
    if (plannedSlots[i].type === 'Work') { lastWorkIndex = i; break; }
  }
  let targetMin = 0;
  let achievedMin = 0;
  plannedSlots.forEach((slot, idx) => {
    if (slot.type !== 'Work') return;
    const extendStart = idx === firstWorkIndex ? shiftStart : null;
    const extendEnd = idx === lastWorkIndex ? shiftEnd : null;
    const stats = slotStats(slot, dayCalls, dayPauses, shiftStart, shiftEnd, dayKey, extendStart, extendEnd);
    if (stats.productivityGoal) {
      targetMin += stats.productivityGoal.goalMin;
      achievedMin += stats.productivityGoal.achievedMin;
    }
  });
  return { targetMin, achievedMin };
}

// Vista de la semana completa con navegación entre semanas.
let weekViewOffset = 0; // 0 = semana actual, -1 = semana pasada, +1 = próxima 0 = ciclo de pago que contiene a "hoy", -1 = ciclo anterior, +1 = siguiente (ver cycleBoundsForOffset/cycleEarningsForOffset).
let cycleViewOffset = 0;

export function setCalMonthOffset(value) { setContextCalMonthOffset(value); }
export function setCalViewMode(value) { setContextCalViewMode(value); }

// Pastilla "Hoy / Ciclo" dentro de "Ganancias de hoy" — alterna entre
// #earningsDayView/#earningsCycleView sin animación. Vive en memoria (no en localStorage)
let earningsViewMode = 'day';

function setEarningsViewMode(mode) {
  earningsViewMode = mode === 'cycle' ? 'cycle' : 'day';
  const dayView = document.getElementById('earningsDayView');
  const cycleView = document.getElementById('earningsCycleView');
  const goalBadge = document.getElementById('goalPctBadge');
  const subtitle = document.getElementById('earningsSectionSubtitle');
  const title = document.getElementById('earningsSectionTitle');
  document.querySelectorAll('#earningsModeToggle .earnings-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-earnings-mode') === earningsViewMode);
  });
  if (dayView) dayView.style.display = earningsViewMode === 'day' ? '' : 'none';
  if (cycleView) cycleView.style.display = earningsViewMode === 'cycle' ? '' : 'none';
  if (goalBadge) goalBadge.style.display = earningsViewMode === 'day' ? '' : 'none';
  if (earningsViewMode === 'cycle') {
    if (title) title.textContent = translateText('Ganancias del ciclo');
    if (subtitle) subtitle.textContent = translateText('Total del ciclo de pago actual (14 días) y la próxima fecha de pago.');
  } else {
    if (title) title.textContent = earningsSectionLabel(getActiveDayKey());
    if (subtitle) subtitle.textContent = translateText('Gana, meta y margen del día, de un vistazo.');
  }
}

// Pastilla "Bloques / Llamadas" dentro de "Bloques del día" — alterna entre #blocksView/
// #blocksCallsView sin animación, mismo mecanismo que earningsViewMode. Vive en memoria (no en
// localStorage)
let blocksViewMode = 'blocks';

function setBlocksViewMode(mode) {
  blocksViewMode = mode === 'calls' ? 'calls' : 'blocks';
  const blocksView = document.getElementById('blocksView');
  const callsView = document.getElementById('blocksCallsView');
  document.querySelectorAll('#blocksViewToggle .blocks-view-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-blocks-view') === blocksViewMode);
  });
  if (blocksView) blocksView.style.display = blocksViewMode === 'blocks' ? '' : 'none';
  if (callsView) callsView.style.display = blocksViewMode === 'calls' ? '' : 'none';
  if (blocksViewMode === 'calls') renderTable();
}

// "Resumen semanal" usaba semanas Lunes-Domingo fijas, sin relación con cuándo arranca de verdad el
// ciclo de pago de 14 días (cycleAnchorDate/cyclePayOffsetDays, ver Horario).
export function startOfCycleWeek(date = new Date()) {
  const anchor = cycleAnchorDate();
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((target.getTime() - anchor.getTime()) / 86400000);
  const weekIndex = Math.floor(diffDays / 7);
  return new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + weekIndex * 7);
}

// Semana 1 o 2 dentro de su ciclo de 14 días, a partir del inicio de esa semana (ya alineado por
// startOfCycleWeek). Mismo cálculo de weekIndex que startOfCycleWeek, para no duplicar la lógica de
// redondeo/signo.
function cycleWeekNumberForWeekStart(weekStartDate) {
  const anchor = cycleAnchorDate();
  const diffDays = Math.round((weekStartDate.getTime() - anchor.getTime()) / 86400000);
  const weekIndex = Math.floor(diffDays / 7);
  const mod = ((weekIndex % 2) + 2) % 2;
  return mod === 0 ? 1 : 2;
}

export function weekDaysForOffset(offset = weekViewOffset) {
  const base = startOfCycleWeek(new Date());
  base.setDate(base.getDate() + offset * 7);
  const days = [];
  for (let i = 0; i < 7; i++) {
    days.push(new Date(base.getFullYear(), base.getMonth(), base.getDate() + i));
  }
  return days;
}

export function formatWeekRangeLabel(start, end) {
  const startLabel = new Intl.DateTimeFormat(displayLocale(), { day: 'numeric', month: 'short' }).format(start);
  const endLabel = new Intl.DateTimeFormat(displayLocale(), { day: 'numeric', month: 'short', year: 'numeric' }).format(end);
  return `${startLabel} – ${endLabel}`;
}

// Notas de día (Resumen semanal → "Editar") ---- Categorías cortas para marcar por qué un día se
// vio distinto de lo normal, más un comentario libre. Puramente informativo (ver comentario en
// defaultState.dayNotes)
const DAY_NOTE_CATEGORIES = [
  { value: 'rest', label: translateText('Descanso'), tagClass: '' },
  { value: 'holiday', label: translateText('Día festivo'), tagClass: 'good' },
  { value: 'sick', label: translateText('Enfermedad'), tagClass: 'warn' },
  { value: 'power_outage', label: translateText('Corte de luz'), tagClass: 'bad' },
  { value: 'internet_outage', label: translateText('Corte de internet'), tagClass: 'bad' },
  { value: 'platform_issues', label: translateText('Problemas de la plataforma'), tagClass: 'bad' },
  { value: 'burnout', label: translateText('Agotamiento'), tagClass: 'warn' },
  { value: 'other', label: translateText('Otro'), tagClass: '' },
];

export function dayNoteCategoryMeta(value) {
  return DAY_NOTE_CATEGORIES.find(c => c.value === value) || null;
}

// Devuelve { category, comment, forcedStatus } para ese día, o null si no hay nada guardado (ni
// categoría, ni comentario, ni Estado forzado) — mismo criterio de "vacío = no existe" que ya usa
// setGapAnnotation para gapAnnotations.
export function getDayNote(dayKey) {
  const normalized = callDateKeyFromValue(dayKey);
  const raw = state.dayNotes && state.dayNotes[normalized];
  if (!raw || typeof raw !== 'object') return null;
  const category = String(raw.category || '');
  const comment = String(raw.comment || '').trim();
  const forcedStatus = ['work', 'off'].includes(raw.forcedStatus) ? raw.forcedStatus : '';
  if (!category && !comment && !forcedStatus) return null;
  return { category, comment, forcedStatus };
}

function setDayNote(dayKey, { category, comment, forcedStatus }) {
  const normalized = callDateKeyFromValue(dayKey);
  if (!normalized) return;
  const before = JSON.parse(JSON.stringify(state.dayNotes || {}));
  if (!state.dayNotes || typeof state.dayNotes !== 'object') state.dayNotes = {};
  const cat = String(category || '');
  const note = String(comment || '').trim();
  const forced = ['work', 'off'].includes(forcedStatus) ? forcedStatus : '';
  // Sin categoría, sin comentario Y sin Estado forzado = no hay nada que guardar; se borra la
  // entrada en vez de dejar un objeto vacío colgando en localStorage.
  if (!cat && !note && !forced) {
    delete state.dayNotes[normalized];
  } else {
    state.dayNotes[normalized] = { category: cat, comment: note, forcedStatus: forced };
  }
  if (saveStateOnly() === false) { state.dayNotes = before; return false; }
  onGameDayMetadataChanged(normalized);
  render();
}

export function weekSummaryForOffset(offset = weekViewOffset) {
  const days = weekDaysForOffset(offset);
  const today = todayRange();

  const rows = days.map(d => {
    const dayKey = todayCallDateKey(d);
    const cfg = dayConfigFor(dayKey);
    // Un día marcado libre en el horario semanal pero con actividad real (llamadas o shift real,
    // ver dayIsEffectivelyOff) seguía apareciendo como "Libre" y sin Adherencia en Resumen semanal.
    const isOff = dayIsEffectivelyOff(dayKey);
    const isFuture = d > today;
    const dayCalls = callsForDay(dayKey);
    const bounds = dayShiftBounds(dayKey);
    const hasShift = !!bounds.start;
    const connected = hasShift ? connectedMinutesForDay(dayKey) : 0;
    const productive = productiveMinutesForDay(dayKey);
    const stats = importedCallStats(dayCalls, dayKey);
    // No se calcula/expone adherencia para días futuros: dayAdherence penaliza con 0% un turno "no
    // iniciado" en días pasados, pero un día futuro no debe mostrarse como si ya hubiera fallado.
    const adherence = (!isFuture && !isOff) ? dayAdherence(dayKey) : null;
    return {
      dayKey,
      date: d,
      isToday: dayKey === todayCallDateKey(),
      isOff,
      isFuture,
      hasShift,
      calls: dayCalls.length,
      connected,
      productive,
      earnings: stats.earnings,
      adherencePct: adherence ? adherence.scorePct : null,
      note: getDayNote(dayKey),
    };
  });

  const withAdherence = rows.filter(r => r.adherencePct !== null);
  const totals = {
    connected: rows.reduce((a, r) => a + r.connected, 0),
    productive: rows.reduce((a, r) => a + r.productive, 0),
    calls: rows.reduce((a, r) => a + r.calls, 0),
    earnings: rows.reduce((a, r) => a + r.earnings, 0),
    avgAdherence: withAdherence.length
      ? Math.round(withAdherence.reduce((a, r) => a + r.adherencePct, 0) / withAdherence.length)
      : null,
  };

  return { days: rows, totals, weekStart: days[0], weekEnd: days[6] };
}

// Funciones de datos para el panel de analíticas de "Reportes" (Vista 3 de su mock).

// Ventana móvil de calendario de los últimos `days` días, a diferencia de weekSummaryForOffset
// (bloques de 7 días alineados al ciclo).

// Ganancias y Adherencia agrupadas por MES calendario, en vez de la ventana móvil de 14 días de
// arriba.

// Pinta la gráfica de barras (Ganancias, eje izquierdo) + línea (Adherencia promedio, eje derecho
// 0-100%) para la página actual de reportsMonthlySeries.

// KPIs del día activo vs el día calendario anterior (mismo criterio que el mock: "Hoy" con un delta
// chico junto a cada número).

// "Calidad del tiempo" (dona): qué % del tiempo CONECTADO del día fue llamada real / ACW /
// "Improductivo" (el bucket "Otro" de huecos sin clasificar, mismo dato que ya usa la píldora
// "Otro" en Ganancias de hoy — ver dayGapTotals).

// Adherencia: hoy + mejor/peor/promedio de los últimos 7 días con dato calculable (mismo criterio
// de exclusión que dayAdherence: días libres y futuros no cuentan).

// Ganancias del ciclo: reutiliza cycleEarningsForOffset(0) tal cual (mismo dato que ya pinta
// "Ganancias del ciclo" en Inicio).
export function getDailyGoalOverride(dayKey) {
  const normalized = callDateKeyFromValue(dayKey);
  const raw = settings.dailyGoalOverrides && settings.dailyGoalOverrides[normalized];
  if (!raw || typeof raw !== 'object') return null;
  const min = Number(raw.min);
  const usd = Number(raw.usd);
  if (!Number.isFinite(min) || min < 0 || !Number.isFinite(usd) || usd < 0) return null;
  return { min, usd };
}

export function effectiveDailyGoal(dayKey = getActiveDayKey()) {
  const override = getDailyGoalOverride(dayKey);
  if (override) return { min: override.min, usd: override.usd, isOverride: true };
  const normalized = callDateKeyFromValue(dayKey);
  const historical = normalized && settings.goalHistoryByDay && settings.goalHistoryByDay[normalized];
  if (historical && typeof historical === 'object') {
    const min = Number(historical.min);
    const usd = Number(historical.usd);
    if (Number.isFinite(min) && min >= 0 && Number.isFinite(usd) && usd >= 0) {
      return { min, usd, isOverride: false, isHistorical: true };
    }
  }
  return { min: Number(settings.productiveGoalMin) || 0, usd: Number(settings.earningsGoal) || 0, isOverride: false };
}

// Value=null borra el override de ese día (vuelve a la meta general).
export function setDailyGoalOverride(dayKey, value) {
  const normalized = callDateKeyFromValue(dayKey);
  if (!normalized) return;
  if (!settings.dailyGoalOverrides || typeof settings.dailyGoalOverrides !== 'object') settings.dailyGoalOverrides = {};
  const min = Number(value && value.min);
  const usd = Number(value && value.usd);
  if (value && Number.isFinite(min) && min >= 0 && Number.isFinite(usd) && usd >= 0) {
    settings.dailyGoalOverrides[normalized] = { min, usd };
  } else {
    delete settings.dailyGoalOverrides[normalized];
    // "Usar meta general" también cambia el día histórico seleccionado.
    // Su snapshot anterior no debe ocultar la edición explícita; los snapshots
    // de los demás días conservan sus valores.
    if (value === null && settings.goalHistoryByDay?.[normalized]) {
      settings.goalHistoryByDay[normalized] = {
        min: Number(settings.productiveGoalMin) || 0,
        usd: Number(settings.earningsGoal) || 0,
      };
    }
  }
}

function cycleGoalKeyForOffset(offset = 0) {
  const { start } = cycleBoundsForOffset(offset);
  return `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
}

function autoCycleGoal(offset = 0) {
  const { start } = cycleBoundsForOffset(offset);
  let total = 0;
  for (let i = 0; i < CYCLE_LENGTH_DAYS; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    // DayIsEffectivelyOff respeta además el "Estado" forzado desde "Editar día" (Resumen semanal).
    const dKey = todayCallDateKey(d);
    if (!dayIsEffectivelyOff(dKey)) total += effectiveDailyGoal(dKey).usd;
  }
  return total;
}

export function getCycleGoalOverride(offset = 0) {
  const key = cycleGoalKeyForOffset(offset);
  const val = settings.cycleGoalOverrides && settings.cycleGoalOverrides[key];
  return Number.isFinite(Number(val)) && Number(val) > 0 ? Number(val) : null;
}

export function effectiveCycleGoal(offset = 0) {
  const override = getCycleGoalOverride(offset);
  return override !== null ? override : autoCycleGoal(offset);
}

// Amount=null (o cualquier valor no válido) borra el override, volviendo al cálculo automático para
// ese ciclo — sin dejar una clave "vacía" colgando en settings.cycleGoalOverrides.
function setCycleGoalOverride(offset, amount) {
  if (!settings.cycleGoalOverrides) settings.cycleGoalOverrides = {};
  const key = cycleGoalKeyForOffset(offset);
  const num = Number(amount);
  if (Number.isFinite(num) && num > 0) settings.cycleGoalOverrides[key] = num;
  else delete settings.cycleGoalOverrides[key];
  return saveSettingsOnly();
}

// Editor rápido de la meta del ciclo (✎ en la tarjeta de Reportes) — mismo patrón simple que
// openAcwGoalEditor/#acwGoalModal: un campo, Guardar/ Cancelar, + un botón aparte para volver al
// cálculo automático.
function openCycleGoalEditor() {
  const input = document.getElementById('cycleGoalAmountInput');
  if (input) input.value = effectiveCycleGoal(0).toFixed(2);
  openModal('cycleGoalModal');
}

function saveCycleGoalEditor() {
  const input = document.getElementById('cycleGoalAmountInput');
  const amount = Number(input?.value);
  if (!Number.isFinite(amount) || amount <= 0) {
    toast(translateText('La meta debe ser un número mayor a 0'));
    return;
  }
  if (setCycleGoalOverride(0, amount) === false) return false;
  closeModal('cycleGoalModal');
  render();
  toast(ui`Meta del ciclo: ${money(amount)}${convertedAmountText(amount) ? ` (${convertedAmountText(amount)})` : ''}`);
}

function useAutoCycleGoal() {
  if (setCycleGoalOverride(0, null) === false) return false;
  closeModal('cycleGoalModal');
  render();
  toast(translateText('Meta del ciclo vuelve a calcularse automáticamente'));
}

function updateCycleGoalFromAjustes() {
  const input = document.getElementById('cycleGoalInput');
  const amount = Number(input?.value);
  if (setCycleGoalOverride(0, Number.isFinite(amount) && amount > 0 ? amount : null) === false) return false;
  render();
}

// Mejor/peor día de los últimos 7 días CON adherencia calculable — score = Adherencia del día
// (mismo criterio "más alto es mejor" que ya usa el resto de la app). "vs promedio" compara contra
// el promedio de esa misma serie de 7 días.

// Tendencias: semana actual (weekSummaryForOffset(0)) vs semana anterior (weekSummaryForOffset(-1))
// — mismos totales que ya calcula Resumen semanal, solo comparados entre sí.

// Compliant/failed/off/pending para UN día — usado por la racha. 'off' = día libre según el horario
// (dayIsEffectivelyOff ya reconoce "trabajaste en tu día libre" como NO libre). 'pending' = HOY,
// turno aún no arrancado.

// Racha hacia atrás desde hoy.

// Llamadas reales de los últimos `days` días, agrupadas por hora del día (0-23) — mismo `calls` de
// siempre, sin ningún registro nuevo.

// % Billable / % Dropped de TODAS las llamadas de la semana (en vez de solo el total crudo que ya
// muestra Resumen semanal).

// Proyección de ganancias del ciclo actual al ritmo de hoy: promedio diario ganado hasta ahora ×
// los 14 días del ciclo completo (CYCLE_LENGTH_DAYS).

// Toggle de la tarjeta de Racha — mismo patrón de auto-guardado que el resto de settings sueltos
// (ej. setThemeFromSidebarSwitch).

// Render del panel completo.

// Chip estático (sin flecha de tendencia) para % Billable/Dropped de la semana — a diferencia de
// trendChipHtml no compara contra nada, solo muestra el valor actual con un tono de color.

function renderWeekSummary() {
  return renderWeekSummaryView({ settings, weekViewOffset, weekSummaryForOffset, formatWeekRangeLabel, cycleWeekNumberForWeekStart, callDateToDate, weekdayKeyForDayKey, WEEKDAY_LABELS, dayNoteCategoryMeta, escapeHtml, money, financeConvertedNote, formatDuration, iconHtml, convertedAmountText });
}

async function usePayReceipts(action, value) {
  const owner = settings, view = await loadDetailViews({ retry: action !== 'render' });
  if (owner !== settings) return;
  document.getElementById('payDatesLoadStatus').hidden = !!view;
  document.getElementById('payDatesRetryBtn').hidden = !!view;
  if (!view) { if (action !== 'render') toast(translateText('No se pudo cargar el detalle. Cerrá y abrí esta sección para reintentar.')); return; }
  return view.payReceiptAction({ ui, translateText, displayLocale, data: () => ({settings, calls}), todayRange, cycleBoundsForOffset, formatCallDayLabel, todayCallDateKey,
    isoDateFromDayKey, escapeHtml, iconHtml, money, financeConvertedInline, parseMoney, higherRateBonusForCall, canPersistLocalChanges,
    makeLocalId, saveSettingsOnly, openModal, closeModal, appConfirm, render, toast }, action, value);
}
function renderPayDatesSection() { return usePayReceipts('render'); }

// Página "Finanzas" ---- ver FINANCE_CATEGORIES arriba y el resumen.md para el modelo de datos
// completo (settings.financeCategories, cascada de "Restante después").


    function todayIsOff() {
      return liveCallDayIsOff();
    }

    // Si no hay un turno en curso (o el de hoy ya se cerró), el próximo click en "Iniciar/Finalizar
    // shift" va a INICIAR uno nuevo.
    function shiftWouldStartNew() {
      return !state.shiftStartedAt || state.shiftEndedAt;
    }

    const SHIFT_START_EARLY_GRACE_MIN = 10;

    function shiftStartTooEarly() {
      // Solo aplica cuando se está por INICIAR un turno nuevo — si ya está activo (el botón es
      // "Finalizar shift"), nunca debe bloquearse.
      if (state.shiftStartedAt && !state.shiftEndedAt) return false;
      const cfg = dayConfigFor(todayCallDateKey());
      if (!cfg || cfg.off || !cfg.start) return false;
      const plannedStart = dateAtTime(new Date(), formatHHMM(cfg.start));
      const minutesUntilStart = (plannedStart.getTime() - Date.now()) / 60000;
      return minutesUntilStart > SHIFT_START_EARLY_GRACE_MIN;
    }

    function shiftActionLabel() {
      return isViewingToday() && !shiftWouldStartNew() ? translateText('Finalizar shift') : translateText('Iniciar shift');
    }

    function shiftActionTone() {
      // Mismo criterio: si el turno de hoy sigue activo pero se está viendo otro día, el botón no
      // debe pintarse en rojo/"bad" como si "Finalizar" fuera la acción lista para ejecutarse —
      // está deshabilitado.
      return !isViewingToday() || shiftWouldStartNew() ? 'primary' : 'bad';
    }

    // Mismo criterio que pauseActionDisabled: "Iniciar/Finalizar shift" opera siempre sobre
    // state.shiftStartedAt/shiftEndedAt (el turno real de HOY), nunca sobre el día seleccionado en
    // "Día activo". Ver isViewingToday.
    function shiftActionDisabled() {
      if (!isViewingToday()) return true;
      if (shiftWouldStartNew() && todayIsOff()) return true;
      return shiftStartTooEarly();
    }

    function pauseActionLabel(type) {
      const pretty = type === 'lunch' ? translateText('Lunch') : translateText('Break');
      // Si no se está viendo "Hoy", el botón ya está deshabilitado (ver pauseActionDisabled) y su
      // cronómetro dice "Solo en 'Hoy'".
      if (!isViewingToday()) return ui`Iniciar ${pretty}`;
      if (!state.shiftStartedAt || state.shiftEndedAt) return ui`Iniciar ${pretty}`;
      if (state.activePause && state.activePause.type === type) return ui`Terminar ${pretty}`;
      return ui`Iniciar ${pretty}`;
    }

    function pauseActionDisabled(type) {
      // Estos botones operan sobre el turno real de HOY (state.activePause/pauseHistory), no sobre
      // el día activo.
      if (!isViewingToday()) return true;
      if (state.shiftEndedAt) return true;
      if (state.activeCall) return true;
      if (!state.shiftStartedAt) {
        // Habilitado solo si hay a qué hora anclar el auto-inicio (ver autoStartShiftFromCalls).
        // Sin llamadas hoy, se queda bloqueado.
        return callsForDay(todayCallDateKey()).length === 0;
      }
      if (!state.activePause) return false;
      return state.activePause.type !== type;
    }

    function pauseActionTimer(type) {
      if (state.activePause && state.activePause.type === type) {
        return formatDuration(Date.now() - new Date(state.activePause.startedAt).getTime());
      }
      return '00:00:00';
    }

    function callActionLabel() {
      // El emoji 📞 ya no va aquí — vive en el ícono estático del botón (.action-icon en el HTML,
      // envuelto en el anillo pulsante) desde el rediseño de Controles.
      if (!isViewingToday()) return translateText('Iniciar llamada');
      return state.activeCall ? translateText('Terminar llamada') : translateText('Iniciar llamada');
    }

    // A diferencia de pauseActionDisabled (Break/Lunch), iniciar una llamada NO exige que ya haya
    // llamadas de ese día para anclar el auto-inicio del turno.
    function callActionDisabled() {
      return !isViewingToday() || (!state.activeCall && liveCallDayIsOff());
    }

    function liveCallDayIsOff() {
      const day = todayCallDateKey();
      const forced = getDayNote(day)?.forcedStatus;
      return forced === 'off' || (forced !== 'work' && !!dayConfigFor(day)?.off);
    }

    function callActionTimer() {
      if (state.activeCall) {
        return formatDuration(Date.now() - new Date(state.activeCall.startedAt).getTime());
      }
      return '00:00:00';
    }

    function toggleShift() {
      // Defensa adicional a shiftBtn.disabled por si la función se dispara por otra vía.
      if (!isViewingToday()) {
        toast(translateText("Cambia el día activo a 'Hoy' para usar este control"));
        return;
      }
      // Misma defensa para "día libre": el botón ya debería estar deshabilitado en este caso (ver
      // shiftActionDisabled), pero se protege por si se dispara de otra forma. Solo aplica al
      // INICIAR un turno nuevo.
      if (shiftWouldStartNew() && todayIsOff()) {
        toast(translateText('Hoy está marcado como día libre. Márcalo como Trabajado en Resumen semanal → Editar día para iniciar el turno o una llamada.'));
        return;
      }
      // Misma defensa para la restricción de los 5 minutos — el botón ya debería estar
      // deshabilitado en este caso, pero se protege por si se dispara de otra forma.
      if (shiftStartTooEarly()) {
        const cfg = dayConfigFor(todayCallDateKey());
        toast(ui`Muy temprano — puedes iniciar tu turno desde ${SHIFT_START_EARLY_GRACE_MIN} min antes de las ${timeLabel(formatHHMM(cfg.start))}`);
        return;
      }
      if (shiftWouldStartNew()) return startShift();
      return reviewShiftTransition('end', () => {
        if (state.activeCall && !endCall()) { toast(translateText('Resuelve la llamada pendiente antes de finalizar el turno')); return false; }
        return endShift();
      });
    }

    async function reviewShiftTransition(kind, confirm, startNew) {
      const owner = settings, expected = activityChangeSignature(), view = await loadDetailViews({ retry: true });
      if (owner !== settings || expected !== activityChangeSignature()) return false;
      if (!view) { toast(translateText('No se pudo cargar el detalle. Cerrá y abrí esta sección para reintentar.')); return false; }
      return view.confirmShiftTransition({ ui, translateText, escapeHtml, data: () => ({ state, settings }), signature: activityChangeSignature,
        appConfirm, isViewingToday, canPersistLocalChanges, toast }, kind, confirm, startNew);
    }

    // Si le das a Break/Lunch sin haber dado click en "Iniciar shift" pero ya tienes llamadas
    // importadas hoy, se asume que ya estás trabajando.
    export function autoStartShiftFromCalls(silent = false) {
      if (state.shiftStartedAt || state.shiftEndedAt) return false;
      const todayCalls = callsForDay(todayCallDateKey());
      if (!todayCalls.length) return false;
      const firstStart = new Date(Math.min(...todayCalls.map(c => new Date(c.startISO).getTime())));
      state.shiftStartedAt = firstStart.toISOString();
      state.shiftEndedAt = null;
      setEvent('shift', translateText('Shift iniciado automáticamente'), fmtTime(firstStart), 'auto');
      if (saveStateOnly() === false) return false;
      onGameShiftStarted({ continued: false });
      if (!silent) toast(ui`Shift iniciado automáticamente desde tu primera llamada (${fmtTime(firstStart)})`);
      return true;
    }

    const ACCIDENTAL_TOGGLE_GRACE_MIN = 5;

    // Se quitó toda la UI que mostraba esto (el chip resumen en "Bloques del día" y la sección de
    // Reportes) — el registro en sí SE CONSERVA a propósito, sin ningún cambio de comportamiento.
    function registerDayInterruption(dayKey, type, gapStartISO, gapEndISO) {
      if (!state.dayInterruptions || typeof state.dayInterruptions !== 'object') state.dayInterruptions = {};
      const normalized = callDateKeyFromValue(dayKey) || dayKey;
      if (!Array.isArray(state.dayInterruptions[normalized])) state.dayInterruptions[normalized] = [];
      const interruption = { id: makeLocalId(), type, gapStart: gapStartISO, gapEnd: gapEndISO };
      state.dayInterruptions[normalized].push(interruption);
      return interruption;
    }

    function dayInterruptions(dayKey = getActiveDayKey()) {
      const normalized = callDateKeyFromValue(dayKey);
      const arr = state.dayInterruptions && state.dayInterruptions[normalized];
      return Array.isArray(arr) ? arr : [];
    }

    function togglePause(type) {
      // Misma defensa que toggleShift: estos botones solo aplican al turno de hoy, nunca al día
      // seleccionado en "Día activo".
      if (!isViewingToday()) {
        toast(translateText("Cambia el día activo a 'Hoy' para usar este control"));
        return;
      }
      if (state.shiftEndedAt) return;
      if (state.activeCall) {
        toast(translateText('Termina la llamada antes de iniciar Break/Lunch'));
        return;
      }
      if (!state.shiftStartedAt) {
        const started = autoStartShiftFromCalls();
        if (!started) return;
      }
      if (state.activePause) {
        if (state.activePause.type === type) return endPause();
        return;
      }
      startPause(type);
    }

    export function makeLocalId() {
      return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    }

    function currentShiftAccountingDayKey(fallbackDate = new Date()) {
      if (state.shiftStartedAt) {
        const started = new Date(state.shiftStartedAt);
        if (Number.isFinite(started.getTime())) return todayCallDateKey(started);
      }
      return todayCallDateKey(fallbackDate);
    }

    function setEvent(type, title, detail, meta = '', at = new Date().toISOString()) {
      const trackedType = ['shift', 'break', 'lunch'].includes(type);
      const shiftDayKey = trackedType && state.shiftStartedAt ? currentShiftAccountingDayKey() : '';
      const event = {
        id: makeLocalId(),
        ts: at,
        type,
        title,
        detail,
        meta,
        ...(shiftDayKey ? { shiftDayKey } : {}),
      };
      state.events.unshift(event);
      state.events = state.events.slice(0, 500);
      return event;
    }

    function startShift(options = {}) {
      if (!canPersistLocalChanges()) return false;
      const before = JSON.parse(JSON.stringify(state));
      const persist = () => { if (saveAll() !== false) return true; setAppState(before); render(); return false; };
      const now = new Date(options.at || Date.now());
      const nowISO = now.toISOString();

      // Reabrir dentro de la gracia permite elegir continuación o sesión nueva.
      if (!options.propio && !options.newSession && state.shiftStartedAt && state.shiftEndedAt && sameCallDay(state.shiftEndedAt, todayCallDateKey())) {
        const gapMin = (now.getTime() - new Date(state.shiftEndedAt).getTime()) / 60000;
        if (options.continueConfirmed && !(gapMin >= 0 && gapMin <= ACCIDENTAL_TOGGLE_GRACE_MIN)) { toast(translateText('La actividad cambió. Revisá de nuevo antes de confirmar.')); return false; }
        if (gapMin >= 0 && gapMin <= ACCIDENTAL_TOGGLE_GRACE_MIN) {
          if (!options.continueConfirmed) return reviewShiftTransition('resume', () => startShift({ ...options, continueConfirmed: true }), () => startShift({ ...options, newSession: true }));
          state.propioBridgeSession = null;
          registerDayInterruption(todayCallDateKey(), 'shift', state.shiftEndedAt, nowISO);
          state.shiftEndedAt = null;
          setEvent('shift', translateText('Shift continuado (interrupción accidental)'), fmtTime(now), 'manual');
          if (!persist()) return false;
          stopShiftAlarm();
          toast(ui`Turno continuado — interrupción de ${formatMinutes(gapMin)} min registrada`);
          onGameShiftStarted({ continued: true });
          return;
        }
      }

      // endShift solo pone shiftEndedAt y nunca limpia shiftStartedAt: hay que detectar el turno ya
      // cerrado antes de reusarlo.
      const alreadyStarted = !!state.shiftStartedAt && !state.shiftEndedAt;
      if (!options.propio) state.propioBridgeSession = null;
      state.shiftStartedAt = alreadyStarted ? state.shiftStartedAt : nowISO;
      state.shiftEndedAt = null;
      setEvent('shift', 'Shift iniciado', fmtTime(now), options.propio ? 'Propio' : 'manual', nowISO);
      if (!persist()) return false;
      // El aviso de "Conéctate ya" ya no tiene razón de seguir sonando — checkShiftAlarm lo
      // apagaría solo en el próximo tick (hasta 1s de retraso), pero apagarlo aquí de inmediato
      // evita ese beep extra.
      stopShiftAlarm();
      onGameShiftStarted({ continued: false });

      // El estimado desde la primera llamada se reemplaza por la hora del click en cuanto se inicia
      // el turno.
      if (!alreadyStarted) {
        const todayCalls = callsForDay(todayCallDateKey());
        if (todayCalls.length) {
          const firstStart = new Date(Math.min(...todayCalls.map(c => new Date(c.startISO).getTime())));
          const lateMin = (now.getTime() - firstStart.getTime()) / 60000;
          if (lateMin > 15) {
            toast(ui`Shift iniciado — ya tenías llamadas desde las ${fmtTime(firstStart)} (${formatMinutes(lateMin)} min antes). "Conectado" cuenta desde ahora, no desde esa llamada.`);
            return;
          }
        }
      }
      toast(translateText('Shift iniciado'));
    }

    function endShift(options = {}) {
      if (!state.shiftStartedAt || state.shiftEndedAt) return;
      if (!canPersistLocalChanges()) return false;
      if (state.pendingLiveCallBackup) { toast(translateText('Resuelve la llamada pendiente antes de finalizar el turno')); return false; }
      const before = JSON.parse(JSON.stringify(state));
      if (!options.propio) state.propioBridgeSession = null;
      const shiftDayKey = todayCallDateKey(new Date(state.shiftStartedAt));
      const now = options.at || new Date().toISOString();
      const closedPause = state.activePause ? endPause({ silent: true, deferSave: true, forShiftEnd: true, endedAt: now }) : null;
      if (closedPause === false) return false;
      state.shiftEndedAt = now;
      setEvent('shift', 'Shift terminado', fmtTime(new Date(now)), options.propio ? 'Propio' : 'manual', now);
      if (saveAll() === false) { setAppState(before); render(); return false; }
      closedPause?.finish?.();
      toast(translateText('Shift terminado'));
      onGameShiftEnded(shiftDayKey);
    }

    function startPause(type) {
      if (!state.shiftStartedAt || state.shiftEndedAt || state.activePause) return;
      if (!canPersistLocalChanges()) return false;
      const before = JSON.parse(JSON.stringify(state));
      const persistPause = () => {
        if (saveAll() !== false) return true;
        setAppState(before); render(); return false;
      };
      const now = new Date();
      const dayKey = currentShiftAccountingDayKey(now);
      const pretty = type === 'lunch' ? translateText('Lunch') : translateText('Break');

      // Reabrir el mismo tipo dentro de la gracia continúa la pausa anterior.
      const sameDayOfType = state.pauseHistory.filter(p => p.type === type && (callDateKeyFromValue(p.shiftDayKey) === dayKey || (!p.shiftDayKey && sameCallDay(p.endedAt, dayKey))));
      let lastClosed = null;
      sameDayOfType.forEach(p => {
        if (!lastClosed || new Date(p.endedAt).getTime() > new Date(lastClosed.endedAt).getTime()) lastClosed = p;
      });
      if (lastClosed) {
        const gapMin = (now.getTime() - new Date(lastClosed.endedAt).getTime()) / 60000;
        if (gapMin >= 0 && gapMin <= ACCIDENTAL_TOGGLE_GRACE_MIN) {
          state.pauseHistory = state.pauseHistory.filter(p => p.id !== lastClosed.id);
          const interruption = registerDayInterruption(dayKey, type, lastClosed.endedAt, now.toISOString());
          const continuationEvent = setEvent(type, ui`${pretty} continuado (interrupción accidental)`, fmtTime(now), 'manual');
          state.activePause = {
            type,
            startedAt: lastClosed.startedAt,
            shiftDayKey: callDateKeyFromValue(lastClosed.shiftDayKey) || dayKey,
            continuationInterruptionId: interruption?.id || null,
            continuationEventId: continuationEvent?.id || null,
            continuationClosedPause: JSON.parse(JSON.stringify(lastClosed)),
          };
          if (!persistPause()) return false;
          onGamePauseStarted(type);
          stopBreakStartAlarm();
          toast(ui`${pretty} continuado — interrupción de ${formatMinutes(gapMin)} min registrada`);
          return;
        }
      }

      state.activePause = { type, startedAt: now.toISOString(), shiftDayKey: dayKey };
      state.activePause.startEventId = setEvent(type, ui`${pretty} iniciado`, fmtTime(now), 'manual')?.id || null;
      if (!persistPause()) return false;
      stopBreakStartAlarm();
      toast(ui`${pretty} iniciado`);
      onGamePauseStarted(type);
    }

    function endPause(options = {}) {
      if (!state.activePause) return null;
      if (!canPersistLocalChanges()) return false;
      const before = JSON.parse(JSON.stringify(state));
      const { silent = false, deferSave = false } = options;
      const now = options.endedAt || new Date().toISOString();
      const endedPause = { ...state.activePause };
      const shiftDayKey = callDateKeyFromValue(endedPause.shiftDayKey) || currentShiftAccountingDayKey(new Date(endedPause.startedAt));
      const plannedSlot = findPlannedSlotForActivePause(shiftDayKey);
      const pauseRecord = { id: makeLocalId(), type: endedPause.type, startedAt: endedPause.startedAt, endedAt: now, shiftDayKey, startEventId: endedPause.startEventId || endedPause.continuationClosedPause?.startEventId || null };
      state.pauseHistory.push(pauseRecord);
      const pauseEndEvent = setEvent(endedPause.type, ui`${endedPause.type === 'lunch' ? translateText('Lunch') : translateText('Break')} terminado`, fmtTime(new Date(now)), 'manual');
      state.activePause = null;
      const finish = () => {
      stopBreakEndAlarm();
      if (!silent) toast(translateText('Regresaste'));
      let onTime = false;
      if (plannedSlot && !options.forShiftEnd) {
        const base = callDateToDate(shiftDayKey) || new Date(endedPause.startedAt);
        const absoluteSlot = reinforcementScheduleIntervals(shiftDayKey).find((slot) => slot.type === plannedSlot.type && slot.start === plannedSlot.start && slot.end === plannedSlot.end);
        const plannedStart = absoluteSlot ? new Date(absoluteSlot.startedAt) : dateAtTime(base, plannedSlot.start);
        const plannedEnd = absoluteSlot ? new Date(absoluteSlot.endedAt) : dateAtTime(base, plannedSlot.end);
        const actual = pauseForSlot(plannedSlot, shiftDayKey) || pauseRecord;
        const startDelta = (new Date(actual.startedAt).getTime() - plannedStart.getTime()) / 60000;
        const duration = Number.isFinite(Number(actual.effectiveDurationMin)) ? Number(actual.effectiveDurationMin)
          : (new Date(actual.endedAt || now).getTime() - new Date(actual.startedAt).getTime()) / 60000;
        const durationDelta = duration - (plannedEnd.getTime() - plannedStart.getTime()) / 60000;
        onTime = Math.abs(startDelta) <= ADHERENCE_TOLERANCE_MIN && Math.abs(durationDelta) <= ADHERENCE_TOLERANCE_MIN;
      }
      onGamePauseEnded(pauseRecord, { onTime });
      };
      if (!deferSave) {
        if (saveAll() === false) { setAppState(before); render(); return false; }
        finish();
      }
      return {
        pause: endedPause,
        pauseHistoryId: pauseRecord.id,
        pauseEndEventId: pauseEndEvent?.id || null,
        finish,
      };
    }

    function toggleCall() {
      // Misma defensa que toggleShift/togglePause: estos botones solo aplican al turno real de hoy,
      // nunca al día seleccionado en "Día activo".
      if (!isViewingToday()) {
        toast(translateText("Cambia el día activo a 'Hoy' para usar este control"));
        return;
      }
      if (state.activeCall) return endCall();
      return startCall();
    }

    function startCall(options = {}) {
      if (state.activeCall) return;
      if (!canPersistLocalChanges()) return false;
      const before = JSON.parse(JSON.stringify(state));
      if (liveCallDayIsOff()) {
        toast(translateText('Hoy es tu día libre'));
        return false;
      }

      const now = new Date(options.startedAt || Date.now());
      const nowISO = now.toISOString();
      let interruptedPauseRollback = null;
      if (state.activePause) {
        interruptedPauseRollback = endPause({ silent: true, deferSave: true, endedAt: nowISO });
        if (interruptedPauseRollback === false) return false;
      }

      // Una llamada real puede llegar antes del horario planeado o después de haber cerrado el
      // turno. Nunca se bloquea por eso: si no hay sesión activa, abre una nueva sesión de trabajo
      // anclada exactamente al inicio de la llamada.
      const needsAutoShift = !state.shiftStartedAt || !!state.shiftEndedAt;
      const previousShiftStartedAt = state.shiftStartedAt || null;
      const previousShiftEndedAt = state.shiftEndedAt || null;
      const gameBeforeAutoShift = needsAutoShift ? JSON.parse(JSON.stringify(state.game || null)) : null;
      let autoShiftEventId = null;
      if (needsAutoShift) {
        state.shiftStartedAt = nowISO;
        state.shiftEndedAt = null;
        const event = setEvent('shift', translateText('Shift iniciado automáticamente por llamada'), fmtTime(now), 'auto');
        autoShiftEventId = event?.id || null;
      }
      state.activeCall = {
        startedAt: nowISO,
        autoStartedShift: needsAutoShift,
        autoShiftEventId,
        previousShiftStartedAt,
        previousShiftEndedAt,
        interruptedPauseRollback,
        // onGameShiftStarted puede reabrir STAGE CLEAR, abrir un cofre o tocar ledger/XP.
        // Si esta llamada resulta accidental y se descarta, se restaura exactamente el estado de
        // juego anterior junto con el turno automático.
        gameBeforeAutoShift,
        ...(options.propioBridge ? { propioBridge: { ...options.propioBridge } } : {}),
      };
      if (saveAll() === false) { setAppState(before); render(); return false; }
      interruptedPauseRollback?.finish?.();
      if (needsAutoShift) onGameShiftStarted({ continued: false });
      toast(needsAutoShift ? translateText('Llamada iniciada · turno abierto automáticamente') : translateText('Llamada iniciada'));
      return true;
    }

    // Termina la llamada en curso y la guarda SOLA (ver autoSaveLiveCall) — desde ya no abre ningún
    // modal de confirmación en el caso normal: colgar bloqueaba "Iniciar llamada" hasta resolver
    // ese modal, así que se quitó esa fricción de raíz.
    function endCall(options = {}) {
      if (!state.activeCall) return;
      const liveContext = state.activeCall;
      const startedAt = liveContext.startedAt;
      const endedAt = options.endedAt || new Date().toISOString();
      const previousState = JSON.parse(JSON.stringify(state));
      state.activeCall = null;
      // Sin esto, el chip "ACW/AfterCallWork" en vivo (ver computeCurrentAcwStart) no sabía que la
      // llamada acababa de terminar hasta que se guardaba.
      state.lastCallEndedAt = endedAt;
      state.pendingLiveCallBackup = { startedAtISO: startedAt, endedAtISO: endedAt, candidate: null, liveContext };
      if (saveStateOnly() === false) { setAppState(previousState); render(); return false; }
      render();
      return autoSaveLiveCall(startedAt, endedAt, liveContext);
    }

    function activityChangeSignature() {
      return JSON.stringify([state.activeCall, state.activePause, state.shiftStartedAt, state.shiftEndedAt, state.pauseHistory, state.dayInterruptions]);
    }

    async function requestActivityDiscard(kind, change, done) {
      const owner = state, preferences = settings, expected = activityChangeSignature();
      const view = await loadDetailViews({ retry: true });
      if (!view || state !== owner || settings !== preferences || activityChangeSignature() !== expected) return toast(translateText('No se pudo preparar el descarte. Volvé a intentarlo.'));
      view.confirmActivityChange({ ui, translateText, escapeHtml, data: () => ({ state, settings }), signature: activityChangeSignature,
        setState: setAppState, saveStateOnly, canPersistLocalChanges, appConfirm, render, toast }, kind, kind === 'call' ? state.activeCall : state.activePause, expected, change, done);
    }

    // Descartar restaura solamente la actividad interrumpida y el turno automático.
    function discardActiveCall() {
      if (!state.activeCall) return;
      return requestActivityDiscard('call', () => {
        const discarded = state.activeCall;
        ignorePropioCall(state, discarded?.propioBridge?.callId);
        state.activeCall = null;

        if (discarded?.interruptedPauseRollback) {
          const rollback = discarded.interruptedPauseRollback;
          if (rollback.pauseHistoryId) state.pauseHistory = state.pauseHistory.filter(p => p?.id !== rollback.pauseHistoryId);
          if (rollback.pauseEndEventId) state.events = state.events.filter(event => event?.id !== rollback.pauseEndEventId);
          if (rollback.pause) state.activePause = { ...rollback.pause };
        }

        // Los turnos abiertos antes de esta llamada se conservan.
        if (discarded?.autoStartedShift) {
          if (discarded.autoShiftEventId) {
            state.events = state.events.filter(event => event?.id !== discarded.autoShiftEventId);
          }
          state.shiftStartedAt = discarded.previousShiftStartedAt || null;
          state.shiftEndedAt = discarded.previousShiftEndedAt || null;
          if (discarded.gameBeforeAutoShift) state.game = discarded.gameBeforeAutoShift;
        }

      }, discarded => {
        toast(discarded?.autoStartedShift ? translateText('Llamada descartada · turno automático revertido') : translateText('Llamada descartada'));
      });
    }

    // Una continuación descartada devuelve el tramo cerrado que ya existía.
    function discardActivePause() {
      if (!state.activePause) return;
      const pretty = state.activePause.type === 'lunch' ? translateText('Lunch') : translateText('Break');
      return requestActivityDiscard('pause', () => {
        const discarded = state.activePause;
        const accountingDay = callDateKeyFromValue(discarded?.shiftDayKey) || currentShiftAccountingDayKey(new Date(discarded?.startedAt || Date.now()));
        if (discarded?.continuationInterruptionId && Array.isArray(state.dayInterruptions?.[accountingDay])) {
          state.dayInterruptions[accountingDay] = state.dayInterruptions[accountingDay]
            .filter(item => item?.id !== discarded.continuationInterruptionId);
          if (!state.dayInterruptions[accountingDay].length) delete state.dayInterruptions[accountingDay];
        }
        if (discarded?.continuationEventId) {
          state.events = state.events.filter(event => event?.id !== discarded.continuationEventId);
        }
        if (discarded.continuationClosedPause) {
          if (!state.pauseHistory.some(p => p.id === discarded.continuationClosedPause.id)) state.pauseHistory.push(discarded.continuationClosedPause);
        } else if (discarded.startEventId) {
          state.events = state.events.filter(event => event?.id !== discarded.startEventId);
        }
        state.activePause = null;
      }, () => {
        stopBreakStartAlarm();
        stopBreakEndAlarm();
        toast(ui`${pretty} descartado`);
      });
    }

    function liveActivityInfo() {
      if (state.activeCall) {
        return {
          type: 'call',
          label: translateText('En llamada'),
          startedAt: state.activeCall.startedAt,
          colorVar: '--cyan',
          rgb: '47, 213, 255',
          onSave: endCall,
          onDiscard: discardActiveCall,
        };
      }
      if (state.activePause) {
        const isLunch = state.activePause.type === 'lunch';
        return {
          type: state.activePause.type,
          label: isLunch ? translateText('Lunch') : translateText('Break'),
          startedAt: state.activePause.startedAt,
          colorVar: isLunch ? '--blue' : '--warn',
          rgb: isLunch ? '124, 140, 255' : '255, 209, 92',
          onSave: () => endPause(),
          onDiscard: discardActivePause,
        };
      }
      return null;
    }

    // Se relee en cada tick para que los botones de la barra (wireados una sola vez) siempre
    // disparen la acción vigente.
    let currentLiveActivity = null;

    function updateLiveActivityBar() {
      const bar = document.getElementById('liveActivityBar');
      if (!bar) return;
      const info = liveActivityInfo();
      currentLiveActivity = info;
      if (!info) {
        bar.classList.remove('show');
        document.body.classList.remove('has-live-bar');
        return;
      }
      document.body.classList.add('has-live-bar');
      bar.classList.add('show');
      bar.style.setProperty('--live-bar-color', `var(${info.colorVar})`);
      bar.style.setProperty('--live-bar-rgb', info.rgb);
      const labelEl = document.getElementById('liveBarLabel');
      if (labelEl) labelEl.textContent = info.label;
      const timerEl = document.getElementById('liveBarTimer');
      if (timerEl) timerEl.textContent = formatDuration(Date.now() - new Date(info.startedAt).getTime());
    }

    // Tarjeta de estado dentro de "Llamadas". La fila entera se tiñe vía `.live` en el contenedor
    // (CSS descendiente), no hace falta togglear el punto/ícono aparte.
    function updateCallsStatusCard() {
      const card = document.getElementById('callsStatusCard');
      const icon = document.getElementById('callsStatusIcon');
      const textTitle = document.getElementById('callsStatusTextTitle');
      const timerEl = document.getElementById('callsStatusTimer');
      const mid = document.getElementById('callsStatusMid');
      const actions = document.getElementById('callsStatusActions');
      // Con una llamada en curso, la tarjeta de estado ya trae Guardar/Descartar — los 3 botones de
      // abajo (Iniciar llamada/Pegar Llamadas/Agregar llamada) se ocultan para no repetir el mismo
      // control dos veces.
      const controlsGrid = document.getElementById('callsControlsGrid');
      if (!card || !icon || !textTitle) return;

      const isLive = !!state.activeCall;
      icon.innerHTML = iconHtml('phone');
      card.classList.toggle('live', isLive);
      textTitle.textContent = isLive ? translateText('En llamada') : translateText('Comienza una nueva llamada');
      if (mid) mid.style.display = isLive ? '' : 'none';
      if (timerEl && isLive) timerEl.textContent = formatDuration(Date.now() - new Date(state.activeCall.startedAt).getTime());
      if (actions) actions.style.display = isLive ? '' : 'none';
      if (controlsGrid) controlsGrid.style.display = isLive ? 'none' : '';
    }

    // Reset all three keys through the guarded snapshot writer, without a delete/write gap.
    function eraseAllData() {
      return useSnapshotTools('confirmReplacement', 'reset', () => {
        if (!canPersistLocalChanges()) return false;
        const previous = { state, calls, settings };

        setAppState(defaultState());
        setAppCalls([]);
        setAppSettings(defaultSettings());
        ensureCurrencySettings();
        if (persistFullSnapshot() === false) {
          setAppState(previous.state);
          setAppCalls(previous.calls);
          setAppSettings(previous.settings);
          render();
          return false;
        }

        // Vistas/edición en memoria que ya no tienen a qué apuntar tras el borrado — mismo criterio
        // de limpieza que ya usan otros flujos (ej. resetDay reacomoda activeDayKey).
        weekViewOffset = 0;
        cycleViewOffset = 0;
        setContextScheduleEditDay('mon');
        editingGapContext = null;
        resetCallEditorState();

        render();
        toast(translateText('Todos los datos fueron borrados'));
        closeModal('resetModal');

        // Vuelve a mostrar el popup de bienvenida, igual que la primera vez que se abre la app.
        const onboardingNameInput = document.getElementById('onboardingNameInput');
        const onboardingEmojiInput = document.getElementById('onboardingEmojiInput');
        const initialEmoji = settings.userEmoji || DEFAULT_USER_EMOJI;
        if (onboardingNameInput) onboardingNameInput.value = '';
        if (onboardingEmojiInput) onboardingEmojiInput.value = initialEmoji;
        renderEmojiPicker('emojiPickerOnboarding', initialEmoji);
        const onboardingEmojiPreviewReset = document.getElementById('onboardingEmojiPreview');
        if (onboardingEmojiPreviewReset) onboardingEmojiPreviewReset.textContent = initialEmoji;
        const onboardingEmojiPickerWrapReset = document.getElementById('onboardingEmojiPickerWrap');
        const toggleEmojiPickerOnboardingBtnReset = document.getElementById('toggleEmojiPickerOnboardingBtn');
        if (onboardingEmojiPickerWrapReset) onboardingEmojiPickerWrapReset.classList.remove('open');
        if (toggleEmojiPickerOnboardingBtnReset) { toggleEmojiPickerOnboardingBtnReset.setAttribute('aria-expanded', 'false'); toggleEmojiPickerOnboardingBtnReset.textContent = translateText('Cambiar emoji'); }
        openModal('onboardingModal');
        return true;
      });
    }

    function resetDay() {
      const dayKey = getActiveDayKey();
      const normalizedDayKey = callDateKeyFromValue(dayKey);
      const activeCallDayKey = state.activeCall?.startedAt
        ? currentShiftAccountingDayKey(new Date(state.activeCall.startedAt))
        : '';
      const pendingCallDayKey = callDateKeyFromValue(state.pendingLiveCallBackup?.candidate?.callDate)
        || (state.pendingLiveCallBackup?.startedAtISO
          ? currentShiftAccountingDayKey(new Date(state.pendingLiveCallBackup.startedAtISO))
          : '');
      if (normalizedDayKey && (activeCallDayKey === normalizedDayKey || pendingCallDayKey === normalizedDayKey)) {
        toast(translateText('Guarda o descarta la llamada pendiente antes de reiniciar este día.'));
        return;
      }
      return useSnapshotTools('confirmReplacement', 'day', () => {
        const trackedShiftStart = state.shiftStartedAt ? new Date(state.shiftStartedAt) : null;
        const trackedShiftEnd = state.shiftEndedAt ? new Date(state.shiftEndedAt) : new Date();
        const trackedShiftDayKey = trackedShiftStart && Number.isFinite(trackedShiftStart.getTime())
          ? todayCallDateKey(trackedShiftStart)
          : '';
        const resetsTrackedShift = trackedShiftDayKey === normalizedDayKey;
        const belongsToTrackedShift = (iso) => {
          if (!resetsTrackedShift || !trackedShiftStart || !Number.isFinite(trackedShiftStart.getTime())) return false;
          const t = new Date(iso || 0).getTime();
          const endMs = trackedShiftEnd && Number.isFinite(trackedShiftEnd.getTime()) ? trackedShiftEnd.getTime() : Date.now();
          return Number.isFinite(t) && t >= trackedShiftStart.getTime() && t <= endMs;
        };

        setAppCalls(calls.filter(c => callDateKeyFromValue(c.callDate) !== normalizedDayKey));
        state.events = state.events.filter(e => {
          const accountingDay = callDateKeyFromValue(e?.shiftDayKey);
          if (accountingDay) return accountingDay !== normalizedDayKey;
          return !sameCallDay(e.ts, normalizedDayKey) && !belongsToTrackedShift(e.ts);
        });
        state.pauseHistory = state.pauseHistory.filter(p => {
          const accountingDay = callDateKeyFromValue(p?.shiftDayKey);
          if (accountingDay) return accountingDay !== normalizedDayKey;
          const touchesCalendarDay = sameCallDay(p.startedAt, normalizedDayKey);
          const touchesTrackedShift = belongsToTrackedShift(p.startedAt) || belongsToTrackedShift(p.endedAt);
          return !touchesCalendarDay && !touchesTrackedShift;
        });
        if (state.gapAnnotations && state.gapAnnotations[normalizedDayKey]) delete state.gapAnnotations[normalizedDayKey];
        if (state.dayNotes && state.dayNotes[normalizedDayKey]) delete state.dayNotes[normalizedDayKey];
        if (state.dayInterruptions && state.dayInterruptions[normalizedDayKey]) delete state.dayInterruptions[normalizedDayKey];

        if (resetsTrackedShift || (!trackedShiftDayKey && normalizedDayKey === todayCallDateKey())) {
          state.shiftStartedAt = null;
          state.shiftEndedAt = null;
          state.activePause = null;
          state.activeCall = null;
          state.pendingLiveCallBackup = null;
          state.lastCallEndedAt = null;
        }

        state.activeDayKey = normalizedDayKey || dayKey;
        onGameDayReset(normalizedDayKey || dayKey);
        financeRunAutoFillCascade();
        if (saveAll() === false) return false;
        toast(translateText('Día reiniciado'));
        return true;
      }, { dayLabel: formatCallDayLabel(dayKey) });
    }

    // Clave para detectar llamadas duplicadas. Usa el valor NUMÉRICO de pay (via parseMoney), no el
    // texto crudo — así "$0.72", "0.72" y " $0.72 " se reconocen como el mismo pago.
    export function callDedupeKey(c) {
      return `${c.customerId}|${c.callDate}|${c.callStart}|${c.durationMin}|${parseMoney(c.pay).toFixed(2)}|${String(c.billable).toLowerCase()}|${String(c.dropped).toLowerCase()}`;
    }

    function parseCalls(text) {
      const raw = String(text || '').trim();
      if (!raw) return [];
      const headers = new Set(['customer id', 'call date', 'call start', 'duration', 'duration (minutes)', 'billable', 'dropped', 'pay']);
      const lines = raw.split(/\r?\n/).map((text, index) => ({ text: text.trim(), line: index + 1 })).filter(row => row.text && !headers.has(row.text.toLowerCase()));
      const rows = [], diagnostics = [], seen = new Set();
      function addRow(parts, line) {
        const [customerId, callDate, callStart, duration, billable, dropped, pay] = parts;
        const dur = Number(duration), start = toDateFromInputs(callDate, callStart);
        const amount = Number(String(pay).replace(/[$,\s]/g, ''));
        const reason = !/^\d{2}\/\d{2}\/\d{4}$/.test(callDate) || !/^\d{1,2}:\d{2}\s*[AP]M$/i.test(callStart) || !start ? 'date-time'
          : !Number.isFinite(dur) || dur < 0 || dur > MAX_CALL_DURATION_MIN ? 'duration'
          : !Number.isFinite(amount) || amount < 0 || amount > 1e9 ? 'pay'
          : !/^(yes|no)$/i.test(billable) || !/^(yes|no)$/i.test(dropped) ? 'flags' : null;
        if (reason) { diagnostics.push({ customerId, callDate, callStart, line, reason }); return; }
        const row = { id: makeLocalId(), customerId, callDate, callStart, durationMin: dur, billable, dropped, pay,
          startISO: start.toISOString(), endISO: new Date(start.getTime() + dur * 60000).toISOString(),
          countsAsProductive: billable.toLowerCase() === 'yes' && dropped.toLowerCase() === 'no' };
        const key = callDedupeKey(row);
        if (seen.has(key)) { diagnostics.push({ ...row, line, reason: 'duplicate-input' }); return; }
        seen.add(key); rows.push(row);
      }
      for (let i = 0; i < lines.length; i++) {
        const row = lines[i], parts = row.text.split(/\t|\s{2,}|,/).map(value => value.trim()).filter(Boolean);
        if (parts.length === 7) addRow(parts, row.line);
        else if (/^\d+$/.test(row.text) && i + 6 < lines.length && /^\d{2}\/\d{2}\/\d{4}$/.test(lines[i + 1].text)) {
          addRow(lines.slice(i, i + 7).map(value => value.text), row.line); i += 6;
        } else diagnostics.push({ line: row.line, reason: 'format', customerId: row.text.slice(0, 60) });
      }
      rows.diagnostics = diagnostics;
      return rows;
    }

    // Dos intervalos [start, end) se traslapan si cada uno empieza antes de que el otro termine.
    export function callsOverlap(a, b) {
      return new Date(a.startISO) < new Date(b.endISO) && new Date(b.startISO) < new Date(a.endISO);
    }

    let importOutcomeArgs = null, importOutcomeSequence = 0;
    async function renderImportSkippedSummary(...args) {
      if (!args.some(rows => rows?.length)) {
        importOutcomeArgs = null; importOutcomeSequence++;
        const el = document.getElementById('importSkippedSummary'); if (el) { el.innerHTML = ''; el.style.display = 'none'; }
        const retry = document.getElementById('importResultRetryBtn'); if (retry) retry.hidden = true;
        return;
      }
      importOutcomeArgs = args;
      const owner = settings, sequence = ++importOutcomeSequence;
      const view = await loadDetailViews({ retry: true });
      if (owner !== settings || sequence !== importOutcomeSequence) return;
      const retry = document.getElementById('importResultRetryBtn');
      if (retry) retry.hidden = !!view;
      if (view) view.renderImportOutcome({ ui, translateText, escapeHtml }, ...args);
      else toast(translateText('El registro ya terminó, pero no se pudo cargar su detalle. Podés reintentarlo.'));
    }

    function isReplaceableLiveCall(call) {
      return !!call && String(call.source || '').toLowerCase() === 'live';
    }

    function sameImportedCallIdentity(existingCall, incomingCall) {
      if (!existingCall || String(existingCall.source || '').toLowerCase() !== 'import') return false;
      // startISO ya contiene la fecha real. No se compara callDate porque un turno nocturno puede
      // contabilizar la llamada en el día anterior aunque Propio la exporte con fecha calendario nueva.
      const existingCustomer = String(existingCall.customerId || '').trim();
      const incomingCustomer = String(incomingCall.customerId || '').trim();
      if (!existingCustomer || !incomingCustomer || existingCustomer !== incomingCustomer) return false;
      const a = new Date(existingCall.startISO).getTime();
      const b = new Date(incomingCall.startISO).getTime();
      return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 2 * 60000;
    }

    function importCalls(rawText) {
      if (!canPersistLocalChanges()) return false;
      const ta = document.getElementById('callInput');
      const background = typeof rawText === 'string';
      let parsed = parseCalls(background ? rawText : ta.value);
      const parseDiagnostics = parsed.diagnostics || [];
      if (!parsed.length) {
        if (!background && parseDiagnostics.length) renderImportSkippedSummary([], [], [], [], [], [], parseDiagnostics);
        if (!background) toast(translateText('No se pudo leer la data'));
        return false;
      }

      const importTs = new Date().toISOString();
      const beforeImport = { calls, state: JSON.parse(JSON.stringify(state)), settings: JSON.parse(JSON.stringify(settings)) };
      const importNow = new Date(importTs).getTime();
      const activeShiftStart = state.shiftStartedAt ? new Date(state.shiftStartedAt) : null;
      const activeShiftEnd = state.shiftEndedAt ? new Date(state.shiftEndedAt) : new Date(importTs);
      const activeShiftDayKey = activeShiftStart && Number.isFinite(activeShiftStart.getTime())
        ? todayCallDateKey(activeShiftStart)
        : '';
      if (activeShiftStart && Number.isFinite(activeShiftStart.getTime()) && Number.isFinite(activeShiftEnd.getTime())) {
        parsed = parsed.map(call => {
          const startMs = new Date(call.startISO).getTime();
          if (!Number.isFinite(startMs) || startMs < activeShiftStart.getTime() || startMs > activeShiftEnd.getTime()) return call;
          if (!activeShiftDayKey || callDateKeyFromValue(call.callDate) === activeShiftDayKey) return call;
          return { ...call, calendarCallDate: call.callDate, callDate: activeShiftDayKey, shiftDayKey: activeShiftDayKey };
        });
      }
      const exactOfficialCallsFor = (rows, incomingCall) => rows.filter(existingCall =>
        sameImportedCallIdentity(existingCall, incomingCall)
        && new Date(existingCall.startISO).getTime() === new Date(incomingCall.startISO).getTime());
      const existing = new Set(calls.filter(c => !isReplaceableLiveCall(c)).map(callDedupeKey));
      const skippedDuplicates = [];
      const futureRows = [];
      const deduped = parsed
        .filter(c => {
          const endsAt = new Date(c.endISO).getTime();
          if (Number.isFinite(endsAt) && endsAt > importNow) {
            futureRows.push(c);
            return false;
          }
          if (existing.has(callDedupeKey(c))) {
            const officialIdentity = exactOfficialCallsFor(calls, c);
            if (!(officialIdentity.length > 1 && officialIdentity.some(call => Number(call.durationMin) === 0))) {
              skippedDuplicates.push(c);
              return false;
            }
          }
          return true;
        })
        .sort((a, b) => new Date(a.startISO) - new Date(b.startISO));

      const overlapCheckSet = [...calls];
      const accepted = [];
      const replacedLive = [];
      const correctedOfficial = [];
      const replacedIds = new Set();
      const skippedOverlaps = [];
      let overlapSkipped = 0;
      const correctedDuplicateDays = new Set();

      const replaceAcceptedCall = (call, previous, kind) => {
        const stagedIndex = accepted.findIndex(item => item.call.id === previous.id);
        const staged = stagedIndex >= 0 ? accepted.splice(stagedIndex, 1)[0] : null;
        const replaces = staged ? staged.replaces : previous;
        const replacementKind = staged ? staged.replacementKind : kind;
        replacedIds.add(previous.id);
        const index = overlapCheckSet.findIndex(item => item.id === previous.id);
        if (index >= 0) overlapCheckSet.splice(index, 1);
        overlapCheckSet.push({ ...call, source: 'import' });
        accepted.push({ call, replaces, replacementKind });
        for (const list of [replacedLive, correctedOfficial]) {
          const priorIndex = list.findIndex(item => item.call.id === previous.id);
          if (priorIndex >= 0) list.splice(priorIndex, 1);
        }
        if (replacementKind === 'live') replacedLive.push({ call, provisional: replaces });
        if (replacementKind === 'import') correctedOfficial.push({ call, previous: replaces });
      };

      for (const c of deduped) {
        const overlaps = overlapCheckSet.filter(existingCall => callsOverlap(existingCall, c));
        const exactOfficialCalls = exactOfficialCallsFor(overlapCheckSet, c);
        const unrelatedOverlap = exactOfficialCalls.length && overlaps.find(call => !exactOfficialCalls.includes(call));
        if (unrelatedOverlap) {
          overlapSkipped++;
          skippedOverlaps.push({ ...c, withCustomerId: unrelatedOverlap.customerId, withCallStart: unrelatedOverlap.callStart });
          continue;
        }
        // Earlier zero-minute corrections could leave a second official row beside the original.
        // Collapse only this corrected identity, and only when no unrelated call blocks it.
        if (exactOfficialCalls.length > 1 && exactOfficialCalls.some(call => Number(call.durationMin) === 0)
          && overlaps.every(call => exactOfficialCalls.includes(call))) {
          const primary = exactOfficialCalls.find(call => Number(call.durationMin) > 0) || exactOfficialCalls[0];
          exactOfficialCalls.filter(call => call !== primary).forEach(call => {
            replacedIds.add(call.id);
            const index = overlapCheckSet.findIndex(item => item.id === call.id);
            if (index >= 0) overlapCheckSet.splice(index, 1);
            const dayKey = callDateKeyFromValue(call.callDate);
            if (dayKey) correctedDuplicateDays.add(dayKey);
          });
          replaceAcceptedCall(c, primary, 'import');
          continue;
        }
        // Zero-length calls do not overlap a call at their start, but an exact official identity
        // still represents a correction of that record.
        const zeroCorrection = !overlaps.length && overlapCheckSet.find(existingCall =>
          sameImportedCallIdentity(existingCall, c)
          && (Number(existingCall.durationMin) === 0 || Number(c.durationMin) === 0)
          && new Date(existingCall.startISO).getTime() === new Date(c.startISO).getTime());
        if (zeroCorrection) {
          replaceAcceptedCall(c, zeroCorrection, 'import');
          continue;
        }
        const zeroLiveMatches = !overlaps.length && Number(c.durationMin) === 0 ? overlapCheckSet.filter(existingCall =>
          isReplaceableLiveCall(existingCall) && Math.floor(Date.parse(existingCall.startISO) / 60000) === Math.floor(Date.parse(c.startISO) / 60000)) : [];
        if (zeroLiveMatches.length === 1) {
          replaceAcceptedCall(c, zeroLiveMatches[0], 'live');
          continue;
        }
        if (zeroLiveMatches.length > 1) {
          overlapSkipped++;
          skippedOverlaps.push({ ...c, withCustomerId: zeroLiveMatches[0].customerId, withCallStart: zeroLiveMatches[0].callStart });
          continue;
        }
        if (!overlaps.length) {
          overlapCheckSet.push({ ...c, source: 'import' });
          accepted.push({ call: c, replaces: null, replacementKind: null });
          continue;
        }

        if (overlaps.length === 1 && isReplaceableLiveCall(overlaps[0])) {
          const provisional = overlaps[0];
          replaceAcceptedCall(c, provisional, 'live');
          continue;
        }

        if (overlaps.length === 1 && sameImportedCallIdentity(overlaps[0], c)) {
          const previous = overlaps[0];
          replaceAcceptedCall(c, previous, 'import');
          continue;
        }

        const overlapsWith = overlaps[0];
        overlapSkipped++;
        skippedOverlaps.push({ ...c, withCustomerId: overlapsWith.customerId, withCallStart: overlapsWith.callStart });
      }

      if (background && (overlapSkipped || futureRows.length)) return false;
      if (replacedIds.size) setAppCalls(calls.filter(c => !replacedIds.has(c.id)));

      const importedRows = accepted.map(item => {
        const preserveOfficialIdentity = item.replacementKind === 'import' && item.replaces;
        const replacingLive = item.replacementKind === 'live' && item.replaces;
        const replacingExisting = (preserveOfficialIdentity || replacingLive) ? item.replaces : null;
        const call = {
          ...item.call,
          id: preserveOfficialIdentity ? item.replaces.id : item.call.id,
          // Una corrección oficial conserva el día CONTABLE original igual que el reemplazo de una
          // live provisional. startISO sigue siendo la identidad real; callDate puede ser el día
          // anterior en un turno nocturno y no debe volver al día calendario al corregirla después.
          callDate: replacingExisting ? replacingExisting.callDate : item.call.callDate,
          calendarCallDate: replacingExisting
            ? (replacingExisting.calendarCallDate || item.call.calendarCallDate || item.call.callDate)
            : item.call.calendarCallDate,
          shiftDayKey: replacingExisting
            ? (replacingExisting.shiftDayKey || (replacingExisting.callDate !== item.call.callDate ? replacingExisting.callDate : undefined))
            : item.call.shiftDayKey,
          // Si la ventana Higher Rate que pagó esta llamada ya se movió/borró, el bono quedó
          // congelado en la fila. Reimportar una corrección de Propio no puede borrar ese derecho.
          ...(replacingExisting?.frozenHigherRateBonus
            ? { frozenHigherRateBonus: { ...replacingExisting.frozenHigherRateBonus } }
            : {}),
          ...(replacingExisting?.propioBridge ? { propioBridge: { ...replacingExisting.propioBridge, payEstimated: false, timingEstimated: false } } : {}),
          importedAt: preserveOfficialIdentity ? (item.replaces.importedAt || importTs) : importTs,
          source: 'import',
          ...(replacingExisting ? { officialCorrection: { kind: preserveOfficialIdentity ? 'corrected' : 'reconciled', at: importTs } } : {}),
        };
        return { ...item, call };
      });

      const importedDates = new Set(correctedDuplicateDays);
      importedRows.forEach(item => {
        if (item.replacementKind === 'live') {
          migratePositiveCallIdReferences(item.replaces?.id, item.call.id, item.call.endISO);
          migrateGameCallReferences(item.replaces?.id, item.call.id);
        }
        setAppCalls([...calls, item.call].sort((a, b) => new Date(a.startISO) - new Date(b.startISO)));
        const dayKey = callDateKeyFromValue(item.call.callDate);
        if (dayKey) importedDates.add(dayKey);

        if (item.replacementKind === 'live' && state.lastCallEndedAt && item.replaces?.endISO) {
          const tracked = new Date(state.lastCallEndedAt).getTime();
          const provisionalEnd = new Date(item.replaces.endISO).getTime();
          if (Number.isFinite(tracked) && Number.isFinite(provisionalEnd) && Math.abs(tracked - provisionalEnd) <= 1000) {
            state.lastCallEndedAt = item.call.endISO;
          }
        }
      });

      const importedDateList = [...importedDates].sort((a, b) => callDateToDate(a) - callDateToDate(b));
      const todayKey = todayCallDateKey();
      const preferredDay = importedDateList.includes(todayKey)
        ? todayKey
        : importedDateList[importedDateList.length - 1] || defaultActiveDayKey();
      if (importedRows.length && !background) state.activeDayKey = preferredDay;

      const unique = importedRows.map(item => item.call);
      const lateCount = unique.filter(c => callImportFlag(c)?.cls === 'imported-late').length;
      const historicCount = unique.filter(c => callImportFlag(c)?.cls === 'imported-historic').length;
      const importNote = lateCount || historicCount
        ? [lateCount ? ui`${lateCount} tarde(s)` : '', historicCount ? ui`${historicCount} histórica(s)` : ''].filter(Boolean).join(' · ')
        : translateText('a tiempo');
      const overlapNote = overlapSkipped ? ui` · ${overlapSkipped} traslapada(s) omitida(s)` : '';
      const duplicateNote = skippedDuplicates.length ? ui` · ${skippedDuplicates.length} duplicada(s) omitida(s)` : '';
      const futureNote = futureRows.length ? ui` · ${futureRows.length} futura(s) omitida(s)` : '';
      const replacedNote = replacedLive.length ? ui` · ${replacedLive.length} live actualizada(s)` : '';
      const correctedNote = correctedOfficial.length ? ui` · ${correctedOfficial.length} oficial(es) corregida(s)` : '';

      const importChangedData = unique.length || replacedLive.length || correctedOfficial.length;
      if (importChangedData) {
        setEvent('import', translateText('Llamadas importadas'), ui`${unique.length} fila(s) · ${importNote}${overlapNote}${duplicateNote}${futureNote}${replacedNote}${correctedNote}`, 'Propio');
        financeRunAutoFillCascade();
        if (saveAll() === false) {
          setAppCalls(beforeImport.calls); setAppState(beforeImport.state); setAppSettings(beforeImport.settings); render(); return false;
        }
        const todayImportedKey = todayCallDateKey();
        if (importedDates.has(todayImportedKey) && !state.shiftStartedAt && !state.shiftEndedAt && callsForDay(todayImportedKey).length) autoStartShiftFromCalls(true);
        importedRows.filter(item => !item.replacementKind).forEach(item => onGameCallSaved(item.call, 'import'));
        importedDates.forEach(dayKey => onGameCallsChanged(dayKey));
        if (!background) playCallSavedSound('callPasted');
      }
      if (background) return !overlapSkipped && !futureRows.length;
      ta.value = '';
      renderImportSkippedSummary(skippedDuplicates, skippedOverlaps, futureRows, replacedLive, correctedOfficial, importedRows.filter(item => !item.replacementKind).map(item => item.call), parseDiagnostics);

      if (!unique.length && (overlapSkipped || skippedDuplicates.length || futureRows.length)) {
        toast(ui`Ninguna fila nueva — ${overlapSkipped + skippedDuplicates.length + futureRows.length} omitida(s). Revisa el detalle debajo del cuadro de texto.`);
      } else {
        toast(ui`${unique.length} llamada(s) importada(s)${replacedNote}${correctedNote}${overlapNote}${duplicateNote}${futureNote}`);
      }
    }



    // El botón "Limpiar" dentro del modal "Pegar Llamadas" se veía como si limpiara el cuadro de
    // texto donde se pega la data.
    function clearCallInputBox() {
      const ta = document.getElementById('callInput');
      if (ta) ta.value = '';
      toast(translateText('Cuadro de texto limpiado'));
    }

    function exportJSON() {
      onGameBackupExported();
      const payload = { schemaVersion: 2, state, calls, settings, exportedAt: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'propio-shift-tracker-export.json';
      a.click();
      URL.revokeObjectURL(url);
    }

    // Exportación para contabilidad/impuestos ---- Distinta de exportJSON (backup completo de
    // state+calls, pensado para restaurar la app)
    let accountingExportPeriod = 'cycle';

    function accountingExportRange() {
      if (accountingExportPeriod === 'month') {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const label = new Intl.DateTimeFormat(displayLocale(), { month: 'long', year: 'numeric' }).format(now);
        return { start, end, label: label.charAt(0).toUpperCase() + label.slice(1) };
      }
      if (accountingExportPeriod === 'custom') {
        const fromInput = document.getElementById('accountingExportFromInput');
        const toInput = document.getElementById('accountingExportToInput');
        const fromKey = dayKeyFromIsoDate(fromInput?.value);
        const toKey = dayKeyFromIsoDate(toInput?.value);
        // Con los campos Desde/Hasta vacíos hay que devolver null: callDateToDate('') da null y el
        // rango caería a hoy.
        if (!fromKey || !toKey) return null;
        const start = callDateToDate(fromKey);
        const end = callDateToDate(toKey);
        if (!start || !end) return null;
        return {
          start: start <= end ? start : end,
          end: start <= end ? end : start,
          label: `${formatCallDayLabel(todayCallDateKey(start <= end ? start : end))} – ${formatCallDayLabel(todayCallDateKey(start <= end ? end : start))}`,
        };
      }
      // 'cycle' (default)
      const { start, end } = cycleBoundsForOffset(0);
      return { start, end, label: ui`Ciclo ${formatCallDayLabel(todayCallDateKey(start))} – ${formatCallDayLabel(todayCallDateKey(end))}` };
    }

    // Un objeto por día del rango (inclusive), con las mismas cifras que ya se ven en
    // Reportes/Resumen semanal para ese día.
    function accountingExportDays(range) {
      const days = [];
      const cursor = new Date(range.start.getFullYear(), range.start.getMonth(), range.start.getDate());
      const endDate = new Date(range.end.getFullYear(), range.end.getMonth(), range.end.getDate());
      while (cursor <= endDate) {
        const dayKey = todayCallDateKey(cursor);
        const dayCalls = [...callsForDay(dayKey)].sort((a, b) => new Date(a.startISO) - new Date(b.startISO));
        const stats = importedCallStats(dayCalls, dayKey);
        const adherence = dayIsEffectivelyOff(dayKey)||(!dayCalls.length&&!dayShiftBounds(dayKey).start) ? null : dayAdherence(dayKey);
        days.push({ dayKey, dayCalls, stats, adherence, productive: productiveMinutesForDay(dayKey) });
        cursor.setDate(cursor.getDate() + 1);
      }
      return days;
    }

    function csvField(value) {
      let s = String(value ?? '');
      // CSV quoting alone does not stop spreadsheet formulas. Keep numeric
      // amounts intact, but export formula-like text as a literal cell.
      if (!/^-?\d+(?:\.\d+)?$/.test(s) && /^(?:\s*[=+@-]|[\t\r\n])/.test(s)) s = "'" + s;
      return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }

    async function prepareAccountingExport(kind) {
      const range=accountingExportRange();
      if(!range){toast(translateText('Elige las fechas Desde y Hasta antes de exportar'));return;}
      const days=structuredClone(accountingExportDays(range));
      for(const day of days)for(const call of day.dayCalls)call.accountingBonusUsd=Number(higherRateBonusForCall(call)?.amount)||0;
      if(!days.length){toast(translateText('Elige un rango de fechas válido primero.'));return;}
      const owner=settings,popup=kind==='pdf'?window.open('','_blank'):null;
      if(kind==='pdf'&&!popup){toast(translateText('El navegador bloqueó la ventana nueva — habilita ventanas emergentes para exportar a PDF.'));return;}
      const view=await loadDetailViews({retry:true});
      if(owner!==settings||!view){popup?.close();if(owner===settings)toast(translateText('No se pudo cargar la exportación. Tus datos se conservan; podés reintentar.'));return;}
      return view.exportAccountingDocument({ui,translateText,displayLocale,escapeHtml,formatCallDayLabel,formatMinutes,money,fmtDate,parseMoney,higherRateBonusForCall,csvField,toast},kind,range,days,popup);
    }
    function exportAccountingCsv() { return prepareAccountingExport('csv'); }
    function exportAccountingPdf() { return prepareAccountingExport('pdf'); }

    function syncAccountingExportPeriodUI() {
      const row = document.getElementById('accountingExportPeriodRow');
      const customRow = document.getElementById('accountingExportCustomRow');
      const select = document.getElementById('accountingExportPeriodInput');
      if (row) row.querySelectorAll('[data-accounting-period]').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-accounting-period') === accountingExportPeriod);
      });
      if (customRow) customRow.style.display = accountingExportPeriod === 'custom' ? '' : 'none';
      if (select) select.value = accountingExportPeriod;
      renderAccountingExportScope();
    }

    function renderAccountingExportScope() {
      const target=document.getElementById('accountingExportScope');if(!target)return;
      const range=accountingExportRange();
      for(const id of ['accountingExportCsvBtn','accountingExportPdfBtn'])document.getElementById(id).disabled=!range;
      if(!range){target.textContent=translateText('Elegí Desde y Hasta para revisar qué vas a exportar.');return;}
      const days=accountingExportDays(range),count=days.reduce((sum,day)=>sum+day.dayCalls.length,0),earned=days.reduce((sum,day)=>sum+day.stats.earnings,0);
      target.innerHTML=ui`<div><strong>${escapeHtml(range.label)}</strong><span>Días: ${days.length} · Llamadas: ${count}</span></div><div class="accounting-scope-amount"><strong>${money(earned)}</strong>${financeConvertedInline(earned)}</div>`;
    }

    // Los backups nuevos restauran state + calls + settings. Los backups viejos (sin settings)
    // siguen siendo válidos y conservan la configuración actual, para no romper compatibilidad.
    function applyImportedPayload(payload) {
      const nextState = normalizeStateObject(payload.state);
      const nextCalls = normalizeCallsArray(payload.calls);
      setAppState(nextState);
      setAppCalls(nextCalls);
      if (payload.settings && typeof payload.settings === 'object' && !Array.isArray(payload.settings)) {
        const restoredSettings = { ...defaultSettings(), ...payload.settings };
        if (!('onboarded' in payload.settings)) restoredSettings.onboarded = true;
        setAppSettings(restoredSettings);
        ensureCurrencySettings();
        applyTheme();
      }
      // Mismo criterio que importCalls(): salta a un día con llamadas reales (hoy si tiene, si no la más reciente importada) — sin esto, el día activo se quedaba en el que traía guardado el respaldo, que podía no tener ninguna llamada y daba la impresión de que la importación no hizo nada.
      const importedDates = [...new Set(calls.map(c => callDateKeyFromValue(c.callDate)).filter(Boolean))]
        .sort((a, b) => callDateToDate(a) - callDateToDate(b));
      const todayKey = todayCallDateKey();
      if (importedDates.length) {
        state.activeDayKey = importedDates.includes(todayKey) ? todayKey : importedDates[importedDates.length - 1];
      } else if (!state.activeDayKey) {
        state.activeDayKey = defaultActiveDayKey();
      }
      financeRunAutoFillCascade();
      return saveAll();
    }

    async function useSnapshotTools(action, ...args) {
      const owner = state, preferences = settings, account = readMeta().userId;
      const view = await loadDetailViews({ retry: true });
      if (!view || state !== owner || settings !== preferences || readMeta().userId !== account) return toast(translateText('No se pudo preparar la recuperación. Volvé a intentarlo.'));
      return view[action]({ ui, translateText, escapeHtml, fmtDate, fmtTime, validFinanceSettings,
        data: () => ({ state, calls, settings }), account: () => readMeta().userId,
        restore: previous => { setAppState(previous.state); setAppCalls(previous.calls); setAppSettings(previous.settings); applyTheme(); render(); },
        preserve: (snapshot, kind) => preserveRecoveryCopy(readMeta().userId, snapshot, `before-${kind}`),
        copies: () => listRecoveryCopies(readMeta().userId), appConfirm, canPersistLocalChanges, applyImportedPayload, render, toast }, ...args);
    }

    function handleImportJsonFile(e) {
      const input = e.target, file = input.files?.[0];
      input.value = '';
      if (file) return useSnapshotTools('importBackupFile', file, MAX_IMPORT_JSON_BYTES);
    }

    export function formatHHMM(value) {
      const raw = String(value || '').trim();
      const match = raw.match(/^(\d{1,2}):(\d{2})$/);
      if (!match) return '07:00';
      const hh = String(Math.max(0, Math.min(23, Number(match[1])))).padStart(2, '0');
      const mm = String(Math.max(0, Math.min(59, Number(match[2])))).padStart(2, '0');
      return `${hh}:${mm}`;
    }

    export function timeLabel(value) {
      const normalized = formatHHMM(value);
      const [h, m] = normalized.split(':').map(Number);
      const suffix = h >= 12 ? translateText('PM') : translateText('AM');
      const hour12 = h % 12 || 12;
      return `${pad(hour12)}:${pad(m)} ${suffix}`;
    }

    export function timeLabelFromDate(date) {
      if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '—';
      return timeLabel(`${pad(date.getHours())}:${pad(date.getMinutes())}`);
    }

    // Ventana de turno PLANEADA para un día (por defecto, hoy). Ya no se recalcula
    // según cuándo diste click en "Iniciar" — viene del horario semanal configurado.
    function getShiftWindow(dayKey = todayCallDateKey()) {
      const cfg = dayConfigFor(dayKey);
      if (!cfg) return { start: '07:00', end: '16:00', off: true };
      // Bug reportado por el usuario: al marcar "Día libre (sin turno)" en Horario, el botón "Iniciar shift" (y el chip "Shift: X – Y") cambiaban al fallback fijo 7:00 AM–4:00 PM en vez de mantener el horario real configurado para ese día.
      return { start: formatHHMM(cfg.start), end: formatHHMM(cfg.end), off: !!cfg.off };
    }

    // Bloques planeados del día (Work/Break/Lunch) anclados al horario semanal.
    function getEffectiveScheduleForDay(dayKey = getActiveDayKey()) {
      const cfg = dayConfigFor(dayKey);
      // Ver dayIsEffectivelyOff: si el día está marcado "libre" pero sí hubo actividad real, se construyen los bloques igual que si off=false, usando la misma plantilla guardada para ese día de la semana.
      const effectiveCfg = (cfg && cfg.off && !dayIsEffectivelyOff(dayKey)) ? { ...cfg, off: false } : cfg;
      const planned = buildPlannedSlots(effectiveCfg);
      if (!planned.length) return [];
      const mode = settings.lateArrivalMode || 'anchor';
      if (mode !== 'shift') return planned;

      const bounds = dayShiftBounds(dayKey);
      if (!bounds.start || !cfg.start) return planned;
      const plannedStart = dateAtTime(callDateToDate(dayKey) || new Date(), formatHHMM(cfg.start));
      const delay = Math.floor((bounds.start.getTime() - plannedStart.getTime()) / 60000);
      if (delay <= 0) return planned;

      const toHHMM = (mins) => { const m = ((mins % 1440) + 1440) % 1440; return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; };
      return planned.map(slot => ({
        ...slot,
        start: toHHMM(toMinutes(slot.start) + delay),
        end: toHHMM(toMinutes(slot.end) + delay),
        startMin: slot.startMin + delay,
        endMin: slot.endMin + delay,
      }));
    }

    function reinforcementScheduleIntervals(dayKey) {
      const base = callDateToDate(dayKey);
      if (!base) return [];
      const config = dayConfigFor(dayKey);
      const plannedAnchor = toMinutes(formatHHMM(config?.start));
      const actualStart = settings.lateArrivalMode === 'shift' ? dayShiftBounds(dayKey).start : null;
      const anchor = actualStart ? Math.max(plannedAnchor, actualStart.getHours() * 60 + actualStart.getMinutes()) : plannedAnchor;
      let previousStart = base.getTime();
      const slots = [...getEffectiveScheduleForDay(dayKey)].sort((a, b) => (a.startMin ?? ((toMinutes(a.start) - anchor + 1440) % 1440)) - (b.startMin ?? ((toMinutes(b.start) - anchor + 1440) % 1440)));
      return slots.map((slot) => {
        const start = dateAtTime(base, slot.start);
        if (Number.isFinite(slot.startMin)) start.setDate(start.getDate() + Math.floor(slot.startMin / 1440));
        else if (toMinutes(slot.start) < anchor) start.setDate(start.getDate() + 1);
        while (start.getTime() < previousStart) start.setDate(start.getDate() + 1);
        const end = dateAtTime(base, slot.end);
        if (Number.isFinite(slot.endMin)) end.setDate(end.getDate() + Math.floor(slot.endMin / 1440));
        while (end.getTime() <= start.getTime()) end.setDate(end.getDate() + 1);
        previousStart = start.getTime();
        return { ...slot, startedAt: start.toISOString(), endedAt: end.toISOString() };
      });
    }

    export function setScheduleEditDay(value) { setContextScheduleEditDay(value); }
    export function setScheduleOffsetMin(value) { setContextScheduleOffsetMin(value); }
    // BUG-013 (QA ) — Pedido del usuario: el stepper "Ajustar turno completo" no tenía límite superior/inferior — hacer click muchas veces en "+" (o "-") podía acumular un offset enorme (ej. +30h) sin ningún aviso.
    const SCHEDULE_OFFSET_LIMIT_MIN = 720;

    configureFinanceContext({
      money, convertedAmountText, iconHtml, escapeHtml, toast, appConfirm, openModal, closeModal,
      saveSettingsOnly, makeLocalId, parseMoney, usdCeilFromCurrencyAmount, higherRateBonusForCalls,
      renderEmojiPicker, render, canPersistLocalChanges,
      applyGoalValues, todayCallDateKey, saveAll,
    });
    configureReportsContext({
      CYCLE_LENGTH_DAYS, RATE, callDateToDate, callsForDay, connectedMinutesForDay, convertedAmountText,
      cycleEarningsForOffset, dayAdherence, dayConfigFor, dayIsEffectivelyOff, dayShiftBounds,
      effectiveCycleGoal, effectiveDailyGoal, effectiveHistoryStartDate, escapeHtml,
      financeConvertedInline, financeConvertedNote, formatCallDayLabel, formatDuration, formatMinutes,
      getActiveDayKey, getCycleGoalOverride, iconHtml, importedCallStats, money, pad, previousCalendarDay,
      onGameDayMetadataChanged, productiveMinutesForDay, saveSettingsOnly, todayCallDateKey, todayRange,
      weekDaysForOffset, weekSummaryForOffset, render,
    });
    configureCalendarContext({
      RATE, callsForDay, closeModal, convertedAmountText, dayIsEffectivelyOff, dayNoteCategoryMeta,
      dayShiftBounds, effectiveDailyGoal, escapeHtml, formatMinutes, getDayNote, higherRateBonusForCalls,
      iconHtml, importedCallStats, money, openModal, pad, productiveMinutesForDay, saveSettingsOnly,
      toast, todayCallDateKey, todayRange,
    });
    configureScheduleContext({
      WEEKDAYS, WEEKDAY_LABELS, WEEKDAY_LABELS_SHORT, appConfirm, defaultDaySchedule, ensureWeeklySchedule,
      formatHHMM, formatMinutes, formatWeekRangeLabel, iconHtml, isScheduleWeekPast, minutesToHHMM,
      onGameDayMetadataChanged, pad, saveAll, snapshotHistoricalPlanning, startOfCycleWeek,
      timeLabel, toMinutes, toast, todayCallDateKey, weekStartKeyFromDate, canPersistLocalChanges, escapeHtml,
    });
    configureCallsContext({
      HIGHER_RATE_TIERS, MAX_CALL_DURATION_MIN, appConfirm, autoStartShiftFromCalls, callDateKeyFromValue, callDedupeKey,
      callsForDay, callsOverlap, closeModal, connectedMinutesForDay, convertedAmountText, dayAdherence,
      dayEvents, dayGapRows, dayKeyFromIsoDate, dayShiftBounds, dayWorkSessions, escapeHtml, financeConvertedInline,
      financeConvertedNote, financeRunAutoFillCascade, formatCallDayLabel, formatDuration, formatHHMM,
      formatMinutes, gapLabelText, getActiveDayKey, higherRateBonusForCall, higherRateTierBadgeHtml,
      iconHtml, importedCallStats, isoDateFromDayKey, makeLocalId, money, onGameCallSaved, onGameCallsChanged, openModal,
      pad, parseMoney, rateTilePerMin, renderRateTiles, sameCallDay, saveAll, timeLabelFromDate,
      toDateFromInputs, toast, todayCallDateKey, playCallSavedSound, canPersistLocalChanges, render,
      stateWithinBudget: value => jsonbBytes(value) <= 2097152,
    });
    configureHigherRateContext({
      HIGHER_RATE_EARLY_GRACE_MIN, HIGHER_RATE_TIERS, appConfirm, callDateKeyFromValue, callDateToDate,
      callsForDay, dayKeyFromIsoDate, escapeHtml, financeConvertedInline, financeRunAutoFillCascade,
      onGameCallsChanged, formatBlockDurationLabel,
      formatCallDayLabel, formatHHMM, formatMinutes, iconHtml, isoDateFromDayKey, makeLocalId,
      mergeIntervals, minutesToHHMM, money, render, saveAll, timeLabel, toDateFromInputs, toMinutes, toast,
      todayCallDateKey, todayRange, canPersistLocalChanges, convertedAmountText, openModal, closeModal,
    });
    configureSettingsContext({
      DEFAULT_USER_EMOJI, EMOJI_CHOICES, RATE, closeModal, convertedAmountText, currencyCeilFromUsdAmount,
      effectiveCycleGoal, effectiveDailyGoal, ensureCurrencySettings, escapeHtml, formatCallDayLabel,
      formatMinutes, getActiveDayKey, getDailyGoalOverride, iconHtml, money, openModal, render,
      onGameDayMetadataChanged, saveSettingsOnly, saveAll, snapshotHistoricalPlanning,
      setDailyGoalOverride, toast, todayCallDateKey,
      usdCeilFromCurrencyAmount,
    });
    configureGameContext({
      appConfirm, callDateKeyFromValue, callDateToDate, callsForDay, closeModal, computeComplianceStreak, convertedAmountText,
      cycleBoundsForOffset, cycleEarningsForOffset, dayAdherence, dayComplianceStatus, dayConfigFor,
      dayIsEffectivelyOff, effectiveCycleGoal, effectiveDailyGoal, escapeHtml, financeConvertedInline,
      financeRowIsMeta, formatCallDayLabel, formatMinutes, higherRateBonusForCall, higherRateLiveStatus,
      importedCallStats, money, openModal, parseMoney, productiveMinutesForDay, saveSettingsOnly,
      saveStateOnly, todayCallDateKey, toast, weekdayKeyForDayKey, renderHeader,
      getReinforcementWorkIntervals: (dayKey) => {
        return reinforcementScheduleIntervals(dayKey).filter((slot) => String(slot.type).toLowerCase() === 'work');
      },
    });
    configurePositiveReinforcementContext({
      callDateKeyFromValue, callsForDay, closeModal, convertedAmountText, effectiveDailyGoal,
      escapeHtml, importedCallStats, openModal, saveSettingsOnly, saveStateOnly, toast,
      todayCallDateKey,
    });

    // Pedido del usuario : Volumen/Avisos con sonido/Adherencia/ Descanso por productividad salieron de Horario — no son horario, son cómo y cuándo te avisa la app.
    function syncNotificationsModalFields() {
      const shiftAlertMinInput = document.getElementById('shiftAlertMinInput');
      if (shiftAlertMinInput && document.activeElement !== shiftAlertMinInput) shiftAlertMinInput.value = settings.alertBeforeShiftMin;
      const masterVolumeInput = document.getElementById('masterVolumeInput');
      const masterVolumeValue = document.getElementById('masterVolumeValue');
      if (masterVolumeInput && document.activeElement !== masterVolumeInput) masterVolumeInput.value = settings.masterVolume;
      if (masterVolumeValue) masterVolumeValue.textContent = `${Math.round(Number(settings.masterVolume) || 0)}%`;
      const breakAlertMinInput = document.getElementById('breakAlertMinInput');
      if (breakAlertMinInput && document.activeElement !== breakAlertMinInput) breakAlertMinInput.value = settings.alertBeforeBreakMin;
      const breakEndAlertMinInput = document.getElementById('breakEndAlertMinInput');
      if (breakEndAlertMinInput && document.activeElement !== breakEndAlertMinInput) breakEndAlertMinInput.value = settings.alertBeforeBreakEndMin;
      const productiveBreakEarnMinInput = document.getElementById('productiveBreakEarnMinInput');
      if (productiveBreakEarnMinInput && document.activeElement !== productiveBreakEarnMinInput) productiveBreakEarnMinInput.value = settings.productiveBreakEarnMin;
      const productiveBreakAwardMinInput = document.getElementById('productiveBreakAwardMinInput');
      if (productiveBreakAwardMinInput && document.activeElement !== productiveBreakAwardMinInput) productiveBreakAwardMinInput.value = settings.productiveBreakAwardMin;
      const productiveBreakSoundInput = document.getElementById('productiveBreakSoundInput');
      if (productiveBreakSoundInput && document.activeElement !== productiveBreakSoundInput) productiveBreakSoundInput.value = settings.productiveBreakSound || 'classic';
      syncProductiveBreakCustomSoundUI();
      // Pedido del usuario: sonido personalizado + mensaje editable también para los 3 avisos de turno/Break/Lunch (antes solo "Descanso por productividad" tenía esto).
      Object.keys(ALARM_SOUND_CONFIGS).forEach((kind) => {
        const cfg = ALARM_SOUND_CONFIGS[kind];
        const select = document.getElementById(cfg.selectId);
        if (select && document.activeElement !== select) select.value = settings[cfg.soundKey] || 'classic';
        if (cfg.toggleId) document.getElementById(cfg.toggleId).checked = settings[cfg.enabledKey] === true;
        syncAlarmCustomSoundUI(kind);
      });
      // Los 5 campos "Mensaje" dejaron de ser editables (ver MESSAGE_PREVIEW_CONFIGS/syncMessagePreview más abajo)
      Object.keys(MESSAGE_PREVIEW_CONFIGS).forEach((kind) => syncMessagePreview(kind));
    }

    async function openNotificationReview() {
      document.getElementById('notificationReview').replaceChildren();
      const owner=settings,view=await loadDetailViews({retry:true});
      if(owner!==settings||!document.getElementById('notificationsModal').classList.contains('open'))return;
      view.renderNotificationReview({ui,translateText,escapeHtml,settings,productive:minutesSinceLastProductiveBreakAnchor,soundConfigs:Object.values(ALARM_SOUND_CONFIGS),valid:()=>owner===settings,navigate:kind=>{
        closeModal('notificationsModal');navigateToPage('achievements');
        const target=document.getElementById(kind==='support'?'positiveSettingsAccordion':'positiveHistoryPanel');
        if(kind==='support')target.open=true;
        target.scrollIntoView({block:'start'});target.setAttribute('tabindex','-1');target.focus({preventScroll:true});
      }});
    }


    export function minutesToHHMM(mins) {
      const m = ((Math.round(mins) % 1440) + 1440) % 1440;
      return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
    }

    // Pedido del usuario: el ciclo de pago (ver cycleBoundsForDate) debe ser ajustable desde Horario. A diferencia del horario por día, esto se guarda solo al cambiar (mismo patrón que dayOffInput), sin esperar a "Guardar día"
    // Las claves de "Semana específica" son el inicio de semana calculado desde
    // el ancla del ciclo: si el ancla se mueve, hay que re-anclarlas o esos
    // horarios dejan de aplicar en silencio.
    function rekeyScheduleWeekOverrides(previousAnchor) {
      const overrides = settings.scheduleOverridesByWeek || {};
      const keys = Object.keys(overrides);
      if (!keys.length || previousAnchor === settings.cycleAnchorDate) return 0;
      const rekeyed = {};
      let moved = 0;
      keys.forEach(key => {
        const d = new Date(`${key}T00:00:00`);
        // Se re-ancla por el CENTRO de la semana vieja: así la semana nueva
        // conserva la mayoría de los días que el usuario había personalizado.
        const mid = Number.isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate() + 3);
        const nextKey = mid ? weekStartKeyFromDate(mid) : key;
        if (nextKey !== key) moved++;
        if (!rekeyed[nextKey]) rekeyed[nextKey] = overrides[key];
      });
      settings.scheduleOverridesByWeek = rekeyed;
      return moved;
    }

    function updateCycleSettings() {
      const anchorInput = document.getElementById('cycleAnchorInput');
      const offsetInput = document.getElementById('cyclePayOffsetInput');
      const previousAnchor = settings.cycleAnchorDate;
      if (anchorInput && /^\d{4}-\d{2}-\d{2}$/.test(anchorInput.value)) {
        settings.cycleAnchorDate = anchorInput.value;
      }
      let offset = Number(offsetInput?.value);
      if (Number.isFinite(offset) && offset >= 0) settings.cyclePayOffsetDays = offset;
      const movedWeeks = rekeyScheduleWeekOverrides(previousAnchor);
      if (saveSettingsOnly() === false) return false;
      render();
      toast(movedWeeks > 0
        ? ui`Ciclo de pago actualizado — ${movedWeeks} semana(s) personalizada(s) de Horario se re-anclaron al nuevo inicio de semana`
        : translateText('Ciclo de pago actualizado'));
    }

    // Pedido del usuario: control de volumen maestro para TODOS los sonidos del programa (avisos de turno/Break/Lunch + descanso productivo, incluyendo el sonido personalizado subido). Se guarda en 'input' (no 'change') a propósito
    function updateMasterVolumeSettings() {
      const input = document.getElementById('masterVolumeInput');
      const label = document.getElementById('masterVolumeValue');
      let vol = Number(input?.value);
      if (!Number.isFinite(vol) || vol < 0 || vol > 100) vol = settings.masterVolume ?? 100;
      settings.masterVolume = vol;
      if (label) label.textContent = `${Math.round(vol)}%`;
      saveSettingsOnly();
    }

    // Pedido del usuario: minutos de aviso antes del turno (ver checkShiftAlarm), ajustable desde Horario. Mismo patrón que updateCycleSettings: se guarda solo al cambiar, sin esperar a "Guardar día".
    function updateShiftAlertSettings() {
      const input = document.getElementById('shiftAlertMinInput');
      const mins = Number(input?.value);
      if (Number.isFinite(mins) && mins >= 0) settings.alertBeforeShiftMin = mins;
      if (saveSettingsOnly() === false) return false;
      toast(settings.alertBeforeShiftMin > 0 ? ui`Aviso configurado: ${formatMinutes(settings.alertBeforeShiftMin)} min antes de tu turno` : translateText('Aviso de turno desactivado'));
    }

    // Mismo patrón que updateShiftAlertSettings(), pero para los 2 avisos de
    // Break/Lunch (inicio y fin), guardados juntos ya que comparten la misma
    // fila de campos en Horario.
    function updateBreakAlertSettings() {
      const startInput = document.getElementById('breakAlertMinInput');
      const endInput = document.getElementById('breakEndAlertMinInput');
      const startMin = Number(startInput?.value);
      const endMin = Number(endInput?.value);
      if (Number.isFinite(startMin) && startMin >= 0) settings.alertBeforeBreakMin = startMin;
      if (Number.isFinite(endMin) && endMin >= 0) settings.alertBeforeBreakEndMin = endMin;
      if (saveSettingsOnly() === false) return false;
      toast(translateText('Aviso de Break/Lunch actualizado'));
    }

    // Ventana de gracia de la Adherencia estilo Calabrio (ver
    // computeMinuteAdherence()). Mismo patrón de auto-guardado que el resto
    // de settings globales de Horario.
    function updateAdherenceGraceSettings() {
      const input = document.getElementById('adherenceGraceMinInput');
      const mins = Number(input?.value);
      if (Number.isFinite(mins) && mins >= 0) settings.adherenceGraceMin = mins;
      saveSettingsOnly();
      onGameDayMetadataChanged(todayCallDateKey());
      render();
      toast(ui`Ventana de gracia de Adherencia: ${formatMinutes(settings.adherenceGraceMin)} min`);
    }

    // Meta de Adherencia (%, mejora D) — mismo patrón de auto-guardado.
    function updateAdherenceGoalSettings() {
      const input = document.getElementById('adherenceGoalPctInput');
      const pct = Number(input?.value);
      if (Number.isFinite(pct) && pct > 0 && pct <= 100) settings.adherenceGoalPct = pct;
      saveSettingsOnly();
      onGameDayMetadataChanged(todayCallDateKey());
      render();
      toast(ui`Meta de Adherencia: ${settings.adherenceGoalPct}%`);
    }

    // Pedido del usuario: minutos productivos para ganar descanso + minutos
    // de descanso otorgados — mismo patrón de auto-guardado que el resto de
    // settings globales de Horario.
    function updateProductiveBreakSettings() {
      const earnInput = document.getElementById('productiveBreakEarnMinInput');
      const awardInput = document.getElementById('productiveBreakAwardMinInput');
      const earnMin = Number(earnInput?.value);
      const awardMin = Number(awardInput?.value);
      if (Number.isFinite(earnMin) && earnMin > 0) settings.productiveBreakEarnMin = earnMin;
      if (Number.isFinite(awardMin) && awardMin >= 0) settings.productiveBreakAwardMin = awardMin;
      if (saveSettingsOnly() === false) return false;
      toast(ui`Descanso por productividad: cada ${formatMinutes(settings.productiveBreakEarnMin)} min productivos = ${formatMinutes(settings.productiveBreakAwardMin)} min de descanso`);
    }

    // Muestra/oculta la sección de subida de archivo según el sonido elegido, y actualiza el texto de estado (nombre del archivo guardado, o aviso de que todavía no hay ninguno).
    function syncProductiveBreakCustomSoundUI() {
      const section = document.getElementById('productiveBreakCustomSoundSection');
      const status = document.getElementById('productiveBreakSoundFileStatus');
      const soundInput = document.getElementById('productiveBreakSoundInput');
      const isCustom = (soundInput ? soundInput.value : settings.productiveBreakSound) === 'custom';
      if (section) section.style.display = isCustom ? '' : 'none';
      if (status) {
        status.textContent = settings.productiveBreakCustomSoundDataUrl
          ? ui`Archivo guardado: ${settings.productiveBreakCustomSoundName || 'sonido personalizado'}`
          : translateText('Ningún archivo propio guardado — usando el beep clásico mientras tanto.');
      }
    }

    // Cambiar el selector de sonido se guarda solo, sin esperar a "Guardar
    // día" (mismo patrón que el resto de settings sueltos de Horario) — y
    // muestra/oculta la sección de subida en vivo.
    function updateProductiveBreakSound() {
      const input = document.getElementById('productiveBreakSoundInput');
      const value = input ? input.value : 'classic';
      if (['classic', 'chime', 'custom'].includes(value)) settings.productiveBreakSound = value;
      saveSettingsOnly();
      syncProductiveBreakCustomSoundUI();
    }

    // Tope defensivo de tamaño para el sonido subido — el Data URL se guarda directo en localStorage junto con el resto de settings, sin backend ni almacenamiento aparte; un archivo grande podría acercarse…
    const MAX_CUSTOM_SOUND_BYTES = 300 * 1024;

    // BUG-011 (QA ) — Pedido del usuario: "Importar JSON" leía el archivo completo con FileReader y ejecutaba JSON.parse sin ningún límite de tamaño, a diferencia de la subida de sonidos (que sí tiene un to…
    const MAX_IMPORT_JSON_BYTES = 8 * 1024 * 1024;

    function handleProductiveBreakSoundFile(e) {
      const input = e.target;
      const file = input.files && input.files[0];
      input.value = ''; // permite volver a elegir el mismo archivo después
      if (!file) return;
      if (!file.type || !file.type.startsWith('audio/')) {
        toast(translateText('El archivo debe ser de audio (MP3, WAV, OGG...).'));
        return;
      }
      if (file.size > MAX_CUSTOM_SOUND_BYTES) {
        toast(ui`El archivo pesa demasiado (máximo ${Math.round(MAX_CUSTOM_SOUND_BYTES / 1024)}KB) — usa un sonido corto.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (!settingsWithinBudget({ ...settings, productiveBreakCustomSoundDataUrl: String(reader.result || ''),
          productiveBreakCustomSoundName: file.name, productiveBreakSound: 'custom' })) {
          toast(translateText('Este sonido supera el espacio disponible para tus ajustes. Usa un archivo más pequeño o elimina otro sonido personalizado.'));
          return;
        }
        const previous = {
          dataUrl: settings.productiveBreakCustomSoundDataUrl,
          name: settings.productiveBreakCustomSoundName,
          sound: settings.productiveBreakSound,
        };
        settings.productiveBreakCustomSoundDataUrl = String(reader.result || '');
        settings.productiveBreakCustomSoundName = file.name;
        settings.productiveBreakSound = 'custom';
        if (!saveSettingsOnly()) {
          // saveSettingsOnly reporta cuota llena sin lanzar excepción; se restaura el último estado
          // persistible para que la UI nunca anuncie éxito con un sonido que desaparecerá al recargar.
          settings.productiveBreakCustomSoundDataUrl = previous.dataUrl;
          settings.productiveBreakCustomSoundName = previous.name;
          settings.productiveBreakSound = previous.sound;
          saveSettingsOnly();
          toast(translateText('No se pudo guardar el sonido — el almacenamiento del navegador está lleno.'));
          syncProductiveBreakCustomSoundUI();
          return;
        }
        const soundSelect = document.getElementById('productiveBreakSoundInput');
        if (soundSelect) soundSelect.value = 'custom';
        syncProductiveBreakCustomSoundUI();
        toast(ui`Sonido "${file.name}" guardado`);
      };
      reader.onerror = () => toast(translateText('No se pudo leer el archivo de audio.'));
      reader.readAsDataURL(file);
    }

    // Botón "🔊 Probar" — reproduce el sonido configurado ahora mismo, sin esperar a que se cumpla el umbral de minutos productivos.
    function testProductiveBreakSound() {
      playProductiveBreakSound();
    }

    // Sonido personalizado + mensaje para los 3 avisos de turno/Break/ Lunch (pedido del usuario) ---- Mismo patrón que productiveBreakSound/CustomSoundDataUrl/Name de arriba, generalizado con un mapa {kind…
    const ALARM_SOUND_CONFIGS = {
      shift: {
        soundKey: 'shiftAlarmSound', urlKey: 'shiftAlarmCustomSoundDataUrl', nameKey: 'shiftAlarmCustomSoundName',
        selectId: 'shiftAlarmSoundInput', sectionId: 'shiftAlarmCustomSoundSection', statusId: 'shiftAlarmSoundFileStatus', fileInputId: 'shiftAlarmSoundFile',
      },
      breakStart: {
        soundKey: 'breakStartAlarmSound', urlKey: 'breakStartAlarmCustomSoundDataUrl', nameKey: 'breakStartAlarmCustomSoundName',
        selectId: 'breakStartAlarmSoundInput', sectionId: 'breakStartAlarmCustomSoundSection', statusId: 'breakStartAlarmSoundFileStatus', fileInputId: 'breakStartAlarmSoundFile',
      },
      breakEnd: {
        soundKey: 'breakEndAlarmSound', urlKey: 'breakEndAlarmCustomSoundDataUrl', nameKey: 'breakEndAlarmCustomSoundName',
        selectId: 'breakEndAlarmSoundInput', sectionId: 'breakEndAlarmCustomSoundSection', statusId: 'breakEndAlarmSoundFileStatus', fileInputId: 'breakEndAlarmSoundFile',
      },
      callEnded: {
        soundKey:'callEndedAlarmSound', urlKey:'callEndedAlarmCustomSoundDataUrl', nameKey:'callEndedAlarmCustomSoundName', enabledKey:'callEndedSoundEnabled',
        selectId:'callEndedAlarmSoundInput', sectionId:'callEndedAlarmCustomSoundSection', statusId:'callEndedAlarmSoundFileStatus', fileInputId:'callEndedAlarmSoundFile',
        toggleId:'callEndedSoundEnabledInput', testId:'testCallEndedSoundBtn', clearId:'clearCallEndedSoundBtn',
      },
      callPasted: {
        soundKey:'callPastedAlarmSound', urlKey:'callPastedAlarmCustomSoundDataUrl', nameKey:'callPastedAlarmCustomSoundName', enabledKey:'callPastedSoundEnabled',
        selectId:'callPastedAlarmSoundInput', sectionId:'callPastedAlarmCustomSoundSection', statusId:'callPastedAlarmSoundFileStatus', fileInputId:'callPastedAlarmSoundFile',
        toggleId:'callPastedSoundEnabledInput', testId:'testCallPastedSoundBtn', clearId:'clearCallPastedSoundBtn',
      },
      callManual: {
        soundKey:'callManualAlarmSound', urlKey:'callManualAlarmCustomSoundDataUrl', nameKey:'callManualAlarmCustomSoundName', enabledKey:'callManualSoundEnabled',
        selectId:'callManualAlarmSoundInput', sectionId:'callManualAlarmCustomSoundSection', statusId:'callManualAlarmSoundFileStatus', fileInputId:'callManualAlarmSoundFile',
        toggleId:'callManualSoundEnabledInput', testId:'testCallManualSoundBtn', clearId:'clearCallManualSoundBtn',
      },
    };
    const alarmSoundReadVersions = new Map();

    // Plantillas de mensaje editables — separado del mapa de sonido porque "Descanso por productividad" SÍ participa aquí (2 mensajes propios, primera vez / repeticiones) aunque su sonido siga con sus funci…
    const ALARM_MESSAGE_CONFIGS = {
      shift: { key: 'shiftAlarmMessage', inputId: 'shiftAlarmMessageInput' },
      breakStart: { key: 'breakStartAlarmMessage', inputId: 'breakStartAlarmMessageInput' },
      breakEnd: { key: 'breakEndAlarmMessage', inputId: 'breakEndAlarmMessageInput' },
      productiveBreakFirst: { key: 'productiveBreakMessageFirst', inputId: 'productiveBreakMessageFirstInput' },
      productiveBreakRepeat: { key: 'productiveBreakMessageRepeat', inputId: 'productiveBreakMessageRepeatInput' },
    };

    // Pedido del usuario: los 5 campos "Mensaje" (ALARM_MESSAGE_CONFIGS de arriba, sin tocar — sigue siendo la fuente de verdad de qué settings.xxxMessage/inputId le corresponde a cada aviso) dejan de ser editables desde este modal
    const MESSAGE_PREVIEW_CONFIGS = {
      shift: {
        key: 'shiftAlarmMessage', boxId: 'shiftAlarmMessagePreview', tooltipTextId: 'shiftAlarmMsgTooltipText',
        varsFn: () => {
          const cfg = dayConfigFor(todayCallDateKey());
          const startHHMM = (cfg && cfg.start) ? formatHHMM(cfg.start) : '07:00';
          return { hora: timeLabel(startHHMM) };
        },
      },
      breakStart: {
        key: 'breakStartAlarmMessage', boxId: 'breakStartAlarmMessagePreview', tooltipTextId: 'breakStartAlarmMsgTooltipText',
        varsFn: () => {
          const slot = getEffectiveScheduleForDay(todayCallDateKey()).find(s => s.type === 'Break' || s.type === 'Lunch');
          return {
            tipo: slot ? (slot.type === 'Lunch' ? translateText('Lunch') : translateText('Break')) : translateText('Break'),
            hora: slot ? timeLabel(slot.start) : timeLabel('10:00'),
          };
        },
      },
      breakEnd: {
        key: 'breakEndAlarmMessage', boxId: 'breakEndAlarmMessagePreview', tooltipTextId: 'breakEndAlarmMsgTooltipText',
        varsFn: () => {
          const slot = getEffectiveScheduleForDay(todayCallDateKey()).find(s => s.type === 'Break' || s.type === 'Lunch');
          return {
            tipo: slot ? (slot.type === 'Lunch' ? translateText('Lunch') : translateText('Break')) : translateText('Break'),
            hora: slot ? timeLabel(slot.end) : timeLabel('10:15'),
          };
        },
      },
      productiveBreakFirst: {
        key: 'productiveBreakMessageFirst', boxId: 'productiveBreakMessageFirstPreview', tooltipTextId: 'productiveBreakMessageFirstTooltipText',
        varsFn: () => ({
          productivo: formatMinutes(Number(settings.productiveBreakEarnMin) || 30),
          descanso: formatMinutes(Number(settings.productiveBreakAwardMin) || 5),
        }),
      },
      productiveBreakRepeat: {
        key: 'productiveBreakMessageRepeat', boxId: 'productiveBreakMessageRepeatPreview', tooltipTextId: 'productiveBreakMessageRepeatTooltipText',
        varsFn: () => ({
          productivo: formatMinutes(Number(settings.productiveBreakEarnMin) || 30),
          descanso: formatMinutes(Number(settings.productiveBreakAwardMin) || 5),
        }),
      },
    };

    // Envuelve cada {variable} de la plantilla en un <span> resaltado — escapeHtml primero (mismo criterio que el resto de la app:
    function messagePreviewHtml(template) {
      return escapeHtml(String(template || '')).replace(/\{(\w+)\}/g, '<span class="msg-preview-var">{$1}</span>');
    }

    function syncMessagePreview(kind) {
      const cfg = MESSAGE_PREVIEW_CONFIGS[kind];
      if (!cfg) return;
      const template = settings[cfg.key] || '';
      const box = document.getElementById(cfg.boxId);
      if (box) box.innerHTML = messagePreviewHtml(template);
      const tooltipTextEl = document.getElementById(cfg.tooltipTextId);
      if (tooltipTextEl) tooltipTextEl.textContent = renderAlertTemplate(template, cfg.varsFn());
    }

    function syncAlarmCustomSoundUI(kind) {
      const cfg = ALARM_SOUND_CONFIGS[kind];
      if (!cfg) return;
      const section = document.getElementById(cfg.sectionId);
      const status = document.getElementById(cfg.statusId);
      const soundInput = document.getElementById(cfg.selectId);
      const isCustom = (soundInput ? soundInput.value : settings[cfg.soundKey]) === 'custom';
      if (section) section.style.display = isCustom ? '' : 'none';
      if (status) {
        status.textContent = settings[cfg.urlKey]
          ? ui`Archivo guardado: ${settings[cfg.nameKey] || 'sonido personalizado'}`
          : translateText('Ningún archivo propio guardado — usando el beep clásico mientras tanto.');
      }
      if (cfg.clearId) {
        const button = document.getElementById(cfg.clearId);
        button.disabled = !settings[cfg.urlKey];
        button.style.display = settings[cfg.urlKey] ? '' : 'none';
      }
    }

    function updateAlarmSound(kind) {
      const cfg = ALARM_SOUND_CONFIGS[kind];
      if (!cfg) return;
      const input = document.getElementById(cfg.selectId);
      const value = input ? input.value : 'classic';
      const owner = settings, previous = settings[cfg.soundKey];
      alarmSoundReadVersions.set(kind, (alarmSoundReadVersions.get(kind) || 0) + 1);
      if (['classic', 'chime', 'custom'].includes(value)) settings[cfg.soundKey] = value;
      if (saveSettingsOnly() === false) {
        if (settings === owner) settings[cfg.soundKey] = previous;
        if (input) input.value = settings[cfg.soundKey];
        toast(translateText('No se cambió el sonido porque no se pudo guardar.'), {persistenceFailure:true});
      }
      syncAlarmCustomSoundUI(kind);
    }

    function updateCallSoundEnabled(kind) {
      const cfg = ALARM_SOUND_CONFIGS[kind];
      if (!cfg?.enabledKey) return;
      const owner = settings, previous = settings[cfg.enabledKey], input = document.getElementById(cfg.toggleId);
      settings[cfg.enabledKey] = input.checked;
      if (saveSettingsOnly() === false) {
        if (settings === owner) settings[cfg.enabledKey] = previous;
        input.checked = settings[cfg.enabledKey] === true;
        toast(translateText('No se cambió el aviso de llamada porque no se pudo guardar.'), {persistenceFailure:true});
      }
    }

    function clearAlarmCustomSound(kind) {
      const cfg = ALARM_SOUND_CONFIGS[kind];
      if (!cfg?.clearId) return;
      alarmSoundReadVersions.set(kind, (alarmSoundReadVersions.get(kind) || 0) + 1);
      const owner = settings, previous = {url:settings[cfg.urlKey], name:settings[cfg.nameKey], sound:settings[cfg.soundKey]};
      settings[cfg.urlKey] = ''; settings[cfg.nameKey] = ''; settings[cfg.soundKey] = 'classic';
      if (saveSettingsOnly() === false) {
        if (settings === owner) { settings[cfg.urlKey] = previous.url; settings[cfg.nameKey] = previous.name; settings[cfg.soundKey] = previous.sound; }
        toast(translateText('No se quitó el sonido porque no se pudo guardar.'), {persistenceFailure:true});
      } else toast(translateText('Sonido personalizado eliminado. Se usará el beep clásico.'));
      document.getElementById(cfg.selectId).value = settings[cfg.soundKey];
      syncAlarmCustomSoundUI(kind);
    }

    function handleAlarmSoundFile(kind, e) {
      const cfg = ALARM_SOUND_CONFIGS[kind];
      if (!cfg) return;
      const input = e.target;
      const file = input.files && input.files[0];
      input.value = '';
      if (!file) return;
      if (!file.type || !file.type.startsWith('audio/')) {
        toast(translateText('El archivo debe ser de audio (MP3, WAV, OGG...).'));
        return;
      }
      if (file.size > MAX_CUSTOM_SOUND_BYTES) {
        toast(ui`El archivo pesa demasiado (máximo ${Math.round(MAX_CUSTOM_SOUND_BYTES / 1024)}KB) — usa un sonido corto.`);
        return;
      }
      const reader = new FileReader();
      const owner = settings;
      const readVersion = (alarmSoundReadVersions.get(kind) || 0) + 1;
      alarmSoundReadVersions.set(kind, readVersion);
      reader.onload = () => {
        if (settings !== owner || alarmSoundReadVersions.get(kind) !== readVersion) return;
        const previous = {
          dataUrl: settings[cfg.urlKey],
          name: settings[cfg.nameKey],
          sound: settings[cfg.soundKey],
        };
        if (!settingsWithinBudget({ ...settings, [cfg.urlKey]: String(reader.result || ''),
          [cfg.nameKey]: file.name, [cfg.soundKey]: 'custom' })) {
          toast(translateText('Este sonido supera el espacio disponible para tus ajustes. Usa un archivo más pequeño o elimina otro sonido personalizado.'));
          return;
        }
        settings[cfg.urlKey] = String(reader.result || '');
        settings[cfg.nameKey] = file.name;
        settings[cfg.soundKey] = 'custom';
        if (!saveSettingsOnly()) {
          if (settings === owner) {
            settings[cfg.urlKey] = previous.dataUrl;
            settings[cfg.nameKey] = previous.name;
            settings[cfg.soundKey] = previous.sound;
          }
          document.getElementById(cfg.selectId).value = settings[cfg.soundKey];
          toast(translateText('No se pudo guardar el sonido. Tu archivo anterior se conservó.'), {persistenceFailure:true});
          syncAlarmCustomSoundUI(kind);
          return;
        }
        const soundSelect = document.getElementById(cfg.selectId);
        if (soundSelect) soundSelect.value = 'custom';
        syncAlarmCustomSoundUI(kind);
        toast(ui`Sonido "${file.name}" guardado`);
      };
      reader.onerror = () => toast(translateText('No se pudo leer el archivo de audio.'));
      reader.readAsDataURL(file);
    }

    // Botón "🔊 Probar" de cada uno de los 3 avisos — reproduce el sonido
    // configurado ahora mismo (mismo criterio que testProductiveBreakSound()).
    function testAlarmSound(kind) {
      const cfg = ALARM_SOUND_CONFIGS[kind];
      if (!cfg) return;
      playConfiguredAlarmSound(settings[cfg.soundKey], settings[cfg.urlKey]);
    }

    // Guarda el mensaje editado — si se deja vacío, cae de vuelta al default de fábrica (mismo criterio que ensureCurrencySettings ya aplica al cargar) en vez de guardar una plantilla en blanco que dejaría…
    function updateAlarmMessage(kind) {
      const cfg = ALARM_MESSAGE_CONFIGS[kind];
      if (!cfg) return;
      const input = document.getElementById(cfg.inputId);
      const value = String(input?.value || '').trim();
      settings[cfg.key] = value || defaultSettings()[cfg.key];
      if (input) input.value = settings[cfg.key];
      if (saveSettingsOnly() === false) return false;
      toast(translateText('Mensaje del aviso actualizado'));
    }




async function renderEarningsDetails(retry = false) {
  const panels = ['day', 'cycle'].map(scope => ({ scope,
    panel: document.getElementById(scope === 'day' ? 'earningsDayBreakdown' : 'earningsCycleBreakdown') }))
    .filter(({ panel }) => panel?.open);
  if (!panels.length) return;
  const view = await loadDetailViews({ retry });
  for (const { scope, panel } of panels) {
    if (!panel.open || !panel.isConnected) continue;
    const wrap = panel.querySelector('[data-earnings-breakdown]');
    if (!view) {
      const message = translateText('No se pudo cargar el detalle. Cerrá y abrí esta sección para reintentar.');
      if (wrap.textContent !== message) wrap.textContent = message;
      continue;
    }
    let sourceCalls, scopeLabel;
    if (scope === 'day') {
      sourceCalls = callsForDay(getActiveDayKey());
      scopeLabel = formatCallDayLabel(getActiveDayKey());
    } else {
      const { start, end } = cycleBoundsForOffset();
      sourceCalls = calls.filter(call => { const date = callDateToDate(call.callDate); return date && date >= start && date <= end; });
      scopeLabel = ui`${formatCallDayLabel(todayCallDateKey(start))} – ${formatCallDayLabel(todayCallDateKey(end))}`;
    }
    view.renderEarningsBreakdown(wrap, sourceCalls, { ui, translateText, escapeHtml, money,
      financeConvertedInline, parseMoney, higherRateBonusForCall, scopeLabel,
      exchangeRate: settings.exchangeRate, currencyLabel: settings.currencyLabel });
  }
}

async function openWorkDayReview() {
  const owner = settings, dayKey = getActiveDayKey(), view = await loadDetailViews({ retry: true });
  if (owner !== settings || dayKey !== getActiveDayKey()) return;
  if (!view) { toast(translateText('No se pudo cargar el detalle. Cerrá y abrí esta sección para reintentar.')); return; }
  view.openWorkDayReview({ ui, translateText, escapeHtml, isViewingToday, computeCurrentAcwStart, effectiveDailyGoal, reinforcementScheduleIntervals, fmtTime, sameCallDay, todayCallDateKey, callDateKeyFromValue, formatDuration, pauseDurationExcludingCalls, formatCallDayLabel, importedCallStats, callsForDay, effectiveCycleGoal, getCycleGoalOverride, minuteAdherenceForDay, dayWorkSessions, dayAdherence, EXCEPTION_REASON_LABELS, formatMinutes, money, financeConvertedInline, openModal, dayKey, state, settings });
}

function renderHeader() {
      renderEarningsDetails();
  const now = new Date();
  const dayKey = getActiveDayKey();
  const dayCalls = callsForDay(dayKey);
  const shiftBounds = dayShiftBounds(dayKey);
  const hasShift = !!shiftBounds.start;

  document.getElementById('clockNow').textContent = clockTimeVisible ? fmtTime(now) : '--:--:--';
  document.getElementById('clockDate').textContent = fmtDate(now);
  document.getElementById('stateText').textContent = translateText(currentStateLabel());
  const continuationHint = document.getElementById('pauseContinuationHint');
  if (continuationHint) continuationHint.hidden = !state.activePause?.continuationClosedPause;

  // Chip de ACW/AfterCallWork en vivo — visible solo mientras aplica (computeCurrentAcwStart ya filtra
  // turno no iniciado/terminado y llamada/pausa activa).
  const acwLiveChip = document.getElementById('acwLiveChip');
  const acwLiveTimer = document.getElementById('acwLiveTimer');
  if (acwLiveChip && acwLiveTimer) {
    const acwStart = computeCurrentAcwStart();
    if (acwStart) {
      acwLiveChip.style.display = '';
      acwLiveTimer.textContent = formatDuration(now.getTime() - acwStart.getTime());
    } else {
      acwLiveChip.style.display = 'none';
    }
  }

  const greetingTitleEl = document.getElementById('greetingTitle');
  if (greetingTitleEl) greetingTitleEl.textContent = greetingText(now);
  const greetingSubtitleText = translateText('Jamás negocio con mis excusas: no hacer nada también es una. Doy el primer paso y avanzo hasta lograr lo que me propongo.');
  const greetingSubtitleEl = document.getElementById('greetingSubtitle');
  if (greetingSubtitleEl && greetingSubtitleEl.textContent !== greetingSubtitleText) {
    greetingSubtitleEl.textContent = greetingSubtitleText;
  }

  const daySelector = document.getElementById('daySelector');
  if (daySelector) {
    // El selector es un <input type="date">: no se reescriben opciones en cada tick.
    const isUserInteracting = document.activeElement === daySelector;
    if (!isUserInteracting) {
      const isoValue = isoDateFromDayKey(dayKey);
      if (daySelector.value !== isoValue) daySelector.value = isoValue;
    }
  }
  const viewingToday = isViewingToday();
  document.getElementById('dayActiveLabelBtn').textContent = viewingToday ? translateText('Hoy') : translateText('Historial');
  // El título de "Ganancias de hoy"/"Ganancias del ciclo" ya no se sobreescribe aquí cuando la
  // pastilla "Hoy/Ciclo" está en modo 'cycle'.
  const earningsTitle = document.getElementById('earningsSectionTitle');
  if (earningsTitle && earningsViewMode === 'day') earningsTitle.textContent = earningsSectionLabel(dayKey);

  const status = currentStateLabel();
  const dot = document.getElementById('stateDot');
  // 'En llamada' usa cian (--cyan), color que no se repite con ninguno de los otros estados
  // (Working=verde, Break=amarillo, Lunch=azul, Finalizado=rosado), para que se distinga de un
  // vistazo.
  const color = status === 'Working' ? 'var(--good)' : status === 'Break' ? 'var(--warn)' : status === 'Lunch' ? 'var(--blue)' : status === 'Finalizado' ? 'var(--bad)' : status === 'En llamada' ? 'var(--cyan)' : 'var(--muted)';
  dot.style.background = color;
  dot.style.boxShadow = `0 0 18px rgba(${status === 'Working' ? '102,226,165' : status === 'Break' ? '255,209,92' : status === 'Lunch' ? '124,140,255' : status === 'Finalizado' ? '255,111,143' : status === 'En llamada' ? '47,213,255' : '145,163,184'}, .45)`;

  const shiftBtn = document.getElementById('shiftControlBtn');
  const shiftLabel = document.getElementById('shiftControlLabel');
  const shiftSub = document.getElementById('shiftControlSub');
  shiftLabel.textContent = shiftActionLabel();
  const shiftWindowLabel = `${timeLabel(getShiftWindow().start)} – ${timeLabel(getShiftWindow().end)}`;
  const startingNewShift = shiftWouldStartNew();
  const isDayOffBlocking = viewingToday && startingNewShift && todayIsOff();
  const tooEarly = viewingToday && !isDayOffBlocking && shiftStartTooEarly();
  let earlySubtext = '';
  if (tooEarly) {
    const cfgToday = dayConfigFor(todayCallDateKey());
    const availableFrom = new Date(dateAtTime(now, formatHHMM(cfgToday.start)).getTime() - SHIFT_START_EARLY_GRACE_MIN * 60000);
    earlySubtext = ui`Disponible desde ${timeLabelFromDate(availableFrom)}`;
  }
  shiftSub.textContent = !viewingToday
    ? translateText("Solo disponible viendo 'Hoy'")
    : startingNewShift
      ? (isDayOffBlocking ? translateText('Hoy es tu día libre') : (tooEarly ? earlySubtext : shiftWindowLabel))
      : translateText('Activo');
  shiftBtn.disabled = shiftActionDisabled();
  // El acento se aplica con data-accent + .is-active, sin estilos inline.
  const shiftIsPrimary = shiftActionTone() === 'primary';
  shiftBtn.dataset.accent = shiftIsPrimary ? 'cyan' : 'bad';
  shiftBtn.classList.toggle('is-active', !shiftIsPrimary);

  const breakBtn = document.getElementById('breakControlBtn');
  const lunchBtn = document.getElementById('lunchControlBtn');
  const breakLabel = document.getElementById('breakControlLabel');
  const lunchLabel = document.getElementById('lunchControlLabel');
  const breakTimer = document.getElementById('breakControlTimer');
  const lunchTimer = document.getElementById('lunchControlTimer');

  breakLabel.textContent = pauseActionLabel('break');
  lunchLabel.textContent = pauseActionLabel('lunch');
  breakTimer.textContent = viewingToday ? pauseActionTimer('break') : translateText("Solo en 'Hoy'");
  lunchTimer.textContent = viewingToday ? pauseActionTimer('lunch') : translateText("Solo en 'Hoy'");

  breakBtn.disabled = pauseActionDisabled('break');
  lunchBtn.disabled = pauseActionDisabled('lunch');

  const breakActive = state.activePause && state.activePause.type === 'break';
  const lunchActive = state.activePause && state.activePause.type === 'lunch';
  // Mismo patrón que el shift: .is-active en vez de estilos inline.
  breakBtn.classList.toggle('is-active', !!breakActive);
  lunchBtn.classList.toggle('is-active', !!lunchActive);

  const callBtn = document.getElementById('callControlBtn');
  const callLabel = document.getElementById('callControlLabel');
  const callTimer = document.getElementById('callControlTimer');
  callLabel.textContent = callActionLabel();
  callTimer.textContent = viewingToday
    ? (!state.activeCall && liveCallDayIsOff() ? translateText('Hoy es tu día libre') : callActionTimer())
    : translateText("Solo en 'Hoy'");
  callBtn.disabled = callActionDisabled();
  const callActive = !!state.activeCall;
  callBtn.classList.toggle('is-active', callActive);

  const connected = hasShift ? connectedMinutesForDay(dayKey) : 0;
  const productive = productiveMinutesForDay(dayKey);
  const stats = importedCallStats(dayCalls);
  const dayGoal = effectiveDailyGoal(dayKey);
  const goalMin = dayGoal.min;
  const goalUsd = dayGoal.usd;
  const goalPct = goalUsd > 0 ? Math.min(100, (stats.earnings / goalUsd) * 100) : 0;
  const milestonesEnabled = settings.game?.enabled === true && goalUsd > 0;
  const milestoneProgress = milestonesEnabled ? onGameMonetaryProgress(dayKey, stats.earnings, goalUsd, { silent: true, record: false }) : null;
  const milestoneDetails = document.getElementById('gameMilestones');
  if (milestoneDetails) milestoneDetails.hidden = !milestonesEnabled;
  const milestoneScore = document.getElementById('gameMilestonesScore');
  if (milestoneScore) milestoneScore.textContent = `${milestoneProgress?.claimed.length || 0}/4`;
  const milestoneRow = document.getElementById('earningsMilestoneMarkers');
  if (milestoneRow) {
    milestoneRow.hidden = !milestonesEnabled;
    milestoneRow.innerHTML = milestonesEnabled ? [25, 50, 75, 100].map((pct) => ui`<span class="earnings-milestone-mark" data-reached="${milestoneProgress.claimed.includes(pct)}" style="--milestone-position:${pct}%" aria-label="${pct}%${milestoneProgress.claimed.includes(pct) ? ', hito registrado' : ''}"><span aria-hidden="true">${milestoneProgress.claimed.includes(pct) ? '✓ ' : ''}${pct}%</span></span>`).join('') : '';
  }
  document.getElementById('remainingText').hidden = milestonesEnabled;
  const nextMilestone = document.getElementById('earningsNextMilestone');
  if (nextMilestone) {
    nextMilestone.hidden = !milestonesEnabled;
    const next = milestoneProgress?.next;
    nextMilestone.textContent = !milestonesEnabled ? '' : next ? ui`Próximo hito: ${next.pct}% · te faltan ${money(next.remaining)}${convertedAmountText(next.remaining) ? ` (${convertedAmountText(next.remaining)})` : ''}` : translateText('100% de tu meta diaria alcanzado');
  }
  // Si aplica un bono de Higher Rate en las llamadas de hoy, lograr la meta debería tomar MENOS
  // minutos.
  const rateForGoal = Number(settings.rate) > 0 ? Number(settings.rate) : RATE;
  const higherRateBonusMinEquivalent = rateForGoal > 0 ? (stats.higherRateBonus || 0) / rateForGoal : 0;
  const remainingMin = Math.max(0, goalMin - productive - higherRateBonusMinEquivalent);

  renderEarningsCurrency('earningsValue', 'earningsConvertedText', stats.earnings);
  document.getElementById('goalPctBadge').textContent = `${Math.round(goalPct)}%`;
  // Anillo circular de % (reemplaza la vieja escala de puntos 0/25/ 50/75/100%, ver más abajo) —
  // mismo patrón conic-gradient que ya usa `.sidebar-progress-ring`, con su propia variable
  // `--ring-pct`.
  const earningsGoalRingEl = document.getElementById('earningsGoalRing');
  if (earningsGoalRingEl) earningsGoalRingEl.style.setProperty('--ring-pct', String(goalPct));
  // Estas 4 metas (Meta $, ≈ conversión, Meta min, restantes) pasaron de píldora a texto plano
  // (ver.goal-plain-row en el CSS)
  const goalDailyLabelEl = document.getElementById('goalDailyLabel');
  if (goalDailyLabelEl) goalDailyLabelEl.textContent = dayGoal.isOverride ? translateText('Meta solo de este día') : translateText('Meta diaria');
  document.getElementById('goalAmountBadge').innerHTML = ui`<span class="gp-label">Meta</span><span class="gp-value">${escapeHtml(money(goalUsd))}</span>`;
  const goalAmountConvertedEl = document.getElementById('goalAmountConvertedText');
  if (goalAmountConvertedEl) {
    // Se arma a mano en vez de reutilizar convertedAmountText (que devuelve un solo string "≈ L
    // 123.45") porque aquí el "≈" necesita ir en el label muted y "L 123.45" en el valor bold.
    const exchangeRate = Number(settings.exchangeRate);
    const currencyLabelTrimmed = String(settings.currencyLabel || '').trim();
    const hasCurrency = Number.isFinite(exchangeRate) && exchangeRate > 0 && !!currencyLabelTrimmed;
    if (hasCurrency) {
      const convertedValue = currencyCeilFromUsdAmount(goalUsd, exchangeRate).toFixed(2);
      goalAmountConvertedEl.innerHTML = ui`<span class="gp-label">≈</span><span class="gp-value">${escapeHtml(currencyLabelTrimmed)} ${convertedValue}</span>`;
      goalAmountConvertedEl.style.display = '';
    } else {
      goalAmountConvertedEl.innerHTML = '';
      goalAmountConvertedEl.style.display = 'none';
    }
  }
  document.getElementById('goalMinBadge').innerHTML = ui`<span class="gp-label">Meta</span><span class="gp-value">${formatMinutes(goalMin)} min</span>`;
  document.getElementById('remainingText').innerHTML = ui`<span class="gp-label">Restan</span><span class="gp-value">${formatMinutes(remainingMin)} min</span>`;

  // Ciclo mostrado ahora mismo, independiente de "Día activo".
  const cycle = cycleEarningsForOffset(cycleViewOffset);
  renderEarningsCurrency('cycleEarningsValue', 'cycleEarningsConvertedText', cycle.earnings);
  const cycleRangeEl = document.getElementById('cycleRangeBadge');
  if (cycleRangeEl) cycleRangeEl.textContent = ui`Ciclo: ${formatCallDayLabel(todayCallDateKey(cycle.start))} – ${formatCallDayLabel(todayCallDateKey(cycle.end))}${cycleViewOffset === 0 ? ' (actual)' : ''}`;
  const cyclePayEl = document.getElementById('cyclePayDateBadge');
  if (cyclePayEl) cyclePayEl.textContent = ui`Pago: ${formatCallDayLabel(todayCallDateKey(cycle.payDate))}`;
  const cycleWeek1El = document.getElementById('cycleWeek1ProductiveTag');
  if (cycleWeek1El) cycleWeek1El.textContent = ui`Semana 1: ${formatDuration(cycle.week1ProductiveMin * 60000)}`;
  const cycleWeek2El = document.getElementById('cycleWeek2ProductiveTag');
  if (cycleWeek2El) cycleWeek2El.textContent = ui`Semana 2: ${formatDuration(cycle.week2ProductiveMin * 60000)}`;
  const cycleTotalEl = document.getElementById('cycleTotalProductiveTag');
  if (cycleTotalEl) cycleTotalEl.textContent = ui`Total: ${formatDuration(cycle.totalProductiveMin * 60000)}`;
  // Mismo chip de bono por nivel que ya usa "Ganancias de hoy" (higherRateBonusChipsHtml), ahora
  // también en "Ganancias del ciclo" — ver cycleEarningsForBounds para el nuevo
  // cycle.higherRateBreakdown.
  const cycleBonusRowEl = document.getElementById('cycleBonusRow');
  if (cycleBonusRowEl) cycleBonusRowEl.innerHTML = higherRateBonusChipsHtml(cycle.higherRateBreakdown);
  // Comparación contra la Meta del ciclo, también en Inicio.
  const cycleGoalAmount = effectiveCycleGoal(cycleViewOffset);
  const cycleGoalPct = cycleGoalAmount > 0 ? Math.min(100, (cycle.earnings / cycleGoalAmount) * 100) : 0;
  const cycleGoalRingEl = document.getElementById('cycleGoalRing');
  if (cycleGoalRingEl) cycleGoalRingEl.style.setProperty('--ring-pct', String(cycleGoalPct));
  const cycleGoalPctBadgeEl = document.getElementById('cycleGoalPctBadge');
  if (cycleGoalPctBadgeEl) cycleGoalPctBadgeEl.textContent = `${Math.round(cycleGoalPct)}%`;
  const cycleGoalAmountBadgeEl = document.getElementById('cycleGoalAmountBadge');
  if (cycleGoalAmountBadgeEl) cycleGoalAmountBadgeEl.textContent = ui`Meta ${money(cycleGoalAmount)}`;
  // Mismo equivalente en moneda secundaria que ya muestra "Meta diaria" (#goalAmountConvertedText,
  // ver ese bloque más arriba) — se replica aquí tal cual para "Meta del ciclo", cambiando solo
  // goalUsd por cycleGoalAmount.
  const cycleGoalAmountConvertedEl = document.getElementById('cycleGoalAmountConvertedText');
  if (cycleGoalAmountConvertedEl) {
    const cycleExchangeRate = Number(settings.exchangeRate);
    const cycleCurrencyLabelTrimmed = String(settings.currencyLabel || '').trim();
    const cycleHasCurrency = Number.isFinite(cycleExchangeRate) && cycleExchangeRate > 0 && !!cycleCurrencyLabelTrimmed;
    if (cycleHasCurrency) {
      const cycleConvertedValue = currencyCeilFromUsdAmount(cycleGoalAmount, cycleExchangeRate).toFixed(2);
      cycleGoalAmountConvertedEl.innerHTML = ui`<span class="gp-label">≈</span><span class="gp-value">${escapeHtml(cycleCurrencyLabelTrimmed)} ${cycleConvertedValue}</span>`;
      cycleGoalAmountConvertedEl.style.display = '';
    } else {
      cycleGoalAmountConvertedEl.innerHTML = '';
      cycleGoalAmountConvertedEl.style.display = 'none';
    }
  }
  const cycleGoalBarEl = document.getElementById('cycleGoalBar');
  if (cycleGoalBarEl) cycleGoalBarEl.style.width = `${cycleGoalPct}%`;
  const isCustomCycleGoal = getCycleGoalOverride(cycleViewOffset) !== null;
  const cycleGoalFootTextEl = document.getElementById('cycleGoalFootText');
  if (cycleGoalFootTextEl) {
    cycleGoalFootTextEl.textContent = cycleViewOffset === 0
      ? (isCustomCycleGoal ? translateText('Meta personalizada') : translateText('Sugerida automáticamente'))
      : (isCustomCycleGoal ? translateText('Meta personalizada de ese ciclo') : translateText('Sugerida para ese ciclo'));
  }
  const cycleGoalEditBtnEl = document.getElementById('cycleGoalEditBtn');
  if (cycleGoalEditBtnEl) cycleGoalEditBtnEl.style.display = cycleViewOffset === 0 ? '' : 'none';
  const adherenceForTag = dayAdherence(dayKey);
  const earningsTagsParts = [
    ui`<span class="tag ${hasShift ? 'good' : ''}" title="Tiempo de conexión, incluida la conexión anticipada">Conectado: ${hasShift ? formatDuration(connected * 60000) : '—'}</span>`,
    ui`<span class="tag ${hasShift ? 'good' : ''}" title="Tiempo de turno, sin la conexión anticipada">En turno: ${hasShift ? formatDuration(workingMinutesForDay(dayKey) * 60000) : '—'}</span>`,
    ui`<span class="tag good" title="Tiempo total que llevas en llamada hoy">Llamadas: ${formatCallTimeLabel(stats.total)}</span>`,
    ui`<span class="tag" title="Cantidad de llamadas registradas hoy">Total: ${dayCalls.length}</span>`,
    ui`<span class="tag" title="Llamadas marcadas como Billable hoy">Billable: ${stats.billable}</span>`,
    ui`<span class="tag" title="Llamadas marcadas como Dropped hoy">Dropped: ${stats.dropped}</span>`,
    ui`<span class="tag good" title="Tiempo de ACW/AfterCallWork acumulado hoy (huecos entre llamadas sin clasificar como Break/Lunch/Otro)">ACW: ${formatDuration(stats.gapTotal * 60000)}</span>`,
    stats.breakGapTotal > 0 ? ui`<span class="tag warn" title="Tiempo de Break tomado hoy">Break: ${formatDuration(stats.breakGapTotal * 60000)}</span>` : '',
    stats.lunchGapTotal > 0 ? ui`<span class="tag cyan" title="Tiempo de Lunch tomado hoy">Lunch: ${formatDuration(stats.lunchGapTotal * 60000)}</span>` : '',
    stats.otherGapTotal > 0 ? ui`<span class="tag" title="Tiempo clasificado como Otro (huecos largos sin Break/Lunch real)">Otro: ${formatDuration(stats.otherGapTotal * 60000)}</span>` : '',
    higherRateBreakdownTagsHtml(stats.higherRateBreakdown, 'tag'),
    adherenceForTag ? ui`<span class="tag ${adherenceForTag.scorePct >= 90 ? 'good' : adherenceForTag.scorePct >= 70 ? 'warn' : 'bad'}" title="Qué tan apegado estuviste hoy a tu horario planeado">Adherencia: ${adherenceForTag.scorePct}%</span>` : '',
  ].filter(Boolean);
  document.getElementById('earningsTagsRow').innerHTML = earningsTagsParts.join('');
  const earnBar = document.getElementById('earningsBar');
  earnBar.style.width = `${goalPct}%`;
  // Esta barra (relleno de "Ganancias de hoy") usaba var(--cyan) — en modo claro --cyan es en
  // realidad el rosa/magenta de --primary.
  earnBar.style.background = 'linear-gradient(90deg, var(--teal), var(--accent-decorative, var(--cyan)))';

  // Se quita la escala de puntos 0/25/50/75/100% (`.scale`/`.tick`/`.tick-label`) — reemplazada por
  // el anillo de arriba (`#earningsGoalRing`/`--ring-pct`, mismo `goalPct`).

  formatGoalFields();
  updateChipsScrollHint();
}

// Activa el desvanecido de borde (.is-scrollable) SOLO cuando los chips realmente desbordan el
// ancho visible.
function updateChipsScrollHint() {
  const chipsEl = document.querySelector('.chips');
  if (!chipsEl) return;
  const overflows = chipsEl.scrollWidth > chipsEl.clientWidth + 1;
  chipsEl.classList.toggle('is-scrollable', overflows);
}

const gapLabels = ['acw', 'break', 'lunch', 'other'];
let editingGapContext = null;

function metadataEditGuard(read) {
  const owner = state, preferences = settings, expected = JSON.stringify(read());
  return () => {
    if (state === owner && settings === preferences && expected === JSON.stringify(read()) && canPersistLocalChanges()) return true;
    toast(translateText('Los datos cambiaron. Cerrá el editor y revisalos antes de guardar.')); return false;
  };
}

function findGapRow(dayKey, gapKey) {
  return dayGapRows(dayKey).find(g => g.gapKey === gapKey) || null;
}

// Mismo criterio que `displayAmount` en gapClassification: Break/Lunch se guardan con la duración
// COMPLETA del hueco, no con el residual ya descontado de una pausa real — el preview del modal
// debe reflejar el mismo número que de verdad se va a guardar, no siempre `residual`.
function gapDisplayAmountForLabel(row, label) {
  return (label === 'break' || label === 'lunch') ? row.raw : row.residual;
}
function gapDisplayAmountUnitLabel(label) {
  return (label === 'break' || label === 'lunch') ? translateText('Total') : translateText('Residual');
}

// Editor de la meta máxima de ACW (ver #acwGoalModal en el HTML y el botón ✎ de la tarjeta de ACW
// en "Turno de Hoy"). Mismo patrón simple que el resto de editores chicos de la app
// (openGapEditor/openDayNoteModal)
function openAcwGoalEditor() {
  const input = document.getElementById('acwGoalMinInput');
  if (input) input.value = Number(settings.acwMaxGoalMin) > 0 ? Number(settings.acwMaxGoalMin) : 60;
  openModal('acwGoalModal');
}

function saveAcwGoalEditor() {
  const input = document.getElementById('acwGoalMinInput');
  const mins = Number(input?.value);
  if (!Number.isFinite(mins) || mins <= 0) {
    toast(translateText('La meta debe ser un número mayor a 0'));
    return;
  }
  settings.acwMaxGoalMin = mins;
  if (saveSettingsOnly() === false) return false;
  closeModal('acwGoalModal');
  render();
  toast(ui`Meta máxima de ACW: ${formatMinutes(mins)} min`);
}

// Sincroniza el estado visual (aria-pressed) de los pills de Clasificación (#gapModal) con el valor
// actual del <select id="gapLabelInput"> oculto — mismo patrón que syncManualCallPillsUI, aquí con
// 4 valores en vez de 2.
function syncGapTagButtonsUI() {
  const select = document.getElementById('gapLabelInput');
  const current = select ? select.value : null;
  document.querySelectorAll('#gapModal .gap-tag-btn').forEach(btn => {
    btn.setAttribute('aria-pressed', btn.getAttribute('data-gap-tag-btn') === current ? 'true' : 'false');
  });
}

function openGapEditor(dayKey, gapKey) {
  const row = findGapRow(dayKey, gapKey);
  if (!row) {
    toast('No pude encontrar ese hueco');
    return;
  }
  const normalizedDayKey = callDateKeyFromValue(dayKey);
  const annotation = getGapAnnotation(normalizedDayKey, gapKey);
  editingGapContext = { dayKey: normalizedDayKey, gapKey, valid: metadataEditGuard(() => [findGapRow(normalizedDayKey, gapKey), getGapAnnotation(normalizedDayKey, gapKey)]) };
  const label = annotation?.label || row.label || row.suggested || 'acw';
  const note = annotation?.note || '';
  const title = document.getElementById('gapModalTitle');
  const subtitle = document.getElementById('gapModalSubtitle');
  const preview = document.getElementById('gapPreviewText');
  const labelInput = document.getElementById('gapLabelInput');
  const noteInput = document.getElementById('gapNoteInput');

  // El hueco entre "Iniciar shift" y la primera llamada del día (ver dayGapRows) ahora también es
  // editable desde aquí, pero su `prev` es un marcador virtual.
  const prevLabel = row.isShiftStartGap ? translateText('Inicio de turno') : `#${row.prev.customerId}`;
  const prevTimeLabel = row.isShiftStartGap ? timeLabelFromDate(new Date(row.prev.startISO)) : row.prev.callStart;
  if (title) title.textContent = ui`Editar hueco · ${prevLabel} → #${row.cur.customerId}`;
  if (subtitle) subtitle.textContent = ui`${prevTimeLabel} → ${row.cur.callStart} · ${formatMinutes(row.residual)} min útiles`;
  if (preview) {
    preview.textContent = annotation
      ? ui`Clasificado por vos: ${gapLabelText(label)}${note ? ui` · Nota: ${note}` : ''}`
      : ui`Sugerido: ${gapLabelText(row.suggested)} · ${gapDisplayAmountUnitLabel(row.suggested)} ${gapDisplayAmountForLabel(row, row.suggested).toFixed(1)} min`;
  }
  if (labelInput) labelInput.value = label;
  if (noteInput) noteInput.value = note;
  syncGapTagButtonsUI();
  openModal('gapModal');
}

function saveGapEditor() {
  if (!editingGapContext || !editingGapContext.valid()) return false;
  const labelInput = document.getElementById('gapLabelInput');
  const noteInput = document.getElementById('gapNoteInput');
  const label = String(labelInput?.value || 'acw').toLowerCase();
  const note = String(noteInput?.value || '').trim();
  const savedContext = { ...editingGapContext };
  if (setGapAnnotation(savedContext.dayKey, savedContext.gapKey, { label, note }) === false) return false;
  editingGapContext = null;
  closeModal('gapModal');
  toast('Hueco guardado');
  onGameGapSaved(savedContext.dayKey, savedContext.gapKey, label);
}

// Editar día (Resumen semanal)
let editingDayNoteKey = null;
let dayNoteEditValid = () => false;

const DAY_NOTE_STATUS_HINTS = {
  '': translateText('Automático: se decide según tu horario semanal. Si hay llamadas o turno en un día libre, cuenta como trabajado.'),
  work: translateText('Trabajado: se exige Adherencia y suma a tu meta del ciclo, aunque tu horario diga que es libre.'),
  off: translateText('Libre: no se exige Adherencia y el día no suma a tu meta del ciclo. Tus llamadas y turno ya registrados no se tocan.'),
};

// Refleja el <select> oculto (fuente de verdad) en las pastillas visibles + el texto de ayuda.
function syncDayNoteStatusUI() {
  const select = document.getElementById('dayNoteStatusInput');
  const current = select ? select.value : '';
  document.querySelectorAll('#dayNoteStatusTabs [data-daynote-status]').forEach(btn => {
    const on = btn.getAttribute('data-daynote-status') === current;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  const hint = document.getElementById('dayNoteStatusHint');
  if (hint) hint.textContent = DAY_NOTE_STATUS_HINTS[current] || DAY_NOTE_STATUS_HINTS[''];
}

function openDayNoteModal(dayKey, focusTarget = null) {
  const normalized = callDateKeyFromValue(dayKey);
  if (!normalized) return;
  editingDayNoteKey = normalized;
  dayNoteEditValid = metadataEditGuard(() => getDayNote(normalized));
  const note = getDayNote(normalized);
  const titleEl = document.getElementById('dayNoteModalTitle');
  const statusInput = document.getElementById('dayNoteStatusInput');
  const categoryInput = document.getElementById('dayNoteCategoryInput');
  const commentInput = document.getElementById('dayNoteCommentInput');
  if (titleEl) titleEl.textContent = ui`Editar día · ${formatCallDayLabel(normalized)}`;
  if (statusInput) statusInput.value = note ? (note.forcedStatus || '') : '';
  if (categoryInput) categoryInput.value = note ? note.category : '';
  if (commentInput) commentInput.value = note ? note.comment : '';
  syncDayNoteStatusUI();
  openModal('dayNoteModal');
  // openModal ya enfoca con setTimeout(...,0); este retraso mayor lo pisa a propósito.
  if (focusTarget === 'status') setTimeout(() => document.querySelector('#dayNoteStatusTabs .day-tab.active')?.focus(), 30);
  else if (focusTarget === 'note') setTimeout(() => document.getElementById('dayNoteCommentInput')?.focus(), 30);
}

function saveDayNoteFromModal() {
  if (!editingDayNoteKey || !dayNoteEditValid()) return false;
  const statusInput = document.getElementById('dayNoteStatusInput');
  const categoryInput = document.getElementById('dayNoteCategoryInput');
  const commentInput = document.getElementById('dayNoteCommentInput');
  if (setDayNote(editingDayNoteKey, { category: categoryInput?.value || '', comment: commentInput?.value || '', forcedStatus: statusInput?.value || '' }) === false) return false;
  editingDayNoteKey = null;
  closeModal('dayNoteModal');
  toast(translateText('Día guardado'));
}

function clearDayNoteFromModal() {
  if (!editingDayNoteKey || !dayNoteEditValid()) return false;
  const statusInput = document.getElementById('dayNoteStatusInput');
  if (setDayNote(editingDayNoteKey, { category: '', comment: '', forcedStatus: statusInput?.value || '' }) === false) return false;
  editingDayNoteKey = null;
  closeModal('dayNoteModal');
  toast('Nota eliminada');
}

// Tarjetas resumen arriba de "Bloques del día"
function renderBlockSummaryStrip(cards) {
  const el = document.getElementById('blockSummaryStrip');
  if (!el) return;
  if (!Array.isArray(cards) || !cards.length) {
    el.innerHTML = '';
    return;
  }
  const cardHtml = (c, extraClass = '') => {
    // Si hoy no hay Break/Lunch planeado, la tarjeta igual se muestra en estado "sin plan".
    if (c.noPlan) {
      return ui`
        <div class="block-summary-card ${extraClass}" data-accent="${escapeHtml(c.accent)}" style="opacity:.82;">
          <div class="bsc-top">
            <span class="bsc-icon">${c.icon}</span>
            <span class="bsc-name">${escapeHtml(c.name)}</span>
          </div>
          <div class="bsc-range">${escapeHtml(c.range)}</div>
          ${c.rangeExtra ? ui`<div class="bsc-range" style="opacity:.7;">${escapeHtml(c.rangeExtra)}</div>` : ''}
        </div>
      `;
    }
    const pct = Math.max(0, Math.min(100, Number(c.pct) || 0));
    // La tarjeta de ACW lleva un botón ✎ para editar su propia meta máxima (ver #acwGoalModal,
    // delegado por `data-edit-card`)
    const editBtnHtml = c.editable
      ? ui`<button class="bsc-edit-btn" type="button" data-edit-card="${escapeHtml(c.editable)}" aria-label="Editar meta de ${escapeHtml(c.name)}" title="Editar meta"><svg class="ic-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>`
      : '';
    return ui`
      <div class="block-summary-card ${extraClass}" data-accent="${escapeHtml(c.accent)}" style="--bsc-pct:${pct}%">
        <div class="bsc-fill" style="width:${pct}%"></div>
        <div class="bsc-top">
          <span class="bsc-icon">${c.icon}</span>
          <span class="bsc-name">${escapeHtml(c.name)}</span>
          ${editBtnHtml}
        </div>
        <div class="bsc-range">${escapeHtml(c.range)}</div>
        ${c.rangeExtra ? ui`<div class="bsc-range" style="opacity:.7;">${escapeHtml(c.rangeExtra)}</div>` : ''}
        <div class="bsc-progress-row">
          <div class="bsc-progress-track"><div style="width:${pct}%"></div></div>
          <span class="bsc-pct">${Math.round(pct)}%</span>
        </div>
      </div>
    `;
  };
  const shiftIdx = cards.findIndex(c => c.name === 'Shift');
  const shiftCard = cards[shiftIdx !== -1 ? shiftIdx : 0];
  const restCards = cards.filter((c, i) => i !== (shiftIdx !== -1 ? shiftIdx : 0));
  el.innerHTML = ui`
    <div class="block-summary-shift-row">${cardHtml(shiftCard, 'block-summary-card-shift')}</div>
    ${restCards.length ? ui`<div class="block-summary-strip">${restCards.map(c => cardHtml(c)).join('')}</div>` : ''}
  `;
}

function renderSchedule() {
      const dayKey = getActiveDayKey();
      const dayCalls = callsForDay(dayKey);
      // Se agregan las pausas confirmadas a mano desde el editor de huecos (ver
      // manualGapPauseIntervals) para que la barra "Usado" y el texto de progreso del slot también
      // las cuenten.
      const dayPauses = dayPausesForSlotStats(dayKey);
      // shiftStart/shiftEnd salen de dayShiftSessions (todas las sesiones), no de dayShiftBounds.
      const shiftSessions = dayWorkSessions(dayKey);
      const shiftStart = shiftSessions[0]?.start || null;
      const lastShiftSessionForBounds = shiftSessions[shiftSessions.length - 1] || null;
      const shiftEnd = lastShiftSessionForBounds && !lastShiftSessionForBounds.live ? lastShiftSessionForBounds.end : null;
      const live = !!(lastShiftSessionForBounds && lastShiftSessionForBounds.live);
      const now = new Date();
      const wrap = document.getElementById('scheduleList');
      const subtitle = document.getElementById('scheduleSubtitle');
      const dayCfg = dayConfigFor(dayKey);
      const plannedSlots = getEffectiveScheduleForDay(dayKey);
      // Slots originales (sin correr) para la adherencia por bloque: mismo orden e índices que
      // plannedSlots.
      const originalPlannedSlots = originalPlannedSlotsForDay(dayKey);
      if (subtitle) {
        subtitle.textContent = dayIsEffectivelyOff(dayKey)
          ? translateText('Día libre según tu horario semanal.')
          : (settings.lateArrivalMode === 'shift'
              ? translateText('Tu horario planeado, corrido si llegaste tarde (ver "Si llegas tarde a tu turno" en Horario).')
              : translateText('Tu horario planeado. Si llegas tarde o te pasas de un break, aquí se ve la diferencia contra el plan.'));
      }

      // Un día marcado off:true en el horario semanal pero con actividad real (dayCfg.off true Y
      // dayIsEffectivelyOff false) ya arma "Bloques del día" idéntico a un día laboral normal.
      const offWorkedNote = document.getElementById('scheduleOffWorkedNote');
      if (offWorkedNote) {
        const cfgIsOff = !!(dayCfg && dayCfg.off);
        const isOff = dayIsEffectivelyOff(dayKey);
        const forced = getDayNote(dayKey)?.forcedStatus;
        if (cfgIsOff && !isOff) {
          offWorkedNote.textContent = forced === 'work'
            ? translateText('Marcaste este día como Trabajado a mano (Resumen semanal → Editar día) — no aparece libre, aunque tu horario diga que sí lo es.')
            : translateText('Trabajaste en tu día libre — no aparece marcado como libre, se ve igual que un día laboral normal.');
          offWorkedNote.style.display = 'block';
        } else if (!cfgIsOff && isOff) {
          offWorkedNote.textContent = translateText('Marcaste este día como Libre a mano (Resumen semanal → Editar día) — no se exige Adherencia, aunque tenías turno planeado.');
          offWorkedNote.style.display = 'block';
        } else {
          offWorkedNote.style.display = 'none';
        }
      }

      if (!plannedSlots.length) {
        wrap.innerHTML = translateMarkup('<div class="note">No hay horario configurado para este día. Edítalo en “Horario”.</div>');
        renderBlockSummaryStrip([]);
        return;
      }

      // Primer y último bloque de Trabajo: solo en ellos se extiende la ventana de conteo de
      // llamadas.
      const firstWorkIndex = plannedSlots.findIndex(s => s.type === 'Work');
      let lastWorkIndex = -1;
      for (let i = plannedSlots.length - 1; i >= 0; i--) {
        if (plannedSlots[i].type === 'Work') { lastWorkIndex = i; break; }
      }

      // Break y Lunch se agregan en una sola tarjeta cada uno, en vez de una por bloque.
      let breakPlannedMin = 0, breakFilledMin = 0, breakCount = 0;
      let lunchPlannedMin = 0, lunchFilledMin = 0, lunchCount = 0;
      const breakBlockTimes = [];
      const lunchBlockTimes = [];

      const blockGaps = dayGapRows(dayKey, dayCalls);
      const blockPauseIntervals = mergeIntervals(dayPauses);
      const slotRows = plannedSlots.map((slot, slotIdx) => {
        const extendStart = slotIdx === firstWorkIndex ? shiftStart : null;
        const extendEnd = slotIdx === lastWorkIndex ? shiftEnd : null;
        const stats = slotStats(slot, dayCalls, dayPauses, shiftStart, shiftEnd, dayKey, extendStart, extendEnd);
        const active = now >= stats.slotStart && now < stats.slotEnd;
        const done = live ? now >= stats.slotEnd : !!(shiftEnd && shiftEnd >= stats.slotEnd);
        const blockAcwMin = slot.type === 'Work'
          ? acwMinutesForBlock(blockGaps, stats.callWindowStart, stats.callWindowEnd, blockPauseIntervals, overlapMinutesWithIntervals)
          : 0;
        if (slot.type === 'Break') {
          breakPlannedMin += stats.durationMin;
          breakFilledMin += stats.filledMin;
          breakCount++;
          breakBlockTimes.push({ start: slot.start, end: slot.end });
        } else if (slot.type === 'Lunch') {
          lunchPlannedMin += stats.durationMin;
          lunchFilledMin += stats.filledMin;
          lunchCount++;
          lunchBlockTimes.push({ start: slot.start, end: slot.end });
        }
        // Un día PASADO sin ningún registro (ni turno ni llamadas, shiftStart null) caía en
        // 'Próximo' — el único valor que quedaba tras descartar 'Actual'/'Hecho'.
        const isPastDay = dayKey !== todayCallDateKey() && (callDateToDate(dayKey) || new Date()) < todayRange();
        const isFutureDay = (callDateToDate(dayKey) || new Date()) > todayRange();
        // Un día pasado con salida temprana dentro del bloque no es "Próximo": se marca
        // "Incompleto".
        const statusText = active ? translateText('Actual') : done ? translateText('Hecho') : ((isPastDay || now >= stats.slotEnd) ? (shiftStart ? translateText('Incompleto') : translateText('Sin actividad')) : translateText('Próximo'));
        const statusClass = stats.statusTone === 'good' ? 'good' : stats.statusTone === 'warn' ? 'warn' : stats.statusTone === 'bad' ? 'bad' : '';
        const usedProgressLabel = ui`${formatDuration(stats.filledMin * 60000)} usados`;
        const acwProgressLabel = `ACW ${formatDuration(blockAcwMin * 60000)}`;
        const progressLabel = slot.type === 'Work'
          ? (stats.realActivityRange
              ? ui`Actividad real: ${timeLabelFromDate(stats.realActivityRange.start)} – ${timeLabelFromDate(stats.realActivityRange.end)} · ${stats.realActivityRange.callCount} llamada(s) · ${usedProgressLabel} · ${acwProgressLabel}`
              : `${usedProgressLabel} · ${acwProgressLabel} · ${Math.round(stats.pct)}%`)
          : stats.actualPauseRange
            ? ui`Pausa real: ${formatDuration(stats.actualPauseRange.durationMin * 60000)} (${timeLabelFromDate(stats.actualPauseRange.start)} – ${stats.actualPauseRange.live ? translateText('en curso') : timeLabelFromDate(stats.actualPauseRange.end)})`
            : ui`${formatDuration(stats.filledMin * 60000)} de ${formatDuration(stats.durationMin * 60000)} · ${Math.round(stats.pct)}%`;

        // Reemplaza el desglose de "Margen del día" por cada bloque de Trabajo — ahora es una Meta
        // de Productividad EN MINUTOS, configurable POR BLOQUE (Horario → Bloques → "Meta
        // productiva (min)").
        let goalBarHtml = '';
        if (slot.type === 'Work' && stats.productivityGoal) {
          const g = stats.productivityGoal;
          const goalIconHtml = g.met ? `${iconHtml('checkCircle')} ` : '';
          const goalText = g.met
            ? ui`Meta productiva alcanzada: ${formatMinutes(g.achievedMin)}/${formatMinutes(g.goalMin)} min`
            : ui`Meta productiva: ${formatMinutes(g.achievedMin)}/${formatMinutes(g.goalMin)} min`;
          const goalLabelColor = g.met ? `color: var(--good); font-weight: 800;` : '';
          const goalFill = g.met ? 'linear-gradient(90deg, var(--good), var(--teal))' : 'linear-gradient(90deg, var(--teal), var(--blue))';
          goalBarHtml = ui`
            <div class="sblk-bar-row tight" title="Minutos productivos meta de este bloque, configurable en Horario → Bloques.">
              <div class="sblk-bar-label-row" style="${goalLabelColor}"><span>${goalIconHtml}${escapeHtml(goalText)}</span></div>
              <div class="sblk-bar-track" aria-label="${escapeHtml(slot.name)} meta productiva"><div style="width:${g.pct}%; background:${goalFill};"></div></div>
            </div>
          `;
        }

        // Cada bloque lleva su PROPIA adherencia minuto a minuto, aparte del % global de arriba
        // (adherenceBadge, sin cambios).
        let adherenceBarHtml = '';
        const slotAdherence = slotMinuteAdherence(dayKey, originalPlannedSlots[slotIdx] || slot, shiftSessions);
        if (slotAdherence) {
          const tone = slotAdherence.pct >= 90 ? 'good' : slotAdherence.pct >= 70 ? 'warn' : 'bad';
          // Mostrar el motivo dominante (no solo el %) — ej. "· Ausencia/llegada tarde (6m)". Sin
          // sufijo si no hubo minutos de excepción (bloque perfecto).
          const dominant = dominantExceptionReason(slotAdherence.reasons);
          const reasonSuffix = dominant ? ` · ${dominant.label} (${formatMinutes(dominant.minutes)}m)` : '';
          const text = ui`Adherencia del bloque: ${slotAdherence.pct}% (${slotAdherence.adherentMinutes}/${slotAdherence.total} min)${reasonSuffix}`;
          const diagnosticIcon = tone === 'good' ? iconHtml('checkCircle') : iconHtml('alertTriangle');
          const diagnosticFill = tone === 'good' ? 'linear-gradient(90deg, var(--good), var(--teal))' : tone === 'warn' ? 'linear-gradient(90deg, var(--warn), #ffcf7d)' : 'linear-gradient(90deg, var(--bad), #ff8a95)';
          adherenceBarHtml = ui`
            <div class="sblk-diagnostic tone-${tone}">
              <span class="sblk-diagnostic-icon" aria-hidden="true">${diagnosticIcon}</span>
              <div style="min-width:0; flex:1 1 auto;">
                <div>${escapeHtml(text)}</div>
                <div class="sblk-diagnostic-track" aria-label="${escapeHtml(slot.name)} adherencia"><div style="width:${slotAdherence.pct}%; background:${diagnosticFill};"></div></div>
              </div>
            </div>
          `;
        }

        // Barra de Productividad dentro de cada bloque de Trabajo, aparte de la barra de "Usado"
        // (stats.pct). Solo aplica a Trabajo (stats.productivityPct es null en Break/Lunch, mismo
        // criterio que stats.productivityGoal)
        const productivityBarHtml = slot.type === 'Work' && stats.productivityPct !== null && !isFutureDay
          ? ui`
              <div class="sblk-bar-row tight">
                <div class="sblk-bar-label-row"><span>Productividad</span><span>${Math.round(stats.productivityPct)}%</span></div>
                <div class="sblk-bar-track" aria-label="${escapeHtml(slot.name)} productividad"><div style="width:${stats.productivityPct}%; background: linear-gradient(90deg, var(--good), var(--teal));"></div></div>
              </div>
            `
          : '';

        // Mismo relleno "líquido" de las tarjetas de "Turno de Hoy"
        const slotAccent = slot.type === 'Work' ? 'cyan' : slot.type === 'Break' ? 'warn' : 'blue';
        const usedFillColor = slot.type === 'Work' ? 'var(--cyan)' : slot.type === 'Break' ? 'var(--warn)' : 'var(--blue)';

        const badgeToneClass = active ? 'warn' : done ? 'good' : isPastDay && shiftStart ? 'warn' : '';
        const icon = slot.type === 'Work' ? iconHtml('briefcase') : slot.type === 'Break' ? iconHtml('coffee') : iconHtml('utensils');
        const statusDetailLine = stats.status
          ? ui`<div class="sblk-meta-line" style="${statusClass ? `color: var(--${statusClass}); font-weight: 700;` : ''}">${escapeHtml(stats.status)}</div>`
          : '';

        // Relleno líquido vertical + punto del riel sincronizado + texto legible sobre el líquido.
        // Un solo número, 3 usos.
        let sblkPct;
        if (dayKey === todayCallDateKey()) {
          const shiftEndedToday = state.shiftEndedAt && sameCallDay(state.shiftEndedAt, dayKey) ? new Date(state.shiftEndedAt) : null;
          const clock = shiftEndedToday && shiftEndedToday.getTime() < now.getTime() ? shiftEndedToday : now;
          const totalMs = stats.slotEnd.getTime() - stats.slotStart.getTime();
          const elapsedMs = clock.getTime() - stats.slotStart.getTime();
          sblkPct = totalMs > 0 ? Math.max(0, Math.min(100, (elapsedMs / totalMs) * 100)) : 0;
        } else {
          sblkPct = isFutureDay ? 0 : 100;
        }
        const isCollapsed = !!settings.collapseCompletedBlocks && done;

        return ui`
          <div class="sblk-item" data-block-type="${slot.type.toLowerCase()}">
            <div class="sblk-hour">${slot.start}</div>
            <div class="sblk-rail" aria-hidden="true"><span class="sblk-dot" style="top:${sblkPct}%"></span></div>
            <div class="sblk-card ${active ? 'is-active' : ''} ${done ? 'is-done' : ''} ${isCollapsed ? 'is-collapsed' : ''}" data-accent="${slotAccent}" style="--sblk-pct:${sblkPct}%">
              <div class="sblk-fill" style="height:${sblkPct}%"></div>
              <div class="sblk-head">
                <span class="sblk-icon" aria-hidden="true">${icon}</span>
                <div class="sblk-titles">
                  <div class="sblk-name">${escapeHtml(slot.name)}</div>
                  <div class="sblk-range">${slot.start} – ${slot.end}</div>
                </div>
                <span class="sblk-status ${badgeToneClass}">${escapeHtml(statusText)}</span>
              </div>
              <div class="sblk-extra">
                <div class="sblk-bar-row">
                  <div class="sblk-bar-label-row"><span>Usado</span><span>${formatDuration(stats.filledMin * 60000)} / ${formatDuration(stats.durationMin * 60000)} · ${Math.round(stats.pct)}%</span></div>
                  <div class="sblk-bar-track" aria-label="${escapeHtml(slot.name)} progreso"><div style="width:${stats.pct}%; background:${usedFillColor};"></div></div>
                </div>
                ${productivityBarHtml}
                ${goalBarHtml}
                <div class="sblk-meta-line">${escapeHtml(progressLabel)}</div>
                ${statusDetailLine}
                ${adherenceBarHtml}
              </div>
            </div>
          </div>
        `;
      });

      wrap.innerHTML = slotRows.join('');

      const summaryCards = [];

      // Shift (turno completo): % = tiempo Conectado hasta ahora vs. la duración TOTAL planeada del
      // turno (getShiftWindow) — mismo criterio que ya usa "Conectado" en el resto de la app, solo
      // comparado contra el plan en vez de mostrarse en crudo.
      const shiftWindowForCard = getShiftWindow(dayKey);
      let plannedShiftMin = toMinutes(shiftWindowForCard.end) - toMinutes(shiftWindowForCard.start);
      if (plannedShiftMin <= 0) plannedShiftMin += 1440;
      const shiftConnectedMin = shiftStart ? workingMinutesForDay(dayKey) : 0;
      const shiftPct = plannedShiftMin > 0 ? Math.min(100, (shiftConnectedMin / plannedShiftMin) * 100) : 0;
      summaryCards.push({
        name: translateText('Shift'),
        icon: iconHtml('play', 'ic-fill'),
        accent: 'cyan',
        range: `${timeLabel(shiftWindowForCard.start)} – ${timeLabel(shiftWindowForCard.end)}`,
        pct: shiftPct,
      });

      // Break/Lunch (agregadas): combinan TODOS los bloques de ese tipo del día en una sola tarjeta
      // — % ponderado por minutos (planeado/usado real sumados de todos los bloques), no un
      // promedio simple de %.
      const rangeWithNext = (blocks) => {
        if (!blocks.length) return { range: '', rangeExtra: '' };
        const range = `${timeLabel(blocks[0].start)} – ${timeLabel(blocks[0].end)}`;
        if (blocks.length === 1) return { range, rangeExtra: '' };
        const extraCount = blocks.length - 2;
        const nextText = ui`Siguiente: ${timeLabel(blocks[1].start)} – ${timeLabel(blocks[1].end)}`;
        const rangeExtra = extraCount > 0 ? ui`${nextText} · +${extraCount} más` : nextText;
        return { range, rangeExtra };
      };
      // Sin Break/Lunch planeado hoy, la tarjeta se muestra igual con el texto "sin plan".
      if (breakCount > 0) {
        const { range, rangeExtra } = rangeWithNext(breakBlockTimes);
        summaryCards.push({
          name: translateText('Break'),
          icon: iconHtml('coffee'),
          accent: 'warn',
          range,
          rangeExtra,
          pct: breakPlannedMin > 0 ? Math.min(100, (breakFilledMin / breakPlannedMin) * 100) : 0,
        });
      } else {
        summaryCards.push({
          name: translateText('Break'),
          icon: iconHtml('coffee'),
          accent: 'warn',
          range: translateText('Sin Break planeado hoy'),
          rangeExtra: translateText('Puedes tomarlo cuando quieras'),
          pct: 0,
          noPlan: true,
        });
      }
      if (lunchCount > 0) {
        const { range, rangeExtra } = rangeWithNext(lunchBlockTimes);
        summaryCards.push({
          name: translateText('Lunch'),
          icon: iconHtml('utensils'),
          accent: 'blue',
          range,
          rangeExtra,
          pct: lunchPlannedMin > 0 ? Math.min(100, (lunchFilledMin / lunchPlannedMin) * 100) : 0,
        });
      } else {
        summaryCards.push({
          name: translateText('Lunch'),
          icon: iconHtml('utensils'),
          accent: 'blue',
          range: translateText('Sin Lunch planeado hoy'),
          rangeExtra: translateText('Puedes tomarlo cuando quieras'),
          pct: 0,
          noPlan: true,
        });
      }

      renderBlockSummaryStrip(summaryCards);

      // Indicador en vivo — solo aplica viendo "Hoy" con el turno en curso.
      const adherenceLiveBadge = document.getElementById('adherenceLiveBadge');
      if (adherenceLiveBadge) {
        const isLiveException = dayKey === todayCallDateKey() && isRightNowOutOfAdherence();
        adherenceLiveBadge.style.display = isLiveException ? '' : 'none';
      }

    }


function syncCallImportPlaceholder() {
  const input = document.getElementById('callInput');
  if (!input) return;
  const example = '4576\n06/29/2026\n10:19 AM\n6\nYes\nNo\n$0.72';
  input.placeholder = ui`Pega aquí la data de Propio...

Ejemplo:
${example}`;
}

export function render() {
      renderHeader();
      renderSchedule();
      renderWeekSummary();
      // Solo se recalcula con la página de Reportes visible: recorre meses de historial día por
      // día.
      if (currentPage === 'reports') renderReportsDashboard();
      if (currentPage === 'calendar') { if (calViewMode === 'year') renderCalYear(); else renderCalendarMonth(); }
      // Mismo criterio que renderReportsDashboard arriba: solo se recalcula si esa página está
      // visible ahora mismo.
      if (currentPage === 'paydates') renderPayDatesSection();
      if (currentPage === 'finance') renderFinanceSection();
      renderTable();
      renderDayStatsCards();
      renderFinancePreview();
      renderHigherRateLiveCard();
      updateLiveActivityBar();
      updateCallsStatusCard();
      updateSidebarProgressWidget();
      renderGame();
    }

    export function toast(msg, { persistenceFailure = false } = {}) {
      const el = document.getElementById('toast');
      el.textContent = storageSnapshotPending && !persistenceFailure ? STORAGE_QUOTA_TOAST : msg;
      el.classList.add('show');
      clearTimeout(toast.timer);
      toast.timer = setTimeout(() => el.classList.remove('show'), 2200);
    }

    export function escapeHtml(str) {
      return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
    }

    // Trampa de foco: sin esto el teclado podía escaparse de un modal abierto.
    let openModalStack = [];

    // Elementos que pueden recibir foco por teclado dentro de un modal — mismo criterio estándar
    // (enlaces con href, controles no deshabilitados, cualquier cosa con tabindex explícito)
    function getModalFocusableElements(container) {
      const selector = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
      return Array.from(container.querySelectorAll(selector)).filter(el => el.offsetParent !== null);
    }

    export function openModal(id) {
      const modal = document.getElementById(id);
      if (!modal) return;
      if(id==='goalsModal')renderAccountingExportScope();
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      if (!openModalStack.includes(id)) openModalStack.push(id);
      // Se enfoca el primer campo editable, no el primer elemento enfocable del DOM.
      const scope = modal.querySelector('.modal-card') || modal;
      const focusables = getModalFocusableElements(scope);
      const preferredTarget = focusables.find(el => ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName));
      const focusTarget = preferredTarget || focusables[0];
      if (focusTarget) {
        setTimeout(() => focusTarget.focus(), 0);
      }
    }

    export function closeModal(id) {
      // Cerrar por × / click afuera / Escape equivale a cancelar el cambio de meta que estaba
      // esperando alcance.
      if (id === 'goalScopeModal') cancelPendingGoalChange();
      const modal = document.getElementById(id);
      if (!modal) return;
      const wasOpen = modal.classList.contains('open');
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      openModalStack = openModalStack.filter(m => m !== id);
      if (wasOpen) document.dispatchEvent(new CustomEvent('app:modal-closed', { detail: { id } }));
    }

    function closeAllModals() {
      closeModal('goalsModal');
      closeModal('callsModal');
      closeModal('resetModal');
      closeModal('gapModal');
      closeModal('dayNoteModal');
      closeModal('callEditModal');
      closeModal('manualCallModal');
      closeModal('confirmModal');
      closeModal('acwGoalModal');
      closeModal('higherRateModal');
      closeModal('notificationsModal');
      closeModal('cycleGoalModal');
      closeModal('goalScopeModal');
      closeModal('calYearGoalModal');
      closeModal('calHistoryStartModal');
      closeModal('financeRowModal');
      closeModal('stageClearModal');
      closeModal('chestModal');
      closeModal('positiveReflectionModal');
      closeModal('physicalRewardClaimModal');
      closeModal('physicalRewardEditorModal');
      openModalStack = [];
    }

    let currentPage = 'home';

    // "Llamadas" (#callsSection) debe verse SIEMPRE (Inicio y las otras 3 páginas), pero en Inicio
    // específicamente debe vivir justo debajo de "Turno de Hoy"
    function relocateCallsSection(page) {
      const callsSection = document.getElementById('callsSection');
      if (!callsSection) return;
      // Ayuda es contenido de referencia, no de trabajo: Llamadas no tiene lugar ahí.
      callsSection.hidden = page === 'help';
      if (page === 'help') return;
      if (page === 'home') {
        const pageHome = document.getElementById('pageHome');
        const earningsAccordion = document.getElementById('earningsAccordion');
        if (!pageHome) return;
        if (earningsAccordion && earningsAccordion.parentElement === pageHome) {
          pageHome.insertBefore(callsSection, earningsAccordion);
        } else {
          pageHome.insertBefore(callsSection, pageHome.firstChild);
        }
      } else {
        const heroSection = document.getElementById('heroSection');
        if (heroSection) heroSection.insertAdjacentElement('afterend', callsSection);
      }
    }

    function navigateToPage(page) {
      // Páginas válidas del menú lateral.
      const pages = ['home', 'schedule', 'reports', 'paydates', 'calendar', 'finance', 'achievements', 'help'];
      if (!pages.includes(page)) page = 'home';
      currentPage = page;
      // Render ya no recalcula renderReportsDashboard salvo que currentPage === 'reports' (ver esa
      // función)
      if (page === 'reports') renderReportsDashboard();
      if (page === 'paydates') renderPayDatesSection();
      if (page === 'finance') renderFinanceSection();
      if (page === 'achievements') renderGame();
      // Vista anual por default.
      if (page === 'calendar') { syncCalViewVisibility(); if (calViewMode === 'year') renderCalYear(); else renderCalendarMonth(); }
      relocateCallsSection(page);
      document.querySelectorAll('.app-page').forEach(el => {
        el.hidden = el.getAttribute('data-page') !== page;
      });
      document.querySelectorAll('.sidebar-link').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-page') === page);
      });
      // En escritorio, si el sidebar está FIJADO, se queda abierto al navegar (es justo el punto de
      // fijarlo). En cualquier otro caso (mobile, o escritorio sin fijar) se cierra solo tras
      // elegir una página.
      const isPinnedOnDesktop = document.body.classList.contains('sidebar-pinned') && window.matchMedia('(min-width: 901px)').matches;
      if (!isPinnedOnDesktop) closeSidebar();
      window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    }

    function openSidebar() {
      document.body.classList.add('sidebar-open');
      const btn = document.getElementById('menuToggleBtn');
      if (btn) btn.setAttribute('aria-expanded', 'true');
    }

    function closeSidebar() {
      document.body.classList.remove('sidebar-open');
      const btn = document.getElementById('menuToggleBtn');
      if (btn) btn.setAttribute('aria-expanded', 'false');
      // En escritorio con el sidebar fijado, `body.sidebar-pinned.sidebar-nav` lo mantenía visible
      // sin importar `sidebar-open` — la X parecía no hacer nada. Cerrar con la X desfija también.
      const isDesktopWidth = window.matchMedia('(min-width: 901px)').matches;
      if (isDesktopWidth && document.body.classList.contains('sidebar-pinned')) {
        document.body.classList.remove('sidebar-pinned');
        const pinBtn = document.getElementById('sidebarPinBtn');
        if (pinBtn) pinBtn.setAttribute('aria-pressed', 'false');
        settings.sidebarPinned = false;
        saveSettingsOnly();
      }
    }

    function toggleSidebar() {
      if (document.body.classList.contains('sidebar-open')) closeSidebar();
      else openSidebar();
    }

    // 📌 deja el sidebar SIEMPRE visible, empujando el contenido (ver `body.sidebar-pinned` en el
    // CSS) en vez de flotar encima.
    function toggleSidebarPin() {
      const pinned = document.body.classList.toggle('sidebar-pinned');
      const btn = document.getElementById('sidebarPinBtn');
      if (btn) btn.setAttribute('aria-pressed', pinned ? 'true' : 'false');
      if (pinned) openSidebar();
      settings.sidebarPinned = pinned;
      saveSettingsOnly();
    }

    function applySidebarPinnedState() {
      const pinned = settings.sidebarPinned !== false;
      document.body.classList.toggle('sidebar-pinned', pinned);
      const btn = document.getElementById('sidebarPinBtn');
      if (btn) btn.setAttribute('aria-pressed', pinned ? 'true' : 'false');
      const isDesktopWidth = window.matchMedia('(min-width: 901px)').matches;
      if (pinned && isDesktopWidth) openSidebar();
    }

    // Toggle "Contraer bloques al terminar" en "Bloques del día" (#collapseCompletedBlocksBtn).
    // Mismo patrón que toggleSidebarPin/applySidebarPinnedState arriba.
    function toggleCollapseCompletedBlocks() {
      settings.collapseCompletedBlocks = !settings.collapseCompletedBlocks;
      saveSettingsOnly();
      syncCollapseCompletedBlocksUI();
      renderSchedule();
    }

    function syncCollapseCompletedBlocksUI() {
      const btn = document.getElementById('collapseCompletedBlocksBtn');
      if (btn) btn.setAttribute('aria-pressed', settings.collapseCompletedBlocks ? 'true' : 'false');
    }

    // Tarjeta "Mi progreso" (anillo de %) en el sidebar.
    function updateSidebarProgressWidget() {
      const ring = document.getElementById('sidebarProgressRing');
      const pctEl = document.getElementById('sidebarProgressPct');
      const subEl = document.getElementById('sidebarProgressSub');
      if (!ring || !pctEl || !subEl) return;
      const summary = weekSummaryForOffset(0);
      const weeklyGoalMin = Math.max(1, Number(settings.productiveGoalMin) || 0) * 7;
      const pct = Math.max(0, Math.min(100, Math.round((summary.totals.productive / weeklyGoalMin) * 100)));
      ring.style.setProperty('--ring-pct', String(pct));
      pctEl.textContent = `${pct}%`;
      subEl.textContent = pct >= 90 ? translateText('¡Vas por buen camino!') : pct >= 50 ? translateText('Sigue así, ya vas a la mitad.') : translateText('Toca para ver el detalle.');
    }

    function initSidebarNav() {
      const menuToggleBtn = document.getElementById('menuToggleBtn');
      const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
      const sidebarPinBtn = document.getElementById('sidebarPinBtn');
      const sidebarOverlay = document.getElementById('sidebarOverlay');
      const sidebarNav = document.getElementById('sidebarNav');
      const sidebarDarkModeInput = document.getElementById('sidebarDarkModeInput');
      const sidebarProgressCard = document.getElementById('sidebarProgressCard');
      if (menuToggleBtn) menuToggleBtn.addEventListener('click', toggleSidebar);
      if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeSidebar);
      if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
      if (sidebarPinBtn) sidebarPinBtn.addEventListener('click', toggleSidebarPin);
      if (sidebarDarkModeInput) sidebarDarkModeInput.addEventListener('change', (e) => setThemeFromSidebarSwitch(e.target.checked));
      if (sidebarProgressCard) sidebarProgressCard.addEventListener('click', () => navigateToPage('reports'));
      if (sidebarNav) {
        sidebarNav.addEventListener('click', (e) => {
          const btn = e.target instanceof Element ? e.target.closest('.sidebar-link') : null;
          if (!btn) return;
          navigateToPage(btn.getAttribute('data-page'));
        });
      }
      updateThemeButtonUI();
      updateSidebarProgressWidget();
      applySidebarPinnedState();
      navigateToPage('home');
    }

    // Página de Ayuda: buscador local (filtra tarjetas por texto) y el TOC
    // (columna en escritorio, chips en mobile) que resalta la sección visible
    // y hace scroll suave al tocarla — sin depender de ningún estado global.
    function initHelpPage() {
      const page = document.getElementById('pageHelp');
      if (!page) return;
      const cards = Array.from(page.querySelectorAll('.help-card'));
      const tocLinks = Array.from(page.querySelectorAll('[data-help-toc]'));
      const searchInput = document.getElementById('helpSearchInput');
      const emptyMsg = document.getElementById('helpSearchEmpty');

      if (searchInput) {
        searchInput.addEventListener('input', () => {
          const q = searchInput.value.trim().toLowerCase();
          let anyVisible = false;
          cards.forEach(card => {
            const match = !q || card.textContent.toLowerCase().includes(q);
            card.classList.toggle('is-hidden-by-search', !match);
            if (match) anyVisible = true;
          });
          if (emptyMsg) emptyMsg.hidden = anyVisible;
        });
      }

      tocLinks.forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const target = document.getElementById(link.getAttribute('href').slice(1));
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });

      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const id = '#' + entry.target.id;
            tocLinks.forEach(link => link.classList.toggle('active', link.getAttribute('href') === id));
          });
        }, { rootMargin: '-15% 0px -70% 0px', threshold: 0 });
        cards.forEach(card => observer.observe(card));
      }
    }

    // Reemplaza window.confirm, que muchos webviews/PWA en el teléfono ignoran silenciosamente (el
    // botón parece no hacer nada). Usa el modal propio de la app.
    let pendingConfirmAction = null;
    export function appConfirm(message, onConfirm) {
      pendingConfirmAction = onConfirm;
      const heading = document.getElementById('confirmModalTitle');
      if (heading) heading.textContent = translateText('Confirmar');
      const details = document.getElementById('confirmModalDetails');
      if (details) { details.replaceChildren(); details.className = ''; }
      document.getElementById('confirmModalOkBtn').textContent = translateText('Sí, continuar');
      const msgEl = document.getElementById('confirmModalMessage');
      if (msgEl) msgEl.textContent = message;
      openModal('confirmModal');
    }

    document.querySelectorAll('[data-open-modal]').forEach(btn => {
      btn.addEventListener('click', () => openModal(btn.getAttribute('data-open-modal')));
    });

    // El botón "×" (data-close-modal="manualCallModal") ya no llama a closeModal directo: pasa por
    // requestCloseManualCallModal, que exige confirmación si el modal está mostrando el respaldo de
    // una llamada en vivo sin guardar.
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close-modal');
        if (modalId === 'manualCallModal') { requestCloseManualCallModal(); return; }
        closeModal(modalId);
      });
    });

    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        // El popup de bienvenida es la única excepción: no tiene botón "X" ni se cierra tocando el
        // fondo, a propósito.
        if (modal.id === 'onboardingModal') return;
        if (e.target !== modal) return;
        // Click en el fondo de #manualCallModal (fuera de la tarjeta) también pasa por el mismo
        // guard que el botón "×"
        if (modal.id === 'manualCallModal') { requestCloseManualCallModal(); return; }
        closeModal(modal.id);
      });
    });

    document.addEventListener('click', (e) => {
      const target = e.target instanceof Element ? e.target.closest('[data-gap-edit]') : null;
      if (!target) return;
      const dayKey = target.getAttribute('data-gap-day') || getActiveDayKey();
      const gapKey = target.getAttribute('data-gap-edit');
      if (!gapKey) return;
      openGapEditor(dayKey, gapKey);
    });

    document.addEventListener('click', (e) => {
      const target = e.target instanceof Element ? e.target.closest('[data-call-edit]') : null;
      if (!target) return;
      const callId = target.getAttribute('data-call-edit');
      if (!callId) return;
      openCallEditor(callId);
    });

    document.addEventListener('click', (e) => {
      const target = e.target instanceof Element ? e.target.closest('[data-call-delete]') : null;
      if (!target) return;
      const callId = target.getAttribute('data-call-delete');
      if (!callId) return;
      const call = calls.find(c => c.id === callId);
      if (!call) return;
      const owner = settings;
      const expected = JSON.parse(JSON.stringify(call));
      appConfirm(ui`¿Eliminar la llamada #${call.customerId} (${call.callDate} · ${call.callStart})? Podrás recuperarla desde «Historial de cambios» hasta 30 días.`, () => settings === owner && deleteCallRecord(callId, expected));
    });

    // Filtro Todo/Llamadas/Acciones sobre la tabla fusionada — solo cambia `tableFilterMode` y
    // vuelve a pintar #callTableWrap (renderTable ya sabe filtrar por ese valor).
    const tableFilterRow = document.getElementById('tableFilterRow');
    if (tableFilterRow) {
      tableFilterRow.addEventListener('click', (e) => {
        const btn = e.target instanceof Element ? e.target.closest('[data-table-filter]') : null;
        if (!btn) return;
        setTableFilterMode(btn.getAttribute('data-table-filter') || 'all');
        tableFilterRow.querySelectorAll('[data-table-filter]').forEach(b => b.classList.toggle('active', b === btn));
        renderTable();
      });
    }

    // Botón ✎ dentro de la tarjeta de ACW (Turno de Hoy) — abre #acwGoalModal para editar la meta
    // máxima de ACW. Delegado en document (mismo patrón que data-gap-edit/data-call-edit arriba)
    document.addEventListener('click', (e) => {
      const target = e.target instanceof Element ? e.target.closest('[data-edit-card="acw"]') : null;
      if (!target) return;
      openAcwGoalEditor();
    });

    // Botón ✎ de la tarjeta "Ganancias del ciclo" en Reportes — mismo patrón delegado que el de ACW
    // arriba (el contenedor se reconstruye por completo en cada render).
    document.addEventListener('click', (e) => {
      const target = e.target instanceof Element ? e.target.closest('[data-edit-card="cycle-goal"]') : null;
      if (!target) return;
      openCycleGoalEditor();
    });

    // "Ver Finanzas →" del preview de próximos pendientes (Ganancias de hoy)
    document.addEventListener('click', (e) => {
      const btn = e.target instanceof Element ? e.target.closest('[data-nav-page]') : null;
      if (!btn) return;
      navigateToPage(btn.getAttribute('data-nav-page'));
    });

    document.getElementById('clearDayCallsBtn').addEventListener('click', clearActiveDayCalls);
    document.getElementById('callRecoveryBtn').addEventListener('click', openCallRecovery);

    document.addEventListener('click', (e) => {
      const row = e.target instanceof Element ? e.target.closest('[data-week-day]') : null;
      if (!row) return;
      // El botón "✎ Editar" vive DENTRO de la fila/tarjeta clickeable — sin este chequeo, tocarlo
      // también dispararía la navegación al día (el click sigue burbujeando hasta este mismo
      // listener en document).
      if (e.target.closest('[data-day-note-edit]')) return;
      const dayKey = row.getAttribute('data-week-day');
      if (!dayKey) return;
      // Clickear un día FUTURO navegaba en silencio, sin ninguna señal de que ese día todavía no
      // llega (se ve vacío/"Futuro", pero sin explicación). Mismo criterio que ya usa
      // weekSummaryForOffset para marcar isFuture.
      const dateObj = callDateToDate(dayKey);
      if (dateObj && dateObj > todayRange()) {
        toast(translateText('📅 Ese día todavía no llega — vas a ver un día futuro sin datos.'));
      }
      setActiveDayKey(dayKey);
      const earningsTitle = document.getElementById('earningsSectionTitle');
      if (earningsTitle) earningsTitle.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    document.addEventListener('click', (e) => {
      const btn = e.target instanceof Element ? e.target.closest('[data-day-note-edit]') : null;
      if (!btn) return;
      const dayKey = btn.getAttribute('data-day-note-edit');
      if (dayKey) openDayNoteModal(dayKey, btn.getAttribute('data-day-note-focus'));
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        // Si #manualCallModal está abierto mostrando el respaldo de una llamada en vivo sin
        // guardar, Escape pasa por el mismo guard que el botón "×"/click afuera, en vez de cerrar
        // todo de golpe vía.
        const manualCallModalEl = document.getElementById('manualCallModal');
        if (manualCallModalEl && manualCallModalEl.classList.contains('open') && hasPendingManualCallBackup()) {
          requestCloseManualCallModal();
          return;
        }
        closeAllModals();
        // Escape también cierra el sidebar cuando está abierto en modo overlay (mobile, o
        // escritorio sin fijar) — mismo criterio que el resto de la app usa para cerrar cualquier
        // overlay con teclado. Si está FIJADO en escritorio no se toca.
        if (!(document.body.classList.contains('sidebar-pinned') && window.matchMedia('(min-width: 901px)').matches)) closeSidebar();
        return;
      }
      // Trampa de foco básica: mientras haya al menos un modal abierto, Tab/Shift+Tab quedan
      // contenidos dentro del modal MÁS RECIENTE (el de arriba de todo, ver openModalStack)
      if (e.key === 'Tab' && openModalStack.length) {
        const topModalId = openModalStack[openModalStack.length - 1];
        const topModal = document.getElementById(topModalId);
        if (!topModal) return;
        const scope = topModal.querySelector('.modal-card') || topModal;
        const focusables = getModalFocusableElements(scope);
        if (!focusables.length) { e.preventDefault(); return; }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        const activeIsInsideScope = scope.contains(active);
        if (e.shiftKey) {
          if (!activeIsInsideScope || active === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (!activeIsInsideScope || active === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    });

    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        renderTable();
        updateFinanceTotalsScrollHint();
        if (currentPage === 'reports') renderReportsMonthlyChart();
      }, 120);
    });

    // Detectar cambios externos vía evento `storage` y avisar en vez de dejar que la última pestaña
    // que guarde gane en silencio.
    let storageConflictShown = false;
    function showStorageConflictBanner() {
      const banner = document.getElementById('storageConflictBanner');
      if (banner) banner.classList.add('show');
    }
    window.addEventListener('storage', (e) => {
      if (e.key !== null && ![STORAGE_KEY, CALLS_KEY, SETTINGS_KEY].includes(e.key)) return;
      if (storageConflictShown) return;
      storageConflictShown = true;
      showStorageConflictBanner();
    });
    const storageConflictReloadBtn = document.getElementById('storageConflictReloadBtn');
    if (storageConflictReloadBtn) storageConflictReloadBtn.addEventListener('click', () => window.location.reload());
    const storageConflictDismissBtn = document.getElementById('storageConflictDismissBtn');
    if (storageConflictDismissBtn) storageConflictDismissBtn.addEventListener('click', () => {
      const banner = document.getElementById('storageConflictBanner');
      if (banner) banner.classList.remove('show');
    });
    const audioBlockedActivateBtn = document.getElementById('audioBlockedActivateBtn');
    if (audioBlockedActivateBtn) audioBlockedActivateBtn.addEventListener('click', activateBlockedAudio);
    const audioBlockedDismissBtn = document.getElementById('audioBlockedDismissBtn');
    if (audioBlockedDismissBtn) audioBlockedDismissBtn.addEventListener('click', hideAudioBlockedBanner);

    document.getElementById('shiftControlBtn').addEventListener('click', toggleShift);
    document.querySelectorAll('[data-earnings-currency]').forEach(control => {
      control.addEventListener('click', toggleEarningsCurrency);
      control.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        toggleEarningsCurrency();
      });
    });
    document.getElementById('clockNow').addEventListener('click', () => {
      clockTimeVisible = !clockTimeVisible;
      renderHeader();
    });
    // Horario por semana específica — tabs de modo (Plantilla / Semana específica) + navegación
    // entre semanas + checkbox para activar/quitar la personalización de la semana que se está
    // viendo.
    document.getElementById('scheduleModeTabs').addEventListener('click', (e) => {
      const btn = e.target instanceof Element ? e.target.closest('[data-mode]') : null;
      if (!btn) return;
      const nextMode = btn.getAttribute('data-mode');
      if (nextMode === scheduleViewMode) return;
      const apply = () => { setContextScheduleViewMode(nextMode); syncShiftModalFields(); };
      if (scheduleFormIsDirty()) {
        appConfirm(translateText('Tienes cambios sin guardar. ¿Descartarlos y cambiar de vista?'), apply);
        return;
      }
      apply();
    });
    function navigateScheduleWeek(nextOffset) {
      const apply = () => { setContextScheduleWeekOffset(nextOffset); syncShiftModalFields(); };
      if (scheduleFormIsDirty()) {
        appConfirm(translateText('Tienes cambios sin guardar en esta semana. ¿Descartarlos y cambiar de semana?'), apply);
        return;
      }
      apply();
    }
    document.getElementById('scheduleWeekPrevBtn').addEventListener('click', () => navigateScheduleWeek(scheduleWeekOffset - 1));
    document.getElementById('scheduleWeekNextBtn').addEventListener('click', () => navigateScheduleWeek(scheduleWeekOffset + 1));
    document.getElementById('scheduleWeekTodayBtn').addEventListener('click', () => navigateScheduleWeek(0));
    document.getElementById('scheduleWeekCustomInput').addEventListener('change', (e) => {
      if (scheduleWeekIsPast(scheduleWeekOffset)) { e.target.checked = scheduleWeekHasCustom(scheduleWeekOffset); return; }
      if (e.target.checked) {
        ensureScheduleWeekOverride(scheduleWeekOffset);
        if (saveSettingsOnly() === false) return false;
        toast(translateText('Semana personalizada — arrancó como copia de tu plantilla, ajústala y guarda cada día que cambie.'));
        syncShiftModalFields();
      } else {
        e.target.checked = true;
        appConfirm(translateText('¿Quitar la personalización de esta semana y volver a usar la plantilla? El horario propio de esta semana se borra — no afecta la plantilla ni otras semanas.'), () => {
          removeScheduleWeekOverride(scheduleWeekOffset);
          onGameDayMetadataChanged(todayCallDateKey());
          if (saveAll() === false) return false;
          syncShiftModalFields();
        });
      }
    });
    document.getElementById('copyDayToAllBtn').addEventListener('click', copyDayToAll);
    document.getElementById('workDayReviewBtn').addEventListener('click', openWorkDayReview);
    document.getElementById('payDatesRetryBtn').addEventListener('click', () => usePayReceipts('retry'));
    document.getElementById('payDatesBody').addEventListener('click', event => {
      const button = event.target instanceof Element ? event.target.closest('[data-pay-receipt]') : null;
      if (button) usePayReceipts('open', button.getAttribute('data-pay-receipt'));
    });
    document.getElementById('payReceiptSaveBtn').addEventListener('click', () => usePayReceipts('save'));
    document.getElementById('payReceiptDeleteBtn').addEventListener('click', () => usePayReceipts('delete'));
    document.getElementById('payReceiptAmount').addEventListener('input', () => usePayReceipts('preview'));
    document.getElementById('copyWeekendBtn').addEventListener('click', copyDayToWeekend);
    document.getElementById('confirmModalOkBtn').addEventListener('click', () => {
      const action = pendingConfirmAction;
      pendingConfirmAction = null;
      closeModal('confirmModal');
      if (typeof action === 'function') action();
    });
    document.getElementById('breakControlBtn').addEventListener('click', () => togglePause('break'));
    document.getElementById('lunchControlBtn').addEventListener('click', () => togglePause('lunch'));
    document.getElementById('callControlBtn').addEventListener('click', toggleCall);
    // Barra fija de actividad en vivo: un solo listener por botón (no se reasignan en cada tick)
    document.getElementById('liveBarSaveBtn').addEventListener('click', () => {
      if (currentLiveActivity) currentLiveActivity.onSave();
    });
    document.getElementById('liveBarDiscardBtn').addEventListener('click', () => {
      if (currentLiveActivity) currentLiveActivity.onDiscard();
    });
    // Botones "Guardar"/"Terminar" de la nueva tarjeta de estado dentro de "Llamadas" (ver `.calls-
    // status-card`) — mismas 2 funciones que ya usa la barra fija para una llamada activa.
    document.getElementById('callsStatusSaveBtn').addEventListener('click', endCall);
    document.getElementById('callsStatusEndBtn').addEventListener('click', discardActiveCall);
    document.getElementById('resetHeaderBtn').addEventListener('click', () => {
      const label = document.getElementById('resetDayLabel');
      if (label) label.textContent = formatCallDayLabel(getActiveDayKey());
      openModal('resetModal');
    });
    document.getElementById('resetDayBtn').addEventListener('click', resetDay);
    document.getElementById('eraseAllDataBtn').addEventListener('click', eraseAllData);
    document.getElementById('snapshotRecoveryBtn').addEventListener('click', () => useSnapshotTools('openSnapshotRecovery'));
    document.getElementById('ajustesHeaderBtn').addEventListener('click', openSettingsModal);
    document.getElementById('saveAccountProfileBtn').addEventListener('click', saveAccountProfile);
    document.getElementById('higherRateHeaderBtn').addEventListener('click', () => {
      openModal('higherRateModal');
      syncHigherRateModalFields();
    });
    // "Avisos" pasa de página del sidebar a ícono del header (a la izquierda de Higher Rate) que
    // abre su propio popup — mismo patrón que ajustesHeaderBtn/higherRateHeaderBtn de arriba.
    document.getElementById('avisosHeaderBtn').addEventListener('click', () => {
      syncNotificationsModalFields();
      openModal('notificationsModal');
      openNotificationReview().catch(()=>toast(translateText('No se pudo cargar el resumen. Cerrá Avisos y volvé a abrirlo.')));
    });
    document.addEventListener('click',event=>{
      if(!event.target.closest?.('[data-reflection-history]'))return;
      closeModal('positiveReflectionModal');navigateToPage('achievements');
      const target=document.getElementById('positiveHistoryPanel');
      target.scrollIntoView({block:'start'});target.setAttribute('tabindex','-1');target.focus({preventScroll:true});
    });
    document.getElementById('pasteCallsBtn').addEventListener('click', () => {
      // El resumen de filas omitidas es del ÚLTIMO import — se limpia al reabrir el modal para no
      // mostrar un detalle viejo como si fuera del pegado que se está por hacer ahora.
      renderImportSkippedSummary([], []);
      syncCallImportPlaceholder();
      openModal('callsModal');
    });
    document.getElementById('addCallManualBtn').addEventListener('click', openManualCallModal);
    document.getElementById('manualCallDurationInput').addEventListener('input', updateManualCallPreview);
    for (const id of ['manualCallDateInput', 'manualCallStartInput']) document.getElementById(id).addEventListener('input', updateManualCallPreview);
    document.getElementById('manualCallPayInput').addEventListener('input', () => {
      markManualCallPayDirty();
      // Mismo criterio que callEditPayInput: editar el Pago a mano deselecciona el tile de tarifa
      // (si no, se queda resaltado aunque el monto ya no coincida con esa tarifa).
      if (getManualCallSelectedRateTile() !== null) {
        clearManualCallRateTile();
        renderRateTiles('manualCallRateTiles', null);
      }
      updateManualCallPreview();
    });
    document.getElementById('manualCallRateTiles').addEventListener('click', (e) => {
      const btn = e.target instanceof Element ? e.target.closest('[data-rate-tile]') : null;
      if (!btn) return;
      applyRateTileToManualCall(btn.getAttribute('data-rate-tile'));
    });
    document.getElementById('saveManualCallBtn').addEventListener('click', saveManualCall);
    document.getElementById('manualCallModal').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveManualCall();
    });
    // Billable/Dropped pasan de <select> nativo a pills Sí/No (ver ".mc-pill-*" en el CSS)
    document.getElementById('manualCallModal').addEventListener('click', (e) => {
      const btn = e.target instanceof Element ? e.target.closest('[data-mc-pill-for]') : null;
      if (!btn) return;
      const targetId = btn.getAttribute('data-mc-pill-for');
      const value = btn.getAttribute('data-mc-pill-value');
      const select = document.getElementById(targetId);
      if (select) select.value = value;
      const row = btn.closest('.mc-pill-row');
      if (row) row.querySelectorAll('.mc-pill-btn').forEach(b => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
    });
    document.getElementById('importBtn').addEventListener('click', importCalls);
    document.getElementById('importResultRetryBtn').addEventListener('click', () => { if (importOutcomeArgs) renderImportSkippedSummary(...importOutcomeArgs); });
    document.getElementById('callSearchInput').addEventListener('input', renderTable);
    document.getElementById('callSourceFilter').addEventListener('change', renderTable);
    document.getElementById('callTableRetryBtn').addEventListener('click', () => renderTable({ retry: true }));
    document.getElementById('clearCallsBtn').addEventListener('click', clearCallInputBox);
    document.getElementById('exportBtn').addEventListener('click', exportJSON);
    document.getElementById('importJsonBtn').addEventListener('click', () => document.getElementById('importJsonFile').click());
    document.getElementById('importJsonFile').addEventListener('change', handleImportJsonFile);
    document.getElementById('accountingExportPeriodRow').addEventListener('click', (e) => {
      const btn = e.target instanceof Element ? e.target.closest('[data-accounting-period]') : null;
      if (!btn) return;
      accountingExportPeriod = btn.getAttribute('data-accounting-period') || 'cycle';
      syncAccountingExportPeriodUI();
    });
    document.getElementById('accountingExportCsvBtn').addEventListener('click', exportAccountingCsv);
    document.getElementById('accountingExportPdfBtn').addEventListener('click', exportAccountingPdf);
    for(const id of ['accountingExportFromInput','accountingExportToInput'])document.getElementById(id).addEventListener('change',renderAccountingExportScope);
    syncAccountingExportPeriodUI();
    document.getElementById('callInput').addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') importCalls();
    });
    document.getElementById('productiveGoalInput').addEventListener('change', () => requestGoalChange('minutes'));
    document.getElementById('earningsGoalInput').addEventListener('change', () => requestGoalChange('dollars'));
    document.getElementById('goalCurrencyInput').addEventListener('change', () => requestGoalChange('currency'));
    document.getElementById('goalScopeDayBtn').addEventListener('click', () => applyPendingGoalChange('day'));
    document.getElementById('goalScopeGlobalBtn').addEventListener('click', () => applyPendingGoalChange('global'));
    document.getElementById('clearDayGoalOverrideBtn').addEventListener('click', clearActiveDayGoalOverride);
    document.getElementById('userNameInput').addEventListener('change', (e) => {
      settings.userName = e.target.value.trim().slice(0, 40);
      saveSettingsOnly();
      render();
    });
    document.getElementById('userEmojiInput').addEventListener('change', (e) => {
      settings.userEmoji = e.target.value.trim().slice(0, 8);
      saveSettingsOnly();
      render();
    });
    // Escribir/pegar un emoji a mano en el cuadro de texto también debe reflejarse en el grid
    // (resaltar ese botón si coincide, o quitar el resaltado si no está en la lista corta).
    document.getElementById('userEmojiInput').addEventListener('input', (e) => {
      syncEmojiPickerSelection('emojiPickerMetas', e.target.value.trim());
    });
    document.getElementById('onboardingEmojiInput').addEventListener('input', (e) => {
      const value = e.target.value.trim();
      syncEmojiPickerSelection('emojiPickerOnboarding', value);
      const onboardingEmojiPreview = document.getElementById('onboardingEmojiPreview');
      if (onboardingEmojiPreview) onboardingEmojiPreview.textContent = value || DEFAULT_USER_EMOJI;
    });
    wireEmojiPicker('emojiPickerMetas', 'userEmojiInput', (emoji) => {
      settings.userEmoji = emoji;
      saveSettingsOnly();
      render();
    });
    const toggleEmojiPickerMetasBtn = document.getElementById('toggleEmojiPickerMetasBtn');
    if (toggleEmojiPickerMetasBtn) toggleEmojiPickerMetasBtn.addEventListener('click', toggleEmojiPickerMetas);
    const toggleEmojiPickerOnboardingBtn = document.getElementById('toggleEmojiPickerOnboardingBtn');
    if (toggleEmojiPickerOnboardingBtn) toggleEmojiPickerOnboardingBtn.addEventListener('click', toggleEmojiPickerOnboarding);
    wireEmojiPicker('emojiPickerOnboarding', 'onboardingEmojiInput', (emoji) => {
      const onboardingEmojiPreview = document.getElementById('onboardingEmojiPreview');
      if (onboardingEmojiPreview) onboardingEmojiPreview.textContent = emoji || DEFAULT_USER_EMOJI;
    });
    renderEmojiPicker('emojiPickerMetas', String(settings.userEmoji || ''));
    document.getElementById('onboardingSaveBtn').addEventListener('click', finishOnboarding);
    document.getElementById('rateInput').addEventListener('change', updateRate);
    document.getElementById('exchangeRateInput').addEventListener('change', updateCurrencySettings);
    document.getElementById('currencyLabelInput').addEventListener('change', updateCurrencySettings);
    document.getElementById('saveShiftWindowBtn').addEventListener('click', saveShiftWindow);
    document.getElementById('addBlockBtn').addEventListener('click', addBlockRow);
    document.getElementById('scheduleOffsetMinusBtn').addEventListener('click', () => {
      if (scheduleOffsetMin - 15 < -SCHEDULE_OFFSET_LIMIT_MIN) {
        toast(ui`El ajuste no puede pasar de -12h de una sola vez.`);
        return;
      }
      setContextScheduleOffsetMin(scheduleOffsetMin - 15);
      syncScheduleOffsetUI();
    });
    document.getElementById('scheduleOffsetPlusBtn').addEventListener('click', () => {
      if (scheduleOffsetMin + 15 > SCHEDULE_OFFSET_LIMIT_MIN) {
        toast(ui`El ajuste no puede pasar de +12h de una sola vez.`);
        return;
      }
      setContextScheduleOffsetMin(scheduleOffsetMin + 15);
      syncScheduleOffsetUI();
    });
    document.getElementById('scheduleOffsetApplyBtn').addEventListener('click', applyScheduleOffset);
    // "¿Cómo funciona?" ya no hace nada al hacer click — la información vive en un tooltip que se
    // muestra solo con hover/foco (ver.sched-help-wrap/.sched-help-tooltip en el CSS).
    document.getElementById('scheduleHelpBtn').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    // Pastilla "Hoy / Ciclo" dentro del <summary> de "Ganancias de hoy" — mismo criterio que
    // scheduleHelpBtn arriba.
    document.getElementById('earningsModeToggle').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const btn = e.target instanceof Element ? e.target.closest('[data-earnings-mode]') : null;
      if (!btn) return;
      setEarningsViewMode(btn.getAttribute('data-earnings-mode'));
    });
    // Pastilla "Bloques / Llamadas" dentro del <summary> de "Bloques del día" — mismo criterio que
    // earningsModeToggle arriba.
    document.getElementById('blocksViewToggle').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const btn = e.target instanceof Element ? e.target.closest('[data-blocks-view]') : null;
      if (!btn) return;
      setBlocksViewMode(btn.getAttribute('data-blocks-view'));
    });
    // Delegado en el contenedor: las filas se reconstruyen por completo en cada
    // renderBlocksEditor/addBlockRow/removeBlockRowAt, así que un listener por botón individual se
    // perdería cada vez que se repinta.
    document.getElementById('blocksEditorList').addEventListener('click', (e) => {
      const btn = e.target instanceof Element ? e.target.closest('[data-remove-block]') : null;
      if (!btn) return;
      removeBlockRowAt(Number(btn.getAttribute('data-remove-block')));
    });
    // El campo "Meta productiva (min)" solo aplica a bloques de Trabajo.
    document.getElementById('blocksEditorList').addEventListener('change', (e) => {
      const typeInput = e.target instanceof Element ? e.target.closest('.block-type-input') : null;
      if (!typeInput) return;
      const row = typeInput.closest('.block-row');
      if (!row) return;
      const goalField = row.querySelector('.block-goal-field');
      const goalInput = row.querySelector('.block-goal-input');
      const isWork = typeInput.value === 'work';
      if (goalField) goalField.style.display = isWork ? '' : 'none';
      const duration = updateScheduleRowSummary(row);
      if (isWork && goalInput && !(Number(goalInput.value) > 0)) {
        goalInput.value = duration;
      }
      row.setAttribute('data-block-type', typeInput.value);
    });
    // La píldora de duración de cada tarjeta del timeline (puramente decorativa, ver
    // formatBlockDurationLabel) se recalcula en vivo al editar Inicio/Fin, para no esperar a un
    // render.
    document.getElementById('blocksEditorList').addEventListener('input', (e) => {
      const timeInput = e.target instanceof Element ? e.target.closest('.sched-tl-time-input') : null;
      if (!timeInput) return;
      const row = timeInput.closest('.block-row');
      if (row) updateScheduleRowSummary(row);
    });
    // Cambiar Día libre presenta la revisión de alcance antes de guardar.
    document.getElementById('dayOffInput').addEventListener('change', saveShiftWindow);
    document.getElementById('cycleAnchorInput').addEventListener('change', updateCycleSettings);
    document.getElementById('cyclePayOffsetInput').addEventListener('change', updateCycleSettings);
    document.getElementById('masterVolumeInput').addEventListener('input', updateMasterVolumeSettings);
    document.getElementById('testMasterVolumeBtn').addEventListener('click', playShiftAlarmBeep);
    document.getElementById('shiftAlertMinInput').addEventListener('change', updateShiftAlertSettings);
    document.getElementById('breakAlertMinInput').addEventListener('change', updateBreakAlertSettings);
    document.getElementById('breakEndAlertMinInput').addEventListener('change', updateBreakAlertSettings);
    document.getElementById('adherenceGraceMinInput').addEventListener('change', updateAdherenceGraceSettings);
    document.getElementById('adherenceGoalPctInput').addEventListener('change', updateAdherenceGoalSettings);
    document.getElementById('productiveBreakEarnMinInput').addEventListener('change', updateProductiveBreakSettings);
    document.getElementById('productiveBreakAwardMinInput').addEventListener('change', updateProductiveBreakSettings);
    document.getElementById('productiveBreakSoundInput').addEventListener('change', updateProductiveBreakSound);
    document.getElementById('productiveBreakSoundFile').addEventListener('change', handleProductiveBreakSoundFile);
    document.getElementById('testProductiveBreakSoundBtn').addEventListener('click', testProductiveBreakSound);
    // Mismo wiring que arriba, generalizado por `kind` (ver ALARM_SOUND_CONFIGS).
    Object.keys(ALARM_SOUND_CONFIGS).forEach((kind) => {
      const cfg = ALARM_SOUND_CONFIGS[kind];
      document.getElementById(cfg.selectId).addEventListener('change', () => updateAlarmSound(kind));
      document.getElementById(cfg.fileInputId).addEventListener('change', (e) => handleAlarmSoundFile(kind, e));
      if (cfg.toggleId) document.getElementById(cfg.toggleId).addEventListener('change', () => updateCallSoundEnabled(kind));
      if (cfg.testId) document.getElementById(cfg.testId).addEventListener('click', () => testAlarmSound(kind));
      if (cfg.clearId) document.getElementById(cfg.clearId).addEventListener('click', () => clearAlarmCustomSound(kind));
    });
    document.getElementById('testShiftAlarmSoundBtn').addEventListener('click', () => testAlarmSound('shift'));
    document.getElementById('testBreakStartAlarmSoundBtn').addEventListener('click', () => testAlarmSound('breakStart'));
    document.getElementById('testBreakEndAlarmSoundBtn').addEventListener('click', () => testAlarmSound('breakEnd'));
    document.getElementById('addHigherRateWindowBtn').addEventListener('click', addHigherRateWindowRow);
    for (const id of ['earningsDayBreakdown', 'earningsCycleBreakdown']) {
      document.getElementById(id).addEventListener('toggle', event => { if (event.target.open) renderEarningsDetails(true); });
    }
    document.getElementById('purgeHigherRateWindowsBtn').addEventListener('click', purgePastHigherRateWindows);
    // Delegado en el modal completo: las filas viven en 2 listas distintas (#higherRateWindowsList
    // y #higherRateHistoryList).
    document.getElementById('higherRateModal').addEventListener('click', (e) => {
      const review = e.target instanceof Element ? e.target.closest('[data-review-hr-window]') : null;
      if (review) { openHigherRateReview(review.closest('.hr-window-card').getAttribute('data-hr-window-id')); return; }
      // El pill de nivel escribe en el <select class="hr-window-tier-input"> oculto de siempre.
      const tierBtn = e.target instanceof Element ? e.target.closest('[data-hr-tier-btn]') : null;
      if (tierBtn) {
        const card = tierBtn.closest('.hr-window-card');
        const select = card ? card.querySelector('.hr-window-tier-input') : null;
        const tier = tierBtn.getAttribute('data-tier');
        if (select) select.value = tier;
        if (card) {
          card.setAttribute('data-tier', tier);
          card.querySelectorAll('.hr-window-tier-btn').forEach(b => {
            const t = b.getAttribute('data-tier');
            const active = t === tier;
            b.setAttribute('aria-pressed', active ? 'true' : 'false');
            b.textContent = hrTierButtonLabel(t, active);
          });
        }
        saveHigherRateWindowsFromEditor();
        return;
      }
      const btn = e.target instanceof Element ? e.target.closest('[data-remove-hr-window]') : null;
      if (!btn) return;
      const row = btn.closest('.hr-window-card');
      const id = row ? row.getAttribute('data-hr-window-id') : null;
      if (id) removeHigherRateWindowRowAt(id);
    });
    document.getElementById('higherRateModal').addEventListener('change', (e) => {
      if (!(e.target instanceof Element)) return;
      const card = e.target.closest('.hr-window-card');
      if (!card) return;
      // La fecha sigue siendo un <input type="date"> real (editable), solo restylada para verse
      // como texto.
      if (e.target.classList.contains('hr-window-date-input')) {
        const dayKey = dayKeyFromIsoDate(e.target.value) || todayCallDateKey();
        const nameEl = card.querySelector('.hr-window-day-name');
        if (nameEl) nameEl.textContent = hrWindowWeekdayLabel(dayKey);
      }
      saveHigherRateWindowsFromEditor();
    });
    document.getElementById('daySelector').addEventListener('change', (e) => {
      const key = dayKeyFromIsoDate(e.target.value);
      if (key) setActiveDayKey(key);
    });
    document.getElementById('dayPrevBtn').addEventListener('click', () => shiftActiveDayBy(-1));
    document.getElementById('dayNextBtn').addEventListener('click', () => shiftActiveDayBy(1));
    document.getElementById('dayActiveLabelBtn').addEventListener('click', jumpActiveDayToToday);
    document.getElementById('weekPrevBtn').addEventListener('click', () => { weekViewOffset -= 1; renderWeekSummary(); });
    document.getElementById('weekNextBtn').addEventListener('click', () => { weekViewOffset += 1; renderWeekSummary(); });
    document.getElementById('weekTodayBtn').addEventListener('click', () => { weekViewOffset = 0; renderWeekSummary(); });
    document.getElementById('cyclePrevBtn').addEventListener('click', () => { cycleViewOffset -= 1; renderHeader(); });
    document.getElementById('cycleNextBtn').addEventListener('click', () => { cycleViewOffset += 1; renderHeader(); });
    document.getElementById('cycleCurrentBtn').addEventListener('click', () => { cycleViewOffset = 0; renderHeader(); });
    // Ganancias/Adherencia por mes (Reportes) — mismo patrón que weekPrevBtn/cyclePrevBtn de
    // arriba.
    document.getElementById('rptMonthlyPrevBtn').addEventListener('click', () => {
      const historyStart = effectiveHistoryStartDate();
      if (historyStart) {
        const today = todayRange();
        const targetLastMonthKey = (today.getFullYear() * 12 + today.getMonth()) + (reportsMonthlyOffset - 1) * REPORTS_MONTHLY_PAGE_SIZE;
        const startMonthKey = historyStart.getFullYear() * 12 + historyStart.getMonth();
        if (targetLastMonthKey < startMonthKey) return;
      }
      setContextReportsMonthlyOffset(reportsMonthlyOffset - 1);
      renderReportsMonthlyChart();
    });
    document.getElementById('rptMonthlyNextBtn').addEventListener('click', () => { if (reportsMonthlyOffset < 0) { setContextReportsMonthlyOffset(reportsMonthlyOffset + 1); renderReportsMonthlyChart(); } });
    document.getElementById('rptMonthlyTodayBtn').addEventListener('click', () => { setContextReportsMonthlyOffset(0); renderReportsMonthlyChart(); });
    document.getElementById('calMonthPrevBtn').addEventListener('click', () => {
      const historyStart = effectiveHistoryStartDate();
      const today = todayRange();
      const targetMonthKey = (today.getFullYear() * 12 + today.getMonth()) + (calMonthOffset - 1);
      const startMonthKey = historyStart ? historyStart.getFullYear() * 12 + historyStart.getMonth() : null;
      if (startMonthKey !== null && targetMonthKey < startMonthKey) return;
      setContextCalMonthOffset(calMonthOffset - 1);
      renderCalendarMonth();
    });
    document.getElementById('calMonthNextBtn').addEventListener('click', () => { if (calMonthOffset < 0) { setContextCalMonthOffset(calMonthOffset + 1); renderCalendarMonth(); } });
    document.getElementById('calMonthTodayBtn').addEventListener('click', () => { setContextCalMonthOffset(0); renderCalendarMonth(); });
    // Vista anual del Calendario de productividad (solo escritorio).
    document.getElementById('calBackToYearBtn').addEventListener('click', backToCalYearView);
    document.getElementById('calYearPrevBtn').addEventListener('click', () => {
      const historyStart = effectiveHistoryStartDate();
      const targetYear = todayRange().getFullYear() + calYearOffset - 1;
      if (historyStart && targetYear < historyStart.getFullYear()) return;
      setContextCalYearOffset(calYearOffset - 1);
      renderCalYear();
    });
    document.getElementById('calYearNextBtn').addEventListener('click', () => { if (calYearOffset < 0) { setContextCalYearOffset(calYearOffset + 1); renderCalYear(); } });
    document.getElementById('calYearGoalEditBtn').addEventListener('click', openCalYearGoalEditor);
    document.getElementById('calHistoryStartEditBtn').addEventListener('click', openHistoryStartDateEditor);
    document.getElementById('calYearMonthGrid').addEventListener('click', (e) => {
      const card = e.target instanceof Element ? e.target.closest('[data-cal-month-idx]') : null;
      if (!card) return;
      openCalMonthFromYear(Number(card.getAttribute('data-cal-month-idx')));
    });
    document.getElementById('saveGapBtn').addEventListener('click', saveGapEditor);
    document.getElementById('saveAcwGoalBtn').addEventListener('click', saveAcwGoalEditor);
    document.getElementById('saveFinanceRowBtn').addEventListener('click', saveFinanceRowModal);
    // Grilla de categorías del modal Agregar gasto/meta: un solo listener delegado para los chips
    // fijos/propios + el chip final "+ Nueva categoría".
    document.getElementById('financeRowCategoryChips').addEventListener('click', (e) => {
      if (!(e.target instanceof Element)) return;
      if (e.target.closest('#financeRowNewCatToggle')) { openFinanceNewCatPanel(); return; }
      const editBtn = e.target.closest('[data-fin-cat-edit]');
      if (editBtn) { openFinanceNewCatPanel(editBtn.getAttribute('data-fin-cat-edit')); return; }
      const deleteBtn = e.target.closest('[data-fin-cat-delete]');
      if (deleteBtn) { financeDeleteCategory(deleteBtn.getAttribute('data-fin-cat-delete')); return; }
      const chip = e.target.closest('[data-fin-cat-chip]');
      if (chip) selectFinanceCategoryChip(chip.getAttribute('data-fin-cat-chip'));
    });
    document.getElementById('createFinCatBtn').addEventListener('click', createFinanceCategory);
    document.getElementById('cancelFinCatBtn').addEventListener('click', closeFinanceNewCatPanel);
    wireEmojiPicker('emojiPickerNewFinCat', 'financeNewCatEmojiInput');
    document.getElementById('financeNewCatColorRow').addEventListener('click', (e) => {
      const btn = e.target instanceof Element ? e.target.closest('[data-fin-cat-color]') : null;
      if (!btn) return;
      const rgb = btn.getAttribute('data-fin-cat-color');
      const colorInput = document.getElementById('financeNewCatColorInput');
      if (colorInput) colorInput.value = rgb;
      document.querySelectorAll('#financeNewCatColorRow [data-fin-cat-color]').forEach(b => b.classList.toggle('selected', b === btn));
    });
    document.getElementById('financeRowTargetInput').addEventListener('input', () => syncFinanceRowTargetFields('usd'));
    document.getElementById('financeRowTargetCurrencyInput').addEventListener('input', () => syncFinanceRowTargetFields('currency'));
    // Las filas se repintan; los controles usan listeners delegados.
    document.getElementById('financeSection').addEventListener('click', (e) => {
      if (!(e.target instanceof Element)) return;
      const tabBtn = e.target.closest('[data-fin-tab]');
      if (tabBtn) { setFinanceTab(tabBtn.getAttribute('data-fin-tab')); return; }
      const editRowBtn = e.target.closest('[data-fin-edit]');
      if (editRowBtn) {
        const catId = editRowBtn.getAttribute('data-fin-cat');
        const rowId = editRowBtn.getAttribute('data-fin-edit');
        const row = financeFindRow(catId, rowId);
        if (row) openFinanceRowModal(financeRowIsMeta(row) ? 'meta' : 'gasto', row);
        return;
      }
      const upBtn = e.target.closest('[data-fin-priority-up]');
      if (upBtn) { financeSwapPriority(upBtn.getAttribute('data-fin-cat'), upBtn.getAttribute('data-fin-priority-up'), -1); return; }
      const downBtn = e.target.closest('[data-fin-priority-down]');
      if (downBtn) { financeSwapPriority(downBtn.getAttribute('data-fin-cat'), downBtn.getAttribute('data-fin-priority-down'), 1); return; }
      const resetBtn = e.target.closest('[data-fin-reset]');
      if (resetBtn) { reviewFinanceAction('reset',resetBtn.getAttribute('data-fin-cat'), resetBtn.getAttribute('data-fin-reset')); return; }
      const signBtn = e.target.closest('[data-fin-sign-btn]');
      if (signBtn) {
        const row = signBtn.closest('.fin-row');
        if (!row) return;
        row.querySelectorAll('[data-fin-sign-btn]').forEach(b => b.setAttribute('aria-pressed', b === signBtn ? 'true' : 'false'));
        const applyBtnInRow = row.querySelector('[data-fin-apply]');
        if (applyBtnInRow) applyBtnInRow.classList.toggle('mode-minus', signBtn.getAttribute('data-sign') === 'minus');
        return;
      }
      const applyBtn = e.target.closest('[data-fin-apply]');
      if (applyBtn) {
        const row = applyBtn.closest('.fin-row');
        const input = row ? row.querySelector('[data-fin-reservation-input]') : null;
        const unit = row?.querySelector('[data-fin-amount-scope="reservation"] select')?.value || 'usd';
        const activeSignBtn = row ? row.querySelector('[data-fin-sign-btn][aria-pressed="true"]') : null;
        const sign = activeSignBtn ? activeSignBtn.getAttribute('data-sign') : 'plus';
        financeApplySignedAmount(applyBtn.getAttribute('data-fin-cat'), applyBtn.getAttribute('data-fin-apply'), input ? financeInputUsd(input.value, unit) : '', sign);
        return;
      }
      const deleteBtn = e.target.closest('[data-fin-delete]');
      if (deleteBtn) { financeDeleteRow(deleteBtn.getAttribute('data-fin-cat'), deleteBtn.getAttribute('data-fin-delete')); return; }
      if (e.target.closest('#addFinanceGastoBtn')) { openFinanceRowModal('gasto'); return; }
      if (e.target.closest('#addFinanceMetaBtn')) { openFinanceRowModal('meta'); return; }
    });
    document.getElementById('financeSection').addEventListener('change', (e) => {
      const checkbox = e.target instanceof Element ? e.target.closest('[data-fin-mark-paid]') : null;
      if (!checkbox) return;
      financeToggleManualPaid(checkbox.getAttribute('data-fin-cat'), checkbox.getAttribute('data-fin-mark-paid'), checkbox.checked);
    });
    document.getElementById('financeAutoFillInput').addEventListener('change', e => { const checked=e.target.checked;e.target.checked=!!settings.financeAutoFill;reviewFinanceAction('auto',null,null,checked); });
    document.getElementById('financeDistributionReviewBtn').addEventListener('click',()=>reviewFinanceAction('inspect'));
    wireFinancePlanning();
    document.getElementById('saveDayNoteBtn').addEventListener('click', saveDayNoteFromModal);
    document.getElementById('clearDayNoteBtn').addEventListener('click', clearDayNoteFromModal);
    document.getElementById('saveCallEditBtn').addEventListener('click', saveCallEditor);
    document.getElementById('callEditModal').addEventListener('click', (e) => {
      const btn = e.target instanceof Element ? e.target.closest('[data-mc-pill-for]') : null;
      if (!btn) return;
      const targetId = btn.getAttribute('data-mc-pill-for');
      const value = btn.getAttribute('data-mc-pill-value');
      const select = document.getElementById(targetId);
      if (select) select.value = value;
      const row = btn.closest('.mc-pill-row');
      if (row) row.querySelectorAll('.mc-pill-btn').forEach(b => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
    });
    document.getElementById('gapLabelInput').addEventListener('change', () => {
      if (!editingGapContext) return;
      const row = findGapRow(editingGapContext.dayKey, editingGapContext.gapKey);
      const preview = document.getElementById('gapPreviewText');
      if (row && preview) {
        const label = String(document.getElementById('gapLabelInput').value || 'acw');
        preview.textContent = ui`Clasificación lista: ${gapLabelText(label)} · ${gapDisplayAmountUnitLabel(label)} ${gapDisplayAmountForLabel(row, label).toFixed(1)} min`;
      }
    });
    document.getElementById('gapModal').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        saveGapEditor();
      }
    });
    // Pills de Clasificación (ACW/Break/Lunch/Otro): escriben su valor en el <select
    // id="gapLabelInput"> oculto de siempre y disparan un 'change' sintético para reutilizar el
    // listener ya existente sobre.
    document.getElementById('gapModal').addEventListener('click', (e) => {
      const btn = e.target instanceof Element ? e.target.closest('[data-gap-tag-btn]') : null;
      if (!btn) return;
      const select = document.getElementById('gapLabelInput');
      if (select) {
        select.value = btn.getAttribute('data-gap-tag-btn');
        select.dispatchEvent(new Event('change'));
      }
      syncGapTagButtonsUI();
    });
    document.getElementById('dayNoteModal').addEventListener('click', (e) => {
      const btn = e.target instanceof Element ? e.target.closest('[data-daynote-status]') : null;
      if (!btn) return;
      const select = document.getElementById('dayNoteStatusInput');
      if (select) select.value = btn.getAttribute('data-daynote-status');
      syncDayNoteStatusUI();
    });
    document.getElementById('weekSummaryTipDismissBtn').addEventListener('click', () => {
      settings.weekSummaryTipDismissed = true;
      saveSettingsOnly();
      document.getElementById('weekSummaryTip').hidden = true;
    });
    // Mismo patrón que #gapModal: Ctrl/Cmd+Enter guarda sin necesitar tocar el botón.
    document.getElementById('acwGoalModal').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        saveAcwGoalEditor();
      }
    });
    // Meta del ciclo: editor rápido (✎ en Reportes) + campo en Ajustes → Ciclo de pago, ambos
    // apuntando al mismo override.
    document.getElementById('saveCycleGoalBtn').addEventListener('click', saveCycleGoalEditor);
    document.getElementById('useAutoCycleGoalBtn').addEventListener('click', useAutoCycleGoal);
    document.getElementById('cycleGoalModal').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        saveCycleGoalEditor();
      }
    });
    document.getElementById('cycleGoalInput').addEventListener('change', updateCycleGoalFromAjustes);
    document.getElementById('saveCalYearGoalBtn').addEventListener('click', saveCalYearGoalModal);
    document.getElementById('useAutoCalYearGoalBtn').addEventListener('click', useAutoCalYearGoalModal);
    document.getElementById('calYearGoalModal').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveCalYearGoalModal();
    });
    document.getElementById('saveCalHistoryStartBtn').addEventListener('click', saveCalHistoryStartModal);
    document.getElementById('useAutoCalHistoryStartBtn').addEventListener('click', useAutoCalHistoryStartModal);
    document.getElementById('calHistoryStartModal').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveCalHistoryStartModal();
    });

    if (!state.events.length && !state.shiftStartedAt && !calls.length) {
      state.events.push({ ts: new Date().toISOString(), type: 'system', title: translateText('Listo para empezar'), detail: translateText('Inicia el shift para comenzar'), meta: 'idle' });
      saveStateOnly();
    }
    if (!state.activeDayKey) {
      state.activeDayKey = defaultActiveDayKey();
      saveStateOnly();
    }
    resetActiveDayIfStale();
    syncShiftModalFields();
    // Higher Rate ya no es un modal que se sincroniza al abrirlo (ver higherRateMiniBtn, eliminado)
    syncHigherRateModalFields();
    // "Avisos" pasó de popup a sección siempre presente en su propia página del sidebar.
    syncNotificationsModalFields();
    applyAccordionState();
    wireAccordionPersistence();
    wireActionButtonPress();
    initSidebarNav();
    initHelpPage();
    // Toggle "Contraer bloques al terminar".
    const collapseCompletedBlocksBtn = document.getElementById('collapseCompletedBlocksBtn');
    if (collapseCompletedBlocksBtn) collapseCompletedBlocksBtn.addEventListener('click', toggleCollapseCompletedBlocks);
    syncCollapseCompletedBlocksUI();

    // El enfoque anterior (agregar la clase `.is-pressed` y dejar que la transición CSS de siempre
    // la anime) puede chocar con la propia.
    function playActionPressAnimation(btn) {
      const ripple = btn.querySelector('.action-ripple');
      const ring = btn.querySelector('.action-ring');
      const icon = btn.querySelector('.action-icon');
      const label = btn.querySelector('.action-label');
      const sub = btn.querySelector('.action-sub');
      if (!ripple || !ring || !icon || !label || typeof ripple.animate !== 'function') {
        // Respaldo sin Web Animations API — mismo mecanismo que la versión anterior (clase +
        // transición CSS ya definida para.is-pressed).
        btn.classList.remove('is-pressed');
        void btn.offsetWidth;
        btn.classList.add('is-pressed');
        setTimeout(() => btn.classList.remove('is-pressed'), 550);
        return;
      }

      // Tap repetido antes de que termine el ciclo anterior: se cancelan las animaciones en curso
      // sobre estos mismos elementos para que la nueva arranque limpia, sin pelear con la que quedó
      // a medias.
      [ripple, ring, icon, label, sub].forEach(el => {
        if (el && el.getAnimations) el.getAnimations().forEach(a => a.cancel());
      });

      const accentRgb = getComputedStyle(btn).getPropertyValue('--accent-rgb').trim() || '47, 213, 255';
      const DURATION = 620;

      // El relleno tipo onda: crece, se sostiene un instante, se retrae.
      ripple.animate([
        { transform: 'scale(0)', opacity: 0, offset: 0 },
        { transform: 'scale(1)', opacity: 1, offset: .5 },
        { transform: 'scale(1)', opacity: 1, offset: .78 },
        { transform: 'scale(0)', opacity: 0, offset: 1 },
      ], { duration: DURATION, easing: 'cubic-bezier(.22,.85,.4,1)' });

      ring.animate([
        { opacity: 0, transform: 'scale(.82)', borderColor: `rgba(${accentRgb}, 0)`, offset: 0 },
        { opacity: 1, transform: 'scale(1)', borderColor: `rgba(${accentRgb}, .6)`, offset: .32 },
        { opacity: 0, transform: 'scale(1.4)', borderColor: `rgba(${accentRgb}, 0)`, offset: .85 },
        { opacity: 0, transform: 'scale(1.4)', borderColor: `rgba(${accentRgb}, 0)`, offset: 1 },
      ], { duration: DURATION, easing: 'ease-out' });

      icon.animate([
        { transform: 'scale(1) translateY(0)', offset: 0 },
        { transform: 'scale(1.12) translateY(-1px)', offset: .45 },
        { transform: 'scale(1) translateY(0)', offset: 1 },
      ], { duration: DURATION, easing: 'ease-out' });

      // El texto (label + sub) se invierte a oscuro mientras el relleno está encima, y vuelve a su
      // color de acento normal al terminar.
      [label, sub].forEach(el => {
        if (!el) return;
        const baseColor = getComputedStyle(el).color;
        el.animate([
          { color: baseColor, offset: 0 },
          { color: '#07101f', offset: .5 },
          { color: baseColor, offset: 1 },
        ], { duration: DURATION, easing: 'ease-out' });
      });
    }

    function wireActionButtonPress() {
      document.addEventListener('pointerdown', (e) => {
        const btn = e.target instanceof Element ? e.target.closest('.action-btn') : null;
        if (!btn || btn.disabled) return;
        playActionPressAnimation(btn);
      });
    }

    // Popup de bienvenida: solo la primerísima vez que se abre la app en este navegador
    // (settings.onboarded sigue en false porque nunca hubo ni SETTINGS_KEY ni STORAGE_KEY guardados
    // — ver loadSettings).
    if (!settings.onboarded) {
      const onboardingNameInput = document.getElementById('onboardingNameInput');
      const onboardingEmojiInput = document.getElementById('onboardingEmojiInput');
      const initialEmoji = settings.userEmoji || DEFAULT_USER_EMOJI;
      if (onboardingNameInput) onboardingNameInput.value = '';
      if (onboardingEmojiInput) onboardingEmojiInput.value = initialEmoji;
      renderEmojiPicker('emojiPickerOnboarding', initialEmoji);
      const onboardingEmojiPreviewInit = document.getElementById('onboardingEmojiPreview');
      if (onboardingEmojiPreviewInit) onboardingEmojiPreviewInit.textContent = initialEmoji;
      openModal('onboardingModal');
    }

    initGame();
    wireAchievementHelp();

    setInterval(() => {
      // Si cambió el día de calendario real, checkDayRollover ya hace un render completo (incluye
      // renderHeader), así que nos ahorramos la llamada duplicada a renderHeader en ese mismo tick.
      if (checkDayRollover()) return;
      renderHeader();
      // renderSchedule también corre en cada tick: "Adherencia del bloque" y el indicador en vivo
      // se actualizan solos.
      renderSchedule();
      renderDayStatsCards();
      updateLiveActivityBar();
      updateCallsStatusCard();
      checkShiftAlarm();
      checkBreakStartAlarm();
      checkBreakEndAlarm();
      checkProductiveBreakEarnedAlarm();
      // Cuenta regresiva en vivo de "Estás en una ventana ahora" — se repinta cada segundo, ya que
      // ahora vive tanto en el modal como en "Ganancias de hoy" (siempre visible en Inicio).
      renderHigherRateLiveCard();
      refreshHigherRateWindowsIfNeeded();
      renderGameLive();
      checkReinforcementInactivity();
    }, 1000);
    render();
    restorePendingLiveCallBackup();

// boot.js (injectAccountPanel/injectDeleteAccount/injectCycleProjection) sigue leyendo estas
// funciones desde window: como <script> clásico las heredaba gratis (top-level = global), como
// módulo hay que exponerlas a mano — un módulo nunca cuelga sus declaraciones de window.
window.toast = toast;
window.flushLocalChanges = persistFullSnapshot;
window.appConfirm = appConfirm;
window.iconHtml = iconHtml;
window.money = money;
window.convertedAmountText = convertedAmountText;
window.financeConvertedInline = financeConvertedInline;
window.effectiveCycleGoal = effectiveCycleGoal;
window.cycleGoalPace = cycleGoalPace;
window.reportsCycleProjection = reportsCycleProjection;

export const applyPropioBridgeEvent = createPropioReceiver({
  canReceive: () => localStorageRevision.isCurrent(),
  getState: () => state,
  getCalls: () => calls,
  startSession: event => startShift({ at: event.at, propio: true }),
  endSession: event => endShift({ at: event.at, propio: true }),
  start: event => startCall({ startedAt: event.at, propioBridge: { callId: event.callId, payEstimated: true, timingEstimated: true } }),
  end: event => withSilentCallFeedback(() => endCall({ endedAt: event.at })),
  catchUp: event => withSilentCallFeedback(() => {
    const context = { propioBridge: { callId: event.callId, payEstimated: true, timingEstimated: true } };
    const result = autoSaveLiveCall(event.startedAt, event.at, context);
    if (result && (!state.lastCallEndedAt || Date.parse(state.lastCallEndedAt) < Date.parse(event.at))) state.lastCallEndedAt = event.at;
    return result;
  }),
  importHistory: records => withSilentCallFeedback(() => importCalls(portalRecordsText(records))),
  endScheduledPause: () => endPause({ endedAt: new Date().toISOString(), silent: true }),
  save: saveAll,
});

export function getWorkSessionStatus() {
  if (!localStorageRevision.isCurrent() || !state.shiftStartedAt) return null;
  const connection = new Date(state.shiftStartedAt), end = new Date(state.shiftEndedAt || Date.now());
  if (!Number.isFinite(connection.getTime()) || !Number.isFinite(end.getTime())) return null;
  const start = workStartForConnection(connection, end);
  const manual = dayEvents(todayCallDateKey(connection)).some(event => event.type === 'shift' && /iniciado/i.test(event.title || '') &&
    Date.parse(event.ts) === connection.getTime() && String(event.meta || '').toLowerCase() === 'manual');
  const callAtStart = [...calls, ...(state.activeCall ? [state.activeCall] : [])].some(call => {
    const from = Date.parse(call.startISO || call.startedAt), to = Date.parse(call.endISO || end.toISOString());
    return Number.isFinite(from) && Number.isFinite(to) && from <= end.getTime() && to > connection.getTime() &&
      (to > from || call === state.activeCall) && Math.max(connection.getTime(), from) === start.getTime();
  });
  return { startedAt: start.toISOString(), endedAt: state.shiftEndedAt || null, manual, callAtStart };
}

export function getPropioBridgePlan() {
  if (!localStorageRevision.isCurrent()) return null;
  const day = new Date(), accountingDay = state.shiftStartedAt && !state.shiftEndedAt ? todayCallDateKey(new Date(state.shiftStartedAt)) : todayCallDateKey(day);
  const planned = getShiftWindow(accountingDay), forced = getDayNote(accountingDay)?.forcedStatus;
  if (forced === 'off' || (planned.off && forced !== 'work')) return null;
  const base = callDateToDate(accountingDay) || day, start = dateAtTime(base, planned.start), end = dateAtTime(base, planned.end);
  if (end <= start) end.setDate(end.getDate() + 1);
  const activeStart = state.shiftStartedAt && !state.shiftEndedAt ? Date.parse(state.shiftStartedAt) : NaN;
  const effectiveStart = settings.lateArrivalMode === 'shift' ? dayShiftBounds(accountingDay).start?.getTime() : NaN;
  if (Number.isFinite(effectiveStart) && effectiveStart > start.getTime()) {
    const delay = Math.floor((effectiveStart - start.getTime()) / 60000) * 60000;
    start.setTime(start.getTime() + delay); end.setTime(end.getTime() + delay);
  }
  const since = Number.isFinite(activeStart) && activeStart < end.getTime() ? Math.min(activeStart, start.getTime()) : start.getTime();
  const pauseDuration = state.activePause ? referenceDurationMinForActivePause(currentShiftAccountingDayKey(day)) : null;
  const lastPause = state.pauseHistory.filter(pause => Date.parse(pause.endedAt) >= since && Date.parse(pause.endedAt) <= day.getTime())
    .sort((a, b) => Date.parse(b.endedAt) - Date.parse(a.endedAt))[0];
  const scheduledPauses = reinforcementScheduleIntervals(accountingDay).filter(slot => ['break','lunch'].includes(String(slot.type).toLowerCase()))
    .map(slot => ({ type: String(slot.type).toLowerCase(), startedAt: Math.max(start.getTime(), Date.parse(slot.startedAt)), endedAt: Math.min(end.getTime(), Date.parse(slot.endedAt)) }))
    .filter(slot => slot.startedAt < slot.endedAt)
    .map(slot => ({ type: slot.type, startedAt: new Date(slot.startedAt).toISOString(), endedAt: new Date(slot.endedAt).toISOString() }));
  const acwStart = computeCurrentAcwStart();
  return { startAt: start.toISOString(), endAt: end.toISOString(),
    scheduledPauses,
    acw: acwStart ? { startedAt: acwStart.toISOString(), observedAt: day.toISOString() } : null,
    lastCallEndedAt: [state.lastCallEndedAt, ...calls.map(call => call.endISO)]
      .filter(value => Date.parse(value) >= since && Date.parse(value) <= Math.min(day.getTime(), end.getTime()))
      .sort((a, b) => Date.parse(b) - Date.parse(a))[0] || null,
    hasCall: Boolean(state.activeCall) || calls.some(call => Date.parse(call.startISO) >= since && Date.parse(call.startISO) < end.getTime()),
    ended: Boolean(state.shiftEndedAt && Date.parse(state.shiftEndedAt) >= start.getTime()),
    pause: state.activePause ? { type: state.activePause.type, startedAt: state.activePause.startedAt,
      endsAt: Number.isFinite(pauseDuration) && pauseDuration > 0 ? new Date(Date.parse(state.activePause.startedAt) + pauseDuration * 60000).toISOString() : null } : null,
    lastPause: lastPause ? { type: lastPause.type, startedAt: lastPause.startedAt, endedAt: lastPause.endedAt } : null };
}
