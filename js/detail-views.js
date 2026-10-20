export function earningsBreakdownForCalls(sourceCalls, parseMoney, bonusForCall) {
  let registeredBase = 0, liveBase = 0, bonus = 0, liveCount = 0, baseTotal = 0;
  for (const call of sourceCalls) {
    const base = parseMoney(call.pay);
    baseTotal += base;
    const isLiveEstimate = call.propioBridge?.payEstimated === true
      || (call.source === 'live' && call.propioBridge?.payEstimated !== false);
    if (isLiveEstimate) { liveBase += base; liveCount++; }
    else registeredBase += base;
    bonus += Number(bonusForCall(call)?.amount) || 0;
  }
  return { registeredBase, liveBase, bonus, total: baseTotal + bonus, liveCount, count: sourceCalls.length };
}

export function renderEarningsBreakdown(wrap, sourceCalls, context) {
  const { ui, translateText, escapeHtml, money, financeConvertedInline, parseMoney, higherRateBonusForCall, scopeLabel } = context;
  const amounts = earningsBreakdownForCalls(sourceCalls, parseMoney, higherRateBonusForCall);
  const rate = Number(context.exchangeRate), label = String(context.currencyLabel || '').trim();
  const conversion = Number.isFinite(rate) && rate > 0 && label
    ? ui`Cambio manual: $1 = ${escapeHtml(label)} ${rate}.`
    : translateText('Moneda secundaria desactivada.');
  const rows = [
    [translateText('Base registrada'), amounts.registeredBase],
    [translateText('Base estimada en vivo'), amounts.liveBase],
    [translateText('Higher Rate calculado'), amounts.bonus],
    [translateText('Total de la tool'), amounts.total],
  ];
  const html = ui`<p class="note" style="margin:0;">${escapeHtml(scopeLabel)} · Registros: ${amounts.count} · Estimados en vivo: ${amounts.liveCount}</p>`
    + rows.map(([label, amount]) => ui`<div class="fin-preview-row"><span class="fin-preview-main fin-preview-name">${escapeHtml(label)}</span><span class="fin-preview-right"><strong>${money(amount)}</strong>${financeConvertedInline(amount)}</span></div>`).join('')
    + ui`<p class="alert-hint">La base registrada incluye importaciones y montos manuales. Los estimados en vivo se actualizan con el historial de Propio. Higher Rate se calcula con tus ventanas; el total no confirma un pago recibido.</p>`
    + `<p class="alert-hint">${conversion}</p>`;
  if (wrap.innerHTML !== html) wrap.innerHTML = html;
}

let higherRateHistoryOpen = false;
export function renderHigherRateDayStats(context) {
  const { ui, translateText, translateMarkup, displayLocale, settings, HIGHER_RATE_TIERS,
    callDateKeyFromValue, callDateToDate, escapeHtml, financeConvertedInline,
    formatBlockDurationLabel, formatHHMM, higherRateLiveStatus, higherRateStatsForDay,
    higherRateWindowsTodayTotalMin, iconHtml, money, timeLabel, todayCallDateKey, todayRange, toMinutes } = context;
function dominantHigherRateTier(breakdown) {
      const entries = Object.keys(breakdown || {}).filter(t => breakdown[t] > 0);
      if (!entries.length) return null;
      return entries.reduce((a, b) => (HIGHER_RATE_TIERS[b]?.bonusPerMin || 0) > (HIGHER_RATE_TIERS[a]?.bonusPerMin || 0) ? b : a);
    }
function higherRateHeroTierBadge(tierKey) {
      const meta = HIGHER_RATE_TIERS[tierKey];
      if (!meta) return '';
      return ui`<span class="hero-today-tier" style="background: rgba(${meta.colorRgb}, .16); border: 1px solid rgba(${meta.colorRgb}, .4); color: var(${meta.colorVar});">${iconHtml('medal')} ${escapeHtml(meta.label)} +${money(meta.bonusPerMin)}/min</span>`;
    }
function draw() {
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

      const todayDateRaw = new Intl.DateTimeFormat(displayLocale(), { weekday: 'long', day: 'numeric', month: 'long' }).format(today);
      const todayDateLabel = ui`Hoy · ${todayDateRaw.charAt(0).toUpperCase() + todayDateRaw.slice(1)}`;

      const footHtml = todayWindowsMin > 0
        ? ui`<div class="hero-today-foot"><span>${Math.round(todayPct)}% de la ventana aprovechada</span><span>${isActiveNow ? ui`Termina a las ${timeLabel(liveStatus.window.end)}` : ''}</span></div>`
        : '';

      const heroHtml = ui`
        <div class="hero-today ${isActiveNow ? 'is-live' : ''}"${liveTierStyle}>
          <div class="hero-today-top">
            <div>
              <span class="hero-today-label ${isActiveNow ? 'tone-active' : ''}">${isActiveNow ? translateMarkup('<span class="pulse-dot" aria-hidden="true"></span>Ganando bono ahora') : translateText('Higher Rate hoy')}</span>
              <div class="hero-today-date">${escapeHtml(todayDateLabel)}</div>
            </div>
            ${tierBadgeHtml}
          </div>
          <div class="hero-today-figures">
            <div><div class="hero-fig-value is-bonus">+${money(todayStats.totalBonus)}</div><div class="hero-fig-label">Bono ganado hoy${financeConvertedInline(todayStats.totalBonus)}</div></div>
            <div><div class="hero-fig-value">${escapeHtml(formatBlockDurationLabel(todayStats.totalMin))}</div><div class="hero-fig-label">en llamada dentro de ventana</div></div>
            <div><div class="hero-fig-value" style="font-size:20px; color:var(--muted);">${escapeHtml(formatBlockDurationLabel(todayWindowsMin))}</div><div class="hero-fig-label">ventana total de hoy</div></div>
          </div>
          ${todayWindowsMin > 0 ? ui`<div class="hero-today-track"><div style="width:${todayPct}%;"></div></div>` : ''}
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
        const dayNameRaw = new Intl.DateTimeFormat(displayLocale(), { weekday: 'long' }).format(dateObj);
        const dayName = dayNameRaw.charAt(0).toUpperCase() + dayNameRaw.slice(1);
        const dayNum = new Intl.DateTimeFormat(displayLocale(), { day: 'numeric', month: 'short' }).format(dateObj);

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
            return ui`<div class="hr-tl-window-row"><span class="hr-tl-name">Ventana ${escapeHtml(meta?.label || w.tier)}</span><span class="hr-tl-sub">${escapeHtml(timeLabel(w.start))} – ${escapeHtml(timeLabel(w.end))}</span></div>`;
          }).join('');
        } else {
          mainHtml = ui`<div class="hr-tl-name">Sin ventanas configuradas</div>`;
          accentRgb = '144,160,190';
        }

        const windowsMinForDay = higherRateWindowsTodayTotalMin(key);
        const pillsHtml = [
          stats.totalMin > 0
            ? ui`<span class="hr-count-pill tone-live">${iconHtml('flame')} ${escapeHtml(formatBlockDurationLabel(stats.totalMin))} en llamada · +${money(stats.totalBonus)}${financeConvertedInline(stats.totalBonus)}</span>`
            : ui`<span class="hr-count-pill tone-muted">Sin llamadas en Higher Rate</span>`,
          windowsMinForDay > 0 ? ui`<span class="hr-count-pill tone-window">${escapeHtml(formatBlockDurationLabel(windowsMinForDay))} de ventana</span>` : '',
        ].filter(Boolean).join('');

        return ui`
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
        ? ui`
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
          context.refresh();
        });
      }
    }
  draw();
}
export { openHigherRateReview, higherRateCorrectionPlan } from './higher-rate-review.js';
export { openCallRecovery, saveEditedCall, deleteRecordedCall, clearRecordedDay } from './call-recovery.js';
export { confirmActivityChange } from './work-actions.js';
export { confirmReplacement, importBackupFile, openSnapshotRecovery } from './backup-recovery.js';
export { renderImportOutcome } from './call-review-view.js';
export { renderCallTable } from './call-table-view.js';
export const detailTranslations = null;
