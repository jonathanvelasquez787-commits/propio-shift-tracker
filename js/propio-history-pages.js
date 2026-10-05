export function parsePortalRange(value) {
  const text = String(value).replace(/,/g, '').trim();
  if (/^0\s+(?:of|de)\s+0$/i.test(text)) return { start: 0, end: 0, total: 0 };
  const match = text.match(/^(\d+)\s*[-–—]\s*(\d+)\s+(?:of|de)\s+(\d+)$/i);
  if (!match) return null;
  const [start, end, total] = match.slice(1).map(Number);
  if (![start, end, total].every(Number.isSafeInteger) || start < (total ? 1 : 0) || end < start || end > total) return null;
  return { start, end, total };
}

export function readPortalPaginator(table, visible) {
  for (let ancestor = table.parentElement; ancestor; ancestor = ancestor.parentElement) {
    const candidates = [...ancestor.querySelectorAll('mat-paginator, .mat-mdc-paginator, .mat-paginator')].filter(visible);
    if (candidates.length > 1) return null;
    if (!candidates.length) continue;
    const element = candidates[0];
    const range = parsePortalRange(element.querySelector('.mat-mdc-paginator-range-label, .mat-paginator-range-label')?.textContent);
    if (!range) return null;
    const sizeText = element.querySelector('.mat-mdc-paginator-page-size-select, .mat-paginator-page-size-select, .mat-mdc-paginator-page-size-value, .mat-paginator-page-size-value')?.textContent;
    const size = Number(String(sizeText || '').match(/\d+/)?.[0]);
    if (!Number.isSafeInteger(size) || size < 1) return null;
    const buttons = {};
    for (const action of ['first', 'previous', 'next']) {
      buttons[action] = element.querySelector(`button.mat-mdc-paginator-navigation-${action}, button.mat-paginator-navigation-${action}`);
    }
    return { element, range: { ...range, size }, buttons };
  }
  return null;
}

export function portalRangeContext(document, table) {
  return JSON.stringify([document.location.pathname,
    [...document.querySelectorAll('input.mat-datepicker-input, input[type="date"]')].map(input => input.value),
    [...table.querySelectorAll('[aria-sort]')].map(cell => cell.getAttribute('aria-sort'))]);
}

export async function collectPortalPages({ read, move, signal, progress = () => {}, canRestore = () => true }) {
  const original = read();
  if (!original?.range) throw new Error('No se reconoce la paginación del historial.');
  const { total, size } = original.range;
  if (Math.ceil(total / size) > 2000) throw new Error('El período es demasiado grande. Elegí un rango de fechas más corto.');
  const pages = new Map();
  let current = original, restorationError;
  function check(snapshot, restoring = false) {
    if (!restoring && signal?.aborted) throw new Error('Cálculo cancelado.');
    if (!snapshot?.range || snapshot.context !== original.context || snapshot.range.total !== total || snapshot.range.size !== size) {
      throw new Error('El historial cambió durante el cálculo. Volvé a sumar el período.');
    }
    const { start, end } = snapshot.range;
    if (snapshot.summary.count !== (total ? end - start + 1 : 0)) throw new Error('La página todavía no muestra todas sus llamadas.');
    return snapshot;
  }
  async function step(action, restoring = false) {
    const before = check(read(), restoring);
    const after = check(await move(action, { restoring }), restoring);
    const expected = action === 'first' ? 1 : action === 'previous' ? Math.max(1, before.range.start - size) : before.range.start + size;
    if (after.range.start !== expected || after.range.end !== Math.min(total, expected + size - 1)) throw new Error('La paginación no avanzó como se esperaba.');
    current = after;
  }
  try {
    check(current);
    if (total && current.range.start !== 1 && current.hasFirst) await step('first');
    while (total && current.range.start !== 1) await step('previous');
    let count = 0;
    do {
      current = check(read());
      if (pages.has(current.range.start) || current.range.start !== (count ? count + 1 : total ? 1 : 0)) throw new Error('Falta una página del historial; no se mostrará un total incompleto.');
      pages.set(current.range.start, { signature: current.signature, summary: current.summary });
      count += current.summary.count;
      progress(count, total);
      if (current.range.end === total) break;
      await step('next');
    } while (pages.size <= 2000);
    if (count !== total) throw new Error('No se pudieron leer todas las llamadas del período.');
  } finally {
    try {
      const latest = read();
      if (canRestore() && latest?.context === original.context && latest.range.total === total && latest.range.size === size) {
        current = latest;
        if (current.range.start !== original.range.start && current.hasFirst && (original.range.start === 1 || current.range.start - original.range.start > original.range.start - 1)) await step('first', true);
        while (current.range.start > original.range.start) await step('previous', true);
        while (current.range.start < original.range.start) await step('next', true);
      }
    } catch (error) { restorationError = error; }
  }
  if (restorationError) throw new Error('Se leyeron las llamadas, pero no se pudo volver a tu página inicial. Volvé a calcular.');
  const summaries = [...pages.values()].map(page => page.summary);
  const summary = { count: total, minutes: 0, pay: 0, missingMinutes: 0, missingPay: 0 };
  for (const name of ['minutes', 'pay']) summary[name] = summaries.reduce((sum, page) => sum + Math.round(page[name] * 1000000), 0) / 1000000;
  for (const name of ['missingMinutes', 'missingPay']) summary[name] = summaries.reduce((sum, page) => sum + page[name], 0);
  return { summary, pages, context: original.context, total, size };
}
