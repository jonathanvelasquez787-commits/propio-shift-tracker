import { settings, state, setAppSettings, setAppState } from './app-context.js';
import { ui, translateText, displayLocale } from './i18n.js';
import { DEFAULT_FINANCE_SPLIT, validFinanceSplit, financePlanProjection, validFinanceDate,
  financePaymentRows, financeMonthTotalsFromPayments, financeSavingsMonthly, financeExpenseStatusFromPaid, financeCanCompareMonthlyBudget } from './finance-plan-model.js';

let ctx = {};
let selectedMonth = '';
let planDraft = false;
const expandedRows = new Set();
const expandedReservations = new Set();
const rowDrafts = new Map();
const savingsDrafts = new Map();
const amountDrafts = new Map();
let hideFieldHelp = () => {};
let monthIndex = null;
const el = id => document.getElementById(id);
const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};
const localDate = () => {
  const now = new Date();
  return `${currentMonth()}-${String(now.getDate()).padStart(2, '0')}`;
};
const metric = (label, usd) => ui`<div class="fin-plan-metric"><span>${label}</span><strong>${ctx.money(usd)}</strong>${ctx.convertedNote(usd)}</div>`;
const rows = () => currentMonthIndex().rows;
const selected = () => selectedMonth || currentMonth();
export const financeSelectedMonth = () => selected();
export const financeMonthLabel = () => new Date(`${selected()}-01T12:00:00`).toLocaleDateString(displayLocale(), { month: 'long', year: 'numeric' });
const payments = rowId => rowId ? currentMonthIndex().byRow.get(rowId) || [] : currentMonthIndex().payments;
const splitSettings = () => validFinanceSplit(settings.financePlanning?.split) ? settings.financePlanning.split : DEFAULT_FINANCE_SPLIT;
const configuredDays = () => {
  const stored = Number(settings.financePlanning?.daysPerWeek);
  if (Number.isInteger(stored) && stored >= 1 && stored <= 7) return stored;
  const count = Object.values(settings.weeklySchedule || {}).filter(day => day && !day.off).length;
  return count >= 1 && count <= 7 ? count : 5;
};

export function configureFinancePlanning(context) { ctx = context; monthIndex = null; }

export function prepareFinanceMonthRender(expenseRows = ctx.getExpenseRows()) {
  const records = financePaymentRows(settings.financePayments, selected());
  const byRow = new Map(), paidByRow = new Map();
  for (const payment of records) {
    if (!byRow.has(payment.rowId)) byRow.set(payment.rowId, []);
    byRow.get(payment.rowId).push(payment);
    paidByRow.set(payment.rowId, (paidByRow.get(payment.rowId) || 0) + payment.usd);
  }
  const rowIds = new Set(expenseRows.map(row => row.id));
  monthIndex = {owner:settings, source:settings.financePayments, month:selected(), rows:expenseRows, payments:records, byRow, paidByRow,
    totals:financeMonthTotalsFromPayments(expenseRows, records),
    comparable:expenseRows.length > 0 && expenseRows.every(financeCanCompareMonthlyBudget) && records.every(payment => rowIds.has(payment.rowId))};
}

function currentMonthIndex() {
  if (!monthIndex || monthIndex.owner !== settings || monthIndex.source !== settings.financePayments || monthIndex.month !== selected()) prepareFinanceMonthRender();
  return monthIndex;
}

export function financeCurrentExpenseStatus(row) {
  return financeExpenseStatusFromPaid(row, currentMonthIndex().paidByRow.get(row.id) || 0);
}

export function financeInputUsd(raw, unit = 'usd') {
  const amount = ctx.parseAmount(raw);
  const rate = Number(settings.exchangeRate);
  if (unit === 'local' && (!String(settings.currencyLabel || '').trim() || !Number.isFinite(rate) || rate <= 0)) return NaN;
  const usd = unit === 'local' ? amount / rate : amount;
  const cents = usd * 100;
  return Math.round(cents + Number.EPSILON * Math.max(1, Math.abs(cents))) / 100;
}

export function financeInputValue(amount) {
  if (!Number.isFinite(amount) || amount < 0) return '';
  const text = Number(amount.toPrecision(16)).toString();
  const [coefficient, power = '0'] = text.split('e');
  const [whole, fraction = ''] = coefficient.split('.');
  const digits = whole + fraction, point = whole.length + Number(power);
  let plain = point <= 0 ? `0.${'0'.repeat(-point)}${digits}`
    : point >= digits.length ? digits + '0'.repeat(point - digits.length)
    : `${digits.slice(0, point)}.${digits.slice(point)}`;
  const [integer, decimals = ''] = plain.split('.');
  return `${integer}.${decimals.padEnd(2, '0')}`;
}

export function financeAmountInputHtml(row, scope) {
  const key = scope === 'payment' ? `${row.id}:${selected()}` : row.id;
  const draft = amountDrafts.get(`${scope}:${key}`);
  const currency = String(settings.currencyLabel || '').trim();
  const rate = Number(settings.exchangeRate);
  const hasCurrency = currency && Number.isFinite(rate) && rate > 0;
  const unit = draft?.unit === 'local' && hasCurrency ? 'local' : 'usd';
  let value = draft?.value || '';
  if (draft && draft.unit === 'local' && (!hasCurrency || draft.rate !== rate || draft.currency !== currency) && Number.isFinite(draft.usd)) {
    value = financeInputValue(unit === 'local' ? draft.usd * rate : draft.usd);
  }
  const label = scope === 'payment' ? translateText('Importe del pago') : translateText('Monto a sumar o restar');
  const amountHelp = scope === 'payment' ? translateText('Escribe el importe que ya pagaste. Se guardará en el historial con la fecha elegida; no cambia el dinero reservado.') : translateText('Escribe cuánto quieres apartar o devolver, no el saldo total. Sumar lo toma del disponible; Restar lo devuelve. Aplicar ajuste confirma la operación.');
  const currencyHelp = translateText('Elige la moneda del importe. La equivalencia usa el tipo de cambio de Ajustes. Cambiar de moneda conserva el mismo valor en dólares.');
  const equivalent = value && Number.isFinite(financeInputUsd(value, unit)) ? `${ctx.money(financeInputUsd(value, unit))}${ctx.convertedInline(financeInputUsd(value, unit))}` : '';
  return ui`<div class="fin-amount-entry" data-fin-amount-scope="${scope}">
    <label class="fin-plan-field" data-fin-help="${ctx.escapeHtml(amountHelp)}">${label}<input data-fin-${scope}-input data-fin-help="${ctx.escapeHtml(amountHelp)}" type="text" value="${ctx.escapeHtml(value)}" inputmode="decimal" autocomplete="off"/></label>
    <label class="fin-plan-field" data-fin-help="${ctx.escapeHtml(currencyHelp)}">Moneda<select data-fin-amount-unit data-fin-help="${ctx.escapeHtml(currencyHelp)}" aria-label="Moneda del importe"><option value="usd" ${unit === 'usd' ? 'selected' : ''}>USD</option>${hasCurrency ? ui`<option value="local" ${unit === 'local' ? 'selected' : ''}>${ctx.escapeHtml(currency)}</option>` : ''}</select></label>
    <small class="fin-amount-equivalent" data-fin-amount-equivalent aria-live="polite">${equivalent}</small>
  </div>`;
}

function rememberAmount(entry, convert = false) {
  const scope = entry.getAttribute('data-fin-amount-scope');
  const rowId = entry.closest('.fin-row').getAttribute('data-fin-row');
  const key = `${scope}:${scope === 'payment' ? `${rowId}:${selected()}` : rowId}`;
  const input = entry.querySelector('input');
  const unit = entry.querySelector('select').value;
  const previous = amountDrafts.get(key);
  if (convert && previous && previous.unit !== unit && Number.isFinite(previous.usd)) {
    const converted = unit === 'local' ? previous.usd * Number(settings.exchangeRate) : previous.usd;
    if (!Number.isFinite(converted)) {
      entry.querySelector('select').value = previous.unit;
      ctx.toast(translateText('El importe es demasiado grande para convertirlo. Se conservó la moneda anterior.')); return;
    }
    input.value = financeInputValue(converted);
  }
  const usd = financeInputUsd(input.value, unit);
  amountDrafts.set(key, {value:input.value, unit, usd, sign:previous?.sign || 'plus', rate:Number(settings.exchangeRate), currency:String(settings.currencyLabel || '').trim()});
  entry.querySelector('[data-fin-amount-equivalent]').innerHTML = input.value && Number.isFinite(usd) ? `${ctx.money(usd)}${ctx.convertedInline(usd)}` : '';
}

export function clearFinanceAmountDraft(rowId, scope = 'reservation') {
  amountDrafts.delete(`${scope}:${scope === 'payment' ? `${rowId}:${selected()}` : rowId}`);
}

export function financeReservationSign(rowId) {
  return amountDrafts.get(`reservation:${rowId}`)?.sign === 'minus' ? 'minus' : 'plus';
}

export function captureFinanceDetails() {
  hideFieldHelp();
  document.querySelectorAll('[data-fin-plan-row]').forEach(detail => {
    const id = detail.getAttribute('data-fin-plan-row');
    if (detail.open) expandedRows.add(id); else expandedRows.delete(id);
  });
  document.querySelectorAll('[data-fin-reservation-row]').forEach(detail => {
    const id = detail.getAttribute('data-fin-reservation-row');
    if (detail.open) expandedReservations.add(id); else expandedReservations.delete(id);
  });
}

export function financeReservationHtml(row, controls) {
  return ui`<details class="fin-plan-row fin-reservation-controls" data-fin-reservation-row="${ctx.escapeHtml(row.id)}" ${expandedReservations.has(row.id) ? 'open' : ''}><summary>Apartar o devolver dinero<span aria-hidden="true">⌄</span></summary><div class="fin-plan-row-body"><p class="sched-hint">Este ajuste mueve dinero entre Disponible y Reservado. No registra un pago.</p>${controls}</div></details>`;
}

function paymentHistoryHtml(records) {
  return records.slice().sort((a, b) => b.date.localeCompare(a.date)).map(payment => ui`
    <div class="fin-payment-record">
      <span><strong>${ctx.escapeHtml(payment.name)}</strong><small>${ctx.escapeHtml(payment.date)}</small></span>
      <span>${ctx.money(payment.usd)}${ctx.convertedInline(payment.usd)}</span>
      <button class="fin-ghost-btn fin-ghost-btn-icon" type="button" data-fin-payment-delete="${ctx.escapeHtml(payment.id)}" aria-label="Eliminar pago">${ctx.iconHtml('trash')}</button>
    </div>`).join('');
}

export function financePlanningRowHtml(row, isMeta) {
  const rowId = ctx.escapeHtml(row.id);
  const categoryId = ctx.escapeHtml(row.categoryId);
  const header = isMeta ? translateText('Estimar aporte mensual') : translateText('Registrar pago y ver historial');
  const draft = (isMeta ? savingsDrafts.get(row.id) : rowDrafts.get(`${row.id}:${selected()}`)) || {};
  let body;
  if (isMeta) {
    const saving = financeSavingsMonthly(row);
    body = ui`${saving.months === null ? ui`<p class="sched-hint">El plazo es opcional. Guarda uno para calcular el aporte mensual.</p>` : ui`<div class="fin-plan-metrics">${metric(translateText('Aporte mensual orientativo'), saving.monthly)}</div>`}
      <div class="fin-payment-controls"><label class="fin-plan-field">Meses usados en la estimación<input type="number" min="1" max="120" step="1" value="${ctx.escapeHtml(draft.months ?? saving.months ?? '')}" data-fin-savings-months aria-label="Meses usados en la estimación"/></label>
      <button class="fin-ghost-btn" type="button" data-fin-savings-save="${rowId}" data-fin-cat="${categoryId}">Guardar estimación</button></div>
      <p class="sched-hint">Se divide lo pendiente de reservar entre estos meses. Es una estimación editable; no establece una fecha límite ni descuenta meses automáticamente.</p>`;
  } else {
    const records = payments(row.id);
    const status = financeCurrentExpenseStatus(row);
    const monthlyBudget = financeCanCompareMonthlyBudget(row);
    const paid = status.paid;
    const total = currentMonthIndex().totals;
    const percent = total.paid > 0 ? `${(paid / total.paid * 100).toLocaleString(displayLocale(), { maximumFractionDigits: 1 })}%` : '—';
    const expenseType = row.expenseType === 'variable' ? translateText('Gasto variable') : translateText('Gasto fijo');
    const date = draft.date || (selected() === currentMonth() ? localDate() : `${selected()}-01`);
    body = ui`<div class="fin-plan-row-heading"><span>${expenseType}</span><span>${ctx.escapeHtml(financeMonthLabel())}</span></div>
      ${!monthlyBudget ? ui`<p class="sched-hint">Este presupuesto no es mensual o conserva fracciones de centavo. Los pagos se agrupan por su fecha; no se calcula un saldo mensual pendiente ni un exceso.</p>` : ''}
      <div class="fin-plan-metrics">${monthlyBudget ? metric(status.excess > 0 ? translateText('Exceso sobre el presupuesto') : translateText('Pendiente de pagar del presupuesto'), status.excess || status.remaining) : ''}<span class="fin-plan-metric"><span>Porcentaje del total pagado este mes</span><strong>${percent}</strong></span></div>
      <div class="fin-payment-controls">
        ${financeAmountInputHtml(row, 'payment')}
        <label class="fin-plan-field">Fecha<input data-fin-payment-date type="date" value="${ctx.escapeHtml(date)}"/></label>
        <button class="fin-mini-btn-primary" type="button" data-fin-payment-save="${rowId}" data-fin-cat="${categoryId}">Registrar pago</button>
      </div><p class="sched-hint">Un pago actualiza el historial del mes de su fecha. La reserva se conserva hasta que la liberes; tus llamadas y ganancias no cambian.</p>
      <label class="fin-checkbox-label"><input type="checkbox" data-fin-mark-paid="${rowId}" data-fin-cat="${categoryId}" ${row.manualPaid ? 'checked' : ''}/> Omitir reserva automática</label>
      <p class="sched-hint">Este control excluye el gasto del reparto automático. No registra un pago.</p>
      <div class="fin-payment-history">${paymentHistoryHtml(records) || ui`<p class="sched-hint">Sin pagos registrados en este mes.</p>`}</div>`;
  }
  return ui`<details class="fin-plan-row" data-fin-plan-row="${rowId}" ${expandedRows.has(row.id) ? 'open' : ''}>
    <summary>${header}<span aria-hidden="true">⌄</span></summary><div class="fin-plan-row-body">${body}</div></details>`;
}

function projectionFromInputs() {
  if (['financePlanHoursInput', 'financePlanDaysInput', 'financePlanFixedInput', 'financePlanVariableInput', 'financePlanSavingsInput'].some(id => !String(el(id).value).trim())) return null;
  return financePlanProjection(Number(el('financePlanHoursInput').value), Number(el('financePlanDaysInput').value), Number(settings.rate),
    ['financePlanFixedInput', 'financePlanVariableInput', 'financePlanSavingsInput'].map(id => Number(el(id).value)), Number(settings.productiveGoalMin));
}

export function updateFinancePlanPreview() {
  const split = ['financePlanFixedInput', 'financePlanVariableInput', 'financePlanSavingsInput'].map(id => Number(el(id).value));
  const total = split.reduce((sum, number) => sum + number, 0);
  const projection = projectionFromInputs();
  const minutes = projection?.minutes ?? Number(el('financePlanHoursInput').value) * 60;
  el('financePlanSummary').textContent = ui`${Number.isFinite(minutes) ? minutes : '—'} min · meta diaria`;
  el('financePlanDailyValue').textContent = Number.isFinite(minutes) && minutes >= 0 && minutes <= 1440 ? ui`${minutes} min` : '—';
  el('financePlanProjectedValue').innerHTML = projection ? `${ctx.money(projection.projected)}${ctx.convertedNote(projection.projected)}` : '—';
  ['financePlanFixedValue', 'financePlanVariableValue', 'financePlanSavingsValue'].forEach((id, i) => {
    el(id).innerHTML = projection ? `${ctx.money(projection.distribution[i])}${ctx.convertedNote(projection.distribution[i])}` : '—';
  });
  el('financePlanSplitTotal').textContent = ui`Total: ${Number.isFinite(total) ? total : '—'}%`;
  const error = el('financePlanError');
  error.hidden = !!projection;
  error.textContent = !validFinanceSplit(split) ? translateText('Los porcentajes deben sumar 100% y estar entre 0 y 100.')
    : translateText('Usa entre 0 y 24 horas, entre 1 y 7 días y una tarifa válida en Ajustes.');
  el('saveFinancePlanBtn').disabled = !projection;
}

export function renderFinancePlanning({prepared = false} = {}) {
  if (!el('financePlanHoursInput')) return;
  if (!prepared) prepareFinanceMonthRender();
  if (!planDraft) {
    el('financePlanHoursInput').value = Number((Number(settings.productiveGoalMin || 0) / 60).toFixed(6));
    el('financePlanDaysInput').value = configuredDays();
    ['financePlanFixedInput', 'financePlanVariableInput', 'financePlanSavingsInput'].forEach((id, i) => { el(id).value = splitSettings()[i]; });
  }
  el('financePlanRate').textContent = ui`Tarifa de Ajustes: ${ctx.money(Number(settings.rate))}/min`;
  el('financeMonthInput').value = selected();
  const {totals, comparable} = currentMonthIndex();
  el('financeMonthTotals').innerHTML = metric(translateText('Presupuesto actual'), totals.budget)
    + metric(translateText('Pagos registrados'), totals.paid) + (comparable ? metric(totals.difference < -0.004 ? translateText('Exceso sobre el presupuesto') : translateText('Pendiente de pagar del presupuesto'), Math.abs(totals.difference)) : ui`<p class="sched-hint">No se compara el saldo mensual cuando hay períodos distintos o pagos de gastos eliminados.</p>`);
  el('financePaymentHistory').innerHTML = paymentHistoryHtml(payments()) || ui`<p class="sched-hint">Sin pagos registrados en este mes.</p>`;
  updateFinancePlanPreview();
}

export function saveFinancePlan() {
  const projection = projectionFromInputs();
  if (!projection) { updateFinancePlanPreview(); return false; }
  const previousSettings = JSON.parse(JSON.stringify(settings));
  const previousState = JSON.parse(JSON.stringify(state));
  const ownerSettings = settings, ownerState = state;
  settings.financePlanning = { daysPerWeek: Number(el('financePlanDaysInput').value), split: ['financePlanFixedInput', 'financePlanVariableInput', 'financePlanSavingsInput'].map(id => Number(el(id).value)) };
  if (ctx.applyGoalValues(projection.minutes, projection.dollars, 'global', ctx.todayCallDateKey(), ctx.saveAll, 'finance') === false) {
    if (settings === ownerSettings) setAppSettings(previousSettings);
    if (state === ownerState) setAppState(previousState);
    ctx.render();
    el('financePlanSaveStatus').style.color = 'var(--bad)';
    el('financePlanSaveStatus').textContent = translateText('No se guardó el plan. Tus metas anteriores se conservaron.'); return false;
  }
  planDraft = false;
  ctx.render();
  el('financePlanSaveStatus').style.color = '';
  el('financePlanSaveStatus').textContent = ui`Meta diaria y distribución guardadas: ${projection.minutes} min.`;
  return true;
}

export function addFinancePayment(catId, rowId, rawUsd, rawLocal, date) {
  const row = ctx.findRow(catId, rowId);
  if (!row || ctx.isMeta(row)) return false;
  const usd = !String(rawUsd || '').trim() && String(rawLocal || '').trim()
    ? financeInputUsd(rawLocal, 'local') : financeInputUsd(rawUsd, 'usd');
  if (!Number.isFinite(usd) || usd <= 0 || usd > 1e9 || !validFinanceDate(date)) {
    ctx.toast(translateText('Ingresa un pago mayor a cero y una fecha válida.')); return false;
  }
  const previous = settings.financePayments;
  const owner = settings;
  const record = { id: ctx.makeLocalId(), rowId, name: String(row.name).slice(0, 200), categoryId: catId,
    expenseType: row.expenseType === 'variable' ? 'variable' : 'fixed', date, usd };
  settings.financePayments = [...(Array.isArray(previous) ? previous : []), record];
  if (ctx.saveSettingsOnly() === false) {
    if (settings === owner) { if (previous === undefined) delete settings.financePayments; else settings.financePayments = previous; }
    ctx.toast(translateText('No se registró el pago porque no se pudo guardar.'), {persistenceFailure:true}); return false;
  }
  rowDrafts.delete(`${rowId}:${selected()}`);
  clearFinanceAmountDraft(rowId, 'payment');
  ctx.render(); ctx.toast(translateText('Pago registrado')); return true;
}

export function deleteFinancePayment(id) {
  const record = (Array.isArray(settings.financePayments) ? settings.financePayments : []).find(payment => payment?.id === id);
  if (!record) return;
  ctx.appConfirm(translateText('¿Eliminar este pago del historial? La asignación del gasto se conserva.'), () => {
    const previous = settings.financePayments;
    if (!Array.isArray(previous) || !previous.some(payment => payment?.id === id)) return;
    const owner = settings;
    settings.financePayments = previous.filter(payment => payment?.id !== id);
    if (ctx.saveSettingsOnly() === false) {
      if (settings === owner) settings.financePayments = previous;
      ctx.toast(translateText('No se eliminó el pago porque no se pudo guardar.'), {persistenceFailure:true}); return false;
    }
    ctx.render(); ctx.toast(translateText('Pago eliminado'));
  });
}

export function saveFinanceSavingsMonths(catId, rowId, months) {
  const row = ctx.findRow(catId, rowId), clear = typeof months === 'string' && !months.trim(), value = Number(months);
  if (!row || !ctx.isMeta(row) || (!clear && (!Number.isInteger(value) || value < 1 || value > 120))) {
    ctx.toast(translateText('Usa un plazo entre 1 y 120 meses.')); return false;
  }
  const previous = row.savingsMonths;
  if (clear) delete row.savingsMonths; else row.savingsMonths = value;
  if (ctx.saveSettingsOnly() === false) {
    if (previous === undefined) delete row.savingsMonths; else row.savingsMonths = previous;
    ctx.toast(translateText('No se guardó la estimación. Tu plazo anterior se conservó.'), {persistenceFailure:true}); return false;
  }
  savingsDrafts.delete(rowId);
  ctx.render(); ctx.toast(clear ? translateText('Estimación eliminada') : translateText('Estimación guardada')); return true;
}

export function wireFinancePlanning() {
  const section = el('financeSection');
  if (!section || section.dataset.planningWired) return;
  section.dataset.planningWired = 'true';
  wireFinanceSplitHelp();
  wireFinanceFieldHelp(section);
  section.addEventListener('input', event => {
    const target = event.target;
    if (target.matches('[data-fin-plan-input]')) { planDraft = true; el('financePlanSaveStatus').textContent = ''; updateFinancePlanPreview(); }
    const body = target.closest('.fin-plan-row-body');
    const entry = target.closest('[data-fin-amount-scope]');
    if (entry && target.tagName === 'INPUT') rememberAmount(entry);
    if (body && target.matches('[data-fin-payment-date], [data-fin-savings-months]')) {
      const rowId = body.closest('[data-fin-plan-row]').getAttribute('data-fin-plan-row');
      if (target.matches('[data-fin-savings-months]')) savingsDrafts.set(rowId, {months:target.value});
      else rowDrafts.set(`${rowId}:${selected()}`, {date:target.value});
    }
  });
  section.addEventListener('change', event => {
    if (event.target.matches('[data-fin-amount-unit]')) { rememberAmount(event.target.closest('[data-fin-amount-scope]'), true); return; }
    if (event.target.id !== 'financeMonthInput') return;
    const month = event.target.value;
    if (!validFinanceDate(month + '-01')) { event.target.value = selected(); return; }
    selectedMonth = month;
    ctx.renderFinanceSection();
  });
  section.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-fin-sign-btn')) {
      const rowId = button.closest('.fin-row').getAttribute('data-fin-row'), key = `reservation:${rowId}`;
      amountDrafts.set(key, {...amountDrafts.get(key), sign:button.getAttribute('data-sign')});
      return;
    }
    if (button.id === 'saveFinancePlanBtn') { saveFinancePlan(); return; }
    if (button.hasAttribute('data-fin-payment-delete')) { deleteFinancePayment(button.getAttribute('data-fin-payment-delete')); return; }
    if (button.hasAttribute('data-fin-payment-save')) {
      const body = button.closest('.fin-plan-row-body');
      const entry = body.querySelector('[data-fin-amount-scope]');
      const raw = entry.querySelector('input').value;
      const local = entry.querySelector('select').value === 'local';
      addFinancePayment(button.getAttribute('data-fin-cat'), button.getAttribute('data-fin-payment-save'), local ? '' : raw,
        local ? raw : '', body.querySelector('[data-fin-payment-date]').value);
    }
    if (button.hasAttribute('data-fin-savings-save')) {
      saveFinanceSavingsMonths(button.getAttribute('data-fin-cat'), button.getAttribute('data-fin-savings-save'), button.closest('.fin-plan-row-body').querySelector('[data-fin-savings-months]').value);
    }
  });
}

function wireFinanceFieldHelp(section) {
  const tooltip = document.createElement('span');
  tooltip.id = 'financeFieldTooltip';
  tooltip.className = 'sched-help-tooltip fin-help-tooltip';
  tooltip.setAttribute('role', 'tooltip');
  document.body.appendChild(tooltip);
  let anchor = null;
  let previousDescription = null;
  const hide = () => {
    tooltip.classList.remove('is-open');
    if (anchor) {
      if (previousDescription === null) anchor.removeAttribute('aria-describedby');
      else anchor.setAttribute('aria-describedby', previousDescription);
    }
    anchor = null;
  };
  hideFieldHelp = hide;
  const show = target => {
    const control = target.closest('[data-fin-help]');
    if (!control || control === anchor) return;
    hide(); anchor = control;
    previousDescription = control.getAttribute('aria-describedby');
    control.setAttribute('aria-describedby', [previousDescription, tooltip.id].filter(Boolean).join(' '));
    tooltip.textContent = control.getAttribute('data-fin-help');
    tooltip.style.width = `${Math.max(0, Math.min(320, innerWidth - 24))}px`;
    tooltip.classList.add('is-open');
    const rect = control.getBoundingClientRect(), bounds = tooltip.getBoundingClientRect();
    tooltip.style.left = `${Math.max(12, Math.min(rect.left, innerWidth - bounds.width - 12))}px`;
    tooltip.style.top = `${rect.bottom + bounds.height + 16 <= innerHeight ? rect.bottom + 8 : Math.max(12, rect.top - bounds.height - 8)}px`;
  };
  section.addEventListener('pointerover', event => show(event.target));
  section.addEventListener('pointerout', event => {
    if (anchor && !anchor.contains(event.relatedTarget)) hide();
  });
  section.addEventListener('focusin', event => show(event.target));
  section.addEventListener('focusout', hide);
  section.addEventListener('keydown', event => { if (event.key === 'Escape') hide(); });
  section.addEventListener('click', hide);
  window.addEventListener('scroll', hide, true);
  window.addEventListener('resize', hide);
}

function wireFinanceSplitHelp() {
  const button = el('financeSplitHelpBtn'), tooltip = el('financeSplitTooltip');
  // The card's backdrop filter creates a containing block for fixed children.
  document.body.appendChild(tooltip);
  const position = () => {
    if (!tooltip.classList.contains('is-open')) return;
    const width = document.documentElement.clientWidth, height = document.documentElement.clientHeight;
    tooltip.style.width = `${Math.max(0, Math.min(320, width - 24))}px`;
    const anchor = button.getBoundingClientRect(), bounds = tooltip.getBoundingClientRect();
    tooltip.style.left = `${Math.max(12, Math.min(anchor.right - bounds.width, width - bounds.width - 12))}px`;
    tooltip.style.top = `${anchor.bottom + bounds.height + 16 <= height ? anchor.bottom + 8 : Math.max(12, anchor.top - bounds.height - 8)}px`;
  };
  const show = () => { tooltip.classList.add('is-open'); position(); };
  const hide = () => tooltip.classList.remove('is-open');
  for (const event of ['pointerenter', 'focus', 'click']) button.addEventListener(event, show);
  button.addEventListener('pointerleave', () => { if (document.activeElement !== button) hide(); });
  button.addEventListener('blur', hide);
  button.addEventListener('keydown', event => { if (event.key === 'Escape') { hide(); button.blur(); } });
  document.addEventListener('pointerdown', event => { if (!button.contains(event.target)) hide(); });
  window.addEventListener('scroll', position, {capture:true,passive:true});
  window.addEventListener('resize', position);
}
