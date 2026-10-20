import {validPayReceipts} from './pay-receipt-model.js';
export const DEFAULT_FINANCE_SPLIT = [50, 30, 20];

export function financeReservationPlan(queue,available,isMeta) {
  const plan=[];let remainingAvailable=Math.max(0,available);
  for(const row of queue){
    if(remainingAvailable<=0.004)break;
    const assigned=Number(row.assignedAmount)||0,target=Number(row.targetAmount)||0,remaining=Math.max(0,target-assigned);
    if(remaining<=1e-9||(isMeta(row)&&remaining<=0.004))continue;
    const amount=Math.min(remainingAvailable,remaining);
    plan.push({row,amount,nextAssigned:amount===remaining?target:assigned+amount});remainingAvailable-=amount;
  }
  return plan;
}

export function validFinanceSplit(value) {
  return Array.isArray(value) && value.length === 3
    && value.every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100)
    && Math.abs(value.reduce((sum, n) => sum + n, 0) - 100) < 1e-6;
}

export function financePlanProjection(hours, days, rate, split, existingGoalMinutes = undefined) {
  const unchangedHours = typeof existingGoalMinutes === 'number' && Number.isFinite(existingGoalMinutes)
    && Number(hours) === Number((existingGoalMinutes / 60).toFixed(6));
  const minutes = unchangedHours ? existingGoalMinutes : Number(hours) * 60;
  const dollars = minutes * Number(rate);
  const projected = dollars * Number(days) * 4;
  if (!Number.isFinite(minutes) || minutes < 0 || minutes > 1440
    || !Number.isInteger(Number(days)) || days < 1 || days > 7
    || !Number.isFinite(Number(rate)) || rate <= 0
    || !Number.isFinite(dollars) || !Number.isFinite(projected) || !validFinanceSplit(split)) return null;
  return { minutes, dollars, projected, distribution: split.map(pct => projected * pct / 100) };
}

export function validFinanceDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T12:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validFinancePayment(record) {
  return record && typeof record === 'object' && !Array.isArray(record)
    && typeof record.id === 'string' && !!record.id.trim()
    && typeof record.rowId === 'string' && !!record.rowId.trim()
    && typeof record.name === 'string' && record.name.length > 0 && record.name.length <= 200
    && ['fixed', 'variable'].includes(record.expenseType)
    && validFinanceDate(record.date) && typeof record.usd === 'number'
    && Number.isFinite(record.usd) && record.usd > 0 && record.usd <= 1e9;
}

export function financePaymentRows(records, month, rowId = null) {
  const seen = new Set();
  return (Array.isArray(records) ? records : []).filter(record => {
    if (!validFinancePayment(record) || seen.has(record.id)) return false;
    seen.add(record.id);
    return record.date.startsWith(month + '-') && (!rowId || record.rowId === rowId);
  });
}

export function financeMonthTotals(rows, records, month) {
  const payments = financePaymentRows(records, month);
  return financeMonthTotalsFromPayments(rows, payments);
}

export function financeMonthTotalsFromPayments(rows, payments) {
  const budget = rows.reduce((sum, row) => sum + Math.max(0, Number(row.targetAmount) || 0), 0);
  const paid = payments.reduce((sum, payment) => sum + payment.usd, 0);
  const fixed = payments.filter(p => p.expenseType === 'fixed').reduce((sum, p) => sum + p.usd, 0);
  return { budget, paid, difference: budget - paid, fixed, variable: paid - fixed };
}

export function financeExpenseStatus(row, records, month) {
  const paid = financePaymentRows(records, month, row.id).reduce((sum, payment) => sum + payment.usd, 0);
  return financeExpenseStatusFromPaid(row, paid);
}

export function financeExpenseStatusFromPaid(row, paid) {
  const budget = Math.max(0, Number(row.targetAmount) || 0);
  const difference = budget - paid;
  return {
    paid,
    remaining: difference > 0.004 ? difference : 0,
    excess: difference < -0.004 ? -difference : 0,
    percentPaid: budget > 0 ? paid / budget * 100 : null,
    paymentStatus: paid <= 0 ? 'none' : difference > 0.004 ? 'partial' : 'paid',
  };
}

export function financeBudgetPeriod(row) {
  return ['weekly', 'fortnightly', 'monthly', 'onetime'].includes(row.budgetPeriod) ? row.budgetPeriod : 'unspecified';
}

export function financeCanCompareMonthlyBudget(row) {
  const target = Number(row.targetAmount);
  return financeBudgetPeriod(row) === 'monthly' && Number.isFinite(target)
    && Math.abs(target * 100 - Math.round(target * 100)) < 1e-6;
}

export function validFinanceSettings(config) {
  if ('payReceipts' in config && !validPayReceipts(config.payReceipts)) return false;
  const record = value => value && typeof value === 'object' && !Array.isArray(value);
  const fixed = ['casa','servicios','transporte','comida','deuda','ahorro','otro'];
  const unsafe = id => ['__proto__','constructor','prototype'].includes(id);
  const categoryIds = new Set(fixed);
  if ('customFinanceCategories' in config) {
    if (!Array.isArray(config.customFinanceCategories)) return false;
    for (const category of config.customFinanceCategories) {
      if (!record(category) || typeof category.id !== 'string' || !category.id.trim() || unsafe(category.id)
        || categoryIds.has(category.id) || typeof category.label !== 'string' || !category.label.trim()) return false;
      categoryIds.add(category.id);
    }
  }
  const rowIds = new Set();
  if (config.exchangeRate != null && (!Number.isFinite(Number(config.exchangeRate)) || Number(config.exchangeRate) < 0 || !Number.isFinite(Number(config.exchangeRate) * 1e9))) return false;
  if ('financeCategories' in config) {
    if (!record(config.financeCategories)) return false;
    for (const [id, category] of Object.entries(config.financeCategories)) {
      if (unsafe(id) || !record(category) || !Array.isArray(category.rows)) return false;
      for (const row of category.rows) {
        if (!record(row) || typeof row.id !== 'string' || !row.id.trim() || rowIds.has(row.id)
          || typeof row.name !== 'string' || !row.name.trim()) return false;
        const target = Number(row.targetAmount);
        if (!['number','string'].includes(typeof row.targetAmount) || String(row.targetAmount).trim() === ''
          || !Number.isFinite(target) || target < 0 || target > 1e9) return false;
        if (row.assignedAmount != null && row.assignedAmount !== '' && (!['number','string'].includes(typeof row.assignedAmount)
          || !Number.isFinite(Number(row.assignedAmount)) || Number(row.assignedAmount) < 0)) return false;
        if (row.kind != null && !['gasto','meta'].includes(row.kind)) return false;
        if (row.manualPaid != null && typeof row.manualPaid !== 'boolean') return false;
        rowIds.add(row.id);
      }
    }
  }
  if ('financePayments' in config) {
    if (!Array.isArray(config.financePayments)) return false;
    const ids = new Set();
    for (const payment of config.financePayments) {
      if (!validFinancePayment(payment) || ids.has(payment.id)) return false;
      ids.add(payment.id);
    }
  }
  if (config.financePlanning != null && (!record(config.financePlanning)
    || (config.financePlanning.split != null && !validFinanceSplit(config.financePlanning.split))
    || (config.financePlanning.daysPerWeek != null && (!Number.isInteger(Number(config.financePlanning.daysPerWeek)) || config.financePlanning.daysPerWeek < 1 || config.financePlanning.daysPerWeek > 7)))) return false;
  return true;
}

export function financeSavingsMonthly(row) {
  const months = Number(row.savingsMonths);
  if (!Number.isInteger(months) || months < 1 || months > 120) return { months: null, monthly: null };
  return { months, monthly: Math.max(0, Number(row.targetAmount) - (Number(row.assignedAmount) || 0)) / months };
}
