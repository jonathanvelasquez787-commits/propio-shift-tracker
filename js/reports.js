// Página Reportes (KPIs, gráfico mensual, racha, mejores/peores días...) — segundo módulo de la
// Fase 3, extraído de app-main.js con el mismo método que finance.js (ver v556). Depende de
// app-main.js para las funciones de cómputo de Adherencia/Calendario/Ganancias que ya existían
// ahí (compartidas con Horario y Calendario, que se quedan en app-main.js por ahora) — no se
// duplicó ninguna.

import {
  CYCLE_LENGTH_DAYS,
  RATE,
  callDateToDate,
  calls,
  callsForDay,
  connectedMinutesForDay,
  convertedAmountText,
  cycleEarningsForOffset,
  dayAdherence,
  dayConfigFor,
  dayIsEffectivelyOff,
  dayShiftBounds,
  effectiveCycleGoal,
  effectiveDailyGoal,
  effectiveHistoryStartDate,
  escapeHtml,
  financeConvertedInline,
  financeConvertedNote,
  formatCallDayLabel,
  formatDuration,
  formatMinutes,
  getActiveDayKey,
  getCycleGoalOverride,
  iconHtml,
  importedCallStats,
  money,
  pad,
  previousCalendarDay,
  productiveMinutesForDay,
  reportsMonthlyOffset,
  saveSettingsOnly,
  settings,
  todayCallDateKey,
  todayRange,
  weekDaysForOffset,
  weekSummaryForOffset,
} from './app-main.js';

function reportsDailySeries(days = 14) {
  const today = todayRange();
  const rows = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const dayKey = todayCallDateKey(d);
    const cfg = dayConfigFor(dayKey);
    const isOff = dayIsEffectivelyOff(dayKey);
    const dayCalls = callsForDay(dayKey);
    const bounds = dayShiftBounds(dayKey);
    const hasShift = !!bounds.start;
    const connected = hasShift ? connectedMinutesForDay(dayKey) : 0;
    const productive = productiveMinutesForDay(dayKey);
    const stats = importedCallStats(dayCalls, dayKey);
    const isFuture = d > today;
    const adherence = (!isOff && !isFuture) ? dayAdherence(dayKey) : null;
    rows.push({
      dayKey, date: d, isToday: dayKey === todayCallDateKey(), isOff, isFuture,
      hasShift, calls: dayCalls.length, connected, productive,
      earnings: stats.earnings, gapTotal: stats.gapTotal, callMin: stats.total,
      adherencePct: adherence ? adherence.scorePct : null,
    });
  }
  return rows;
}

export const REPORTS_MONTHLY_PAGE_SIZE = 6;

function reportsMonthlySeries(offset = 0, monthsCount = REPORTS_MONTHLY_PAGE_SIZE) {
  const today = todayRange();
  // Mismo corte que ya usa la vista anual del Calendario de productividad
  // (effectiveHistoryStartDate) — sin esto, un día pasado sin turno registrado y no marcado "libre"
  // cuenta como 0% de adherencia real, arrastrando a 0% cualquier mes anterior a que empezaras a
  // usar la app.
  const historyStart = effectiveHistoryStartDate();
  const historyStartRange = historyStart ? todayRange(historyStart) : null;
  const endMonthAnchor = new Date(today.getFullYear(), today.getMonth() + offset * monthsCount, 1);
  const months = [];
  for (let i = monthsCount - 1; i >= 0; i--) {
    months.push(new Date(endMonthAnchor.getFullYear(), endMonthAnchor.getMonth() - i, 1));
  }

  // En la página "Recientes" (offset 0), si el historial arrancó hace poco, los meses previos al
  // inicio quedaban filtrados sin reemplazo — la gráfica se veía con una sola barra pegada a la
  // izquierda y el resto vacío.
  if (offset === 0 && historyStartRange) {
    const startMonthKey = historyStartRange.getFullYear() * 12 + historyStartRange.getMonth();
    const validCount = months.filter(m => (m.getFullYear() * 12 + m.getMonth()) >= startMonthKey).length;
    const missing = monthsCount - validCount;
    if (missing > 0) {
      const lastMonth = months[months.length - 1];
      for (let i = 1; i <= missing; i++) {
        months.push(new Date(lastMonth.getFullYear(), lastMonth.getMonth() + i, 1));
      }
    }
  }

  return months
    .filter(monthDate => !historyStartRange || new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0) >= historyStartRange)
    .map(monthDate => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
    const isFutureMonth = new Date(year, month, 1) > today;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const lastDay = isCurrentMonth ? today.getDate() : daysInMonth;

    let earnings = 0;
    let workedDays = 0;
    const adherencePcts = [];

    if (!isFutureMonth) {
      for (let day = 1; day <= lastDay; day++) {
        const d = new Date(year, month, day);
        if (d > today) break;
        if (historyStartRange && d < historyStartRange) continue;
        const dayKey = todayCallDateKey(d);
        const dayCalls = callsForDay(dayKey);
        earnings += importedCallStats(dayCalls, dayKey).earnings;
        const isOff = dayIsEffectivelyOff(dayKey);
        if (!isOff) {
          workedDays++;
          const adherence = dayAdherence(dayKey);
          if (adherence) adherencePcts.push(adherence.scorePct);
        }
      }
    }

    const avgAdherencePct = adherencePcts.length
      ? Math.round(adherencePcts.reduce((a, b) => a + b, 0) / adherencePcts.length)
      : null;

    return {
      year, month, isCurrentMonth, isFutureMonth, workedDays, earnings,
      adherencePct: avgAdherencePct,
      shortLabel: new Intl.DateTimeFormat('es-MX', { month: 'short' }).format(monthDate),
      fullLabel: new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(monthDate),
    };
  });
}

export function renderReportsMonthlyChart() {
  const svg = document.getElementById('rptMonthlyChartSvg');
  const rangeLabel = document.getElementById('rptMonthlyRangeLabel');
  const nextBtn = document.getElementById('rptMonthlyNextBtn');
  const prevBtn = document.getElementById('rptMonthlyPrevBtn');
  if (!svg) return;

  const series = reportsMonthlySeries(reportsMonthlyOffset, REPORTS_MONTHLY_PAGE_SIZE);
  if (rangeLabel) {
    rangeLabel.textContent = !series.length
      ? 'Sin historial en este rango'
      : series.length === 1
        ? series[0].fullLabel
        : `${series[0].fullLabel} – ${series[series.length - 1].fullLabel}`;
  }
  if (nextBtn) nextBtn.disabled = reportsMonthlyOffset >= 0;
  if (prevBtn) {
    const historyStart = effectiveHistoryStartDate();
    if (historyStart) {
      const today = todayRange();
      const lastMonthKeyOfPrevPage = (today.getFullYear() * 12 + today.getMonth()) + (reportsMonthlyOffset - 1) * REPORTS_MONTHLY_PAGE_SIZE;
      const startMonthKey = historyStart.getFullYear() * 12 + historyStart.getMonth();
      prevBtn.disabled = lastMonthKeyOfPrevPage < startMonthKey;
    } else {
      prevBtn.disabled = false;
    }
  }
  if (!series.length) {
    svg.innerHTML = '';
    return;
  }

  // ViewBox = ancho real en px (sin estirar) para que el texto no se deforme; 600 si el SVG está
  // oculto.
  const w = Math.max(280, Math.round(svg.getBoundingClientRect().width) || 600);
  const h = 170;
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  const padTop = 34, padBottom = 24, padSide = 8;
  const n = series.length;
  const slotW = (w - padSide * 2) / n;
  const barWidth = Math.max(4, Math.min(72, slotW * 0.6));
  const maxEarnings = Math.max(1, ...series.map(m => m.earnings));
  const plotH = h - padTop - padBottom;
  const centerX = (i) => padSide + i * slotW + slotW / 2;

  const barsHtml = series.map((m, i) => {
    const cx = centerX(i);
    const x = cx - barWidth / 2;
    const barH = maxEarnings > 0 ? (m.earnings / maxEarnings) * plotH : 0;
    const y = h - padBottom - barH;
    const opacity = m.isFutureMonth ? 0 : (m.isCurrentMonth ? 1 : .75);
    const amountLabel = m.earnings > 0 ? money(m.earnings) : '';
    const convertedLabel = m.earnings > 0 ? convertedAmountText(m.earnings) : '';
    const amountY = convertedLabel ? y - 15 : y - 5;
    return `
      <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barH.toFixed(1)}" rx="4" fill="var(--rpt-blue)" opacity="${opacity}"/>
      ${amountLabel ? `<text x="${cx.toFixed(1)}" y="${amountY.toFixed(1)}" text-anchor="middle" font-size="10" font-weight="700" fill="var(--text)">${escapeHtml(amountLabel)}</text>` : ''}
      ${convertedLabel ? `<text x="${cx.toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle" font-size="8.5" font-weight="600" fill="var(--muted)">${escapeHtml(convertedLabel)}</text>` : ''}
      <text x="${cx.toFixed(1)}" y="${h - 7}" text-anchor="middle" font-size="10" fill="var(--muted)">${escapeHtml(m.shortLabel)}</text>
    `;
  }).join('');

  const adherenceYFor = (pct) => padTop + (1 - pct / 100) * plotH;
  const points = series.map((m, i) => {
    if (m.adherencePct === null) return null;
    return { x: centerX(i), y: adherenceYFor(m.adherencePct), pct: m.adherencePct };
  });

  // La línea se corta en cualquier mes sin dato (null) en vez de saltarlo.
  const segments = [];
  let current = [];
  points.forEach(p => {
    if (p) { current.push(p); }
    else if (current.length) { segments.push(current); current = []; }
  });
  if (current.length) segments.push(current);

  const lineHtml = segments
    .filter(seg => seg.length > 1)
    .map(seg => `<polyline points="${seg.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}" fill="none" stroke="var(--rpt-purple)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="6 4"/>`)
    .join('');

  // La píldora oscura detrás del % mantiene legible el texto cuando cae sobre una barra.
  const dotsHtml = points.filter(Boolean).map(p => {
    const label = `${p.pct}%`;
    const chipWidth = label.length * 6.2 + 8;
    return `
      <rect x="${(p.x - chipWidth / 2).toFixed(1)}" y="${(p.y - 19).toFixed(1)}" width="${chipWidth.toFixed(1)}" height="13" rx="6" fill="rgba(7, 16, 31, .55)"/>
      <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="var(--rpt-purple)"/>
      <text x="${p.x.toFixed(1)}" y="${(p.y - 9).toFixed(1)}" text-anchor="middle" font-size="9" font-weight="700" fill="var(--rpt-purple)">${escapeHtml(label)}</text>
    `;
  }).join('');

  svg.innerHTML = `${barsHtml}${lineHtml}${dotsHtml}`;
}

function reportsKpiData(dayKey = getActiveDayKey()) {
  const base = callDateToDate(dayKey) || new Date();
  const prevKey = todayCallDateKey(previousCalendarDay(base));
  const dayCalls = callsForDay(dayKey);
  const prevCalls = callsForDay(prevKey);
  const stats = importedCallStats(dayCalls, dayKey);
  const prevStats = importedCallStats(prevCalls, prevKey);
  const productive = productiveMinutesForDay(dayKey);
  const prevProductive = productiveMinutesForDay(prevKey);
  const adherence = dayAdherence(dayKey);
  const prevAdherence = dayAdherence(prevKey);
  return {
    productiveMin: productive,
    productiveDeltaMin: productive - prevProductive,
    adherencePct: adherence ? adherence.scorePct : null,
    adherenceDeltaPts: (adherence && prevAdherence) ? adherence.scorePct - prevAdherence.scorePct : null,
    callCount: dayCalls.length,
    callCountDelta: dayCalls.length - prevCalls.length,
    earnings: stats.earnings,
    earningsDelta: stats.earnings - prevStats.earnings,
  };
}

function reportsQualityOfTime(dayKey = getActiveDayKey()) {
  const dayCalls = callsForDay(dayKey);
  const stats = importedCallStats(dayCalls, dayKey);
  const connected = connectedMinutesForDay(dayKey);
  if (connected <= 0) return { callPct: 0, acwPct: 0, otherPct: 0, connected: 0 };
  const callPct = Math.min(100, (stats.total / connected) * 100);
  const acwPct = Math.min(100 - callPct, (stats.gapTotal / connected) * 100);
  const otherPct = Math.max(0, 100 - callPct - acwPct);
  return { callPct, acwPct, otherPct, connected };
}

function reportsAdherenceStats() {
  const series = reportsDailySeries(7).filter(r => r.adherencePct !== null);
  const today = dayAdherence(getActiveDayKey());
  if (!series.length) return { todayPct: today ? today.scorePct : null, bestPct: null, worstPct: null, avgPct: null };
  const pcts = series.map(r => r.adherencePct);
  return {
    todayPct: today ? today.scorePct : null,
    bestPct: Math.max(...pcts),
    worstPct: Math.min(...pcts),
    avgPct: Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length),
  };
}

function reportsCycleBreakdown() {
  const cycle = cycleEarningsForOffset(0);
  const goal = effectiveCycleGoal(0);
  const trabajo = cycle.earnings - (cycle.higherRateBonus || 0);
  return {
    amount: cycle.earnings,
    goal,
    pctOfGoal: goal > 0 ? Math.min(100, (cycle.earnings / goal) * 100) : 0,
    trabajo,
    higherRate: cycle.higherRateBonus || 0,
    isCustomGoal: getCycleGoalOverride(0) !== null,
  };
}

function reportsBestWorstDay() {
  const series = reportsDailySeries(7).filter(r => r.adherencePct !== null);
  if (series.length < 2) return { best: null, worst: null };
  const avg = series.reduce((a, r) => a + r.adherencePct, 0) / series.length;
  const sorted = [...series].sort((a, b) => b.adherencePct - a.adherencePct);
  const pctVsAvg = (r) => avg > 0 ? Math.round(((r.adherencePct - avg) / avg) * 100) : 0;
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  return {
    best: { dayKey: best.dayKey, adherencePct: best.adherencePct, calls: best.calls, vsAvgPct: pctVsAvg(best) },
    worst: { dayKey: worst.dayKey, adherencePct: worst.adherencePct, calls: worst.calls, vsAvgPct: pctVsAvg(worst) },
  };
}

function reportsTrends() {
  const cur = weekSummaryForOffset(0).totals;
  const prev = weekSummaryForOffset(-1).totals;
  const pctChange = (curVal, prevVal) => {
    if (!Number.isFinite(prevVal) || prevVal === 0) return curVal > 0 ? null : 0;
    return Math.round(((curVal - prevVal) / prevVal) * 100);
  };
  const acwForWeek = (offset) => weekDaysForOffset(offset).reduce((a, d) => {
    const dayKey = todayCallDateKey(d);
    return a + importedCallStats(callsForDay(dayKey), dayKey).gapTotal;
  }, 0);
  return {
    productivePct: pctChange(cur.productive, prev.productive),
    adherencePct: pctChange(cur.avgAdherence, prev.avgAdherence),
    earningsPct: pctChange(cur.earnings, prev.earnings),
    callsPct: pctChange(cur.calls, prev.calls),
    acwPct: pctChange(acwForWeek(0), acwForWeek(-1)),
  };
}

function dayComplianceStatus(dayKey) {
  if (dayIsEffectivelyOff(dayKey)) return 'off';
  const isToday = dayKey === todayCallDateKey();
  const adherence = dayAdherence(dayKey);
  if (!adherence) return isToday ? 'pending' : 'off';
  const goalPct = Number(settings.adherenceGoalPct) || 95;
  const goalMin = effectiveDailyGoal(dayKey).min;
  const meetsAdherence = adherence.scorePct >= goalPct;
  const meetsProductivity = goalMin <= 0 || productiveMinutesForDay(dayKey) >= goalMin - 0.5;
  return (meetsAdherence && meetsProductivity) ? 'compliant' : 'failed';
}

function computeComplianceStreak() {
  const skipOff = settings.streakSkipOffDays !== false;
  let streak = 0;
  let cursor = todayRange();
  for (let i = 0; i < 400; i++) {
    const dayKey = todayCallDateKey(cursor);
    const status = dayComplianceStatus(dayKey);
    if (status === 'pending') { cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1); continue; }
    if (status === 'off') {
      if (skipOff) { cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1); continue; }
      break;
    }
    if (status === 'compliant') { streak++; cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1); continue; }
    break;
  }
  return { days: streak };
}

function reportsCallsByHour(days = 14) {
  const today = todayRange();
  const since = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1));
  const now = new Date();
  const buckets = new Array(24).fill(0);
  calls.forEach(c => {
    const d = new Date(c.startISO);
    if (d < since || d > now) return;
    buckets[d.getHours()]++;
  });
  return buckets;
}

function reportsWeekBillableDropped(offset = 0) {
  let billable = 0, dropped = 0, total = 0;
  weekDaysForOffset(offset).forEach(d => {
    callsForDay(todayCallDateKey(d)).forEach(c => {
      total++;
      if (String(c.billable).toLowerCase() === 'yes') billable++;
      if (String(c.dropped).toLowerCase() === 'yes') dropped++;
    });
  });
  return {
    billablePct: total > 0 ? Math.round((billable / total) * 100) : null,
    droppedPct: total > 0 ? Math.round((dropped / total) * 100) : null,
    total,
  };
}

export function cycleGoalPace() {
  const cycle = cycleEarningsForOffset(0);
  const goal = effectiveCycleGoal(0);
  const remainingUsd = Math.max(0, goal - cycle.earnings);
  const today = todayRange();
  const end = todayRange(cycle.end);
  let workDaysLeft = 0;
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let guard = 0;
  while (cursor <= end && guard++ < CYCLE_LENGTH_DAYS + 2) {
    if (!dayIsEffectivelyOff(todayCallDateKey(cursor))) workDaysLeft++;
    cursor.setDate(cursor.getDate() + 1);
  }
  const rate = Number(settings.rate) > 0 ? Number(settings.rate) : RATE;
  const perDayUsd = workDaysLeft > 0 ? remainingUsd / workDaysLeft : null;
  return {
    remainingUsd,
    workDaysLeft,
    perDayUsd,
    perDayHours: (perDayUsd !== null && rate > 0) ? perDayUsd / rate / 60 : null,
    met: remainingUsd <= 0.004,
  };
}

export function reportsCycleProjection() {
  const cycle = cycleEarningsForOffset(0);
  const today = todayRange();
  const daysElapsed = Math.min(CYCLE_LENGTH_DAYS, Math.max(1, Math.round((today.getTime() - cycle.start.getTime()) / 86400000) + 1));
  const dailyAvg = cycle.earnings / daysElapsed;
  return {
    projected: dailyAvg * CYCLE_LENGTH_DAYS,
    daysElapsed,
    daysRemaining: Math.max(0, CYCLE_LENGTH_DAYS - daysElapsed),
  };
}

function updateStreakSkipOffSetting(checked) {
  settings.streakSkipOffDays = !!checked;
  saveSettingsOnly();
  renderReportsDashboard();
}

function trendChipHtml(label, pct, opts = {}) {
  const invertGood = !!opts.invertGood; // ACW: bajar es bueno, subir es malo.
  if (pct === null) return `<div class="rpt-trend-chip"><span class="flat">${iconHtml('circle')}</span> ${escapeHtml(label)} sin datos</div>`;
  if (pct === 0) return `<div class="rpt-trend-chip"><span class="flat">→</span> ${escapeHtml(label)} estable</div>`;
  const isUp = pct > 0;
  const isGood = invertGood ? !isUp : isUp;
  const arrow = isUp ? '↑' : '↓';
  return `<div class="rpt-trend-chip"><span class="${isGood ? 'up' : 'down'}">${arrow}</span> ${escapeHtml(label)} ${isUp ? '+' : ''}${pct}%</div>`;
}

function statChipHtml(label, valueText, tone = 'flat') {
  return `<div class="rpt-trend-chip"><span class="${tone}">●</span> ${escapeHtml(label)} ${escapeHtml(valueText)}</div>`;
}

export function renderReportsDashboard() {
  const dashboard = document.getElementById('rptDashboard');
  if (!dashboard) return;
  const dayKey = getActiveDayKey();

  const datePill = document.getElementById('rptDatePill');
  if (datePill) datePill.innerHTML = `${iconHtml('calendar')} ${escapeHtml(dayKey === todayCallDateKey() ? 'Hoy, ' : '')}${escapeHtml(formatCallDayLabel(dayKey))}`;

  // Cada cabecera de sección tiene su propio id (en vez de depender del orden de aparición de
  // `.rpt-section-title` en el DOM) — más robusto ante reordenamientos futuros de esta página.
  const setSecTitle = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
  setSecTitle('rptSecGoals', `${iconHtml('target')} Hoy: objetivos y progreso`);
  setSecTitle('rptSecChart', `${iconHtml('chart')} Productividad — últimos 14 días`);
  setSecTitle('rptSecHours', `${iconHtml('phone')} Llamadas por hora del día`);
  setSecTitle('rptSecQuality', `${iconHtml('zap')} Calidad y adherencia`);
  setSecTitle('rptSecCycle', `${iconHtml('flag')} Ganancias del ciclo`);

  // Fusión de los 4 KPI cards (Productivo/ Adherencia/Llamadas/Ganancias, comparados contra ayer)
  // con las 3 tarjetas de "Objetivos del día" (comparadas contra tu meta)
  const kpi = reportsKpiData(dayKey);
  const goalsGrid = document.getElementById('rptGoalsGrid');
  if (goalsGrid) {
    const dayGoalForReports = effectiveDailyGoal(dayKey);
    const goalMin = dayGoalForReports.min;
    const goalUsd = dayGoalForReports.usd;
    const goalAdherence = Number(settings.adherenceGoalPct || 95);
    const productivePct = goalMin > 0 ? Math.min(100, (kpi.productiveMin / goalMin) * 100) : 0;
    const earningsPct = goalUsd > 0 ? Math.min(100, (kpi.earnings / goalUsd) * 100) : 0;
    const adherencePct = kpi.adherencePct === null ? 0 : Math.min(100, (kpi.adherencePct / goalAdherence) * 100);
    const deltaLine = (val, unit) => {
      if (val === null || !Number.isFinite(val) || val === 0) return `<div class="rpt-goal-delta flat">Sin cambio vs ayer</div>`;
      const up = val > 0;
      const text = unit === '$' ? `${money(Math.abs(val))}${financeConvertedInline(Math.abs(val))}` : `${Math.abs(val)}${unit}`;
      return `<div class="rpt-goal-delta ${up ? 'up' : 'down'}">${up ? '↑' : '↓'} ${text} vs ayer</div>`;
    };
    goalsGrid.innerHTML = `
      <div class="rpt-goal-card gh-goal-card" style="margin-top:0;">
        <div class="gh-goal-top"><span>Productividad</span><b>${formatMinutes(kpi.productiveMin)}/${formatMinutes(goalMin)} min</b></div>
        <div class="rpt-goal-bar blue"><div style="width:${productivePct}%;"></div></div>
        <div class="gh-goal-foot">${kpi.productiveMin >= goalMin ? '¡Meta alcanzada!' : `Faltan ${formatMinutes(Math.max(0, goalMin - kpi.productiveMin))} min`}</div>
        ${deltaLine(kpi.productiveDeltaMin, ' min')}
      </div>
      <div class="rpt-goal-card gh-goal-card" style="margin-top:0;">
        <div class="gh-goal-top"><span>Adherencia</span><b>${kpi.adherencePct === null ? '—' : kpi.adherencePct}/${goalAdherence}%</b></div>
        <div class="rpt-goal-bar good"><div style="width:${adherencePct}%;"></div></div>
        <div class="gh-goal-foot">${kpi.adherencePct !== null && kpi.adherencePct >= goalAdherence ? '¡Meta alcanzada!' : `Faltan ${kpi.adherencePct === null ? goalAdherence : Math.max(0, goalAdherence - kpi.adherencePct)}%`}</div>
        ${deltaLine(kpi.adherenceDeltaPts, '%')}
      </div>
      <div class="rpt-goal-card gh-goal-card" style="margin-top:0;">
        <div class="gh-goal-top"><span>Ganancias</span><b>${money(kpi.earnings)}/${money(goalUsd)}</b></div>
        ${convertedAmountText(goalUsd) ? `<div class="fin-row-converted">${escapeHtml(convertedAmountText(kpi.earnings))} / ${escapeHtml(convertedAmountText(goalUsd))}</div>` : ''}
        <div class="rpt-goal-bar purple"><div style="width:${earningsPct}%;"></div></div>
        <div class="gh-goal-foot">${kpi.earnings >= goalUsd ? '¡Meta alcanzada!' : `Faltan ${money(Math.max(0, goalUsd - kpi.earnings))}${financeConvertedInline(Math.max(0, goalUsd - kpi.earnings))}`}</div>
        ${deltaLine(kpi.earningsDelta, '$')}
      </div>
    `;
  }

  // Gráfica de 14 días (productivo real vs meta diaria constante)
  const chartSvg = document.getElementById('rptChartSvg');
  if (chartSvg) {
    const series = reportsDailySeries(14);
    const goalMin = Number(settings.productiveGoalMin || 0);
    const maxVal = Math.max(goalMin, ...series.map(r => r.productive), 1);
    const w = 600, h = 140, pad = 6;
    const stepX = series.length > 1 ? (w / (series.length - 1)) : w;
    const yFor = (val) => h - pad - (Math.min(val, maxVal) / maxVal) * (h - pad * 2);
    const points = series.map((r, i) => `${Math.round(i * stepX)},${Math.round(yFor(r.productive))}`).join(' ');
    const goalY = Math.round(yFor(goalMin));
    chartSvg.innerHTML = `
      <polyline points="${points}" fill="none" stroke="var(--rpt-blue)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <polyline points="0,${goalY} ${w},${goalY}" fill="none" stroke="var(--rpt-purple)" stroke-width="2" stroke-dasharray="6 5"/>
    `;
  }

  setSecTitle('rptSecMonthly', `${iconHtml('chart')} Ganancias y adherencia por mes`);
  renderReportsMonthlyChart();

  const hourBars = document.getElementById('rptHourBars');
  if (hourBars) {
    const buckets = reportsCallsByHour(14);
    const maxVal = Math.max(1, ...buckets);
    hourBars.innerHTML = buckets.map((count, hour) => {
      const pct = count > 0 ? Math.max(6, Math.round((count / maxVal) * 100)) : 0;
      const label = hour % 3 === 0 ? `${hour}h` : '';
      return `<div class="rpt-hour-col" title="${hour}:00 – ${count} llamada(s) en 14 días"><div class="rpt-hour-bar" style="height:${pct}%;"></div><span class="rpt-hour-label">${label}</span></div>`;
    }).join('');
  }

  // Tri-grid: Actividad de hoy / Calidad del tiempo (dona) / Adherencia (arco)
  const triGrid = document.getElementById('rptTriGrid');
  if (triGrid) {
    const stats = importedCallStats(callsForDay(dayKey), dayKey);
    const prevKey = todayCallDateKey(previousCalendarDay(callDateToDate(dayKey) || new Date()));
    const prevStats = importedCallStats(callsForDay(prevKey), prevKey);
    const connectedMin = connectedMinutesForDay(dayKey);
    const prevConnectedMin = connectedMinutesForDay(prevKey);
    const deltaChip = (val, unit) => {
      if (!val) return '';
      const up = val > 0;
      return `<span class="rpt-act-delta ${up ? 'up' : 'down'}">${up ? '+' : ''}${unit === 'min' ? formatMinutes(val) : val}${unit === 'min' ? 'm' : ''}</span>`;
    };
    const q = reportsQualityOfTime(dayKey);
    // Dona: 3 arcos apilados sobre la circunferencia (r=48, circunf.≈301.6)
    const R = 48, CIRC = 2 * Math.PI * R;
    const callLen = (q.callPct / 100) * CIRC;
    const acwLen = (q.acwPct / 100) * CIRC;
    const otherLen = (q.otherPct / 100) * CIRC;
    const adh = reportsAdherenceStats();
    const arcTotal = 171; // Longitud del path del arco en el SVG del mock (M10,80 A60,60 0 0 1 130,80)
    const arcPct = adh.todayPct === null ? 0 : adh.todayPct;
    const arcOffset = arcTotal - (arcPct / 100) * arcTotal;
    const arcLabel = arcPct >= 95 ? 'Excelente' : arcPct >= 85 ? 'Muy buena' : arcPct >= 70 ? 'Aceptable' : arcPct > 0 ? 'Baja' : 'Sin datos';
    triGrid.innerHTML = `
      <div class="rpt-mini-card">
        <div class="rpt-mini-title">ACTIVIDAD DE HOY</div>
        <div class="rpt-act-row"><span class="rpt-act-left">${iconHtml('phone')} Llamadas</span><span class="rpt-act-val">${stats.billable + stats.dropped >= 0 ? callsForDay(dayKey).length : 0}${deltaChip(callsForDay(dayKey).length - callsForDay(prevKey).length, '')}</span></div>
        <div class="rpt-act-row"><span class="rpt-act-left">${iconHtml('timer')} Tiempo conectado</span><span class="rpt-act-val">${formatDuration(connectedMin * 60000)}${deltaChip(Math.round(connectedMin - prevConnectedMin), 'min')}</span></div>
        <div class="rpt-act-row"><span class="rpt-act-left">${iconHtml('coffee')} Break</span><span class="rpt-act-val">${formatDuration(stats.breakGapTotal * 60000)}${deltaChip(Math.round(stats.breakGapTotal - prevStats.breakGapTotal), 'min')}</span></div>
        <div class="rpt-act-row"><span class="rpt-act-left">${iconHtml('utensils')} Lunch</span><span class="rpt-act-val">${formatDuration(stats.lunchGapTotal * 60000)}</span></div>
      </div>
      <div class="rpt-mini-card">
        <div class="rpt-mini-title">CALIDAD DEL TIEMPO</div>
        <div class="rpt-donut-wrap">
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="${R}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="14"/>
            ${connectedMin > 0 ? `
            <circle cx="60" cy="60" r="${R}" fill="none" stroke="var(--rpt-blue)" stroke-width="14" stroke-dasharray="${callLen} ${CIRC - callLen}" stroke-dashoffset="0" transform="rotate(-90 60 60)"/>
            <circle cx="60" cy="60" r="${R}" fill="none" stroke="var(--rpt-purple)" stroke-width="14" stroke-dasharray="${acwLen} ${CIRC - acwLen}" stroke-dashoffset="${-callLen}" transform="rotate(-90 60 60)"/>
            <circle cx="60" cy="60" r="${R}" fill="none" stroke="var(--pink)" stroke-width="14" stroke-dasharray="${otherLen} ${CIRC - otherLen}" stroke-dashoffset="${-(callLen + acwLen)}" transform="rotate(-90 60 60)"/>
            ` : ''}
            <text x="60" y="66" text-anchor="middle" font-size="20" font-weight="800" fill="var(--text)">${connectedMin > 0 ? Math.round(q.callPct + q.acwPct) + '%' : '—'}</text>
          </svg>
          <div class="rpt-donut-legend">
            <span><i style="background:var(--rpt-blue);"></i> Llamadas ${Math.round(q.callPct)}%</span>
            <span><i style="background:var(--rpt-purple);"></i> ACW ${Math.round(q.acwPct)}%</span>
            <span><i style="background:var(--pink);"></i> Improductivo ${Math.round(q.otherPct)}%</span>
          </div>
        </div>
      </div>
      <div class="rpt-mini-card">
        <div class="rpt-mini-title">ADHERENCIA</div>
        <div class="rpt-arc-wrap">
          <svg width="140" height="90" viewBox="0 0 140 90">
            <path d="M10,80 A60,60 0 0 1 130,80" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="12"/>
            <path d="M10,80 A60,60 0 0 1 130,80" fill="none" stroke="var(--good)" stroke-width="12" stroke-dasharray="${arcTotal}" stroke-dashoffset="${arcOffset}"/>
          </svg>
          <div class="rpt-arc-val">${adh.todayPct === null ? '—' : adh.todayPct + '%'}</div>
          <div class="rpt-arc-label">${escapeHtml(arcLabel)}</div>
          <div class="rpt-arc-stats">
            <span>Mejor: ${adh.bestPct === null ? '—' : adh.bestPct + '%'} · Peor: ${adh.worstPct === null ? '—' : adh.worstPct + '%'}</span>
            <span>Promedio 7d: ${adh.avgPct === null ? '—' : adh.avgPct + '%'}</span>
          </div>
        </div>
      </div>
    `;
  }

  // "Ganancias del ciclo" se simplifica (mejor/ peor día se quita de aquí — se queda solo en la
  // tarjeta de Adherencia de arriba, era el mismo dato repetido dos veces) y gana una tarjeta de
  // Proyección.
  const cycleGrid = document.getElementById('rptCycleGrid');
  if (cycleGrid) {
    const c = reportsCycleBreakdown();
    const proj = reportsCycleProjection();
    const pace = cycleGoalPace();
    const projDelta = proj.projected - c.goal;
    const projTone = projDelta >= 0 ? 'good' : 'pink';
    const streak = computeComplianceStreak();
    const skipOff = settings.streakSkipOffDays !== false;
    const paceText = pace.met
      ? 'Meta alcanzada'
      : pace.workDaysLeft === 0
        ? 'Sin días laborales'
        : `~${pace.perDayHours.toFixed(1)} h/día`;
    const paceSubText = pace.met
      ? 'Todo lo que ganes de aquí en adelante es extra'
      : pace.workDaysLeft === 0
        ? `Faltan ${money(pace.remainingUsd)}${financeConvertedInline(pace.remainingUsd)} y ya no quedan días laborales en el ciclo`
        : `Faltan ${money(pace.remainingUsd)}${financeConvertedInline(pace.remainingUsd)} en ${pace.workDaysLeft} ${pace.workDaysLeft === 1 ? 'día laboral' : 'días laborales'} — ${money(pace.perDayUsd)}${financeConvertedInline(pace.perDayUsd)} por día`;
    cycleGrid.innerHTML = `
      <div class="rpt-mini-card rpt-streak-card">
        <div class="rpt-mini-title">${iconHtml('flame')} RACHA DE CUMPLIMIENTO</div>
        <div class="rpt-streak-main">
          <span class="rpt-streak-icon">${iconHtml('flame')}</span>
          <div>
            <div class="rpt-streak-num">${streak.days} ${streak.days === 1 ? 'día' : 'días'}</div>
            <div class="rpt-streak-sub">Cumpliendo tu meta de Adherencia y Productividad, seguidos</div>
          </div>
        </div>
        <label class="sched-checkbox-row rpt-streak-toggle">
          <input type="checkbox" id="streakSkipOffToggle" ${skipOff ? 'checked' : ''}/>
          Un día libre/sin turno no corta la racha (se salta)
        </label>
      </div>
      <div class="rpt-mini-card rpt-cycle-card">
        <div class="gh-ring-wrap" style="flex-direction:row; justify-content:flex-start; gap:12px; margin-bottom:12px;">
          <div class="gh-ring" style="--ring-pct:${c.pctOfGoal};"><span class="gh-ring-value">${Math.round(c.pctOfGoal)}%</span></div>
          <div style="min-width:0;">
            <div class="rpt-cycle-amt">${money(c.amount)}</div>
            ${financeConvertedNote(c.amount)}
            <div class="gh-ring-label" style="text-align:left; white-space:normal;">de tu meta ${money(c.goal)}${financeConvertedInline(c.goal)}${c.isCustomGoal ? '' : ' (auto)'}</div>
          </div>
        </div>
        <div class="gh-goal-card" style="margin-top:0;">
          <div class="gh-goal-top"><span>Progreso del ciclo</span><b>${Math.round(c.pctOfGoal)}%</b></div>
          <div class="progress"><div style="width:${c.pctOfGoal}%; background: linear-gradient(90deg, var(--teal), var(--blue));"></div></div>
          <div class="gh-goal-foot">
            <span>${c.isCustomGoal ? 'Meta personalizada' : 'Sugerida automáticamente'}</span>
            <button class="tbl-icon-btn" type="button" data-edit-card="cycle-goal" aria-label="Editar meta del ciclo" title="Editar meta del ciclo">${iconHtml('edit')}</button>
          </div>
        </div>
        <div class="rpt-mini-stats" style="margin-top:10px;">
          <div>Trabajo<b>${money(c.trabajo)}</b>${financeConvertedNote(c.trabajo)}</div>
          <div>Higher Rate<b>${money(c.higherRate)}</b>${financeConvertedNote(c.higherRate)}</div>
        </div>
      </div>
      <div class="rpt-mini-card">
        <div class="rpt-mini-title">${iconHtml('chart')} PROYECCIÓN DEL CICLO</div>
        <div class="rpt-bw-metric"><span>Al ritmo de hoy</span><b>${money(proj.projected)}${financeConvertedInline(proj.projected)}</b></div>
        <div class="rpt-bw-metric"><span>Días transcurridos</span><b>${proj.daysElapsed}/${CYCLE_LENGTH_DAYS}</b></div>
        <div class="rpt-bw-metric"><span>Días restantes</span><b>${proj.daysRemaining}</b></div>
        <div class="rpt-bw-metric"><span>vs tu meta del ciclo</span><b style="color:var(--${projTone});">${projDelta >= 0 ? '+' : ''}${money(projDelta)}${financeConvertedInline(Math.abs(projDelta))}</b></div>
        <div class="rpt-bw-metric"><span>Para llegar a tu meta</span><b style="color:var(--${pace.met ? 'good' : 'text'});">${escapeHtml(paceText)}</b></div>
        <div class="rpt-act-row" style="border-bottom:none; padding-top:2px;"><span class="rpt-act-left" style="font-size:11px; line-height:1.4;">${paceSubText}</span></div>
      </div>
    `;
    const streakToggle = document.getElementById('streakSkipOffToggle');
    if (streakToggle) streakToggle.addEventListener('change', (e) => updateStreakSkipOffSetting(e.target.checked));
  }


  // Tendencias vs 7 días anteriores + % Billable/Dropped semanal (nuevo)
  const trendRow = document.getElementById('rptTrendRow');
  if (trendRow) {
    const t = reportsTrends();
    const bd = reportsWeekBillableDropped(0);
    trendRow.innerHTML = [
      trendChipHtml('Productividad', t.productivePct),
      trendChipHtml('Adherencia', t.adherencePct),
      trendChipHtml('Ganancias', t.earningsPct),
      trendChipHtml('Llamadas', t.callsPct),
      trendChipHtml('ACW', t.acwPct, { invertGood: true }),
      statChipHtml('Billable', bd.billablePct === null ? '—' : `${bd.billablePct}%`, bd.billablePct === null ? 'flat' : (bd.billablePct >= 80 ? 'up' : 'down')),
      statChipHtml('Dropped', bd.droppedPct === null ? '—' : `${bd.droppedPct}%`, bd.droppedPct === null ? 'flat' : (bd.droppedPct <= 10 ? 'up' : 'down')),
    ].join('');
  }
}
