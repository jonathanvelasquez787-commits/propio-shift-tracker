import { readPortalHistory } from '../../js/propio-history.js';
import { readPortalPaginator, portalRangeContext, collectPortalPages } from '../../js/propio-history-pages.js';
import { settingsKey, languageOf, copyFor, scanError } from './i18n.js';
import { createSummaryMount } from './layout.js';
import { normalizeSummaryOptions } from './options.js';

export function installPortalSummary({ enabledByDefault = true } = {}) {
  if (location.origin !== 'https://interpreters.propio-ls.com' || window.top !== window || document.getElementById('propio-summary-panel')) return;
  const key = settingsKey;
  let options = normalizeSummaryOptions(null, enabledByDefault), last = '', timer, totalCache = null, running = null, scanMessage = '', initialized = false, settingsRevision = 0;
  const host = document.createElement('div');
  host.id = 'propio-summary-panel';
  const placement = createSummaryMount(host);
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>
    :host{display:block;margin:8px 0;color-scheme:light dark;font:13px/1.5 system-ui,sans-serif;color:#203345}
    .bar{display:flex;flex-wrap:wrap;align-items:center;gap:6px 18px;padding:9px 12px;border:1px solid #ccd8df;border-radius:8px;background:#f4f8fa}
    strong{font-size:16px;font-variant-numeric:tabular-nums;color:#08687b}.scope{font-size:11px;color:#516573;flex:1;min-width:140px}
    button{border:1px solid #aabbc7;border-radius:5px;background:transparent;color:inherit;cursor:pointer;padding:4px 8px;font:inherit}
    button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid #0893b1;outline-offset:2px}.details{padding:8px 12px;font-size:12px;border:1px solid #ccd8df;border-top:0;border-radius:0 0 8px 8px;background:#f4f8fa}
    [hidden]{display:none!important}form{display:flex;flex-wrap:wrap;gap:8px;align-items:end;margin:8px 0}label{display:grid;gap:3px}input{width:110px;max-width:100%;box-sizing:border-box;padding:5px;border:1px solid #aabbc7;border-radius:4px;background:transparent;color:inherit;font:inherit}
    p{margin:0}.conversion{font-size:12px;font-weight:normal}.notice{color:#855200}output{display:block}.language{display:flex;align-items:center;gap:8px;margin-top:8px}select{padding:5px;border:1px solid #aabbc7;border-radius:4px;background:#f4f8fa;color:inherit;font:inherit}
    @media(prefers-color-scheme:dark){:host{color:#e4edf4}.bar{background:#121d2d;border-color:#35465b}.details{background:#121d2d;border-color:#35465b}strong{color:#52d3df}.scope{color:#b0c1d1}.notice{color:#f6c873}button,input,select{border-color:#5b7188}select{background:#121d2d}}
  </style><section lang="en" aria-label="Propio history summary">
    <div class="bar"><span><strong id="minutes">—</strong> min</span><span><strong id="pay">—</strong> <span class="conversion" id="converted"></span></span><span class="scope" id="scope" aria-live="polite"></span><button id="sum-period" type="button" aria-describedby="period-explanation" hidden>Calculate Total</button><button id="toggle" type="button" aria-expanded="false">Details</button></div>
    <div class="details" id="details" hidden><p id="period-explanation"></p>
      <label class="language"><span id="language-label">Language</span><select id="language"><option value="en" lang="en">English</option><option value="es" lang="es">Español</option></select></label>
      <p class="notice" id="notice"></p><form><label><span id="currency-label"></span><input id="currency" maxlength="8"></label><label><span id="rate-label"></span><input id="rate" type="number" min="0.000001" max="100000" step="any"></label><button id="save" type="submit"></button><button id="clear" type="button"></button></form><output id="saved" aria-live="polite"></output><p id="privacy"></p>
    </div></section>`;
  const $ = id => root.getElementById(id);
  const locale = () => languageOf(options) === 'es' ? 'es-HN' : 'en-US';
  const amount = value => value.toLocaleString(locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  let savedMessage = '';
  function translate() {
    const copy = copyFor(options), section = root.querySelector('section');
    section.lang = languageOf(options); section.setAttribute('aria-label', copy.section);
    for (const [id, name] of Object.entries({ 'language-label': 'language', 'currency-label': 'currency', 'rate-label': 'rate', save: 'save', clear: 'clear', privacy: 'privacy', 'period-explanation': 'explanation' })) $(id).textContent = copy[name];
    $('language').value = languageOf(options);
    $('currency').placeholder = copy.example; $('rate').placeholder = copy.optional;
    $('toggle').textContent = $('details').hidden ? copy.details : copy.hide;
    $('saved').textContent = savedMessage ? copy[savedMessage] : '';
  }
  const isVisible = element => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden';
  function snapshot() {
    const found = location.pathname.startsWith('/portal') ? readPortalHistory(document, isVisible) : null;
    if (!found) return null;
    const pager = readPortalPaginator(found.table, isVisible);
    return { ...found, pager, range: pager?.range, context: portalRangeContext(document, found.table), hasFirst: Boolean(pager?.buttons.first) };
  }
  function refresh() {
    timer = null;
    if (!initialized || !options.enabled) {
      setWatching(false);
      if (running) running.controller.abort();
      placement.clear(); last = ''; totalCache = null; return;
    }
    setWatching(true);
    const found = snapshot();
    if (!found) { placement.clear(); last = ''; totalCache = null; return; }
    placement.mount(found.table);
    if (!running && totalCache && (!found.range || totalCache.context !== found.context || totalCache.total !== found.range.total || totalCache.size !== found.range.size)) totalCache = null;
    const summary = totalCache && !running ? totalCache.summary : found.summary;
    const signature = JSON.stringify([summary, options, savedMessage, Boolean(totalCache), running?.progress, running?.controller.signal.aborted, scanMessage, Boolean(found.pager)]);
    if (signature === last) return;
    last = signature;
    translate();
    const copy = copyFor(options);
    $('minutes').textContent = summary.count && summary.missingMinutes === summary.count ? '—' : summary.minutes.toLocaleString(locale(), { maximumFractionDigits: 3 });
    $('pay').textContent = summary.count && summary.missingPay === summary.count ? '—' : '$' + amount(summary.pay);
    $('converted').textContent = options.rate > 0 && options.currency && (!summary.count || summary.missingPay < summary.count) ? `≈ ${options.currency} ${amount(summary.pay * options.rate)}` : '';
    $('sum-period').hidden = !found.pager;
    $('sum-period').textContent = running ? running.controller.signal.aborted ? copy.cancelling : copy.cancel : totalCache ? copy.recalculate : copy.sum;
    $('sum-period').title = running ? copy.cancelTooltip : copy.tooltip;
    $('sum-period').disabled = Boolean(running?.controller.signal.aborted);
    $('scope').textContent = running ? running.controller.signal.aborted ? copy.cancellingScan : copy.progress(running.progress || 0, running.total) : `${totalCache ? copy.period : copy.visible} · ${copy.calls(summary.count)}${summary.missingMinutes || summary.missingPay ? ' · ' + copy.partial : ''}`;
    if (running) { $('minutes').textContent = '—'; $('pay').textContent = '—'; $('converted').textContent = ''; }
    $('notice').textContent = [scanError(scanMessage, options), summary.missingMinutes || summary.missingPay ? copy.pending(summary.missingMinutes, summary.missingPay) : ''].filter(Boolean).join(' ');
  }
  function schedule() { if (initialized && options.enabled && !timer) timer = setTimeout(refresh, 120); }
  const observer = new MutationObserver(schedule);
  let watching = false;
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
    if (!initialized || !options.enabled) return;
    if (event.composedPath().includes(host)) return;
    const pager = snapshot()?.pager?.element;
    if (running) {
      if (event.type === 'click' && !event.isTrusted) return;
      running.external = true; running.controller.abort();
    }
    if ((event.type !== 'click' && !pager?.contains(event.target)) || event.target.closest?.('th, mat-header-cell, [role="columnheader"]')) { totalCache = null; scanMessage = ''; schedule(); }
  }
  function setWatching(enabled) {
    if (watching === enabled) return;
    watching = enabled;
    for (const name of ['input', 'change', 'click']) document[enabled ? 'addEventListener' : 'removeEventListener'](name, invalidate, true);
    for (const name of ['popstate', 'pageshow']) window[enabled ? 'addEventListener' : 'removeEventListener'](name, schedule);
    if (enabled) observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'style', 'class'] });
    else { observer.disconnect(); clearTimeout(timer); timer = null; }
  }
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
      $('details').hidden = false; $('toggle').setAttribute('aria-expanded', 'true');
    } finally { running = null; last = ''; refresh(); }
  });
  $('toggle').addEventListener('click', () => {
    const expanded = $('details').hidden;
    $('details').hidden = !expanded; $('toggle').setAttribute('aria-expanded', String(expanded));
    translate();
  });
  const extensionStorage = typeof chrome !== 'undefined' && chrome.runtime?.id && chrome.storage?.local;
  async function save(next) {
    try {
      if (extensionStorage) await chrome.storage.local.set({ [key]: next });
      else localStorage.setItem(key, JSON.stringify(next));
      options = next; savedMessage = 'saved'; refresh();
    } catch { savedMessage = 'failed'; translate(); }
  }
  $('language').addEventListener('change', () => { void save({ ...options, language: $('language').value === 'es' ? 'es' : 'en' }); });
  root.querySelector('form').addEventListener('submit', event => {
    event.preventDefault();
    const currency = $('currency').value.trim(), rate = Number($('rate').value);
    if (!currency || !Number.isFinite(rate) || rate <= 0 || rate > 100000) { savedMessage = 'invalid'; translate(); return; }
    void save({ ...options, currency, rate, language: languageOf(options) });
  });
  $('clear').addEventListener('click', () => { $('currency').value = ''; $('rate').value = ''; void save({ enabled: options.enabled, language: languageOf(options) }); });
  const settingsChanged = (changes, area) => {
    if (area !== 'local' || !changes[key]) return;
    settingsRevision++;
    options = normalizeSummaryOptions(changes[key].newValue, enabledByDefault);
    $('currency').value = options.currency || ''; $('rate').value = options.rate || ''; refresh();
  };
  if (extensionStorage) chrome.storage.onChanged.addListener(settingsChanged);
  const initialSettingsRevision = settingsRevision;
  (async () => {
    try {
      const stored = extensionStorage ? (await chrome.storage.local.get(key))[key] : JSON.parse(localStorage.getItem(key) || '{}');
      if (initialSettingsRevision === settingsRevision) options = normalizeSummaryOptions(stored, enabledByDefault);
    } catch { /* The summary still works when settings storage is unavailable. */ }
    initialized = true;
    $('currency').value = options.currency || ''; $('rate').value = options.rate || ''; refresh();
  })();
}
