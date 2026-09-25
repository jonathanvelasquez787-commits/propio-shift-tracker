// Cuerpo principal de la app (Inicio, Horario, Llamadas, Higher Rate, Finanzas, Reportes,
// Calendario, Ajustes...). Vive como módulo ES aparte para no ser parte del documento HTML: lo
// carga js/boot.js con un import() dinámico recién cuando la sesión y los datos están listos
// (ver el comentario de mountApp() en boot.js) — nunca antes.

import {
  FINANCE_CATEGORIES,
  FINANCE_CUSTOM_CATEGORY_PALETTE,
  financeRowIsMeta,
  renderFinanceSection,
  renderFinancePreview,
  setFinanceTab,
  syncFinanceRowTargetFields,
  financeConvertedInline,
  financeConvertedNote,
  financeSwapPriority,
  financeFindRow,
  financeApplySignedAmount,
  financeResetRow,
  financeToggleManualPaid,
  financeDeleteRow,
  openFinanceRowModal,
  saveFinanceRowModal,
  selectFinanceCategoryChip,
  openFinanceNewCatPanel,
  closeFinanceNewCatPanel,
  createFinanceCategory,
  financeDeleteCategory,
  updateFinanceAutoFillSetting,
  updateFinanceTotalsScrollHint,
  financeRunAutoFillCascade,
} from './finance.js';

import {
  REPORTS_MONTHLY_PAGE_SIZE,
  cycleGoalPace,
  renderReportsDashboard,
  renderReportsMonthlyChart,
  reportsCycleProjection,
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
} from './calendar.js';

// js/reports.js necesita effectiveHistoryStartDate() (ver su import desde './app-main.js'), pero
// esa función vive en js/calendar.js — este archivo solo la importaba para uso propio, nunca la
// reexportaba. Sin esta línea, el import de reports.js falla con "The requested module
// './app-main.js' does not provide an export named 'effectiveHistoryStartDate'", lo cual rompe la
// cadena de módulos completa (boot.js atrapa ese error en silencio, así que la app se queda muda:
// sin errores en consola, sin nada interactivo).
export { effectiveHistoryStartDate } from './calendar.js';

// reports.js necesita financeConvertedInline/financeConvertedNote (ver su import desde
// './app-main.js') para los montos convertidos de "Ganancias del ciclo", pero esas dos funciones
// viven en js/finance.js — este archivo solo las importaba para su propio uso, nunca las
// reexportaba. Mismo patrón exacto que el bug de effectiveHistoryStartDate de arriba: sin esto el
// import de reports.js falla con "does not provide an export named 'financeConvertedInline'", lo
// que rompe la cadena de módulos completa.
export { financeConvertedInline, financeConvertedNote };

    const STORAGE_KEY = 'propio_shift_tracker_state_es_v4';
    const CALLS_KEY = 'propio_shift_tracker_calls_es_v4';
    const SETTINGS_KEY = 'propio_shift_tracker_settings_es_v1';
    export const RATE = 0.12;
    const ICON = {
      menu: '<line x1=\"3\" y1=\"6\" x2=\"21\" y2=\"6\"/><line x1=\"3\" y1=\"12\" x2=\"21\" y2=\"12\"/><line x1=\"3\" y1=\"18\" x2=\"21\" y2=\"18\"/>',
      close: '<line x1=\"18\" y1=\"6\" x2=\"6\" y2=\"18\"/><line x1=\"6\" y1=\"6\" x2=\"18\" y2=\"18\"/>',
      pin: '<circle cx=\"12\" cy=\"9\" r=\"4\"/><line x1=\"12\" y1=\"13\" x2=\"12\" y2=\"21\"/>',
      bell: '<path d=\"M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6\"/><path d=\"M10 20a2 2 0 0 0 4 0\"/>',
      flame: '<path d=\"M12 2c2 3-1 4-1 7a3 3 0 1 0 6 0c0-1-.5-2-.5-2 2 1 3 3.5 3 6a7 7 0 1 1-14 0c0-4 2-6 3.5-8 .5 2 1 2.5 3-3Z\"/>',
      settings: '<circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z\"/>',
      reset: '<path d=\"M21 12a9 9 0 1 1-3-6.7\"/><polyline points=\"21 3 21 9 15 9\"/>',
      coffee: '<path d=\"M17 8h1a4 4 0 1 1 0 8h-1\"/><path d=\"M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z\"/><line x1=\"6\" y1=\"2\" x2=\"6\" y2=\"4\"/><line x1=\"10\" y1=\"2\" x2=\"10\" y2=\"4\"/><line x1=\"14\" y1=\"2\" x2=\"14\" y2=\"4\"/>',
      utensils: '<path d=\"M7 2v6a2 2 0 0 0 4 0V2\"/><path d=\"M9 8v14\"/><path d=\"M17 2c-1.5 0-3 1.5-3 4s1.5 4 3 5v11\"/>',
      briefcase: '<rect x=\"2\" y=\"7\" width=\"20\" height=\"14\" rx=\"2\"/><path d=\"M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2\"/><line x1=\"2\" y1=\"12\" x2=\"22\" y2=\"12\"/>',
      phone: '<path d=\"M15.05 5A5 5 0 0 1 19 8.95M15.05 1A9 9 0 0 1 23 8.94m-1 7.98v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.68 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.32 1.85.55 2.81.68A2 2 0 0 1 22 16.92Z\"/>',
      clipboard: '<rect x=\"8\" y=\"2\" width=\"8\" height=\"4\" rx=\"1\"/><path d=\"M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3\"/><line x1=\"9\" y1=\"12\" x2=\"15\" y2=\"12\"/><line x1=\"9\" y1=\"16\" x2=\"15\" y2=\"16\"/>',
      plus: '<line x1=\"12\" y1=\"5\" x2=\"12\" y2=\"19\"/><line x1=\"5\" y1=\"12\" x2=\"19\" y2=\"12\"/>',
      home: '<path d=\"M3 10.5 12 3l9 7.5\"/><path d=\"M5 9.5V21h14V9.5\"/>',
      calendar: '<rect x=\"3\" y=\"4\" width=\"18\" height=\"18\" rx=\"2\"/><line x1=\"16\" y1=\"2\" x2=\"16\" y2=\"6\"/><line x1=\"8\" y1=\"2\" x2=\"8\" y2=\"6\"/><line x1=\"3\" y1=\"10\" x2=\"21\" y2=\"10\"/>',
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
      lock: '<rect x=\"4\" y=\"11\" width=\"16\" height=\"10\" rx=\"2\"/><path d=\"M8 11V7a4 4 0 0 1 8 0v4\"/>',
      eye: '<path d=\"M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>',
      repeat: '<path d=\"M17 2 21 6 17 10\"/><path d=\"M3 12v-2a4 4 0 0 1 4-4h14\"/><path d=\"M7 22 3 18 7 14\"/><path d=\"M21 12v2a4 4 0 0 1-4 4H3\"/>',
      trash: '<line x1=\"4\" y1=\"7\" x2=\"20\" y2=\"7\"/><path d=\"M6 7V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v3\"/><path d=\"M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13\"/><line x1=\"10\" y1=\"11\" x2=\"10\" y2=\"17\"/><line x1=\"14\" y1=\"11\" x2=\"14\" y2=\"17\"/>',
      history: '<rect x=\"3\" y=\"4\" width=\"18\" height=\"4\" rx=\"1\"/><path d=\"M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8\"/><line x1=\"10\" y1=\"13\" x2=\"14\" y2=\"13\"/>',
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
      car: '<path d=\"M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11\"/><rect x=\"3\" y=\"11\" width=\"18\" height=\"6\" rx=\"2\"/><circle cx=\"7.5\" cy=\"17.5\" r=\"1.5\"/><circle cx=\"16.5\" cy=\"17.5\" r=\"1.5\"/>',
      creditCard: '<rect x=\"2\" y=\"5\" width=\"20\" height=\"14\" rx=\"2\"/><line x1=\"2\" y1=\"10\" x2=\"22\" y2=\"10\"/>',
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
      return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`;
    }
    // Emoji que acompaña el nombre en el saludo (ver greetingText). Es el valor con el que se
    // prellena el campo del popup de bienvenida y el fallback si settings.userEmoji queda
    // vacío/inválido.
    const DEFAULT_USER_EMOJI = '🙂';
    // Lista corta de emojis para el selector visual (ver renderEmojiPicker). El primero ('') es la
    // opción "Sin emoji" — un botón de limpiar, no un emoji real, para poder quitar el emoji sin
    // tener que vaciar el campo de texto a mano.
    const EMOJI_CHOICES = ['', '🙂', '😄', '😎', '🤩', '🥳', '😴', '☕', '🔥', '💪', '🚀', '⭐', '🎯', '⚡', '🌟', '🙌', '👋', '🐱', '🌮', '🎧'];
    const DEFAULT_GOAL_MINUTES = 420;
    const DEFAULT_GOAL_DOLLARS = Number((DEFAULT_GOAL_MINUTES * RATE).toFixed(2));
    // Tope duro de duración para una sola llamada (pegada, editada o agregada a mano) — sin esto,
    // un valor como "1e10" o negativo pasa el chequeo de Number.isFinite y genera un endISO absurdo
    // (años en el futuro/pasado) que rompe callsOverlap para el resto de llamadas.
    const MAX_CALL_DURATION_MIN = 1440;

    // Higher Rate Opportunity ---- Propio manda avisos por correo con una fecha y una o más
    // ventanas horarias donde aplica un bono sobre la tasa por minuto.
    const HIGHER_RATE_TIERS = {
      bronze: { label: 'Bronce', bonusPerMin: 0.01, colorVar: '--tier-bronze', colorRgb: '181,101,29' },
      silver: { label: 'Silver', bonusPerMin: 0.02, colorVar: '--tier-silver', colorRgb: '167,177,187' },
      gold: { label: 'Gold', bonusPerMin: 0.03, colorVar: '--tier-gold', colorRgb: '234,179,8' },
    };
    // Una llamada iniciada hasta 5 min antes de que empiece la ventana también cuenta.
    const HIGHER_RATE_EARLY_GRACE_MIN = 5;

    // Página "Finanzas" ---- Categorías fijas, mismo patrón que HIGHER_RATE_TIERS — no viven en
    // settings, solo sus filas (ver settings.financeCategories).
    const RATE_TILE_DEFS = [
      { key: 'normal', label: 'Normal', icon: iconHtml('circle'), bonus: 0 },
      { key: 'bronze', label: 'Bronce', icon: iconHtml('medal'), bonus: HIGHER_RATE_TIERS.bronze.bonusPerMin },
      { key: 'silver', label: 'Silver', icon: iconHtml('medal'), bonus: HIGHER_RATE_TIERS.silver.bonusPerMin },
      { key: 'gold', label: 'Gold', icon: iconHtml('medal'), bonus: HIGHER_RATE_TIERS.gold.bonusPerMin },
    ];

    // $/min de un tile: tasa base de settings.rate + el bono fijo del nivel.
    function rateTilePerMin(tileKey) {
      const baseRate = Number(settings.rate) > 0 ? Number(settings.rate) : RATE;
      const def = RATE_TILE_DEFS.find(t => t.key === tileKey);
      return baseRate + (def ? def.bonus : 0);
    }

    // Pinta los 4 tiles dentro de `containerId`, marcando `selectedKey` como activo. Se recalculan
    // los montos en cada llamada (no se cachean) para reflejar siempre la tasa base actual de
    // settings.rate.
    function renderRateTiles(containerId, selectedKey) {
      const el = document.getElementById(containerId);
      if (!el) return;
      el.innerHTML = RATE_TILE_DEFS.map(t => {
        const rate = rateTilePerMin(t.key);
        return `
          <button type="button" class="rate-tile ${t.key === selectedKey ? 'selected' : ''}" data-rate-tile="${t.key}">
            <span class="rate-tile-top"><span class="rate-tile-icon" data-tier="${t.key}">${t.icon}</span><span class="rate-tile-amount">$${rate.toFixed(2)}/min</span></span>
            <span class="rate-tile-label">${t.label}</span>
          </button>
        `;
      }).join('');
    }

    // Horario semanal (plantilla planeada, editable por día)
    const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const WEEKDAY_JS_INDEX = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
    const WEEKDAY_LABELS = { mon: 'Lunes', tue: 'Martes', wed: 'Miércoles', thu: 'Jueves', fri: 'Viernes', sat: 'Sábado', sun: 'Domingo' };
    const WEEKDAY_LABELS_SHORT = { mon: 'Lun', tue: 'Mar', wed: 'Mié', thu: 'Jue', fri: 'Vie', sat: 'Sáb', sun: 'Dom' };

    // Todo vive en `blocks[]`: cada bloque es {type, start, dur} y Trabajo lleva además goalMin.
    function defaultDaySchedule(isWorkDay) {
      return {
        off: !isWorkDay,
        start: '07:00',
        end: '15:00',
        blocks: [
          { type: 'work', start: '07:00', dur: 130, goalMin: 120 },
          { type: 'break', start: '09:10', dur: 20 },
          { type: 'work', start: '09:30', dur: 130, goalMin: 120 },
          { type: 'break', start: '11:40', dur: 20 },
          { type: 'work', start: '12:00', dur: 60, goalMin: 60 },
          { type: 'lunch', start: '13:00', dur: 55 },
          { type: 'work', start: '13:55', dur: 65, goalMin: 60 },
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

    function ensureWeeklySchedule() {
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

    function weekdayKeyForDayKey(dayKey) {
      const d = callDateToDate(dayKey) || new Date();
      const idx = d.getDay();
      return Object.keys(WEEKDAY_JS_INDEX).find(k => WEEKDAY_JS_INDEX[k] === idx) || 'mon';
    }

    // Overrides puntuales por semana, anclados al mismo inicio de semana de 7 días que usa "Resumen
    // semanal" (startOfCycleWeek).
    function weekStartKeyFromDate(date) {
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
    function isScheduleWeekPast(weekStartDate) {
      const weekEnd = new Date(weekStartDate.getFullYear(), weekStartDate.getMonth(), weekStartDate.getDate() + 6);
      return weekEnd < todayRange();
    }

    export function dayConfigFor(dayKey) {
      ensureWeeklySchedule();
      const wd = weekdayKeyForDayKey(dayKey);
      const weekKey = weekStartKeyForDayKey(dayKey);
      const overrideWeek = settings.scheduleOverridesByWeek && settings.scheduleOverridesByWeek[weekKey];
      // Una semana personalizada (ver "📅 Semana específica" en Horario) gana sobre la plantilla
      // recurrente para los días que trae.
      if (overrideWeek && overrideWeek[wd]) return overrideWeek[wd];
      return settings.weeklySchedule[wd] || { off: true };
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
      points.sort((a, b) => toMinutes(a.start) - toMinutes(b.start));

      let breakIdx = 1, lunchIdx = 1, workIdx = 1;
      const toHHMM = (mins) => { const m = ((mins % 1440) + 1440) % 1440; return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; };

      return points.map(p => {
        const pStart = toMinutes(p.start);
        let type, name;
        if (p.rawType === 'break') { type = 'Break'; name = `Break ${breakIdx++}`; }
        else if (p.rawType === 'lunch') { type = 'Lunch'; name = `Lunch ${lunchIdx++}`; }
        else { type = 'Work'; name = `Bloque de Trabajo ${workIdx++}`; }
        const slot = { type, name, start: toHHMM(pStart), end: toHHMM(pStart + p.dur) };
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
      };
    }

    let state = loadState();
    export let calls = loadCalls();
    export let settings = loadSettings();
    ensureCurrencySettings();
    applyTheme();
    let syncingGoals = false;
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
        activeDayKey: src.activeDayKey ? String(src.activeDayKey) : null,
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
        shiftStart: '07:00',
        shiftEnd: '16:00',
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
    function ensureCurrencySettings() {
      const fallback = defaultSettings();
      if (!Number.isFinite(Number(settings.rate)) || Number(settings.rate) <= 0) settings.rate = fallback.rate;
      if (!Number.isFinite(Number(settings.exchangeRate)) || Number(settings.exchangeRate) < 0) settings.exchangeRate = fallback.exchangeRate;
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
          toast(`⚠️ ${discardedWeekCount} semana(s) personalizada(s) de Horario con datos inválidos se descartaron al cargar.`);
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
          toast(`⚠️ ${discardedWindowCount} ventana(s) de Higher Rate con datos inválidos se descartaron al cargar.`);
        }
      }
      // Categorías propias del usuario (ver PENDIENTES) — se descarta cualquier entrada mal
      // formada, mismo criterio defensivo que el resto de esta función.
      if (!Array.isArray(settings.customFinanceCategories)) settings.customFinanceCategories = [];
      settings.customFinanceCategories = settings.customFinanceCategories.filter(c =>
        c && typeof c === 'object' && String(c.id || '').trim() && String(c.label || '').trim()
      );
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
      const allFinCategoryIds = Object.keys(FINANCE_CATEGORIES).concat(settings.customFinanceCategories.map(c => c.id));
      allFinCategoryIds.forEach((catId) => {
        const cat = settings.financeCategories[catId];
        if (!cat || typeof cat !== 'object' || Array.isArray(cat) || !Array.isArray(cat.rows)) {
          settings.financeCategories[catId] = { rows: [] };
          return;
        }
        cat.rows = cat.rows.filter(r => r && typeof r === 'object' && String(r.id || '').trim() && String(r.name || '').trim() && Number.isFinite(Number(r.targetAmount)) && Number(r.targetAmount) >= 0);
      });
      if (typeof settings.financeAutoFill !== 'boolean') settings.financeAutoFill = false;
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
      updateThemeButtonUI();
    }

    // Ciclo simple de 3 estados para el botón del header: auto -> light -> dark -> auto ->...
    function cycleTheme(current) {
      if (current === 'auto') return 'light';
      if (current === 'light') return 'dark';
      return 'auto';
    }

    function themeButtonLabel(theme) {
      if (theme === 'light') return '☀️ Claro';
      if (theme === 'dark') return '🌙 Oscuro';
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
      saveSettingsOnly();
      applyTheme();
      toast(`Tema: ${themeButtonLabel(settings.theme)}`);
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
    function currencyCeilFromUsdAmount(usdAmount, exchangeRate) {
      if (!Number.isFinite(usdAmount) || !Number.isFinite(exchangeRate) || exchangeRate <= 0) return 0;
      return Math.ceil(usdAmount * exchangeRate * 100) / 100;
    }

    export function convertedAmountText(usdAmount) {
      const rate = Number(settings.exchangeRate);
      const label = String(settings.currencyLabel || '').trim();
      if (!Number.isFinite(rate) || rate <= 0 || !label) return '';
      const converted = (Number.isFinite(usdAmount) ? usdAmount : 0) * rate;
      // Redondeado a unidades enteras: el monto real vive en dólares, y convertirlo de vuelta con 2
      // decimales expone un desfase de centavos que confunde sin aportar nada.
      return `≈ ${label} ${Math.round(converted)}`;
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
    function cycleBoundsForOffset(offset = cycleViewOffset) {
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
        localStorage.setItem(key, jsonValue);
        return true;
      } catch {
        return false;
      }
    }

    const STORAGE_QUOTA_TOAST = '⚠️ No se pudo guardar — el almacenamiento del navegador está lleno. Tu cambio se mantiene en esta sesión, pero no quedará guardado hasta que liberes espacio (borra llamadas muy viejas o un sonido personalizado en Avisos).';

    function saveAll() {
      const stateOk = safeLocalStorageSet(STORAGE_KEY, JSON.stringify(state));
      const callsOk = safeLocalStorageSet(CALLS_KEY, JSON.stringify(calls));
      const settingsOk = safeLocalStorageSet(SETTINGS_KEY, JSON.stringify(settings));
      if (!stateOk || !callsOk || !settingsOk) toast(STORAGE_QUOTA_TOAST);
      render();
    }

    function saveStateOnly() {
      if (!safeLocalStorageSet(STORAGE_KEY, JSON.stringify(state))) toast(STORAGE_QUOTA_TOAST);
    }

    export function saveSettingsOnly() {
      if (!safeLocalStorageSet(SETTINGS_KEY, JSON.stringify(settings))) toast(STORAGE_QUOTA_TOAST);
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

    function callQualifiesForHigherRateWindow(callStartISO, window) {
      const callStart = new Date(callStartISO);
      const winStart = toDateFromInputs(window.date, timeLabel(window.start));
      const winEnd = toDateFromInputs(window.date, timeLabel(window.end));
      if (!winStart || !winEnd || winEnd.getTime() <= winStart.getTime()) return false;
      const graceStart = new Date(winStart.getTime() - HIGHER_RATE_EARLY_GRACE_MIN * 60000);
      return callStart.getTime() >= graceStart.getTime() && callStart.getTime() < winEnd.getTime();
    }

    // Bono de UNA llamada, null si no califica. Solo se comparan ventanas de la MISMA fecha; si
    // califica más de una, gana la de mayor bono por minuto.
    function higherRateBonusForCall(call) {
      // Bono ya congelado (ver freezeHigherRateBonusesForWindowIds): la ventana que lo generó ya no
      // existe, pero el nivel que calificó se conserva.
      if (call.frozenHigherRateBonus) {
        const frozenTierMeta = HIGHER_RATE_TIERS[call.frozenHigherRateBonus.tier];
        if (!frozenTierMeta) return call.frozenHigherRateBonus;
        return {
          amount: frozenTierMeta.bonusPerMin * (Number(call.durationMin) || 0),
          tier: call.frozenHigherRateBonus.tier,
          windowId: call.frozenHigherRateBonus.windowId,
        };
      }
      const windows = (settings.higherRateWindows || []).filter(w => w.date === call.callDate);
      if (!windows.length) return null;
      const qualifying = windows.filter(w => callQualifiesForHigherRateWindow(call.startISO, w));
      if (!qualifying.length) return null;
      const best = qualifying.reduce((a, b) =>
        (HIGHER_RATE_TIERS[b.tier]?.bonusPerMin || 0) > (HIGHER_RATE_TIERS[a.tier]?.bonusPerMin || 0) ? b : a
      );
      const tierMeta = HIGHER_RATE_TIERS[best.tier];
      if (!tierMeta) return null;
      return { amount: tierMeta.bonusPerMin * (Number(call.durationMin) || 0), tier: best.tier, windowId: best.id };
    }

    // Suma de bonos de un conjunto de llamadas (día, ciclo, etc.) — se reutiliza tanto en
    // importedCallStats como en cycleEarningsForBounds (ciclo de pago completo).
    export function higherRateBonusForCalls(sourceCalls) {
      return sourceCalls.reduce((sum, c) => {
        const bonus = higherRateBonusForCall(c);
        return sum + (bonus ? bonus.amount : 0);
      }, 0);
    }

    // Desglose por nivel: un día puede tener llamadas de más de un nivel a la vez.
    function higherRateBonusBreakdownForCalls(sourceCalls) {
      const breakdown = {};
      sourceCalls.forEach(c => {
        const bonus = higherRateBonusForCall(c);
        if (!bonus) return;
        breakdown[bonus.tier] = (breakdown[bonus.tier] || 0) + bonus.amount;
      });
      return breakdown;
    }

    // Badge de UNA llamada (Tabla de llamadas, columna Pay / tarjeta mobile)
    function higherRateTierBadgeHtml(tier, amount) {
      const meta = HIGHER_RATE_TIERS[tier];
      const colorVar = meta?.colorVar || '--warn';
      const rgb = meta?.colorRgb || '255,209,92';
      const label = meta?.label || tier;
      return `<span class="imported-late" style="background: rgba(${rgb},.16); border-color: rgba(${rgb},.4); color: var(${colorVar});" title="Higher Rate Opportunity · ${escapeHtml(label)}">${iconHtml('flame')} ${escapeHtml(label)} +${money(amount)}${financeConvertedInline(amount)}</span>`;
    }

    // Versión compacta sin pill (solo texto coloreado) — para la línea de pago de la tarjeta
    // mobile, donde ya no cabe un badge completo al lado del monto principal.
    function higherRateTierInlineHtml(tier, amount) {
      const meta = HIGHER_RATE_TIERS[tier];
      const colorVar = meta?.colorVar || '--warn';
      const label = meta?.label || tier;
      return `<span style="color: var(${colorVar}); font-size:11px; font-weight:800;">${iconHtml('flame')} ${escapeHtml(label)} +${money(amount)}${financeConvertedInline(amount)}</span>`;
    }

    // Fila de tags agregados (uno por cada nivel presente ese día, ordenados de mayor a menor
    // bono/min)
    function higherRateBreakdownTagsHtml(breakdown, tagClass) {
      const entries = Object.entries(breakdown || {}).filter(([, amt]) => amt > 0);
      if (!entries.length) return '';
      entries.sort((a, b) => (HIGHER_RATE_TIERS[b[0]]?.bonusPerMin || 0) - (HIGHER_RATE_TIERS[a[0]]?.bonusPerMin || 0));
      return entries.map(([tier, amount]) => {
        const meta = HIGHER_RATE_TIERS[tier];
        const colorVar = meta?.colorVar || '--warn';
        const rgb = meta?.colorRgb || '255,209,92';
        const label = meta?.label || tier;
        return `<span class="${tagClass}" style="background: rgba(${rgb},.16); border-color: rgba(${rgb},.4); color: var(${colorVar});" title="Bono extra ganado por llamadas dentro de una ventana Higher Rate ${escapeHtml(label)}">${iconHtml('flame')} ${escapeHtml(label)}: +${money(amount)}${financeConvertedInline(amount)}</span>`;
      }).join('');
    }

    // Rediseño 100% visual de "Ganancias de hoy"/ "Ganancias del ciclo"
    function higherRateBonusChipsHtml(breakdown) {
      const entries = Object.entries(breakdown || {}).filter(([, amt]) => amt > 0);
      if (!entries.length) return '';
      entries.sort((a, b) => (HIGHER_RATE_TIERS[b[0]]?.bonusPerMin || 0) - (HIGHER_RATE_TIERS[a[0]]?.bonusPerMin || 0));
      return entries.map(([tier, amount]) => {
        const meta = HIGHER_RATE_TIERS[tier];
        const colorVar = meta?.colorVar || '--warn';
        const rgb = meta?.colorRgb || '255,209,92';
        const label = meta?.label || tier;
        return `<div class="gh-bonus-chip" style="background: rgba(${rgb},.14); border-color: rgba(${rgb},.4); color: var(${colorVar});">${iconHtml('flame')} <span>${escapeHtml(label)}: +${money(amount)}${financeConvertedInline(amount)} de bono Higher Rate</span></div>`;
      }).join('');
    }

    function fmtDate(date) {
      return new Intl.DateTimeFormat('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(date);
    }

    function fmtTime(date) {
      return new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(date);
    }

    // Un saludo dinámico tipo "Buenos días/tardes/noches, {nombre}" en vez del "Buen día" fijo de
    // siempre — mismo criterio de franjas horarias que usa Claude (mañana antes de las 12, tarde
    // antes de las 19, noche después).
    function greetingText(date = new Date()) {
      const h = date.getHours();
      const base = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
      const name = String(settings.userName || '').trim();
      const emoji = String(settings.userEmoji || '').trim();
      // El emoji solo se muestra si también hay nombre — sin nombre no hay "Buenas tardes, {emoji}"
      // (se vería raro), se cae al saludo solo.
      if (!name) return base;
      return emoji ? `${base}, ${name} ${emoji}` : `${base}, ${name}`;
    }

    // "Cosas variadas más" — el subtítulo bajo el saludo ya no es un solo texto fijo, sino una de
    // varias frases elegida al azar una sola vez por carga de página (no en cada render, que corre
    // cada segundo — eso se vería parpadeando).
    const GREETING_SUBTITLES = [
      'Jornada, pausas, llamadas y ganancias en un solo lugar.',
      'Hoy también vamos con todo.',
      'Un día más, una meta más cerca.',
      'Aquí está todo lo que necesitas para tu turno.',
      'Vamos a que este día cuente.',
      'Tu jornada, organizada y clara.',
      'Un paso a la vez, un turno a la vez.',
      'Que las llamadas de hoy vengan con buena energía.',
      'Aunque nadie puede volver atrás y lograr un nuevo comienzo, cualquiera puede empezar ahora y lograr un nuevo final. — Carl Bard',
      'Un capítulo termina, otro comienza.',
      'Todo tiene un final, pero cada final significa un nuevo comienzo.',
      'El primer paso no te lleva a donde quieres ir, pero te saca de donde estás.',
      'Nunca es demasiado tarde para empezar de nuevo. No se está perdido, simplemente se está comenzando de nuevo desde la experiencia.',
      'Un viaje de mil millas comienza con un solo paso. — Lao Tse',
      'Si empiezas, tienes la oportunidad de evolucionar y corregir... Si no empiezas nada, nunca tendrás esa oportunidad. — Seth Godin',
      'El éxito se da cuando vas de fracaso en fracaso sin perder tu entusiasmo. — Winston Churchill',
      'No importa lo lento que vayas, siempre y cuando no te detengas. — Confucio',
    ];
    const greetingSubtitleText = GREETING_SUBTITLES[Math.floor(Math.random() * GREETING_SUBTITLES.length)];

    function toDateFromInputs(dateStr, timeStr) {
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
      if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 12 || minute > 59) return null;
      if (ampm === 'PM' && hour !== 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;
      const parsed = new Date(year, month - 1, day, hour, minute, 0, 0);
      if (parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null;
      return parsed;
    }

    function toMinutes(hhmm) {
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
      return 'Working';
    }

    // Indicador en vivo de cuánto tiempo llevas AHORA MISMO en "ACW/Available" (disponible, sin
    // llamada activa ni Break/ Lunch activo)
    function computeCurrentAcwStart() {
      const dayKey = todayCallDateKey();
      // Este chip exigía `state.shiftStartedAt` directo — solo se llenaba si de verdad diste click
      // en "Iniciar shift" (o usaste "Iniciar llamada", que lo auto-inicia).
      const bounds = dayShiftBounds(dayKey);
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

function callDateKeyFromValue(value) {
  const match = String(value ?? '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[1]}/${match[2]}/${match[3]}` : '';
}

export function callDateToDate(key) {
  return toDateFromInputs(callDateKeyFromValue(key), '12:00 AM');
}

// Conversión entre el formato interno de día (dayKey, "MM/DD/YYYY") y el formato que exige <input
// type="date"> ("YYYY-MM-DD").
function isoDateFromDayKey(dayKey) {
  const d = callDateToDate(dayKey);
  if (!d) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dayKeyFromIsoDate(isoValue) {
  const match = String(isoValue ?? '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  const [, y, m, d] = match;
  return `${m}/${d}/${y}`;
}

function sameCallDay(iso, key) {
  if (!iso || !key) return false;
  return dateKey(new Date(iso)) === callDateKeyFromValue(key);
}

function callImportFlag(c) {
  if (!c.importedAt) return null;
  if (sameCallDay(c.importedAt, c.callDate)) {
    const lagMin = (new Date(c.importedAt).getTime() - new Date(c.endISO).getTime()) / 60000;
    if (lagMin > 30) return { cls: 'imported-late', label: 'Importado tarde' };
    return null;
  }
  return { cls: 'imported-historic', label: 'Importación histórica' };
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

  const dayKey = todayCallDateKey();
  const planned = getEffectiveScheduleForDay(dayKey).filter(s => s.type === 'Break' || s.type === 'Lunch');
  const base = callDateToDate(dayKey) || new Date();
  const now = new Date();

  let candidate = null;
  for (const slot of planned) {
    if (pauseForSlot(slot, dayKey)) continue; // Ya tomado, no avisar.
    const slotStart = dateAtTime(base, slot.start);
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
      const pretty = candidate.slot.type === 'Lunch' ? 'Lunch' : 'Break';
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
      const pretty = state.activePause.type === 'lunch' ? 'Lunch' : 'Break';
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

function mergeIntervals(intervals = []) {
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

function gapLabelText(label) {
  const map = { acw: 'ACW', break: 'Break', lunch: 'Lunch', other: 'Otro' };
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
  const normalized = callDateKeyFromValue(dayKey);
  const bucket = ensureGapBucket(normalized);
  const current = bucket[gapKey] && typeof bucket[gapKey] === 'object' ? bucket[gapKey] : {};
  const next = { ...current, ...patch };
  if (!next.label) next.label = 'acw';
  if (!String(next.note || '').trim()) delete next.note;
  bucket[gapKey] = next;
  saveStateOnly();
  render();
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
  // El horario planeado (schedule) ya NO resta minutos del gap ni influye en la clasificación: solo
  // cuenta si realmente marcaste Break/Lunch con el botón.
  const residual = Math.max(0, raw - actualCovered);
  const suggested = suggestGapLabel(prevEnd, curStart, dayKey);
  const annotation = gapKey ? getGapAnnotation(dayKey, gapKey) : null;
  const label = annotation ? String(annotation.label || suggested).toLowerCase() : suggested;

  // "Posible pausa" solo tiene sentido cuando el hueco NO ha sido clasificado a mano (sin
  // anotación) Y la sugerencia automática detectó algo distinto de ACW plano (break/lunch por
  // overlap real, u "other" por ser muy largo).
  const isUnclassifiedPause = !annotation && suggested !== 'acw' && suggested !== 'break' && suggested !== 'lunch';

  const displayAmount = (label === 'break' || label === 'lunch') ? raw : residual;

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
  };
}

function dayGapRows(dayKey = getActiveDayKey(), sourceCalls = callsForDay(dayKey)) {
  const normalized = callDateKeyFromValue(dayKey);
  const sorted = [...sourceCalls].sort((a, b) => new Date(a.startISO) - new Date(b.startISO));
  const rows = [];

  // El lapso entre el click de "Iniciar shift" (o el turno estimado, ver dayShiftBounds) y el
  // inicio de tu PRIMERA llamada del día nunca se contaba como ACW en ningún lado.
  if (sorted.length) {
    const shiftStart = dayShiftSessions(normalized)[0]?.start;
    const firstCallStart = new Date(sorted[0].startISO);
    if (shiftStart && shiftStart.getTime() < firstCallStart.getTime()) {
      // EndISO = su propio startISO a propósito: es un evento puntual (el click/estimado de
      // "Iniciar shift"), sin duración propia.
      const virtualPrev = { customerId: 'shift-start', startISO: shiftStart.toISOString(), endISO: shiftStart.toISOString() };
      const gapKey = gapKeyFor(virtualPrev, sorted[0]);
      const info = gapClassification(shiftStart, firstCallStart, normalized, gapKey);
      if (info.raw > 0) {
        rows.push({ gapKey, prev: virtualPrev, cur: sorted[0], isShiftStartGap: true, ...info });
      }
    }
  }

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    const gapKey = gapKeyFor(prev, cur);
    const info = gapClassification(new Date(prev.endISO), new Date(cur.startISO), normalized, gapKey);
    if (info.raw > 0) {
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
    else if (gap.label === 'break') breakTotal += gap.displayAmount;
    else if (gap.label === 'lunch') lunchTotal += gap.displayAmount;
    else if (gap.label === 'other') otherTotal += gap.residual;
    if (!gap.manual && gap.suggested !== 'acw') possiblePauseTotal += gap.residual;
  }
  return { rawGapTotal, acwTotal, breakTotal, lunchTotal, otherTotal, possiblePauseTotal, gapLongest, gapCount: gaps.length };
}

export function formatCallDayLabel(key) {
  const d = callDateToDate(key);
  if (!d) return key || '—';
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

function earningsSectionLabel(dayKey = getActiveDayKey()) {
  const normalized = callDateKeyFromValue(dayKey);
  if (normalized === todayCallDateKey()) return 'Ganancias de hoy';
  return `Ganancias del ${formatCallDayLabel(normalized)}`;
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
    toast('📅 Ese día todavía no llega — vas a ver un día futuro sin datos.');
  }
  setActiveDayKey(todayCallDateKey(next));
}

// Tocar "Día activo" salta directo a Hoy, mismo setActiveDayKey que las flechitas ‹/›.
function jumpActiveDayToToday() {
  if (isViewingToday()) return;
  setActiveDayKey(todayCallDateKey());
  toast('📅 Volviste a Hoy');
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

function dayEvents(dayKey = getActiveDayKey()) {
  const normalized = callDateKeyFromValue(dayKey);
  return state.events.filter(e => sameCallDay(e.ts, normalized));
}

function dayPauseIntervals(dayKey = getActiveDayKey()) {
  const normalized = callDateKeyFromValue(dayKey);
  const arr = state.pauseHistory
    .filter(p => sameCallDay(p.startedAt, normalized))
    .map(p => ({ type: p.type, start: new Date(p.startedAt), end: new Date(p.endedAt) }));
  if (normalized === todayCallDateKey() && state.activePause && !state.shiftEndedAt) {
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

  // Reconciliación con llamadas reales: si el click de "Iniciar shift" llegó más tarde que la
  // primera llamada, gana la llamada.
  if (start || end) {
    const dayCalls = callsForDay(normalized);
    if (dayCalls.length) {
      const ordered = [...dayCalls].sort((a, b) => new Date(a.startISO) - new Date(b.startISO));
      // Solo se consideran, para reconciliar el INICIO, llamadas que caen DESPUÉS del cierre del
      // turno anterior (si existe) — ver priorShiftEndBoundary arriba.
      const relevantForStart = priorShiftEndBoundary
        ? ordered.filter(c => new Date(c.startISO).getTime() >= priorShiftEndBoundary.getTime())
        : ordered;
      const firstCallStart = relevantForStart.length ? new Date(relevantForStart[0].startISO) : null;
      const lastCallEnd = new Date(ordered[ordered.length - 1].endISO);
      if (start && firstCallStart && firstCallStart.getTime() < start.getTime()) start = firstCallStart;
      if (end && lastCallEnd.getTime() > end.getTime()) end = lastCallEnd;
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
    if (isToday && !state.shiftEndedAt) {
      // Turno en curso hoy, sin cerrar todavía.
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
    const dayCallsForReconciliation = callsForDay(normalized);
    if (dayCallsForReconciliation.length) {
      const ordered = [...dayCallsForReconciliation].sort((a, b) => new Date(a.startISO) - new Date(b.startISO));
      const firstCallStart = new Date(ordered[0].startISO);
      const lastCallEnd = new Date(ordered[ordered.length - 1].endISO);
      const firstSession = sessions[0];
      const lastSession = sessions[sessions.length - 1];
      if (firstCallStart.getTime() < firstSession.start.getTime()) firstSession.start = firstCallStart;
      if (!lastSession.live && lastCallEnd.getTime() > lastSession.end.getTime()) lastSession.end = lastCallEnd;
    }
    return sessions;
  }

  // Fallback total: sin ningún evento de shift ni turno global vigente ese día — mismo estimado que
  // ya usa dayShiftBounds (primera/última llamada real).
  const bounds = dayShiftBounds(normalized);
  if (!bounds.start) return [];
  const end = bounds.end || (bounds.live ? new Date() : bounds.start);
  return [{ start: bounds.start, end, live: bounds.live }];
}

// Convierte una lista de sesiones {start,end,live} (Date objects) a intervalos de "presencia" en
// minuto-del-día, para un `normalizedDayKey` concreto — usado por computeMinuteAdherence vía
// minuteAdherenceForDay/slotMinuteAdherence.
function sessionsToPresenceIntervals(sessions, normalizedDayKey) {
  const minuteOfDay = (date) => date.getHours() * 60 + date.getMinutes();
  return sessions.map(s => {
    const startMin = dateKey(s.start) === normalizedDayKey ? minuteOfDay(s.start) : 0;
    const endMin = dateKey(s.end) === normalizedDayKey ? minuteOfDay(s.end) : 1440;
    return { startMin, endMin };
  }).filter(iv => iv.endMin > iv.startMin);
}

// Mismo criterio que sessionsToPresenceIntervals: una pausa real (Break/ Lunch o hueco clasificado
// a mano) que cruza medianoche pierde el día al convertirse a minuto-del-día con
// getHours/getMinutes — sin este recorte, start > end y la pausa deja de matchear cualquier minuto.
function pauseIntervalsToMinuteRanges(pauses, normalizedDayKey) {
  return pauses.map(p => {
    const startMin = dateKey(p.start) === normalizedDayKey ? p.start.getHours() * 60 + p.start.getMinutes() : 0;
    const endMin = dateKey(p.end) === normalizedDayKey ? p.end.getHours() * 60 + p.end.getMinutes() : 1440;
    return { type: p.type, startMin, endMin };
  }).filter(iv => iv.endMin > iv.startMin);
}

// Usa dayShiftSessions (todas las sesiones del día), no solo la más reciente.
export function connectedMinutesForDay(dayKey = getActiveDayKey()) {
  // Una sesión que cruza medianoche pertenece a dos días: se recorta al día consultado, igual que
  // ya hace sessionsToPresenceIntervals para Adherencia.
  const base = callDateToDate(callDateKeyFromValue(dayKey));
  const dayStart = base ? base.getTime() : null;
  const dayEnd = base ? new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1).getTime() : null;
  return dayShiftSessions(dayKey).reduce((total, s) => {
    const end = s.live ? new Date() : s.end;
    const from = dayStart === null ? s.start.getTime() : Math.max(s.start.getTime(), dayStart);
    const to = dayEnd === null ? end.getTime() : Math.min(end.getTime(), dayEnd);
    return total + Math.max(0, (to - from) / 60000);
  }, 0);
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

// Una pausa real (botón) y el mismo hueco clasificado a mano como Break/Lunch son la MISMA pausa:
// hay que fusionarlas por tipo antes de SUMAR minutos (slotStats), o cada una descuenta por su
// cuenta.
function dayPausesForSlotStats(dayKey) {
  const normalized = callDateKeyFromValue(dayKey);
  const byType = {};
  const push = (type, startedAt, endedAt) => {
    const t = String(type || '').toLowerCase();
    (byType[t] = byType[t] || []).push({ type: t, startedAt, endedAt });
  };
  dayPauseIntervals(normalized).forEach(p => push(p.type, p.start.toISOString(), p.end.toISOString()));
  ['break', 'lunch'].forEach(t => manualGapPauseIntervals(normalized, t).forEach(p => push(t, p.startedAt, p.endedAt)));
  const out = [];
  Object.keys(byType).forEach(t => {
    mergeOverlappingPauseEntries(byType[t]).forEach(p => out.push({ type: t, start: new Date(p.startedAt), end: new Date(p.endedAt) }));
  });
  return out;
}

// El motor de Adherencia minuto a minuto (computeMinuteAdherence, vía dayPauseIntervals) solo
// conocía pausas REALES tomadas con el botón.
function actualPauseIntervalsForDay(dayKey) {
  const normalized = callDateKeyFromValue(dayKey);
  const real = dayPauseIntervals(normalized).map(p => ({ type: p.type, start: p.start, end: p.end }));
  const manualBreak = manualGapPauseIntervals(normalized, 'break').map(p => ({ type: 'break', start: new Date(p.startedAt), end: new Date(p.endedAt) }));
  const manualLunch = manualGapPauseIntervals(normalized, 'lunch').map(p => ({ type: 'lunch', start: new Date(p.startedAt), end: new Date(p.endedAt) }));
  return [...real, ...manualBreak, ...manualLunch];
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

  const rawHistory = state.pauseHistory
    .filter(p => p.type === type && sameCallDay(p.startedAt, normalized))
    .map(p => ({ type: p.type, startedAt: p.startedAt, endedAt: p.endedAt }));

  // Pausas "reales" tomadas con el botón + pausas confirmadas a mano desde el editor de huecos (ver
  // manualGapPauseIntervals).
  rawHistory.push(...manualGapPauseIntervals(normalized, type));

  if (normalized === todayCallDateKey() && state.activePause && state.activePause.type === type && !state.shiftEndedAt) {
    rawHistory.push({ type, startedAt: state.activePause.startedAt, endedAt: new Date().toISOString() });
  }

  // Fusiona duplicados traslapados (ver mergeOverlappingPauseEntries) ANTES de emparejar contra los
  // slots — así una pausa real + un hueco manual clasificado encima cuentan como UNA sola
  // ocurrencia, no dos.
  const history = mergeOverlappingPauseEntries(rawHistory);

  // Se usa el horario EFECTIVO: buildPlannedSlots en crudo ignora el corrimiento de lateArrivalMode
  // === 'shift'.
  const matchingSlots = getEffectiveScheduleForDay(normalized).filter(s => s.type.toLowerCase() === type);
  const assignment = new Array(matchingSlots.length).fill(null);
  if (!history.length || !matchingSlots.length) return { matchingSlots, assignment };

  const slotStarts = matchingSlots.map(s => dateAtTime(base, s.start).getTime());
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

  let status = 'Pendiente';
  let statusTone = 'muted';
  let detail = slot.type === 'Work'
    ? `Usado ${formatDuration(workUsed * 60000)} · ${formatDuration(callMin * 60000)} llamadas · ${formatDuration(acwMin * 60000)} ACW${pauseMin ? ` · ${formatDuration(pauseMin * 60000)} pausa` : ''}`
    : `Usado ${formatDuration(pauseUsed * 60000)} de ${formatDuration(durationMin * 60000)}`;

  if (slot.type === 'Work') {
    const startDelta = shiftStart ? (shiftStart.getTime() - slotStart.getTime()) / 60000 : null;
    const endDelta = shiftEnd ? (shiftEnd.getTime() - slotEnd.getTime()) / 60000 : null;

    if (!shiftStart) {
      status = 'Sin shift';
    } else if (shiftStart > slotEnd) {
      status = 'Omitido';
      statusTone = 'bad';
    } else if (startDelta !== null && startDelta > 1) {
      status = `Entrada tarde ${formatDeltaMinutes(startDelta)}`;
      statusTone = 'warn';
    } else if (endDelta !== null && endDelta < -1) {
      status = `Salida temprana -${formatMinutes(Math.abs(endDelta))}m`;
      statusTone = 'warn';
    } else if (dayKey === todayCallDateKey() && !state.shiftEndedAt && now >= slotStart && now < slotEnd) {
      status = 'En curso';
      statusTone = 'good';
    } else if (pct >= 95) {
      status = 'Completo';
      statusTone = 'good';
    } else if (filledMin > 0) {
      status = 'Parcial';
      statusTone = 'warn';
    } else {
      // Un bloque de Trabajo ya pasado y sin actividad no es "Pendiente": se marca "Sin actividad".
      const isPastSlot = dayKey === todayCallDateKey() ? now >= slotEnd : !!(shiftEnd && shiftEnd >= slotEnd);
      status = isPastSlot ? 'Sin actividad' : 'Pendiente';
      statusTone = 'muted';
    }
  } else if (actualPause) {
    const actualStart = actualPauseRange.start;
    const actualEnd = actualPauseRange.end || now;
    const startDelta = (actualStart.getTime() - slotStart.getTime()) / 60000;
    const endDelta = (actualEnd.getTime() - slotEnd.getTime()) / 60000;
    const parts = [];
    if (startDelta > 1) {
      parts.push(`Tarde ${formatDeltaMinutes(startDelta)}`);
      statusTone = 'warn';
    } else if (startDelta < -1) {
      parts.push(`Antes -${formatMinutes(Math.abs(startDelta))}m`);
      statusTone = 'warn';
    } else {
      parts.push('A tiempo');
      statusTone = 'good';
    }
    if (endDelta > 1) {
      parts.push(`+${formatMinutes(endDelta)}m extra`);
      statusTone = 'warn';
    } else if (endDelta < -1) {
      parts.push(`-${formatMinutes(Math.abs(endDelta))}m menos`);
    }
    status = parts.join(' · ');
  } else if (now >= slotEnd) {
    status = slot.type === 'Lunch' ? 'Lunch no tomado' : 'Break no tomado';
    statusTone = 'bad';
  } else if (now >= slotStart && now < slotEnd) {
    status = `Pendiente`;
    statusTone = 'warn';
  }

  return { slotStart, slotEnd, durationMin, callMin, acwMin, pauseMin, filledMin, pct, productivityPct, detail, status, statusTone, actualPauseRange, realActivityRange, productivityGoal };
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
  ausente: 'Ausencia/llegada tarde',
  break_extra: 'Break tomado fuera de horario',
  lunch_extra: 'Lunch tomado fuera de horario',
  break_perdido: 'Break no tomado a tiempo',
  lunch_perdido: 'Lunch no tomado a tiempo',
  lunch_encima_break: 'Lunch encima de tu Break',
  break_encima_lunch: 'Break encima de tu Lunch',
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

  const plannedSlots = plannedRaw.map(s => ({ type: s.type.toLowerCase(), startMin: toMinutes(s.start), endMin: toMinutes(s.end) }));
  const minuteOfDay = (date) => date.getHours() * 60 + date.getMinutes();

  const actualIntervals = pauseIntervalsToMinuteRanges(actualPauseIntervalsForDay(normalized), normalized);
  const presenceIntervals = sessionsToPresenceIntervals(sessions, normalized);

  const rangeStart = plannedSlots[0].startMin;
  const lastSlotEnd = plannedSlots[plannedSlots.length - 1].endMin;
  const anySessionLive = sessions.some(s => s.live);
  const rangeEnd = (isToday && anySessionLive) ? Math.min(minuteOfDay(new Date()), lastSlotEnd) : lastSlotEnd;

  const graceMin = Number.isFinite(Number(settings.adherenceGraceMin)) && Number(settings.adherenceGraceMin) >= 0 ? Number(settings.adherenceGraceMin) : 3;
  return computeMinuteAdherence({ plannedSlots, actualIntervals, presenceIntervals, rangeStart, rangeEnd, graceMin });
}

// Saber si AHORA MISMO (este minuto) estás fuera de adherencia — para un indicador en vivo, no solo
// el % acumulado del día.
function isRightNowOutOfAdherence() {
  if (!state.shiftStartedAt || state.shiftEndedAt) return false;
  const dayKey = todayCallDateKey();
  // Un día forzado a Libre desde "Editar día" (Resumen semanal) ya no exige Adherencia.
  if (dayIsEffectivelyOff(dayKey)) return false;
  const plannedRaw = originalPlannedSlotsForDay(dayKey);
  if (!plannedRaw.length) return false;

  const plannedSlots = plannedRaw.map(s => ({ type: s.type.toLowerCase(), startMin: toMinutes(s.start), endMin: toMinutes(s.end) }));
  const minuteOfDay = (date) => date.getHours() * 60 + date.getMinutes();
  const actualIntervals = pauseIntervalsToMinuteRanges(actualPauseIntervalsForDay(dayKey), dayKey);
  // Si el turno empezó ayer y sigue abierto, se trata como presente desde el minuto 0 de hoy.
  const realStartMin = sameCallDay(state.shiftStartedAt, dayKey) ? minuteOfDay(new Date(state.shiftStartedAt)) : 0;
  const nowMin = minuteOfDay(new Date());
  const graceMin = Number.isFinite(Number(settings.adherenceGraceMin)) && Number(settings.adherenceGraceMin) >= 0 ? Number(settings.adherenceGraceMin) : 3;
  const presenceIntervals = [{ startMin: realStartMin, endMin: 1440 }];

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

  const plannedSlots = plannedRaw.map(s => ({ type: s.type.toLowerCase(), startMin: toMinutes(s.start), endMin: toMinutes(s.end) }));
  const minuteOfDay = (date) => date.getHours() * 60 + date.getMinutes();

  const actualIntervals = pauseIntervalsToMinuteRanges(actualPauseIntervalsForDay(normalized), normalized);
  const presenceIntervals = sessionsToPresenceIntervals(sessions, normalized);

  const slotStartMin = toMinutes(originalSlot.start);
  const slotEndMin = toMinutes(originalSlot.end);
  const rangeStart = slotStartMin;
  const anySessionLive = sessions.some(s => s.live);
  const rangeEnd = (isToday && anySessionLive) ? Math.min(minuteOfDay(new Date()), slotEndMin) : slotEndMin;
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
  const sessions = dayShiftSessions(normalized);
  const isToday = normalized === todayCallDateKey();
  const base = callDateToDate(normalized) || new Date();

  if (!sessions.length) {
    if (isToday) return null;
    if (base > todayRange()) return null;
    return { dayKey: normalized, checkpoints: [{ label: 'Turno', ok: false, score: 0, note: 'No se inició el turno' }], scorePct: 0 };
  }

  const checkpoints = [];
  const plannedStart = dateAtTime(base, formatHHMM(cfg.start));
  const firstSessionStart = sessions[0].start;
  const startDelta = (firstSessionStart.getTime() - plannedStart.getTime()) / 60000;
  checkpoints.push({
    label: 'Entrada',
    ok: Math.abs(startDelta) <= ADHERENCE_TOLERANCE_MIN,
    score: adherenceProximityScore(Math.abs(startDelta), ADHERENCE_FALLOFF_SHIFT_MIN),
    note: startDelta > ADHERENCE_TOLERANCE_MIN ? `Tarde ${formatDeltaMinutes(startDelta)}` : startDelta < -ADHERENCE_TOLERANCE_MIN ? `Temprano ${formatDeltaMinutes(startDelta)}` : 'A tiempo',
  });

  // Se usa el horario EFECTIVO (getEffectiveScheduleForDay), no buildPlannedSlots(cfg) en crudo.
  // pauseForSlot empareja cada slot con su pausa real haciendo match exacto de start/end contra el
  // horario efectivo (ver pauseAssignmentCache)
  const planned = getEffectiveScheduleForDay(normalized);
  const lastSession = sessions[sessions.length - 1];

  if (!lastSession.live) {
    const effectiveEnd = planned.length ? planned[planned.length - 1].end : formatHHMM(cfg.end);
    const plannedEnd = dateAtTime(base, effectiveEnd);
    const endDelta = (lastSession.end.getTime() - plannedEnd.getTime()) / 60000;
    checkpoints.push({
      label: 'Salida',
      ok: Math.abs(endDelta) <= ADHERENCE_TOLERANCE_MIN,
      score: adherenceProximityScore(Math.abs(endDelta), ADHERENCE_FALLOFF_SHIFT_MIN),
      note: endDelta < -ADHERENCE_TOLERANCE_MIN ? `Temprano ${formatDeltaMinutes(endDelta)}` : endDelta > ADHERENCE_TOLERANCE_MIN ? `Tarde +${formatMinutes(endDelta)}m` : 'A tiempo',
    });
  } else if (!isToday) {
    // Día pasado sin hora de fin registrada ni llamadas para estimarla: cuenta como checkpoint
    // fallado.
    checkpoints.push({ label: 'Salida', ok: false, score: 0, note: 'No se registró la salida' });
  }

  for (const slot of planned) {
    if (slot.type === 'Work') continue;
    const slotStart = dateAtTime(base, slot.start);
    const slotEnd = dateAtTime(base, slot.end);
    const plannedDur = (slotEnd.getTime() - slotStart.getTime()) / 60000;
    const actual = pauseForSlot(slot, normalized);

    if (!actual) {
      const skip = lastSession.live && isToday && now_isBefore(slotEnd);
      if (skip) continue; // Todavía no le tocaba, no penalizar aún Sin puntaje parcial aquí a propósito: "No tomado" es binario (o se marcó con el botón/se clasificó el hueco, o no) — no hay una noción de "casi tomaste tu break" que tenga sentido dar crédito parcial.
      checkpoints.push({ label: slot.name, ok: false, score: 0, note: 'No tomado' });
      continue;
    }

    const aStart = new Date(actual.startedAt);
    const aEnd = new Date(actual.endedAt || new Date().toISOString());
    const startD = (aStart.getTime() - slotStart.getTime()) / 60000;
    const durD = ((aEnd.getTime() - aStart.getTime()) / 60000) - plannedDur;
    const ok = Math.abs(startD) <= ADHERENCE_TOLERANCE_MIN && Math.abs(durD) <= ADHERENCE_TOLERANCE_MIN;
    // Crédito parcial = promedio de qué tan cerca estuvo el inicio y qué tan cerca estuvo la
    // duración de lo planeado.
    const score = (adherenceProximityScore(Math.abs(startD), ADHERENCE_FALLOFF_PAUSE_MIN) + adherenceProximityScore(Math.abs(durD), ADHERENCE_FALLOFF_PAUSE_MIN)) / 2;
    const notes = [];
    if (startD > ADHERENCE_TOLERANCE_MIN) notes.push(`empezó tarde ${formatDeltaMinutes(startD)}`);
    else if (startD < -ADHERENCE_TOLERANCE_MIN) notes.push(`empezó antes ${formatDeltaMinutes(startD)}`);
    if (durD > ADHERENCE_TOLERANCE_MIN) notes.push(`se pasó ${formatMinutes(durD)}`);
    else if (durD < -ADHERENCE_TOLERANCE_MIN) notes.push(`cortó ${formatMinutes(Math.abs(durD))}`);
    checkpoints.push({ label: slot.name, ok, score, note: notes.length ? notes.join(' · ') : 'A tiempo' });
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
  const { start: shiftStart, end: shiftEnd } = dayShiftBounds(dayKey);
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

// Página actual de la gráfica mensual de Reportes (Ganancias + Adherencia por mes) — mismo criterio
// que weekViewOffset/cycleViewOffset: vive en memoria, no en localStorage (vista de sesión, no
// preferencia persistida).
export let reportsMonthlyOffset = 0;

// Calendario de productividad: mes mostrado ahora mismo (0 = mes actual).
export let calMonthOffset = 0;
// Vista anual de "Calendario de productividad" (solo escritorio) — 'year' o 'month'. calYearOffset:
// 0 = año actual, navegable ±1 (mismo criterio que calMonthOffset). Ambas viven en memoria, no en
// localStorage.
export let calViewMode = 'month';
export let calYearOffset = 0;
export function setCalMonthOffset(v) { calMonthOffset = v; }
export function setCalViewMode(v) { calViewMode = v; }

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
    if (title) title.textContent = 'Ganancias del ciclo';
    if (subtitle) subtitle.textContent = 'Total del ciclo de pago actual (14 días) y la próxima fecha de pago.';
  } else {
    if (title) title.textContent = earningsSectionLabel(getActiveDayKey());
    if (subtitle) subtitle.textContent = 'Gana, meta y margen del día, de un vistazo.';
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
}

// "Resumen semanal" usaba semanas Lunes-Domingo fijas, sin relación con cuándo arranca de verdad el
// ciclo de pago de 14 días (cycleAnchorDate/cyclePayOffsetDays, ver Horario).
function startOfCycleWeek(date = new Date()) {
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

function formatWeekRangeLabel(start, end) {
  const startLabel = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(start);
  const endLabel = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(end);
  return `${startLabel} – ${endLabel}`;
}

// Notas de día (Resumen semanal → "Editar") ---- Categorías cortas para marcar por qué un día se
// vio distinto de lo normal, más un comentario libre. Puramente informativo (ver comentario en
// defaultState.dayNotes)
const DAY_NOTE_CATEGORIES = [
  { value: 'rest', label: 'Descanso', tagClass: '' },
  { value: 'holiday', label: 'Día festivo', tagClass: 'good' },
  { value: 'sick', label: 'Enfermedad', tagClass: 'warn' },
  { value: 'power_outage', label: 'Corte de luz', tagClass: 'bad' },
  { value: 'internet_outage', label: 'Corte de internet', tagClass: 'bad' },
  { value: 'platform_issues', label: 'Problemas de la plataforma', tagClass: 'bad' },
  { value: 'burnout', label: 'Agotamiento', tagClass: 'warn' },
  { value: 'other', label: 'Otro', tagClass: '' },
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
  saveStateOnly();
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
function getDailyGoalOverride(dayKey) {
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
  return { min: Number(settings.productiveGoalMin) || 0, usd: Number(settings.earningsGoal) || 0, isOverride: false };
}

// Value=null borra el override de ese día (vuelve a la meta general).
function setDailyGoalOverride(dayKey, value) {
  const normalized = callDateKeyFromValue(dayKey);
  if (!normalized) return;
  if (!settings.dailyGoalOverrides || typeof settings.dailyGoalOverrides !== 'object') settings.dailyGoalOverrides = {};
  const min = Number(value && value.min);
  const usd = Number(value && value.usd);
  if (value && Number.isFinite(min) && min >= 0 && Number.isFinite(usd) && usd >= 0) {
    settings.dailyGoalOverrides[normalized] = { min, usd };
  } else {
    delete settings.dailyGoalOverrides[normalized];
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
  saveSettingsOnly();
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
    toast('La meta debe ser un número mayor a 0');
    return;
  }
  setCycleGoalOverride(0, amount);
  closeModal('cycleGoalModal');
  render();
  toast(`Meta del ciclo: ${money(amount)}${convertedAmountText(amount) ? ` (${convertedAmountText(amount)})` : ''}`);
}

function useAutoCycleGoal() {
  setCycleGoalOverride(0, null);
  closeModal('cycleGoalModal');
  render();
  toast('Meta del ciclo vuelve a calcularse automáticamente');
}

function updateCycleGoalFromAjustes() {
  const input = document.getElementById('cycleGoalInput');
  const amount = Number(input?.value);
  setCycleGoalOverride(0, Number.isFinite(amount) && amount > 0 ? amount : null);
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
  const wrap = document.getElementById('weekSummaryWrap');
  const subtitle = document.getElementById('weekSummarySubtitle');
  if (!wrap) return;

  const weekSummaryTipEl = document.getElementById('weekSummaryTip');
  if (weekSummaryTipEl) weekSummaryTipEl.hidden = !!settings.weekSummaryTipDismissed;

  const summary = weekSummaryForOffset(weekViewOffset);
  const rangeLabel = formatWeekRangeLabel(summary.weekStart, summary.weekEnd);
  const cycleWeekLabel = `Semana ${cycleWeekNumberForWeekStart(summary.weekStart)} del ciclo`;
  if (subtitle) {
    subtitle.textContent = `${weekViewOffset === 0 ? `Semana actual · ${rangeLabel}` : rangeLabel} · ${cycleWeekLabel}`;
  }

  // Rediseño 100% visual de "Resumen semanal".
  const dayShortDateLabel = (dayKey) => {
    const d = callDateToDate(dayKey);
    if (!d) return '';
    return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(d);
  };

  const itemsHtml = summary.days.map(r => {
    const weekdayKey = weekdayKeyForDayKey(r.dayKey);
    const dayLabel = WEEKDAY_LABELS[weekdayKey];
    const noteMeta = r.note ? dayNoteCategoryMeta(r.note.category) : null;

    // Estado del día: decide el badge (texto+tono) y el ícono (nombre+tono) — SOLO según si el día
    // cuenta como laborado de verdad (Libre > Futuro > Sin datos > Trabajado).
    let badgeText, badgeTone, iconName, iconTone;
    if (r.isOff) {
      badgeText = 'Libre'; badgeTone = 'neutral'; iconName = 'calendar'; iconTone = 'neutral';
    } else if (r.isFuture) {
      badgeText = 'Futuro'; badgeTone = 'neutral'; iconName = 'calendar'; iconTone = 'neutral';
    } else if (!r.hasShift && !r.calls) {
      badgeText = 'Sin datos'; badgeTone = 'bad'; iconName = 'alertTriangle'; iconTone = 'bad';
    } else {
      badgeText = 'Trabajado'; badgeTone = 'good'; iconName = 'check'; iconTone = 'good';
    }
    if (r.isToday && !r.isOff) { badgeText = 'Hoy'; badgeTone = 'cyan'; iconTone = 'cyan'; }

    const noteBadgeTone = noteMeta ? (noteMeta.tagClass === 'good' ? 'good' : noteMeta.tagClass === 'bad' ? 'bad' : noteMeta.tagClass === 'warn' ? 'bad' : 'neutral') : '';
    const noteBadgeHtml = noteMeta ? ` <span class="wk-row-badge tone-${noteBadgeTone}">${escapeHtml(noteMeta.label)}</span>` : '';

    const rowClasses = ['wk-row', r.isToday ? 'is-today' : '', r.isFuture ? 'is-future' : ''].filter(Boolean).join(' ');

    const adherenceText = r.adherencePct === null ? '' : ` · Adherencia ${r.adherencePct}%`;
    const subText = r.isFuture
      ? escapeHtml(dayShortDateLabel(r.dayKey))
      : `${escapeHtml(dayShortDateLabel(r.dayKey))} · ${r.calls} llamada(s)${adherenceText}`;

    // Un día futuro no muestra monto ni tiempo productivo — nada real que reportar todavía, mismo
    // criterio que ya usaba.
    const rightHtml = r.isFuture ? '' : `
      <div class="wk-row-right">
        <div class="wk-row-amount">${money(r.earnings)}</div>
        ${financeConvertedNote(r.earnings)}
        <div class="wk-row-amount-sub">${formatDuration(r.productive * 60000)} productivo</div>
      </div>
    `;

    const editBtnHtml = `<button class="wk-row-edit" type="button" data-day-note-edit="${escapeHtml(r.dayKey)}" aria-label="Editar día" title="Editar día">${iconHtml('edit')}<span class="wk-row-edit-label">Editar</span></button>`;

    const noteHtml = r.note && r.note.comment
      ? `<div class="wk-row-note" title="${escapeHtml(r.note.comment)}"><svg class="ic-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg> ${escapeHtml(r.note.comment.length > 60 ? r.note.comment.slice(0, 60) + '…' : r.note.comment)}</div>`
      : '';

    const statusBadgeHtml = `<button type="button" class="wk-row-badge wk-row-badge-tap tone-${badgeTone}" data-day-note-edit="${escapeHtml(r.dayKey)}" data-day-note-focus="status" title="Cambiar estado del día">${escapeHtml(badgeText)}${iconHtml('chevronDown')}</button>`;
    // Dos ubicaciones del mismo enlace: en el título (escritorio) o en la línea secundaria (móvil),
    // alternadas por CSS.
    const addNoteBtn = (cls) => `<button type="button" class="wk-row-add-note ${cls}" data-day-note-edit="${escapeHtml(r.dayKey)}" data-day-note-focus="note">+ Nota</button>`;
    const addNoteHtml = !r.note ? addNoteBtn('wk-row-add-note-title') : '';
    const addNoteSubHtml = !r.note ? addNoteBtn('wk-row-add-note-sub') : '';
    const goChevronHtml = r.isFuture ? '' : `<span class="wk-row-go" aria-hidden="true">${iconHtml('chevronRight')}</span>`;

    return `
      <div class="${rowClasses}" data-week-day="${escapeHtml(r.dayKey)}">
        <span class="wk-row-icon tone-${iconTone}" aria-hidden="true">${iconHtml(iconName)}</span>
        <div class="wk-row-main">
          <div class="wk-row-title">${escapeHtml(dayLabel)} ${statusBadgeHtml}${noteBadgeHtml}${addNoteHtml}</div>
          <div class="wk-row-sub">${subText}${addNoteSubHtml}</div>
          ${noteHtml}
        </div>
        ${rightHtml}
        ${editBtnHtml}
        ${goChevronHtml}
      </div>
    `;
  }).join('');

  const t = summary.totals;
  // "promedio de llamadas por día trabajado" se agrega al pie de Resumen semanal en vez de como
  // tarjeta propia en Reportes — encaja mejor junto al resto de totales de esta fila.
  const workedDaysCount = summary.days.filter(r => !r.isFuture && (r.hasShift || r.calls > 0)).length;
  const avgCallsPerWorkedDay = workedDaysCount > 0 ? (t.calls / workedDaysCount) : 0;
  const totalHtml = `
    <div class="wk-total-row">
      <div class="wk-total-label">Total semana</div>
      <div class="wk-total-metrics">
        <div class="wk-total-metric"><span class="wk-total-metric-label">Productivo</span><strong>${formatDuration(t.productive * 60000)}</strong></div>
        <div class="wk-total-metric"><span class="wk-total-metric-label">Llamadas</span><strong>${t.calls}</strong></div>
        <div class="wk-total-metric"><span class="wk-total-metric-label">Ganancias</span><strong>${money(t.earnings)}${convertedAmountText(t.earnings) ? ` <span style="opacity:.75; font-weight:700;">(${escapeHtml(convertedAmountText(t.earnings))})</span>` : ''}</strong></div>
        <div class="wk-total-metric"><span class="wk-total-metric-label">Adherencia</span><strong>${t.avgAdherence === null ? '—' : `${t.avgAdherence}%`}</strong></div>
        <div class="wk-total-metric"><span class="wk-total-metric-label">Prom./día trabajado</span><strong>${workedDaysCount > 0 ? avgCallsPerWorkedDay.toFixed(1) : '—'}</strong></div>
      </div>
    </div>
  `;

  wrap.innerHTML = `<div class="wk-list">${itemsHtml}</div>${totalHtml}`;
}

// Nueva página "Fechas de pago". CERO cálculo de negocio nuevo.
function renderPayDatesSection() {
  const body = document.getElementById('payDatesBody');
  if (!body) return;

  const today = todayRange();
  const cycles = [-2, -1, 0, 1, 2].map(offset => {
    const { start, end, payDate } = cycleBoundsForOffset(offset);
    const isCurrent = today >= start && today <= todayRange(end);
    const isPaid = todayRange(payDate) < today;
    return { offset, start, end, payDate, isCurrent, isPaid };
  });

  const current = cycles.find(c => c.isCurrent) || cycles[2];
  const dayOfCycle = Math.min(14, Math.max(1, Math.round((today - current.start) / 86400000) + 1));
  // "Próximo pago" tomaba SIEMPRE el pago del ciclo ACTUAL (el que contiene hoy)
  const nextPayment = cycles.find(c => !c.isPaid) || current;
  const daysUntilPay = Math.round((todayRange(nextPayment.payDate) - today) / 86400000);

  const fmtRange = (start, end) => `${formatCallDayLabel(todayCallDateKey(start))} – ${formatCallDayLabel(todayCallDateKey(end))}`;
  const fmtFull = (d) => {
    const raw = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  };
  const fmtShort = (d) => new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long' }).format(d);

  const nextCardHtml = `
    <div class="pd-next-card">
      <div>
        <div class="pd-next-label">Próximo pago</div>
        <div class="pd-next-date">${escapeHtml(fmtFull(nextPayment.payDate))}</div>
        <div class="pd-next-sub">Del ciclo ${escapeHtml(fmtRange(nextPayment.start, nextPayment.end))}</div>
      </div>
      <div class="pd-next-days-wrap">
        <div class="pd-next-days">${Math.max(0, daysUntilPay)}</div>
        <div class="pd-next-days-label">días restantes</div>
      </div>
    </div>
    <div class="pd-legend-row">
      <span class="pd-legend-item"><span class="pd-legend-dot" style="background:var(--accent-blue-2, var(--cyan));"></span>Ciclo actual</span>
      <span class="pd-legend-item"><span class="pd-legend-dot" style="background:var(--good);"></span>Ya pagado</span>
    </div>
  `;

  const rowsHtml = cycles.map(c => {
    const isToday = c.isCurrent;
    const isNextPayment = c.offset === nextPayment.offset;
    const badgeHtml = isToday
      ? `<span class="wk-row-badge tone-cyan">Actual — día ${dayOfCycle} de 14</span>`
      : '';
    const iconTone = c.isPaid ? 'tone-good' : isNextPayment ? 'tone-cyan' : 'tone-neutral';
    const rowDaysUntilPay = Math.round((todayRange(c.payDate) - today) / 86400000);
    const statusText = c.isPaid ? 'Pagado' : isNextPayment ? `En ${Math.max(0, rowDaysUntilPay)} días` : 'Próximo';
    const rowClass = isToday ? 'wk-row is-today' : 'wk-row';
    const subText = isToday ? `Hoy, ${fmtShort(today)}` : '14 días';
    return `
      <div class="${rowClass}">
        <span class="wk-row-icon ${iconTone}">${iconHtml(c.isPaid ? 'checkCircle' : 'calendar')}</span>
        <div class="wk-row-main">
          <div class="wk-row-title">Ciclo: ${escapeHtml(fmtRange(c.start, c.end))} ${badgeHtml}</div>
          <div class="wk-row-sub">${escapeHtml(subText)}</div>
        </div>
        <div class="wk-row-right">
          <div class="wk-row-amount" style="color: ${isNextPayment ? 'var(--accent-blue-2, var(--cyan))' : 'var(--text)'};">${escapeHtml(fmtShort(c.payDate))}</div>
          <div class="wk-row-amount-sub">${escapeHtml(statusText)}</div>
        </div>
      </div>
    `;
  }).join('');

  body.innerHTML = `${nextCardHtml}<div class="wk-list">${rowsHtml}</div>`;
}

// Página "Finanzas" ---- ver FINANCE_CATEGORIES arriba y el resumen.md para el modelo de datos
// completo (settings.financeCategories, cascada de "Restante después").

    // Lee los 3 campos de meta y devuelve los valores ya sincronizados entre sí, SIN guardar nada —
    // quién guarda (y con qué alcance) lo decide applyGoalValues.
    function computeGoalsFromInputs(source) {
      const minInput = document.getElementById('productiveGoalInput');
      const usdInput = document.getElementById('earningsGoalInput');
      const currencyInput = document.getElementById('goalCurrencyInput');
      const current = effectiveDailyGoal(getActiveDayKey());
      let minutes = Number(minInput.value);
      let dollars = Number(usdInput.value);
      let currencyAmount = Number(currencyInput?.value);
      if (!Number.isFinite(minutes)) minutes = current.min;
      if (!Number.isFinite(dollars)) dollars = current.usd;
      // El atributo min del input no frena negativos ni notación científica: se clamea aquí.
      minutes = Math.max(0, minutes);
      dollars = Math.max(0, dollars);
      if (Number.isFinite(currencyAmount)) currencyAmount = Math.max(0, currencyAmount);
      // La tasa por minuto sale de settings.rate, editable en Ajustes.
      const rate = Number(settings.rate) > 0 ? Number(settings.rate) : RATE;
      // "Meta en tu moneda" (ej. Lempiras), sincronizada en ambos sentidos con Meta en
      // dólares/minutos usando la tasa de cambio ya configurada en Metas (settings.exchangeRate).
      const exchangeRate = Number(settings.exchangeRate) > 0 ? Number(settings.exchangeRate) : 0;
      if (source === 'minutes') dollars = minutes * rate;
      if (source === 'dollars') minutes = dollars / rate;
      if (source === 'currency' && exchangeRate > 0) {
        if (!Number.isFinite(currencyAmount)) currencyAmount = currencyCeilFromUsdAmount(dollars, exchangeRate);
        dollars = usdCeilFromCurrencyAmount(currencyAmount, exchangeRate);
        minutes = dollars / rate;
      }
      // Segundo clamp, justo antes de guardar: los 3 renglones de arriba
      // (source==='minutes'/'dollars'/'currency') recalculan minutes/dollars a partir de otro
      // campo.
      minutes = Math.max(0, minutes);
      dollars = Math.max(0, dollars);
      return { minutes: Number(minutes), dollars: Number(dollars) };
    }

    // Scope 'day' guarda la meta SOLO para ese día; 'global' guarda la meta de siempre y borra el
    // override de ese día, para que la nueva general también aplique ahí.
    function applyGoalValues(minutes, dollars, scope, dayKey) {
      if (scope === 'day') {
        setDailyGoalOverride(dayKey, { min: minutes, usd: dollars });
      } else {
        settings.productiveGoalMin = Number(minutes);
        settings.earningsGoal = Number(dollars);
        state.productiveGoalMin = settings.productiveGoalMin;
        state.earningsGoal = settings.earningsGoal;
        setDailyGoalOverride(dayKey, null);
        saveStateOnly();
      }
      saveSettingsOnly();
      refreshGoalInputs();
      render();
    }

    // Repinta los 3 campos de meta con el valor efectivo del día activo.
    function refreshGoalInputs() {
      const minInput = document.getElementById('productiveGoalInput');
      const usdInput = document.getElementById('earningsGoalInput');
      const currencyInput = document.getElementById('goalCurrencyInput');
      const exchangeRate = Number(settings.exchangeRate) > 0 ? Number(settings.exchangeRate) : 0;
      const goal = effectiveDailyGoal(getActiveDayKey());
      if (minInput) minInput.value = formatMinutes(goal.min);
      if (usdInput) usdInput.value = goal.usd.toFixed(2);
      if (currencyInput && exchangeRate > 0) currencyInput.value = currencyCeilFromUsdAmount(goal.usd, exchangeRate).toFixed(2);
    }

    function syncGoals(source) {
      if (syncingGoals) return;
      syncingGoals = true;
      const { minutes, dollars } = computeGoalsFromInputs(source);
      applyGoalValues(minutes, dollars, 'global', getActiveDayKey());
      syncingGoals = false;
    }

    let pendingGoalChange = null;

    function requestGoalChange(source) {
      if (syncingGoals) return;
      const dayKey = getActiveDayKey();
      const { minutes, dollars } = computeGoalsFromInputs(source);
      const current = effectiveDailyGoal(dayKey);
      if (Math.abs(current.min - minutes) < 0.005 && Math.abs(current.usd - dollars) < 0.005) {
        refreshGoalInputs();
        return;
      }
      pendingGoalChange = { minutes, dollars, dayKey };
      const isToday = dayKey === todayCallDateKey();
      const dayLabel = isToday ? 'hoy' : formatCallDayLabel(dayKey);
      const summaryEl = document.getElementById('goalScopeSummary');
      const dayBtnEl = document.getElementById('goalScopeDayBtn');
      const dayHintEl = document.getElementById('goalScopeDayHint');
      if (summaryEl) summaryEl.textContent = `Meta nueva: ${formatMinutes(minutes)} min · ${money(dollars)}${convertedAmountText(dollars) ? ` (${convertedAmountText(dollars)})` : ''}`;
      if (dayBtnEl) dayBtnEl.innerHTML = `${iconHtml('calendar')} Solo ${escapeHtml(dayLabel)}`;
      if (dayHintEl) dayHintEl.textContent = `"Solo ${dayLabel}" deja tu meta de siempre intacta y aplica esta solo a ese día.`;
      openModal('goalScopeModal');
    }

    function applyPendingGoalChange(scope) {
      if (!pendingGoalChange) return;
      const { minutes, dollars, dayKey } = pendingGoalChange;
      pendingGoalChange = null;
      closeModal('goalScopeModal');
      applyGoalValues(minutes, dollars, scope, dayKey);
      toast(scope === 'day'
        ? `Meta de ${dayKey === todayCallDateKey() ? 'hoy' : formatCallDayLabel(dayKey)}: ${formatMinutes(minutes)} min · ${money(dollars)}${convertedAmountText(dollars) ? ` (${convertedAmountText(dollars)})` : ''}`
        : `Meta general: ${formatMinutes(minutes)} min · ${money(dollars)}${convertedAmountText(dollars) ? ` (${convertedAmountText(dollars)})` : ''}`);
    }

    function cancelPendingGoalChange() {
      if (!pendingGoalChange) return;
      pendingGoalChange = null;
      refreshGoalInputs();
    }

    // Quita el override del día activo desde Ajustes, sin tener que volver a teclear la meta
    // general.
    function clearActiveDayGoalOverride() {
      const dayKey = getActiveDayKey();
      if (!getDailyGoalOverride(dayKey)) return;
      setDailyGoalOverride(dayKey, null);
      saveSettingsOnly();
      refreshGoalInputs();
      render();
      toast('Ese día vuelve a usar tu meta general');
    }

    // Cuando se edita la tasa por minuto en Metas: se guarda la nueva tasa y se recalcula la Meta
    // en dólares a partir de la Meta en minutos ya guardada (mismo criterio que el flujo existente
    // de "source==='minutes'" en syncGoals)
    function updateRate() {
      const rateInput = document.getElementById('rateInput');
      let rate = Number(rateInput?.value);
      if (!Number.isFinite(rate) || rate <= 0) rate = settings.rate || RATE;
      settings.rate = rate;
      saveSettingsOnly();
      syncGoals('minutes');
    }

    // Cambios de moneda secundaria (símbolo + tasa de cambio), editables en Metas.
    function updateCurrencySettings() {
      const exchangeInput = document.getElementById('exchangeRateInput');
      const labelInput = document.getElementById('currencyLabelInput');
      let exchangeRate = Number(exchangeInput?.value);
      if (!Number.isFinite(exchangeRate) || exchangeRate < 0) exchangeRate = settings.exchangeRate || 0;
      settings.exchangeRate = exchangeRate;
      settings.currencyLabel = String(labelInput?.value || '').trim().slice(0, 6);
      saveSettingsOnly();
      render();
    }
    // Guarda nombre + emoji capturados en el popup de bienvenida (ver onboardingModal) y marca
    // settings.onboarded = true para que el popup no vuelva a salir en esta misma
    // instalación/navegador.
    export function renderEmojiPicker(containerId, selected) {
      const el = document.getElementById(containerId);
      if (!el) return;
      el.innerHTML = EMOJI_CHOICES.map(e => {
        const isClear = e === '';
        const display = isClear ? '✕' : e;
        const label = isClear ? 'Sin emoji' : `Elegir ${e}`;
        return `<button type="button" class="emoji-option ${isClear ? 'emoji-clear' : ''} ${e === selected ? 'selected' : ''}" data-emoji="${e}" aria-label="${label}">${display}</button>`;
      }).join('');
    }

    // Actualiza solo la clase.selected de los botones ya pintados, sin tocar el HTML.
    function syncEmojiPickerSelection(containerId, selected) {
      const el = document.getElementById(containerId);
      if (!el) return;
      el.querySelectorAll('.emoji-option').forEach(btn => {
        btn.classList.toggle('selected', btn.getAttribute('data-emoji') === selected);
      });
    }

    // Conecta los clicks del grid (delegado, un solo listener por contenedor) con el input de texto
    // correspondiente.
    function wireEmojiPicker(containerId, inputId, onPick) {
      const el = document.getElementById(containerId);
      if (!el) return;
      el.addEventListener('click', (e) => {
        const btn = e.target instanceof Element ? e.target.closest('.emoji-option') : null;
        if (!btn) return;
        const emoji = btn.getAttribute('data-emoji') || '';
        const input = document.getElementById(inputId);
        if (input) input.value = emoji;
        el.querySelectorAll('.emoji-option').forEach(b => b.classList.toggle('selected', b === btn));
        if (typeof onPick === 'function') onPick(emoji);
      });
    }

    // Rediseño visual de "Ajustes" — el picker de emojis (#emojiPickerMetas) + su input de texto
    // (#userEmojiInput) ya no viven siempre expandidos, se revelan con este botón pill "Cambiar
    // emoji".
    function toggleEmojiPickerMetas() {
      const wrap = document.getElementById('goalsEmojiPickerWrap');
      const btn = document.getElementById('toggleEmojiPickerMetasBtn');
      if (!wrap || !btn) return;
      const open = !wrap.classList.contains('open');
      wrap.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.textContent = open ? 'Ocultar emoji' : 'Cambiar emoji';
    }

    function toggleEmojiPickerOnboarding() {
      const wrap = document.getElementById('onboardingEmojiPickerWrap');
      const btn = document.getElementById('toggleEmojiPickerOnboardingBtn');
      if (!wrap || !btn) return;
      const open = !wrap.classList.contains('open');
      wrap.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.textContent = open ? 'Ocultar emoji' : 'Cambiar emoji';
    }

    function finishOnboarding() {
      const nameInput = document.getElementById('onboardingNameInput');
      const emojiInput = document.getElementById('onboardingEmojiInput');
      settings.userName = String(nameInput?.value || '').trim().slice(0, 40);
      settings.userEmoji = String(emojiInput?.value || '').trim().slice(0, 8);
      settings.onboarded = true;
      saveSettingsOnly();
      closeModal('onboardingModal');
      render();
    }

    function todayIsOff() {
      const cfg = dayConfigFor(todayCallDateKey());
      return !!(cfg && cfg.off);
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
      if (!isViewingToday()) return 'Iniciar shift';
      if (!state.shiftStartedAt || state.shiftEndedAt) return 'Iniciar shift';
      return 'Finalizar shift';
    }

    function shiftActionTone() {
      // Mismo criterio: si el turno de hoy sigue activo pero se está viendo otro día, el botón no
      // debe pintarse en rojo/"bad" como si "Finalizar" fuera la acción lista para ejecutarse —
      // está deshabilitado.
      if (!isViewingToday()) return 'primary';
      return (!state.shiftStartedAt || state.shiftEndedAt) ? 'primary' : 'bad';
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
      const pretty = type === 'lunch' ? 'Lunch' : 'Break';
      // Si no se está viendo "Hoy", el botón ya está deshabilitado (ver pauseActionDisabled) y su
      // cronómetro dice "Solo en 'Hoy'".
      if (!isViewingToday()) return `Iniciar ${pretty}`;
      if (!state.shiftStartedAt || state.shiftEndedAt) return `Iniciar ${pretty}`;
      if (state.activePause && state.activePause.type === type) return `Terminar ${pretty}`;
      return `Iniciar ${pretty}`;
    }

    function pauseActionDisabled(type) {
      // Estos botones operan sobre el turno real de HOY (state.activePause/pauseHistory), no sobre
      // el día activo.
      if (!isViewingToday()) return true;
      if (state.shiftEndedAt) return true;
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
      if (!isViewingToday()) return 'Iniciar llamada';
      return state.activeCall ? 'Terminar llamada' : 'Iniciar llamada';
    }

    // A diferencia de pauseActionDisabled (Break/Lunch), iniciar una llamada NO exige que ya haya
    // llamadas de ese día para anclar el auto-inicio del turno.
    function callActionDisabled() {
      if (!isViewingToday()) return true;
      // Terminar una llamada ya en curso nunca se bloquea, sin importar el estado del turno — mismo
      // criterio que "Finalizar shift" una vez iniciado.
      if (state.activeCall) return false;
      // Para INICIAR una llamada nueva: si el turno de hoy ya se cerró, no tiene sentido registrar
      // una llamada nueva ese día desde este botón.
      return !!state.shiftEndedAt;
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
        toast("Cambia el día activo a 'Hoy' para usar este control");
        return;
      }
      // Misma defensa para "día libre": el botón ya debería estar deshabilitado en este caso (ver
      // shiftActionDisabled), pero se protege por si se dispara de otra forma. Solo aplica al
      // INICIAR un turno nuevo.
      if (shiftWouldStartNew() && todayIsOff()) {
        toast('Hoy está marcado como día libre en tu horario — no se puede iniciar un turno manualmente. Si trabajaste, pega tus llamadas y la app lo detecta sola.');
        return;
      }
      // Misma defensa para la restricción de los 5 minutos — el botón ya debería estar
      // deshabilitado en este caso, pero se protege por si se dispara de otra forma.
      if (shiftStartTooEarly()) {
        const cfg = dayConfigFor(todayCallDateKey());
        toast(`Muy temprano — puedes iniciar tu turno desde ${SHIFT_START_EARLY_GRACE_MIN} min antes de las ${timeLabel(formatHHMM(cfg.start))}`);
        return;
      }
      if (shiftWouldStartNew()) return startShift();
      // Si hay una llamada activa al momento de finalizar el turno, endShift no la tocaba ni
      // advertía nada.
      if (state.activeCall) {
        appConfirm('Tienes una llamada en curso. Al finalizar el turno se guardará esa llamada con la duración transcurrida hasta ahora y luego se cerrará el turno. ¿Finalizar de todos modos?', () => {
          endCall();
          endShift();
        });
        return;
      }
      return endShift();
    }

    // Si le das a Break/Lunch sin haber dado click en "Iniciar shift" pero ya tienes llamadas
    // importadas hoy, se asume que ya estás trabajando.
    function autoStartShiftFromCalls(silent = false) {
      if (state.shiftStartedAt || state.shiftEndedAt) return false;
      const todayCalls = callsForDay(todayCallDateKey());
      if (!todayCalls.length) return false;
      const firstStart = new Date(Math.min(...todayCalls.map(c => new Date(c.startISO).getTime())));
      state.shiftStartedAt = firstStart.toISOString();
      state.shiftEndedAt = null;
      setEvent('shift', 'Shift iniciado automáticamente', fmtTime(firstStart), 'auto');
      saveStateOnly();
      if (!silent) toast(`Shift iniciado automáticamente desde tu primera llamada (${fmtTime(firstStart)})`);
      return true;
    }

    const ACCIDENTAL_TOGGLE_GRACE_MIN = 5;

    // Se quitó toda la UI que mostraba esto (el chip resumen en "Bloques del día" y la sección de
    // Reportes) — el registro en sí SE CONSERVA a propósito, sin ningún cambio de comportamiento.
    function registerDayInterruption(dayKey, type, gapStartISO, gapEndISO) {
      if (!state.dayInterruptions || typeof state.dayInterruptions !== 'object') state.dayInterruptions = {};
      const normalized = callDateKeyFromValue(dayKey) || dayKey;
      if (!Array.isArray(state.dayInterruptions[normalized])) state.dayInterruptions[normalized] = [];
      state.dayInterruptions[normalized].push({ id: makeLocalId(), type, gapStart: gapStartISO, gapEnd: gapEndISO });
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
        toast("Cambia el día activo a 'Hoy' para usar este control");
        return;
      }
      if (state.shiftEndedAt) return;
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

    function setEvent(type, title, detail, meta = '') {
      state.events.unshift({ id: makeLocalId(), ts: new Date().toISOString(), type, title, detail, meta });
      state.events = state.events.slice(0, 500);
    }

    function startShift() {
      const now = new Date();
      const nowISO = now.toISOString();

      // Si "Finalizar shift" se presionó por accidente (el turno no había terminado de verdad) y se
      // vuelve a dar "Iniciar shift" dentro de la ventana de gracia, esto es una CONTINUACIÓN del
      // mismo turno.
      if (state.shiftStartedAt && state.shiftEndedAt && sameCallDay(state.shiftEndedAt, todayCallDateKey())) {
        const gapMin = (now.getTime() - new Date(state.shiftEndedAt).getTime()) / 60000;
        if (gapMin >= 0 && gapMin <= ACCIDENTAL_TOGGLE_GRACE_MIN) {
          registerDayInterruption(todayCallDateKey(), 'shift', state.shiftEndedAt, nowISO);
          state.shiftEndedAt = null;
          setEvent('shift', 'Shift continuado (interrupción accidental)', fmtTime(now), 'manual');
          saveAll();
          stopShiftAlarm();
          toast(`Turno continuado — interrupción de ${formatMinutes(gapMin)} min registrada`);
          return;
        }
      }

      // endShift solo pone shiftEndedAt y nunca limpia shiftStartedAt: hay que detectar el turno ya
      // cerrado antes de reusarlo.
      const alreadyStarted = !!state.shiftStartedAt && !state.shiftEndedAt;
      state.shiftStartedAt = alreadyStarted ? state.shiftStartedAt : nowISO;
      state.shiftEndedAt = null;
      setEvent('shift', 'Shift iniciado', fmtTime(now), 'manual');
      saveAll();
      // El aviso de "Conéctate ya" ya no tiene razón de seguir sonando — checkShiftAlarm lo
      // apagaría solo en el próximo tick (hasta 1s de retraso), pero apagarlo aquí de inmediato
      // evita ese beep extra.
      stopShiftAlarm();

      // El estimado desde la primera llamada se reemplaza por la hora del click en cuanto se inicia
      // el turno.
      if (!alreadyStarted) {
        const todayCalls = callsForDay(todayCallDateKey());
        if (todayCalls.length) {
          const firstStart = new Date(Math.min(...todayCalls.map(c => new Date(c.startISO).getTime())));
          const lateMin = (now.getTime() - firstStart.getTime()) / 60000;
          if (lateMin > 15) {
            toast(`Shift iniciado — ya tenías llamadas desde las ${fmtTime(firstStart)} (${formatMinutes(lateMin)} min antes). "Conectado" cuenta desde ahora, no desde esa llamada.`);
            return;
          }
        }
      }
      toast('Shift iniciado');
    }

    function endShift() {
      if (!state.shiftStartedAt || state.shiftEndedAt) return;
      if (state.activePause) endPause({ silent: true, deferSave: true });
      const now = new Date().toISOString();
      state.shiftEndedAt = now;
      setEvent('shift', 'Shift terminado', fmtTime(new Date(now)), 'manual');
      saveAll();
      toast('Shift terminado');
    }

    function startPause(type) {
      if (!state.shiftStartedAt || state.shiftEndedAt || state.activePause) return;
      const now = new Date();
      const dayKey = todayCallDateKey();
      const pretty = type === 'lunch' ? 'Lunch' : 'Break';

      // Mismo criterio que startShift: reabrir el MISMO tipo dentro de la ventana de gracia
      // continúa la pausa anterior en vez de crear otra.
      const sameDayOfType = state.pauseHistory.filter(p => p.type === type && sameCallDay(p.endedAt, dayKey));
      let lastClosed = null;
      sameDayOfType.forEach(p => {
        if (!lastClosed || new Date(p.endedAt).getTime() > new Date(lastClosed.endedAt).getTime()) lastClosed = p;
      });
      if (lastClosed) {
        const gapMin = (now.getTime() - new Date(lastClosed.endedAt).getTime()) / 60000;
        if (gapMin >= 0 && gapMin <= ACCIDENTAL_TOGGLE_GRACE_MIN) {
          state.pauseHistory = state.pauseHistory.filter(p => p.id !== lastClosed.id);
          state.activePause = { type, startedAt: lastClosed.startedAt };
          registerDayInterruption(dayKey, type, lastClosed.endedAt, now.toISOString());
          setEvent(type, `${pretty} continuado (interrupción accidental)`, fmtTime(now), 'manual');
          saveAll();
          stopBreakStartAlarm();
          toast(`${pretty} continuado — interrupción de ${formatMinutes(gapMin)} min registrada`);
          return;
        }
      }

      state.activePause = { type, startedAt: now.toISOString() };
      setEvent(type, `${pretty} iniciado`, fmtTime(now), 'manual');
      saveAll();
      // El aviso de "va a empezar" ya no aplica una vez que la pausa arrancó de verdad — se apaga
      // de inmediato en vez de esperar al próximo tick.
      stopBreakStartAlarm();
      toast(`${pretty} iniciado`);
    }

    function endPause(options = {}) {
      if (!state.activePause) return;
      const { silent = false, deferSave = false } = options;
      const now = new Date().toISOString();
      state.pauseHistory.push({ id: makeLocalId(), type: state.activePause.type, startedAt: state.activePause.startedAt, endedAt: now });
      setEvent(state.activePause.type, `${state.activePause.type === 'lunch' ? 'Lunch' : 'Break'} terminado`, fmtTime(new Date(now)), 'manual');
      state.activePause = null;
      // El aviso de "va a terminar" ya no aplica una vez que se cerró la pausa — se apaga de
      // inmediato en vez de esperar al próximo tick.
      stopBreakEndAlarm();
      if (deferSave) saveStateOnly();
      else saveAll();
      if (!silent) toast('Regresaste');
    }

    function toggleCall() {
      // Misma defensa que toggleShift/togglePause: estos botones solo aplican al turno real de hoy,
      // nunca al día seleccionado en "Día activo".
      if (!isViewingToday()) {
        toast("Cambia el día activo a 'Hoy' para usar este control");
        return;
      }
      if (state.activeCall) return endCall();
      return startCall();
    }

    function startCall() {
      if (state.activeCall || state.shiftEndedAt) return;
      const now = new Date();
      // Igual que Break/Lunch (autoStartShiftFromCalls) y pegar llamadas: si no habías dado click
      // en "Iniciar shift" todavía, iniciar una llamada en vivo también lo arranca solo — anclado a
      // AHORA.
      if (!state.shiftStartedAt) {
        state.shiftStartedAt = now.toISOString();
        state.shiftEndedAt = null;
        setEvent('shift', 'Shift iniciado automáticamente', fmtTime(now), 'auto');
      }
      state.activeCall = { startedAt: now.toISOString() };
      saveAll();
      toast('Llamada iniciada');
    }

    // Termina la llamada en curso y la guarda SOLA (ver autoSaveLiveCall) — desde ya no abre ningún
    // modal de confirmación en el caso normal: colgar bloqueaba "Iniciar llamada" hasta resolver
    // ese modal, así que se quitó esa fricción de raíz.
    function endCall() {
      if (!state.activeCall) return;
      const startedAt = state.activeCall.startedAt;
      const endedAt = new Date().toISOString();
      state.activeCall = null;
      // Sin esto, el chip "ACW/Available" en vivo (ver computeCurrentAcwStart) no sabía que la
      // llamada acababa de terminar hasta que se guardaba.
      state.lastCallEndedAt = endedAt;
      saveStateOnly();
      render();
      autoSaveLiveCall(startedAt, endedAt);
    }

    // Barra fija de actividad en vivo ---- A diferencia de endCall (que SIEMPRE guarda la llamada,
    // sola o vía el modal de respaldo), esto descarta la llamada en curso sin dejar ningún rastro.
    function discardActiveCall() {
      if (!state.activeCall) return;
      appConfirm('¿Descartar esta llamada sin guardarla? El tiempo registrado se pierde y no queda ninguna fila en Tabla de llamadas.', () => {
        state.activeCall = null;
        state.lastCallEndedAt = new Date().toISOString();
        saveStateOnly();
        render();
        toast('Llamada descartada');
      });
    }

    // A diferencia de endPause (que SIEMPRE empuja {startedAt, endedAt} a pauseHistory), esto
    // descarta el Break/Lunch en curso sin dejar ningún registro — como si nunca se hubiera
    // iniciado.
    function discardActivePause() {
      if (!state.activePause) return;
      const pretty = state.activePause.type === 'lunch' ? 'Lunch' : 'Break';
      appConfirm(`¿Descartar este ${pretty} sin guardarlo? No quedará registrado en tu historial ni en Adherencia.`, () => {
        state.activePause = null;
        stopBreakStartAlarm();
        stopBreakEndAlarm();
        saveStateOnly();
        render();
        toast(`${pretty} descartado`);
      });
    }

    function liveActivityInfo() {
      if (state.activeCall) {
        return {
          type: 'call',
          label: 'En llamada',
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
          label: isLunch ? 'Lunch' : 'Break',
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
      textTitle.textContent = isLive ? 'En llamada' : 'Comienza una nueva llamada';
      if (mid) mid.style.display = isLive ? '' : 'none';
      if (timerEl && isLive) timerEl.textContent = formatDuration(Date.now() - new Date(state.activeCall.startedAt).getTime());
      if (actions) actions.style.display = isLive ? '' : 'none';
      if (controlsGrid) controlsGrid.style.display = isLive ? 'none' : '';
    }

    // A diferencia de resetDay (borra SOLO el día activo), esto borra TODO lo que la app guarda en
    // este navegador: las 3 llaves de localStorage completas (STORAGE_KEY/CALLS_KEY/SETTINGS_KEY),
    // sin dejar nada.
    function eraseAllData() {
      appConfirm('¿Borrar TODOS los datos del programa? Esto borra permanentemente todas las llamadas, turnos, pausas, horario semanal, metas y tu nombre/emoji guardados en este navegador. No se puede deshacer. La app queda como recién instalada (con el popup de bienvenida de nuevo).', () => {
        try {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(CALLS_KEY);
          localStorage.removeItem(SETTINGS_KEY);
        } catch {}

        state = defaultState();
        calls = [];
        settings = defaultSettings();
        ensureCurrencySettings();

        // Vistas/edición en memoria que ya no tienen a qué apuntar tras el borrado — mismo criterio
        // de limpieza que ya usan otros flujos (ej. resetDay reacomoda activeDayKey).
        weekViewOffset = 0;
        cycleViewOffset = 0;
        scheduleEditDay = 'mon';
        editingGapContext = null;
        editingCallId = null;

        saveAll();
        toast('Todos los datos fueron borrados');
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
        if (toggleEmojiPickerOnboardingBtnReset) { toggleEmojiPickerOnboardingBtnReset.setAttribute('aria-expanded', 'false'); toggleEmojiPickerOnboardingBtnReset.textContent = 'Cambiar emoji'; }
        openModal('onboardingModal');
      });
    }

    function resetDay() {
      const dayKey = getActiveDayKey();
      appConfirm(`¿Reiniciar ${formatCallDayLabel(dayKey)}? Se borran llamadas, pausas, huecos, la nota del día y log de ese día.`, () => {
        calls = calls.filter(c => callDateKeyFromValue(c.callDate) !== dayKey);

        state.events = state.events.filter(e => !sameCallDay(e.ts, dayKey));
        state.pauseHistory = state.pauseHistory.filter(p => !sameCallDay(p.startedAt, dayKey));
        const normalizedDayKey = callDateKeyFromValue(dayKey);
        if (state.gapAnnotations && state.gapAnnotations[normalizedDayKey]) {
          delete state.gapAnnotations[normalizedDayKey];
        }
        if (state.dayNotes && state.dayNotes[normalizedDayKey]) {
          delete state.dayNotes[normalizedDayKey];
        }

        if (dayKey === todayCallDateKey()) {
          state.shiftStartedAt = null;
          state.shiftEndedAt = null;
          state.activePause = null;
          state.activeCall = null;
        }

        // El día activo se queda en el día reiniciado, no salta al día más viejo con llamadas.
        state.activeDayKey = dayKey;

        saveAll();
        toast('Día reiniciado');
      });
    }


    // Clave para detectar llamadas duplicadas. Usa el valor NUMÉRICO de pay (via parseMoney), no el
    // texto crudo — así "$0.72", "0.72" y " $0.72 " se reconocen como el mismo pago.
    function callDedupeKey(c) {
      return `${c.customerId}|${c.callDate}|${c.callStart}|${c.durationMin}|${parseMoney(c.pay).toFixed(2)}|${String(c.billable).toLowerCase()}|${String(c.dropped).toLowerCase()}`;
    }

    function parseCalls(text) {
      const raw = String(text || '').trim();
      if (!raw) return [];
      const lines = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      const headers = ['customer id', 'call date', 'call start', 'duration', 'billable', 'dropped', 'pay'];
      const clean = lines.filter(line => !headers.includes(line.toLowerCase()));
      const rows = [];
      const seen = new Set();

      function addRow(parts) {
        if (!parts || parts.length !== 7) return;
        const [customerId, callDate, callStart, duration, billable, dropped, pay] = parts.map(v => String(v).trim());
        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(callDate)) return;
        if (!/^\d{1,2}:\d{2}\s*[AP]M$/i.test(callStart)) return;
        const dur = Number(duration);
        // Propio sí exporta llamadas de 0 min (entró pero nunca conectó): son un registro real, y
        // el resto de la app ya las contempla (ver stats.zeroCount).
        if (!Number.isFinite(dur) || dur < 0 || dur > MAX_CALL_DURATION_MIN) return;
        const start = toDateFromInputs(callDate, callStart);
        if (!start) return;
        const end = new Date(start.getTime() + dur * 60000);
        const row = {
          id: makeLocalId(),
          customerId: String(customerId),
          callDate,
          callStart,
          durationMin: dur,
          billable,
          dropped,
          pay,
          startISO: start.toISOString(),
          endISO: end.toISOString(),
          countsAsProductive: String(billable).toLowerCase() === 'yes' && String(dropped).toLowerCase() === 'no',
        };
        const key = callDedupeKey(row);
        if (seen.has(key)) return;
        seen.add(key);
        rows.push(row);
      }

      for (const line of clean) {
        const parts = line.split(/\t|\s{2,}|,/).map(s => s.trim()).filter(Boolean);
        if (parts.length === 7) addRow(parts);
      }

      for (let i = 0; i + 6 < clean.length; i++) {
        const block = clean.slice(i, i + 7);
        const looksLike = /^\d+$/.test(block[0]) && /^\d{2}\/\d{2}\/\d{4}$/.test(block[1]) && /^\d{1,2}:\d{2}\s*[AP]M$/i.test(block[2]);
        if (looksLike) addRow(block);
      }

      const chunks = raw.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
      for (const chunk of chunks) {
        const parts = chunk.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
        if (parts.length === 7) addRow(parts);
        if (parts.length === 1) {
          const cols = parts[0].split(/\t|\s{2,}|,/).map(s => s.trim()).filter(Boolean);
          if (cols.length === 7) addRow(cols);
        }
      }
      return rows;
    }

    // Dos intervalos [start, end) se traslapan si cada uno empieza antes de que el otro termine.
    function callsOverlap(a, b) {
      return new Date(a.startISO) < new Date(b.endISO) && new Date(b.startISO) < new Date(a.endISO);
    }

    // Pinta el resumen de filas omitidas al importar (duplicados exactos + traslapes), cada una con
    // su motivo, dentro de #importSkippedSummary — reemplaza el toast-solo-conteo de antes.
    function renderImportSkippedSummary(duplicates, overlaps) {
      const el = document.getElementById('importSkippedSummary');
      if (!el) return;
      const total = duplicates.length + overlaps.length;
      if (!total) {
        el.style.display = 'none';
        el.innerHTML = '';
        return;
      }
      const rowsHtml = [];
      duplicates.forEach(c => {
        rowsHtml.push(`<li>#${escapeHtml(c.customerId)} · ${escapeHtml(c.callDate)} ${escapeHtml(c.callStart)} — Duplicado exacto de una llamada ya guardada (mismo cliente/fecha/hora/duración/pago/billable/dropped)</li>`);
      });
      overlaps.forEach(o => {
        rowsHtml.push(`<li>#${escapeHtml(o.customerId)} · ${escapeHtml(o.callDate)} ${escapeHtml(o.callStart)} — Traslapa con la llamada #${escapeHtml(o.withCustomerId)} (${escapeHtml(o.withCallStart)}) ya guardada</li>`);
      });
      el.innerHTML = `<strong>${total} fila(s) omitida(s) al importar — revisa si de verdad son la misma llamada:</strong><ul style="margin:6px 0 0; padding-left:18px;">${rowsHtml.join('')}</ul>`;
      el.style.display = '';
    }

    function importCalls() {
      const ta = document.getElementById('callInput');
      const parsed = parseCalls(ta.value);
      if (!parsed.length) {
        toast('No se pudo leer la data');
        return;
      }
      const existing = new Set(calls.map(callDedupeKey));
      const importTs = new Date().toISOString();
      // Se conservan las filas descartadas por coincidencia exacta de callDedupeKey (no solo su
      // conteo) para poder listarlas después.
      const skippedDuplicates = [];
      const deduped = parsed
        .filter(c => {
          if (existing.has(callDedupeKey(c))) {
            skippedDuplicates.push(c);
            return false;
          }
          return true;
        })
        .sort((a, b) => new Date(a.startISO) - new Date(b.startISO));

      // No se permite importar una fila que se traslape en el tiempo con una llamada ya guardada o
      // con otra fila del mismo pegado.
      const overlapCheckSet = [...calls];
      const accepted = [];
      // Igual que skippedDuplicates arriba: se guarda con qué llamada ya guardada se traslapó cada
      // fila, no solo el conteo.
      const skippedOverlaps = [];
      let overlapSkipped = 0;
      for (const c of deduped) {
        const overlapsWith = overlapCheckSet.find(existingCall => callsOverlap(existingCall, c));
        if (overlapsWith) {
          overlapSkipped++;
          skippedOverlaps.push({ ...c, withCustomerId: overlapsWith.customerId, withCallStart: overlapsWith.callStart });
          continue;
        }
        overlapCheckSet.push(c);
        accepted.push(c);
      }

      const unique = accepted.map(c => ({ ...c, importedAt: importTs }));
      calls = [...calls, ...unique].sort((a, b) => new Date(a.startISO) - new Date(b.startISO));

      const importedDates = [...new Set(unique.map(c => callDateKeyFromValue(c.callDate)).filter(Boolean))]
        .sort((a, b) => callDateToDate(a) - callDateToDate(b));

      const todayKey = todayCallDateKey();
      const preferredDay = importedDates.includes(todayKey)
        ? todayKey
        : importedDates[importedDates.length - 1] || defaultActiveDayKey();

      if (unique.length) state.activeDayKey = preferredDay;

      ta.value = '';
      const lateCount = unique.filter(c => callImportFlag(c)?.cls === 'imported-late').length;
      const historicCount = unique.filter(c => callImportFlag(c)?.cls === 'imported-historic').length;
      const importNote = lateCount || historicCount
        ? [lateCount ? `${lateCount} tarde(s)` : '', historicCount ? `${historicCount} histórica(s)` : ''].filter(Boolean).join(' · ')
        : 'a tiempo';
      const overlapNote = overlapSkipped ? ` · ${overlapSkipped} traslapada(s) omitida(s)` : '';
      const duplicateNote = skippedDuplicates.length ? ` · ${skippedDuplicates.length} duplicada(s) omitida(s)` : '';
      setEvent('import', 'Llamadas importadas', `${unique.length} fila(s) · ${importNote}${overlapNote}${duplicateNote}`, 'Propio');
      if (unique.length) financeRunAutoFillCascade();
      saveAll();
      // El resumen detallado (con motivo por fila) queda visible dentro del modal en vez de
      // depender solo del toast, que ya desaparece solo.
      renderImportSkippedSummary(skippedDuplicates, skippedOverlaps);
      if (!unique.length && (overlapSkipped || skippedDuplicates.length)) {
        toast(`Ninguna fila nueva — todas se omitieron por duplicado o traslape (${overlapSkipped + skippedDuplicates.length}). Revisa el detalle debajo del cuadro de texto.`);
      } else {
        toast(`${unique.length} llamada(s) importada(s)${overlapNote}${duplicateNote}`);
      }
    }

    // El botón "Limpiar" dentro del modal "Pegar Llamadas" se veía como si limpiara el cuadro de
    // texto donde se pega la data.
    function clearCallInputBox() {
      const ta = document.getElementById('callInput');
      if (ta) ta.value = '';
      toast('Cuadro de texto limpiado');
    }

    function exportJSON() {
      const payload = { state, calls, exportedAt: new Date().toISOString() };
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
        const label = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(now);
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
      return { start, end, label: `Ciclo ${formatCallDayLabel(todayCallDateKey(start))} – ${formatCallDayLabel(todayCallDateKey(end))}` };
    }

    // Un objeto por día del rango (inclusive), con las mismas cifras que ya se ven en
    // Reportes/Resumen semanal para ese día.
    function accountingExportDays(range) {
      const days = [];
      const cursor = new Date(range.start.getFullYear(), range.start.getMonth(), range.start.getDate());
      const endDate = new Date(range.end.getFullYear(), range.end.getMonth(), range.end.getDate());
      let guard = 0;
      while (cursor <= endDate && guard < 400) {
        const dayKey = todayCallDateKey(cursor);
        const dayCalls = [...callsForDay(dayKey)].sort((a, b) => new Date(a.startISO) - new Date(b.startISO));
        const stats = importedCallStats(dayCalls, dayKey);
        const adherence = dayIsEffectivelyOff(dayKey) ? null : dayAdherence(dayKey);
        days.push({ dayKey, dayCalls, stats, adherence, productive: productiveMinutesForDay(dayKey) });
        cursor.setDate(cursor.getDate() + 1);
        guard++;
      }
      return days;
    }

    function csvField(value) {
      const s = String(value ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }

    function exportAccountingCsv() {
      const range = accountingExportRange();
      // BUG-024 — Ver comentario junto a accountingExportRange: en modo 'custom' sin ambas fechas llenas, la función devuelve `null` en vez de un fallback silencioso a "hoy"
      if (!range) {
        toast('Elige las fechas Desde y Hasta antes de exportar');
        return;
      }
      const days = accountingExportDays(range);
      if (!days.length) {
        toast('Elige un rango de fechas válido primero.');
        return;
      }
      const rows = [];
      rows.push(['Resumen por día', range.label].map(csvField).join(','));
      rows.push(['Fecha', 'Llamadas', 'Productivo (min)', 'Adherencia (%)', 'Ganancias ($)'].map(csvField).join(','));
      let totalCalls = 0, totalProductive = 0, totalEarnings = 0;
      days.forEach(d => {
        totalCalls += d.dayCalls.length;
        totalProductive += d.productive;
        totalEarnings += d.stats.earnings;
        rows.push([
          formatCallDayLabel(d.dayKey),
          d.dayCalls.length,
          formatMinutes(d.productive),
          d.adherence ? d.adherence.scorePct : '',
          d.stats.earnings.toFixed(2),
        ].map(csvField).join(','));
      });
      rows.push(['Total', totalCalls, formatMinutes(totalProductive), '', totalEarnings.toFixed(2)].map(csvField).join(','));
      rows.push('');
      rows.push(['Detalle de llamadas'].map(csvField).join(','));
      rows.push(['Fecha', 'Customer ID', 'Inicio', 'Duración (min)', 'Billable', 'Dropped', 'Pago ($)'].map(csvField).join(','));
      days.forEach(d => {
        d.dayCalls.forEach(c => {
          rows.push([d.dayKey, c.customerId, c.callStart, c.durationMin, c.billable, c.dropped, parseMoney(c.pay).toFixed(2)].map(csvField).join(','));
        });
      });
      // BOM al inicio para que Excel abra los acentos (á/é/ó...) sin romperlos.
      const csvContent = '\uFEFF' + rows.join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ganancias_${range.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast('CSV exportado');
    }

    // Sin librerías externas (mismo criterio "cero dependencias" que ya usa el resto de la app — SVG inline en vez de fuentes de íconos, Web Audio sintetizado en vez de archivos de sonido):
    function exportAccountingPdf() {
      const range = accountingExportRange();
      // BUG-024 — Ver comentario junto a accountingExportRange() y en
      // exportAccountingCsv(): mismo aviso explícito en vez de un fallback
      // silencioso a "hoy" en modo 'custom' sin fechas.
      if (!range) {
        toast('Elige las fechas Desde y Hasta antes de exportar');
        return;
      }
      const days = accountingExportDays(range);
      if (!days.length) {
        toast('Elige un rango de fechas válido primero.');
        return;
      }
      let totalCalls = 0, totalProductive = 0, totalEarnings = 0;
      const summaryRowsHtml = days.map(d => {
        totalCalls += d.dayCalls.length;
        totalProductive += d.productive;
        totalEarnings += d.stats.earnings;
        return `<tr><td>${escapeHtml(formatCallDayLabel(d.dayKey))}</td><td>${d.dayCalls.length}</td><td>${escapeHtml(formatMinutes(d.productive))}</td><td>${d.adherence ? d.adherence.scorePct + '%' : '—'}</td><td>${escapeHtml(money(d.stats.earnings))}</td></tr>`;
      }).join('');
      const detailRowsHtml = days.map(d => d.dayCalls.map(c => `<tr><td>${escapeHtml(d.dayKey)}</td><td>${escapeHtml(c.customerId)}</td><td>${escapeHtml(c.callStart)}</td><td>${c.durationMin}</td><td>${escapeHtml(c.billable)}</td><td>${escapeHtml(c.dropped)}</td><td>${escapeHtml(money(parseMoney(c.pay)))}</td></tr>`).join('')).join('') || '<tr><td colspan="7" style="text-align:center;color:#777;">Sin llamadas en este período.</td></tr>';
      const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><title>Reporte de ganancias — ${escapeHtml(range.label)}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; padding: 28px; color: #171717; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .sub { color: #555; font-size: 12px; margin: 0 0 18px; }
  h2 { font-size: 13.5px; margin: 22px 0 6px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; font-size: 11px; text-align: left; }
  th { background: #f0f0f0; }
  tfoot td { font-weight: 800; background: #fafafa; }
  .print-btn { margin: 8px 0 4px; padding: 9px 16px; border-radius: 8px; border: 1px solid #999; background: #fff; font-weight: 700; cursor: pointer; }
  @media print { .print-btn { display: none; } }
</style></head><body>
<h1>Reporte de ganancias</h1>
<p class="sub">${escapeHtml(range.label)} · generado el ${escapeHtml(fmtDate(new Date()))}</p>
<button class="print-btn" onclick="window.print()">Imprimir / Guardar como PDF</button>
<h2>Resumen por día</h2>
<table><thead><tr><th>Fecha</th><th>Llamadas</th><th>Productivo</th><th>Adherencia</th><th>Ganancias</th></tr></thead>
<tbody>${summaryRowsHtml}</tbody>
<tfoot><tr><td>Total</td><td>${totalCalls}</td><td>${escapeHtml(formatMinutes(totalProductive))}</td><td></td><td>${escapeHtml(money(totalEarnings))}</td></tr></tfoot>
</table>
<h2>Detalle de llamadas</h2>
<table><thead><tr><th>Fecha</th><th>Customer ID</th><th>Inicio</th><th>Min</th><th>Billable</th><th>Dropped</th><th>Pago</th></tr></thead>
<tbody>${detailRowsHtml}</tbody></table>
</body></html>`;
      const win = window.open('', '_blank');
      if (!win) {
        toast('El navegador bloqueó la ventana nueva — habilita ventanas emergentes para exportar a PDF.');
        return;
      }
      win.document.write(html);
      win.document.close();
      toast('Reporte listo — usa "Imprimir / Guardar como PDF" en la pestaña nueva');
    }

    function syncAccountingExportPeriodUI() {
      const row = document.getElementById('accountingExportPeriodRow');
      const customRow = document.getElementById('accountingExportCustomRow');
      const select = document.getElementById('accountingExportPeriodInput');
      if (row) row.querySelectorAll('[data-accounting-period]').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-accounting-period') === accountingExportPeriod);
      });
      if (customRow) customRow.style.display = accountingExportPeriod === 'custom' ? '' : 'none';
      if (select) select.value = accountingExportPeriod;
    }

    // Contraparte de exportJSON: valida que el JSON tenga la forma exacta que exportJSON produce ({ state: {...}, calls: [...], exportedAt }).
    function validateImportPayload(payload) {
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return { ok: false, error: 'El archivo no contiene un objeto JSON válido.' };
      }
      if (!payload.state || typeof payload.state !== 'object' || Array.isArray(payload.state)) {
        return { ok: false, error: 'Falta el campo "state" (o no es válido) en el archivo.' };
      }
      if (!Array.isArray(payload.calls)) {
        return { ok: false, error: 'Falta el campo "calls" (o no es una lista) en el archivo.' };
      }
      return { ok: true };
    }

    // Reemplaza calls/state en memoria por los del archivo (ya validado) y los persiste. A propósito NO se toca `settings` (horario semanal, metas, tasa, moneda, nombre/emoji)
    function applyImportedPayload(payload) {
      state = normalizeStateObject(payload.state);
      calls = normalizeCallsArray(payload.calls);
      // Mismo criterio que importCalls(): salta a un día con llamadas reales (hoy si tiene, si no la más reciente importada) — sin esto, el día activo se quedaba en el que traía guardado el respaldo, que podía no tener ninguna llamada y daba la impresión de que la importación no hizo nada.
      const importedDates = [...new Set(calls.map(c => callDateKeyFromValue(c.callDate)).filter(Boolean))]
        .sort((a, b) => callDateToDate(a) - callDateToDate(b));
      const todayKey = todayCallDateKey();
      if (importedDates.length) {
        state.activeDayKey = importedDates.includes(todayKey) ? todayKey : importedDates[importedDates.length - 1];
      } else if (!state.activeDayKey) {
        state.activeDayKey = defaultActiveDayKey();
      }
      saveAll();
    }

    function handleImportJsonFile(e) {
      const input = e.target;
      const file = input.files && input.files[0];
      // Se limpia de inmediato para poder volver a elegir el MISMO archivo después (ej. si se cancela la confirmación y se quiere reintentar)
      input.value = '';
      if (!file) return;
      // BUG-011 (QA v361) — Rechazo temprano por tamaño, ANTES de leer el
      // archivo — ver comentario junto a MAX_IMPORT_JSON_BYTES arriba.
      if (file.size > MAX_IMPORT_JSON_BYTES) {
        toast(`Ese archivo pesa demasiado (${(file.size / (1024 * 1024)).toFixed(1)}MB, máximo ${Math.round(MAX_IMPORT_JSON_BYTES / (1024 * 1024))}MB) — no parece un backup válido de esta app. Revisa que sea el archivo correcto.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        let payload;
        try {
          payload = JSON.parse(String(reader.result || ''));
        } catch {
          toast('Ese archivo no es JSON válido.');
          return;
        }
        const check = validateImportPayload(payload);
        if (!check.ok) {
          toast(check.error);
          return;
        }
        const callCount = payload.calls.length;
        const exportedDate = payload.exportedAt ? new Date(payload.exportedAt) : null;
        const exportedLabel = exportedDate && !Number.isNaN(exportedDate.getTime())
          ? `${fmtDate(exportedDate)}, ${fmtTime(exportedDate)}`
          : 'fecha desconocida';
        appConfirm(`¿Importar este archivo (exportado el ${exportedLabel} · ${callCount} llamada(s))? Esto reemplaza TODAS tus llamadas, turnos y pausas actuales por las del archivo. Tu horario semanal y tus metas no se tocan. Esta acción no se puede deshacer.`, () => {
          applyImportedPayload(payload);
          toast(`${callCount} llamada(s) importada(s) desde el archivo`);
        });
      };
      reader.onerror = () => toast('No se pudo leer el archivo.');
      reader.readAsText(file);
    }


    function formatGoalFields() {
      const minInput = document.getElementById('productiveGoalInput');
      const usdInput = document.getElementById('earningsGoalInput');
      const nameInput = document.getElementById('userNameInput');
      const emojiInput = document.getElementById('userEmojiInput');
      const rateInput = document.getElementById('rateInput');
      const exchangeInput = document.getElementById('exchangeRateInput');
      const currencyInput = document.getElementById('currencyLabelInput');
      // Los 3 campos de meta muestran la meta EFECTIVA del día activo (puede
      // ser un override de ese día, ver effectiveDailyGoal).
      const activeDayGoal = effectiveDailyGoal(getActiveDayKey());
      if (!pendingGoalChange && document.activeElement !== minInput) minInput.value = formatMinutes(activeDayGoal.min);
      if (!pendingGoalChange && document.activeElement !== usdInput) usdInput.value = activeDayGoal.usd.toFixed(2);
      const goalDayOverrideNote = document.getElementById('goalDayOverrideNote');
      const goalDayOverrideNoteText = document.getElementById('goalDayOverrideNoteText');
      if (goalDayOverrideNote && goalDayOverrideNoteText) {
        if (activeDayGoal.isOverride) {
          const activeDayKeyForNote = getActiveDayKey();
          const dayLabel = activeDayKeyForNote === todayCallDateKey() ? 'hoy' : formatCallDayLabel(activeDayKeyForNote);
          goalDayOverrideNoteText.textContent = `Meta especial solo para ${dayLabel}. Tu meta general sigue en ${formatMinutes(Number(settings.productiveGoalMin) || 0)} min · ${money(Number(settings.earningsGoal) || 0)}${convertedAmountText(Number(settings.earningsGoal) || 0) ? ` (${convertedAmountText(Number(settings.earningsGoal) || 0)})` : ''}.`;
          goalDayOverrideNote.style.display = '';
        } else {
          goalDayOverrideNote.style.display = 'none';
        }
      }
      if (nameInput && document.activeElement !== nameInput) nameInput.value = String(settings.userName || '');
      if (emojiInput && document.activeElement !== emojiInput) emojiInput.value = String(settings.userEmoji || '');
      if (rateInput && document.activeElement !== rateInput) rateInput.value = Number(settings.rate || RATE).toFixed(2);
      if (exchangeInput && document.activeElement !== exchangeInput) exchangeInput.value = Number(settings.exchangeRate || 0).toFixed(2);
      if (currencyInput && document.activeElement !== currencyInput) currencyInput.value = String(settings.currencyLabel || '');
      // Pedido del usuario: "Meta en tu moneda" en el modal Metas — oculto hasta que haya tasa de cambio Y símbolo de moneda configurados (mismo criterio que ya usa convertedAmountText para ocultar el helper "≈ L..." del header).
      const goalCurrencyField = document.getElementById('goalCurrencyField');
      const goalCurrencyInput = document.getElementById('goalCurrencyInput');
      const goalCurrencyLabelEl = document.getElementById('goalCurrencyLabel');
      const currencyLabelTrimmed = String(settings.currencyLabel || '').trim();
      const hasCurrency = Number(settings.exchangeRate) > 0 && !!currencyLabelTrimmed;
      if (goalCurrencyField) goalCurrencyField.style.display = hasCurrency ? '' : 'none';
      if (hasCurrency) {
        if (goalCurrencyLabelEl) goalCurrencyLabelEl.textContent = `Meta en ${currencyLabelTrimmed}`;
        if (goalCurrencyInput && !pendingGoalChange && document.activeElement !== goalCurrencyInput) {
          goalCurrencyInput.value = currencyCeilFromUsdAmount(activeDayGoal.usd, Number(settings.exchangeRate)).toFixed(2);
        }
      }
      syncEmojiPickerSelection('emojiPickerMetas', String(settings.userEmoji || ''));
      // Ver comentario junto a ".goals-emoji-circle" en el CSS: círculo grande de solo lectura en la cabecera de "Tu perfil"
      const goalsEmojiPreview = document.getElementById('goalsEmojiPreview');
      if (goalsEmojiPreview) goalsEmojiPreview.textContent = String(settings.userEmoji || '').trim() || DEFAULT_USER_EMOJI;

      // Pedido del usuario: Ciclo de pago se movió de Horario a Metas (es
      // dinero, no horario) — mismo criterio de sincronización que ya usaba
      // en Horario: settings globales, no dependen del día activo.
      ensureCurrencySettings();
      const cycleAnchorInput = document.getElementById('cycleAnchorInput');
      const cyclePayOffsetInput = document.getElementById('cyclePayOffsetInput');
      if (cycleAnchorInput && document.activeElement !== cycleAnchorInput) cycleAnchorInput.value = settings.cycleAnchorDate;
      if (cyclePayOffsetInput && document.activeElement !== cyclePayOffsetInput) cyclePayOffsetInput.value = settings.cyclePayOffsetDays;
      // v328 — Meta del ciclo actual, editable también desde aquí (ver
      // comentario junto a cycleGoalOverrides en defaultSettings()).
      const cycleGoalInput = document.getElementById('cycleGoalInput');
      if (cycleGoalInput && document.activeElement !== cycleGoalInput) cycleGoalInput.value = effectiveCycleGoal(0).toFixed(2);
    }

    function formatHHMM(value) {
      const raw = String(value || '').trim();
      const match = raw.match(/^(\d{1,2}):(\d{2})$/);
      if (!match) return '07:00';
      const hh = String(Math.max(0, Math.min(23, Number(match[1])))).padStart(2, '0');
      const mm = String(Math.max(0, Math.min(59, Number(match[2])))).padStart(2, '0');
      return `${hh}:${mm}`;
    }

    function timeLabel(value) {
      const normalized = formatHHMM(value);
      const [h, m] = normalized.split(':').map(Number);
      const suffix = h >= 12 ? 'PM' : 'AM';
      const hour12 = h % 12 || 12;
      return `${pad(hour12)}:${pad(m)} ${suffix}`;
    }

    function timeLabelFromDate(date) {
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
      const plannedStartMin = toMinutes(formatHHMM(cfg.start));
      const actualStartMin = bounds.start.getHours() * 60 + bounds.start.getMinutes();
      const delay = actualStartMin - plannedStartMin;
      if (delay <= 0) return planned;

      const toHHMM = (mins) => { const m = ((mins % 1440) + 1440) % 1440; return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; };
      return planned.map(slot => ({
        ...slot,
        start: toHHMM(toMinutes(slot.start) + delay),
        end: toHHMM(toMinutes(slot.end) + delay),
      }));
    }

    let scheduleEditDay = 'mon';
    // Pedido del usuario: "Ajustar turno completo" (ver .sched-offset-block en el HTML/CSS) — cuánto se va a mover el turno la próxima vez que se toque "Aplicar a todos", en minutos (positivo = más tarde, negativo = más temprano).
    let scheduleOffsetMin = 0;
    // BUG-013 (QA ) — Pedido del usuario: el stepper "Ajustar turno completo" no tenía límite superior/inferior — hacer click muchas veces en "+" (o "-") podía acumular un offset enorme (ej. +30h) sin ningún aviso.
    const SCHEDULE_OFFSET_LIMIT_MIN = 720;

    // "+1:00" / "-0:30" / "+0:00" — mismo formato que ya usa el resto de la app para horas (ver formatDuration), pero con signo explícito y sin segundos, ya que aquí el usuario razona en pasos de 15 min.
    function formatScheduleOffsetLabel(mins) {
      const sign = mins < 0 ? '-' : '+';
      const abs = Math.abs(mins);
      const h = Math.floor(abs / 60);
      const m = abs % 60;
      return `${sign}${h}:${pad(m)}`;
    }

    function syncScheduleOffsetUI() {
      const valueEl = document.getElementById('scheduleOffsetValue');
      if (valueEl) valueEl.textContent = formatScheduleOffsetLabel(scheduleOffsetMin);
    }

    // Mueve Inicio/Fin del turno Y todos los bloques del formulario por `scheduleOffsetMin` minutos — mismo desplazamiento para todo, así que el orden y la duración de cada bloque no cambian, solo su hora.
    function applyScheduleOffset() {
      if (!scheduleOffsetMin) {
        toast('Elige cuánto ajustar el turno antes de aplicar.');
        return;
      }
      const startInput = document.getElementById('dayStartInput');
      const endInput = document.getElementById('dayEndInput');
      if (startInput) startInput.value = minutesToHHMM(toMinutes(formatHHMM(startInput.value)) + scheduleOffsetMin);
      if (endInput) endInput.value = minutesToHHMM(toMinutes(formatHHMM(endInput.value)) + scheduleOffsetMin);

      const current = readBlocksFromEditor();
      if (!current.length) {
        toast('No hay bloques que ajustar en este día.');
        return;
      }
      const shifted = current.map(b => ({ ...b, start: minutesToHHMM(toMinutes(b.start) + scheduleOffsetMin) }));
      renderBlocksEditor(shifted);
      toast(`Turno ajustado ${formatScheduleOffsetLabel(scheduleOffsetMin)} — recuerda "Guardar día" para confirmar`);
      scheduleOffsetMin = 0;
      syncScheduleOffsetUI();
    }

    // Pedido del usuario: el editor de Horario ahora tiene 2 modos. 'template' (default, comportamiento de siempre): edita la plantilla recurrente Lunes-Domingo (settings.weeklySchedule). 'week':
    let scheduleViewMode = 'template';
    let scheduleWeekOffset = 0;

    function scheduleWeekStartDate(offset = scheduleWeekOffset) {
      const base = startOfCycleWeek(new Date());
      return new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset * 7);
    }

    function scheduleWeekKeyForOffset(offset = scheduleWeekOffset) {
      return weekStartKeyFromDate(scheduleWeekStartDate(offset));
    }

    function scheduleWeekIsPast(offset = scheduleWeekOffset) {
      return isScheduleWeekPast(scheduleWeekStartDate(offset));
    }

    function scheduleWeekOverride(offset = scheduleWeekOffset) {
      const key = scheduleWeekKeyForOffset(offset);
      return (settings.scheduleOverridesByWeek && settings.scheduleOverridesByWeek[key]) || null;
    }

    function scheduleWeekHasCustom(offset = scheduleWeekOffset) {
      return !!scheduleWeekOverride(offset);
    }

    // Clona la plantilla actual (ya migrada/normalizada por ensureWeeklySchedule) como punto de partida de un override nuevo
    function cloneWeeklyScheduleForOverride() {
      ensureWeeklySchedule();
      const out = {};
      WEEKDAYS.forEach(k => { out[k] = JSON.parse(JSON.stringify(settings.weeklySchedule[k])); });
      return out;
    }

    function ensureScheduleWeekOverride(offset = scheduleWeekOffset) {
      const key = scheduleWeekKeyForOffset(offset);
      if (!settings.scheduleOverridesByWeek) settings.scheduleOverridesByWeek = {};
      if (!settings.scheduleOverridesByWeek[key]) settings.scheduleOverridesByWeek[key] = cloneWeeklyScheduleForOverride();
      return settings.scheduleOverridesByWeek[key];
    }

    function removeScheduleWeekOverride(offset = scheduleWeekOffset) {
      const key = scheduleWeekKeyForOffset(offset);
      if (settings.scheduleOverridesByWeek) delete settings.scheduleOverridesByWeek[key];
    }

    // Objeto {mon..sun} sobre el que se está leyendo/escribiendo ahora mismo — la plantilla en modo 'template', o el override de la semana actual en modo 'week' (se crea si todavía no existe, salvo que la semana ya esté protegida por pasada
    function activeScheduleTarget({ createIfMissing = false } = {}) {
      if (scheduleViewMode === 'template') {
        ensureWeeklySchedule();
        return settings.weeklySchedule;
      }
      const existing = scheduleWeekOverride(scheduleWeekOffset);
      if (existing) return existing;
      if (createIfMissing && !scheduleWeekIsPast(scheduleWeekOffset)) return ensureScheduleWeekOverride(scheduleWeekOffset);
      // Semana sin personalizar (o ya pasada, protegida): se devuelve una vista de solo-lectura basada en la plantilla, sin crear ni guardar nada
      ensureWeeklySchedule();
      return settings.weeklySchedule;
    }

    function renderDayTabs() {
      const wrap = document.getElementById('scheduleDayTabs');
      if (!wrap) return;
      const target = activeScheduleTarget();
      wrap.innerHTML = WEEKDAYS.map(k => {
        const active = k === scheduleEditDay;
        const off = !target[k] || target[k].off;
        return `<button class="day-tab ${active ? 'active' : ''} ${off ? 'off' : ''}" data-day="${k}" type="button">${WEEKDAY_LABELS_SHORT[k]}</button>`;
      }).join('');
      wrap.querySelectorAll('.day-tab').forEach(btn => {
        btn.addEventListener('click', () => {
          const nextDay = btn.getAttribute('data-day');
          // Clickear el tab que YA está activo no debe hacer nada. Antes esto igual llamaba a syncShiftModalFields, que relee el horario guardado y sobreescribe el formulario — descartando en silencio cualquier cambio sin guardar (ej.
          if (nextDay === scheduleEditDay) return;
          // Si hay cambios sin guardar en el día actual, se avisa antes de cambiar de tab y perderlos — mismo patrón de confirmación que ya usa el resto de la app (appConfirm).
          if (scheduleFormIsDirty()) {
            appConfirm(`Tienes cambios sin guardar en ${WEEKDAY_LABELS[scheduleEditDay]}. ¿Descartarlos y cambiar a ${WEEKDAY_LABELS[nextDay]}?`, () => {
              scheduleEditDay = nextDay;
              syncShiftModalFields();
            });
            return;
          }
          scheduleEditDay = nextDay;
          syncShiftModalFields();
        });
      });
    }

    // Pedido del usuario: unificar Trabajo/Break/Lunch en UNA sola lista de bloques en Horario — cada fila tiene Tipo (selector) + inicio + min, todos editables/agregables/eliminables exactamente igual, sin importar el tipo.
    const BLOCK_TYPE_LABELS = { work: 'Trabajo', break: 'Break', lunch: 'Lunch' };

    // Pedido del usuario: Meta de Productividad configurable POR BLOQUE de Trabajo (reemplaza al viejo ratio global de "Margen"). Esta función arma la forma CANÓNICA de un bloque para comparar/guardar
    function normalizeBlockForCompare(b) {
      const type = BLOCK_TYPE_LABELS[String(b && b.type || '').toLowerCase()] ? String(b.type).toLowerCase() : 'work';
      const base = { type, start: formatHHMM((b && b.start) || '00:00'), dur: Math.max(0, Number(b && b.dur) || 0) };
      if (type === 'work') base.goalMin = Math.max(0, Number(b && b.goalMin) || 0);
      return base;
    }

    // Pedido del usuario (rediseño 100% visual de "Horario", timeline de bloques): ícono + subtítulo por tipo, puramente decorativos
    const BLOCK_TIMELINE_META = {
      work: { icon: iconHtml('briefcase'), subtitle: 'Enfoque y productividad' },
      break: { icon: iconHtml('coffee'), subtitle: 'Descanso corto' },
      lunch: { icon: iconHtml('utensils'), subtitle: 'Almuerzo / Descanso largo' },
    };

    // Duración legible ("2h 10m" / "45 min" / "1h") para la píldora de la tarjeta
    function formatBlockDurationLabel(mins) {
      const total = Math.max(0, Math.round(Number(mins) || 0));
      const h = Math.floor(total / 60);
      const m = total % 60;
      if (h <= 0) return `${m} min`;
      if (m === 0) return `${h}h`;
      return `${h}h ${m}m`;
    }

    function renderBlocksEditor(blocks) {
      const list = document.getElementById('blocksEditorList');
      if (!list) return;
      const arr = Array.isArray(blocks) ? blocks : [];
      list.innerHTML = arr.map((b, i) => {
        const type = BLOCK_TYPE_LABELS[String(b?.type || '').toLowerCase()] ? String(b.type).toLowerCase() : 'work';
        // Pedido del usuario: mostrar "Inicio" + "Fin" (hora) en vez de "Inicio" + "Min" (duración)
        const startVal = formatHHMM(b?.start || '09:00');
        const durVal = Number(b?.dur) || 0;
        const endVal = minutesToHHMM(toMinutes(startVal) + durVal);
        // Pedido del usuario: Meta de Productividad EN MINUTOS por cada bloque de Trabajo — campo nuevo, visible solo cuando Tipo = Trabajo (oculto para Break/Lunch, que no tienen este concepto).
        const rawGoalMin = Number(b?.goalMin);
        const goalVal = (Number.isFinite(rawGoalMin) && rawGoalMin >= 0) ? rawGoalMin : durVal;
        // Ver comentario junto a BLOCK_TIMELINE_META/ formatBlockDurationLabel arriba: `meta`/`durationLabel` son solo para pintar la tarjeta (ícono, subtítulo, píldora de duración)
        const meta = BLOCK_TIMELINE_META[type] || BLOCK_TIMELINE_META.work;
        const durationLabel = formatBlockDurationLabel(durVal);
        // Ver comentario junto a `.sched-tl-hour` en el CSS: la hora de inicio se repite aquí como texto suelto a la izquierda de la línea/punto conector
        return `
        <div class="block-row sched-tl-item" data-block-row="${i}" data-block-type="${type}">
          <div class="sched-tl-hour" aria-hidden="true">${startVal}</div>
          <div class="sched-tl-rail" aria-hidden="true"><span class="sched-tl-dot"></span></div>
          <div class="sched-tl-card">
            <div class="sched-tl-card-top">
              <span class="sched-tl-icon">${meta.icon}</span>
              <div class="sched-tl-titles">
                <select class="alert-select block-type-input sched-tl-type-select">
                  <option value="work" ${type === 'work' ? 'selected' : ''}>Trabajo</option>
                  <option value="break" ${type === 'break' ? 'selected' : ''}>Break</option>
                  <option value="lunch" ${type === 'lunch' ? 'selected' : ''}>Lunch</option>
                </select>
                <div class="sched-tl-subtitle">${meta.subtitle}</div>
              </div>
              <div class="sched-tl-time-inline">
                <input type="time" class="block-start-input sched-tl-time-input" inputmode="numeric" value="${startVal}"/>
                <span class="sched-tl-time-sep" aria-hidden="true">—</span>
                <input type="time" class="block-end-input sched-tl-time-input" inputmode="numeric" value="${endVal}"/>
              </div>
              <span class="sched-tl-duration">${durationLabel}</span>
              <span class="sched-tl-handle" aria-hidden="true" title="Orden (informativo)">⋮⋮</span>
              <button type="button" class="gap-edit-btn block-remove-btn sched-tl-remove" data-remove-block="${i}" aria-label="Eliminar bloque ${i + 1}"><svg class="ic-svg" viewBox="0 0 24 24" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div class="field block-goal-field sched-tl-goal" style="${type === 'work' ? '' : 'display:none;'}">
              <label>Meta productiva (min)</label>
              <input type="number" class="block-goal-input" inputmode="numeric" min="0" step="1" value="${goalVal}"/>
            </div>
          </div>
        </div>
      `;
      }).join('') || '<div class="note" style="margin:0;">Sin bloques configurados. Usa "+ Agregar bloque" para empezar (Trabajo también es un bloque explícito ahora).</div>';
    }

    // Lee todas las filas .block-row actualmente en el DOM (en el mismo orden en que se renderizaron) y arma el arreglo `blocks` — reemplaza a los editores separados de Break/Lunch que había antes. Pedido del usuario:
    function readBlocksFromEditor() {
      const rows = document.querySelectorAll('#blocksEditorList .block-row');
      return Array.from(rows).map(row => {
        const typeInput = row.querySelector('.block-type-input');
        const startInput = row.querySelector('.block-start-input');
        const endInput = row.querySelector('.block-end-input');
        const goalInput = row.querySelector('.block-goal-input');
        const type = BLOCK_TYPE_LABELS[typeInput ? typeInput.value : ''] ? typeInput.value : 'work';
        const start = formatHHMM(startInput ? startInput.value : '09:00');
        const end = formatHHMM(endInput ? endInput.value : start);
        const dur = Math.max(0, toMinutes(end) - toMinutes(start));
        return normalizeBlockForCompare({ type, start, dur, goalMin: goalInput ? goalInput.value : 0 });
      });
    }

    // BUG-005 (QA ) — Antes, un bloque con Fin <= Inicio (cruza medianoche, ej. 22:00–06:00, o Fin igual a Inicio por error de tecleo) se descartaba EN SILENCIO:
    function blockRowsCrossingMidnight() {
      const rows = document.querySelectorAll('#blocksEditorList .block-row');
      const offenders = [];
      Array.from(rows).forEach((row, i) => {
        const typeInput = row.querySelector('.block-type-input');
        const startInput = row.querySelector('.block-start-input');
        const endInput = row.querySelector('.block-end-input');
        if (!startInput || !endInput) return;
        const start = formatHHMM(startInput.value);
        const end = formatHHMM(endInput.value);
        if (toMinutes(end) <= toMinutes(start)) {
          const type = BLOCK_TYPE_LABELS[typeInput ? typeInput.value : ''] ? typeInput.value : 'work';
          offenders.push({ index: i, typeLabel: BLOCK_TYPE_LABELS[type], start, end });
        }
      });
      return offenders;
    }

    function blockCrossingMidnightMessage(offenders) {
      const first = offenders[0];
      const extra = offenders.length > 1 ? ` (y ${offenders.length - 1} más)` : '';
      return `${first.typeLabel} ${timeLabel(first.start)}–${timeLabel(first.end)} cruza la medianoche${extra} — todavía no se soporta. Divide el bloque en dos (ej. ${timeLabel(first.start)}–11:59 PM y 12:00–${timeLabel(first.end)} AM del día siguiente) o ajusta la hora.`;
    }

    // "+ Agregar bloque": toma lo que ya está en el formulario (para no perder ediciones a medio hacer en filas existentes) y le agrega una fila nueva al final. Pedido del usuario :

    // Pedido del usuario ("qué más sería buena idea que se hiciera automático al agregar un bloque"): antes Tipo/Duración del bloque nuevo eran SIEMPRE fijos (Break, 15 min), sin importar qué venía antes ni cuánto turno quedaba

    // Tipo sugerido para el próximo bloque — ver comentario de v289 arriba
    // para el criterio completo.
    function suggestNextBlockType(current, lastEndingBlock, newStart) {
      if (!current.length || !lastEndingBlock) return 'work';
      if (lastEndingBlock.type !== 'work') return 'work';
      const hasLunch = current.some(b => b.type === 'lunch');
      if (!hasLunch) {
        const dayStartVal = document.getElementById('dayStartInput')?.value;
        const dayEndVal = document.getElementById('dayEndInput')?.value;
        if (dayStartVal && dayEndVal) {
          const startMin = toMinutes(formatHHMM(dayStartVal));
          const endMin = toMinutes(formatHHMM(dayEndVal));
          if (endMin > startMin) {
            const midpointMin = startMin + (endMin - startMin) / 2;
            if (toMinutes(newStart) >= midpointMin) return 'lunch';
          }
        }
      }
      return 'break';
    }

    // Duración sugerida para el próximo bloque — ver comentario de v289
    // arriba para el criterio completo (tope de 130 min en Trabajo, y
    // recorte para no sugerir pasarse del fin del turno).
    function suggestNextBlockDuration(type, newStart) {
      const dayEndVal = document.getElementById('dayEndInput')?.value;
      const dayEndMin = dayEndVal ? toMinutes(formatHHMM(dayEndVal)) : null;
      const remainingMin = dayEndMin !== null ? dayEndMin - toMinutes(newStart) : null;
      let dur = type === 'lunch' ? 50 : type === 'break' ? 15 : 130;
      if (remainingMin !== null && remainingMin > 0) dur = Math.min(dur, remainingMin);
      return dur;
    }

    function addBlockRow() {
      const current = readBlocksFromEditor();
      let newStart = '09:00';
      let lastEndingBlock = null;
      if (current.length) {
        let maxEnd = -Infinity;
        current.forEach(b => {
          const end = toMinutes(b.start) + b.dur;
          if (end > maxEnd) { maxEnd = end; lastEndingBlock = b; }
        });
        newStart = minutesToHHMM(maxEnd);
      }
      const type = suggestNextBlockType(current, lastEndingBlock, newStart);
      const dur = suggestNextBlockDuration(type, newStart);
      current.push({ type, start: newStart, dur });
      renderBlocksEditor(current);

      // Pedido del usuario: si la lista de bloques ya es larga, el bloque recién agregado (siempre al final) puede caer fuera de la vista — se desliza la pantalla hasta él. `block:
      const newRow = document.querySelector(`#blocksEditorList .block-row[data-block-row="${current.length - 1}"]`);
      if (newRow && newRow.scrollIntoView) {
        newRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    // Eliminar una fila: se relee el estado actual del formulario (para no perder ediciones de las OTRAS filas) y se vuelve a pintar sin la fila quitada.
    function removeBlockRowAt(idx) {
      const current = readBlocksFromEditor();
      current.splice(idx, 1);
      renderBlocksEditor(current);
    }

    // Habilita/deshabilita los campos del día (Día libre, Inicio, Fin, bloques + "+ Agregar bloque") y los botones de copiar/guardar
    function setScheduleFormDisabled(disabled) {
      ['dayOffInput', 'dayStartInput', 'dayEndInput', 'addBlockBtn', 'copyDayToAllBtn', 'copyWeekendBtn', 'saveShiftWindowBtn', 'scheduleOffsetMinusBtn', 'scheduleOffsetPlusBtn', 'scheduleOffsetApplyBtn'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = disabled;
      });
      const list = document.getElementById('blocksEditorList');
      if (list) list.querySelectorAll('input, select, button').forEach(el => { el.disabled = disabled; });
    }

    // Pedido del usuario: "Plantilla" y "Semana específica" se veían casi idénticas (mismo formulario)
    function syncScheduleModeBanner(isWeekMode, hasCustom = false) {
      const accordion = document.getElementById('scheduleConfigAccordion');
      const banner = document.getElementById('scheduleModeBanner');
      const bannerText = document.getElementById('scheduleModeBannerText');
      const bannerIcon = banner ? banner.querySelector('.sched-mode-banner-icon') : null;
      if (accordion) accordion.classList.toggle('sched-week-active', isWeekMode && hasCustom);
      if (!banner || !bannerText || !bannerIcon) return;
      if (!isWeekMode) {
        banner.className = 'sched-mode-banner tone-template';
        bannerIcon.innerHTML = iconHtml('repeat');
        bannerText.textContent = 'Editando tu horario de siempre — se repite cada semana.';
      } else if (!hasCustom) {
        banner.className = 'sched-mode-banner tone-template';
        bannerIcon.innerHTML = iconHtml('eye');
        bannerText.textContent = 'Viendo tu plantilla como referencia — activa "Personalizar esta semana" para editar solo esta semana.';
      } else {
        const weekStart = scheduleWeekStartDate(scheduleWeekOffset);
        const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);
        banner.className = 'sched-mode-banner tone-week';
        bannerIcon.innerHTML = iconHtml('calendar');
        bannerText.textContent = `Editando SOLO ${formatWeekRangeLabel(weekStart, weekEnd)} — tu plantilla no se toca.`;
      }
    }

    function syncScheduleWeekNavUI() {
      const nav = document.getElementById('scheduleWeekNav');
      if (!nav) return;
      const isWeekMode = scheduleViewMode === 'week';
      nav.style.display = isWeekMode ? '' : 'none';
      document.querySelectorAll('#scheduleModeTabs .day-tab').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-mode') === scheduleViewMode);
      });
      // Bug reportado por el usuario ("ninguno de los horarios que quiero hacer me funciona", en ambos modos):
      if (!isWeekMode) {
        setScheduleFormDisabled(false);
        syncScheduleModeBanner(false);
        return;
      }

      const weekStart = scheduleWeekStartDate(scheduleWeekOffset);
      const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);
      const rangeLabel = document.getElementById('scheduleWeekRangeLabel');
      if (rangeLabel) {
        rangeLabel.textContent = `${scheduleWeekOffset === 0 ? 'Semana actual · ' : ''}${formatWeekRangeLabel(weekStart, weekEnd)}`;
      }

      const isPast = scheduleWeekIsPast(scheduleWeekOffset);
      const hasCustom = scheduleWeekHasCustom(scheduleWeekOffset);
      const customInput = document.getElementById('scheduleWeekCustomInput');
      const lockedNote = document.getElementById('scheduleWeekLockedNote');
      if (customInput) {
        customInput.checked = hasCustom;
        customInput.disabled = isPast;
      }
      if (lockedNote) lockedNote.style.display = isPast ? '' : 'none';

      // Editable solo si: no está protegida por pasada, Y ya se activó
      // "Personalizar esta semana" (si no, se está viendo la plantilla nada
      // más como referencia, de solo lectura, hasta que se active).
      setScheduleFormDisabled(isPast || !hasCustom);
      syncScheduleModeBanner(true, hasCustom);
    }

    function syncShiftModalFields() {
      ensureWeeklySchedule();
      const target = activeScheduleTarget();
      const cfg = target[scheduleEditDay] || defaultDaySchedule(true);
      const dayOffInput = document.getElementById('dayOffInput');
      const startInput = document.getElementById('dayStartInput');
      const endInput = document.getElementById('dayEndInput');
      const lateSelect = document.getElementById('lateArrivalModeInput');
      const blocks = Array.isArray(cfg.blocks) ? cfg.blocks : [];

      if (dayOffInput) dayOffInput.checked = !!cfg.off;
      if (startInput) startInput.value = formatHHMM(cfg.start || '07:00');
      if (endInput) endInput.value = formatHHMM(cfg.end || '16:00');
      // Pedido del usuario: título de la tarjeta de cabecera del día muestra el NOMBRE COMPLETO del día activo (ver `.sched-day-card- title` en el CSS/HTML)
      const schedDayCardTitle = document.getElementById('schedDayCardTitle');
      if (schedDayCardTitle) schedDayCardTitle.textContent = WEEKDAY_LABELS[scheduleEditDay] || 'Lunes';
      renderBlocksEditor(blocks);
      if (lateSelect) lateSelect.value = settings.lateArrivalMode || 'anchor';
      // Pedido del usuario (v147): Adherencia vuelve a Horario (pasó por
      // Avisos en v145 y por Ajustes en v146) — global, no depende de
      // scheduleEditDay, mismo criterio que ya usaba antes de v145.
      const adherenceGraceMinInput = document.getElementById('adherenceGraceMinInput');
      if (adherenceGraceMinInput && document.activeElement !== adherenceGraceMinInput) adherenceGraceMinInput.value = settings.adherenceGraceMin;
      const adherenceGoalPctInput = document.getElementById('adherenceGoalPctInput');
      if (adherenceGoalPctInput && document.activeElement !== adherenceGoalPctInput) adherenceGoalPctInput.value = settings.adherenceGoalPct;
      renderDayTabs();
      syncScheduleWeekNavUI();
      // El ajuste de turno es por-visita, no por-día: cambiar de día (o de semana) sin haber tocado "Aplicar a todos" debe dejarlo en 0:00 para el día nuevo, no arrastrar el valor del día anterior.
      scheduleOffsetMin = 0;
      syncScheduleOffsetUI();
    }

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
        syncAlarmCustomSoundUI(kind);
      });
      // Los 5 campos "Mensaje" dejaron de ser editables (ver MESSAGE_PREVIEW_CONFIGS/syncMessagePreview más abajo)
      Object.keys(MESSAGE_PREVIEW_CONFIGS).forEach((kind) => syncMessagePreview(kind));
    }

    // Pedido del usuario: Higher Rate Opportunity vive ahora en su propio botón/modal (antes escondido dentro de Horario) — se sincroniza al abrir ese modal, no al abrir Horario.
    function syncHigherRateModalFields() {
      renderHigherRateWindowsEditor(settings.higherRateWindows || []);
    }

    function readScheduleFormAsConfig() {
      const dayOffInput = document.getElementById('dayOffInput');
      const startInput = document.getElementById('dayStartInput');
      const endInput = document.getElementById('dayEndInput');
      if (!startInput || !endInput) return null;
      return {
        off: dayOffInput ? dayOffInput.checked : false,
        start: formatHHMM(startInput.value),
        end: formatHHMM(endInput.value),
        blocks: readBlocksFromEditor(),
      };
    }

    // Bug reportado por el usuario: "Guardar día"/"Copiar a todos los días" parecían no hacer nada. Causa real:
    function scheduleFormIsDirty() {
      const cfg = readScheduleFormAsConfig();
      if (!cfg) return false;
      const stored = activeScheduleTarget()[scheduleEditDay];
      // Mismo normalizeBlockForCompare que ya usa readBlocksFromEditor (ver ahí) — necesario desde que los bloques de Trabajo llevan `goalMin` (Meta de Productividad):
      const storedBlocks = (stored && Array.isArray(stored.blocks) ? stored.blocks : [])
        .map(normalizeBlockForCompare);
      const storedNormalized = {
        off: !!(stored && stored.off),
        start: formatHHMM((stored && stored.start) || '07:00'),
        end: formatHHMM((stored && stored.end) || '16:00'),
        blocks: storedBlocks,
      };
      const lateSelect = document.getElementById('lateArrivalModeInput');
      const lateDirty = !!lateSelect && lateSelect.value !== (settings.lateArrivalMode || 'anchor');
      return lateDirty || JSON.stringify(cfg) !== JSON.stringify(storedNormalized);
    }

    function minutesToHHMM(mins) {
      const m = ((Math.round(mins) % 1440) + 1440) % 1440;
      return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
    }

    // Valida que TODOS los bloques del día (Trabajo/Break/Lunch, unificados en cfg.blocks) (a) queden dentro de la ventana de turno (inicio–fin) y (b) no se crucen entre sí
    function validateDayConfig(cfg) {
      const errors = [];
      if (!cfg || cfg.off) return { valid: true, errors };

      const dayStart = toMinutes(formatHHMM(cfg.start));
      const dayEnd = toMinutes(formatHHMM(cfg.end));
      if (dayEnd <= dayStart) {
        errors.push('La hora de fin debe ser después del inicio del turno.');
        return { valid: false, errors };
      }

      const typeLabel = { work: 'Trabajo', break: 'Break', lunch: 'Lunch' };
      const counters = { work: 0, break: 0, lunch: 0 };
      const segments = [];
      (Array.isArray(cfg.blocks) ? cfg.blocks : []).forEach((b) => {
        if (!b || !(Number(b.dur) > 0) || !b.start) return;
        const type = String(b.type || '').toLowerCase();
        if (!typeLabel[type]) return;
        counters[type] += 1;
        const s = toMinutes(formatHHMM(b.start));
        const label = `${typeLabel[type]} ${counters[type]}`;
        segments.push({ label, start: s, end: s + Number(b.dur) });
        // Pedido del usuario: Meta de Productividad por bloque no puede ser
        // mayor que la propia duración del bloque — no tendría sentido
        // pedir más minutos productivos de los que el bloque dura.
        if (type === 'work') {
          const goalMin = Number(b.goalMin) || 0;
          if (goalMin > Number(b.dur)) {
            errors.push(`${label}: la meta productiva (${formatMinutes(goalMin)} min) no puede ser mayor que la duración del bloque (${formatMinutes(Number(b.dur))} min).`);
          }
        }
      });

      segments.forEach(seg => {
        if (seg.start < dayStart || seg.end > dayEnd) {
          errors.push(`${seg.label} (${timeLabel(minutesToHHMM(seg.start))}–${timeLabel(minutesToHHMM(seg.end))}) queda fuera del turno (${timeLabel(cfg.start)}–${timeLabel(cfg.end)}).`);
        }
      });

      for (let i = 0; i < segments.length; i++) {
        for (let j = i + 1; j < segments.length; j++) {
          const a = segments[i], b = segments[j];
          if (a.start < b.end && b.start < a.end) {
            errors.push(`${a.label} y ${b.label} se cruzan.`);
          }
        }
      }

      return { valid: errors.length === 0, errors };
    }

    // Pedido del usuario : "Guardar día" debe guardar SOLO el día que se está editando
    function saveShiftWindow() {
      if (scheduleViewMode === 'week' && scheduleWeekIsPast(scheduleWeekOffset)) return; // protegido, no debería llegar aquí (botón deshabilitado)
      // BUG-005 (QA ) — ver blockRowsCrossingMidnight: antes de leer los bloques (y perder la hora de Fin al colapsarla a `dur`), se revisa si alguno cruza medianoche y se bloquea el guardado con un mensaje e…
      const midnightOffenders = blockRowsCrossingMidnight();
      if (midnightOffenders.length) {
        toast(blockCrossingMidnightMessage(midnightOffenders));
        return;
      }
      const cfg = readScheduleFormAsConfig();
      if (!cfg) return;
      const check = validateDayConfig(cfg);
      if (!check.valid) {
        toast(check.errors[0]);
        return;
      }
      const target = activeScheduleTarget({ createIfMissing: true });
      target[scheduleEditDay] = cfg;
      if (scheduleViewMode === 'template') {
        const lateSelect = document.getElementById('lateArrivalModeInput');
        if (lateSelect) settings.lateArrivalMode = lateSelect.value;
        // mantiene shiftStart/shiftEnd viejos sincronizados por compatibilidad, sin usarlos ya para dibujar bloques
        settings.shiftStart = cfg.start;
        settings.shiftEnd = cfg.end;
      }
      saveSettingsOnly();
      saveAll();
      renderDayTabs();
      toast(scheduleViewMode === 'week'
        ? `Horario de ${WEEKDAY_LABELS[scheduleEditDay]} guardado para esa semana`
        : `Horario de ${WEEKDAY_LABELS[scheduleEditDay]} guardado`);
    }

    // Pedido del usuario: "Copiar a todos los días" pasa a significar SOLO Lunes-Viernes
    function copyDayToAll() {
      if (scheduleViewMode === 'week' && scheduleWeekIsPast(scheduleWeekOffset)) return;
      // BUG-005 — ver comentario en saveShiftWindow().
      const midnightOffendersAll = blockRowsCrossingMidnight();
      if (midnightOffendersAll.length) {
        toast(blockCrossingMidnightMessage(midnightOffendersAll));
        return;
      }
      const cfg = readScheduleFormAsConfig();
      if (!cfg) return;
      const check = validateDayConfig(cfg);
      if (!check.valid) {
        toast(check.errors[0]);
        return;
      }
      const scope = scheduleViewMode === 'week' ? 'de esa semana' : '';
      appConfirm(`¿Copiar este horario (${WEEKDAY_LABELS[scheduleEditDay]}) a Lunes-Viernes ${scope}? Esto sobreescribe Lunes a Viernes — Sábado y Domingo no se tocan.`, () => {
        const target = activeScheduleTarget({ createIfMissing: true });
        target[scheduleEditDay] = cfg;
        WEEKDAYS.filter(k => k !== 'sat' && k !== 'sun').forEach(k => {
          target[k] = {
            off: cfg.off,
            start: cfg.start,
            end: cfg.end,
            blocks: cfg.blocks.map(b => ({ ...b })),
          };
        });
        saveSettingsOnly();
        saveAll();
        renderDayTabs();
        toast(`Horario copiado a Lunes-Viernes ${scope}`.trim());
      });
    }

    // Pedido del usuario : botón propio "Copiar a Sábado-Domingo", mismo patrón/nivel que "Copiar a Lunes-Viernes" (copyDayToAll)
    function copyDayToWeekend() {
      if (scheduleViewMode === 'week' && scheduleWeekIsPast(scheduleWeekOffset)) return;
      // BUG-005 — ver comentario en saveShiftWindow().
      const midnightOffendersWeekend = blockRowsCrossingMidnight();
      if (midnightOffendersWeekend.length) {
        toast(blockCrossingMidnightMessage(midnightOffendersWeekend));
        return;
      }
      const cfg = readScheduleFormAsConfig();
      if (!cfg) return;
      const check = validateDayConfig(cfg);
      if (!check.valid) {
        toast(check.errors[0]);
        return;
      }
      const scope = scheduleViewMode === 'week' ? 'de esa semana' : '';
      appConfirm(`¿Copiar este horario (${WEEKDAY_LABELS[scheduleEditDay]}) a Sábado y Domingo ${scope}? Esto sobreescribe Sábado y Domingo — el resto de los días no se tocan.`, () => {
        const target = activeScheduleTarget({ createIfMissing: true });
        target[scheduleEditDay] = cfg;
        target.sat = { off: cfg.off, start: cfg.start, end: cfg.end, blocks: cfg.blocks.map(b => ({ ...b })) };
        target.sun = { off: cfg.off, start: cfg.start, end: cfg.end, blocks: cfg.blocks.map(b => ({ ...b })) };
        saveSettingsOnly();
        saveAll();
        renderDayTabs();
        toast(`Horario copiado a Sábado y Domingo ${scope}`.trim());
      });
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
      saveSettingsOnly();
      render();
      toast(movedWeeks > 0
        ? `Ciclo de pago actualizado — ${movedWeeks} semana(s) personalizada(s) de Horario se re-anclaron al nuevo inicio de semana`
        : 'Ciclo de pago actualizado');
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
      saveSettingsOnly();
      toast(settings.alertBeforeShiftMin > 0 ? `Aviso configurado: ${formatMinutes(settings.alertBeforeShiftMin)} min antes de tu turno` : 'Aviso de turno desactivado');
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
      saveSettingsOnly();
      toast('Aviso de Break/Lunch actualizado');
    }

    // Ventana de gracia de la Adherencia estilo Calabrio (ver
    // computeMinuteAdherence()). Mismo patrón de auto-guardado que el resto
    // de settings globales de Horario.
    function updateAdherenceGraceSettings() {
      const input = document.getElementById('adherenceGraceMinInput');
      const mins = Number(input?.value);
      if (Number.isFinite(mins) && mins >= 0) settings.adherenceGraceMin = mins;
      saveSettingsOnly();
      render();
      toast(`Ventana de gracia de Adherencia: ${formatMinutes(settings.adherenceGraceMin)} min`);
    }

    // Meta de Adherencia (%, mejora D) — mismo patrón de auto-guardado.
    function updateAdherenceGoalSettings() {
      const input = document.getElementById('adherenceGoalPctInput');
      const pct = Number(input?.value);
      if (Number.isFinite(pct) && pct > 0 && pct <= 100) settings.adherenceGoalPct = pct;
      saveSettingsOnly();
      render();
      toast(`Meta de Adherencia: ${settings.adherenceGoalPct}%`);
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
      saveSettingsOnly();
      toast(`Descanso por productividad: cada ${formatMinutes(settings.productiveBreakEarnMin)} min productivos = ${formatMinutes(settings.productiveBreakAwardMin)} min de descanso`);
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
          ? `Archivo guardado: ${settings.productiveBreakCustomSoundName || 'sonido personalizado'}`
          : 'Ningún archivo propio guardado — usando el beep clásico mientras tanto.';
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
        toast('El archivo debe ser de audio (MP3, WAV, OGG...).');
        return;
      }
      if (file.size > MAX_CUSTOM_SOUND_BYTES) {
        toast(`El archivo pesa demasiado (máximo ${Math.round(MAX_CUSTOM_SOUND_BYTES / 1024)}KB) — usa un sonido corto.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        settings.productiveBreakCustomSoundDataUrl = String(reader.result || '');
        settings.productiveBreakCustomSoundName = file.name;
        settings.productiveBreakSound = 'custom';
        try {
          saveSettingsOnly();
        } catch {
          // Cuota de localStorage llena (raro, pero posible si ya hay mucha
          // data guardada) — se revierte para no dejar settings a medias
          // con un Data URL que nunca se pudo persistir.
          settings.productiveBreakCustomSoundDataUrl = '';
          settings.productiveBreakCustomSoundName = '';
          settings.productiveBreakSound = 'classic';
          toast('No se pudo guardar el sonido — el almacenamiento del navegador está lleno.');
          syncProductiveBreakCustomSoundUI();
          return;
        }
        const soundSelect = document.getElementById('productiveBreakSoundInput');
        if (soundSelect) soundSelect.value = 'custom';
        syncProductiveBreakCustomSoundUI();
        toast(`Sonido "${file.name}" guardado`);
      };
      reader.onerror = () => toast('No se pudo leer el archivo de audio.');
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
    };

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
            tipo: slot ? (slot.type === 'Lunch' ? 'Lunch' : 'Break') : 'Break',
            hora: slot ? timeLabel(slot.start) : timeLabel('10:00'),
          };
        },
      },
      breakEnd: {
        key: 'breakEndAlarmMessage', boxId: 'breakEndAlarmMessagePreview', tooltipTextId: 'breakEndAlarmMsgTooltipText',
        varsFn: () => {
          const slot = getEffectiveScheduleForDay(todayCallDateKey()).find(s => s.type === 'Break' || s.type === 'Lunch');
          return {
            tipo: slot ? (slot.type === 'Lunch' ? 'Lunch' : 'Break') : 'Break',
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
          ? `Archivo guardado: ${settings[cfg.nameKey] || 'sonido personalizado'}`
          : 'Ningún archivo propio guardado — usando el beep clásico mientras tanto.';
      }
    }

    function updateAlarmSound(kind) {
      const cfg = ALARM_SOUND_CONFIGS[kind];
      if (!cfg) return;
      const input = document.getElementById(cfg.selectId);
      const value = input ? input.value : 'classic';
      if (['classic', 'chime', 'custom'].includes(value)) settings[cfg.soundKey] = value;
      saveSettingsOnly();
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
        toast('El archivo debe ser de audio (MP3, WAV, OGG...).');
        return;
      }
      if (file.size > MAX_CUSTOM_SOUND_BYTES) {
        toast(`El archivo pesa demasiado (máximo ${Math.round(MAX_CUSTOM_SOUND_BYTES / 1024)}KB) — usa un sonido corto.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        settings[cfg.urlKey] = String(reader.result || '');
        settings[cfg.nameKey] = file.name;
        settings[cfg.soundKey] = 'custom';
        try {
          saveSettingsOnly();
        } catch {
          settings[cfg.urlKey] = '';
          settings[cfg.nameKey] = '';
          settings[cfg.soundKey] = 'classic';
          toast('No se pudo guardar el sonido — el almacenamiento del navegador está lleno.');
          syncAlarmCustomSoundUI(kind);
          return;
        }
        const soundSelect = document.getElementById(cfg.selectId);
        if (soundSelect) soundSelect.value = 'custom';
        syncAlarmCustomSoundUI(kind);
        toast(`Sonido "${file.name}" guardado`);
      };
      reader.onerror = () => toast('No se pudo leer el archivo de audio.');
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
      saveSettingsOnly();
      toast('Mensaje del aviso actualizado');
    }

    // Editor de ventanas de Higher Rate Opportunity (pedido del usuario) ---- Mismo patrón que el editor de bloques (Trabajo/Break/ Lunch, ver renderBlocksEditor): filas dinámicas con Fecha + Inicio + Fin + Nivel, agregar/eliminar libremente.
    function hrWindowWeekdayLabel(dayKeyStr) {
      const d = callDateToDate(dayKeyStr);
      if (!d) return '—';
      const raw = new Intl.DateTimeFormat('es-MX', { weekday: 'long' }).format(d);
      return raw.charAt(0).toUpperCase() + raw.slice(1);
    }
    // Texto de cada botón del pill de nivel — el activo muestra su bono ("Gold +$0.03"), los otros solo el nombre.
    function hrTierButtonLabel(tierKey, active) {
      const meta = HIGHER_RATE_TIERS[tierKey];
      return active ? `${meta.label} +${money(meta.bonusPerMin)}` : meta.label;
    }

    // BUG-016 (QA ) — Pedido del usuario: el `.hr-window-date-input` que arma esta función llevaba min/max agregados (ver el atributo en el template de abajo) para no aceptar años absurdos (0999/9999) sin ninguna validación
    function renderHigherRateWindowRow(w) {
      const tier = HIGHER_RATE_TIERS[w.tier] ? w.tier : 'bronze';
      const tierButtonsHtml = ['bronze', 'silver', 'gold'].map(t => {
        const active = t === tier;
        return `<button type="button" class="hr-window-tier-btn" data-hr-tier-btn data-tier="${t}" aria-pressed="${active ? 'true' : 'false'}">${escapeHtml(hrTierButtonLabel(t, active))}</button>`;
      }).join('');
      return `
        <div class="hr-window-card" data-hr-window-id="${escapeHtml(w.id || '')}" data-tier="${tier}">
          <div class="hr-window-top">
            <div class="hr-window-day">
              <span class="hr-window-day-icon" aria-hidden="true">${iconHtml('calendar')}</span>
              <div class="hr-window-day-text">
                <div class="hr-window-day-name">${escapeHtml(hrWindowWeekdayLabel(w.date))}</div>
                <input type="date" class="hr-window-date-input hr-window-date-visible" value="${escapeHtml(isoDateFromDayKey(w.date))}" title="Fecha de la ventana" min="1970-01-01" max="2099-12-31"/>
              </div>
            </div>
            <button type="button" class="hr-window-remove-btn" data-remove-hr-window aria-label="Eliminar ventana"><svg class="ic-svg" viewBox="0 0 24 24" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
          <div class="hr-window-time">
            <span class="hr-window-time-icon" aria-hidden="true">${iconHtml('clock')}</span>
            <input type="time" class="hr-window-start-input hr-window-time-input" value="${formatHHMM(w.start)}" title="Hora de inicio"/>
            <span class="hr-time-sep" aria-hidden="true">–</span>
            <input type="time" class="hr-window-end-input hr-window-time-input" value="${formatHHMM(w.end)}" title="Hora de fin"/>
          </div>
          <select class="alert-select hr-window-tier-input" style="display:none;">
            <option value="bronze" ${tier === 'bronze' ? 'selected' : ''}>Bronce (+$0.01)</option>
            <option value="silver" ${tier === 'silver' ? 'selected' : ''}>Silver (+$0.02)</option>
            <option value="gold" ${tier === 'gold' ? 'selected' : ''}>Gold (+$0.03)</option>
          </select>
          <div class="hr-window-tier-row" role="group" aria-label="Nivel de la ventana">${tierButtonsHtml}</div>
        </div>
      `;
    }

    // Total de minutos/horas del día que ya calificaron para un bono de Higher Rate, dentro del
    // propio modal — reutiliza higherRateBonusForCall (misma regla de elegibilidad de siempre, sin
    // duplicar lógica) sobre las llamadas de HOY.
    function higherRateStatsForDay(dayKey = todayCallDateKey()) {
      const dayCallsList = callsForDay(dayKey, calls);
      let totalMin = 0;
      let totalBonus = 0;
      const breakdown = {};
      dayCallsList.forEach(c => {
        const bonus = higherRateBonusForCall(c);
        if (!bonus) return;
        totalMin += Number(c.durationMin) || 0;
        totalBonus += bonus.amount;
        breakdown[bonus.tier] = (breakdown[bonus.tier] || 0) + (Number(c.durationMin) || 0);
      });
      return { totalMin, totalBonus, breakdown };
    }

    // Duración TOTAL de las ventanas de Higher Rate configuradas para hoy (las hayas aprovechado o
    // no) — distinto de `higherRateStatsForDay` (tiempo real en llamada).
    function higherRateWindowsTodayTotalMin(dayKey = todayCallDateKey()) {
      const todaysWindows = (settings.higherRateWindows || []).filter(w => w.date === dayKey);
      const intervals = todaysWindows
        .map(w => ({ start: toDateFromInputs(w.date, timeLabel(w.start)), end: toDateFromInputs(w.date, timeLabel(w.end)) }))
        .filter(iv => iv.start && iv.end && iv.end > iv.start);
      return mergeIntervals(intervals).reduce((sum, iv) => sum + (iv.end.getTime() - iv.start.getTime()) / 60000, 0);
    }

    // Estado EN VIVO de Higher Rate ---- ¿Estás dentro de una ventana AHORA MISMO, o cuándo es la
    // próxima que viene? Reutiliza la misma regla de elegibilidad que ya usa
    // callQualifiesForHigherRateWindow (la gracia de 5 min antes de que empiece), pero comparando
    // contra el reloj en vez de contra el inicio de una llamada.
    function isNowWithinHigherRateWindow(now, w) {
      const winStart = toDateFromInputs(w.date, timeLabel(w.start));
      const winEnd = toDateFromInputs(w.date, timeLabel(w.end));
      if (!winStart || !winEnd || winEnd.getTime() <= winStart.getTime()) return false;
      const graceStart = new Date(winStart.getTime() - HIGHER_RATE_EARLY_GRACE_MIN * 60000);
      return now.getTime() >= graceStart.getTime() && now.getTime() < winEnd.getTime();
    }

    // Devuelve { active: true, window, minutesLeft } si hay una ventana vigente ahora mismo (la de
    // mayor bono, si hay varias traslapadas — mismo criterio que higherRateBonusForCall), o {
    // active: false, window, startsAt } con la próxima ventana futura más cercana (cualquier fecha,
    // no solo hoy).
    function higherRateLiveStatus() {
      const now = new Date();
      const windows = settings.higherRateWindows || [];
      const activeNow = windows.filter(w => isNowWithinHigherRateWindow(now, w));
      if (activeNow.length) {
        const best = activeNow.reduce((a, b) =>
          (HIGHER_RATE_TIERS[b.tier]?.bonusPerMin || 0) > (HIGHER_RATE_TIERS[a.tier]?.bonusPerMin || 0) ? b : a
        );
        const winEnd = toDateFromInputs(best.date, timeLabel(best.end));
        const minutesLeft = winEnd ? Math.max(0, Math.round((winEnd.getTime() - now.getTime()) / 60000)) : null;
        return { active: true, window: best, minutesLeft };
      }
      const upcoming = windows
        .map(w => ({ w, start: toDateFromInputs(w.date, timeLabel(w.start)), end: toDateFromInputs(w.date, timeLabel(w.end)) }))
        .filter(x => x.start && x.end && x.end.getTime() > x.start.getTime())
        .map(x => ({ ...x, graceStart: new Date(x.start.getTime() - HIGHER_RATE_EARLY_GRACE_MIN * 60000) }))
        .filter(x => x.graceStart.getTime() > now.getTime())
        .sort((a, b) => a.start.getTime() - b.start.getTime());
      if (upcoming.length) return { active: false, window: upcoming[0].w, startsAt: upcoming[0].start };
      return null;
    }

    // Pinta la tarjeta "en vivo"/"próxima ventana" de Higher Rate en un set de ids dado —
    // reutilizado tanto por #higherRateModal como por el mismo widget dentro de "Ganancias de hoy"
    // (ver renderHigherRateLiveCard).
    function renderHigherRateLiveCardInto(ids, { hideWhenUpcoming = false } = {}) {
      const card = document.getElementById(ids.card);
      const icon = document.getElementById(ids.icon);
      const title = document.getElementById(ids.title);
      const sub = document.getElementById(ids.sub);
      if (!card || !icon || !title || !sub) return;
      const status = higherRateLiveStatus();
      if (!status || (hideWhenUpcoming && !status.active)) {
        card.style.display = 'none';
        return;
      }
      card.style.display = '';
      card.classList.toggle('tone-active', status.active);
      // Ver.tone-tier en el CSS: tiñe ícono/fecha/borde con el color del nivel.
      card.classList.toggle('tone-tier', !status.active);
      icon.innerHTML = iconHtml('flame');
      const tierMeta = HIGHER_RATE_TIERS[status.window.tier];
      const tierLabel = tierMeta?.label || status.window.tier;
      if (tierMeta) {
        card.style.setProperty('--live-rgb', tierMeta.colorRgb);
        card.style.setProperty('--live-color', `var(${tierMeta.colorVar})`);
      } else {
        card.style.removeProperty('--live-rgb');
        card.style.removeProperty('--live-color');
      }
      if (status.active) {
        title.textContent = `Estás en una ventana ${tierLabel} ahora`;
        sub.textContent = status.minutesLeft !== null
          ? `Termina en ${formatMinutes(status.minutesLeft)} min (${timeLabel(status.window.end)})`
          : `Termina a las ${timeLabel(status.window.end)}`;
      } else {
        const isToday = status.window.date === todayCallDateKey();
        const dayLabelRaw = isToday ? 'Hoy' : formatCallDayLabel(status.window.date);
        const dayLabel = dayLabelRaw.charAt(0).toUpperCase() + dayLabelRaw.slice(1);
        const datetimeText = `${dayLabel} · ${timeLabel(status.window.start)}`;
        const chipRgb = tierMeta?.colorRgb || '255,209,92';
        const chipColorVar = tierMeta?.colorVar || '--warn';
        title.innerHTML = `<div class="hr-live-eyebrow">Próxima ventana</div><div class="hr-live-main-row"><span class="hr-live-datetime">${escapeHtml(datetimeText)}</span><span class="hr-live-tier-chip" style="background: rgba(${chipRgb}, .16); border: 1px solid rgba(${chipRgb}, .4); color: var(${chipColorVar});">${escapeHtml(tierLabel)}</span></div>`;
        sub.textContent = `Termina a las ${timeLabel(status.window.end)}`;
      }
    }

    function renderHigherRateLiveCard() {
      renderHigherRateLiveCardInto({ card: 'higherRateLiveCard', icon: 'higherRateLiveIcon', title: 'higherRateLiveTitle', sub: 'higherRateLiveSub' }, { hideWhenUpcoming: true });
      renderHigherRateLiveCardInto({ card: 'earningsHigherRateLiveCard', icon: 'earningsHigherRateLiveIcon', title: 'earningsHigherRateLiveTitle', sub: 'earningsHigherRateLiveSub' });
    }

    // Acordeón "Días pasados" dentro de "Tiempo y bono por día" — vive en memoria, no en
    // localStorage (mismo patrón que earningsViewMode/blocksViewMode).
    let higherRateHistoryOpen = false;

    // Nivel más "valioso" (mayor bono/min) presente en un breakdown de minutos por tier (ver
    // higherRateStatsForDay) — mismo criterio de desempate que ya usa higherRateBonusForCall al
    // elegir entre ventanas traslapadas.
    function dominantHigherRateTier(breakdown) {
      const entries = Object.keys(breakdown || {}).filter(t => breakdown[t] > 0);
      if (!entries.length) return null;
      return entries.reduce((a, b) => (HIGHER_RATE_TIERS[b]?.bonusPerMin || 0) > (HIGHER_RATE_TIERS[a]?.bonusPerMin || 0) ? b : a);
    }

    function higherRateHeroTierBadge(tierKey) {
      const meta = HIGHER_RATE_TIERS[tierKey];
      if (!meta) return '';
      return `<span class="hero-today-tier" style="background: rgba(${meta.colorRgb}, .16); border: 1px solid rgba(${meta.colorRgb}, .4); color: var(${meta.colorVar});">${iconHtml('medal')} ${escapeHtml(meta.label)} +${money(meta.bonusPerMin)}/min</span>`;
    }

    // "Tiempo y bono por día": tarjeta hero para Hoy (bono ganado, tiempo en llamada, ventana
    // total, % aprovechado) + timeline de Próximos días / Días pasados (colapsado por default, ver
    // higherRateHistoryOpen).
    function renderHigherRateDayStats() {
      const wrap = document.getElementById('higherRateDayStats');
      if (!wrap) return;
      const todayKey = todayCallDateKey();
      const today = todayRange();
      const dates = new Set();
      (settings.higherRateWindows || []).forEach(w => {
        const key = callDateKeyFromValue(w.date);
        if (key && key !== todayKey) dates.add(key);
      });

      const past = [];
      dates.forEach(key => {
        const d = callDateToDate(key);
        if (d && d < today) past.push(key);
      });
      past.sort((a, b) => callDateToDate(b) - callDateToDate(a));

      // Tarjeta hero de Hoy.
      const todayStats = higherRateStatsForDay(todayKey);
      const todayWindowsMin = higherRateWindowsTodayTotalMin(todayKey);
      const liveStatus = higherRateLiveStatus();
      const isActiveNow = !!(liveStatus && liveStatus.active);
      const todayPct = todayWindowsMin > 0 ? Math.min(100, (todayStats.totalMin / todayWindowsMin) * 100) : 0;

      const liveTierMeta = isActiveNow ? HIGHER_RATE_TIERS[liveStatus.window.tier] : null;
      const liveTierStyle = liveTierMeta ? ` style="--live-rgb:${liveTierMeta.colorRgb}; --live-color:var(${liveTierMeta.colorVar});"` : '';

      const tierBadgeHtml = isActiveNow
        ? higherRateHeroTierBadge(liveStatus.window.tier)
        : higherRateHeroTierBadge(dominantHigherRateTier(todayStats.breakdown));

      const todayDateRaw = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).format(today);
      const todayDateLabel = `Hoy · ${todayDateRaw.charAt(0).toUpperCase() + todayDateRaw.slice(1)}`;

      const footHtml = todayWindowsMin > 0
        ? `<div class="hero-today-foot"><span>${Math.round(todayPct)}% de la ventana aprovechada</span><span>${isActiveNow ? `Termina a las ${timeLabel(liveStatus.window.end)}` : ''}</span></div>`
        : '';

      const heroHtml = `
        <div class="hero-today ${isActiveNow ? 'is-live' : ''}"${liveTierStyle}>
          <div class="hero-today-top">
            <div>
              <span class="hero-today-label ${isActiveNow ? 'tone-active' : ''}">${isActiveNow ? '<span class="pulse-dot" aria-hidden="true"></span>Ganando bono ahora' : 'Higher Rate hoy'}</span>
              <div class="hero-today-date">${escapeHtml(todayDateLabel)}</div>
            </div>
            ${tierBadgeHtml}
          </div>
          <div class="hero-today-figures">
            <div><div class="hero-fig-value is-bonus">+${money(todayStats.totalBonus)}</div><div class="hero-fig-label">Bono ganado hoy${financeConvertedInline(todayStats.totalBonus)}</div></div>
            <div><div class="hero-fig-value">${escapeHtml(formatBlockDurationLabel(todayStats.totalMin))}</div><div class="hero-fig-label">en llamada dentro de ventana</div></div>
            <div><div class="hero-fig-value" style="font-size:20px; color:var(--muted);">${escapeHtml(formatBlockDurationLabel(todayWindowsMin))}</div><div class="hero-fig-label">ventana total de hoy</div></div>
          </div>
          ${todayWindowsMin > 0 ? `<div class="hero-today-track"><div style="width:${todayPct}%;"></div></div>` : ''}
          ${footHtml}
        </div>
      `;

      // Timeline de Días pasados.
      const tlItemHtml = (key) => {
        const stats = higherRateStatsForDay(key);
        const windowsForDay = (settings.higherRateWindows || [])
          .filter(w => callDateKeyFromValue(w.date) === key)
          .sort((a, b) => toMinutes(formatHHMM(a.start)) - toMinutes(formatHHMM(b.start)));
        const dateObj = callDateToDate(key);
        const dayNameRaw = new Intl.DateTimeFormat('es-MX', { weekday: 'long' }).format(dateObj);
        const dayName = dayNameRaw.charAt(0).toUpperCase() + dayNameRaw.slice(1);
        const dayNum = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(dateObj);

        let mainHtml, accentRgb;
        if (windowsForDay.length) {
          // Acento del día = el nivel de mayor bono entre TODAS sus ventanas (mismo criterio que
          // dominantHigherRateTier), para un solo color de tarjeta aunque el día tenga niveles
          // distintos.
          const dominantWindow = windowsForDay.reduce((a, b) =>
            (HIGHER_RATE_TIERS[b.tier]?.bonusPerMin || 0) > (HIGHER_RATE_TIERS[a.tier]?.bonusPerMin || 0) ? b : a
          );
          accentRgb = HIGHER_RATE_TIERS[dominantWindow.tier]?.colorRgb || '125,140,255';
          mainHtml = windowsForDay.map(w => {
            const meta = HIGHER_RATE_TIERS[w.tier];
            return `<div class="hr-tl-window-row"><span class="hr-tl-name">Ventana ${escapeHtml(meta?.label || w.tier)}</span><span class="hr-tl-sub">${escapeHtml(timeLabel(w.start))} – ${escapeHtml(timeLabel(w.end))}</span></div>`;
          }).join('');
        } else {
          mainHtml = `<div class="hr-tl-name">Sin ventanas configuradas</div>`;
          accentRgb = '144,160,190';
        }

        const windowsMinForDay = higherRateWindowsTodayTotalMin(key);
        const pillsHtml = [
          stats.totalMin > 0
            ? `<span class="hr-count-pill tone-live">${iconHtml('flame')} ${escapeHtml(formatBlockDurationLabel(stats.totalMin))} en llamada · +${money(stats.totalBonus)}${financeConvertedInline(stats.totalBonus)}</span>`
            : `<span class="hr-count-pill tone-muted">Sin llamadas en Higher Rate</span>`,
          windowsMinForDay > 0 ? `<span class="hr-count-pill tone-window">${escapeHtml(formatBlockDurationLabel(windowsMinForDay))} de ventana</span>` : '',
        ].filter(Boolean).join('');

        return `
          <div class="hr-tl-item ${windowsForDay.length ? '' : 'is-empty'}" style="--dot-rgb:${accentRgb};">
            <div class="hr-tl-date">${escapeHtml(dayName)}<b>${escapeHtml(dayNum)}</b></div>
            <div class="hr-tl-rail" aria-hidden="true"><span class="hr-tl-dot"></span></div>
            <div class="hr-tl-card" style="--accent-rgb:${accentRgb};">
              <span class="hr-tl-icon">${iconHtml(windowsForDay.length ? 'medal' : 'calendar')}</span>
              <div class="hr-tl-main">${mainHtml}</div>
              <div class="hr-tl-pills">${pillsHtml}</div>
            </div>
          </div>
        `;
      };

      const pastHtml = past.length
        ? `
          <button type="button" class="hr-past-toggle" id="higherRatePastToggleBtn" data-open="${higherRateHistoryOpen ? 'true' : 'false'}">
            <span class="hr-past-toggle-left">${iconHtml('history')} Días pasados (${past.length})</span>
            ${iconHtml('chevronDown', 'chev')}
          </button>
          <div class="hr-tl" id="higherRatePastList" style="margin-top:14px;${higherRateHistoryOpen ? '' : ' display:none;'}">${past.map(k => tlItemHtml(k)).join('')}</div>
        `
        : '';

      wrap.innerHTML = heroHtml + pastHtml;

      const pastToggleBtn = document.getElementById('higherRatePastToggleBtn');
      if (pastToggleBtn) {
        pastToggleBtn.addEventListener('click', () => {
          higherRateHistoryOpen = !higherRateHistoryOpen;
          renderHigherRateDayStats();
        });
      }
    }

    // Una ventana es "pasada" cuando su hora de fin ya quedó atrás, no solo si su fecha es anterior
    // a hoy.
    function higherRateWindowIsPast(w, now = new Date()) {
      const end = toDateFromInputs(w.date, timeLabel(w.end));
      return !!(end && end.getTime() <= now.getTime());
    }

    // Mientras #higherRateModal esté abierto, revisa cada segundo si alguna ventana acaba de cruzar
    // a "pasada" y repinta las listas sola en ese caso — sin esto, una ventana solo se movía al
    // Historial al reabrir el modal.
    let higherRateLastPastCount = null;
    function refreshHigherRateWindowsIfNeeded() {
      const modal = document.getElementById('higherRateModal');
      if (!modal || !modal.classList.contains('open')) return;
      const list = document.getElementById('higherRateWindowsList');
      const historyList = document.getElementById('higherRateHistoryList');
      if (!list || !historyList) return;
      const active = document.activeElement;
      if (active && (list.contains(active) || historyList.contains(active))) return;
      const windows = settings.higherRateWindows || [];
      const pastCount = windows.filter(w => higherRateWindowIsPast(w)).length;
      if (pastCount !== higherRateLastPastCount) {
        higherRateLastPastCount = pastCount;
        renderHigherRateWindowsEditor(windows);
      }
    }

    function renderHigherRateWindowsEditor(windows) {
      const list = document.getElementById('higherRateWindowsList');
      const historyList = document.getElementById('higherRateHistoryList');
      const historyTitle = document.getElementById('higherRateHistoryTitle');
      const activeCountPill = document.getElementById('higherRateActiveCountPill');
      if (!list || !historyList) return;
      const arr = Array.isArray(windows) ? windows : [];
      const isPastWindow = (w) => higherRateWindowIsPast(w);
      const active = arr.filter(w => !isPastWindow(w));
      const past = arr.filter(isPastWindow);
      // Orden cronológico (fecha + inicio) solo para que se vea prolijo — no afecta cómo se guardan
      // ni se calculan los bonos.
      const sortByDate = (a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`);
      const sortedActive = [...active].sort(sortByDate);
      const sortedPast = [...past].sort(sortByDate);

      list.innerHTML = sortedActive.map(renderHigherRateWindowRow).join('')
        || '<div class="note" style="margin:0;">Sin ventanas de Higher Rate para hoy ni futuras — usa "+ Agregar ventana" cuando te llegue el aviso de Propio.</div>';

      historyList.innerHTML = sortedPast.map(renderHigherRateWindowRow).join('')
        || '<div class="note" style="margin:0;">Sin ventanas pasadas todavía.</div>';
      if (historyTitle) historyTitle.innerHTML = `${iconHtml('history')} Historial (${sortedPast.length} ${sortedPast.length === 1 ? 'pasada' : 'pasadas'})`;
      if (activeCountPill) activeCountPill.textContent = `${sortedActive.length} ${sortedActive.length === 1 ? 'próxima' : 'próximas'}`;
      higherRateLastPastCount = sortedPast.length;
      renderHigherRateDayStats();
      renderHigherRateLiveCard();
    }

    // Lee todas las filas del editor tal como están en el DOM — AMBAS listas (activas + historial),
    // ya que las dos son igual de editables. `id` se conserva vía el atributo data-hr-window-id del
    // contenedor de la fila (asignado al renderizar)
    function readHigherRateWindowsFromEditor() {
      const rows = document.querySelectorAll('#higherRateWindowsList .hr-window-card, #higherRateHistoryList .hr-window-card');
      return Array.from(rows).map(row => {
        const dateInput = row.querySelector('.hr-window-date-input');
        const startInput = row.querySelector('.hr-window-start-input');
        const endInput = row.querySelector('.hr-window-end-input');
        const tierInput = row.querySelector('.hr-window-tier-input');
        const tier = HIGHER_RATE_TIERS[tierInput ? tierInput.value : ''] ? tierInput.value : 'bronze';
        return {
          id: row.getAttribute('data-hr-window-id') || makeLocalId(),
          date: dayKeyFromIsoDate(dateInput ? dateInput.value : '') || todayCallDateKey(),
          start: formatHHMM(startInput ? startInput.value : '07:00'),
          end: formatHHMM(endInput ? endInput.value : '08:00'),
          tier,
        };
      });
    }

    // Persiste lo que hay ahora mismo en el editor — llamada en cada cambio de campo (auto-
    // guardado, mismo patrón que el resto de settings sueltos de Horario) y al eliminar una fila.
    function saveHigherRateWindowsFromEditor() {
      const oldWindows = settings.higherRateWindows || [];
      const oldById = new Map(oldWindows.map(w => [w.id, w]));
      const newWindows = readHigherRateWindowsFromEditor();
      // Un cambio de nivel no entra aquí: no altera SI la ventana aplica, y congelar el bono
      // dejaría pegado el nivel viejo.
      const changedIds = newWindows
        .filter(nw => {
          const old = oldById.get(nw.id);
          return !old || old.date !== nw.date || old.start !== nw.start || old.end !== nw.end;
        })
        .map(w => w.id);
      const editedIds = changedIds.filter(id => oldById.has(id));
      if (editedIds.length) freezeHigherRateBonusesForWindowIds(editedIds);
      settings.higherRateWindows = newWindows;
      retuneFrozenHigherRateTiers(newWindows);
      // SaveAll en vez de saveSettingsOnly: freezeHigherRateBonusesForWindowIds puede haber marcado
      // `calls` con `frozenHigherRateBonus` nuevo.
      saveAll();
      renderHigherRateLiveCard();
      // Editar una ventana ya existente (ej. su hora de fin) no refrescaba "Próximos días" — ese
      // bloque se quedaba mostrando el horario viejo hasta reabrir el modal, porque nada aquí
      // volvía a llamar a renderHigherRateDayStats.
      renderHigherRateDayStats();
      notifyHigherRateRetroactiveMatches(changedIds);
      notifyHigherRateMidnightCrossingWindows();
    }

    // CallQualifiesForHigherRateWindow construye winStart/winEnd con la MISMA fecha para ambos; si
    // Fin <= Inicio (la ventana cruza medianoche, ej. 22:00–02:00), la función devuelve `false`
    // incondicionalmente.
    function notifyHigherRateMidnightCrossingWindows() {
      const windows = settings.higherRateWindows || [];
      const offenders = windows.filter(w => toMinutes(formatHHMM(w.end)) <= toMinutes(formatHHMM(w.start)));
      if (!offenders.length) return;
      const first = offenders[0];
      const extra = offenders.length > 1 ? ` (y ${offenders.length - 1} más)` : '';
      toast(`⚠️ La ventana de Higher Rate ${timeLabel(first.start)}–${timeLabel(first.end)} del ${formatCallDayLabel(first.date)}${extra} cruza la medianoche — todavía no se soporta, no aplicará a ninguna llamada. Divide en dos ventanas (ej. ${timeLabel(first.start)}–11:59 PM y una segunda 12:00–${timeLabel(first.end)} AM al día siguiente).`);
    }

    // Agregar un Higher Rate para un día que YA tiene llamadas tomadas ("se me olvidó agregarlo a
    // tiempo") sí actualiza el bono correctamente al instante.
    function notifyHigherRateRetroactiveMatches(changedWindowIds) {
      const changed = new Set(Array.isArray(changedWindowIds) ? changedWindowIds : []);
      if (!changed.size) return;
      let qualifyingCount = 0;
      let sampleDate = null;
      calls.forEach(c => {
        // Un bono congelado conserva la ventana vieja: la que acaba de cambiar no altera lo que esa
        // llamada ya tiene ganado.
        if (c.frozenHigherRateBonus) return;
        const bonus = higherRateBonusForCall(c);
        if (!bonus || !changed.has(bonus.windowId)) return;
        qualifyingCount++;
        if (!sampleDate) sampleDate = c.callDate;
      });
      if (qualifyingCount > 0) {
        const plural = qualifyingCount === 1 ? 'llamada ya tomada califica' : 'llamadas ya tomadas califican';
        toast(`🔥 ${qualifyingCount} ${plural} para el bono — revisa Tabla de llamadas del ${formatCallDayLabel(sampleDate)} para verlo.`);
      }
    }

    // "agrego una ventana y luego no la encuentro".
    function addHigherRateWindowRow() {
      const current = readHigherRateWindowsFromEditor();
      const todayKey = todayCallDateKey();
      const todaysEndMins = current.filter(w => w.date === todayKey).map(w => toMinutes(formatHHMM(w.end)));
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      let startMin = todaysEndMins.length ? Math.max(...todaysEndMins) : nowMin;
      startMin = Math.min(startMin, 23 * 60);
      const endMin = Math.min(23 * 60 + 59, startMin + 60);
      const newWindow = { id: makeLocalId(), date: todayKey, start: minutesToHHMM(startMin), end: minutesToHHMM(endMin), tier: 'bronze' };
      current.push(newWindow);
      renderHigherRateWindowsEditor(current);
      saveHigherRateWindowsFromEditor();
      const newCard = document.querySelector(`.hr-window-card[data-hr-window-id="${newWindow.id}"]`);
      if (newCard && newCard.scrollIntoView) newCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function removeHigherRateWindowRowAt(id) {
      // Borrar UNA ventana (individual, con "✕") le quitaba retroactivamente el bono ya calculado a
      // cualquier llamada real que ya calificaba para ella.
      freezeHigherRateBonusesForWindowIds([id]);
      const current = readHigherRateWindowsFromEditor().filter(w => w.id !== id);
      renderHigherRateWindowsEditor(current);
      settings.higherRateWindows = current;
      // SaveAll en vez de saveSettingsOnly: ahora también hay que persistir `calls` (algunas pueden
      // haber quedado con frozenHigherRateBonus nuevo).
      saveAll();
      renderHigherRateLiveCard();
    }

    // Congela el bono ya ganado antes de que la ventana desaparezca de settings, por cualquier vía.
    //
    // Un cambio de NIVEL en una ventana que sigue viva (mismo id) sí debe corregir el bono de
    // llamadas ya congeladas — para eso existe esta función. Pero solo si esa llamada TODAVÍA
    // califica por horario contra la ventana tal como está hoy: si el bono se congeló porque la
    // ventana se acortó/movió y la llamada quedó fuera del horario actual, un cambio de nivel
    // posterior no debe "revivirla" con el nivel nuevo — se queda con lo que ya tenía congelado.
    function retuneFrozenHigherRateTiers(windows) {
      let changed = 0;
      calls.forEach(c => {
        const frozen = c.frozenHigherRateBonus;
        if (!frozen) return;
        const w = (windows || []).find(x => x.id === frozen.windowId);
        const meta = w && HIGHER_RATE_TIERS[w.tier];
        if (!meta || w.tier === frozen.tier) return;
        if (!callQualifiesForHigherRateWindow(c.startISO, w)) return;
        c.frozenHigherRateBonus = { ...frozen, tier: w.tier, amount: meta.bonusPerMin * (Number(c.durationMin) || 0) };
        changed++;
      });
      return changed;
    }

    function freezeHigherRateBonusesForWindowIds(windowIds) {
      const idSet = new Set(windowIds);
      let frozenCount = 0;
      calls.forEach(c => {
        if (c.frozenHigherRateBonus) return; // Ya congelado antes, no recalcular.
        const bonus = higherRateBonusForCall(c);
        if (bonus && idSet.has(bonus.windowId)) {
          c.frozenHigherRateBonus = bonus;
          frozenCount++;
        }
      });
      return frozenCount;
    }

    // Vacía el historial de ventanas ya terminadas; el bono ya ganado se conserva congelado.
    function purgePastHigherRateWindows() {
      const current = readHigherRateWindowsFromEditor();
      const isPast = (w) => higherRateWindowIsPast(w);
      const pastWindows = current.filter(isPast);
      if (!pastWindows.length) {
        toast('El historial ya está vacío — no hay ventanas de Higher Rate que ya hayan terminado.');
        return;
      }
      appConfirm(`¿Vaciar el historial completo (${pastWindows.length} ventana(s) de Higher Rate ya terminadas)? Las que siguen activas o futuras no se tocan. Las llamadas que ya recibieron un bono de esas ventanas conservan su bono ganado. No se puede deshacer.`, () => {
        // Sin esto, purgar borraba las ventanas pasadas de golpe y el bono que ya habían generado
        // desaparecía retroactivamente de las ganancias de esos días/ciclo.
        const pastIds = pastWindows.map(w => w.id);
        freezeHigherRateBonusesForWindowIds(pastIds);

        const remaining = current.filter(w => !isPast(w));
        settings.higherRateWindows = remaining;
        // SaveAll en vez de saveSettingsOnly: también hay que persistir `calls` (varias pueden
        // haber quedado con frozenHigherRateBonus).
        saveAll();
        renderHigherRateWindowsEditor(remaining);
        toast(`${pastWindows.length} ventana(s) borrada(s) del historial — el bono ya ganado por esas llamadas se conserva.`);
      });
    }


    

function renderHeader() {
  const now = new Date();
  const dayKey = getActiveDayKey();
  const dayCalls = callsForDay(dayKey);
  const shiftBounds = dayShiftBounds(dayKey);
  const hasShift = !!shiftBounds.start;

  document.getElementById('clockNow').textContent = clockTimeVisible ? fmtTime(now) : '--:--:--';
  document.getElementById('clockDate').textContent = fmtDate(now);
  document.getElementById('stateText').textContent = currentStateLabel();

  // Chip de ACW/Available en vivo — visible solo mientras aplica (computeCurrentAcwStart ya filtra
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
    earlySubtext = `Disponible desde ${timeLabelFromDate(availableFrom)}`;
  }
  shiftSub.textContent = !viewingToday
    ? "Solo disponible viendo 'Hoy'"
    : startingNewShift
      ? (isDayOffBlocking ? 'Hoy es tu día libre' : (tooEarly ? earlySubtext : shiftWindowLabel))
      : 'Activo';
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
  breakTimer.textContent = viewingToday ? pauseActionTimer('break') : "Solo en 'Hoy'";
  lunchTimer.textContent = viewingToday ? pauseActionTimer('lunch') : "Solo en 'Hoy'";

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
  callTimer.textContent = viewingToday ? callActionTimer() : "Solo en 'Hoy'";
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
  // Si aplica un bono de Higher Rate en las llamadas de hoy, lograr la meta debería tomar MENOS
  // minutos.
  const rateForGoal = Number(settings.rate) > 0 ? Number(settings.rate) : RATE;
  const higherRateBonusMinEquivalent = rateForGoal > 0 ? (stats.higherRateBonus || 0) / rateForGoal : 0;
  const remainingMin = Math.max(0, goalMin - productive - higherRateBonusMinEquivalent);

  document.getElementById('earningsValue').textContent = money(stats.earnings);
  const earningsConvertedEl = document.getElementById('earningsConvertedText');
  if (earningsConvertedEl) earningsConvertedEl.textContent = convertedAmountText(stats.earnings);
  document.getElementById('goalPctBadge').textContent = `${Math.round(goalPct)}%`;
  // Anillo circular de % (reemplaza la vieja escala de puntos 0/25/ 50/75/100%, ver más abajo) —
  // mismo patrón conic-gradient que ya usa `.sidebar-progress-ring`, con su propia variable
  // `--ring-pct`.
  const earningsGoalRingEl = document.getElementById('earningsGoalRing');
  if (earningsGoalRingEl) earningsGoalRingEl.style.setProperty('--ring-pct', String(goalPct));
  // Estas 4 metas (Meta $, ≈ conversión, Meta min, restantes) pasaron de píldora a texto plano
  // (ver.goal-plain-row en el CSS)
  const goalDailyLabelEl = document.getElementById('goalDailyLabel');
  if (goalDailyLabelEl) goalDailyLabelEl.textContent = dayGoal.isOverride ? 'Meta solo de este día' : 'Meta diaria';
  document.getElementById('goalAmountBadge').innerHTML = `<span class="gp-label">Meta</span><span class="gp-value">${escapeHtml(money(goalUsd))}</span>`;
  const goalAmountConvertedEl = document.getElementById('goalAmountConvertedText');
  if (goalAmountConvertedEl) {
    // Se arma a mano en vez de reutilizar convertedAmountText (que devuelve un solo string "≈ L
    // 123.45") porque aquí el "≈" necesita ir en el label muted y "L 123.45" en el valor bold.
    const exchangeRate = Number(settings.exchangeRate);
    const currencyLabelTrimmed = String(settings.currencyLabel || '').trim();
    const hasCurrency = Number.isFinite(exchangeRate) && exchangeRate > 0 && !!currencyLabelTrimmed;
    if (hasCurrency) {
      const convertedValue = currencyCeilFromUsdAmount(goalUsd, exchangeRate).toFixed(2);
      goalAmountConvertedEl.innerHTML = `<span class="gp-label">≈</span><span class="gp-value">${escapeHtml(currencyLabelTrimmed)} ${convertedValue}</span>`;
      goalAmountConvertedEl.style.display = '';
    } else {
      goalAmountConvertedEl.innerHTML = '';
      goalAmountConvertedEl.style.display = 'none';
    }
  }
  document.getElementById('goalMinBadge').innerHTML = `<span class="gp-label">Meta</span><span class="gp-value">${formatMinutes(goalMin)} min</span>`;
  document.getElementById('remainingText').innerHTML = `<span class="gp-label">Restan</span><span class="gp-value">${formatMinutes(remainingMin)} min</span>`;

  // Ciclo mostrado ahora mismo, independiente de "Día activo".
  const cycle = cycleEarningsForOffset(cycleViewOffset);
  const cycleValueEl = document.getElementById('cycleEarningsValue');
  if (cycleValueEl) cycleValueEl.textContent = money(cycle.earnings);
  const cycleConvertedEl = document.getElementById('cycleEarningsConvertedText');
  if (cycleConvertedEl) cycleConvertedEl.textContent = convertedAmountText(cycle.earnings);
  const cycleRangeEl = document.getElementById('cycleRangeBadge');
  if (cycleRangeEl) cycleRangeEl.textContent = `Ciclo: ${formatCallDayLabel(todayCallDateKey(cycle.start))} – ${formatCallDayLabel(todayCallDateKey(cycle.end))}${cycleViewOffset === 0 ? ' (actual)' : ''}`;
  const cyclePayEl = document.getElementById('cyclePayDateBadge');
  if (cyclePayEl) cyclePayEl.textContent = `Pago: ${formatCallDayLabel(todayCallDateKey(cycle.payDate))}`;
  const cycleWeek1El = document.getElementById('cycleWeek1ProductiveTag');
  if (cycleWeek1El) cycleWeek1El.textContent = `Semana 1: ${formatDuration(cycle.week1ProductiveMin * 60000)}`;
  const cycleWeek2El = document.getElementById('cycleWeek2ProductiveTag');
  if (cycleWeek2El) cycleWeek2El.textContent = `Semana 2: ${formatDuration(cycle.week2ProductiveMin * 60000)}`;
  const cycleTotalEl = document.getElementById('cycleTotalProductiveTag');
  if (cycleTotalEl) cycleTotalEl.textContent = `Total: ${formatDuration(cycle.totalProductiveMin * 60000)}`;
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
  if (cycleGoalAmountBadgeEl) cycleGoalAmountBadgeEl.textContent = `Meta ${money(cycleGoalAmount)}`;
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
      cycleGoalAmountConvertedEl.innerHTML = `<span class="gp-label">≈</span><span class="gp-value">${escapeHtml(cycleCurrencyLabelTrimmed)} ${cycleConvertedValue}</span>`;
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
      ? (isCustomCycleGoal ? 'Meta personalizada' : 'Sugerida automáticamente')
      : (isCustomCycleGoal ? 'Meta personalizada de ese ciclo' : 'Sugerida para ese ciclo');
  }
  const cycleGoalEditBtnEl = document.getElementById('cycleGoalEditBtn');
  if (cycleGoalEditBtnEl) cycleGoalEditBtnEl.style.display = cycleViewOffset === 0 ? '' : 'none';
  const adherenceForTag = dayAdherence(dayKey);
  const earningsTagsParts = [
    `<span class="tag ${hasShift ? 'good' : ''}" title="Tiempo transcurrido desde que iniciaste tu turno hoy">Conectado: ${hasShift ? formatDuration(connected * 60000) : '—'}</span>`,
    `<span class="tag good" title="Tiempo total que llevas en llamada hoy">Llamadas: ${formatCallTimeLabel(stats.total)}</span>`,
    `<span class="tag" title="Cantidad de llamadas registradas hoy">Total: ${dayCalls.length}</span>`,
    `<span class="tag" title="Llamadas marcadas como Billable hoy">Billable: ${stats.billable}</span>`,
    `<span class="tag" title="Llamadas marcadas como Dropped hoy">Dropped: ${stats.dropped}</span>`,
    `<span class="tag good" title="Tiempo de ACW/Available acumulado hoy (huecos entre llamadas sin clasificar como Break/Lunch/Otro)">ACW: ${formatDuration(stats.gapTotal * 60000)}</span>`,
    stats.breakGapTotal > 0 ? `<span class="tag warn" title="Tiempo de Break tomado hoy">Break: ${formatDuration(stats.breakGapTotal * 60000)}</span>` : '',
    stats.lunchGapTotal > 0 ? `<span class="tag cyan" title="Tiempo de Lunch tomado hoy">Lunch: ${formatDuration(stats.lunchGapTotal * 60000)}</span>` : '',
    stats.otherGapTotal > 0 ? `<span class="tag" title="Tiempo clasificado como Otro (huecos largos sin Break/Lunch real)">Otro: ${formatDuration(stats.otherGapTotal * 60000)}</span>` : '',
    higherRateBreakdownTagsHtml(stats.higherRateBreakdown, 'tag'),
    adherenceForTag ? `<span class="tag ${adherenceForTag.scorePct >= 90 ? 'good' : adherenceForTag.scorePct >= 70 ? 'warn' : 'bad'}" title="Qué tan apegado estuviste hoy a tu horario planeado">Adherencia: ${adherenceForTag.scorePct}%</span>` : '',
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
  return (label === 'break' || label === 'lunch') ? 'Total' : 'Residual';
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
    toast('La meta debe ser un número mayor a 0');
    return;
  }
  settings.acwMaxGoalMin = mins;
  saveSettingsOnly();
  closeModal('acwGoalModal');
  render();
  toast(`Meta máxima de ACW: ${formatMinutes(mins)} min`);
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
  editingGapContext = { dayKey: normalizedDayKey, gapKey };
  const label = annotation?.label || row.label || row.suggested || 'acw';
  const note = annotation?.note || '';
  const title = document.getElementById('gapModalTitle');
  const subtitle = document.getElementById('gapModalSubtitle');
  const preview = document.getElementById('gapPreviewText');
  const labelInput = document.getElementById('gapLabelInput');
  const noteInput = document.getElementById('gapNoteInput');

  // El hueco entre "Iniciar shift" y la primera llamada del día (ver dayGapRows) ahora también es
  // editable desde aquí, pero su `prev` es un marcador virtual.
  const prevLabel = row.isShiftStartGap ? 'Inicio de turno' : `#${row.prev.customerId}`;
  const prevTimeLabel = row.isShiftStartGap ? timeLabelFromDate(new Date(row.prev.startISO)) : row.prev.callStart;
  if (title) title.textContent = `Editar hueco · ${prevLabel} → #${row.cur.customerId}`;
  if (subtitle) subtitle.textContent = `${prevTimeLabel} → ${row.cur.callStart} · ${formatMinutes(row.residual)} min útiles`;
  if (preview) {
    preview.textContent = annotation
      ? `Clasificación guardada: ${gapLabelText(label)}${note ? ` · Nota: ${note}` : ''}`
      : `Sugerido: ${gapLabelText(row.suggested)} · ${gapDisplayAmountUnitLabel(row.suggested)} ${gapDisplayAmountForLabel(row, row.suggested).toFixed(1)} min`;
  }
  if (labelInput) labelInput.value = label;
  if (noteInput) noteInput.value = note;
  syncGapTagButtonsUI();
  openModal('gapModal');
}

function saveGapEditor() {
  if (!editingGapContext) return;
  const labelInput = document.getElementById('gapLabelInput');
  const noteInput = document.getElementById('gapNoteInput');
  const label = String(labelInput?.value || 'acw').toLowerCase();
  const note = String(noteInput?.value || '').trim();
  setGapAnnotation(editingGapContext.dayKey, editingGapContext.gapKey, { label, note });
  editingGapContext = null;
  closeModal('gapModal');
  toast('Hueco guardado');
}

// Editar día (Resumen semanal)
let editingDayNoteKey = null;

const DAY_NOTE_STATUS_HINTS = {
  '': 'Automático: se decide según tu horario semanal. Si hay llamadas o turno en un día libre, cuenta como trabajado.',
  work: 'Trabajado: se exige Adherencia y suma a tu meta del ciclo, aunque tu horario diga que es libre.',
  off: 'Libre: no se exige Adherencia y el día no suma a tu meta del ciclo. Tus llamadas y turno ya registrados no se tocan.',
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
  const note = getDayNote(normalized);
  const titleEl = document.getElementById('dayNoteModalTitle');
  const statusInput = document.getElementById('dayNoteStatusInput');
  const categoryInput = document.getElementById('dayNoteCategoryInput');
  const commentInput = document.getElementById('dayNoteCommentInput');
  if (titleEl) titleEl.textContent = `Editar día · ${formatCallDayLabel(normalized)}`;
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
  if (!editingDayNoteKey) return;
  const statusInput = document.getElementById('dayNoteStatusInput');
  const categoryInput = document.getElementById('dayNoteCategoryInput');
  const commentInput = document.getElementById('dayNoteCommentInput');
  setDayNote(editingDayNoteKey, { category: categoryInput?.value || '', comment: commentInput?.value || '', forcedStatus: statusInput?.value || '' });
  editingDayNoteKey = null;
  closeModal('dayNoteModal');
  toast('Día guardado');
}

function clearDayNoteFromModal() {
  if (!editingDayNoteKey) return;
  const statusInput = document.getElementById('dayNoteStatusInput');
  setDayNote(editingDayNoteKey, { category: '', comment: '', forcedStatus: statusInput?.value || '' });
  editingDayNoteKey = null;
  closeModal('dayNoteModal');
  toast('Nota eliminada');
}

let editingCallId = null;

// Filtro Todo/Llamadas/Acciones sobre la tabla fusionada "Tabla de llamadas y acciones de hoy" (ver
// #tableFilterRow en el HTML y dayActionRows/renderTable más abajo). Vive en memoria, no en
// localStorage.
let tableFilterMode = 'all'; // 'all' | 'calls' | 'actions'.

// Editor de una llamada ya importada: corrige duración, pago, billable y dropped.
function openCallEditor(callId) {
  const call = calls.find(c => c.id === callId);
  if (!call) {
    toast('No pude encontrar esa llamada');
    return;
  }
  editingCallId = callId;
  const title = document.getElementById('callEditModalTitle');
  const preview = document.getElementById('callEditPreviewText');
  const durationInput = document.getElementById('callEditDurationInput');
  const payInput = document.getElementById('callEditPayInput');
  const billableInput = document.getElementById('callEditBillableInput');
  const droppedInput = document.getElementById('callEditDroppedInput');

  if (title) title.textContent = `Editar llamada · #${call.customerId}`;
  if (preview) preview.textContent = `${call.callDate} · ${call.callStart} — los datos de fecha/hora no se pueden editar aquí, solo duración, pago, billable y dropped.`;
  if (durationInput) durationInput.value = call.durationMin;
  if (payInput) payInput.value = parseMoney(call.pay).toFixed(2);
  if (billableInput) billableInput.value = String(call.billable).toLowerCase() === 'yes' ? 'Yes' : 'No';
  if (droppedInput) droppedInput.value = String(call.dropped).toLowerCase() === 'yes' ? 'Yes' : 'No';
  syncManualCallPillsUI('callEditModal');

  // El nivel de Higher Rate NO se elige aquí: lo decide la ventana configurada
  // (higherRateBonusForCall). Esta sección solo informa cuál aplica, para que el Pago de arriba se
  // mantenga siendo el pago base que reporta Propio.
  const infoEl = document.getElementById('callEditHigherRateInfo');
  const infoTextEl = document.getElementById('callEditHigherRateInfoText');
  const warningEl = document.getElementById('callEditHigherRateWarning');
  const warningTextEl = document.getElementById('callEditHigherRateWarningText');
  const existingBonus = higherRateBonusForCall(call);
  if (infoEl && infoTextEl && warningEl && warningTextEl) {
    if (existingBonus) {
      const tierMeta = HIGHER_RATE_TIERS[existingBonus.tier];
      const tierLabel = tierMeta?.label || existingBonus.tier;
      infoTextEl.innerHTML = `Esta llamada cae en una ventana <strong>${escapeHtml(tierLabel)}</strong> (+${money(tierMeta?.bonusPerMin || 0)}/min), así que ya suma <strong>${money(existingBonus.amount)}</strong>${financeConvertedInline(existingBonus.amount)} de bono aparte del Pago de arriba. Para cambiar el nivel, edita esa ventana en "Higher Rate" (botón del header) — no hace falta tocar el Pago.`;
      infoEl.style.display = '';
      warningEl.style.display = 'none';
    } else {
      warningTextEl.textContent = 'Esta llamada no cae en ninguna ventana de Higher Rate, así que no lleva bono. El nivel se calcula solo desde tus ventanas: agrégala o ajústala en "Higher Rate" (botón del header) y el bono se suma solo a esta llamada.';
      warningEl.style.display = '';
      infoEl.style.display = 'none';
    }
  }

  openModal('callEditModal');
}

function saveCallEditor() {
  if (!editingCallId) return;
  const durationInput = document.getElementById('callEditDurationInput');
  const payInput = document.getElementById('callEditPayInput');
  const billableInput = document.getElementById('callEditBillableInput');
  const droppedInput = document.getElementById('callEditDroppedInput');

  const duration = Number(durationInput?.value);
  if (!Number.isFinite(duration) || duration < 0 || duration > MAX_CALL_DURATION_MIN) {
    toast(`La duración debe ser un número entre 0 y ${MAX_CALL_DURATION_MIN} minutos`);
    return;
  }
  // ParseMoney preserva el signo '-' a propósito (para poder leer valores ya negativos de datos
  // viejos/importados), así que un valor negativo tecleado a mano se guardaba tal cual.
  const pay = Math.max(0, parseMoney(payInput?.value)).toFixed(2);
  const billable = billableInput?.value === 'Yes' ? 'Yes' : 'No';
  const dropped = droppedInput?.value === 'Yes' ? 'Yes' : 'No';

  const original = calls.find(c => c.id === editingCallId);
  if (!original) return;
  const start = new Date(original.startISO);
  const end = new Date(start.getTime() + duration * 60000);
  const candidate = { ...original, startISO: start.toISOString(), endISO: end.toISOString() };

  // Alargar la duración puede encimar esta llamada con la siguiente o la anterior: se valida el
  // traslape.
  const overlapsWith = calls.find(c => c.id !== editingCallId && callsOverlap(c, candidate));
  if (overlapsWith) {
    toast(`Esa duración traslapa con la llamada #${overlapsWith.customerId} (${overlapsWith.callStart}). Ajusta la duración.`);
    return;
  }

  calls = calls.map(c => {
    if (c.id !== editingCallId) return c;
    // El startISO NO cambia (por eso no se puede editar fecha/hora aquí), así que las anotaciones
    // de gap ligadas a esta llamada (que usan startISO) siguen siendo válidas después de editar.
    return {
      ...c,
      durationMin: duration,
      pay,
      billable,
      dropped,
      endISO: end.toISOString(),
      countsAsProductive: billable === 'Yes' && dropped === 'No',
    };
  });

  editingCallId = null;
  closeModal('callEditModal');
  financeRunAutoFillCascade();
  saveAll();
  toast('Llamada actualizada');
}

// Borra una llamada individual desde "Tabla completa" (botón "Eliminar" junto a "Editar", ver
// renderTable).
function deleteCallRecord(callId) {
  const call = calls.find(c => c.id === callId);
  if (!call) return false;
  calls = calls.filter(c => c.id !== callId);
  saveAll();
  toast('Llamada eliminada');
  return true;
}

// Botón "🗑️ Vaciar llamadas del día" dentro de "Tabla de llamadas" — distinto de "Reiniciar día"
// (que además borra pausas/turno/huecos/nota/log de ese día).
function clearActiveDayCalls() {
  const dayKey = getActiveDayKey();
  const dayCallsList = callsForDay(dayKey);
  if (!dayCallsList.length) {
    toast('No hay llamadas que borrar en este día.');
    return;
  }
  const count = dayCallsList.length;
  const plural = count === 1 ? 'llamada' : 'llamadas';
  appConfirm(`¿Vaciar TODAS las ${plural} de ${formatCallDayLabel(dayKey)} (${count})? Tu turno, pausas y horario de ese día no se tocan. No se puede deshacer.`, () => {
    calls = calls.filter(c => callDateKeyFromValue(c.callDate) !== dayKey);
    saveAll();
    toast(`${count} ${plural} de ${formatCallDayLabel(dayKey)} borrada(s)`);
  });
}

// Agregar llamada manual ---- Para llamadas que nunca llegan en la exportación de Propio (ej. una
// llamada tomada fuera de la plataforma, o una que se te olvidó pegar).

let manualCallPayDirty = false;

// Tile de tarifa seleccionado actualmente en Agregar llamada manual — 'normal' por default (mismo
// resultado que el estimado de siempre, tasa base sin bono).
let manualCallSelectedRateTile = 'normal';

// Este modal puede abrirse como respaldo de una llamada en vivo ya colgada: cerrarlo sin guardar
// pierde ese tiempo.
let manualCallLiveBackupPending = false;

// Convierte "HH:MM" (24h, valor crudo de <input type="time">) al formato "h:mm AM/PM" que usa
// internamente callStart (el mismo formato que toDateFromInputs/parseCalls esperan al leer la
// exportación real de Propio)
function callStartLabelFromHHMM(hhmm) {
  const normalized = formatHHMM(hhmm);
  const [h, m] = normalized.split(':').map(Number);
  const hour12 = h % 12 || 12;
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${hour12}:${pad(m)} ${suffix}`;
}

// Estimado de pago = duración × tasa del tile elegido. Es solo un punto de partida editable.
function manualCallEstimatedPay(durationMin, tileKey = 'normal') {
  return Number((durationMin * rateTilePerMin(tileKey)).toFixed(2));
}

// Prellena los campos del modal — extraído de openManualCallModal para poder reutilizarlo también
// cuando el modal se abre al TERMINAR una llamada en vivo (ver endCall), con los mismos campos
// pero.
function prefillManualCallForm({ dayKey, startDate, durationMin }) {
  const dateInput = document.getElementById('manualCallDateInput');
  const startInput = document.getElementById('manualCallStartInput');
  const durationInput = document.getElementById('manualCallDurationInput');
  const payInput = document.getElementById('manualCallPayInput');
  const billableInput = document.getElementById('manualCallBillableInput');
  const droppedInput = document.getElementById('manualCallDroppedInput');
  const customerIdInput = document.getElementById('manualCallCustomerIdInput');

  if (dateInput) dateInput.value = isoDateFromDayKey(dayKey);
  if (startInput) startInput.value = `${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`;
  if (durationInput) durationInput.value = durationMin === '' ? '' : String(durationMin);
  if (payInput) payInput.value = '';
  if (billableInput) billableInput.value = 'Yes';
  if (droppedInput) droppedInput.value = 'No';
  if (customerIdInput) customerIdInput.value = '';
  manualCallSelectedRateTile = 'normal';
  renderRateTiles('manualCallRateTiles', 'normal');
  syncManualCallPillsUI();
  updateManualCallPreview();
}

function syncManualCallPillsUI(containerId = 'manualCallModal') {
  document.querySelectorAll(`#${containerId} .mc-pill-row`).forEach(row => {
    const btns = row.querySelectorAll('.mc-pill-btn');
    if (!btns.length) return;
    const targetId = btns[0].getAttribute('data-mc-pill-for');
    const select = document.getElementById(targetId);
    const current = select ? select.value : null;
    btns.forEach(b => b.setAttribute('aria-pressed', b.getAttribute('data-mc-pill-value') === current ? 'true' : 'false'));
  });
}

function openManualCallModal() {
  manualCallPayDirty = false;
  // Este es un "Agregar llamada manual" normal, no un respaldo de llamada en vivo — cerrar sin
  // guardar aquí nunca pierde tiempo de trabajo ya registrado, así que no exige confirmación.
  manualCallLiveBackupPending = false;
  const title = document.getElementById('manualCallModalTitle');
  const subtitle = document.getElementById('manualCallModalSubtitle');
  if (title) title.textContent = 'Agregar llamada manual';
  if (subtitle) subtitle.textContent = 'Para una llamada que no vino en la exportación de Propio. Se guarda igual que cualquier otra fila — mismo cálculo de huecos, ACW y ganancias.';
  prefillManualCallForm({ dayKey: getActiveDayKey(), startDate: new Date(), durationMin: '' });
  openModal('manualCallModal');
}

// Desde, esta variante YA NO es el camino normal al terminar una llamada (ver autoSaveLiveCall más
// abajo, que guarda sola sin abrir nada)
function openManualCallModalFromLiveCall(startedAtISO, endedAtISO) {
  manualCallPayDirty = false;
  // Este modal SÍ representa una llamada real que ya se colgó y cuyo guardado automático falló
  // (traslape/duplicado)
  manualCallLiveBackupPending = true;
  const start = new Date(startedAtISO);
  const end = new Date(endedAtISO);
  const durationMin = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
  const title = document.getElementById('manualCallModalTitle');
  const subtitle = document.getElementById('manualCallModalSubtitle');
  if (title) title.textContent = 'Guardar llamada';
  if (subtitle) subtitle.textContent = `Llamada terminada: ${timeLabelFromDate(start)} – ${timeLabelFromDate(end)} (${formatDuration(durationMin * 60000)}). Ajusta lo que haga falta antes de guardarla.`;
  prefillManualCallForm({ dayKey: todayCallDateKey(start), startDate: start, durationMin });
  openModal('manualCallModal');
}

// Punto único de salida para cerrar #manualCallModal desde cualquier camino (botón "×", click fuera
// del modal, tecla Escape).
function requestCloseManualCallModal() {
  if (!manualCallLiveBackupPending) {
    closeModal('manualCallModal');
    return;
  }
  appConfirm('¿Descartar esta llamada sin guardarla? La llamada que acabas de colgar se perderá por completo — no quedará ningún registro de ese tiempo trabajado.', () => {
    manualCallLiveBackupPending = false;
    closeModal('manualCallModal');
  });
}

// Aplica el tile elegido en Agregar llamada manual: recalcula el estimado de Pago contra la tasa de
// ese nivel.
function applyRateTileToManualCall(tileKey) {
  manualCallSelectedRateTile = tileKey;
  renderRateTiles('manualCallRateTiles', tileKey);
  manualCallPayDirty = false;
  updateManualCallPreview();
}

function updateManualCallPreview() {
  const durationInput = document.getElementById('manualCallDurationInput');
  const payInput = document.getElementById('manualCallPayInput');
  const preview = document.getElementById('manualCallPreviewText');
  const duration = Number(durationInput?.value);
  const validDuration = Number.isFinite(duration) && duration >= 0;

  if (validDuration && !manualCallPayDirty && payInput) {
    payInput.value = manualCallEstimatedPay(duration, manualCallSelectedRateTile).toFixed(2);
  }
  if (preview) {
    preview.textContent = validDuration
      ? `Se guardará como ${formatDuration(duration * 60000)} de llamada.`
      : 'Completa los campos para agregar la llamada.';
  }
}

// Arma el objeto "llamada" a partir de datos ya resueltos (fecha/hora/
// duración/billable/dropped/pago/customerId)
function buildManualCallCandidate({ customerId, callDate, callStart, durationMin, billable, dropped, pay }) {
  const start = toDateFromInputs(callDate, callStart);
  if (!start) return null;
  const end = new Date(start.getTime() + durationMin * 60000);
  return {
    id: makeLocalId(),
    // Mismo patrón que ya se ve en pantalla para llamadas manuales (Tabla completa/tarjetas mobile
    // ya renderizan "#Manual" cuando no hay customer ID real)
    customerId: String(customerId || '').trim() || 'Manual',
    callDate,
    callStart,
    durationMin,
    billable,
    dropped,
    pay,
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    countsAsProductive: billable === 'Yes' && dropped === 'No',
    // Se marca "importada ahora" igual que una fila pegada (importCalls)
    importedAt: new Date().toISOString(),
  };
}

// A diferencia de buildManualCallCandidate, aquí el inicio y el fin traen segundos reales, no salen
// de un <input type="time">.
function buildLiveCallCandidate({ customerId, startedAtISO, endedAtISO, billable, dropped, pay }) {
  const start = new Date(startedAtISO);
  const rawEnd = new Date(endedAtISO);
  if (Number.isNaN(start.getTime()) || Number.isNaN(rawEnd.getTime())) return null;
  const durationMin = Math.max(1, Math.round((rawEnd.getTime() - start.getTime()) / 60000));
  // Si el fin no quedó después del inicio, se reconstruye con la duración redondeada.
  const end = rawEnd.getTime() > start.getTime() ? rawEnd : new Date(start.getTime() + durationMin * 60000);
  return {
    id: makeLocalId(),
    customerId: String(customerId || '').trim() || 'Manual',
    callDate: todayCallDateKey(start),
    // CallStart es solo el texto que se ve en Tabla de llamadas — se deriva igual que siempre
    // (hora/minuto), pero NO se usa para calcular startISO/endISO (ver arriba)
    callStart: callStartLabelFromHHMM(`${pad(start.getHours())}:${pad(start.getMinutes())}`),
    durationMin,
    billable,
    dropped,
    pay,
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    countsAsProductive: billable === 'Yes' && dropped === 'No',
    importedAt: new Date().toISOString(),
  };
}

// Revisa traslape/duplicado exacto (mismas 2 validaciones que ya protegían
// importCalls/saveCallEditor/el modal manual) y, si pasa, guarda la llamada en `calls` y actualiza
// el día activo. NO llama a saveAll/toast.
function trySaveCallCandidate(candidate) {
  if (!candidate) return { ok: false, reason: 'Fecha u hora inválida' };
  const overlapsWith = calls.find(c => callsOverlap(c, candidate));
  if (overlapsWith) {
    return { ok: false, reason: `Esa hora se traslapa con la llamada #${overlapsWith.customerId} (${overlapsWith.callStart}). Ajusta la hora o la duración.` };
  }
  const key = callDedupeKey(candidate);
  if (calls.some(c => callDedupeKey(c) === key)) {
    return { ok: false, reason: 'Ya existe una llamada idéntica guardada (mismo cliente, fecha, hora, duración, pago, billable y dropped).' };
  }
  calls = [...calls, candidate].sort((a, b) => new Date(a.startISO) - new Date(b.startISO));
  // Igual que importCalls, si agregaste la llamada para un día distinto al que estabas viendo, "Día
  // activo" salta a ese día para que la veas de inmediato reflejada.
  state.activeDayKey = candidate.callDate;
  return { ok: true };
}

function saveManualCall() {
  const dateInput = document.getElementById('manualCallDateInput');
  const startInput = document.getElementById('manualCallStartInput');
  const durationInput = document.getElementById('manualCallDurationInput');
  const payInput = document.getElementById('manualCallPayInput');
  const billableInput = document.getElementById('manualCallBillableInput');
  const droppedInput = document.getElementById('manualCallDroppedInput');
  const customerIdInput = document.getElementById('manualCallCustomerIdInput');

  const callDate = dayKeyFromIsoDate(dateInput?.value);
  if (!callDate) {
    toast('Elige una fecha válida');
    return;
  }
  const duration = Number(durationInput?.value);
  if (!Number.isFinite(duration) || duration < 0 || duration > MAX_CALL_DURATION_MIN) {
    toast(`La duración debe ser un número entre 0 y ${MAX_CALL_DURATION_MIN} minutos`);
    return;
  }
  const callStart = callStartLabelFromHHMM(startInput?.value);
  const billable = billableInput?.value === 'Yes' ? 'Yes' : 'No';
  const dropped = droppedInput?.value === 'Yes' ? 'Yes' : 'No';
  const pay = Math.max(0, parseMoney(payInput?.value || manualCallEstimatedPay(duration))).toFixed(2);
  const customerId = customerIdInput?.value || '';

  const candidate = buildManualCallCandidate({ customerId, callDate, callStart, durationMin: duration, billable, dropped, pay });
  const result = trySaveCallCandidate(candidate);
  if (!result.ok) {
    toast(result.reason);
    return;
  }
  // Guardado exitoso (sea "Agregar llamada manual" normal o el respaldo de una llamada en vivo): ya
  // no hay nada que perder al cerrar, se apaga la bandera antes de cerrar sin preguntar.
  manualCallLiveBackupPending = false;
  closeModal('manualCallModal');
  financeRunAutoFillCascade();
  saveAll();
  toast('Llamada agregada');
}

// Terminar una llamada y querer empezar otra de inmediato (mismo minuto o cualquier otro) "no
// dejaba" — el modal de "Guardar llamada" cubre toda la pantalla y bloquea el click a "Iniciar
// llamada" hasta resolverlo.
function autoSaveLiveCall(startedAtISO, endedAtISO) {
  const durationMin = Math.max(1, Math.round((new Date(endedAtISO).getTime() - new Date(startedAtISO).getTime()) / 60000));
  const pay = manualCallEstimatedPay(durationMin, 'normal').toFixed(2);

  const candidate = buildLiveCallCandidate({
    customerId: '',
    startedAtISO,
    endedAtISO,
    billable: 'Yes',
    dropped: 'No',
    pay,
  });
  const result = trySaveCallCandidate(candidate);

  if (result.ok) {
    financeRunAutoFillCascade();
    saveAll();
    toast(`Llamada guardada (${formatDuration(durationMin * 60000)}) — edítala en Tabla de llamadas si hace falta`);
  } else {
    toast(result.reason);
    openManualCallModalFromLiveCall(startedAtISO, endedAtISO);
  }
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
      return `
        <div class="block-summary-card ${extraClass}" data-accent="${escapeHtml(c.accent)}" style="opacity:.82;">
          <div class="bsc-top">
            <span class="bsc-icon">${c.icon}</span>
            <span class="bsc-name">${escapeHtml(c.name)}</span>
          </div>
          <div class="bsc-range">${escapeHtml(c.range)}</div>
          ${c.rangeExtra ? `<div class="bsc-range" style="opacity:.7;">${escapeHtml(c.rangeExtra)}</div>` : ''}
        </div>
      `;
    }
    const pct = Math.max(0, Math.min(100, Number(c.pct) || 0));
    // La tarjeta de ACW lleva un botón ✎ para editar su propia meta máxima (ver #acwGoalModal,
    // delegado por `data-edit-card`)
    const editBtnHtml = c.editable
      ? `<button class="bsc-edit-btn" type="button" data-edit-card="${escapeHtml(c.editable)}" aria-label="Editar meta de ${escapeHtml(c.name)}" title="Editar meta"><svg class="ic-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>`
      : '';
    return `
      <div class="block-summary-card ${extraClass}" data-accent="${escapeHtml(c.accent)}" style="--bsc-pct:${pct}%">
        <div class="bsc-fill" style="width:${pct}%"></div>
        <div class="bsc-top">
          <span class="bsc-icon">${c.icon}</span>
          <span class="bsc-name">${escapeHtml(c.name)}</span>
          ${editBtnHtml}
        </div>
        <div class="bsc-range">${escapeHtml(c.range)}</div>
        ${c.rangeExtra ? `<div class="bsc-range" style="opacity:.7;">${escapeHtml(c.rangeExtra)}</div>` : ''}
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
  el.innerHTML = `
    <div class="block-summary-shift-row">${cardHtml(shiftCard, 'block-summary-card-shift')}</div>
    ${restCards.length ? `<div class="block-summary-strip">${restCards.map(c => cardHtml(c)).join('')}</div>` : ''}
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
      const shiftSessions = dayShiftSessions(dayKey);
      const shiftStart = shiftSessions[0]?.start || null;
      const lastShiftSessionForBounds = shiftSessions[shiftSessions.length - 1] || null;
      const shiftEnd = lastShiftSessionForBounds && !lastShiftSessionForBounds.live ? lastShiftSessionForBounds.end : null;
      const live = !!(lastShiftSessionForBounds && lastShiftSessionForBounds.live);
      const now = new Date();
      const t = now.getHours() * 60 + now.getMinutes();
      const wrap = document.getElementById('scheduleList');
      const subtitle = document.getElementById('scheduleSubtitle');
      const dayCfg = dayConfigFor(dayKey);
      const plannedSlots = getEffectiveScheduleForDay(dayKey);
      // Slots originales (sin correr) para la adherencia por bloque: mismo orden e índices que
      // plannedSlots.
      const originalPlannedSlots = originalPlannedSlotsForDay(dayKey);
      if (subtitle) {
        subtitle.textContent = dayIsEffectivelyOff(dayKey)
          ? 'Día libre según tu horario semanal.'
          : (settings.lateArrivalMode === 'shift'
              ? 'Tu horario planeado, corrido si llegaste tarde (ver "Si llegas tarde a tu turno" en Horario).'
              : 'Tu horario planeado. Si llegas tarde o te pasas de un break, aquí se ve la diferencia contra el plan.');
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
            ? 'Marcaste este día como Trabajado a mano (Resumen semanal → Editar día) — no aparece libre, aunque tu horario diga que sí lo es.'
            : 'Trabajaste en tu día libre — no aparece marcado como libre, se ve igual que un día laboral normal.';
          offWorkedNote.style.display = 'block';
        } else if (!cfgIsOff && isOff) {
          offWorkedNote.textContent = 'Marcaste este día como Libre a mano (Resumen semanal → Editar día) — no se exige Adherencia, aunque tenías turno planeado.';
          offWorkedNote.style.display = 'block';
        } else {
          offWorkedNote.style.display = 'none';
        }
      }

      if (!plannedSlots.length) {
        wrap.innerHTML = '<div class="note">No hay horario configurado para este día. Edítalo en “Horario”.</div>';
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

      const slotRows = plannedSlots.map((slot, slotIdx) => {
        const s = toMinutes(slot.start), e = toMinutes(slot.end);
        const active = t >= s && t < e && dayKey === todayCallDateKey();
        const done = dayKey === todayCallDateKey() ? t >= e : !!(shiftEnd && shiftEnd >= dateAtTime(callDateToDate(dayKey) || new Date(), slot.end));
        const extendStart = slotIdx === firstWorkIndex ? shiftStart : null;
        const extendEnd = slotIdx === lastWorkIndex ? shiftEnd : null;
        const stats = slotStats(slot, dayCalls, dayPauses, shiftStart, shiftEnd, dayKey, extendStart, extendEnd);
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
        const statusText = active ? 'Actual' : done ? 'Hecho' : (isPastDay ? (shiftStart ? 'Incompleto' : 'Sin actividad') : 'Próximo');
        const statusClass = stats.statusTone === 'good' ? 'good' : stats.statusTone === 'warn' ? 'warn' : stats.statusTone === 'bad' ? 'bad' : '';
        const progressLabel = slot.type === 'Work'
          ? (stats.realActivityRange
              ? `Actividad real: ${timeLabelFromDate(stats.realActivityRange.start)} – ${timeLabelFromDate(stats.realActivityRange.end)} · ${stats.realActivityRange.callCount} llamada(s)`
              : `${formatDuration(stats.filledMin * 60000)} usados · ${Math.round(stats.pct)}%`)
          : stats.actualPauseRange
            ? `Pausa real: ${formatDuration(stats.actualPauseRange.durationMin * 60000)} (${timeLabelFromDate(stats.actualPauseRange.start)} – ${stats.actualPauseRange.live ? 'en curso' : timeLabelFromDate(stats.actualPauseRange.end)})`
            : `${formatDuration(stats.filledMin * 60000)} de ${formatDuration(stats.durationMin * 60000)} · ${Math.round(stats.pct)}%`;

        // Reemplaza el desglose de "Margen del día" por cada bloque de Trabajo — ahora es una Meta
        // de Productividad EN MINUTOS, configurable POR BLOQUE (Horario → Bloques → "Meta
        // productiva (min)").
        let goalBarHtml = '';
        if (slot.type === 'Work' && stats.productivityGoal) {
          const g = stats.productivityGoal;
          const goalIconHtml = g.met ? `${iconHtml('checkCircle')} ` : '';
          const goalText = g.met
            ? `Meta productiva alcanzada: ${formatMinutes(g.achievedMin)}/${formatMinutes(g.goalMin)} min`
            : `Meta productiva: ${formatMinutes(g.achievedMin)}/${formatMinutes(g.goalMin)} min`;
          const goalLabelColor = g.met ? `color: var(--good); font-weight: 800;` : '';
          const goalFill = g.met ? 'linear-gradient(90deg, var(--good), var(--teal))' : 'linear-gradient(90deg, var(--teal), var(--blue))';
          goalBarHtml = `
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
          const text = `Adherencia del bloque: ${slotAdherence.pct}% (${slotAdherence.adherentMinutes}/${slotAdherence.total} min)${reasonSuffix}`;
          const diagnosticIcon = tone === 'good' ? iconHtml('checkCircle') : iconHtml('alertTriangle');
          const diagnosticFill = tone === 'good' ? 'linear-gradient(90deg, var(--good), var(--teal))' : tone === 'warn' ? 'linear-gradient(90deg, var(--warn), #ffcf7d)' : 'linear-gradient(90deg, var(--bad), #ff8a95)';
          adherenceBarHtml = `
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
          ? `
              <div class="sblk-bar-row tight">
                <div class="sblk-bar-label-row"><span>Productividad</span><span>${Math.round(stats.productivityPct)}%</span></div>
                <div class="sblk-bar-track" aria-label="${escapeHtml(slot.name)} productividad"><div style="width:${stats.productivityPct}%; background: linear-gradient(90deg, var(--good), var(--teal));"></div></div>
              </div>
            `
          : '';

        // Mismo relleno "líquido" de las tarjetas de "Turno de Hoy"
        const slotAccent = slot.type === 'Work' ? 'cyan' : slot.type === 'Break' ? 'warn' : 'blue';
        const usedFillColor = slot.type === 'Work' ? 'var(--cyan)' : slot.type === 'Break' ? 'var(--warn)' : 'var(--blue)';

        const badgeToneClass = statusText === 'Hecho' ? 'good' : statusText === 'Omitido' ? 'bad' : (statusText === 'Incompleto' || statusText === 'Actual') ? 'warn' : '';
        const icon = slot.type === 'Work' ? iconHtml('briefcase') : slot.type === 'Break' ? iconHtml('coffee') : iconHtml('utensils');
        const statusDetailLine = stats.status
          ? `<div class="sblk-meta-line" style="${statusClass ? `color: var(--${statusClass}); font-weight: 700;` : ''}">${escapeHtml(stats.status)}</div>`
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

        return `
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
      const plannedShiftMin = Math.max(0, toMinutes(shiftWindowForCard.end) - toMinutes(shiftWindowForCard.start));
      const shiftConnectedMin = shiftStart ? connectedMinutesForDay(dayKey) : 0;
      const shiftPct = plannedShiftMin > 0 ? Math.min(100, (shiftConnectedMin / plannedShiftMin) * 100) : 0;
      summaryCards.push({
        name: 'Shift',
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
        const nextText = `Siguiente: ${timeLabel(blocks[1].start)} – ${timeLabel(blocks[1].end)}`;
        const rangeExtra = extraCount > 0 ? `${nextText} · +${extraCount} más` : nextText;
        return { range, rangeExtra };
      };
      // Sin Break/Lunch planeado hoy, la tarjeta se muestra igual con el texto "sin plan".
      if (breakCount > 0) {
        const { range, rangeExtra } = rangeWithNext(breakBlockTimes);
        summaryCards.push({
          name: 'Break',
          icon: iconHtml('coffee'),
          accent: 'warn',
          range,
          rangeExtra,
          pct: breakPlannedMin > 0 ? Math.min(100, (breakFilledMin / breakPlannedMin) * 100) : 0,
        });
      } else {
        summaryCards.push({
          name: 'Break',
          icon: iconHtml('coffee'),
          accent: 'warn',
          range: 'Sin Break planeado hoy',
          rangeExtra: 'Puedes tomarlo cuando quieras',
          pct: 0,
          noPlan: true,
        });
      }
      if (lunchCount > 0) {
        const { range, rangeExtra } = rangeWithNext(lunchBlockTimes);
        summaryCards.push({
          name: 'Lunch',
          icon: iconHtml('utensils'),
          accent: 'blue',
          range,
          rangeExtra,
          pct: lunchPlannedMin > 0 ? Math.min(100, (lunchFilledMin / lunchPlannedMin) * 100) : 0,
        });
      } else {
        summaryCards.push({
          name: 'Lunch',
          icon: iconHtml('utensils'),
          accent: 'blue',
          range: 'Sin Lunch planeado hoy',
          rangeExtra: 'Puedes tomarlo cuando quieras',
          pct: 0,
          noPlan: true,
        });
      }

      // ACW (última): total de ACW acumulado en el día (mismo importedCallStats.gapTotal que ya usa
      // el tag "ACW" de Ganancias de hoy/Tabla de llamadas).
      const dayCallStatsForCard = importedCallStats(dayCalls, dayKey);
      const acwGoalMin = Number(settings.acwMaxGoalMin) > 0 ? Number(settings.acwMaxGoalMin) : 60;
      const acwPct = Math.min(100, (dayCallStatsForCard.gapTotal / acwGoalMin) * 100);
      summaryCards.push({
        name: 'ACW',
        icon: iconHtml('timer'),
        accent: 'good',
        range: `Total: ${formatDuration(dayCallStatsForCard.gapTotal * 60000)} de Max ${formatMinutes(acwGoalMin)} min`,
        pct: acwPct,
        editable: 'acw',
      });

      renderBlockSummaryStrip(summaryCards);


      // Indicador en vivo — solo aplica viendo "Hoy" con el turno en curso.
      const adherenceLiveBadge = document.getElementById('adherenceLiveBadge');
      if (adherenceLiveBadge) {
        const isLiveException = dayKey === todayCallDateKey() && isRightNowOutOfAdherence();
        adherenceLiveBadge.style.display = isLiveException ? '' : 'none';
      }

    }

    
// Fusión de "Turno de Hoy" dentro de la tabla de llamadas. Arma las filas de "acción" del día —
// reutiliza 100% datos que la app ya calculaba, sin ningún registro nuevo.
function dayActionRows(dayKey) {
  const normalized = callDateKeyFromValue(dayKey);
  const rows = [];

  dayEvents(normalized).forEach(e => {
    if (!['shift', 'break', 'lunch', 'import'].includes(e.type)) return;
    let durationMin = null;
    // Para "Break/Lunch terminado" se busca la pausa real más cercana en el tiempo (mismo tipo,
    // mismo día) para mostrar cuánto duró — mismo dato que ya se ve en "Bloques del día", aquí como
    // referencia rápida. Tolerancia de 5s.
    if (/terminado/i.test(e.title) && (e.type === 'break' || e.type === 'lunch')) {
      const closeTime = new Date(e.ts).getTime();
      let best = null, bestDiff = Infinity;
      state.pauseHistory.forEach(p => {
        if (p.type !== e.type || !sameCallDay(p.endedAt, normalized)) return;
        const diff = Math.abs(new Date(p.endedAt).getTime() - closeTime);
        if (diff < bestDiff) { bestDiff = diff; best = p; }
      });
      if (best && bestDiff < 5000) {
        durationMin = Math.max(0, (new Date(best.endedAt).getTime() - new Date(best.startedAt).getTime()) / 60000);
      }
    }
    rows.push({
      ts: e.ts,
      badgeLabel: e.type === 'shift' ? 'Shift' : e.type === 'break' ? 'Break' : e.type === 'lunch' ? 'Lunch' : 'Importación',
      badgeClass: `type-${e.type}`,
      detail: e.title,
      note: '',
      durationMin,
      editable: false,
      gapKey: null,
    });
  });

  dayGapRows(normalized).forEach(g => {
    if (g.raw <= 0) return;
    // Un hueco ACW/Otro reclasificado a mano como Break/Lunch desde "Editar hueco" pasaba a
    // excluirse de esta lista (el filtro solo dejaba pasar label==='acw'/'other')
    const isAcwOrOther = g.label === 'acw' || g.label === 'other';
    const isManualBreakOrLunch = g.manual && (g.label === 'break' || g.label === 'lunch');
    if (!isAcwOrOther && !isManualBreakOrLunch) return;
    rows.push({
      ts: g.prev.endISO,
      badgeLabel: gapLabelText(g.label),
      badgeClass: `type-${g.label}`,
      detail: g.isShiftStartGap ? 'Inicio de turno → primera llamada' : 'Entre llamadas',
      note: g.note || '',
      durationMin: g.displayAmount,
      editable: true,
      gapKey: g.gapKey,
    });
  });

  return rows;
}

function renderTable() {
      const wrap = document.getElementById('callTableWrap');
      const dayKey = getActiveDayKey();
      const clearDayCallsDayLabel = document.getElementById('clearDayCallsDayLabel');
      if (clearDayCallsDayLabel) clearDayCallsDayLabel.textContent = formatCallDayLabel(dayKey);

      const sortedCalls = [...callsForDay(dayKey)].sort((a, b) => new Date(a.startISO) - new Date(b.startISO));
      const actionRows = dayActionRows(dayKey);

      // Entradas combinadas — cada una con un `ts` común para poder ordenar todo junto
      // cronológicamente, sin importar si es llamada o acción. `kind` decide qué plantilla de fila
      // usar más abajo.
      const entries = [];
      sortedCalls.forEach(c => entries.push({ kind: 'call', ts: c.startISO, call: c }));
      actionRows.forEach(a => entries.push({ kind: 'action', ts: a.ts, action: a }));

      if (!entries.length) {
        wrap.innerHTML = '<div class="note" style="padding:14px;">No hay filas para el día activo. La vista se alimenta de las llamadas importadas, tus acciones del turno (Shift/Break/Lunch/ACW) y del día seleccionado.</div>';
        return;
      }

      // Filtro Todo/Llamadas/Acciones (ver #tableFilterRow en el HTML) sobre la tabla fusionada.
      const filtered = entries.filter(e => {
        if (tableFilterMode === 'calls') return e.kind === 'call';
        if (tableFilterMode === 'actions') return e.kind === 'action';
        return true;
      });

      if (!filtered.length) {
        wrap.innerHTML = '<div class="note" style="padding:14px;">No hay filas de este tipo para el día activo — cambia el filtro de arriba para ver el resto.</div>';
        return;
      }

      // Más recientes primero, mismo criterio de siempre.
      filtered.sort((a, b) => new Date(b.ts) - new Date(a.ts));

      const ROW_TYPE_ICON = {
        'type-shift': 'play',
        'type-break': 'coffee',
        'type-lunch': 'utensils',
        'type-acw': 'timer',
        'type-other': 'circle',
        'type-import': 'clipboard',
      };

      const rowsHtml = filtered.map(entry => {
        if (entry.kind === 'call') {
          const c = entry.call;
          const billableText = String(c.billable).toLowerCase() === 'yes' ? 'Billable' : 'No billable';
          const droppedText = String(c.dropped).toLowerCase() === 'yes' ? 'Dropped' : 'No dropped';
          const higherRateBonus = higherRateBonusForCall(c);
          const higherRateBadge = higherRateBonus ? higherRateTierBadgeHtml(higherRateBonus.tier, higherRateBonus.amount) : '';

          return `
            <div class="tbl-row">
              <span class="tbl-row-icon type-call">${iconHtml('phone')}</span>
              <div class="tbl-row-main">
                <div class="tbl-row-title">#${escapeHtml(c.customerId)} <span class="tbl-type-badge type-call">Llamada</span></div>
                <div class="tbl-row-sub">${escapeHtml(billableText)} · ${escapeHtml(droppedText)}</div>
              </div>
              <div class="tbl-row-right">
                <div class="tbl-row-amount">${money(parseMoney(c.pay))}</div>
                ${financeConvertedNote(parseMoney(c.pay))}
                <div class="tbl-row-time">${escapeHtml(c.callStart)} · ${c.durationMin} min</div>
                ${higherRateBadge}
              </div>
              <div class="tbl-row-actions">
                <button class="tbl-icon-btn" type="button" data-call-edit="${escapeHtml(c.id || '')}" aria-label="Editar llamada">${iconHtml('edit')}</button>
                <button class="tbl-icon-btn bad" type="button" data-call-delete="${escapeHtml(c.id || '')}" aria-label="Eliminar llamada">${iconHtml('trash')}</button>
              </div>
            </div>
          `;
        }

        const a = entry.action;
        const hora = timeLabelFromDate(new Date(a.ts));
        const hasDuration = a.durationMin !== null && a.durationMin !== undefined;
        const durationText = hasDuration ? `${formatMinutes(a.durationMin)} min` : '';
        const editBtn = a.editable && a.gapKey
          ? `<button class="tbl-icon-btn" type="button" data-gap-edit="${escapeHtml(a.gapKey)}" data-gap-day="${escapeHtml(dayKey)}" aria-label="Editar hueco">${iconHtml('edit')}</button>`
          : '';
        const iconName = ROW_TYPE_ICON[a.badgeClass] || 'circle';
        const iconMarkup = a.badgeClass === 'type-shift' ? iconHtml(iconName, 'ic-fill') : iconHtml(iconName);

        return `
          <div class="tbl-row">
            <span class="tbl-row-icon ${a.badgeClass}">${iconMarkup}</span>
            <div class="tbl-row-main">
              <div class="tbl-row-title">${escapeHtml(a.detail)} <span class="tbl-type-badge ${a.badgeClass}">${escapeHtml(a.badgeLabel)}</span></div>
              ${a.note ? `<div class="tbl-row-sub">${escapeHtml(a.note)}</div>` : ''}
            </div>
            <div class="tbl-row-right">
              <div class="tbl-row-time">${escapeHtml(hora)}${hasDuration ? ` · ${escapeHtml(durationText)}` : ''}</div>
            </div>
            <div class="tbl-row-actions">${editBtn}</div>
          </div>
        `;
      });

      // `#callTableWrap` ya trae su propio borde/fondo redondeado (`.table-wrap`, en el HTML) — las
      // filas se pintan directo ahí dentro, sin envolver en otra tarjeta propia.
      wrap.innerHTML = rowsHtml.join('');
    }

// (Fase 4): "Resumen del día" + "Estadísticas" — 2 tarjetas nuevas de escritorio (ocultas en mobile
// vía CSS, ver.day-stats-grid), alimentadas por los MISMOS datos que ya calcula
// importedCallStats/dayAdherence para el resto de la app.
function renderDayStatsCards() {
  const dayGrid = document.getElementById('dayStatsGrid');
  if (!dayGrid) return;
  const dayKey = getActiveDayKey();
  const dayCalls = callsForDay(dayKey);
  const stats = importedCallStats(dayCalls, dayKey);
  const adherence = dayAdherence(dayKey);

  const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };

  setText('resumenDiaLlamadas', String(dayCalls.length));
  setText('resumenDiaProductivo', formatDuration(stats.productive * 60000));
  setText('resumenDiaACW', formatDuration(stats.gapTotal * 60000));
  setText('resumenDiaAdherencia', adherence ? `${adherence.scorePct}%` : '—');
  const goalPct = Number.isFinite(Number(settings.adherenceGoalPct)) ? Number(settings.adherenceGoalPct) : 95;
  setText('resumenDiaAdherenciaGoal', `Objetivo ≥ ${goalPct}%`);

  setText('statsShortest', dayCalls.length ? formatDuration(stats.shortest * 60000) : '—');
  // Nota aclaratoria cuando "Más corta" da 0 min por una llamada real de inicio=fin — sin esto se
  // veía como un error de la app.
  const shortestNoteEl = document.getElementById('statsShortestNote');
  if (shortestNoteEl) {
    if (dayCalls.length && stats.shortest === 0 && stats.zeroCount > 0 && stats.shortestNonZero !== null) {
      // El texto anterior ("Hubo 1 llamada de 0 min — siguiente: 00:01:00") no dejaba claro qué
      // relación tenía ese "siguiente" con el 00:00:00 de arriba. Se reescribe para que quede
      // explícito.
      const intro = stats.zeroCount === 1 ? '1 llamada duró 0 min' : `${stats.zeroCount} llamadas duraron 0 min`;
      shortestNoteEl.textContent = `${intro} — sin contar esa(s), la más corta fue ${formatDuration(stats.shortestNonZero * 60000)}`;
      shortestNoteEl.style.display = '';
    } else {
      shortestNoteEl.style.display = 'none';
    }
  }
  setText('statsLongest', dayCalls.length ? formatDuration(stats.longest * 60000) : '—');
  setText('statsAvg', dayCalls.length ? formatDuration(stats.avg * 60000) : '—');

  // Desglose Break/Lunch/Otro + bono de Higher Rate en "Resumen del día"
  setText('resumenDiaBreak', formatDuration(stats.breakGapTotal * 60000));
  setText('resumenDiaLunch', formatDuration(stats.lunchGapTotal * 60000));
  setText('resumenDiaOtro', formatDuration(stats.otherGapTotal * 60000));
  setText('resumenDiaHigherRate', money(stats.higherRateBonus || 0));

  // Conectado/Tiempo llamadas/ Billable/Dropped, mismos datos que ya alimentan las píldoras de
  // "Ganancias de hoy" (renderHeader)
  const dayShiftBoundsForStats = dayShiftBounds(dayKey);
  const hasShiftForStats = !!dayShiftBoundsForStats.start;
  setText('resumenDiaConectado', hasShiftForStats ? formatDuration(connectedMinutesForDay(dayKey) * 60000) : '—');
  setText('resumenDiaTiempoLlamadas', formatDuration(stats.total * 60000));
  setText('resumenDiaBillable', String(stats.billable));
  setText('resumenDiaDropped', String(stats.dropped));

  // Hueco más largo/promedio (ya calculados por importedCallStats) + pago promedio por llamada
  // (Ganancias ÷ Total de llamadas).
  setText('statsGapLongest', stats.gapLongest > 0 ? formatDuration(stats.gapLongest * 60000) : '—');
  setText('statsGapAvg', stats.gapAvg > 0 ? formatDuration(stats.gapAvg * 60000) : '—');
  const avgPay = dayCalls.length ? stats.earnings / dayCalls.length : 0;
  setText('statsAvgPay', dayCalls.length ? `${money(avgPay)}${convertedAmountText(avgPay) ? ` (${convertedAmountText(avgPay)})` : ''}` : '—');
}

function render() {
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
    }

    export function toast(msg) {
      const el = document.getElementById('toast');
      el.textContent = msg;
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
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
      openModalStack = openModalStack.filter(m => m !== id);
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
      const pages = ['home', 'schedule', 'reports', 'paydates', 'calendar', 'finance', 'help'];
      if (!pages.includes(page)) page = 'home';
      currentPage = page;
      // Render ya no recalcula renderReportsDashboard salvo que currentPage === 'reports' (ver esa
      // función)
      if (page === 'reports') renderReportsDashboard();
      if (page === 'paydates') renderPayDatesSection();
      if (page === 'finance') renderFinanceSection();
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
      subEl.textContent = pct >= 90 ? '¡Vas por buen camino!' : pct >= 50 ? 'Sigue así, ya vas a la mitad.' : 'Toca para ver el detalle.';
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
      appConfirm(`¿Eliminar la llamada #${call.customerId} (${call.callDate} · ${call.callStart})? Esta acción no se puede deshacer.`, () => deleteCallRecord(callId));
    });

    // Filtro Todo/Llamadas/Acciones sobre la tabla fusionada — solo cambia `tableFilterMode` y
    // vuelve a pintar #callTableWrap (renderTable ya sabe filtrar por ese valor).
    const tableFilterRow = document.getElementById('tableFilterRow');
    if (tableFilterRow) {
      tableFilterRow.addEventListener('click', (e) => {
        const btn = e.target instanceof Element ? e.target.closest('[data-table-filter]') : null;
        if (!btn) return;
        tableFilterMode = btn.getAttribute('data-table-filter') || 'all';
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
        toast('📅 Ese día todavía no llega — vas a ver un día futuro sin datos.');
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
        if (manualCallModalEl && manualCallModalEl.classList.contains('open') && manualCallLiveBackupPending) {
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
      const apply = () => { scheduleViewMode = nextMode; syncShiftModalFields(); };
      if (scheduleFormIsDirty()) {
        appConfirm('Tienes cambios sin guardar. ¿Descartarlos y cambiar de vista?', apply);
        return;
      }
      apply();
    });
    function navigateScheduleWeek(nextOffset) {
      const apply = () => { scheduleWeekOffset = nextOffset; syncShiftModalFields(); };
      if (scheduleFormIsDirty()) {
        appConfirm('Tienes cambios sin guardar en esta semana. ¿Descartarlos y cambiar de semana?', apply);
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
        saveSettingsOnly();
        toast('Semana personalizada — arrancó como copia de tu plantilla, ajústala y guarda cada día que cambie.');
        syncShiftModalFields();
      } else {
        e.target.checked = true;
        appConfirm('¿Quitar la personalización de esta semana y volver a usar la plantilla? El horario propio de esta semana se borra — no afecta la plantilla ni otras semanas.', () => {
          removeScheduleWeekOverride(scheduleWeekOffset);
          saveAll();
          syncShiftModalFields();
        });
      }
    });
    document.getElementById('copyDayToAllBtn').addEventListener('click', copyDayToAll);
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
    document.getElementById('ajustesHeaderBtn').addEventListener('click', () => openModal('goalsModal'));
    document.getElementById('higherRateHeaderBtn').addEventListener('click', () => {
      syncHigherRateModalFields();
      openModal('higherRateModal');
    });
    // "Avisos" pasa de página del sidebar a ícono del header (a la izquierda de Higher Rate) que
    // abre su propio popup — mismo patrón que ajustesHeaderBtn/higherRateHeaderBtn de arriba.
    document.getElementById('avisosHeaderBtn').addEventListener('click', () => {
      syncNotificationsModalFields();
      openModal('notificationsModal');
    });
    document.getElementById('pasteCallsBtn').addEventListener('click', () => {
      // El resumen de filas omitidas es del ÚLTIMO import — se limpia al reabrir el modal para no
      // mostrar un detalle viejo como si fuera del pegado que se está por hacer ahora.
      renderImportSkippedSummary([], []);
      openModal('callsModal');
    });
    document.getElementById('addCallManualBtn').addEventListener('click', openManualCallModal);
    document.getElementById('manualCallDurationInput').addEventListener('input', updateManualCallPreview);
    document.getElementById('manualCallPayInput').addEventListener('input', () => {
      manualCallPayDirty = true;
      // Mismo criterio que callEditPayInput: editar el Pago a mano deselecciona el tile de tarifa
      // (si no, se queda resaltado aunque el monto ya no coincida con esa tarifa).
      if (manualCallSelectedRateTile !== null) {
        manualCallSelectedRateTile = null;
        renderRateTiles('manualCallRateTiles', null);
      }
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
        toast(`El ajuste no puede pasar de -12h de una sola vez.`);
        return;
      }
      scheduleOffsetMin -= 15;
      syncScheduleOffsetUI();
    });
    document.getElementById('scheduleOffsetPlusBtn').addEventListener('click', () => {
      if (scheduleOffsetMin + 15 > SCHEDULE_OFFSET_LIMIT_MIN) {
        toast(`El ajuste no puede pasar de +12h de una sola vez.`);
        return;
      }
      scheduleOffsetMin += 15;
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
      if (isWork && goalInput && !(Number(goalInput.value) > 0)) {
        const startInput = row.querySelector('.block-start-input');
        const endInput = row.querySelector('.block-end-input');
        const dur = Math.max(0, toMinutes(formatHHMM(endInput?.value || '00:00')) - toMinutes(formatHHMM(startInput?.value || '00:00')));
        goalInput.value = dur;
      }
      row.setAttribute('data-block-type', typeInput.value);
      const iconEl = row.querySelector('.sched-tl-icon');
      const subtitleEl = row.querySelector('.sched-tl-subtitle');
      const meta = BLOCK_TIMELINE_META[typeInput.value] || BLOCK_TIMELINE_META.work;
      if (iconEl) iconEl.innerHTML = meta.icon;
      if (subtitleEl) subtitleEl.textContent = meta.subtitle;
    });
    // La píldora de duración de cada tarjeta del timeline (puramente decorativa, ver
    // formatBlockDurationLabel) se recalcula en vivo al editar Inicio/Fin, para no esperar a un
    // render.
    document.getElementById('blocksEditorList').addEventListener('input', (e) => {
      const timeInput = e.target instanceof Element ? e.target.closest('.sched-tl-time-input') : null;
      if (!timeInput) return;
      const row = timeInput.closest('.block-row');
      if (!row) return;
      const startInput = row.querySelector('.block-start-input');
      const endInput = row.querySelector('.block-end-input');
      const durationEl = row.querySelector('.sched-tl-duration');
      if (!startInput || !endInput || !durationEl) return;
      const dur = Math.max(0, toMinutes(formatHHMM(endInput.value || '00:00')) - toMinutes(formatHHMM(startInput.value || '00:00')));
      durationEl.textContent = formatBlockDurationLabel(dur);
    });
    // Al marcar (o desmarcar) "Día libre (sin turno)" dentro del modal de Horario, el cambio se
    // guarda solo, sin tener que además clickear "Guardar día".
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
    });
    document.getElementById('testShiftAlarmSoundBtn').addEventListener('click', () => testAlarmSound('shift'));
    document.getElementById('testBreakStartAlarmSoundBtn').addEventListener('click', () => testAlarmSound('breakStart'));
    document.getElementById('testBreakEndAlarmSoundBtn').addEventListener('click', () => testAlarmSound('breakEnd'));
    document.getElementById('addHigherRateWindowBtn').addEventListener('click', addHigherRateWindowRow);
    document.getElementById('purgeHigherRateWindowsBtn').addEventListener('click', purgePastHigherRateWindows);
    // Delegado en el modal completo: las filas viven en 2 listas distintas (#higherRateWindowsList
    // y #higherRateHistoryList).
    document.getElementById('higherRateModal').addEventListener('click', (e) => {
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
      reportsMonthlyOffset -= 1;
      renderReportsMonthlyChart();
    });
    document.getElementById('rptMonthlyNextBtn').addEventListener('click', () => { if (reportsMonthlyOffset < 0) { reportsMonthlyOffset += 1; renderReportsMonthlyChart(); } });
    document.getElementById('rptMonthlyTodayBtn').addEventListener('click', () => { reportsMonthlyOffset = 0; renderReportsMonthlyChart(); });
    document.getElementById('calMonthPrevBtn').addEventListener('click', () => {
      const historyStart = effectiveHistoryStartDate();
      const today = todayRange();
      const targetMonthKey = (today.getFullYear() * 12 + today.getMonth()) + (calMonthOffset - 1);
      const startMonthKey = historyStart ? historyStart.getFullYear() * 12 + historyStart.getMonth() : null;
      if (startMonthKey !== null && targetMonthKey < startMonthKey) return;
      calMonthOffset -= 1;
      renderCalendarMonth();
    });
    document.getElementById('calMonthNextBtn').addEventListener('click', () => { if (calMonthOffset < 0) { calMonthOffset += 1; renderCalendarMonth(); } });
    document.getElementById('calMonthTodayBtn').addEventListener('click', () => { calMonthOffset = 0; renderCalendarMonth(); });
    // Vista anual del Calendario de productividad (solo escritorio).
    document.getElementById('calBackToYearBtn').addEventListener('click', backToCalYearView);
    document.getElementById('calYearPrevBtn').addEventListener('click', () => {
      const historyStart = effectiveHistoryStartDate();
      const targetYear = todayRange().getFullYear() + calYearOffset - 1;
      if (historyStart && targetYear < historyStart.getFullYear()) return;
      calYearOffset -= 1;
      renderCalYear();
    });
    document.getElementById('calYearNextBtn').addEventListener('click', () => { if (calYearOffset < 0) { calYearOffset += 1; renderCalYear(); } });
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
    // Un solo listener delegado en #financeSection (tabs, prioridad ↑/↓, Reiniciar mes, Asignar,
    // checkbox Pagado, Eliminar, + los 2 botones de agregar fila) — las filas se repintan enteras
    // en cada cambio, no llevan listener propio.
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
      if (resetBtn) { financeResetRow(resetBtn.getAttribute('data-fin-cat'), resetBtn.getAttribute('data-fin-reset')); return; }
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
        const input = row ? row.querySelector('[data-fin-amount-input]') : null;
        const activeSignBtn = row ? row.querySelector('[data-fin-sign-btn][aria-pressed="true"]') : null;
        const sign = activeSignBtn ? activeSignBtn.getAttribute('data-sign') : 'plus';
        financeApplySignedAmount(applyBtn.getAttribute('data-fin-cat'), applyBtn.getAttribute('data-fin-apply'), input ? input.value : '', sign);
        return;
      }
      const deleteBtn = e.target.closest('[data-fin-delete]');
      if (deleteBtn) { financeDeleteRow(deleteBtn.getAttribute('data-fin-cat'), deleteBtn.getAttribute('data-fin-delete')); return; }
      if (e.target.closest('#addFinanceGastoBtn')) { openFinanceRowModal('gasto'); return; }
      if (e.target.closest('#addFinanceMetaBtn')) { openFinanceRowModal('meta'); return; }
    });
    // Sincroniza el monto a "Asignar" en $ ↔ en tu moneda dentro de cada fila — mismo criterio que
    // syncFinanceRowTargetFields, pero acotado a los 2 inputs hermanos dentro de la misma `.fin-
    // row-actions`.
    document.getElementById('financeSection').addEventListener('input', (e) => {
      if (!(e.target instanceof Element)) return;
      const exchangeRate = Number(settings.exchangeRate);
      if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) return;
      const actionsWrap = e.target.closest('.fin-row-actions');
      if (!actionsWrap) return;
      if (e.target.matches('[data-fin-amount-input]')) {
        const sibling = actionsWrap.querySelector('[data-fin-amount-currency-input]');
        if (!sibling) return;
        const usd = parseMoney(e.target.value);
        sibling.value = usd > 0 ? (usd * exchangeRate).toFixed(2) : '';
      } else if (e.target.matches('[data-fin-amount-currency-input]')) {
        const sibling = actionsWrap.querySelector('[data-fin-amount-input]');
        if (!sibling) return;
        const cur = parseMoney(e.target.value);
        sibling.value = cur > 0 ? usdCeilFromCurrencyAmount(cur, exchangeRate).toFixed(2) : '';
      }
    });
    document.getElementById('financeSection').addEventListener('change', (e) => {
      const checkbox = e.target instanceof Element ? e.target.closest('[data-fin-mark-paid]') : null;
      if (!checkbox) return;
      financeToggleManualPaid(checkbox.getAttribute('data-fin-cat'), checkbox.getAttribute('data-fin-mark-paid'), checkbox.checked);
    });
    document.getElementById('financeAutoFillInput').addEventListener('change', (e) => updateFinanceAutoFillSetting(e.target.checked));
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
        preview.textContent = `Clasificación lista: ${gapLabelText(label)} · ${gapDisplayAmountUnitLabel(label)} ${gapDisplayAmountForLabel(row, label).toFixed(1)} min`;
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
      state.events.push({ ts: new Date().toISOString(), type: 'system', title: 'Listo para empezar', detail: 'Inicia el shift para comenzar', meta: 'idle' });
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
    }, 1000);
    render();

// boot.js (injectAccountPanel/injectDeleteAccount/injectCycleProjection) sigue leyendo estas
// funciones desde window: como <script> clásico las heredaba gratis (top-level = global), como
// módulo hay que exponerlas a mano — un módulo nunca cuelga sus declaraciones de window.
window.toast = toast;
window.appConfirm = appConfirm;
window.iconHtml = iconHtml;
window.money = money;
window.convertedAmountText = convertedAmountText;
window.financeConvertedInline = financeConvertedInline;
window.effectiveCycleGoal = effectiveCycleGoal;
window.cycleGoalPace = cycleGoalPace;
window.reportsCycleProjection = reportsCycleProjection;
