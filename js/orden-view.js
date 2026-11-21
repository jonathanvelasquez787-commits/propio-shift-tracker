// Mi orden: dibuja la tarjeta plegable con el resumen que calcula orden-model.js.
function esc(text) {
  return String(text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function chip(tone, text) {
  return `<span class="mo-chip mo-${tone}">${esc(text)}</span>`;
}

export function renderMiOrden(summary, tools, doc = document) {
  const chips = doc.getElementById('miOrdenChips');
  const body = doc.getElementById('miOrdenBody');
  if (!chips || !body) return;
  const { translateText, money } = tools;
  const tope = doc.getElementById('miOrdenTopeInput');
  if (tope && doc.activeElement !== tope) tope.value = String(summary.topeMin);
  if (!summary.started) {
    chips.innerHTML = chip('muted', translateText('Sin turno todavía'));
    body.innerHTML = `<div class="note">${esc(translateText('Cuando empieces el turno aquí verás cuánto te cuesta el desorden.'))}</div>`;
    return;
  }
  const bad = summary.disorderMin > 0;
  chips.innerHTML = bad
    ? chip('bad', `-${summary.debtMin} min`) + chip('bad', `-${money(summary.lostMoney)}`)
    : chip('good', translateText('En orden'));
  const pct = Math.round(summary.debtPct * 100);
  body.innerHTML = `
<div class="mo-tile mo-balance">
  <div class="mo-balance-main">
    <span class="mo-label">${esc(translateText('Balance de minutos'))}</span>
    <div class="mo-big ${bad ? 'mo-bad' : 'mo-good'}">${bad ? '-' : ''}${summary.debtMin}<small>min</small></div>
    <span class="mo-sub">${esc(translateText('Tope'))} ${summary.topeMin}</span>
  </div>
  <div class="mo-balance-bar">
    <div class="mo-bar-head ${bad ? 'mo-bad' : 'mo-muted'}">${bad ? esc(translateText('Debes')) + ' ' + summary.debtMin + ' min' : esc(translateText('Sin deuda'))}</div>
    <div class="mo-bar" role="img" aria-label="${esc(translateText('Deuda'))} ${pct}%"><i style="width:${pct / 2}%"></i><b></b></div>
    <div class="mo-bar-labels"><span class="mo-bad">${esc(translateText('Deuda'))}</span><span>0</span><span class="mo-good">${esc(translateText('A favor'))}</span></div>
  </div>
</div>
<div class="mo-money-row">
  <div class="mo-tile mo-money mo-money-bad">
    <span class="mo-label">${esc(translateText('Perdido por desorden'))}</span>
    <div class="mo-money-value mo-bad">-${esc(money(summary.lostMoney))}</div>
  </div>
  <div class="mo-tile mo-money mo-money-good">
    <span class="mo-label">${esc(translateText('Dinero en orden'))}</span>
    <div class="mo-money-value mo-good">+${esc(money(summary.inOrderMoney))}</div>
  </div>
</div>`;
}
