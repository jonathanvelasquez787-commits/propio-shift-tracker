export const DEFAULT_FINANCE_SPLIT = [50, 30, 20];

export function validFinanceSplit(value) {
  return Array.isArray(value) && value.length === 3
    && value.every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100)
    && Math.abs(value.reduce((sum, n) => sum + n, 0) - 100) < 1e-6;
}

export function financePlanProjection(hours, days, rate, split) {
  const minutes = Number(hours) * 60;
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
  const budget = rows.reduce((sum, row) => sum + Math.max(0, Number(row.targetAmount) || 0), 0);
  const paid = payments.reduce((sum, payment) => sum + payment.usd, 0);
  const fixed = payments.filter(p => p.expenseType === 'fixed').reduce((sum, p) => sum + p.usd, 0);
  return { budget, paid, difference: budget - paid, fixed, variable: paid - fixed };
}

export function financeSavingsMonthly(row) {
  const months = Number(row.savingsMonths);
  const validMonths = Number.isInteger(months) && months >= 1 && months <= 120 ? months : 6;
  return { months: validMonths, monthly: Math.max(0, Number(row.targetAmount) - (Number(row.assignedAmount) || 0)) / validMonths };
}
