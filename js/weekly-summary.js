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
