import { settings, state, setAppSettings, setAppState } from './app-context.js';
import { ui, translateText, displayLocale } from './i18n.js';
import { DEFAULT_FINANCE_SPLIT, validFinanceSplit, financePlanProjection, validFinanceDate,
  financePaymentRows, financeMonthTotals, financeSavingsMonthly } from './finance-plan-model.js';

let ctx = {};
let selectedMonth = '';
let planDraft = false;
const expandedRows = new Set();
const rowDrafts = new Map();
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
const rows = () => ctx.getExpenseRows();
const selected = () => selectedMonth || currentMonth();
const payments = rowId => financePaymentRows(settings.financePayments, selected(), rowId);
const splitSettings = () => validFinanceSplit(settings.financePlanning?.split) ? settings.financePlanning.split : DEFAULT_FINANCE_SPLIT;
const configuredDays = () => {
  const stored = Number(settings.financePlanning?.daysPerWeek);
  if (Number.isInteger(stored) && stored >= 1 && stored <= 7) return stored;
  const count = Object.values(settings.weeklySchedule || {}).filter(day => day && !day.off).length;
  return count >= 1 && count <= 7 ? count : 5;
};

export function configureFinancePlanning(context) { ctx = context; }

export function captureFinanceDetails() {
  document.querySelectorAll('[data-fin-plan-row]').forEach(detail => {
    const id = detail.getAttribute('data-fin-plan-row');
    if (detail.open) expandedRows.add(id); else expandedRows.delete(id);
  });
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
  const header = isMeta ? translateText('Plan de ahorro') : translateText('Presupuesto y pagos del mes');
  const draft = rowDrafts.get(`${row.id}:${selected()}`) || {};
  let body;
  if (isMeta) {
    const saving = financeSavingsMonthly(row);
    body = ui`${saving.months === null ? ui`<p class="sched-hint">El plazo es opcional. Guarda uno para calcular el aporte mensual.</p>` : ui`<div class="fin-plan-metrics">${metric(translateText('Aporte mensual orientativo'), saving.monthly)}</div>`}
      <label class="fin-plan-field">Meses para completar<input type="number" min="1" max="120" step="1" value="${ctx.escapeHtml(draft.months ?? saving.months ?? '')}" data-fin-savings-months aria-label="Meses para completar"/></label>
      <button class="fin-ghost-btn" type="button" data-fin-savings-save="${rowId}" data-fin-cat="${categoryId}">Guardar plazo</button>`;
  } else {
    const records = payments(row.id);
    const paid = records.reduce((sum, payment) => sum + payment.usd, 0);
    const total = financeMonthTotals(rows(), settings.financePayments, selected());
    const percent = total.paid > 0 ? (paid / total.paid * 100).toLocaleString(displayLocale(), { maximumFractionDigits: 1 }) : '0';
    const expenseType = row.expenseType === 'variable' ? translateText('Gasto variable') : translateText('Gasto fijo');
    const currency = String(settings.currencyLabel || '').trim();
    const hasCurrency = currency && Number(settings.exchangeRate) > 0;
    let draftUsd = draft.usd || '', draftLocal = draft.local || '';
    if (!draftUsd && draftLocal && Number(draft.localRate) > 0) {
      const originalUsd = ctx.parseAmount(draftLocal) / Number(draft.localRate);
      if (Number.isFinite(originalUsd)) {
        if (!hasCurrency) { draftUsd = originalUsd.toFixed(2); draftLocal = ''; }
        else if (Number(draft.localRate) !== Number(settings.exchangeRate)) draftLocal = (originalUsd * Number(settings.exchangeRate)).toFixed(2);
      }
    }
    const date = draft.date || (selected() === currentMonth() ? localDate() : `${selected()}-01`);
    body = ui`<div class="fin-plan-row-heading"><span>${expenseType}</span><span>${ctx.escapeHtml(selected())}</span></div>
      <div class="fin-plan-metrics">${metric(translateText('Presupuesto actual'), Number(row.targetAmount))}${metric(translateText('Pagado este mes'), paid)}${metric(translateText('Diferencia'), Number(row.targetAmount) - paid)}<span class="fin-plan-metric"><span>% del gasto real</span><strong>${percent}%</strong></span></div>
      <div class="fin-payment-controls">
        <label class="fin-plan-field">Pago en USD<input data-fin-payment-usd type="text" value="${ctx.escapeHtml(draftUsd)}" inputmode="decimal" autocomplete="off"/></label>
        ${hasCurrency ? ui`<label class="fin-plan-field">Pago en ${ctx.escapeHtml(currency)}<input data-fin-payment-local type="text" value="${ctx.escapeHtml(draftLocal)}" inputmode="decimal" autocomplete="off"/></label>` : ''}
        <label class="fin-plan-field">Fecha<input data-fin-payment-date type="date" value="${ctx.escapeHtml(date)}"/></label>
        <button class="fin-mini-btn-primary" type="button" data-fin-payment-save="${rowId}" data-fin-cat="${categoryId}">Registrar pago</button>
      </div><p class="sched-hint">Registrar un pago conserva lo asignado. No modifica tus llamadas ni ganancias.</p>
      <div class="fin-payment-history">${paymentHistoryHtml(records)}</div>`;
  }
  return ui`<details class="fin-plan-row" data-fin-plan-row="${rowId}" ${expandedRows.has(row.id) ? 'open' : ''}>
    <summary>${header}<span aria-hidden="true">⌄</span></summary><div class="fin-plan-row-body">${body}</div></details>`;
}

function projectionFromInputs() {
  if (['financePlanHoursInput', 'financePlanDaysInput', 'financePlanFixedInput', 'financePlanVariableInput', 'financePlanSavingsInput'].some(id => !String(el(id).value).trim())) return null;
  return financePlanProjection(Number(el('financePlanHoursInput').value), Number(el('financePlanDaysInput').value), Number(settings.rate),
    ['financePlanFixedInput', 'financePlanVariableInput', 'financePlanSavingsInput'].map(id => Number(el(id).value)));
}

export function updateFinancePlanPreview() {
  const split = ['financePlanFixedInput', 'financePlanVariableInput', 'financePlanSavingsInput'].map(id => Number(el(id).value));
  const total = split.reduce((sum, number) => sum + number, 0);
  const projection = projectionFromInputs();
  const minutes = Number(el('financePlanHoursInput').value) * 60;
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

export function renderFinancePlanning() {
  if (!el('financePlanHoursInput')) return;
  if (!planDraft) {
    el('financePlanHoursInput').value = Number((Number(settings.productiveGoalMin || 0) / 60).toFixed(6));
    el('financePlanDaysInput').value = configuredDays();
    ['financePlanFixedInput', 'financePlanVariableInput', 'financePlanSavingsInput'].forEach((id, i) => { el(id).value = splitSettings()[i]; });
  }
  el('financePlanRate').textContent = ui`Tarifa de Ajustes: ${ctx.money(Number(settings.rate))}/min`;
  el('financeMonthInput').value = selected();
  const totals = financeMonthTotals(rows(), settings.financePayments, selected());
  el('financeMonthTotals').innerHTML = metric(translateText('Presupuesto actual'), totals.budget)
    + metric(translateText('Pagos registrados'), totals.paid) + metric(translateText('Diferencia'), totals.difference);
  el('financePaymentHistory').innerHTML = paymentHistoryHtml(payments()) || ui`<p class="sched-hint">Sin pagos registrados en este mes.</p>`;
  updateFinancePlanPreview();
}

export function saveFinancePlan() {
  const projection = projectionFromInputs();
  if (!projection) { updateFinancePlanPreview(); return false; }
  const previousSettings = JSON.parse(JSON.stringify(settings));
  const previousState = JSON.parse(JSON.stringify(state));
  settings.financePlanning = { daysPerWeek: Number(el('financePlanDaysInput').value), split: ['financePlanFixedInput', 'financePlanVariableInput', 'financePlanSavingsInput'].map(id => Number(el(id).value)) };
  if (ctx.applyGoalValues(projection.minutes, projection.dollars, 'global', ctx.todayCallDateKey(), ctx.saveAll) === false) {
    setAppSettings(previousSettings); setAppState(previousState); ctx.render(); return false;
  }
  planDraft = false;
  ctx.render();
  el('financePlanSaveStatus').textContent = ui`Meta diaria y distribución guardadas: ${projection.minutes} min.`;
  return true;
}

export function addFinancePayment(catId, rowId, rawUsd, rawLocal, date) {
  const row = ctx.findRow(catId, rowId);
  if (!row || ctx.isMeta(row)) return false;
  let amount = ctx.parseAmount(rawUsd);
  if (!String(rawUsd || '').trim() && String(rawLocal || '').trim() && Number(settings.exchangeRate) > 0) amount = ctx.parseAmount(rawLocal) / Number(settings.exchangeRate);
  const usd = Math.round(amount * 100) / 100;
  if (!Number.isFinite(usd) || usd <= 0 || usd > 1e9 || !validFinanceDate(date)) {
    ctx.toast(translateText('Ingresa un pago mayor a cero y una fecha válida.')); return false;
  }
  const previous = settings.financePayments;
  const record = { id: ctx.makeLocalId(), rowId, name: String(row.name).slice(0, 200), categoryId: catId,
    expenseType: row.expenseType === 'variable' ? 'variable' : 'fixed', date, usd };
  settings.financePayments = [...(Array.isArray(previous) ? previous : []), record];
  if (ctx.saveSettingsOnly() === false) { if (previous === undefined) delete settings.financePayments; else settings.financePayments = previous; return false; }
  rowDrafts.delete(`${rowId}:${selected()}`);
  ctx.render(); ctx.toast(translateText('Pago registrado')); return true;
}

export function deleteFinancePayment(id) {
  const record = (Array.isArray(settings.financePayments) ? settings.financePayments : []).find(payment => payment?.id === id);
  if (!record) return;
  ctx.appConfirm(translateText('¿Eliminar este pago del historial? La asignación del gasto se conserva.'), () => {
    const previous = settings.financePayments;
    settings.financePayments = previous.filter(payment => payment?.id !== id);
    if (ctx.saveSettingsOnly() === false) { settings.financePayments = previous; return false; }
    ctx.render(); ctx.toast(translateText('Pago eliminado'));
  });
}

export function saveFinanceSavingsMonths(catId, rowId, months) {
  const row = ctx.findRow(catId, rowId), value = Number(months);
  if (!row || !ctx.isMeta(row) || !Number.isInteger(value) || value < 1 || value > 120) {
    ctx.toast(translateText('Usa un plazo entre 1 y 120 meses.')); return false;
  }
  const previous = row.savingsMonths;
  row.savingsMonths = value;
  if (ctx.saveSettingsOnly() === false) { if (previous === undefined) delete row.savingsMonths; else row.savingsMonths = previous; return false; }
  rowDrafts.delete(`${rowId}:${selected()}`);
  ctx.render(); ctx.toast(translateText('Plazo guardado')); return true;
}

export function wireFinancePlanning() {
  const section = el('financeSection');
  if (!section || section.dataset.planningWired) return;
  section.dataset.planningWired = 'true';
  wireFinanceSplitHelp();
  section.addEventListener('input', event => {
    const target = event.target;
    if (target.matches('[data-fin-plan-input]')) { planDraft = true; el('financePlanSaveStatus').textContent = ''; updateFinancePlanPreview(); }
    const body = target.closest('.fin-plan-row-body');
    if (body && target.matches('[data-fin-payment-usd]')) { const local = body.querySelector('[data-fin-payment-local]'); if (local) local.value = ''; }
    if (body && target.matches('[data-fin-payment-local]')) body.querySelector('[data-fin-payment-usd]').value = '';
    if (body && target.matches('[data-fin-payment-usd], [data-fin-payment-local], [data-fin-payment-date], [data-fin-savings-months]')) {
      const rowId = body.closest('[data-fin-plan-row]').getAttribute('data-fin-plan-row');
      rowDrafts.set(`${rowId}:${selected()}`, {usd:body.querySelector('[data-fin-payment-usd]')?.value || '',
        local:body.querySelector('[data-fin-payment-local]')?.value || '',date:body.querySelector('[data-fin-payment-date]')?.value || '',months:body.querySelector('[data-fin-savings-months]')?.value,localRate:Number(settings.exchangeRate)});
    }
  });
  section.addEventListener('change', event => {
    if (event.target.id !== 'financeMonthInput') return;
    const month = event.target.value;
    if (!validFinanceDate(month + '-01')) { event.target.value = selected(); return; }
    selectedMonth = month;
    ctx.renderFinanceSection();
  });
  section.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.id === 'saveFinancePlanBtn') { saveFinancePlan(); return; }
    if (button.hasAttribute('data-fin-payment-delete')) { deleteFinancePayment(button.getAttribute('data-fin-payment-delete')); return; }
    if (button.hasAttribute('data-fin-payment-save')) {
      const body = button.closest('.fin-plan-row-body');
      addFinancePayment(button.getAttribute('data-fin-cat'), button.getAttribute('data-fin-payment-save'), body.querySelector('[data-fin-payment-usd]').value,
        body.querySelector('[data-fin-payment-local]')?.value || '', body.querySelector('[data-fin-payment-date]').value);
    }
    if (button.hasAttribute('data-fin-savings-save')) {
      saveFinanceSavingsMonths(button.getAttribute('data-fin-cat'), button.getAttribute('data-fin-savings-save'), button.closest('.fin-plan-row-body').querySelector('[data-fin-savings-months]').value);
    }
  });
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
