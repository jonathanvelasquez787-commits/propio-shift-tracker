// Página Calendario (vista mensual y anual de productividad) — tercer módulo de la Fase 3,
// mismo método que finance.js/reports.js (ver v556/v557). calMonthOffset/calViewMode/calYearOffset
// se quedan declaradas en app-main.js (se reasignan también desde el wiring de los botones
// prev/next/hoy, que vive ahí) — este módulo las importa para leer, y usa setCalMonthOffset()/
// setCalViewMode() para las dos reasignaciones que sí le tocan a esta página (abrir un mes desde
// la vista anual, volver a la vista anual).

import {
  RATE,
  calMonthOffset,
  calViewMode,
  calYearOffset,
  calls,
  callsForDay,
  closeModal,
  convertedAmountText,
  dayIsEffectivelyOff,
  dayNoteCategoryMeta,
  dayShiftBounds,
  effectiveDailyGoal,
  escapeHtml,
  formatMinutes,
  getDayNote,
  higherRateBonusForCalls,
  iconHtml,
  importedCallStats,
  money,
  openModal,
  pad,
  productiveMinutesForDay,
  saveSettingsOnly,
  setCalMonthOffset,
  setCalViewMode,
  settings,
  toast,
  todayCallDateKey,
  todayRange,
} from './app-main.js';

// Calendario de productividad: minutos productivos por día del mes vs meta, con badge de bono
// Higher Rate equivalente en minutos.
function calDailyEquivalentHigherRateMin(dayKey) {
  const dayCalls = callsForDay(dayKey);
  const bonusUsd = higherRateBonusForCalls(dayCalls);
  const rate = Number(settings.rate) > 0 ? Number(settings.rate) : RATE;
  return rate > 0 ? bonusUsd / rate : 0;
}

function calTierForDay(productiveMin, goalMin) {
  if (productiveMin > goalMin) return 'cal-tier-8hrpp';
  if (productiveMin >= goalMin) return 'cal-tier-8hrp';
  if (productiveMin >= goalMin - 60) return 'cal-tier-6hrp';
  return 'cal-tier-6hrm';
}

// Distingue "Sin datos" (ningún turno ni llamada registrado ese día — no hay nada que juzgar) y
// "Libre" (día marcado como tal en el horario) del resto de tiers de rendimiento.
function calDayStatus(dayKey) {
  if (dayIsEffectivelyOff(dayKey)) return 'off';
  const hasShift = !!dayShiftBounds(dayKey).start;
  const hasCalls = callsForDay(dayKey).length > 0;
  if (!hasShift && !hasCalls) return 'nodata';
  return 'normal';
}

// Tier final de una celda (mes o mini-heatmap anual) — envuelve calTierForDay agregando los 2 casos
// especiales de arriba.
function calDayTier(dayKey, goalMin = effectiveDailyGoal(dayKey).min) {
  const status = calDayStatus(dayKey);
  if (status === 'off') return 'cal-tier-off';
  if (status === 'nodata') return 'cal-tier-nodata';
  const effectiveMin = productiveMinutesForDay(dayKey) + calDailyEquivalentHigherRateMin(dayKey);
  return calTierForDay(effectiveMin, goalMin);
}

export function renderCalendarMonth() {
  const grid = document.getElementById('calDayGrid');
  const label = document.getElementById('calMonthLabel');
  const nextBtn = document.getElementById('calMonthNextBtn');
  const prevBtn = document.getElementById('calMonthPrevBtn');
  if (!grid) return;

  const today = todayRange();
  const monthDate = new Date(today.getFullYear(), today.getMonth() + calMonthOffset, 1);
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const goalMin = Number(settings.productiveGoalMin) || 0;
  // Cada día del mes también muestra cuánto ganó ese día en $ y en la moneda secundaria — mismo par
  // settings.exchangeRate/ currencyLabel que ya usa convertedAmountText, leído una sola vez fuera
  // del loop de días (es constante para todo el mes).
  const calExchangeRate = Number(settings.exchangeRate);
  const calCurrencyLabel = String(settings.currencyLabel || '').trim();
  const calHasCurrency = Number.isFinite(calExchangeRate) && calExchangeRate > 0 && !!calCurrencyLabel;

  // Los umbrales de color son relativos a TU meta (ver calTierForDay), no a "8 horas" fijas — el
  // texto de la leyenda se arma con tus minutos reales para que no confunda a quien tiene una meta
  // distinta de 8hrs.
  const nearFloor = Math.max(0, goalMin - 60);
  const legendTopEl = document.getElementById('calLegendTop');
  const legendGoodEl = document.getElementById('calLegendGood');
  const legendNearEl = document.getElementById('calLegendNear');
  const legendBadEl = document.getElementById('calLegendBad');
  const nearCeil = Math.max(nearFloor, goalMin - 1);
  // Los 4 textos se veían "muy largos, no se entienden" (frases completas tipo "Más de X min ·
  // superaste tu meta" dentro de un chip chico, sobre todo en mobile).
  if (legendTopEl) {
    legendTopEl.textContent = `>${formatMinutes(goalMin)}m · Superó meta`;
    legendTopEl.closest('.cal-legend-chip').title = `Más de ${formatMinutes(goalMin)} min productivos — superaste tu meta`;
  }
  if (legendGoodEl) {
    legendGoodEl.textContent = `${formatMinutes(goalMin)}m · Cumplida`;
    legendGoodEl.closest('.cal-legend-chip').title = `${formatMinutes(goalMin)} min productivos — meta cumplida`;
  }
  if (legendNearEl) {
    legendNearEl.textContent = `${formatMinutes(nearFloor)}–${formatMinutes(nearCeil)}m · Cerca`;
    legendNearEl.closest('.cal-legend-chip').title = `Entre ${formatMinutes(nearFloor)} y ${formatMinutes(nearCeil)} min productivos — cerca de tu meta`;
  }
  if (legendBadEl) {
    legendBadEl.textContent = `<${formatMinutes(nearFloor)}m · Lejos`;
    legendBadEl.closest('.cal-legend-chip').title = `Menos de ${formatMinutes(nearFloor)} min productivos — lejos de tu meta`;
  }

  if (label) {
    const raw = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(monthDate);
    label.textContent = raw.charAt(0).toUpperCase() + raw.slice(1);
  }
  if (nextBtn) nextBtn.disabled = calMonthOffset >= 0;

  // "‹ Anterior" no tenía ningún tope aquí (a diferencia de calYearPrevBtn, que sí se bloquea en el
  // año de "Historial desde") — se podía seguir navegando a meses que ese límite se supone que
  // oculta.
  const historyStart = effectiveHistoryStartDate();
  const historyStartRange = historyStart ? todayRange(historyStart) : null;
  if (prevBtn) {
    const startMonthKey = historyStart ? historyStart.getFullYear() * 12 + historyStart.getMonth() : null;
    const currentMonthKey = year * 12 + month;
    prevBtn.disabled = startMonthKey !== null && currentMonthKey <= startMonthKey;
  }

  // Lunes=0... Domingo=6, para alinear con el weekday-row Lun-Dom.
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const cellsHtml = [];
  for (let i = 0; i < firstWeekday; i++) cellsHtml.push('<div class="cal-day-cell cal-empty"></div>');

  // El mes se pinta COMPLETO, ya no se corta en el día de hoy.
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    if (historyStartRange && d < historyStartRange) {
      cellsHtml.push('<div class="cal-day-cell cal-empty"></div>');
      continue;
    }
    const dayKey = todayCallDateKey(d);
    const status = calDayStatus(dayKey);
    const productiveMin = productiveMinutesForDay(dayKey);
    const bonusMin = Math.round(calDailyEquivalentHigherRateMin(dayKey));
    const tier = calDayTier(dayKey);
    const bonusHtml = bonusMin > 0 ? `<span class="cal-day-bonus">+${bonusMin}</span>` : '';
    const starHtml = tier === 'cal-tier-8hrpp' ? `<span class="cal-day-star" aria-hidden="true">${iconHtml('star', 'ic-fill')}</span>` : '';
    // Un día libre por una razón concreta (vacaciones, enfermedad, día festivo...) debe mostrar esa
    // razón en vez de un "Libre" genérico siempre igual — reutiliza la misma categoría que ya se
    // guarda desde "Editar día" (Resumen semanal).
    const dayNoteForCell = getDayNote(dayKey);
    const offCategoryLabel = status === 'off' ? dayNoteCategoryMeta(dayNoteForCell?.category)?.label : null;
    const minLabel = status === 'off' ? (offCategoryLabel || 'Libre') : status === 'nodata' ? '—' : String(Math.round(productiveMin));
    const titleParts = [offCategoryLabel, dayNoteForCell?.comment].filter(Boolean);
    const titleAttr = titleParts.length ? ` title="${escapeHtml(titleParts.join(' — '))}"` : '';
    const minLabelClass = status === 'normal' ? 'cal-day-min' : 'cal-day-min cal-day-min-label';
    // Minutos + monto en $ + monto en la otra moneda, los 3 juntos en la celda, con decimales en
    // ambas monedas — el corte a enteros de una vuelta anterior se revirtió: sí caben, la celda ya
    // trae `white-space:nowrap`+`overflow:hidden`+`text-overflow:ellipsis` como red de seguridad
    // para cualquier ancho extremo.
    let amtLinesHtml = '';
    if (status === 'normal') {
      const dayEarningsForCell = importedCallStats(callsForDay(dayKey), dayKey).earnings;
      const amtHtml = `<span class="cal-day-amt">$${dayEarningsForCell.toFixed(2)}</span>`;
      const amtAltHtml = calHasCurrency ? `<span class="cal-day-amt-alt">${escapeHtml(calCurrencyLabel)}${(dayEarningsForCell * calExchangeRate).toFixed(2)}</span>` : '';
      amtLinesHtml = `${amtHtml}${amtAltHtml}`;
    }
    cellsHtml.push(`<div class="cal-day-cell ${tier}"${titleAttr}>${bonusHtml}<div class="cal-day-top-row"><span class="cal-day-num">${day}</span>${starHtml}</div><span class="${minLabelClass}">${minLabel}</span>${amtLinesHtml}</div>`);
  }
  // Si el offset de día de semana + los días recortados por "Historial desde" suman una o más filas
  // COMPLETAS de celdas vacías al inicio, se quitan esas filas enteras (múltiplos de 7) — así el
  // grid no deja una fila en blanco debajo de Lun-Dom antes del primer día real.
  let leadingEmptyCount = 0;
  while (leadingEmptyCount < cellsHtml.length && cellsHtml[leadingEmptyCount].includes('cal-empty')) leadingEmptyCount++;
  const fullEmptyRowsToDrop = Math.floor(leadingEmptyCount / 7);
  if (fullEmptyRowsToDrop > 0) cellsHtml.splice(0, fullEmptyRowsToDrop * 7);
  grid.innerHTML = cellsHtml.join('');
}

// Vista anual de "Calendario de productividad" (solo escritorio). Clave del año mostrado ("YYYY")
// para el override de meta anual.
function calYearGoalKey(offset = calYearOffset) {
  const today = todayRange();
  return String(today.getFullYear() + offset);
}

// La vista anual arranca desde el primer día real con registro, no desde enero. Fecha de la llamada
// más antigua en `calls` — null si todavía no hay ninguna.
function firstCallDate() {
  if (!calls.length) return null;
  let earliest = null;
  calls.forEach(c => {
    const d = new Date(c.startISO);
    if (Number.isNaN(d.getTime())) return;
    if (!earliest || d < earliest) earliest = d;
  });
  return earliest;
}

// Override manual (settings.historyStartDateOverride) si es una fecha válida, si no la llamada más
// antigua registrada (firstCallDate). Sin llamadas y sin override: null — sin restricción, se
// comporta como antes de este cambio.
export function effectiveHistoryStartDate() {
  const override = String(settings.historyStartDateOverride || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(override)) {
    const d = new Date(`${override}T00:00:00`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return firstCallDate();
}

// Meta anual automática = tu meta diaria × días NO libres del año completo (mismo criterio que
// autoCycleGoal, extendido a 365/366 días en vez de 14), sin contar días anteriores a
// effectiveHistoryStartDate.
function autoCalYearGoal(offset = calYearOffset) {
  const year = Number(calYearGoalKey(offset));
  const daysInYear = ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 366 : 365;
  const historyStart = effectiveHistoryStartDate();
  const historyStartRange = historyStart ? todayRange(historyStart) : null;
  let total = 0;
  for (let i = 0; i < daysInYear; i++) {
    const d = new Date(year, 0, 1 + i);
    if (historyStartRange && d < historyStartRange) continue;
    const dKey = todayCallDateKey(d);
    if (!dayIsEffectivelyOff(dKey)) total += effectiveDailyGoal(dKey).usd;
  }
  return total;
}

function getCalYearGoalOverride(offset = calYearOffset) {
  const key = calYearGoalKey(offset);
  const val = settings.yearGoalOverrides && settings.yearGoalOverrides[key];
  return Number.isFinite(Number(val)) && Number(val) > 0 ? Number(val) : null;
}

function effectiveCalYearGoal(offset = calYearOffset) {
  const override = getCalYearGoalOverride(offset);
  return override !== null ? override : autoCalYearGoal(offset);
}

function setCalYearGoalOverride(offset, amount) {
  if (!settings.yearGoalOverrides) settings.yearGoalOverrides = {};
  const key = calYearGoalKey(offset);
  const num = Number(amount);
  if (Number.isFinite(num) && num > 0) settings.yearGoalOverrides[key] = num;
  else delete settings.yearGoalOverrides[key];
  saveSettingsOnly();
}

// Modal propio en vez de window.prompt, que algunos webviews/PWA ignoran en silencio (mismo motivo
// que appConfirm).
export function openCalYearGoalEditor() {
  const input = document.getElementById('calYearGoalAmountInput');
  if (input) input.value = effectiveCalYearGoal(calYearOffset).toFixed(2);
  openModal('calYearGoalModal');
}

export function saveCalYearGoalModal() {
  const input = document.getElementById('calYearGoalAmountInput');
  const amount = Number(input?.value);
  if (!Number.isFinite(amount) || amount <= 0) {
    toast('Valor inválido — la meta anual no se modificó');
    return;
  }
  setCalYearGoalOverride(calYearOffset, amount);
  closeModal('calYearGoalModal');
  renderCalYear();
  toast(`Meta anual: ${money(amount)}${convertedAmountText(amount) ? ` (${convertedAmountText(amount)})` : ''}`);
}

export function useAutoCalYearGoalModal() {
  setCalYearGoalOverride(calYearOffset, null);
  closeModal('calYearGoalModal');
  renderCalYear();
  toast('Meta anual vuelve a calcularse automáticamente');
}

export function openHistoryStartDateEditor() {
  const current = effectiveHistoryStartDate();
  const input = document.getElementById('calHistoryStartDateInput');
  if (input) input.value = current ? `${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())}` : '';
  openModal('calHistoryStartModal');
}

export function saveCalHistoryStartModal() {
  const input = document.getElementById('calHistoryStartDateInput');
  const trimmed = String(input?.value || '').trim();
  if (!trimmed) {
    settings.historyStartDateOverride = '';
    saveSettingsOnly();
    closeModal('calHistoryStartModal');
    renderCalYear();
    toast('Historial vuelve a calcularse desde tu llamada más antigua');
    return;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed) || Number.isNaN(new Date(`${trimmed}T00:00:00`).getTime())) {
    toast('Fecha inválida');
    return;
  }
  settings.historyStartDateOverride = trimmed;
  saveSettingsOnly();
  closeModal('calHistoryStartModal');
  renderCalYear();
  toast(`Historial desde: ${trimmed}`);
}

export function useAutoCalHistoryStartModal() {
  settings.historyStartDateOverride = '';
  saveSettingsOnly();
  closeModal('calHistoryStartModal');
  renderCalYear();
  toast('Historial vuelve a calcularse desde tu llamada más antigua');
}

// Pinta la vista anual completa: 2 tarjetas (Total del año / Meta anual) + grid de 12 meses con
// mini-heatmap. Reutiliza importedCallStats/ productiveMinutesForDay/calTierForDay tal cual.
export function renderCalYear() {
  const label = document.getElementById('calYearLabel');
  const prevBtn = document.getElementById('calYearPrevBtn');
  const nextBtn = document.getElementById('calYearNextBtn');
  const totalAmtEl = document.getElementById('calYearTotalAmt');
  const goalBarEl = document.getElementById('calYearGoalBar');
  const goalFootEl = document.getElementById('calYearGoalFoot');
  const monthGrid = document.getElementById('calYearMonthGrid');
  if (!monthGrid) return;

  const today = todayRange();
  const year = today.getFullYear() + calYearOffset;
  const isCurrentYear = calYearOffset === 0;

  if (label) label.textContent = String(year);
  if (nextBtn) nextBtn.disabled = calYearOffset >= 0;

  // "Historial desde" — texto informativo + el mes desde el que arranca el grid cuando `year` es el
  // año de esa fecha.
  const historyStart = effectiveHistoryStartDate();
  // "‹ Anterior" se deshabilita al llegar al año que contiene el inicio del historial — mismo
  // criterio que "Siguiente ›" arriba con calYearOffset, aquí bloqueando el paso a años sin ningún
  // dato real que mostrar.
  if (prevBtn) prevBtn.disabled = !!(historyStart && year <= historyStart.getFullYear());
  const historyNoteWrap = document.getElementById('calHistoryStartNote');
  const historyNoteText = document.getElementById('calHistoryStartText');
  if (historyNoteWrap && historyNoteText) {
    if (historyStart) {
      const historyLabel = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }).format(historyStart);
      historyNoteText.textContent = `Historial desde: ${historyLabel}`;
      historyNoteWrap.style.display = '';
    } else {
      historyNoteWrap.style.display = 'none';
    }
  }
  const startMonthForYear = (historyStart && historyStart.getFullYear() === year) ? historyStart.getMonth() : 0;
  // "Total del año" sumaba TODOS los días del año sin importar "Historial desde" — el corte solo se
  // aplicaba al pintar las tarjetas de mes (ver `startMonthForYear`), no al total ni al % de meta.
  const historyStartRange = historyStart ? todayRange(historyStart) : null;

  let yearTotal = 0;
  const monthTotals = [];
  const monthCellsData = [];

  for (let m = 0; m < 12; m++) {
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    let monthTotal = 0;
    const cells = [];
    const firstWeekday = (new Date(year, m, 1).getDay() + 6) % 7;
    for (let i = 0; i < firstWeekday; i++) cells.push({ empty: true });
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, m, day);
      if (historyStartRange && d < historyStartRange) {
        cells.push({ empty: true });
        continue;
      }
      const dayKey = todayCallDateKey(d);
      // Días futuros no tienen llamadas ni turno todavía — calDayTier ya resuelve 'cal-tier-nodata'
      // sola vía calDayStatus, sin necesidad de un caso especial aquí. Mismo criterio que
      // renderCalendarMonth (pinta el mes completo, sin cortar en "hoy").
      monthTotal += importedCallStats(callsForDay(dayKey), dayKey).earnings;
      const tier = calDayTier(dayKey);
      cells.push({ empty: false, tier });
    }
    yearTotal += monthTotal;
    monthTotals.push(monthTotal);
    monthCellsData.push(cells);
  }

  if (totalAmtEl) totalAmtEl.textContent = money(yearTotal);
  // El Total del año y la Meta anual también muestran su equivalente en la moneda secundaria (mismo
  // convertedAmountText que ya usa el resto de la app, ej. "Ganancias del ciclo") — vacío si no hay
  // tasa de cambio/moneda configurada.
  const totalConvertedEl = document.getElementById('calYearTotalConvertedText');
  if (totalConvertedEl) totalConvertedEl.textContent = convertedAmountText(yearTotal);

  const yearGoal = effectiveCalYearGoal(calYearOffset);
  const goalPct = yearGoal > 0 ? Math.min(100, (yearTotal / yearGoal) * 100) : 0;
  if (goalBarEl) goalBarEl.style.width = `${goalPct}%`;
  const remainingToGoal = Math.max(0, yearGoal - yearTotal);
  const remainingConverted = convertedAmountText(remainingToGoal);
  if (goalFootEl) goalFootEl.textContent = `${Math.round(goalPct)}% alcanzado · Faltan ${money(remainingToGoal)}${remainingConverted ? ` (${remainingConverted})` : ''}`;
  const goalAmtEl = document.getElementById('calYearGoalAmt');
  if (goalAmtEl) goalAmtEl.textContent = money(yearGoal);
  const goalConvertedEl = document.getElementById('calYearGoalConvertedText');
  if (goalConvertedEl) goalConvertedEl.textContent = convertedAmountText(yearGoal);

  const monthNames = Array.from({ length: 12 }, (_, m) => {
    const raw = new Intl.DateTimeFormat('es-MX', { month: 'long' }).format(new Date(2000, m, 1));
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  });

  monthGrid.innerHTML = monthCellsData.map((cells, m) => {
    if (m < startMonthForYear) return ''; // Mes anterior al inicio del historial: no hay nada que mostrar.
    const isCurrentMonth = isCurrentYear && m === today.getMonth();
    const miniHtml = cells.map(c => c.empty ? '<div class="mini-cell cal-empty"></div>' : `<div class="mini-cell ${c.tier}"></div>`).join('');
    return `
      <div class="month-card ${isCurrentMonth ? 'is-current' : ''}" data-cal-month-idx="${m}">
        <div class="month-card-head">
          <span class="month-card-name">${escapeHtml(monthNames[m])}</span>
          ${isCurrentMonth ? '<span class="month-card-badge">Actual</span>' : ''}
        </div>
        <div class="mini-grid">${miniHtml}</div>
        <div class="month-card-amt-wrap">
          <div class="month-card-amt">${money(monthTotals[m])}</div>
          <div class="month-card-amt-label">ganado este mes</div>
          ${convertedAmountText(monthTotals[m]) ? `<div class="month-card-amt-converted">${escapeHtml(convertedAmountText(monthTotals[m]))}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// Con la vista por defecto ahora en 'month' (ver calViewMode arriba), este toggle de display ya no
// vive solo dentro de openCalMonthFromYear/ backToCalYearView.
export function syncCalViewVisibility() {
  const yearView = document.getElementById('calYearView');
  const monthView = document.getElementById('calMonthDetailView');
  if (yearView) yearView.style.display = calViewMode === 'year' ? '' : 'none';
  if (monthView) monthView.style.display = calViewMode === 'month' ? '' : 'none';
}

// Fija calMonthOffset al valor relativo respecto al mes actual (negativo hacia atrás).
export function openCalMonthFromYear(monthIndex) {
  const today = todayRange();
  const year = today.getFullYear() + calYearOffset;
  setCalMonthOffset((year - today.getFullYear()) * 12 + (monthIndex - today.getMonth()));
  setCalViewMode('month');
  syncCalViewVisibility();
  renderCalendarMonth();
}

export export function backToCalYearView() {
  setCalViewMode('year');
  syncCalViewVisibility();
  renderCalYear();
}
