// Página Finanzas (Gastos, Metas, categorías propias) — extraído de app-main.js como primer
// módulo de la Fase 3. Depende de app-main.js (estado y helpers compartidos) y app-main.js
// depende de este archivo (para montar la página) — el ciclo es seguro porque ninguno de los dos
// lados toca el otro fuera de funciones que se llaman después de que ambos módulos terminaron de
// evaluarse (ver v556 en instrucciones.md).

import {
  settings,
  calls,
  money,
  convertedAmountText,
  iconHtml,
  escapeHtml,
  toast,
  appConfirm,
  openModal,
  closeModal,
  saveSettingsOnly,
  makeLocalId,
  parseMoney,
  usdCeilFromCurrencyAmount,
  higherRateBonusForCalls,
  renderEmojiPicker,
} from './app-main.js';

    export const FINANCE_CATEGORIES = {
      casa:       { label: 'Casa',           icon: 'home',           rgb: '102,226,165' },
      servicios:  { label: 'Servicios',      icon: 'zap',            rgb: '255,209,92'  },
      transporte: { label: 'Transporte',     icon: 'car',            rgb: '125,140,255' },
      comida:     { label: 'Comida',         icon: 'utensils',       rgb: '47,213,255'  },
      deuda:      { label: 'Deuda',          icon: 'creditCard',     rgb: '255,107,114' },
      ahorro:     { label: 'Meta de ahorro', icon: 'piggyBank',      rgb: '139,123,255' },
      otro:       { label: 'Otro',           icon: 'moreHorizontal', rgb: '144,160,190' },
    };

    // Nombre sugerido al elegir categoría en "Agregar gasto" (ver financeApplyNameSuggestion) — es
    // solo un punto de partida editable, no un valor fijo. 'otro' no sugiere nada.
    const FINANCE_NAME_SUGGESTIONS = {
      casa: 'Renta',
      servicios: 'Luz',
      transporte: 'Gasolina',
      comida: 'Despensa',
      deuda: 'Préstamo',
    };

    // Categorías propias (settings.customFinanceCategories) — paleta fija de 8 tonos, los mismos
    // RGB que ya usa FINANCE_CATEGORIES/tokens de tema (good/warn/blue/cyan/bad/purple/pink/teal),
    // para no meter un color nuevo que no case con el resto de la app.
    export const FINANCE_CUSTOM_CATEGORY_PALETTE = ['102,226,165', '255,209,92', '125,140,255', '47,213,255', '255,107,114', '139,123,255', '255,111,143', '88,232,200'];

    // Todas las categorías disponibles para elegir en el modal Agregar gasto/meta: las 7 fijas de
    // FINANCE_CATEGORIES + las que el usuario haya creado, en ese orden.
    function financeAllCategories() {
      const fixed = Object.keys(FINANCE_CATEGORIES).map(id => ({ id, ...FINANCE_CATEGORIES[id] }));
      const custom = (Array.isArray(settings.customFinanceCategories) ? settings.customFinanceCategories : [])
        .map(c => ({ id: c.id, label: c.label, emoji: c.emoji, rgb: c.rgb }));
      return fixed.concat(custom);
    }

    // Definición de una categoría por id (fija o propia) — mismo fallback a "Otro" que ya usaba
    // FINANCE_CATEGORIES[x] || FINANCE_CATEGORIES.otro en todo el archivo.
    function financeCategoryDef(catId) {
      if (FINANCE_CATEGORIES[catId]) return FINANCE_CATEGORIES[catId];
      const custom = (Array.isArray(settings.customFinanceCategories) ? settings.customFinanceCategories : []).find(c => c.id === catId);
      if (custom) return { label: custom.label, emoji: custom.emoji, rgb: custom.rgb };
      return FINANCE_CATEGORIES.otro;
    }

    // Las categorías fijas se dibujan con un ícono de ICON (ver iconHtml); las propias no tienen
    // ícono lucide asignado, así que se dibujan con el emoji que el usuario eligió al crearlas.
    function financeCategoryIconHtml(cat) {
      return cat.emoji ? `<span style="font-size:15px; line-height:1;">${escapeHtml(cat.emoji)}</span>` : iconHtml(cat.icon);
    }

    // Una fila es Meta (vs Gasto) según row.kind, que toda fila nueva ya guarda explícito desde que
    // se permitió elegir cualquier categoría para una Meta. Las filas viejas (de antes de esto) no
    // tienen kind — para ellas se respeta el criterio anterior (categoría 'ahorro' = Meta).
    export function financeRowIsMeta(row) {
      return row.kind ? row.kind === 'meta' : row.categoryId === 'ahorro';
    }

    // Selector visual de tarifa (Normal/Bronce/Silver/Gold) en Editar llamada y Agregar llamada
    // manual.

function financeTotalEarningsAllTime() {
  return calls.reduce((sum, c) => sum + parseMoney(c.pay), 0) + higherRateBonusForCalls(calls);
}
function financeTotalAssigned() {
  let total = 0;
  Object.values(settings.financeCategories).forEach(cat => {
    cat.rows.forEach(r => { total += Number(r.assignedAmount) || 0; });
  });
  return total;
}
function financeAvailableBalance() {
  return financeTotalEarningsAllTime() - financeTotalAssigned();
}

// Todas las categorías con filas guardadas: las 7 fijas + las propias del usuario. Ya no alcanza
// con Object.keys(FINANCE_CATEGORIES) para recorrer settings.financeCategories, porque una
// categoría propia también vive ahí.
function financeAllCategoryIds() {
  return Object.keys(FINANCE_CATEGORIES).concat(
    (Array.isArray(settings.customFinanceCategories) ? settings.customFinanceCategories : []).map(c => c.id)
  );
}

// Todas las filas de Gastos (de cualquier categoría, ver financeRowIsMeta) en UNA sola cola
// ordenada por prioridad ascendente — así compiten entre sí en la cascada de "Restante después".
// Las Metas tienen su propia cola aparte (financeMetaRowsSorted).
function financeGastoRowsSorted() {
  const rows = [];
  financeAllCategoryIds().forEach(catId => {
    (settings.financeCategories[catId]?.rows || []).forEach(r => { if (!financeRowIsMeta(r)) rows.push(r); });
  });
  return rows.sort((a, b) => (Number(a.priority) || 0) - (Number(b.priority) || 0));
}

function financeMetaRowsSorted() {
  const rows = [];
  financeAllCategoryIds().forEach(catId => {
    (settings.financeCategories[catId]?.rows || []).forEach(r => { if (financeRowIsMeta(r)) rows.push(r); });
  });
  return rows.sort((a, b) => (Number(a.priority) || 0) - (Number(b.priority) || 0));
}

function financeIsRowPagado(row) {
  return row.manualPaid === true || (Number(row.assignedAmount) >= Number(row.targetAmount) && Number(row.targetAmount) > 0);
}

// Próximos 2 gastos/metas pendientes (Gastos primero por prioridad, saltando Pagados; si no
// alcanzan el límite, se completa con Metas) — para el preview de "Ganancias de hoy". Sin registro
// nuevo, reutiliza las mismas colas de Finanzas.
function financePendingPreviewItems(limit = 2) {
  const pending = [];
  financeGastoRowsSorted().forEach(r => {
    if (!financeIsRowPagado(r)) pending.push({ row: r, isMeta: false });
  });
  if (pending.length < limit) {
    financeMetaRowsSorted().forEach(r => {
      if ((Number(r.assignedAmount) || 0) < (Number(r.targetAmount) || 0) - 0.004) {
        pending.push({ row: r, isMeta: true });
      }
    });
  }
  return pending.slice(0, limit);
}

export function renderFinancePreview() {
  const box = document.getElementById('financePreviewBox');
  const rowsEl = document.getElementById('financePreviewRows');
  if (!box || !rowsEl) return;
  const items = financePendingPreviewItems(2);
  if (!items.length) { box.style.display = 'none'; return; }
  box.style.display = '';
  rowsEl.innerHTML = items.map(({ row, isMeta }) => {
    const cat = financeCategoryDef(row.categoryId);
    const target = Number(row.targetAmount) || 0;
    const assigned = Number(row.assignedAmount) || 0;
    const pct = target > 0 ? Math.min(100, (assigned / target) * 100) : 0;
    const faltante = Math.max(0, target - assigned);
    const barColor = isMeta ? 'var(--purple)' : 'var(--warn)';
    return `
      <div class="fin-preview-row">
        <span class="fin-preview-icon" style="--cat-rgb:${cat.rgb};">${financeCategoryIconHtml(cat)}</span>
        <div class="fin-preview-main">
          <div class="fin-preview-name">${escapeHtml(row.name)}</div>
          <div class="fin-preview-sub">Faltan ${money(faltante)}${financeConvertedInline(faltante)} de ${money(target)}${financeConvertedInline(target)}</div>
          <div class="fin-preview-bar"><div style="width:${pct}%; background:${barColor};"></div></div>
        </div>
        <div class="fin-preview-right">
          <div class="fin-preview-amt">${money(assigned)}</div>
          <div class="fin-preview-amt-label">${isMeta ? 'ahorrado' : 'asignado'}${financeConvertedInline(assigned)}</div>
        </div>
      </div>
    `;
  }).join('');
}

let financeActiveTab = 'gastos';
let financeRowModalKind = 'gasto';
let financeEditingRowId = null;
// Categoría propia que se está editando en el panel "+ Nueva categoría" (null = modo alta).
let financeEditingCatId = null;
let financeRowTargetSyncing = false;

// Sincroniza Monto objetivo ($) ↔ Monto objetivo en tu moneda, en cualquier dirección — mismo
// criterio que syncGoals('currency') en Ajustes, aquí simplificado a un solo par de campos (sin
// meta en minutos de por medio).
export function syncFinanceRowTargetFields(source) {
  if (financeRowTargetSyncing) return;
  const usdInput = document.getElementById('financeRowTargetInput');
  const currencyInput = document.getElementById('financeRowTargetCurrencyInput');
  const exchangeRate = Number(settings.exchangeRate);
  if (!usdInput || !currencyInput || !Number.isFinite(exchangeRate) || exchangeRate <= 0) return;
  financeRowTargetSyncing = true;
  if (source === 'usd') {
    const usd = Number(usdInput.value);
    if (Number.isFinite(usd)) currencyInput.value = (usd * exchangeRate).toFixed(2);
  } else {
    const cur = Number(currencyInput.value);
    if (Number.isFinite(cur)) usdInput.value = usdCeilFromCurrencyAmount(cur, exchangeRate).toFixed(2);
  }
  financeRowTargetSyncing = false;
}

export function setFinanceTab(tab) {
  financeActiveTab = tab === 'metas' ? 'metas' : 'gastos';
  const gastosView = document.getElementById('financeGastosView');
  const metasView = document.getElementById('financeMetasView');
  document.querySelectorAll('#financeTabToggle [data-fin-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-fin-tab') === financeActiveTab);
  });
  if (gastosView) gastosView.style.display = financeActiveTab === 'gastos' ? '' : 'none';
  if (metasView) metasView.style.display = financeActiveTab === 'metas' ? '' : 'none';
}

// Texto muted con el equivalente en la moneda secundaria (ej. "≈ L 123.45"), vacío si no hay
// tasa/moneda configurada — mismo `convertedAmountText` que ya usa el resto de la app.
export function financeConvertedNote(usdAmount) {
  const text = convertedAmountText(usdAmount);
  return text ? `<div class="fin-row-converted">${escapeHtml(text)}</div>` : '';
}

// Finanzas solo mostraba el equivalente en la moneda secundaria para el monto YA ASIGNADO — el
// objetivo y el restante/ faltante se quedaban solo en dólares.
export function financeConvertedInline(usdAmount) {
  const text = convertedAmountText(usdAmount);
  return text ? ` <span class="fin-row-converted-inline">(${escapeHtml(text)})</span>` : '';
}

// Misma condición que ya usa convertedAmountText para decidir si hay moneda secundaria configurada
// — extraída aparte para poder mostrar/ ocultar campos de entrada en esa moneda (no solo texto de
// solo lectura).
function financeHasSecondaryCurrency() {
  const rate = Number(settings.exchangeRate);
  const label = String(settings.currencyLabel || '').trim();
  return Number.isFinite(rate) && rate > 0 && !!label;
}

// Arma el HTML de una fila (gasto o meta) — `opts.restanteDespues` solo aplica a gastos (ver
// cascada en renderFinanceSection).
function financeRowHtml(row, opts) {
  const cat = financeCategoryDef(row.categoryId);
  const upDisabled = opts.index === 0 ? 'disabled' : '';
  const downDisabled = opts.index === opts.count - 1 ? 'disabled' : '';
  const target = Number(row.targetAmount) || 0;
  const assigned = Number(row.assignedAmount) || 0;
  const currencyLabelTrim = String(settings.currencyLabel || '').trim();
  const amountLinkTitle = 'Escribe en cualquiera de los dos — el otro se completa solo';
  const currencyAssignInputHtml = financeHasSecondaryCurrency()
    ? `<input class="fin-mini-input" data-fin-amount-currency-input placeholder="o en ${escapeHtml(currencyLabelTrim)}" type="text" title="${amountLinkTitle}"/>`
    : '';
  // El pill +/- (solo símbolos, sin texto) no dejaba claro qué iba a hacer "Aplicar" — pasa a
  // mostrar la palabra completa (mismo patrón.mc-pill-btn de Sí/No, sin lenguaje visual nuevo) +
  // title con el detalle.
  const signPillHtml = `
    <div class="mc-pill-row" role="group" aria-label="Elige si Aplicar suma o resta este monto">
      <button class="mc-pill-btn" data-fin-sign-btn data-sign="plus" aria-pressed="true" type="button" title="Resta este monto de Disponible y lo suma a lo ya asignado de esta fila">+ Sumar</button>
      <button class="mc-pill-btn" data-fin-sign-btn data-sign="minus" aria-pressed="false" type="button" title="Devuelve este monto de lo ya asignado de esta fila a Disponible">− Restar</button>
    </div>
  `;
  const priorityTitle = 'Prioridad — decide el orden de la cascada de "Restante después"';
  const restanteDespuesTitle = 'Lo que te queda de tu Disponible después de cubrir esta fila y todas las de más prioridad arriba (↑/↓) — no es lo que falta pagar de este gasto.';
  const priorityHtml = `
    <div class="fin-priority">
      <button class="fin-priority-btn" type="button" data-fin-priority-up="${escapeHtml(row.id)}" data-fin-cat="${escapeHtml(row.categoryId)}" ${upDisabled} aria-label="Subir prioridad" title="${priorityTitle}">${iconHtml('chevronUp')}</button>
      <span class="fin-priority-num" title="${priorityTitle}">${opts.index + 1}</span>
      <button class="fin-priority-btn" type="button" data-fin-priority-down="${escapeHtml(row.id)}" data-fin-cat="${escapeHtml(row.categoryId)}" ${downDisabled} aria-label="Bajar prioridad" title="${priorityTitle}">${iconHtml('chevronDown')}</button>
    </div>
    <span class="fin-cat-icon">${financeCategoryIconHtml(cat)}</span>
  `;

  if (opts.isMeta) {
    const faltante = Math.max(0, target - assigned);
    let badgeHtml, barPct, barColor;
    if (assigned === 0) { badgeHtml = '<span class="fin-badge tone-bad">Sin empezar</span>'; barPct = 0; barColor = 'var(--bad)'; }
    else if (assigned < target) { badgeHtml = '<span class="fin-badge tone-warn">En progreso</span>'; barPct = target > 0 ? Math.min(100, (assigned / target) * 100) : 0; barColor = 'var(--purple)'; }
    else { badgeHtml = '<span class="fin-badge tone-good">Cumplida</span>'; barPct = 100; barColor = 'var(--purple)'; }
    return `
      <div class="fin-row" data-fin-row="${escapeHtml(row.id)}" style="--cat-rgb:${cat.rgb};">
        ${priorityHtml}
        <div class="fin-row-main">
          <div class="fin-row-title">${escapeHtml(row.name)}</div>
          <div class="fin-row-sub">${escapeHtml(cat.label)}</div>
          <div class="fin-row-amt-line">
            <span>Ahorrado <b>${money(assigned)}</b>${financeConvertedInline(assigned)} de ${money(target)}${financeConvertedInline(target)}</span>
            <span class="fin-row-restante-inline">Faltan <b>${money(faltante)}</b>${financeConvertedInline(faltante)}</span>
          </div>
          <div class="fin-progress-track"><div style="width:${barPct}%; background:${barColor};"></div></div>
        </div>
        <div class="fin-row-right">
          <div class="fin-row-right-label">Faltante</div>
          <div class="fin-row-right-val">${money(faltante)}</div>
          ${financeConvertedNote(faltante)}
        </div>
        ${badgeHtml}
        <div class="fin-row-actions">
          <input class="fin-mini-input" data-fin-amount-input placeholder="$" type="text" title="${amountLinkTitle}"/>
          ${currencyAssignInputHtml}
          ${signPillHtml}
          <button class="fin-mini-btn-primary" type="button" data-fin-apply="${escapeHtml(row.id)}" data-fin-cat="${escapeHtml(row.categoryId)}">Aplicar</button>
          <button class="fin-ghost-btn fin-ghost-btn-icon" type="button" data-fin-edit="${escapeHtml(row.id)}" data-fin-cat="${escapeHtml(row.categoryId)}" aria-label="Editar meta" title="Editar meta">${iconHtml('edit')}</button>
          <button class="hr-window-remove-btn" type="button" data-fin-delete="${escapeHtml(row.id)}" data-fin-cat="${escapeHtml(row.categoryId)}" aria-label="Eliminar meta" title="Eliminar meta">${iconHtml('trash')}</button>
        </div>
      </div>
    `;
  }

  const typeLabel = row.recurring ? 'Recurrente' : 'Puntual';
  const isPagado = financeIsRowPagado(row);
  const checkboxHtml = !row.recurring
    ? `<label class="fin-checkbox-label"><input type="checkbox" data-fin-mark-paid="${escapeHtml(row.id)}" data-fin-cat="${escapeHtml(row.categoryId)}" ${row.manualPaid ? 'checked' : ''}/> Pagado</label>`
    : '';
  const editBtnHtml = `<button class="fin-ghost-btn fin-ghost-btn-icon" type="button" data-fin-edit="${escapeHtml(row.id)}" data-fin-cat="${escapeHtml(row.categoryId)}" aria-label="Editar gasto" title="Editar gasto">${iconHtml('edit')}</button>`;
  let badgeHtml, barPct, barColor, actionsHtml;
  if (isPagado) {
    badgeHtml = '<span class="fin-badge tone-good">Pagado</span>';
    barPct = 100; barColor = 'var(--good)';
    actionsHtml = `<button class="fin-ghost-btn" type="button" data-fin-reset="${escapeHtml(row.id)}" data-fin-cat="${escapeHtml(row.categoryId)}">${iconHtml('reset')} Reiniciar mes</button>${editBtnHtml}`;
  } else {
    barPct = target > 0 ? Math.min(100, (assigned / target) * 100) : 0;
    if (assigned > 0) { badgeHtml = '<span class="fin-badge tone-warn">Parcial</span>'; barColor = 'var(--warn)'; }
    else { badgeHtml = '<span class="fin-badge tone-bad">Sin asignar</span>'; barPct = 0; barColor = 'var(--bad)'; }
    actionsHtml = `${checkboxHtml}<input class="fin-mini-input" data-fin-amount-input placeholder="$" type="text" title="${amountLinkTitle}"/>${currencyAssignInputHtml}${signPillHtml}<button class="fin-mini-btn-primary" type="button" data-fin-apply="${escapeHtml(row.id)}" data-fin-cat="${escapeHtml(row.categoryId)}">Aplicar</button>${editBtnHtml}`;
  }
  return `
    <div class="fin-row" data-fin-row="${escapeHtml(row.id)}" style="--cat-rgb:${cat.rgb};">
      ${priorityHtml}
      <div class="fin-row-main">
        <div class="fin-row-title">${escapeHtml(row.name)}</div>
        <div class="fin-row-sub">${escapeHtml(cat.label)} · ${escapeHtml(typeLabel)}</div>
        <div class="fin-row-amt-line">
          <span><b>${money(assigned)}</b>${financeConvertedInline(assigned)} de ${money(target)}${financeConvertedInline(target)} asignado</span>
          <span class="fin-row-restante-inline" title="${restanteDespuesTitle}">Disponible <b>${money(opts.restanteDespues)}</b>${financeConvertedInline(opts.restanteDespues)}</span>
        </div>
        <div class="fin-progress-track"><div style="width:${barPct}%; background:${barColor};"></div></div>
      </div>
      <div class="fin-row-right" title="${restanteDespuesTitle}">
        <div class="fin-row-right-label">Disponible</div>
        <div class="fin-row-right-val">${money(opts.restanteDespues)}</div>
        ${financeConvertedNote(opts.restanteDespues)}
      </div>
      ${badgeHtml}
      <div class="fin-row-actions">
        ${actionsHtml}
        <button class="hr-window-remove-btn" type="button" data-fin-delete="${escapeHtml(row.id)}" data-fin-cat="${escapeHtml(row.categoryId)}" aria-label="Eliminar gasto" title="Eliminar gasto">${iconHtml('trash')}</button>
      </div>
    </div>
  `;
}

// Fila de total de una lista de Finanzas — mismo patrón visual que.wk-total-row de Resumen semanal,
// sin lenguaje nuevo.
function financeTotalsRowHtml(label, targetTotal, assignedTotal, assignedLabel) {
  const remaining = Math.max(0, targetTotal - assignedTotal);
  return `
    <div class="wk-total-row" style="margin-bottom: 4px;">
      <div class="wk-total-label">${escapeHtml(label)}</div>
      <div class="wk-total-metrics">
        <div class="wk-total-metric"><span class="wk-total-metric-label">Obj.</span><strong>${money(targetTotal)}</strong>${financeConvertedInline(targetTotal)}</div>
        <div class="wk-total-metric"><span class="wk-total-metric-label">${escapeHtml(assignedLabel)}</span><strong>${money(assignedTotal)}</strong>${financeConvertedInline(assignedTotal)}</div>
        <div class="wk-total-metric"><span class="wk-total-metric-label">Falta</span><strong>${money(remaining)}</strong>${financeConvertedInline(remaining)}</div>
      </div>
    </div>
  `;
}

export function renderFinanceSection() {
  const availableAmtElGuard = document.getElementById('financeAvailableAmt');
  if (!availableAmtElGuard) return;

  const available = financeAvailableBalance();
  const availableAmtEl = availableAmtElGuard;
  availableAmtEl.textContent = money(available);
  const availableConvertedEl = document.getElementById('financeAvailableConverted');
  if (availableConvertedEl) availableConvertedEl.textContent = convertedAmountText(available);

  const autoFillInput = document.getElementById('financeAutoFillInput');
  if (autoFillInput) autoFillInput.checked = !!settings.financeAutoFill;

  const gastoRows = financeGastoRowsSorted();
  const nextPending = gastoRows.find(r => !financeIsRowPagado(r));
  const nextPriorityEl = document.getElementById('financeNextPriorityVal');
  if (nextPriorityEl) nextPriorityEl.textContent = nextPending ? nextPending.name : '—';

  // Cascada "Restante después" — solo Gastos, resta assignedAmount (no targetAmount) de cada fila
  // en orden de prioridad.
  const gastoAssignedTotal = gastoRows.reduce((sum, r) => sum + (Number(r.assignedAmount) || 0), 0);
  let runningRemaining = available + gastoAssignedTotal;
  const restanteMap = {};
  gastoRows.forEach(r => {
    runningRemaining -= Number(r.assignedAmount) || 0;
    restanteMap[r.id] = runningRemaining;
  });

  const gastosTotalRowEl = document.getElementById('financeGastosTotalRow');
  if (gastosTotalRowEl) {
    const gastoTargetTotal = gastoRows.reduce((sum, r) => sum + (Number(r.targetAmount) || 0), 0);
    gastosTotalRowEl.innerHTML = gastoRows.length ? financeTotalsRowHtml('Total gastos', gastoTargetTotal, gastoAssignedTotal, 'Asig.') : '';
  }
  const gastosList = document.getElementById('financeGastosList');
  if (gastosList) {
    gastosList.innerHTML = gastoRows.length
      ? gastoRows.map((r, i) => financeRowHtml(r, { index: i, count: gastoRows.length, isMeta: false, restanteDespues: restanteMap[r.id] })).join('')
      : '<div class="note" style="margin:0;">Sin gastos configurados. Usa "+ Agregar gasto" para empezar.</div>';
  }

  const metaRows = financeMetaRowsSorted();
  const metasList = document.getElementById('financeMetasList');
  if (metasList) {
    const metaTargetTotal = metaRows.reduce((sum, r) => sum + (Number(r.targetAmount) || 0), 0);
    const metaAssignedTotal = metaRows.reduce((sum, r) => sum + (Number(r.assignedAmount) || 0), 0);
    metasList.innerHTML = metaRows.length
      ? metaRows.map((r, i) => financeRowHtml(r, { index: i, count: metaRows.length, isMeta: true })).join('') + financeTotalsRowHtml('Total metas', metaTargetTotal, metaAssignedTotal, 'Ahorr.')
      : '<div class="note" style="margin:0;">Sin metas configuradas. Usa "+ Agregar meta" para empezar.</div>';
  }

  renderFinancePreview();
  updateFinanceTotalsScrollHint();
}

export function financeSwapPriority(catIdIgnored, rowId, direction) {
  // CatIdIgnored: la fila puede vivir en cualquier categoría de su cola — se busca por id en la
  // cola completa (Gastos o Metas), no solo dentro de una categoría.
  const row = financeGastoRowsSorted().find(r => r.id === rowId) || financeMetaRowsSorted().find(r => r.id === rowId);
  if (!row) return;
  const isMeta = financeRowIsMeta(row);
  const list = isMeta ? financeMetaRowsSorted() : financeGastoRowsSorted();
  const idx = list.findIndex(r => r.id === rowId);
  const swapIdx = idx + direction;
  if (idx === -1 || swapIdx < 0 || swapIdx >= list.length) return;
  const a = list[idx];
  const b = list[swapIdx];
  const rowA = settings.financeCategories[a.categoryId].rows.find(r => r.id === a.id);
  const rowB = settings.financeCategories[b.categoryId].rows.find(r => r.id === b.id);
  const tmp = rowA.priority;
  rowA.priority = rowB.priority;
  rowB.priority = tmp;
  saveSettingsOnly();
  renderFinanceSection();
}

export function financeFindRow(catId, rowId) {
  const cat = settings.financeCategories[catId];
  return cat ? cat.rows.find(r => r.id === rowId) : null;
}

// "Asignar" pasa a "Aplicar", con un pill +/- junto al monto que decide el sentido — "+" resta de
// Disponible (mismo tope de siempre: no pasa del objetivo en Gastos, no pasa de lo disponible), "-"
// devuelve dinero ya asignado a Disponible (tope: no puede restar más de lo que la fila ya tiene
// asignado).
export function financeApplySignedAmount(catId, rowId, rawAmount, sign) {
  const monto = parseMoney(rawAmount);
  if (!(monto > 0)) {
    toast('Ingresa un monto mayor a 0');
    return;
  }
  const row = financeFindRow(catId, rowId);
  if (!row) return;

  if (sign === 'minus') {
    const before = Number(row.assignedAmount) || 0;
    const removed = Math.min(monto, before);
    if (removed <= 0) {
      toast('Esta fila no tiene nada asignado para restar');
      return;
    }
    row.assignedAmount = before - removed;
    saveSettingsOnly();
    renderFinanceSection();
    toast(removed < monto
      ? `Solo se restaron ${money(removed)}${convertedAmountText(removed) ? ` (${convertedAmountText(removed)})` : ''} de ${money(monto)}${convertedAmountText(monto) ? ` (${convertedAmountText(monto)})` : ''} — la fila no tenía más asignado. El resto no se tocó.`
      : 'Aplicado');
    return;
  }

  if (monto > financeAvailableBalance()) {
    toast('No tienes suficiente disponible para asignar esa cantidad');
    return;
  }
  let appliedAmount = monto;
  if (financeRowIsMeta(row)) {
    row.assignedAmount = (Number(row.assignedAmount) || 0) + monto;
  } else {
    const target = Number(row.targetAmount) || 0;
    const before = Number(row.assignedAmount) || 0;
    row.assignedAmount = Math.min(target, before + monto);
    appliedAmount = row.assignedAmount - before;
  }
  saveSettingsOnly();
  renderFinanceSection();
  // Un Gasto ya no acepta más de lo que le falta para su objetivo — si el monto pedido se recortó,
  // se avisa cuánto entró de verdad en vez de un "Aplicado" genérico que dejaría creer que se
  // aplicó todo.
  toast(appliedAmount < monto
    ? `Solo se asignaron ${money(appliedAmount)}${convertedAmountText(appliedAmount) ? ` (${convertedAmountText(appliedAmount)})` : ''} de ${money(monto)}${convertedAmountText(monto) ? ` (${convertedAmountText(monto)})` : ''} — el gasto ya llegó a su objetivo. El resto sigue en Disponible.`
    : 'Aplicado');
}

// Reparte TODO el Disponible actual, solo, en el mismo orden de prioridad que ya usa la cascada de
// "Restante después" — primero Gastos (financeGastoRowsSorted, saltando los ya Pagados), luego
// Metas (financeMetaRowsSorted), sin pasarse del objetivo de cada fila.
export function financeRunAutoFillCascade() {
  if (!settings.financeAutoFill) return false;
  let changed = false;
  // Tope defensivo de iteraciones — cada vuelta llena una fila distinta o agota el Disponible, así
  // que nunca debería acercarse a este número.
  let guard = 0;
  while (guard++ < 500) {
    const available = financeAvailableBalance();
    if (available <= 0.004) break;
    const nextRow = financeGastoRowsSorted().find(r => !financeIsRowPagado(r))
      || financeMetaRowsSorted().find(r => (Number(r.assignedAmount) || 0) < (Number(r.targetAmount) || 0) - 0.004);
    if (!nextRow) break; // Nada pendiente en ninguna cola — el resto se queda en Disponible.
    const remaining = Math.max(0, (Number(nextRow.targetAmount) || 0) - (Number(nextRow.assignedAmount) || 0));
    const applyAmount = Math.min(available, remaining);
    if (applyAmount <= 0) break;
    nextRow.assignedAmount = (Number(nextRow.assignedAmount) || 0) + applyAmount;
    changed = true;
  }
  return changed;
}

// Checkbox "Asignar disponible automáticamente" (ver #financeAutoFillInput en el HTML) — al
// activarlo, reparte de inmediato cualquier Disponible que ya hubiera quedado sin asignar de antes.
export function updateFinanceAutoFillSetting(checked) {
  settings.financeAutoFill = !!checked;
  const changed = settings.financeAutoFill && financeRunAutoFillCascade();
  saveSettingsOnly();
  renderFinanceSection();
  if (settings.financeAutoFill) {
    toast(changed
      ? 'Asignación automática activada — tu Disponible ya se repartió en orden de prioridad'
      : 'Asignación automática activada — se repartirá con tu próxima llamada guardada');
  } else {
    toast('Asignación automática desactivada — vuelve a ser manual');
  }
}

export function financeResetRow(catId, rowId) {
  const row = financeFindRow(catId, rowId);
  if (!row) return;
  row.assignedAmount = 0;
  row.manualPaid = false;
  saveSettingsOnly();
  renderFinanceSection();
  toast('Gasto reiniciado');
}

export function financeToggleManualPaid(catId, rowId, checked) {
  const row = financeFindRow(catId, rowId);
  if (!row) return;
  row.manualPaid = !!checked;
  saveSettingsOnly();
  renderFinanceSection();
}

export function financeDeleteRow(catId, rowId) {
  const row = financeFindRow(catId, rowId);
  if (!row) return;
  appConfirm(`¿Eliminar "${row.name}"? Esta acción no se puede deshacer.`, () => {
    const cat = settings.financeCategories[catId];
    cat.rows = cat.rows.filter(r => r.id !== rowId);
    saveSettingsOnly();
    renderFinanceSection();
    toast('Fila eliminada');
  });
}

// Punto de partida editable en #financeRowNameInput al elegir categoría — nunca pisa un nombre que
// el usuario ya haya escrito a mano (solo actúa si el campo está vacío o todavía tiene la última
// sugerencia sin tocar).
let financeRowNameSuggested = '';

function financeApplyNameSuggestion(categoryId) {
  const nameInput = document.getElementById('financeRowNameInput');
  if (!nameInput) return;
  const suggestion = FINANCE_NAME_SUGGESTIONS[categoryId] || '';
  const current = nameInput.value.trim();
  if (current === '' || current === financeRowNameSuggested) {
    nameInput.value = suggestion;
    financeRowNameSuggested = suggestion;
  }
}

export function openFinanceRowModal(kind, existingRow = null) {
  financeRowModalKind = kind === 'meta' ? 'meta' : 'gasto';
  financeEditingRowId = existingRow ? existingRow.id : null;
  const title = document.getElementById('financeRowModalTitle');
  const subtitle = document.getElementById('financeRowModalSubtitle');
  const typeField = document.getElementById('financeRowTypeField');
  const nameInput = document.getElementById('financeRowNameInput');
  const categoryInput = document.getElementById('financeRowCategoryInput');
  const typeInput = document.getElementById('financeRowTypeInput');
  const targetInput = document.getElementById('financeRowTargetInput');
  const isMeta = financeRowModalKind === 'meta';
  if (nameInput) nameInput.value = existingRow ? existingRow.name : '';
  const defaultCatId = isMeta ? 'ahorro' : 'casa';
  if (categoryInput) categoryInput.value = existingRow ? existingRow.categoryId : defaultCatId;
  closeFinanceNewCatPanel();
  renderFinanceCategoryChips(categoryInput ? categoryInput.value : defaultCatId);
  // Fila nueva (no meta): arranca vacío y se llena con la sugerencia de la categoría por default.
  // Fila existente: financeRowNameSuggested queda vacío para que cambiar la categoría al editar
  // nunca reemplace un nombre real ya guardado.
  financeRowNameSuggested = '';
  if (!existingRow && !isMeta && categoryInput) financeApplyNameSuggestion(categoryInput.value);
  if (typeInput) typeInput.value = existingRow ? (existingRow.recurring ? 'recurring' : 'onetime') : 'recurring';
  if (targetInput) targetInput.value = existingRow ? existingRow.targetAmount : '';
  const targetCurrencyField = document.getElementById('financeRowTargetCurrencyField');
  const targetCurrencyLabelEl = document.getElementById('financeRowTargetCurrencyLabel');
  const targetCurrencyInput = document.getElementById('financeRowTargetCurrencyInput');
  const currencyLabelTrim = String(settings.currencyLabel || '').trim();
  const exchangeRate = Number(settings.exchangeRate);
  const hasCurrency = financeHasSecondaryCurrency();
  if (targetCurrencyField) targetCurrencyField.style.display = hasCurrency ? '' : 'none';
  if (hasCurrency) {
    if (targetCurrencyLabelEl) targetCurrencyLabelEl.textContent = `Monto objetivo en ${currencyLabelTrim}`;
    if (targetCurrencyInput) targetCurrencyInput.value = existingRow ? (Number(existingRow.targetAmount || 0) * exchangeRate).toFixed(2) : '';
  } else if (targetCurrencyInput) {
    targetCurrencyInput.value = '';
  }
  if (title) title.textContent = existingRow ? (isMeta ? 'Editar meta' : 'Editar gasto') : (isMeta ? 'Agregar meta' : 'Agregar gasto');
  if (subtitle) {
    subtitle.textContent = existingRow
      ? 'Corrige nombre, categoría/tipo o monto objetivo. Para sumar o restar el monto asignado, usa el pill +/- de la fila.'
      : 'Se agrega al final de la cola de prioridad — puedes reordenarla después con las flechas ↑/↓.';
  }
  // La categoría ya no se esconde en Metas: "Meta de ahorro" es una categoría más entre las que se
  // puede elegir, no un caso aparte forzado a 'ahorro'.
  if (typeField) typeField.style.display = isMeta ? 'none' : '';
  openModal('financeRowModal');
}

// Grilla de categorías del modal Agregar gasto/meta: chips (ícono/emoji + nombre) por cada
// categoría fija + propia, más el chip final "+ Nueva categoría".
function renderFinanceCategoryChips(selectedId) {
  const grid = document.getElementById('financeRowCategoryChips');
  if (!grid) return;
  const customIds = new Set(
    (Array.isArray(settings.customFinanceCategories) ? settings.customFinanceCategories : []).map(c => c.id)
  );
  const cats = financeAllCategories();
  grid.innerHTML = cats.map(cat => {
    const chipBtn = `
      <button type="button" class="fin-cat-chip ${cat.id === selectedId ? 'selected' : ''}" data-fin-cat-chip="${escapeHtml(cat.id)}" style="--cat-rgb:${cat.rgb};">
        <span class="fin-cat-chip-icon">${financeCategoryIconHtml(cat)}</span>
        <span class="fin-cat-chip-label">${escapeHtml(cat.label)}</span>
      </button>`;
    // Solo las categorías propias se pueden editar/borrar — las 7 fijas de FINANCE_CATEGORIES no.
    if (!customIds.has(cat.id)) return chipBtn;
    return `
      <div class="fin-cat-chip-wrap">
        ${chipBtn}
        <button type="button" class="tbl-icon-btn" data-fin-cat-edit="${escapeHtml(cat.id)}" aria-label="Editar categoría" title="Editar categoría">${iconHtml('edit')}</button>
        <button type="button" class="tbl-icon-btn bad" data-fin-cat-delete="${escapeHtml(cat.id)}" aria-label="Borrar categoría" title="Borrar categoría">${iconHtml('trash')}</button>
      </div>`;
  }).join('') + `
    <button type="button" class="fin-cat-chip fin-cat-chip-new" id="financeRowNewCatToggle">
      <span class="fin-cat-chip-icon">${iconHtml('plus')}</span>
      <span class="fin-cat-chip-label">Nueva categoría</span>
    </button>
  `;
}

export function selectFinanceCategoryChip(catId) {
  const categoryInput = document.getElementById('financeRowCategoryInput');
  if (categoryInput) categoryInput.value = catId;
  document.querySelectorAll('#financeRowCategoryChips [data-fin-cat-chip]').forEach(btn => {
    btn.classList.toggle('selected', btn.getAttribute('data-fin-cat-chip') === catId);
  });
  if (financeRowModalKind !== 'meta') financeApplyNameSuggestion(catId);
}

// Sin catId: modo alta (panel vacío). Con catId: modo edición, precarga nombre/emoji/color de esa
// categoría propia y financeEditingCatId queda seteado hasta que se guarda o se cancela.
export function openFinanceNewCatPanel(catId = null) {
  const panel = document.getElementById('financeRowNewCatPanel');
  if (!panel) return;
  const nameInput = document.getElementById('financeNewCatNameInput');
  const emojiInput = document.getElementById('financeNewCatEmojiInput');
  const colorInput = document.getElementById('financeNewCatColorInput');
  const title = document.getElementById('financeNewCatPanelTitle');
  const btnLabel = document.getElementById('createFinCatBtnLabel');
  const existing = catId
    ? (Array.isArray(settings.customFinanceCategories) ? settings.customFinanceCategories : []).find(c => c.id === catId)
    : null;
  financeEditingCatId = existing ? existing.id : null;
  if (title) title.textContent = existing ? 'Editar categoría' : 'Nueva categoría';
  if (btnLabel) btnLabel.textContent = existing ? 'Guardar cambios' : 'Crear categoría';
  if (nameInput) nameInput.value = existing ? existing.label : '';
  const defaultEmoji = existing ? existing.emoji : '🏷️';
  if (emojiInput) emojiInput.value = defaultEmoji;
  const defaultColor = existing && FINANCE_CUSTOM_CATEGORY_PALETTE.includes(existing.rgb) ? existing.rgb : FINANCE_CUSTOM_CATEGORY_PALETTE[0];
  if (colorInput) colorInput.value = defaultColor;
  renderEmojiPicker('emojiPickerNewFinCat', defaultEmoji);
  renderFinanceColorSwatches(defaultColor);
  panel.classList.add('open');
  if (nameInput) setTimeout(() => nameInput.focus(), 40);
}

export function closeFinanceNewCatPanel() {
  const panel = document.getElementById('financeRowNewCatPanel');
  if (panel) panel.classList.remove('open');
  financeEditingCatId = null;
}

function renderFinanceColorSwatches(selected) {
  const row = document.getElementById('financeNewCatColorRow');
  if (!row) return;
  row.innerHTML = FINANCE_CUSTOM_CATEGORY_PALETTE.map(rgb => `
    <button type="button" class="fin-cat-color-swatch ${rgb === selected ? 'selected' : ''}" data-fin-cat-color="${rgb}" style="--sw-rgb:${rgb};" aria-label="Elegir este color"></button>
  `).join('');
}

// Crea o edita una categoría propia según financeEditingCatId (seteado por openFinanceNewCatPanel).
// Alta: la agrega, la selecciona en la grilla y crea settings.financeCategories[id] vacío.
// Edición: actualiza label/emoji/rgb en el mismo objeto — no toca settings.financeCategories[id]
// (las filas ya guardadas en esa categoría siguen ahí, solo cambia cómo se ve la categoría).
export function createFinanceCategory() {
  const nameInput = document.getElementById('financeNewCatNameInput');
  const emojiInput = document.getElementById('financeNewCatEmojiInput');
  const colorInput = document.getElementById('financeNewCatColorInput');
  const label = String(nameInput?.value || '').trim().slice(0, 24);
  if (!label) {
    toast('Ponle un nombre a la categoría');
    return;
  }
  const emoji = String(emojiInput?.value || '').trim() || '🏷️';
  const rgb = FINANCE_CUSTOM_CATEGORY_PALETTE.includes(colorInput?.value) ? colorInput.value : FINANCE_CUSTOM_CATEGORY_PALETTE[0];
  if (!Array.isArray(settings.customFinanceCategories)) settings.customFinanceCategories = [];

  if (financeEditingCatId) {
    const existing = settings.customFinanceCategories.find(c => c.id === financeEditingCatId);
    if (!existing) { closeFinanceNewCatPanel(); return; }
    existing.label = label;
    existing.emoji = emoji;
    existing.rgb = rgb;
    const editedId = existing.id;
    saveSettingsOnly();
    closeFinanceNewCatPanel();
    renderFinanceCategoryChips(editedId);
    selectFinanceCategoryChip(editedId);
    renderFinanceSection();
    toast(`Categoría "${label}" actualizada`);
    return;
  }

  const id = `custom_${makeLocalId()}`;
  settings.customFinanceCategories.push({ id, label, emoji, rgb });
  settings.financeCategories[id] = { rows: [] };
  saveSettingsOnly();
  closeFinanceNewCatPanel();
  renderFinanceCategoryChips(id);
  selectFinanceCategoryChip(id);
  toast(`Categoría "${label}" creada`);
}

// Borra una categoría propia. Sus filas (si tenía) no se pierden: pasan a "Otro", igual fija para
// Gastos y Metas gracias a financeRowIsMeta(). Si la categoría borrada era la seleccionada en el
// modal abierto, la selección pasa a "Otro" también.
export function financeDeleteCategory(catId) {
  const cat = (Array.isArray(settings.customFinanceCategories) ? settings.customFinanceCategories : []).find(c => c.id === catId);
  if (!cat) return;
  const catRows = settings.financeCategories[catId] ? settings.financeCategories[catId].rows : [];
  const rowCount = catRows.length;
  const warning = rowCount > 0
    ? ` Sus ${rowCount} fila(s) no se borran: pasan a la categoría "Otro".`
    : '';
  appConfirm(`¿Borrar la categoría "${cat.label}"?${warning} Esta acción no se puede deshacer.`, () => {
    if (settings.financeCategories[catId]) {
      catRows.forEach(row => { row.categoryId = 'otro'; });
      if (!settings.financeCategories.otro) settings.financeCategories.otro = { rows: [] };
      settings.financeCategories.otro.rows.push(...catRows);
      delete settings.financeCategories[catId];
    }
    settings.customFinanceCategories = settings.customFinanceCategories.filter(c => c.id !== catId);
    saveSettingsOnly();
    if (financeEditingCatId === catId) closeFinanceNewCatPanel();
    const categoryInput = document.getElementById('financeRowCategoryInput');
    const wasSelected = categoryInput && categoryInput.value === catId;
    const nextSelected = wasSelected ? 'otro' : (categoryInput ? categoryInput.value : 'otro');
    if (categoryInput) categoryInput.value = nextSelected;
    renderFinanceCategoryChips(nextSelected);
    renderFinanceSection();
    toast(`Categoría "${cat.label}" borrada`);
  });
}

export function saveFinanceRowModal() {
  const nameInput = document.getElementById('financeRowNameInput');
  const categoryInput = document.getElementById('financeRowCategoryInput');
  const typeInput = document.getElementById('financeRowTypeInput');
  const targetInput = document.getElementById('financeRowTargetInput');
  const targetCurrencyInput = document.getElementById('financeRowTargetCurrencyInput');
  const name = String(nameInput?.value || '').trim();
  // Blindaje: si el campo "Monto objetivo en tu moneda" tiene un valor válido, se recalcula el
  // objetivo en $ a partir de ahí en vez de confiar ciegamente en el campo oculto ya sincronizado
  // por syncFinanceRowTargetFields — cubre el caso donde ese 'input' de sincronización no llegó a
  // disparar antes de "Guardar" (autocompletado del navegador, pegado rápido, etc.), que dejaba el
  // objetivo guardado con el valor viejo aunque se viera el campo en moneda secundaria ya
  // actualizado en pantalla.
  if (financeHasSecondaryCurrency() && targetCurrencyInput) {
    const curVal = Number(targetCurrencyInput.value);
    const exchangeRate = Number(settings.exchangeRate);
    const usdVal = Number(targetInput.value);
    const currencyIsSourceOfTruth = !Number.isFinite(usdVal) || Number(targetCurrencyInput.value) !== Number((usdVal * exchangeRate).toFixed(2));
    if (currencyIsSourceOfTruth && Number.isFinite(curVal) && curVal > 0 && Number.isFinite(exchangeRate) && exchangeRate > 0) {
      targetInput.value = usdCeilFromCurrencyAmount(curVal, exchangeRate).toFixed(2);
    }
  }
  const target = Number(targetInput?.value);
  if (!name) {
    toast('Ponle un nombre a la fila');
    return;
  }
  if (!Number.isFinite(target) || target <= 0) {
    toast('El monto objetivo debe ser mayor a 0');
    return;
  }
  const isMeta = financeRowModalKind === 'meta';
  const chosenCatId = String(categoryInput?.value || '');
  const catId = financeAllCategories().some(c => c.id === chosenCatId) ? chosenCatId : (isMeta ? 'ahorro' : 'otro');

  if (financeEditingRowId) {
    // Una fila puede vivir en cualquier categoría (fija o propia) — ya no se restringe la búsqueda
    // según sea Gasto o Meta, porque una Meta ya no está atada a la categoría 'ahorro'.
    let foundCatId = null, foundRow = null;
    financeAllCategoryIds().forEach(cId => {
      const r = (settings.financeCategories[cId]?.rows || []).find(row => row.id === financeEditingRowId);
      if (r) { foundCatId = cId; foundRow = r; }
    });
    if (!foundRow) {
      toast('No se encontró la fila a editar');
      closeModal('financeRowModal');
      financeEditingRowId = null;
      return;
    }

    // El modal ya no edita el monto asignado (eso vive en el pill +/- de la fila, ver
    // financeApplySignedAmount) — si el objetivo se editó por debajo de lo ya asignado, se recorta
    // para no dejar un Gasto por encima de su propio objetivo.
    const oldAssigned = Number(foundRow.assignedAmount) || 0;
    const clampedAssigned = isMeta ? oldAssigned : Math.min(oldAssigned, target);

    foundRow.name = name;
    foundRow.targetAmount = target;
    foundRow.assignedAmount = clampedAssigned;
    // Se guarda explícito en cada edición (incluida una fila vieja sin este campo, ver
    // financeRowIsMeta) para que el tipo ya no dependa de su categoría.
    foundRow.kind = isMeta ? 'meta' : 'gasto';
    if (!isMeta) {
      foundRow.recurring = (typeInput?.value || 'recurring') === 'recurring';
    }
    if (catId !== foundCatId) {
      settings.financeCategories[foundCatId].rows = settings.financeCategories[foundCatId].rows.filter(r => r.id !== foundRow.id);
      foundRow.categoryId = catId;
      settings.financeCategories[catId].rows.push(foundRow);
    }
    financeRunAutoFillCascade();
    saveSettingsOnly();
    closeModal('financeRowModal');
    renderFinanceSection();
    toast(isMeta ? 'Meta actualizada' : 'Gasto actualizado');
    financeEditingRowId = null;
    return;
  }

  const cat = settings.financeCategories[catId];
  // La cola de prioridad es GLOBAL (todas las categorías de Gastos combinadas, ver
  // financeGastoRowsSorted) — el máximo debe salir de ahí, no de `cat.rows` (solo esta categoría),
  // o dos filas de categorías distintas pueden terminar con el mismo número de prioridad.
  const priorityQueue = isMeta ? financeMetaRowsSorted() : financeGastoRowsSorted();
  const maxPriority = priorityQueue.reduce((max, r) => Math.max(max, Number(r.priority) || 0), 0);
  const row = {
    id: makeLocalId(),
    name,
    categoryId: catId,
    kind: isMeta ? 'meta' : 'gasto',
    targetAmount: target,
    assignedAmount: 0,
    priority: maxPriority + 1,
  };
  if (!isMeta) {
    row.recurring = (typeInput?.value || 'recurring') === 'recurring';
    row.manualPaid = false;
  }
  cat.rows.push(row);
  // La fila nueva entra al final de su cola (prioridad más baja) — si ya había Disponible sin
  // asignar de antes, solo le toca lo que sobre después de las filas con más prioridad.
  financeRunAutoFillCascade();
  saveSettingsOnly();
  closeModal('financeRowModal');
  renderFinanceSection();
  toast(isMeta ? 'Meta agregada' : 'Gasto agregado');
}

// Mismo criterio que updateChipsScrollHint, aplicado a las filas de Totales de Finanzas
// (#pageFinance.wk-total-metrics) — puede haber 2 a la vez (Gastos y Metas), se revisan todas.
export function updateFinanceTotalsScrollHint() {
  document.querySelectorAll('#pageFinance .wk-total-metrics').forEach(el => {
    const overflows = el.scrollWidth > el.clientWidth + 1;
    el.classList.toggle('is-scrollable', overflows);
  });
}
