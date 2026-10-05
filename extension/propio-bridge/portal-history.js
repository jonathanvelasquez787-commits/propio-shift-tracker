import { readPortalHistory } from '../../js/propio-history.js';
import { readPortalPaginator, portalRangeContext, collectPortalPages } from '../../js/propio-history-pages.js';

if (location.origin === 'https://interpreters.propio-ls.com' && window.top === window && !document.getElementById('pst-propio-history')) {
  const key = 'pst-portal-summary-options-v1';
  let options = {}, last = '', mountedTable, timer, totalCache = null, running = null, scanMessage = '';
  const host = document.createElement('div');
  host.id = 'pst-propio-history';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>
    :host{display:block;margin:8px 0;color-scheme:light dark;font:13px/1.5 system-ui,sans-serif;color:#203345}
    .bar{display:flex;flex-wrap:wrap;align-items:center;gap:6px 18px;padding:9px 12px;border:1px solid #ccd8df;border-radius:8px;background:#f4f8fa}
    strong{font-size:16px;font-variant-numeric:tabular-nums;color:#08687b}.scope{font-size:11px;color:#516573;flex:1;min-width:140px}
    button{border:1px solid #aabbc7;border-radius:5px;background:transparent;color:inherit;cursor:pointer;padding:4px 8px;font:inherit}
    button:focus-visible,input:focus-visible{outline:2px solid #0893b1;outline-offset:2px}.details{padding:8px 12px;font-size:12px;border:1px solid #ccd8df;border-top:0;border-radius:0 0 8px 8px;background:#f4f8fa}
    [hidden]{display:none!important}form{display:flex;flex-wrap:wrap;gap:8px;align-items:end;margin:8px 0}label{display:grid;gap:3px}input{width:110px;max-width:100%;box-sizing:border-box;padding:5px;border:1px solid #aabbc7;border-radius:4px;background:transparent;color:inherit;font:inherit}
    p{margin:0}.conversion{font-size:12px;font-weight:normal}.notice{color:#855200}output{display:block}
    @media(prefers-color-scheme:dark){:host{color:#e4edf4}.bar{background:#121d2d;border-color:#35465b}.details{background:#121d2d;border-color:#35465b}strong{color:#52d3df}.scope{color:#b0c1d1}.notice{color:#f6c873}button,input{border-color:#5b7188}}
  </style><section aria-label="Resumen del historial de Propio">
    <div class="bar"><span><strong id="minutes">—</strong> min</span><span><strong id="pay">—</strong> <span class="conversion" id="converted"></span></span><span class="scope" id="scope"></span><button id="sum-period" type="button" hidden>Sumar período</button><button id="toggle" type="button" aria-expanded="false">Detalles</button></div>
    <div class="details" id="details" hidden><p>Sumar período recorre las páginas del historial seleccionado y vuelve a tu página inicial. Usa Duration (Minutes) y Pay de Propio; no incluye llamadas en curso. Recalculá para incorporar cambios posteriores. Hasta completar el recorrido se muestra el subtotal de la página visible.</p>
      <p class="notice" id="notice"></p><form><label>Moneda secundaria<input id="currency" placeholder="Ej.: L" maxlength="8"></label><label>Cambio por 1 USD<input id="rate" type="number" min="0.000001" max="100000" step="any" placeholder="Opcional"></label><button type="submit">Guardar</button><button id="clear" type="button">Sin conversión</button></form><output id="saved" aria-live="polite"></output>
    </div></section>`;
  const $ = id => root.getElementById(id);
  const amount = value => value.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const isVisible = element => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden';
  function snapshot() {
    const found = location.pathname.startsWith('/portal') ? readPortalHistory(document, isVisible) : null;
    if (!found) return null;
    const pager = readPortalPaginator(found.table, isVisible);
    return { ...found, pager, range: pager?.range, context: portalRangeContext(document, found.table), hasFirst: Boolean(pager?.buttons.first) };
  }
  function refresh() {
    timer = null;
    const found = snapshot();
    if (!found) { host.remove(); mountedTable = null; last = ''; totalCache = null; return; }
    if (found.table !== mountedTable || !host.isConnected) { found.table.before(host); mountedTable = found.table; }
    if (!running && totalCache && (!found.range || totalCache.context !== found.context || totalCache.total !== found.range.total || totalCache.size !== found.range.size)) totalCache = null;
    const summary = totalCache && !running ? totalCache.summary : found.summary;
    const signature = JSON.stringify([summary, options, Boolean(totalCache), running?.progress, running?.controller.signal.aborted, scanMessage, Boolean(found.pager)]);
    if (signature === last) return;
    last = signature;
    $('minutes').textContent = summary.count && summary.missingMinutes === summary.count ? '—' : summary.minutes.toLocaleString('es-HN', { maximumFractionDigits: 3 });
    $('pay').textContent = summary.count && summary.missingPay === summary.count ? '—' : '$' + amount(summary.pay);
    $('converted').textContent = options.rate > 0 && options.currency && (!summary.count || summary.missingPay < summary.count) ? `≈ ${options.currency} ${amount(summary.pay * options.rate)}` : '';
    $('sum-period').hidden = !found.pager;
    $('sum-period').textContent = running ? running.controller.signal.aborted ? 'Cancelando…' : 'Cancelar' : totalCache ? 'Recalcular' : 'Sumar período';
    $('sum-period').disabled = Boolean(running?.controller.signal.aborted);
    $('scope').textContent = running ? running.controller.signal.aborted ? 'Cancelando el recorrido…' : `Sumando ${running.progress || 0}/${running.total} llamadas…` : `${totalCache ? 'Total del período' : 'Página visible'} · ${summary.count} llamada${summary.count === 1 ? '' : 's'}${summary.missingMinutes || summary.missingPay ? ' · Total parcial' : ''}`;
    if (running) { $('minutes').textContent = '—'; $('pay').textContent = '—'; $('converted').textContent = ''; }
    $('notice').textContent = [scanMessage, summary.missingMinutes || summary.missingPay ? `Datos pendientes o no reconocidos: ${summary.missingMinutes} duración(es), ${summary.missingPay} pago(s). Se excluyen de su suma.` : ''].filter(Boolean).join(' ');
  }
  function schedule() { if (!timer) timer = setTimeout(refresh, 120); }
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'style', 'class'] });
  const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
  async function movePage(action, { restoring }) {
    const before = snapshot(), run = running;
    if (!before?.pager || run.external) throw new Error('El historial cambió durante el cálculo.');
    const button = before.pager.buttons[action];
    if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') throw new Error('Propio no permite avanzar a esa página.');
    let dataChanged = false, changedAt = 0;
    const watch = new MutationObserver(() => { dataChanged = true; changedAt = Date.now(); });
    watch.observe(before.table, { subtree: true, childList: true, characterData: true });
    const expected = action === 'first' ? 1 : action === 'previous' ? Math.max(1, before.range.start - before.range.size) : before.range.start + before.range.size;
    const deadline = Date.now() + 15000;
    try {
      button.click();
      while (Date.now() < deadline) {
        // Let an already requested page settle before cancel restores the original page.
        if (run.external) throw new Error('Cálculo cancelado.');
        const current = snapshot();
        if (!current || current.context !== run.context || current.range?.total !== run.total || current.range.size !== run.size) throw new Error('El historial cambió durante el cálculo.');
        const loading = current.table.closest('[aria-busy="true"]') || [...current.table.parentElement.querySelectorAll('[role="progressbar"], mat-progress-bar, mat-progress-spinner')].some(isVisible);
        if (dataChanged && Date.now() - changedAt >= 250 && !loading && current.range.start === expected && current.summary.count === current.range.end - current.range.start + 1) return current;
        await pause(80);
      }
      throw new Error('Propio no terminó de cargar una página. No se mostrará un total incompleto.');
    } finally { watch.disconnect(); }
  }
  function invalidate(event) {
    if (event.composedPath().includes(host)) return;
    const pager = snapshot()?.pager?.element;
    if (running) {
      if (event.type === 'click' && !event.isTrusted) return;
      running.external = true; running.controller.abort();
    }
    if ((event.type !== 'click' && !pager?.contains(event.target)) || event.target.closest?.('th, mat-header-cell, [role="columnheader"]')) { totalCache = null; scanMessage = ''; schedule(); }
  }
  for (const name of ['input', 'change', 'click']) document.addEventListener(name, invalidate, true);
  $('sum-period').addEventListener('click', async () => {
    if (running) { running.controller.abort(); refresh(); return; }
    const initial = snapshot();
    if (!initial?.pager) return;
    totalCache = null; scanMessage = '';
    running = { controller: new AbortController(), context: initial.context, total: initial.range.total, size: initial.range.size, progress: 0, external: false };
    refresh();
    try {
      const result = await collectPortalPages({ read: snapshot, move: movePage, signal: running.controller.signal,
        canRestore: () => !running.external, progress: count => { running.progress = count; refresh(); } });
      if (!running.controller.signal.aborted && !running.external) totalCache = result;
    } catch (error) {
      scanMessage = error.message;
      $('details').hidden = false; $('toggle').setAttribute('aria-expanded', 'true'); $('toggle').textContent = 'Ocultar';
    } finally { running = null; last = ''; refresh(); }
  });
  $('toggle').addEventListener('click', () => {
    const expanded = $('details').hidden;
    $('details').hidden = !expanded; $('toggle').setAttribute('aria-expanded', String(expanded));
    $('toggle').textContent = expanded ? 'Ocultar' : 'Detalles';
  });
  const extensionStorage = typeof chrome !== 'undefined' && chrome.runtime?.id && chrome.storage?.local;
  async function save(next) {
    try {
      if (extensionStorage) await chrome.storage.local.set({ [key]: next });
      else localStorage.setItem(key, JSON.stringify(next));
      options = next; refresh(); $('saved').textContent = 'Configuración guardada en este navegador.';
    } catch { $('saved').textContent = 'No se pudo guardar la configuración.'; }
  }
  root.querySelector('form').addEventListener('submit', event => {
    event.preventDefault();
    const currency = $('currency').value.trim(), rate = Number($('rate').value);
    if (!currency || !Number.isFinite(rate) || rate <= 0 || rate > 100000) { $('saved').textContent = 'Ingresá moneda y cambio mayor que cero, o elegí Sin conversión.'; return; }
    void save({ currency, rate });
  });
  $('clear').addEventListener('click', () => { $('currency').value = ''; $('rate').value = ''; void save({}); });
  (async () => {
    try {
      const stored = extensionStorage ? (await chrome.storage.local.get(key))[key] : JSON.parse(localStorage.getItem(key) || '{}');
      if (stored && typeof stored.currency === 'string' && stored.currency.length <= 8 && Number.isFinite(stored.rate) && stored.rate > 0 && stored.rate <= 100000) options = stored;
    } catch { /* The summary still works when settings storage is unavailable. */ }
    $('currency').value = options.currency || ''; $('rate').value = options.rate || ''; refresh();
  })();
  window.addEventListener('popstate', schedule);
  window.addEventListener('pageshow', schedule);
}
