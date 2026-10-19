import { ui, translateText, displayLocale } from './i18n.js';

export function renderWeekSummary({ settings, weekViewOffset, weekSummaryForOffset, formatWeekRangeLabel, cycleWeekNumberForWeekStart, callDateToDate, weekdayKeyForDayKey, WEEKDAY_LABELS, dayNoteCategoryMeta, escapeHtml, money, financeConvertedNote, formatDuration, iconHtml, convertedAmountText }) {
  const wrap = document.getElementById('weekSummaryWrap');
  const subtitle = document.getElementById('weekSummarySubtitle');
  if (!wrap) return;

  const weekSummaryTipEl = document.getElementById('weekSummaryTip');
  if (weekSummaryTipEl) weekSummaryTipEl.hidden = !!settings.weekSummaryTipDismissed;

  const summary = weekSummaryForOffset(weekViewOffset);
  const rangeLabel = formatWeekRangeLabel(summary.weekStart, summary.weekEnd);
  const cycleWeekLabel = ui`Semana ${cycleWeekNumberForWeekStart(summary.weekStart)} del ciclo`;
  if (subtitle) {
    subtitle.textContent = `${weekViewOffset === 0 ? ui`Semana actual · ${rangeLabel}` : rangeLabel} · ${cycleWeekLabel}`;
  }

  const dayShortDateLabel = (dayKey) => {
    const d = callDateToDate(dayKey);
    if (!d) return '';
    return new Intl.DateTimeFormat(displayLocale(), { day: 'numeric', month: 'short' }).format(d);
  };

  const itemsHtml = summary.days.map(r => {
    const weekdayKey = weekdayKeyForDayKey(r.dayKey);
    const dayLabel = WEEKDAY_LABELS[weekdayKey];
    const noteMeta = r.note ? dayNoteCategoryMeta(r.note.category) : null;

    // Estado del día: decide el badge (texto+tono) y el ícono (nombre+tono) — SOLO según si el día
    // cuenta como laborado de verdad (Libre > Futuro > Sin datos > Trabajado).
    let badgeText, badgeTone, iconName, iconTone;
    if (r.isOff) {
      badgeText = translateText('Libre'); badgeTone = 'neutral'; iconName = 'calendar'; iconTone = 'neutral';
    } else if (r.isFuture) {
      badgeText = 'Futuro'; badgeTone = 'neutral'; iconName = 'calendar'; iconTone = 'neutral';
    } else if (!r.hasShift && !r.calls) {
      badgeText = translateText('Sin datos'); badgeTone = 'bad'; iconName = 'alertTriangle'; iconTone = 'bad';
    } else {
      badgeText = translateText('Trabajado'); badgeTone = 'good'; iconName = 'check'; iconTone = 'good';
    }
    if (r.isToday && !r.isOff) { badgeText = translateText('Hoy'); badgeTone = 'cyan'; iconTone = 'cyan'; }

    const noteBadgeTone = noteMeta ? (noteMeta.tagClass === 'good' ? 'good' : noteMeta.tagClass === 'bad' ? 'bad' : noteMeta.tagClass === 'warn' ? 'bad' : 'neutral') : '';
    const noteBadgeHtml = noteMeta ? ui` <span class="wk-row-badge tone-${noteBadgeTone}">${escapeHtml(noteMeta.label)}</span>` : '';

    const rowClasses = ['wk-row', r.isToday ? 'is-today' : '', r.isFuture ? 'is-future' : ''].filter(Boolean).join(' ');

    const adherenceText = r.adherencePct === null ? '' : ui` · Adherencia ${r.adherencePct}%`;
    const subText = r.isFuture
      ? escapeHtml(dayShortDateLabel(r.dayKey))
      : ui`${escapeHtml(dayShortDateLabel(r.dayKey))} · ${r.calls} llamada(s)${adherenceText}`;

    // Un día futuro no muestra monto ni tiempo productivo — nada real que reportar todavía, mismo
    // criterio que ya usaba.
    const rightHtml = r.isFuture ? '' : ui`
      <div class="wk-row-right">
        <div class="wk-row-amount">${money(r.earnings)}</div>
        ${financeConvertedNote(r.earnings)}
        <div class="wk-row-amount-sub">${formatDuration(r.productive * 60000)} productivo</div>
      </div>
    `;

    const editBtnHtml = ui`<button class="wk-row-edit" type="button" data-day-note-edit="${escapeHtml(r.dayKey)}" aria-label="Editar día" title="Editar día">${iconHtml('edit')}<span class="wk-row-edit-label">Editar</span></button>`;

    const noteHtml = r.note && r.note.comment
      ? ui`<div class="wk-row-note" title="${escapeHtml(r.note.comment)}"><svg class="ic-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg> ${escapeHtml(r.note.comment.length > 60 ? r.note.comment.slice(0, 60) + '…' : r.note.comment)}</div>`
      : '';

    const manualStatus = r.note?.forcedStatus ? ui` <span class="wk-row-badge tone-neutral" title="Estado elegido por vos; reemplaza el del horario">Manual</span>` : '';
    const statusBadgeHtml = ui`<button type="button" class="wk-row-badge wk-row-badge-tap tone-${badgeTone}" data-day-note-edit="${escapeHtml(r.dayKey)}" data-day-note-focus="status" title="Cambiar estado del día">${escapeHtml(badgeText)}${iconHtml('chevronDown')}</button>${manualStatus}`;
    // Dos ubicaciones del mismo enlace: en el título (escritorio) o en la línea secundaria (móvil),
    // alternadas por CSS.
    const addNoteBtn = (cls) => ui`<button type="button" class="wk-row-add-note ${cls}" data-day-note-edit="${escapeHtml(r.dayKey)}" data-day-note-focus="note">+ Nota</button>`;
    const addNoteHtml = !r.note ? addNoteBtn('wk-row-add-note-title') : '';
    const addNoteSubHtml = !r.note ? addNoteBtn('wk-row-add-note-sub') : '';
    const goChevronHtml = r.isFuture ? '' : ui`<span class="wk-row-go" aria-hidden="true">${iconHtml('chevronRight')}</span>`;

    return ui`
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
  const totalHtml = ui`
    <div class="wk-total-row">
      <div class="wk-total-label">Total semana</div>
      <div class="wk-total-metrics">
        <div class="wk-total-metric"><span class="wk-total-metric-label">Productivo</span><strong>${formatDuration(t.productive * 60000)}</strong></div>
        <div class="wk-total-metric"><span class="wk-total-metric-label">Llamadas</span><strong>${t.calls}</strong></div>
        <div class="wk-total-metric"><span class="wk-total-metric-label">Ganancias</span><strong>${money(t.earnings)}${convertedAmountText(t.earnings) ? ui` <span style="opacity:.75; font-weight:700;">(${escapeHtml(convertedAmountText(t.earnings))})</span>` : ''}</strong></div>
        <div class="wk-total-metric"><span class="wk-total-metric-label">Adherencia</span><strong>${t.avgAdherence === null ? '—' : `${t.avgAdherence}%`}</strong></div>
        <div class="wk-total-metric"><span class="wk-total-metric-label">Prom./día trabajado</span><strong>${workedDaysCount > 0 ? avgCallsPerWorkedDay.toFixed(1) : '—'}</strong></div>
      </div>
    </div>
  `;

  wrap.innerHTML = ui`<div class="wk-list">${itemsHtml}</div>${totalHtml}`;
}

export function renderPayDatesSection({ todayRange, cycleBoundsForOffset, formatCallDayLabel, todayCallDateKey, escapeHtml, iconHtml }) {
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
    const raw = new Intl.DateTimeFormat(displayLocale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  };
  const fmtShort = (d) => new Intl.DateTimeFormat(displayLocale(), { day: 'numeric', month: 'long' }).format(d);

  const nextCardHtml = ui`
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
      ? ui`<span class="wk-row-badge tone-cyan">Actual — día ${dayOfCycle} de 14</span>`
      : '';
    const iconTone = c.isPaid ? 'tone-good' : isNextPayment ? 'tone-cyan' : 'tone-neutral';
    const rowDaysUntilPay = Math.round((todayRange(c.payDate) - today) / 86400000);
    const statusText = c.isPaid ? translateText('Pagado') : isNextPayment ? ui`En ${Math.max(0, rowDaysUntilPay)} días` : translateText('Próximo');
    const rowClass = isToday ? 'wk-row is-today' : 'wk-row';
    const subText = isToday ? ui`Hoy, ${fmtShort(today)}` : translateText('14 días');
    return ui`
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

  body.innerHTML = ui`${nextCardHtml}<div class="wk-list">${rowsHtml}</div>`;
}
