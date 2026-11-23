// Mi orden: dibuja la tarjeta plegable con los datos que calcula orden-model.js.
let editingReward = false;
export function setMiOrdenEditing(value) { editingReward = !!value; }
export function isMiOrdenEditing() { return editingReward; }

function esc(text) {
  return String(text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function chip(tone, text) {
  return `<span class="mo-chip mo-${tone}">${esc(text)}</span>`;
}

const FLAME = '<svg class="mo-flame" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-2.500 1-4 2.500-5 .2 2 1 3 2.500 3C10.500 8.500 10.500 5 12 2z"/></svg>';
const RING_LEN = 2 * Math.PI * 18;

function ring(pct, tone) {
  return `<svg class="mo-ring mo-ring-${tone}" viewBox="0 0 44 44" aria-hidden="true"><circle class="mo-ring-bg" cx="22" cy="22" r="18"/><circle class="mo-ring-fg" cx="22" cy="22" r="18" stroke-dasharray="${(RING_LEN * pct / 100).toFixed(1)} ${RING_LEN.toFixed(1)}" transform="rotate(-90 22 22)"/></svg><b class="mo-ring-text">${pct}%</b>`;
}

function balanceTile(summary, translateText) {
  const net = summary.netMin;
  const tone = net < 0 ? 'bad' : net > 0 ? 'good' : 'muted';
  const head = net < 0 ? `${translateText('Debes')} ${-net} min` : net > 0 ? `${translateText('Tienes')} ${net} min ${translateText('a favor')}` : translateText('Sin deuda');
  return `<div class="mo-tile mo-balance">
  <div class="mo-balance-main">
    <span class="mo-label">${esc(translateText('Balance de minutos'))}</span>
    <div class="mo-big mo-${tone}">${net > 0 ? '+' : ''}${net}<small>min</small></div>
    <span class="mo-sub">${esc(translateText('Tope'))} ${summary.topeMin} min</span>
  </div>
  <div class="mo-balance-bar">
    <div class="mo-bar-head mo-${tone}">${esc(head)}</div>
    <div class="mo-bar" role="img" aria-label="${esc(head)}"><i class="mo-bar-debt" style="width:${(summary.debtPct * 50).toFixed(1)}%"></i><i class="mo-bar-favor" style="width:${(summary.favorPct * 50).toFixed(1)}%"></i><b></b></div>
    <div class="mo-bar-labels"><span class="mo-bad">${esc(translateText('Deuda'))} ${summary.debtMin}</span><span>0</span><span class="mo-good">${esc(translateText('A favor'))} ${summary.favorMin}</span></div>
  </div>
  ${summary.carryMin > 0 ? `<span class="mo-sub mo-bad">${esc(translateText('Tu meta de hoy incluye la deuda de ayer'))}: +${summary.carryMin} min</span>` : ''}
  ${summary.owedMin > 0 ? `<span class="mo-sub mo-bad">${esc(translateText('Si cierras así, mañana tu meta sube'))} ${summary.owedMin} min</span>` : ''}
</div>
<div class="mo-money-row">
  <div class="mo-tile mo-money mo-money-bad"><span class="mo-label">${esc(translateText('Perdido por desorden'))}</span><div class="mo-money-value mo-bad" data-mo-lost>${summary.lostRaw > 0 ? '-' : ''}${esc(summary.lostText)}</div></div>
  <div class="mo-tile mo-money mo-money-good"><span class="mo-label">${esc(translateText('Dinero en orden'))}</span><div class="mo-money-value mo-good">+${esc(summary.inOrderText)}</div></div>
</div>`;
}

function streakTile(streak, translateText) {
  const pills = [];
  if (streak.lostToday) pills.push(chip('bad', translateText('Perdida hoy')));
  pills.push(chip('gold', `${translateText('Perdón')}: ${streak.perdon} ${translateText('de')} 1`));
  return `<div class="mo-tile mo-streak ${streak.lostToday ? 'is-lost' : ''}">
  <span class="mo-label">${esc(translateText('Racha'))}</span>
  <div class="mo-streak-main">${FLAME}<b class="mo-streak-num">${streak.streak}</b><span class="mo-sub">${esc(translateText('días'))}</span></div>
  <div class="mo-pills">${pills.join('')}</div>
  <span class="mo-sub">${esc(translateText('Cada 5 días en orden ganas 1 día de perdón'))}</span>
</div>`;
}

function rewardTile(reward, translateText) {
  const hasReward = !!(reward && reward.name);
  if (hasReward && !editingReward) {
    return `<div class="mo-tile mo-reward">
  <span class="mo-label">${esc(translateText('Mi recompensa'))}</span>
  <div class="mo-reward-main"><div class="mo-ring-wrap">${ring(reward.pct, reward.done ? 'good' : 'cyan')}</div>
    <div class="mo-reward-text"><b>${esc(reward.name)}</b><span class="mo-sub">${reward.okDays} ${esc(translateText('de'))} ${reward.targetDays} ${esc(translateText('días en orden'))}</span>${reward.done ? `<span class="mo-good mo-reward-done">${esc(translateText('¡Lista para ti!'))}</span>` : ''}</div></div>
  <div class="mo-pills"><button class="mo-link" type="button" data-mo-action="edit-reward">${esc(reward.done ? translateText('Nueva recompensa') : translateText('Cambiar'))}</button></div>
</div>`;
  }
  return `<div class="mo-tile mo-reward">
  <span class="mo-label">${esc(translateText('Mi recompensa'))}</span>
  <label class="mo-field"><span>${esc(translateText('¿Qué te quieres regalar?'))}</span><input id="miOrdenRewardName" type="text" maxlength="40" value="${esc(reward?.name || '')}" placeholder="${esc(translateText('Ej. una salida'))}"/></label>
  <label class="mo-field"><span>${esc(translateText('Días en orden para lograrlo'))}</span><input id="miOrdenRewardDays" type="number" inputmode="numeric" min="1" max="365" step="1" value="${reward?.targetDays || 10}"/></label>
  <div class="mo-pills"><button class="mo-btn" type="button" data-mo-action="save-reward">${esc(translateText('Guardar'))}</button>${hasReward ? `<button class="mo-link" type="button" data-mo-action="cancel-reward">${esc(translateText('Cancelar'))}</button>` : ''}</div>
</div>`;
}

function weekTile(week, translateText) {
  if (!week.days.length) return '';
  const okCount = week.days.filter(day => day.status === 'ok').length;
  const clean = okCount === week.days.length;
  const dots = week.days.map(day => {
    const mark = day.status === 'ok' ? '✓' : day.status === 'bad' ? '✕' : esc(day.label);
    return `<span class="mo-day mo-day-${day.status}${day.today ? ' is-today' : ''}" title="${esc(day.label)}">${mark}</span>`;
  }).join('');
  return `<div class="mo-tile mo-week">
  <div class="mo-week-head"><span class="mo-label">${esc(translateText('Semana limpia'))}</span><span class="mo-label ${clean ? 'mo-good' : ''}">${okCount} ${esc(translateText('de'))} ${week.days.length}</span></div>
  <div class="mo-days">${dots}</div>
  <span class="mo-sub">${esc(clean ? translateText('¡Semana limpia!') : translateText('Todos los días en orden = semana limpia'))}</span>
</div>`;
}

function topeRow(summary, translateText) {
  return `<label class="mo-tope"><span class="mo-label">${esc(translateText('Tope de minutos de deuda'))}</span><span class="mo-tope-field"><input id="miOrdenTopeInput" type="number" inputmode="numeric" min="1" max="480" step="1" value="${summary.topeMin}"/><span class="mo-sub">min</span></span></label>`;
}

export function renderMiOrden(data, tools, doc = document) {
  const chips = doc.getElementById('miOrdenChips');
  const body = doc.getElementById('miOrdenBody');
  if (!chips || !body) return;
  const translateText = tools.translateText;
  const money = tools.money;
  const { summary, streak, week, reward } = data;
  const shown = { ...summary, lostRaw: summary.lostMoney, lostText: money(summary.lostMoney), inOrderText: money(summary.inOrderMoney) };
  const list = [];
  if (!summary.started) list.push(chip('muted', translateText('Sin turno todavía')));
  else if (summary.netMin < 0) list.push(chip('bad', `${summary.netMin} min`), chip('bad', `-${money(summary.lostMoney)}`));
  else if (summary.netMin > 0) list.push(chip('good', `+${summary.netMin} min`));
  else list.push(chip('good', translateText('En orden')));
  list.push(chip('gold', `${translateText('Racha')} ${streak.streak}`));
  if (week.days.length) list.push(chip('cyan', `${translateText('Semana')} ${week.days.filter(day => day.status === 'ok').length}/${week.days.length}`));
  if (reward && reward.name) list.push(chip(reward.done ? 'good' : 'cyan', `${reward.pct}%`));
  chips.innerHTML = list.join('');
  // Si estas escribiendo dentro de la tarjeta no se redibuja (se perderia lo que escribes).
  if (typeof body.contains === 'function' && doc.activeElement && body.contains(doc.activeElement)) return;
  const sections = [];
  sections.push(summary.started ? balanceTile(shown, translateText) : `<div class="note">${esc(translateText('Cuando empieces el turno aquí verás cuánto te cuesta el desorden.'))}</div>`);
  sections.push(`<div class="mo-duo">${streakTile(streak, translateText)}${rewardTile(reward, translateText)}</div>`);
  sections.push(weekTile(week, translateText));
  sections.push(topeRow(summary, translateText));
  body.innerHTML = sections.join('');
}
