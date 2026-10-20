import { callRecordSource, matchesCallReview } from './call-review-model.js';

export function renderCallTable(context) {
  const { ui, translateText, translateMarkup, getActiveDayKey, formatCallDayLabel, callsForDay, dayActionRows, tableFilterMode,
    higherRateBonusForCall, higherRateTierBadgeHtml, iconHtml, escapeHtml, parseMoney, money, financeConvertedNote,
    timeLabelFromDate, formatMinutes } = context;
      const wrap = document.getElementById('callTableWrap');
      const dayKey = getActiveDayKey();
      const clearDayCallsDayLabel = document.getElementById('clearDayCallsDayLabel');
      if (clearDayCallsDayLabel) clearDayCallsDayLabel.textContent = formatCallDayLabel(dayKey);

      const sortedCalls = [...callsForDay(dayKey)].sort((a, b) => new Date(a.startISO) - new Date(b.startISO));
      const search = document.getElementById('callSearchInput')?.value?.trim() || '';
      const source = document.getElementById('callSourceFilter')?.value || 'all';
      const count = document.getElementById('callReviewCounts');
      if (count) count.textContent = ui`Día activo: ${sortedCalls.length} llamada(s) · Coinciden con tu búsqueda: ${sortedCalls.filter(call => matchesCallReview(call, search, source)).length}`;
      const actionRows = dayActionRows(dayKey);

      // Entradas combinadas — cada una con un `ts` común para poder ordenar todo junto
      // cronológicamente, sin importar si es llamada o acción. `kind` decide qué plantilla de fila
      // usar más abajo.
      const entries = [];
      sortedCalls.forEach(c => entries.push({ kind: 'call', ts: c.startISO, call: c }));
      actionRows.forEach(a => entries.push({ kind: 'action', ts: a.ts, action: a }));

      if (!entries.length) {
        wrap.innerHTML = translateMarkup('<div class="note" style="padding:14px;">No hay filas para el día activo. La vista se alimenta de las llamadas importadas, tus acciones del turno (Shift/Break/Lunch/ACW) y del día seleccionado.</div>');
        return;
      }

      // Filtro Todo/Llamadas/Acciones (ver #tableFilterRow en el HTML) sobre la tabla fusionada.
      const filtered = entries.filter(e => {
        if (e.kind === 'call' && !matchesCallReview(e.call, search, source)) return false;
        if (e.kind === 'action' && (search || source !== 'all')) return false;
        if (tableFilterMode === 'calls') return e.kind === 'call';
        if (tableFilterMode === 'actions') return e.kind === 'action';
        return true;
      });

      if (!filtered.length) {
        wrap.innerHTML = translateMarkup('<div class="note" style="padding:14px;">No hay filas de este tipo para el día activo — cambia el filtro de arriba para ver el resto.</div>');
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
          const billableText = String(c.billable).toLowerCase() === 'yes' ? translateText('Billable') : translateText('No billable');
          const droppedText = String(c.dropped).toLowerCase() === 'yes' ? translateText('Dropped') : translateText('No dropped');
          const higherRateBonus = higherRateBonusForCall(c);
          const higherRateBadge = higherRateBonus ? higherRateTierBadgeHtml(higherRateBonus.tier, higherRateBonus.amount) : '';
          const sourceLabel = { estimated: c.propioBridge ? translateText('Estimado · extensión') : translateText('Medido · tool; pago estimado'),
            official: translateText('Oficial · importado'), 'official-correction': translateText('Oficial corregida'),
            'manual-correction': translateText('Corregida por vos'), manual: translateText('Manual'), unknown: translateText('Origen sin confirmar') }[callRecordSource(c)];

          return ui`
            <div class="tbl-row">
              <span class="tbl-row-icon type-call">${iconHtml('phone')}</span>
              <div class="tbl-row-main">
                <div class="tbl-row-title">#${escapeHtml(c.customerId)} <span class="tbl-type-badge type-call">Llamada</span></div>
                <div class="tbl-row-sub">${escapeHtml(billableText)} · ${escapeHtml(droppedText)} · ${escapeHtml(sourceLabel)}</div>
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
          ? ui`<button class="tbl-icon-btn" type="button" data-gap-edit="${escapeHtml(a.gapKey)}" data-gap-day="${escapeHtml(dayKey)}" aria-label="Editar hueco">${iconHtml('edit')}</button>`
          : '';
        const iconName = ROW_TYPE_ICON[a.badgeClass] || 'circle';
        const iconMarkup = a.badgeClass === 'type-shift' ? iconHtml(iconName, 'ic-fill') : iconHtml(iconName);

        return ui`
          <div class="tbl-row">
            <span class="tbl-row-icon ${a.badgeClass}">${iconMarkup}</span>
            <div class="tbl-row-main">
              <div class="tbl-row-title">${escapeHtml(a.detail)} <span class="tbl-type-badge ${a.badgeClass}">${escapeHtml(a.badgeLabel)}</span></div>
              ${a.note ? ui`<div class="tbl-row-sub">${escapeHtml(a.note)}</div>` : ''}
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
