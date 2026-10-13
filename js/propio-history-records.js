import { parsePortalNumber } from './propio-history.js';

export function validatePortalRecord(value, now = Date.now()) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const { customerId, callDate, callStart, billable, dropped } = value;
  if (typeof customerId !== 'string' || !/^\d{1,20}$/.test(customerId)) return null;
  const date = typeof callDate === 'string' && callDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const clock = typeof callStart === 'string' && callStart.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!date || !clock || !/^(Yes|No)$/i.test(billable || '') || !/^(Yes|No)$/i.test(dropped || '')) return null;
  const [month, day, year] = date.slice(1).map(Number), hour = Number(clock[1]), minute = Number(clock[2]);
  if (year < 2000 || year > 2100 || hour < 1 || hour > 12 || minute > 59) return null;
  const start = new Date(year, month - 1, day, hour % 12 + (clock[3].toUpperCase() === 'PM' ? 12 : 0), minute);
  if (start.getFullYear() !== year || start.getMonth() !== month - 1 || start.getDate() !== day) return null;
  const durationMin = parsePortalNumber(value.durationMin), amount = parsePortalNumber(value.pay);
  if (durationMin === null || durationMin < 0 || durationMin > 1440 || amount === null || amount < 0 || amount > 100000) return null;
  if (start.getTime() + durationMin * 60000 > now) return null;
  return { customerId, callDate, callStart: `${hour}:${String(minute).padStart(2, '0')} ${clock[3].toUpperCase()}`,
    durationMin, billable: /^yes$/i.test(billable) ? 'Yes' : 'No', dropped: /^yes$/i.test(dropped) ? 'Yes' : 'No', pay: `$${amount.toFixed(2)}` };
}

export function portalRecordKey(record) { return `${record.customerId}|${record.callDate}|${record.callStart}`; }
export function portalRecordsText(records) {
  return records.map(r => [r.customerId, r.callDate, r.callStart, r.durationMin, r.billable, r.dropped, r.pay].join('\t')).join('\n');
}

export function readPortalRecords(table, visible, now = Date.now()) {
  const header = table.querySelector('tr:has(th), mat-header-row, [role="row"]:has([role="columnheader"])');
  if (!header) return null;
  const headers = [...header.querySelectorAll('th, mat-header-cell, [role="columnheader"]')];
  const names = headers.map(cell => String(cell.innerText ?? cell.textContent).toLowerCase().replace(/[^a-z]/g, ''));
  const columns = ['customerid', 'calldate', 'callstart', 'durationminutes', 'billable', 'dropped', 'pay'].map(name => names.indexOf(name));
  if (columns[3] < 0) columns[3] = names.findIndex(name => ['durationmin', 'durationmins'].includes(name));
  if (columns.some(index => index < 0)) return null;
  const records = []; let invalid = 0;
  for (const row of table.querySelectorAll('tbody tr, mat-row, [role="row"]')) {
    if (row === header || !visible(row) || row.closest('table, mat-table, [role="table"], [role="grid"]') !== table || row.matches('tfoot tr, .mat-footer-row, .mat-mdc-footer-row')) continue;
    const cells = [...row.children].filter(cell => cell.matches('td, mat-cell, [role="cell"], [role="gridcell"]'));
    if (cells.length !== headers.length || cells.some(cell => Number(cell.getAttribute('colspan') || 1) !== 1)) { invalid++; continue; }
    const fields = columns.map(index => String(cells[index].innerText ?? cells[index].textContent).trim());
    const record = validatePortalRecord(Object.fromEntries(['customerId', 'callDate', 'callStart', 'durationMin', 'billable', 'dropped', 'pay'].map((key, i) => [key, fields[i]])), now);
    if (record) records.push(record); else invalid++;
  }
  return { records, invalid };
}
