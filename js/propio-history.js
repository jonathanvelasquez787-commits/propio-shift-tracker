export function parsePortalNumber(value) {
  let text = String(value ?? '').trim().replace(/^(-?)\s*(?:USD\s*|\$\s*)/i, '$1').replace(/[\s\u00a0]/g, '');
  if (!/^-?(?:\d[\d.,]*|[.,]\d+)$/.test(text)) return null;
  if (text.includes(',') && text.includes('.')) {
    const decimal = text.lastIndexOf(',') > text.lastIndexOf('.') ? ',' : '.';
    const group = decimal === ',' ? '.' : ',';
    const parts = text.split(decimal);
    if (parts.length !== 2 || !/^\d+$/.test(parts[1])) return null;
    const escaped = group === '.' ? '\\.' : ',';
    if (!new RegExp(`^-?\\d{1,3}(?:${escaped}\\d{3})+$`).test(parts[0])) return null;
    text = text.split(group).join('').replace(decimal, '.');
  } else if (text.includes(',')) {
    text = /^-?\d{1,3}(?:,\d{3})+$/.test(text) ? text.replace(/,/g, '') : text.replace(',', '.');
  }
  if (!/^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(text)) return null;
  const number = Number(text);
  return Number.isFinite(number) && Math.abs(number) <= 100000000 ? number : null;
}

export function summarizePortalRows(rows) {
  let minutesUnits = 0, payUnits = 0, missingMinutes = 0, missingPay = 0;
  for (const row of rows) {
    const minutes = parsePortalNumber(row.minutes), pay = parsePortalNumber(row.pay);
    if (minutes === null || minutes < 0) missingMinutes++;
    else minutesUnits += Math.round(minutes * 1000000);
    if (pay === null) missingPay++;
    else payUnits += Math.round(pay * 1000000);
  }
  return { count: rows.length, minutes: minutesUnits / 1000000, pay: payUnits / 1000000, missingMinutes, missingPay };
}

const normalize = value => String(value).toLowerCase().replace(/[^a-z]/g, '');
export function portalColumns(headers) {
  const names = headers.map(normalize);
  const minutes = names.findIndex(name => ['durationminutes', 'durationmin', 'durationmins'].includes(name));
  const pay = names.indexOf('pay');
  const history = names.some(name => ['customerid', 'calldate', 'callstart'].includes(name));
  return minutes >= 0 && pay >= 0 && history ? { minutes, pay } : null;
}

export function readPortalHistory(document, visible = element => !element.hidden) {
  const tables = [...document.querySelectorAll('table, mat-table, [role="table"], [role="grid"]')];
  for (const table of tables) {
    if (!visible(table)) continue;
    const header = table.querySelector('tr:has(th), mat-header-row, [role="row"]:has([role="columnheader"])');
    if (!header) continue;
    const headers = [...header.querySelectorAll('th, mat-header-cell, [role="columnheader"]')];
    const columns = portalColumns(headers.map(cell => cell.innerText ?? cell.textContent));
    if (!columns) continue;
    const rows = [];
    for (const row of table.querySelectorAll('tbody tr, mat-row, [role="row"]')) {
      if (row === header || !visible(row) || row.closest('table, mat-table, [role="table"], [role="grid"]') !== table) continue;
      if (row.matches('tfoot tr, .mat-footer-row, .mat-mdc-footer-row')) continue;
      const cells = [...row.children].filter(cell => cell.matches('td, mat-cell, [role="cell"], [role="gridcell"]'));
      if (cells.length !== headers.length || cells.some(cell => Number(cell.getAttribute('colspan') || 1) !== 1)) continue;
      // Only read the two numeric columns, never customer identifiers or call details.
      rows.push({ minutes: cells[columns.minutes].innerText ?? cells[columns.minutes].textContent,
        pay: cells[columns.pay].innerText ?? cells[columns.pay].textContent });
    }
    return { table, summary: summarizePortalRows(rows), signature: JSON.stringify(rows) };
  }
  return null;
}
