export function higherRateWindowReview(sourceCalls, window, context) {
  const bounds = context.bounds(window);
  if (!bounds) return null;
  const grace = new Date(bounds.start.getTime() - context.HIGHER_RATE_EARLY_GRACE_MIN * 60000);
  const first = new Date(grace.getFullYear(), grace.getMonth(), grace.getDate()).getTime();
  const last = new Date(bounds.end.getFullYear(), bounds.end.getMonth(), bounds.end.getDate() + 1).getTime();
  const rows = [], excluded = [];
  let eligibleCount = 0, appliedTotal = 0;
  for (const call of sourceCalls) {
    const start = new Date(call.startISO).getTime();
    const eligible = context.qualifies(call.startISO, window);
    const bonus = context.higherRateBonusForCall(call);
    const applied = bonus?.windowId === window.id;
    if (eligible) eligibleCount++;
    if (applied) appliedTotal += Number(bonus.amount) || 0;
    if (!eligible && !applied && !(start >= first && start < last)) continue;
    const reason = applied && call.frozenHigherRateBonus ? 'preserved'
      : eligible && !applied ? (call.frozenHigherRateBonus ? 'preserved-other' : 'other')
      : eligible ? (start < bounds.start.getTime() ? 'grace' : 'eligible')
      : start < grace.getTime() ? 'before' : 'after';
    const row = { call, eligible, applied, amount: Number(bonus?.amount) || 0, tier: bonus?.tier || '', reason };
    (eligible || applied ? rows : excluded).push(row);
  }
  const chronological = (a, b) => new Date(a.call.startISO) - new Date(b.call.startISO);
  return { bounds, grace, rows: rows.sort(chronological), excluded: excluded.sort(chronological), eligibleCount, appliedTotal };
}

export function higherRateCorrectionPlan(sourceCalls, windows, windowId, draft, context) {
  const matches = windows.filter(w => w.id === windowId);
  if (matches.length !== 1) return null;
  const original = matches[0];
  let replacement = null;
  if (draft !== null) {
    if (!draft || !context.HIGHER_RATE_TIERS[draft.tier] || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(draft.start)
      || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(draft.end) || draft.start === draft.end) return null;
    const iso = context.isoDateFromDayKey(draft.date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
    const [year, month, day] = iso.split('-').map(Number), date = new Date(year, month - 1, day);
    if (year < 1970 || year > 2099 || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    replacement = { ...original, date: draft.date, start: draft.start, end: draft.end, tier: draft.tier };
    if (!context.bounds(replacement)) return null;
  }
  const next = windows.flatMap(w => w.id === windowId ? (replacement ? [replacement] : []) : [w]);
  const rows = [];
  let beforeTotal = 0, afterTotal = 0;
  for (const call of sourceCalls) {
    const before = context.higherRateBonusForCall(call, windows);
    const releasing = call.frozenHigherRateBonus?.windowId === windowId;
    const preserved = context.preserve && before?.windowId === windowId;
    const after = preserved ? before : context.higherRateBonusForCall(releasing && !context.preserve ? { ...call, frozenHigherRateBonus: undefined } : call, next);
    const beforeAmount = Number(before?.amount) || 0, afterAmount = Number(after?.amount) || 0;
    if (![beforeAmount, afterAmount].every(n => Number.isFinite(n) && n >= 0)) return null;
    beforeTotal += beforeAmount; afterTotal += afterAmount;
    if (releasing || Math.abs(beforeAmount - afterAmount) > .0000001 || before?.tier !== after?.tier || before?.windowId !== after?.windowId) {
      rows.push({ call, before: beforeAmount, after: afterAmount });
    }
  }
  return { windows: next, rows, beforeTotal, afterTotal,
    beforeAffected: rows.reduce((n, r) => n + r.before, 0), afterAffected: rows.reduce((n, r) => n + r.after, 0),
    hasChanges: rows.length > 0 || !replacement || ['date', 'start', 'end', 'tier'].some(k => original[k] !== replacement[k]) };
}

export function openHigherRateReview(context, windowId) {
  const { ui, translateText, escapeHtml, money, financeConvertedInline, displayLocale } = context;
  const body = document.getElementById('higherRateReviewBody');
  const owner = context.data().owner;
  const amount = value => `${money(value)}${financeConvertedInline(value)}`;
  const dateTime = value => new Date(value).toLocaleString(displayLocale(), { dateStyle: 'short', timeStyle: 'medium' });
  const reasons = {
    eligible: translateText('Dentro del horario'), grace: translateText('Gracia inicial'),
    preserved: translateText('Bono conservado'), 'preserved-other': translateText('Bono conservado de otra ventana'),
    other: translateText('Se aplica el mayor bono de otra ventana'),
    before: translateText('Antes del horario y de la gracia'), after: translateText('En el fin o después de la ventana'),
  };
  function draw() {
    const data = context.data();
    const window = data.owner === owner && data.windows.find(w => w.id === windowId);
    const result = window && higherRateWindowReview(data.calls, window, context);
    if (!result) { body.textContent = translateText('La ventana cambió o ya no está disponible. Volvé a abrir Higher Rate.'); return; }
    const row = item => ui`<div class="fin-preview-row"><div class="fin-preview-main"><strong>#${escapeHtml(item.call.customerId || item.call.id)}</strong><div class="fin-preview-sub">${escapeHtml(dateTime(item.call.startISO))} · ${escapeHtml(String(item.call.durationMin))} min</div><div class="fin-preview-sub">${escapeHtml(reasons[item.reason])}</div></div><div class="fin-preview-right"><strong>${amount(item.amount)}</strong><div class="fin-preview-sub">${escapeHtml(context.HIGHER_RATE_TIERS[item.tier]?.label || item.tier)}</div></div></div>`;
    body.innerHTML = ui`<p class="review-scope">${escapeHtml(dateTime(result.bounds.start))} – ${escapeHtml(dateTime(result.bounds.end))}</p>
      <div class="polished-hero"><span class="polished-tag is-good">${escapeHtml(context.HIGHER_RATE_TIERS[window.tier]?.label||window.tier)}</span><p class="polished-eyebrow">Bono atribuido a esta ventana</p><strong class="polished-amount">${amount(result.appliedTotal)}</strong><div class="polished-days"><span>Califican por horario: ${result.eligibleCount}</span><span>Fuera de esta ventana: ${result.excluded.length}</span></div></div>
      <details class="polished-disclosure"><summary>Cómo califica una llamada</summary><div class="polished-detail"><div class="review-line"><span>Gracia antes del inicio</span><strong>${context.HIGHER_RATE_EARLY_GRACE_MIN} min</strong></div><div class="review-line"><span>Desde</span><strong>${escapeHtml(dateTime(result.grace))}</strong></div><p class="note">El fin no se incluye. Cuenta la duración completa; en ventanas superpuestas gana el mayor bono.</p></div></details>
      <details class="polished-disclosure"><summary>Califican o conservan un bono de esta ventana (${result.rows.length})</summary><div class="polished-detail">${result.rows.map(row).join('') || ui`<p class="note">Todavía no hay llamadas registradas que califiquen.</p>`}</div></details>
      <details class="polished-disclosure"><summary>Fuera de esta ventana (${result.excluded.length})</summary><div class="polished-detail">${result.excluded.map(row).join('')}</div></details>
      <div class="modal-actions mc-action-row"><button type="button" class="gap-edit-btn" data-hr-refresh>Volver a revisar</button><button type="button" class="gap-edit-btn" data-hr-correct>Editar promoción</button></div>
      <div data-hr-editor hidden>
        <label class="goals-field">Efecto del cambio<select data-hr-mode><option value="preserve">Conservar bonos ya ganados</option><option value="recalculate">Corregir y recalcular bonos afectados</option></select></label>
        <div class="goals-field-row">
          <label class="goals-field">Fecha<input data-hr-field="date" type="date" min="1970-01-01" max="2099-12-31" value="${escapeHtml(context.isoDateFromDayKey(window.date))}"></label>
          <label class="goals-field">Nivel<select class="alert-select" data-hr-field="tier">${Object.entries(context.HIGHER_RATE_TIERS).map(([key, meta]) => `<option value="${escapeHtml(key)}" ${key === window.tier ? 'selected' : ''}>${escapeHtml(translateText(meta.label || key))}</option>`).join('')}</select></label>
          <label class="goals-field">Hora de inicio<input data-hr-field="start" type="time" value="${escapeHtml(window.start)}"></label>
          <label class="goals-field">Hora de fin<input data-hr-field="end" type="time" value="${escapeHtml(window.end)}"></label>
        </div>
        <label class="note"><input type="checkbox" data-hr-remove> Quitar esta ventana</label>
        <button type="button" class="gap-edit-btn" data-hr-preview>Revisar cambios</button>
        <div data-hr-impact aria-live="polite"></div>
        <p class="alert-hint" data-hr-error role="status"></p>
        <button type="button" class="mc-btn-primary warn" data-hr-apply hidden>Confirmar cambios</button>
      </div>`;
    body.querySelector('[data-hr-refresh]').onclick = draw;
    const editor = body.querySelector('[data-hr-editor]'), apply = body.querySelector('[data-hr-apply]');
    const impact = body.querySelector('[data-hr-impact]'), error = body.querySelector('[data-hr-error]');
    const removed = body.querySelector('[data-hr-remove]');
    let prepared = null;
    body.querySelector('[data-hr-correct]').onclick = event => { editor.hidden = false; event.currentTarget.disabled = true; body.querySelector('[data-hr-refresh]').disabled = true; };
    function draft() {
      if (removed.checked) return null;
      const values = Object.fromEntries([...editor.querySelectorAll('[data-hr-field]')].map(input => [input.dataset.hrField, input.value]));
      return { ...values, date: context.dayKeyFromIsoDate(values.date) };
    }
    function invalidate() { prepared = null; apply.hidden = true; impact.innerHTML = ''; error.textContent = ''; }
    editor.addEventListener('input', invalidate);
    editor.addEventListener('change', () => { invalidate(); editor.querySelectorAll('[data-hr-field]').forEach(input => { input.disabled = removed.checked; }); });
    body.querySelector('[data-hr-preview]').onclick = () => {
      invalidate();
      const data = context.data(), value = draft();
      const mode = editor.querySelector('[data-hr-mode]').value;
      const plan = data.owner === owner && higherRateCorrectionPlan(data.calls, data.windows, windowId, value, {...context,preserve:mode === 'preserve'});
      if (!plan) { error.textContent = translateText('Revisá la fecha, las horas, el nivel y que la ventana siga disponible.'); return; }
      if (!plan.hasChanges) { error.textContent = translateText('No hay cambios que aplicar.'); return; }
      prepared = { value, mode, signature: JSON.stringify(value), stamp: context.stamp() };
      impact.innerHTML = ui`<p class="review-scope">Llamadas afectadas: ${plan.rows.length}</p><div class="polished-comparison"><div><span>Antes</span><strong class="polished-amount">${amount(plan.beforeAffected)}</strong></div><span aria-hidden="true">→</span><div><span>Después</span><strong class="polished-amount">${amount(plan.afterAffected)}</strong></div></div>`
        + plan.rows.map(item => ui`<div class="fin-preview-row"><div class="fin-preview-main"><strong>#${escapeHtml(item.call.customerId || item.call.id)}</strong><div class="fin-preview-sub">${escapeHtml(dateTime(item.call.startISO))}</div></div><div class="fin-preview-right"><div>Antes: ${amount(item.before)}</div><div>Después: ${amount(item.after)}</div></div></div>`).join('');
      apply.hidden = false;
    };
    apply.onclick = async () => {
      if (!prepared || apply.disabled) return;
      if (prepared.signature !== JSON.stringify(draft())) { invalidate(); return; }
      apply.disabled = true;
      const current = prepared;
      const success = await context.apply(windowId, current.value, current.stamp, current.mode);
      apply.disabled = false;
      if (success) context.closeModal('higherRateReviewModal');
      else { invalidate(); error.textContent = translateText('No se aplicó. Revisá el guardado y volvé a calcular; los datos pudieron cambiar.'); }
    };
  }
  draw();
  context.openModal('higherRateReviewModal');
}
