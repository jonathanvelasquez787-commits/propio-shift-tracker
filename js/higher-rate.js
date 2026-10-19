import { ui, translateText, translateMarkup, displayLocale } from './i18n.js';
// app-main.js injects Higher Rate helpers; app-context.js owns shared app state.
import { calls, settings } from './app-context.js';

let HIGHER_RATE_EARLY_GRACE_MIN, HIGHER_RATE_TIERS, appConfirm, callDateKeyFromValue, callDateToDate;
let callsForDay, dayKeyFromIsoDate, escapeHtml, financeConvertedInline, financeRunAutoFillCascade, formatBlockDurationLabel;
let formatCallDayLabel, formatHHMM, formatMinutes, iconHtml, isoDateFromDayKey, makeLocalId;
let mergeIntervals, minutesToHHMM, money, onGameCallsChanged, render, saveAll, timeLabel, toDateFromInputs, toMinutes;
let toast, todayCallDateKey, todayRange, canPersistLocalChanges, convertedAmountText;

export function configureHigherRateContext(context) {
  ({ HIGHER_RATE_EARLY_GRACE_MIN, HIGHER_RATE_TIERS, appConfirm, callDateKeyFromValue, callDateToDate,
    callsForDay, dayKeyFromIsoDate, escapeHtml, financeConvertedInline, financeRunAutoFillCascade, formatBlockDurationLabel,
    formatCallDayLabel, formatHHMM, formatMinutes, iconHtml, isoDateFromDayKey, makeLocalId,
    mergeIntervals, minutesToHHMM, money, onGameCallsChanged, render, saveAll, timeLabel, toDateFromInputs, toMinutes, toast,
    todayCallDateKey, todayRange, canPersistLocalChanges, convertedAmountText } = context);
}

    function higherRateWindowBounds(window) {
      const start = toDateFromInputs(window.date, timeLabel(window.start));
      let end = toDateFromInputs(window.date, timeLabel(window.end));
      if (!start || !end) return null;
      // Fin <= Inicio significa que la oportunidad termina al día siguiente (ej. 10 PM–2 AM).
      // Fin === Inicio se interpreta como ventana inválida de duración cero, no como 24 horas.
      const startMin = toMinutes(formatHHMM(window.start));
      const endMin = toMinutes(formatHHMM(window.end));
      if (endMin === startMin) return null;
      if (end.getTime() < start.getTime()) {
        end = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1, end.getHours(), end.getMinutes(), end.getSeconds(), end.getMilliseconds());
      }
      return { start, end };
    }

    function callQualifiesForHigherRateWindow(callStartISO, window) {
      const callStart = new Date(callStartISO);
      const bounds = higherRateWindowBounds(window);
      if (!bounds || Number.isNaN(callStart.getTime())) return false;
      const graceStart = new Date(bounds.start.getTime() - HIGHER_RATE_EARLY_GRACE_MIN * 60000);
      return callStart.getTime() >= graceStart.getTime() && callStart.getTime() < bounds.end.getTime();
    }

    // Bono de UNA llamada, null si no califica. Solo se comparan ventanas de la MISMA fecha; si
    // califica más de una, gana la de mayor bono por minuto.
    export function higherRateBonusForCall(call) {
      // Bono ya congelado (ver freezeHigherRateBonusesForWindowIds): la ventana que lo generó ya no
      // existe, pero el nivel que calificó se conserva.
      if (call.frozenHigherRateBonus) {
        const frozenTierMeta = HIGHER_RATE_TIERS[call.frozenHigherRateBonus.tier];
        if (!frozenTierMeta) {
          const raw = call.frozenHigherRateBonus.amount;
          if (!['number','string'].includes(typeof raw) || (typeof raw === 'string' && !/^\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(raw.trim()))) return null;
          const amount = Number(raw);
          return Number.isFinite(amount) && amount >= 0 ? {...call.frozenHigherRateBonus, amount} : null;
        }
        if (!['number','string'].includes(typeof call.durationMin)) return null;
        const duration = Number(call.durationMin);
        if (!Number.isFinite(duration) || duration < 0) return null;
        return {
          amount: frozenTierMeta.bonusPerMin * duration,
          tier: call.frozenHigherRateBonus.tier,
          windowId: call.frozenHigherRateBonus.windowId,
        };
      }
      const windows = settings.higherRateWindows || [];
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

    function higherRateGameBonusSnapshot() {
      const snapshot = new Map();
      calls.forEach(call => {
        const bonus = higherRateBonusForCall(call);
        snapshot.set(String(call.id || ''), {
          amount: Number(bonus?.amount) || 0,
          tier: String(bonus?.tier || ''),
          dayKey: callDateKeyFromValue(call.callDate),
        });
      });
      return snapshot;
    }

    function reconcileHigherRateGameChanges(beforeSnapshot) {
      const affectedDays = new Set();
      calls.forEach(call => {
        const previous = beforeSnapshot.get(String(call.id || '')) || { amount: 0, tier: '', dayKey: '' };
        const bonus = higherRateBonusForCall(call);
        const currentAmount = Number(bonus?.amount) || 0;
        const currentTier = String(bonus?.tier || '');
        if (Math.abs(currentAmount - previous.amount) <= 0.0001 && currentTier === previous.tier) return;
        if (previous.dayKey) affectedDays.add(previous.dayKey);
        const currentDayKey = callDateKeyFromValue(call.callDate);
        if (currentDayKey) affectedDays.add(currentDayKey);
      });
      affectedDays.forEach(dayKey => onGameCallsChanged(dayKey));
      return affectedDays;
    }

    // Desglose por nivel: un día puede tener llamadas de más de un nivel a la vez.
    export function higherRateBonusBreakdownForCalls(sourceCalls) {
      const breakdown = {};
      sourceCalls.forEach(c => {
        const bonus = higherRateBonusForCall(c);
        if (!bonus) return;
        breakdown[bonus.tier] = (breakdown[bonus.tier] || 0) + bonus.amount;
      });
      return breakdown;
    }

    // Badge de UNA llamada (Tabla de llamadas, columna Pay / tarjeta mobile)
    export function higherRateTierBadgeHtml(tier, amount) {
      const meta = HIGHER_RATE_TIERS[tier];
      const colorVar = meta?.colorVar || '--warn';
      const rgb = meta?.colorRgb || '255,209,92';
      const label = meta?.label || tier;
      return ui`<span class="imported-late" style="background: rgba(${rgb},.16); border-color: rgba(${rgb},.4); color: var(${colorVar});" title="Higher Rate Opportunity · ${escapeHtml(label)}">${iconHtml('flame')} ${escapeHtml(label)} +${money(amount)}${financeConvertedInline(amount)}</span>`;
    }

    // Versión compacta sin pill (solo texto coloreado) — para la línea de pago de la tarjeta
    // mobile, donde ya no cabe un badge completo al lado del monto principal.
    export function higherRateTierInlineHtml(tier, amount) {
      const meta = HIGHER_RATE_TIERS[tier];
      const colorVar = meta?.colorVar || '--warn';
      const label = meta?.label || tier;
      return ui`<span style="color: var(${colorVar}); font-size:11px; font-weight:800;">${iconHtml('flame')} ${escapeHtml(label)} +${money(amount)}${financeConvertedInline(amount)}</span>`;
    }

    // Fila de tags agregados (uno por cada nivel presente ese día, ordenados de mayor a menor
    // bono/min)
    export function higherRateBreakdownTagsHtml(breakdown, tagClass) {
      const entries = Object.entries(breakdown || {}).filter(([, amt]) => amt > 0);
      if (!entries.length) return '';
      entries.sort((a, b) => (HIGHER_RATE_TIERS[b[0]]?.bonusPerMin || 0) - (HIGHER_RATE_TIERS[a[0]]?.bonusPerMin || 0));
      return entries.map(([tier, amount]) => {
        const meta = HIGHER_RATE_TIERS[tier];
        const colorVar = meta?.colorVar || '--warn';
        const rgb = meta?.colorRgb || '255,209,92';
        const label = meta?.label || tier;
        return ui`<span class="${tagClass}" style="background: rgba(${rgb},.16); border-color: rgba(${rgb},.4); color: var(${colorVar});" title="Bono extra ganado por llamadas dentro de una ventana Higher Rate ${escapeHtml(label)}">${iconHtml('flame')} ${escapeHtml(label)}: +${money(amount)}${financeConvertedInline(amount)}</span>`;
      }).join('');
    }

    // Rediseño 100% visual de "Ganancias de hoy"/ "Ganancias del ciclo"
    export function higherRateBonusChipsHtml(breakdown) {
      const entries = Object.entries(breakdown || {}).filter(([, amt]) => amt > 0);
      if (!entries.length) return '';
      entries.sort((a, b) => (HIGHER_RATE_TIERS[b[0]]?.bonusPerMin || 0) - (HIGHER_RATE_TIERS[a[0]]?.bonusPerMin || 0));
      return entries.map(([tier, amount]) => {
        const meta = HIGHER_RATE_TIERS[tier];
        const colorVar = meta?.colorVar || '--warn';
        const rgb = meta?.colorRgb || '255,209,92';
        const label = meta?.label || tier;
        return ui`<div class="gh-bonus-chip" style="background: rgba(${rgb},.14); border-color: rgba(${rgb},.4); color: var(${colorVar});">${iconHtml('flame')} <span>${escapeHtml(label)}: +${money(amount)}${financeConvertedInline(amount)} de bono Higher Rate</span></div>`;
      }).join('');
    }
    // Pedido del usuario: Higher Rate Opportunity vive ahora en su propio botón/modal (antes escondido dentro de Horario) — se sincroniza al abrir ese modal, no al abrir Horario.
    export function syncHigherRateModalFields() {
      renderHigherRateWindowsEditor(settings.higherRateWindows || []);
    }
    // Editor de ventanas de Higher Rate Opportunity (pedido del usuario) ---- Mismo patrón que el editor de bloques (Trabajo/Break/ Lunch, ver renderBlocksEditor): filas dinámicas con Fecha + Inicio + Fin + Nivel, agregar/eliminar libremente.
    export function hrWindowWeekdayLabel(dayKeyStr) {
      const d = callDateToDate(dayKeyStr);
      if (!d) return '—';
      const raw = new Intl.DateTimeFormat(displayLocale(), { weekday: 'long' }).format(d);
      return raw.charAt(0).toUpperCase() + raw.slice(1);
    }
    // Texto de cada botón del pill de nivel — el activo muestra su bono ("Gold +$0.03"), los otros solo el nombre.
    export function hrTierButtonLabel(tierKey, active) {
      const meta = HIGHER_RATE_TIERS[tierKey];
      return active ? `${meta.label} +${money(meta.bonusPerMin)}` : meta.label;
    }

    // BUG-016 (QA ) — Pedido del usuario: el `.hr-window-date-input` que arma esta función llevaba min/max agregados (ver el atributo en el template de abajo) para no aceptar años absurdos (0999/9999) sin ninguna validación
    function renderHigherRateWindowRow(w) {
      const tier = HIGHER_RATE_TIERS[w.tier] ? w.tier : 'bronze';
      const tierButtonsHtml = ['bronze', 'silver', 'gold'].map(t => {
        const active = t === tier;
        return ui`<button type="button" class="hr-window-tier-btn" data-hr-tier-btn data-tier="${t}" aria-pressed="${active ? 'true' : 'false'}">${escapeHtml(hrTierButtonLabel(t, active))}</button>`;
      }).join('');
      return ui`
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
        .map(higherRateWindowBounds)
        .filter(Boolean);
      return mergeIntervals(intervals).reduce((sum, iv) => sum + (iv.end.getTime() - iv.start.getTime()) / 60000, 0);
    }

    // Estado EN VIVO de Higher Rate ---- ¿Estás dentro de una ventana AHORA MISMO, o cuándo es la
    // próxima que viene? Reutiliza la misma regla de elegibilidad que ya usa
    // callQualifiesForHigherRateWindow (la gracia de 5 min antes de que empiece), pero comparando
    // contra el reloj en vez de contra el inicio de una llamada.
    function isNowWithinHigherRateWindow(now, w) {
      const bounds = higherRateWindowBounds(w);
      if (!bounds) return false;
      const graceStart = new Date(bounds.start.getTime() - HIGHER_RATE_EARLY_GRACE_MIN * 60000);
      return now.getTime() >= graceStart.getTime() && now.getTime() < bounds.end.getTime();
    }

    // Devuelve { active: true, window, minutesLeft } si hay una ventana vigente ahora mismo (la de
    // mayor bono, si hay varias traslapadas — mismo criterio que higherRateBonusForCall), o {
    // active: false, window, startsAt } con la próxima ventana futura más cercana (cualquier fecha,
    // no solo hoy).
    export function higherRateLiveStatus() {
      const now = new Date();
      const windows = settings.higherRateWindows || [];
      const activeNow = windows.filter(w => isNowWithinHigherRateWindow(now, w));
      if (activeNow.length) {
        const best = activeNow.reduce((a, b) =>
          (HIGHER_RATE_TIERS[b.tier]?.bonusPerMin || 0) > (HIGHER_RATE_TIERS[a.tier]?.bonusPerMin || 0) ? b : a
        );
        const bounds = higherRateWindowBounds(best);
        const minutesLeft = bounds ? Math.max(0, Math.round((bounds.end.getTime() - now.getTime()) / 60000)) : null;
        return { active: true, window: best, minutesLeft };
      }
      const upcoming = windows
        .map(w => ({ w, bounds: higherRateWindowBounds(w) }))
        .filter(x => x.bounds)
        .map(x => ({ ...x, start: x.bounds.start, end: x.bounds.end, graceStart: new Date(x.bounds.start.getTime() - HIGHER_RATE_EARLY_GRACE_MIN * 60000) }))
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
        title.textContent = ui`Estás en una ventana ${tierLabel} ahora`;
        sub.textContent = status.minutesLeft !== null
          ? ui`Termina en ${formatMinutes(status.minutesLeft)} min (${timeLabel(status.window.end)})`
          : ui`Termina a las ${timeLabel(status.window.end)}`;
      } else {
        const isToday = status.window.date === todayCallDateKey();
        const dayLabelRaw = isToday ? translateText('Hoy') : formatCallDayLabel(status.window.date);
        const dayLabel = dayLabelRaw.charAt(0).toUpperCase() + dayLabelRaw.slice(1);
        const datetimeText = `${dayLabel} · ${timeLabel(status.window.start)}`;
        const chipRgb = tierMeta?.colorRgb || '255,209,92';
        const chipColorVar = tierMeta?.colorVar || '--warn';
        title.innerHTML = ui`<div class="hr-live-eyebrow">Próxima ventana</div><div class="hr-live-main-row"><span class="hr-live-datetime">${escapeHtml(datetimeText)}</span><span class="hr-live-tier-chip" style="background: rgba(${chipRgb}, .16); border: 1px solid rgba(${chipRgb}, .4); color: var(${chipColorVar});">${escapeHtml(tierLabel)}</span></div>`;
        sub.textContent = ui`Termina a las ${timeLabel(status.window.end)}`;
      }
    }

    export function renderHigherRateLiveCard() {
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
      return ui`<span class="hero-today-tier" style="background: rgba(${meta.colorRgb}, .16); border: 1px solid rgba(${meta.colorRgb}, .4); color: var(${meta.colorVar});">${iconHtml('medal')} ${escapeHtml(meta.label)} +${money(meta.bonusPerMin)}/min</span>`;
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
          renderHigherRateDayStats();
        });
      }
    }

    // Una ventana es "pasada" cuando su hora de fin ya quedó atrás, no solo si su fecha es anterior
    // a hoy.
    function higherRateWindowIsPast(w, now = new Date()) {
      const bounds = higherRateWindowBounds(w);
      return !!(bounds && bounds.end.getTime() <= now.getTime());
    }

    // Mientras #higherRateModal esté abierto, revisa cada segundo si alguna ventana acaba de cruzar
    // a "pasada" y repinta las listas sola en ese caso — sin esto, una ventana solo se movía al
    // Historial al reabrir el modal.
    let higherRateLastPastCount = null;
    export function refreshHigherRateWindowsIfNeeded() {
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
        || translateMarkup('<div class="note" style="margin:0;">Sin ventanas de Higher Rate para hoy ni futuras — usa "+ Agregar ventana" cuando te llegue el aviso de Propio.</div>');

      historyList.innerHTML = sortedPast.map(renderHigherRateWindowRow).join('')
        || translateMarkup('<div class="note" style="margin:0;">Sin ventanas pasadas todavía.</div>');
      if (historyTitle) historyTitle.innerHTML = ui`${iconHtml('history')} Historial (${sortedPast.length} ${sortedPast.length === 1 ? translateText('pasada') : translateText('pasadas')})`;
      if (activeCountPill) activeCountPill.textContent = `${sortedActive.length} ${sortedActive.length === 1 ? translateText('próxima') : translateText('próximas')}`;
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

    function higherRateMutationSnapshot() {
      return {
        windows: settings.higherRateWindows,
        categories: settings.financeCategories === undefined ? undefined : JSON.parse(JSON.stringify(settings.financeCategories)),
        bonuses: calls.map(call => [call, call.frozenHigherRateBonus]),
      };
    }

    function restoreHigherRateMutation(snapshot) {
      if (snapshot.windows === undefined) delete settings.higherRateWindows;
      else settings.higherRateWindows = snapshot.windows;
      if (snapshot.categories === undefined) delete settings.financeCategories;
      else settings.financeCategories = snapshot.categories;
      snapshot.bonuses.forEach(([call, bonus]) => {
        if (bonus === undefined) delete call.frozenHigherRateBonus;
        else call.frozenHigherRateBonus = bonus;
      });
    }

    // Persiste lo que hay ahora mismo en el editor — llamada en cada cambio de campo (auto-
    // guardado, mismo patrón que el resto de settings sueltos de Horario) y al eliminar una fila.
    export function saveHigherRateWindowsFromEditor() {
      const gameBefore = higherRateGameBonusSnapshot();
      const previous = higherRateMutationSnapshot();
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
      // Si el bono cambia, también puede bajar el dinero real disponible en Finanzas.
      financeRunAutoFillCascade();
      // SaveAll en vez de saveSettingsOnly: freezeHigherRateBonusesForWindowIds puede haber marcado
      // `calls` con `frozenHigherRateBonus` nuevo.
      if (saveAll({ render: false }) === false) {
        restoreHigherRateMutation(previous);
        render();
        renderHigherRateDayStats();
        return false;
      }
      reconcileHigherRateGameChanges(gameBefore);
      render();
      renderHigherRateLiveCard();
      // Editar una ventana ya existente (ej. su hora de fin) no refrescaba "Próximos días" — ese
      // bloque se quedaba mostrando el horario viejo hasta reabrir el modal, porque nada aquí
      // volvía a llamar a renderHigherRateDayStats.
      renderHigherRateDayStats();
      notifyHigherRateRetroactiveMatches(changedIds);
      notifyHigherRateMidnightCrossingWindows();
      return true;
    }

    // Las ventanas pueden cruzar medianoche. La única combinación inválida es Inicio === Fin,
    // porque sería una ventana de duración cero y no una oportunidad de 24 horas.
    function notifyHigherRateMidnightCrossingWindows() {
      const windows = settings.higherRateWindows || [];
      const invalid = windows.filter(w => toMinutes(formatHHMM(w.end)) === toMinutes(formatHHMM(w.start)));
      if (!invalid.length) return;
      const first = invalid[0];
      const extra = invalid.length > 1 ? ui` (y ${invalid.length - 1} más)` : '';
      toast(ui`⚠️ La ventana de Higher Rate del ${formatCallDayLabel(first.date)} tiene la misma hora de inicio y fin${extra}. Ajusta una de las dos horas.`);
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
        const plural = qualifyingCount === 1 ? translateText('llamada ya tomada califica') : translateText('llamadas ya tomadas califican');
        toast(ui`🔥 ${qualifyingCount} ${plural} para el bono — revisa Tabla de llamadas del ${formatCallDayLabel(sampleDate)} para verlo.`);
      }
    }

    // "agrego una ventana y luego no la encuentro".
    export function addHigherRateWindowRow() {
      const current = readHigherRateWindowsFromEditor();
      const todayKey = todayCallDateKey();
      const now = new Date();
      const startMin = now.getHours() * 60 + now.getMinutes();
      // Una ventana nueva empieza "ahora" y dura una hora por default. Si son las 11:50 PM,
      // termina 12:50 AM del día siguiente: higherRateWindowBounds ya soporta ese cruce.
      const endMin = (startMin + 60) % 1440;
      const newWindow = { id: makeLocalId(), date: todayKey, start: minutesToHHMM(startMin), end: minutesToHHMM(endMin), tier: 'bronze' };
      current.push(newWindow);
      renderHigherRateWindowsEditor(current);
      saveHigherRateWindowsFromEditor();
      const newCard = document.querySelector(`.hr-window-card[data-hr-window-id="${newWindow.id}"]`);
      if (newCard && newCard.scrollIntoView) newCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    export function removeHigherRateWindowRowAt(id) {
      const gameBefore = higherRateGameBonusSnapshot();
      const previous = higherRateMutationSnapshot();
      // Borrar UNA ventana (individual, con "✕") le quitaba retroactivamente el bono ya calculado a
      // cualquier llamada real que ya calificaba para ella.
      freezeHigherRateBonusesForWindowIds([id]);
      const current = readHigherRateWindowsFromEditor().filter(w => w.id !== id);
      // El editor vuelve a calcular "Próximos días"/Historial usando settings.higherRateWindows.
      // Si se renderiza ANTES de asignar `current`, esos resúmenes muestran por un instante (o
      // hasta reabrir el modal) la ventana que acabas de borrar.
      settings.higherRateWindows = current;
      financeRunAutoFillCascade();
      // SaveAll en vez de saveSettingsOnly: ahora también hay que persistir `calls` (algunas pueden
      // haber quedado con frozenHigherRateBonus nuevo).
      if (saveAll({ render: false }) === false) {
        restoreHigherRateMutation(previous);
        render();
        renderHigherRateWindowsEditor(settings.higherRateWindows || []);
        renderHigherRateLiveCard();
        return false;
      }
      reconcileHigherRateGameChanges(gameBefore);
      render();
      renderHigherRateWindowsEditor(current);
      renderHigherRateLiveCard();
      return true;
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
    export function purgePastHigherRateWindows() {
      if (!canPersistLocalChanges()) return false;
      const owner = settings;
      const current = settings.higherRateWindows || [];
      const pastWindows = current.filter(w => higherRateWindowIsPast(w));
      if (!pastWindows.length) {
        toast(translateText('El historial ya está vacío — no hay ventanas de Higher Rate que ya hayan terminado.'));
        return false;
      }
      const pastIds = pastWindows.map(w => w.id);
      const earned = calls.map(higherRateBonusForCall).filter(b => b && pastIds.includes(b.windowId));
      const total = earned.reduce((sum, b) => sum + b.amount, 0);
      const revision = JSON.stringify([settings, calls]);
      let settled = false;
      appConfirm(ui`¿Limpiar el historial? Ventanas pasadas: ${pastWindows.length}. Llamadas con bono: ${earned.length} (${money(total)} ${convertedAmountText(total)}). Se conservan tus llamadas y ganancias; solo se limpia esta lista.`, () => {
        if (settled) return false;
        settled = true;
        if (!canPersistLocalChanges()) return false;
        if (settings !== owner || revision !== JSON.stringify([settings, calls])) {
          toast(translateText('Tus datos cambiaron. Revisá de nuevo la limpieza del historial.'));
          return false;
        }
        const previous = higherRateMutationSnapshot();
        freezeHigherRateBonusesForWindowIds(pastIds);
        const remaining = current.filter(w => !pastIds.includes(w.id));
        settings.higherRateWindows = remaining;
        // El archivo no cambia importes: no reasigna Finanzas ni emite recompensas.
        if (saveAll({ render: false }) === false) {
          restoreHigherRateMutation(previous);
          render();
          return false;
        }
        render();
        renderHigherRateWindowsEditor(remaining);
        toast(translateText('Historial de ventanas limpio. Tus llamadas y bonos se conservaron.'));
        return true;
      });
    }
