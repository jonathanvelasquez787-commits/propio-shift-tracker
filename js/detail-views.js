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
    [translateText('Base registrada'), amounts.registeredBase, translateText('Importadas y manuales'), ''],
    [translateText('En vivo'), amounts.liveBase, translateText('Estimación provisional'), 'is-live'],
    [translateText('Higher Rate'), amounts.bonus, translateText('Bono calculado'), 'is-bonus'],
  ];
  const html = `<p class="review-scope">${escapeHtml(scopeLabel)}</p>`
    + rows.map(([label, amount, hint, tone]) => `<div class="polished-breakdown-row"><span class="polished-dot ${tone}"></span><div><strong>${escapeHtml(label)}</strong><small>${escapeHtml(hint)}</small></div><div><strong class="polished-amount">${money(amount)}</strong><span class="polished-converted">${financeConvertedInline(amount)}</span></div></div>`).join('')
    + ui`<details class="polished-disclosure"><summary>Cómo se forma el total</summary><div class="polished-detail"><div class="review-line"><span>Registros</span><strong>${amounts.count}</strong></div><div class="review-line"><span>Estimados en vivo</span><strong>${amounts.liveCount}</strong></div><p class="note">La base registrada incluye importaciones y montos manuales. Los estimados en vivo se actualizan con el historial de Propio. Higher Rate se calcula con tus ventanas; el total no confirma un pago recibido.</p></div></details>`
    + `<p class="polished-foot">${conversion}</p>`;
  if (wrap.innerHTML !== html) wrap.innerHTML = html;
}

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

      wrap.innerHTML = heroHtml;
    }
  draw();
}
export { openHigherRateReview, higherRateCorrectionPlan } from './higher-rate-review.js';
export { openCallRecovery, saveEditedCall, deleteRecordedCall, clearRecordedDay } from './call-recovery.js';
export { confirmActivityChange } from './work-actions.js';
export { confirmReplacement, importBackupFile, openSnapshotRecovery } from './backup-recovery.js';
export { renderImportOutcome } from './call-review-view.js';
export { renderCallTable } from './call-table-view.js';
export { openCallRecords } from './call-records-view.js';
export { confirmShiftTransition, openWorkDayReview, confirmSchedulePlan } from './shift-work-review.js';
export { payReceiptAction } from './pay-receipts.js';
export { confirmFinanceAction, openFinanceDistribution } from './finance-review.js';
export { exportAccountingDocument } from './accounting-export.js';
export { renderNotificationReview } from './notification-review.js';
export { renderGameReview } from './game-review.js';
export const detailTranslations = null;
