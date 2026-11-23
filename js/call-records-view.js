import { compareCallRecords, preserveCallRecords, unfinishedCallIntervals } from './call-records.js';

// Nota simple de por que el final de la medicion es aproximado (la extension cerro la llamada sin ver la desconexion).
function approxEndHtml(tool, translateText, esc) {
  const text = tool?.endedBy === 'portal-closed' ? translateText('Fin aproximado: se cerró la pestaña de Propio durante la llamada. Se guardó con la hora del cierre.')
    : tool?.endedBy === 'portal-reloaded' ? translateText('Fin aproximado: se recargó la página de Propio durante la llamada. Se guardó con la hora de la recarga.')
    : tool?.endedBy === 'computer-slept' ? translateText('Fin aproximado: la computadora se suspendió durante la llamada. Se guardó con el último momento en que se vio activa.')
    : tool?.endedBy === 'propio-stopped' ? translateText('Fin aproximado: Propio dejó de mostrar la llamada (se cayó, se congeló o llegó a su límite de tiempo). Se guardó con el último momento en que se vio conectada.')
    : tool?.endedBy === 'chrome-restarted' ? translateText('Fin aproximado: Chrome o la computadora se cerró durante la llamada. Se guardó con el último momento en que se vio activa (puede diferir entre 30 y 60 segundos).') : '';
  return text ? `<p class="record-source-note record-approx-end">${esc(text)}</p>` : '';
}

export function linkCallRecordReview(context, reviewId, callId, opened) {
  const { translateText } = context;
  const { calls, state, settings } = context.data();
  const review = (state.callRecordReviews || []).find(item => item.id === reviewId);
  const candidate = calls.find(item => item.id === callId);
  if (!context.canPersistLocalChanges() || !review || !candidate || candidate.source !== 'live'
    || !review.candidateIds.includes(callId) || opened.owner !== settings
    || opened.review !== JSON.stringify(review) || opened.candidates !== JSON.stringify(calls.filter(call => review.candidateIds.includes(call.id)))) {
    context.toast(translateText('Los registros cambiaron. Cerrá y abrí la comparación antes de vincular.')); return false;
  }
  const incoming = review.call;
  if (state.activeCall || unfinishedCallIntervals(state).some(interval => context.callsOverlap(interval, incoming))
    || calls.some(call => call.id !== callId && context.callsOverlap(call, incoming))) {
    context.toast(translateText('Otra llamada cruza este registro. Revisá los tiempos antes de vincular; no se eliminó ningún respaldo.')); return false;
  }
  const previousState = structuredClone(state), categories = structuredClone(settings.financeCategories);
  const distribution = structuredClone(settings.financeLastDistribution);
  const call = preserveCallRecords({ ...incoming, id: candidate.id, callDate: candidate.callDate,
    calendarCallDate: candidate.calendarCallDate || incoming.calendarCallDate || incoming.callDate, shiftDayKey: candidate.shiftDayKey,
    ...(candidate.frozenHigherRateBonus ? { frozenHigherRateBonus: { ...candidate.frozenHigherRateBonus } } : {}),
    ...(candidate.propioBridge ? { propioBridge: { ...candidate.propioBridge, timingEstimated: false, payEstimated: false } } : {}),
    source: 'import', importedAt: review.receivedAt, officialCorrection: { kind: 'reconciled', at: new Date().toISOString() },
  }, candidate, review.receivedAt);
  const stagedCalls = calls.map(item => item.id === callId ? call : item);
  context.setCalls(stagedCalls);
  state.callRecordReviews = state.callRecordReviews.filter(item => item.id !== reviewId);
  let saved = false;
  try {
    context.reconcileLastCallEndedAt(call.callDate);
    context.financeRunAutoFillCascade();
    saved = context.saveAll() !== false;
  } catch { /* El respaldo permanece si falla el guardado. */ }
  if (!saved) {
    const current = context.data();
    if (current.state === state && current.settings === settings && current.calls === stagedCalls) {
      context.setCalls(calls); context.setState(previousState); settings.financeCategories = categories;
      if (distribution === undefined) delete settings.financeLastDistribution; else settings.financeLastDistribution = distribution;
    }
    context.render(); return false;
  }
  context.onReinforcementCallsChanged(call.callDate); context.render();
  context.toast(translateText('Respaldo vinculado. Las dos versiones se conservaron.'));
  return true;
}

export function openCallRecords(context, callId, acwStart = null, reviewId = null) {
  const { calls, state, settings } = context.data(), owner = settings;
  const { ui, translateText, escapeHtml: esc, money, financeConvertedInline, formatDuration } = context;
  const root = document.getElementById('callRecordsContent');
  const call = calls.find(item => item.id === callId);
  const help = document.getElementById('callRecordingHelp');
  if (help) help.hidden = !call;
  const comparison = compareCallRecords(call), { tool, propio } = comparison;
  const clock = value => Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleTimeString(context.displayLocale(), { hour:'2-digit', minute:'2-digit', second:'2-digit' }) : '—';
  const equationClock = value => new Date(value).toLocaleTimeString(context.displayLocale(), { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false });
  const compactDuration = value => formatDuration(value).replace(/^00:/, '');
  const amount = value => `${money(value)}${financeConvertedInline(value)}`;
  const row = (label, value) => `<div><dt>${esc(label)}</dt><dd>${value}</dd></div>`;
  const start = acwStart || propio?.endISO || tool?.endISO;
  const elapsed = acwStart ? Math.max(0, Date.now() - Date.parse(start)) : null;
  const corrected = !!call?.manualCorrectionAt;
  const title = corrected && acwStart ? translateText('El ACW sigue tu corrección guardada') : propio ? tool && acwStart ? translateText('El ACW sigue el final de Propio') : translateText('Registro informado por Propio')
    : tool ? translateText('La medición original sigue guardada') : acwStart ? translateText('ACW desde el turno o una pausa') : translateText('Vínculos pendientes de revisión');
  document.getElementById('callRecordsSubtitle').textContent = call ? call.callDate : translateText('Tus observaciones se conservan');
  let html = `<div class="record-explain"><strong>${esc(title)}</strong><p>${esc(corrected ? translateText('Tu corrección guardada se usa en el registro. Las fuentes originales se conservan como respaldo.') : propio && tool ? translateText('Propio tiene prioridad. La observación original sigue guardada como respaldo.') : tool ? translateText('La llamada aún no está confirmada en el historial de Propio. No se borra por ausencia.') : translateText('Consultá el origen de los tiempos y los registros disponibles.'))}</p></div>`;
  if (Number.isFinite(elapsed)) html += `<div class="record-equation"><div><small>${esc(translateText('Ahora'))}</small><strong>${esc(equationClock(new Date().toISOString()))}</strong></div><span>−</span><div><small>${esc(corrected ? translateText('Final corregido') : propio ? translateText('Final de Propio*') : tool ? translateText('Final observado') : translateText('Inicio del ACW'))}</small><strong>${esc(equationClock(start))}</strong></div><span>=</span><div><small>ACW</small><strong class="record-acw-value">${esc(compactDuration(elapsed))}</strong></div></div>`;
  if (comparison.differenceMs !== null && (Math.abs(comparison.differenceMs) >= 1000 || comparison.payDifference)) {
    if (propio && tool) {
      const clock24 = value => Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleTimeString(context.displayLocale(), { hour:'2-digit', minute:'2-digit', hour12:false }) : '—';
      const shortDuration = value => compactDuration(value).replace(/^0(?=\d:)/, '');
      const propioMs = Number(propio.durationMin) * 60000, toolMs = Number(tool.durationMs);
      const longest = Math.max(propioMs, toolMs, 1);
      const width = value => `${Math.max(4, Math.round(value / longest * 100))}%`;
      const durationGap = toolMs - propioMs, payGap = Number(tool.pay) - Number(propio.pay);
      const tags = [];
      if (Math.abs(durationGap) >= 1000) tags.push(['diff', durationGap > 0 ? ui`Duración: la tool midió ${shortDuration(durationGap)} más` : ui`Duración: la tool midió ${shortDuration(-durationGap)} menos`]);
      if (Math.abs(payGap) >= 0.005) tags.push(['diff', payGap > 0 ? ui`Pago: la tool estimó ${money(payGap)} más` : ui`Pago: la tool estimó ${money(-payGap)} menos`]);
      tags.push(['rule', corrected ? translateText('Cuenta tu corrección guardada') : translateText('Cuenta Propio (tiene prioridad)')]);
      html += `<section class="record-compare"><h3>${esc(translateText('Comparación'))}</h3>`
        + `<div class="record-compare-row" data-source="propio"><span class="record-compare-name">Propio</span><span class="record-compare-track"><i style="width:${width(propioMs)}"></i></span><span class="record-compare-label">${esc(ui`${propio.durationMin} min`)} · ${esc(clock24(propio.startISO))} → ${esc(clock24(propio.endISO))}</span></div>`
        + `<div class="record-compare-row" data-source="tool"><span class="record-compare-name">Tool</span><span class="record-compare-track"><i style="width:${width(toolMs)}"></i></span><span class="record-compare-label">${esc(shortDuration(toolMs))} · ${esc(clock24(tool.startISO))} → ${esc(clock24(tool.endISO))}</span></div>`
        + `<div class="record-compare-tags">${tags.map(([kind, text]) => `<span class="record-compare-tag" data-kind="${kind}">${esc(text)}</span>`).join('')}</div></section>`;
    } else {
      html += `<div class="record-difference-line">${esc(ui`Diferencia de cierre: ${formatDuration(Math.abs(comparison.differenceMs))}`)}${comparison.payDifference ? ` · ${esc(translateText('Diferencia de pago'))}: ${amount(Math.abs(comparison.payDifference))}` : ''}</div>`;
    }
  }
  if (call) {
    if (call.manualCorrectionAt || !propio && !tool) html += `<div class="review-overview"><div class="review-metric"><span>${esc(translateText('Duración registrada'))}</span><strong>${esc(formatDuration(Number(call.durationMin) * 60000))}</strong></div><div class="review-metric"><span>${esc(translateText('Pago registrado'))}</span><strong>${amount(Number(String(call.pay).replace(/[$,\s]/g,'')))}</strong></div></div>`;
    if (propio || tool) {
    html += `<div class="record-sources"><article class="record-source is-propio"><header><strong>Propio</strong><span>${esc(propio ? corrected ? translateText('RESPALDO') : translateText('PRIORIDAD') : translateText('PENDIENTE'))}</span></header>`;
    html += propio ? `<dl>${row(translateText('Inicio informado'),esc(clock(propio.startISO)))}${row(translateText('Final calculado*'),esc(clock(propio.endISO)))}${row(translateText('Duración informada'),esc(ui`${propio.durationMin} min`))}${row(translateText('Pago informado'),amount(propio.pay))}</dl><p class="record-source-note">${esc(translateText('*Inicio + duración del historial. Propio no expone aquí los segundos originales.'))}</p>`
      : `<div class="record-await"><strong>${esc(translateText('Aún no aparece'))}</strong><p>${esc(translateText('Tu respaldo se conserva mientras esperamos el historial.'))}</p></div>`;
    html += `</article><article class="record-source"><header><strong>${esc(translateText('Medición guardada'))}</strong><span>${esc(translateText('RESPALDO'))}</span></header>`;
    html += tool ? `<dl>${row(translateText('Inicio observado'),esc(clock(tool.startISO)))}${row(translateText('Final observado'),esc(clock(tool.endISO)))}${row(translateText('Duración observada'),esc(formatDuration(tool.durationMs)))}${row(translateText('Pago estimado'),amount(tool.pay))}</dl><p class="record-source-note">${esc(translateText('Tiempos detectados; se conservan aunque el historial cambie.'))}</p>${approxEndHtml(tool, translateText, esc)}`
      : `<div class="record-await"><strong>${esc(translateText('Sin observación disponible'))}</strong><p>${esc(translateText('No reconstruimos segundos que no se registraron.'))}</p></div>`;
    html += '</article></div>';
    if (!corrected && propio && tool && (!propio.durationMin || !propio.pay)) html += `<div class="record-review-note"><strong>${esc(translateText('Propio informa cero'))}</strong><p>${esc(translateText('El total usa el registro de Propio. Tu observación y su estimación siguen disponibles.'))}</p></div>`;
    html += `<p class="record-foot">${esc(translateText('Dos fuentes de la misma llamada; no se suman dos veces.'))}</p>`;
    }
    const reflection = state.game?.reinforcement?.reflections?.[call.id];
    if (reflection) html += `<details class="record-history"><summary>${esc(translateText('Cierre personal de esta llamada'))}</summary><p>${esc(({good:translateText('Cerró bien'),difficult:translateText('Fue difícil'),learning:translateText('Me dejó un aprendizaje')})[reflection.outcome] || reflection.outcome)}</p>${reflection.note ? `<p>${esc(reflection.note)}</p>` : ''}</details>`;
    const events = [];
    if (tool) {
      events.push([tool.startISO,translateText('Inicio observado')],[tool.endISO,translateText('Cierre observado · respaldo guardado')]);
    }
    if (propio?.receivedAt) events.push([propio.receivedAt,translateText('Historial de Propio recibido')]);
    for (const previous of call.records?.changes || []) if(previous.receivedAt) events.push([previous.receivedAt,translateText('Versión anterior de Propio conservada')]);
    html += `<details class="record-history"><summary>${esc(translateText('Ver cómo se actualizó esta llamada'))}</summary><ol>${events.sort((a,b)=>Date.parse(a[0])-Date.parse(b[0])).map(([at,label])=>`<li><time>${esc(clock(at))}</time><span>${esc(label)}</span></li>`).join('')}</ol>${tool ? `<div class="record-precision"><strong>${esc(translateText('Marcas observadas con milisegundos'))}</strong><code>${esc(tool.startISO)}</code><code>${esc(tool.endISO)}</code><p>${esc(ui`Duración guardada: ${tool.durationMs} ms`)}</p></div>` : ''}</details>`;
  }
  const reviews = (state.callRecordReviews || []).filter(review => reviewId ? review.id === reviewId : call && review.candidateIds.includes(call.id));
  for (const review of reviews) {
    const candidates = calls.filter(item => review.candidateIds.includes(item.id));
    html += `<section class="record-review-note"><strong>${esc(translateText('Revisá antes de vincular'))} · #${esc(review.call.customerId)}</strong><p>${esc(ui`Propio: ${clock(review.call.startISO)} · ${review.call.durationMin} min`)} · ${amount(Number(String(review.call.pay).replace(/[$,\s]/g,'')))}</p><div class="record-candidates">${candidates.map((item,index)=>`<label><input type="radio" name="record-${esc(review.id)}" value="${esc(item.id)}" ${index?'':'checked'}/><span>${esc(clock(item.startISO))} → ${esc(clock(item.endISO))}<small>${esc(formatDuration(Date.parse(item.endISO)-Date.parse(item.startISO)))}</small></span></label>`).join('')}</div><button class="mc-btn-primary cyan" type="button" data-record-link="${esc(review.id)}">${esc(translateText('Vincular respaldo seleccionado'))}</button><p class="record-source-note">${esc(translateText('Los demás registros se conservan. Si hay un cruce con otra llamada, la vinculación se detiene para revisión.'))}</p></section>`;
  }
  root.innerHTML = html;
  for (const button of root.querySelectorAll('[data-record-link]')) {
    const review = reviews.find(item => item.id === button.dataset.recordLink);
    const opened = { owner, review: JSON.stringify(review), candidates: JSON.stringify(calls.filter(item => review.candidateIds.includes(item.id))) };
    button.addEventListener('click', () => {
      const input = [...root.querySelectorAll('input[type="radio"]')].find(item => item.name === `record-${review.id}` && item.checked);
      if (input && linkCallRecordReview(context, review.id, input.value, opened)) context.closeModal('callEditModal');
    });
  }
  context.openModal('callEditModal');
}

// Juntar a mano una llamada solo-tool con una llamada solo-Propio (la pista "posible repetida").
// Nunca se llama sola: pide confirmacion mostrando las dos lado a lado.
function joinableCalls(calls, toolId, propioId) {
  const toolCall = calls.find(item => item.id === toolId), propioCall = calls.find(item => item.id === propioId);
  const t = toolCall && compareCallRecords(toolCall), p = propioCall && compareCallRecords(propioCall);
  return t?.tool && !t.propio && p?.propio && !p.tool ? { toolCall, propioCall, tool: t.tool, propio: p.propio } : null;
}

export function joinCallRecords(context, toolId, propioId, opened) {
  const { translateText } = context;
  const { calls, state, settings } = context.data();
  const found = joinableCalls(calls, toolId, propioId);
  if (!context.canPersistLocalChanges() || !found || opened.owner !== settings
    || opened.tool !== JSON.stringify(found.toolCall) || opened.propio !== JSON.stringify(found.propioCall)) {
    context.toast(translateText('Los registros cambiaron. Cerrá y abrí la comparación antes de juntar.')); return false;
  }
  const { toolCall, propioCall } = found;
  if (state.activeCall || unfinishedCallIntervals(state).some(interval => context.callsOverlap(interval, propioCall))
    || calls.some(call => call.id !== toolId && call.id !== propioId && context.callsOverlap(call, propioCall))) {
    context.toast(translateText('Otra llamada cruza este registro. Revisá los tiempos antes de juntar; no se eliminó nada.')); return false;
  }
  const previousState = structuredClone(state), categories = structuredClone(settings.financeCategories);
  const distribution = structuredClone(settings.financeLastDistribution);
  const merged = preserveCallRecords({ ...propioCall, id: toolCall.id, callDate: toolCall.callDate,
    calendarCallDate: toolCall.calendarCallDate || propioCall.calendarCallDate || propioCall.callDate, shiftDayKey: toolCall.shiftDayKey,
    ...(toolCall.frozenHigherRateBonus ? { frozenHigherRateBonus: { ...toolCall.frozenHigherRateBonus } } : {}),
    ...(toolCall.propioBridge ? { propioBridge: { ...toolCall.propioBridge, timingEstimated: false, payEstimated: false } } : {}),
    source: 'import', officialCorrection: { kind: 'reconciled', at: new Date().toISOString() },
  }, toolCall, propioCall.records?.propio?.receivedAt || propioCall.importedAt);
  const stagedCalls = calls.filter(item => item.id !== propioId).map(item => item.id === toolId ? merged : item);
  context.setCalls(stagedCalls);
  let saved = false;
  try {
    context.reconcileLastCallEndedAt(merged.callDate);
    context.financeRunAutoFillCascade();
    saved = context.saveAll() !== false;
  } catch { /* Las dos llamadas permanecen si falla el guardado. */ }
  if (!saved) {
    const current = context.data();
    if (current.state === state && current.settings === settings && current.calls === stagedCalls) {
      context.setCalls(calls); context.setState(previousState); settings.financeCategories = categories;
      if (distribution === undefined) delete settings.financeLastDistribution; else settings.financeLastDistribution = distribution;
    }
    context.render(); return false;
  }
  context.onReinforcementCallsChanged(merged.callDate); context.render();
  context.toast(translateText('Llamadas juntas. Las dos mediciones se conservaron.'));
  return true;
}

export function openCallJoin(context, toolId, propioId) {
  const { calls, settings } = context.data();
  const { ui, translateText, escapeHtml: esc, money, financeConvertedInline, formatDuration } = context;
  const root = document.getElementById('callRecordsContent');
  const found = joinableCalls(calls, toolId, propioId);
  if (!root) return false;
  if (!found) { root.innerHTML = `<p class="note">${esc(translateText('Estas llamadas ya cambiaron. Cerrá esta ventana y revisá la tabla.'))}</p>`; return false; }
  const { tool, propio, toolCall, propioCall } = found;
  const clock = value => new Date(value).toLocaleTimeString(context.displayLocale(), { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const amount = value => `${money(value)}${financeConvertedInline(value)}`;
  const row = (label, value) => `<div><dt>${esc(label)}</dt><dd>${value}</dd></div>`;
  root.innerHTML = `<div class="record-explain"><strong>${esc(translateText('¿Es la misma llamada?'))}</strong><p>${esc(translateText('La tool midió una llamada y Propio informó otra parecida. Si las juntas queda una sola llamada con las dos mediciones. Si no estás seguro, cierra sin juntar.'))}</p></div>`
    + `<div class="record-sources"><article class="record-source is-propio"><header><strong>Propio</strong><span>#${esc(propioCall.customerId)}</span></header><dl>${row(translateText('Inicio informado'), esc(clock(propio.startISO)))}${row(translateText('Duración informada'), esc(ui`${propio.durationMin} min`))}${row(translateText('Pago informado'), amount(propio.pay))}</dl></article>`
    + `<article class="record-source"><header><strong>${esc(translateText('Medición guardada'))}</strong><span>Tool</span></header><dl>${row(translateText('Inicio observado'), esc(clock(tool.startISO)))}${row(translateText('Duración observada'), esc(formatDuration(tool.durationMs)))}${row(translateText('Pago estimado'), amount(tool.pay))}</dl>${approxEndHtml(tool, translateText, esc)}</article></div>`
    + `<button class="mc-btn-primary cyan" type="button" data-call-join-confirm>${esc(translateText('Juntar estas dos llamadas'))}</button><p class="record-source-note">${esc(translateText('Las dos mediciones se conservan y el pago no se suma dos veces.'))}</p>`;
  const opened = { owner: settings, tool: JSON.stringify(toolCall), propio: JSON.stringify(propioCall) };
  root.querySelector('[data-call-join-confirm]').addEventListener('click', () => {
    if (joinCallRecords(context, toolId, propioId, opened)) context.closeModal('callEditModal');
  });
  return true;
}
