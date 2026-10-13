import { readPortalHistory } from '../../js/propio-history.js';
import { readPortalRecords } from '../../js/propio-history-records.js';
import { readPortalPaginator, portalRangeContext, collectPortalPages } from '../../js/propio-history-pages.js';

export function createHistoryObserver({ document, documentId, send, now = () => Date.now() }) {
  const visible = element => !element.hidden && element.getClientRects().length > 0 && document.defaultView.getComputedStyle(element).visibility !== 'hidden';
  let enabled = false, stopped = false, candidate = '', candidateAt = 0, sent = '', running = null, scanned = '', lastScanAt = 0;
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  function snapshot() {
    const found = readPortalHistory(document, visible);
    if (!found) return null;
    const pager = readPortalPaginator(found.table, visible);
    const rows = enabled ? readPortalRecords(found.table, visible, now()) : { records: [], invalid: 0 };
    if (!rows) return null;
    return { ...found, ...rows, pager, range: pager?.range, context: portalRangeContext(document, found.table), hasFirst: Boolean(pager?.buttons.first) };
  }
  async function publish(found, coverage = 'page', records = found.records, count = found.summary.count, invalid = found.invalid) {
    for (let i = 0; i < Math.max(1, records.length); i += 100) {
      const result = await send({ kind: 'portal-history', documentId, count, invalid, coverage, records: records.slice(i, i + 100) });
      if (!result?.ok) return false;
    }
    return true;
  }
  function todayRange() {
    const day = new Date(now()), iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    const us = `${day.getMonth() + 1}/${day.getDate()}/${day.getFullYear()}`;
    const long = day.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const fields = [...document.querySelectorAll('input.mat-datepicker-input, input[type="date"]')].filter(visible);
    return fields.length === 2 && fields.every(input => [iso, us, long, us.replace(/^(\d)\//, '0$1/').replace(/\/(\d)\//, '/0$1/')].includes(input.value.trim()));
  }
  async function scan(initial) {
    const key = `${initial.context}|${initial.range.total}`;
    if (running || document.documentElement.dataset.propioHistoryScan || !todayRange() || initial.range.total > 2000 || (scanned === key && now() - lastScanAt < 30000)) return;
    scanned = key; lastScanAt = now();
    const run = running = { controller: new AbortController(), context: initial.context, external: false };
    document.documentElement.dataset.propioHistoryScan = 'recovery';
    const pages = new Map();
    try {
      const read = () => {
        const found = snapshot();
        if (found && !run.controller.signal.aborted && found.range) pages.set(found.range.start, found);
        return found;
      };
      await collectPortalPages({ read, signal: run.controller.signal, canRestore: () => !run.external,
        move: async action => {
          const before = snapshot(), button = before?.pager?.buttons[action];
          if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') throw Error('Paginación no disponible');
          const expected = action === 'first' ? 1 : action === 'previous' ? Math.max(1, before.range.start - before.range.size) : before.range.start + before.range.size;
          let changedAt = 0;
          const observer = new document.defaultView.MutationObserver(() => { changedAt = now(); });
          observer.observe(before.table, { childList: true, subtree: true, characterData: true });
          try {
            button.click(); const deadline = now() + 15000;
            while (now() < deadline) {
              if (run.external) throw Error('Historial cambiado');
              const found = snapshot();
              if (!found || found.context !== run.context) throw Error('Historial cambiado');
              const loading = found.table.closest('[aria-busy="true"]') || [...found.table.parentElement.querySelectorAll('[role="progressbar"],mat-progress-bar,mat-progress-spinner')].some(visible);
              if (changedAt && now() - changedAt >= 250 && !loading && found.range?.start === expected && found.summary.count === found.range.end - found.range.start + 1) return found;
              await pause(80);
            }
            throw Error('Historial sin confirmar');
          } finally { observer.disconnect(); }
        } });
      if (!run.controller.signal.aborted && !run.external) {
        const values = [...pages.values()], records = values.flatMap(page => page.records), invalid = values.reduce((sum, page) => sum + page.invalid, 0);
        if (await publish(initial, 'range', records, initial.range.total, invalid)) { scanned = key; lastScanAt = now(); }
      }
    } catch { /* Keep the visible-page recovery; a partial scan never claims full coverage. */ }
    finally { if (document.documentElement.dataset.propioHistoryScan === 'recovery') delete document.documentElement.dataset.propioHistoryScan; running = null; }
  }
  function interrupt(event) {
    if (running && (event.type !== 'click' || event.isTrusted)) { running.external = true; running.controller.abort(); }
  }
  for (const kind of ['click', 'input', 'change']) document.addEventListener(kind, interrupt, true);
  async function sample(historyEnabled) {
    if (stopped) return;
    if (typeof historyEnabled === 'boolean' && enabled !== historyEnabled) {
      enabled = historyEnabled; candidate = ''; sent = ''; scanned = '';
      if (!enabled) running?.controller.abort();
    }
    if (running || document.documentElement.dataset.propioHistoryScan) return;
    const found = snapshot();
    if (!found) { candidate = ''; sent = ''; return; }
    const key = JSON.stringify([found.context, found.range, found.signature, found.records, found.invalid, enabled]);
    if (key !== candidate) { candidate = key; candidateAt = now(); return; }
    if (now() - candidateAt < 750) return;
    if (key !== sent && await publish(found)) sent = key;
    if (enabled && found.pager && found.range.total > found.summary.count) void scan(found);
  }
  function stop() { stopped = true; running?.controller.abort(); for (const kind of ['click', 'input', 'change']) document.removeEventListener(kind, interrupt, true); }
  return { sample, stop };
}
