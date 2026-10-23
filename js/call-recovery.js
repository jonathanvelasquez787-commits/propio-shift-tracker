const KEEP_MS = 30 * 86400000, MAX_ENTRIES = 50, MAX_BYTES = 384 * 1024;
const clone = value => JSON.parse(JSON.stringify(value));
const canonical = value => JSON.stringify(value, function (_key, item) {
  return item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item;
});
const equal = (a, b) => canonical(a) === canonical(b);
const bytes = value => new TextEncoder().encode(JSON.stringify(value)).length;

export function recoveryEntries(value, now = Date.now()) {
  return (Array.isArray(value) ? value : []).filter(entry => entry && typeof entry.id === 'string'
    && ['edit', 'delete', 'clear', 'restore'].includes(entry.kind)
    && Number.isFinite(Date.parse(entry.at)) && Date.parse(entry.at) > now - KEEP_MS && Date.parse(entry.at) <= now + 5000
    && Array.isArray(entry.changes) && entry.changes.length > 0
    && entry.changes.every(change => change && typeof change.id === 'string' && (change.before || change.after)
      && [change.before, change.after].every(call => call === null || call && call.id === change.id)));
}

export function appendRecoveryEntry(history, entry, now = Date.now()) {
  if (bytes(entry) > MAX_BYTES || !recoveryEntries([entry], now).length) return null;
  const next = clone([...recoveryEntries(history, now).filter(item => item.id !== entry.id), entry].slice(-MAX_ENTRIES));
  while (next.length > 1 && bytes(next) > MAX_BYTES) next.shift();
  return next;
}

export function callRecoveryPlan(sourceCalls, entry, context) {
  if (!entry || entry.kind === 'restore' || entry.restoredAt || !recoveryEntries([entry]).length) return { reason: 'unavailable' };
  if (new Set(entry.changes.map(change => change.id)).size !== entry.changes.length) return { reason: 'changed' };
  const ids = new Set(entry.changes.map(change => change.id)), replacements = [];
  for (const change of entry.changes) {
    const matches = sourceCalls.filter(call => call.id === change.id);
    if (change.after ? matches.length !== 1 || !equal(matches[0], change.after) : matches.length !== 0) return { reason: 'changed' };
    const before = change.before;
    if (!before) continue;
    const start = Date.parse(before.startISO), end = Date.parse(before.endISO), duration = Number(before.durationMin);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start || end > Date.now()
      || !Number.isFinite(duration) || duration < 0 || duration > context.MAX_CALL_DURATION_MIN) return { reason: 'invalid' };
    replacements.push(clone(before));
  }
  const remaining = sourceCalls.filter(call => !ids.has(call.id));
  const occupied = [...remaining];
  if (context.activeCall?.startedAt) occupied.push({ startISO: context.activeCall.startedAt, endISO: new Date(Date.now()).toISOString() });
  for (const call of replacements) {
    if (occupied.some(other => context.callsOverlap(other, call)
      || (other.customerId === call.customerId && Date.parse(other.startISO) === Date.parse(call.startISO))
      || context.callDedupeKey(other) === context.callDedupeKey(call))) return { reason: 'overlap' };
    occupied.push(call);
  }
  return { calls: [...remaining, ...replacements], changes: entry.changes.map(change => ({ id: change.id, before: change.after, after: change.before })) };
}

function transact(context, kind, changes, restoredId = null) {
  const { translateText } = context;
  const { state, settings, calls } = context.data();
  if (!context.canPersistLocalChanges()) return false;
  const record = { id: context.makeLocalId(), at: new Date(Date.now()).toISOString(), kind, changes: changes.map(change => ({ ...clone(change),
    beforeBonus: change.before ? context.higherRateBonusForCall(change.before)?.amount || 0 : 0,
    afterBonus: change.after ? context.higherRateBonusForCall(change.after)?.amount || 0 : 0,
  })) };
  const history = appendRecoveryEntry(state.callRecovery, record);
  if (!history) { context.toast(translateText('Este cambio supera el espacio del historial. Las llamadas se conservaron.')); return false; }
  if (restoredId) {
    const original = history.find(entry => entry.id === restoredId);
    if (original) original.restoredAt = record.at;
  }
  const previousState = clone(state), previousCategories = settings.financeCategories === undefined ? undefined : clone(settings.financeCategories);
  const ids = new Set(changes.map(change => change.id));
  state.callRecovery = history;
  context.setCalls([...calls.filter(call => !ids.has(call.id)), ...changes.flatMap(change => change.after ? [clone(change.after)] : [])]);
  const days = new Set(changes.flatMap(change => [change.before?.callDate, change.after?.callDate]).map(context.callDateKeyFromValue).filter(Boolean));
  let accepted = false;
  try {
    days.forEach(context.reconcileLastCallEndedAt);
    context.financeRunAutoFillCascade();
    if (context.stateWithinBudget(state)) accepted = context.saveAll({ render: false }) !== false;
  } catch { /* Un guardado interrumpido no debe dejar una eliminación aplicada solo en memoria. */ }
  if (!accepted) {
    context.setCalls(calls);
    context.setState(previousState);
    if (previousCategories === undefined) delete settings.financeCategories; else settings.financeCategories = previousCategories;
    context.render();
    context.toast(translateText('No se guardó el cambio. Tus llamadas y el historial anterior se conservaron.'));
    return false;
  }
  days.forEach(context.onGameCallsChanged);
  context.render();
  return true;
}

export function saveEditedCall(context, callId, opened) {
  const { calls, settings, state } = context.data(), original = calls.find(call => call.id === callId);
  const { ui, translateText, toast } = context;
  if (!original || !opened || opened.owner !== settings || opened.call !== canonical(original)) {
    toast(translateText('La llamada cambió mientras la editabas. Cerrá y abrí el editor para revisar la versión actual.')); return false;
  }
  const input = name => document.getElementById(name);
  const durationInput = input('callEditDurationInput'), payInput = input('callEditPayInput');
  const duration = Number(durationInput?.value), amount = Number(String(payInput?.value ?? '').trim() || 0);
  if (!String(durationInput?.value ?? '').trim() || durationInput?.validity?.badInput || !Number.isFinite(duration) || duration < 0 || duration > context.MAX_CALL_DURATION_MIN) {
    toast(ui`La duración debe ser un número entre 0 y ${context.MAX_CALL_DURATION_MIN} minutos`); return false;
  }
  if (payInput?.validity?.badInput || !Number.isFinite(amount) || amount > 1e9) {
    toast(translateText('El pago debe ser un número válido de hasta 1000000000 dólares.')); return false;
  }
  const start = new Date(original.startISO), end = new Date(start.getTime() + duration * 60000);
  if (!Number.isFinite(end.getTime()) || end.getTime() > Date.now()) { toast(translateText('La llamada no puede terminar en el futuro')); return false; }
  const billable = input('callEditBillableInput')?.value === 'Yes' ? 'Yes' : 'No';
  const dropped = input('callEditDroppedInput')?.value === 'Yes' ? 'Yes' : 'No';
  const next = { ...original, durationMin: duration, pay: Math.max(0, amount).toFixed(2), billable, dropped, endISO: end.toISOString(), countsAsProductive: billable === 'Yes' && dropped === 'No' };
  if (Object.hasOwn(original, 'durationMs')) next.durationMs = end.getTime() - start.getTime();
  if (state.activeCall && context.callsOverlap(next, { startISO: state.activeCall.startedAt, endISO: new Date().toISOString() })) {
    toast(translateText('No se puede guardar: coincide con la llamada en curso.')); return false;
  }
  const overlap = calls.find(call => call.id !== callId && context.callsOverlap(call, next));
  if (overlap) { toast(ui`Esa duración traslapa con la llamada #${overlap.customerId} (${overlap.callStart}). Ajusta la duración.`); return false; }
  if (!equal(original, next)) {
    next.manualCorrectionAt = new Date().toISOString();
    if (!transact(context, 'edit', [{ id: callId, before: original, after: next }])) return false;
  }
  context.finishEdit(); context.closeModal('callEditModal');
  toast(translateText('Llamada actualizada')); return true;
}

export function deleteRecordedCall(context, callId, expected) {
  const { translateText } = context;
  const call = context.data().calls.find(item => item.id === callId);
  if (!call || !equal(call, expected)) { context.toast(translateText('La llamada cambió. Revisala de nuevo antes de eliminarla.')); return false; }
  if (!call || !transact(context, 'delete', [{ id: callId, before: call, after: null }])) return false;
  context.toast(translateText('Llamada enviada al historial recuperable')); return true;
}

export function clearRecordedDay(context, day) {
  const { ui, translateText } = context;
  const { state, settings, calls } = context.data();
  const selected = calls.filter(call => context.callDateKeyFromValue(call.callDate) === day);
  if (!selected.length) { context.toast(translateText('No hay llamadas que borrar en este día.')); return false; }
  const snapshot = canonical(selected); let settled = false;
  context.appConfirm(ui`¿Vaciar ${selected.length} llamadas de ${context.formatCallDayLabel(day)}? Se conservarán en el historial recuperable hasta 30 días. Turno, pausas y horario permanecen.`, () => {
    if (settled) return false;
    settled = true;
    const current = context.data();
    if (current.state !== state || current.settings !== settings || canonical(current.calls.filter(call => context.callDateKeyFromValue(call.callDate) === day)) !== snapshot) {
      context.toast(translateText('Los datos cambiaron. Revisá de nuevo antes de vaciar el día.')); return false;
    }
    const ok = transact(context, 'clear', selected.map(call => ({ id: call.id, before: call, after: null })));
    if (ok) context.toast(translateText('Llamadas del día enviadas al historial recuperable'));
    return ok;
  });
}

export function callRecoveryStamp({ state, calls, settings }) { return { state, settings, revision: canonical([calls, state.callRecovery, settings]), used: false }; }

export function restoreCallChange(context, entryId, stamp) {
  const current = context.data();
  if (!stamp || stamp.used || current.state !== stamp.state || current.settings !== stamp.settings
    || canonical([current.calls, current.state.callRecovery, current.settings]) !== stamp.revision) return false;
  const entry = recoveryEntries(current.state.callRecovery).find(item => item.id === entryId);
  const plan = callRecoveryPlan(current.calls, entry, { ...context, activeCall: current.state.activeCall });
  if (plan.reason) return false;
  stamp.used = true;
  return transact(context, 'restore', plan.changes, entryId);
}

export function openCallRecovery(context) {
  const body = document.getElementById('callRecoveryBody'), owner = context.data().settings;
  const { ui, translateText, escapeHtml, money, financeConvertedInline } = context;
  const amount = value => `${money(value)}${financeConvertedInline(value)}`;
  const total = call => call ? context.parseMoney(call.pay) + (context.higherRateBonusForCall(call)?.amount || 0) : 0;
  const label = kind => ({ edit: translateText('Edición'), delete: translateText('Eliminación'), clear: translateText('Vaciado del día'), restore: translateText('Recuperación') })[kind];
  const reason = key => ({ changed: translateText('Hay una versión posterior'), overlap: translateText('Coincide con otra llamada'), invalid: translateText('Revisá los datos de la llamada'), unavailable: translateText('Ya recuperado') })[key];
  const callDetails = change => {
    const record = change.before || change.after;
    const value = (call, field) => !call ? '—' : field === 'pay' ? amount(context.parseMoney(call.pay)) : escapeHtml(translateText(String(call[field] ?? '—')));
    return ui`<div class="recovery-call"><strong>#${escapeHtml(record.customerId || change.id)}</strong><span>${escapeHtml(record.callDate)} · ${escapeHtml(record.callStart)}</span><dl class="recovery-fields">
      <div><dt>Duración</dt><dd>${value(change.before, 'durationMin')} → ${value(change.after, 'durationMin')} min</dd></div>
      <div><dt>Pago base</dt><dd><span>${value(change.before, 'pay')}</span><span aria-hidden="true">→</span><span>${value(change.after, 'pay')}</span></dd></div>
      <div><dt>Facturable</dt><dd>${value(change.before, 'billable')} → ${value(change.after, 'billable')}</dd></div>
      <div><dt>Llamada caída</dt><dd>${value(change.before, 'dropped')} → ${value(change.after, 'dropped')}</dd></div>
    </dl></div>`;
  };
  let mode = 'ready', prepared = null;
  function draw() {
    prepared = null;
    const data = context.data();
    if (data.settings !== owner) { body.textContent = translateText('La cuenta cambió. Cerrá esta ventana.'); return; }
    const entries = recoveryEntries(data.state.callRecovery).slice().reverse().map(entry => ({ entry,
      plan: callRecoveryPlan(data.calls, entry, { ...context, activeCall: data.state.activeCall }) }));
    const ready = entries.filter(item => !item.plan.reason).length;
    body.innerHTML = ui`<div class="recovery-overview"><span class="recovery-symbol" aria-hidden="true">↶</span><div><strong>Tu historial de cambios</strong><p>Revisá y recuperá llamadas sin sobrescribir cambios posteriores.</p></div><span class="recovery-count">${ready}</span></div>
      <div class="recovery-toolbar"><div class="table-filter-row"><button type="button" class="table-filter-btn ${mode === 'ready' ? 'active' : ''}" data-recovery-filter="ready">Recuperables</button><button type="button" class="table-filter-btn ${mode === 'all' ? 'active' : ''}" data-recovery-filter="all">Todos</button></div><button type="button" class="gap-edit-btn" data-recovery-refresh>Actualizar</button></div>
      <p class="note">Hasta 50 cambios · hasta 30 días, según espacio. Incluido en tu respaldo JSON.</p>
      <div class="recovery-list">${entries.filter(item => mode === 'all' || !item.plan.reason).map(({ entry, plan }) => {
        const before = entry.changes.reduce((n, change) => n + (change.before ? context.parseMoney(change.before.pay) : 0) + (Number(change.beforeBonus) || 0), 0), after = entry.changes.reduce((n, change) => n + (change.after ? context.parseMoney(change.after.pay) : 0) + (Number(change.afterBonus) || 0), 0);
        return ui`<article class="recovery-card"><div class="recovery-card-head"><div><span class="recovery-tag">${escapeHtml(label(entry.kind))}</span><h4>Llamadas: ${entry.changes.length}</h4><time>${escapeHtml(new Date(entry.at).toLocaleString(context.displayLocale(), { dateStyle: 'short', timeStyle: 'short' }))}</time></div><span class="recovery-state ${plan.reason ? '' : 'ready'}">${escapeHtml(plan.reason ? reason(plan.reason) : translateText('Disponible'))}</span></div>
          <details><summary>Ver antes y después</summary><p class="note">Total con bono</p><div class="recovery-comparison"><div><span>Antes</span><strong>${amount(before)}</strong></div><span aria-hidden="true">→</span><div><span>Después</span><strong>${amount(after)}</strong></div></div>${entry.changes.map(callDetails).join('')}</details>
          ${plan.reason ? '' : ui`<button type="button" class="mc-btn-primary cyan" data-recovery-review="${escapeHtml(entry.id)}">${escapeHtml(entry.kind === 'edit' ? translateText('Deshacer edición') : translateText('Recuperar llamadas'))}</button>`}</article>`;
      }).join('') || ui`<div class="recovery-empty"><span aria-hidden="true">✓</span><strong>No hay cambios recuperables en esta vista.</strong><p>Las próximas ediciones y eliminaciones aparecerán aquí.</p></div>`}</div><div data-recovery-confirm aria-live="polite"></div><p data-recovery-error role="status" class="alert-hint"></p>`;
    body.querySelectorAll('[data-recovery-filter]').forEach(button => { button.onclick = () => { mode = button.dataset.recoveryFilter; draw(); }; });
    body.querySelector('[data-recovery-refresh]').onclick = draw;
    body.querySelectorAll('[data-recovery-review]').forEach(button => { button.onclick = () => {
      const data = context.data(), entry = recoveryEntries(data.state.callRecovery).find(item => item.id === button.dataset.recoveryReview);
      const plan = data.settings === owner && callRecoveryPlan(data.calls, entry, { ...context, activeCall: data.state.activeCall });
      if (!plan || plan.reason) { draw(); return; }
      prepared = callRecoveryStamp(data);
      const before = plan.changes.reduce((n, change) => n + total(change.before), 0), after = plan.changes.reduce((n, change) => n + total(change.after), 0);
      const confirmation = body.querySelector('[data-recovery-confirm]');
      confirmation.innerHTML = ui`<section class="recovery-card recovery-confirm"><span class="recovery-tag">Revisar recuperación</span><h4>Llamadas: ${plan.changes.length}</h4><div class="recovery-comparison"><div><span>Ahora</span><strong>${amount(before)}</strong></div><span aria-hidden="true">→</span><div><span>Al recuperar</span><strong>${amount(after)}</strong></div></div><p class="note">Se actualizarán ganancias, Finanzas y Logros.</p><div class="modal-actions mc-action-row"><button type="button" class="gap-edit-btn" data-recovery-cancel>Cancelar</button><button type="button" class="mc-btn-primary cyan" data-recovery-apply>Confirmar recuperación</button></div></section>`;
      confirmation.querySelector('[data-recovery-cancel]').onclick = () => { prepared = null; confirmation.innerHTML = ''; };
      confirmation.querySelector('[data-recovery-apply]').onclick = () => {
        const stamp = prepared; prepared = null;
        if (!restoreCallChange(context, entry.id, stamp)) { draw(); body.querySelector('[data-recovery-error]').textContent = translateText('No se recuperó. Actualizá la revisión; los datos pudieron cambiar o el guardado falló.'); return; }
        context.toast(translateText('Llamadas recuperadas')); draw();
      };
      confirmation.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      confirmation.querySelector('[data-recovery-apply]').focus({ preventScroll: true });
    }; });
  }
  draw(); context.openModal('callRecoveryModal');
}
