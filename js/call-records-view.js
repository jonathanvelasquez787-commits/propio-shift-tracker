import { compareCallRecords, preserveCallRecords } from './call-records.js';

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
  if (state.activeCall || calls.some(call => call.id !== callId && context.callsOverlap(call, incoming))) {
    context.toast(translateText('Otra llamada cruza este registro. Revisá los tiempos antes de vincular; no se eliminó ningún respaldo.')); return false;
  }
  const previousState = structuredClone(state), categories = structuredClone(settings.financeCategories);
  const call = preserveCallRecords({ ...incoming, id: candidate.id, callDate: candidate.callDate,
    calendarCallDate: candidate.calendarCallDate || incoming.calendarCallDate || incoming.callDate, shiftDayKey: candidate.shiftDayKey,
    ...(candidate.frozenHigherRateBonus ? { frozenHigherRateBonus: { ...candidate.frozenHigherRateBonus } } : {}),
    ...(candidate.propioBridge ? { propioBridge: { ...candidate.propioBridge, timingEstimated: false, payEstimated: false } } : {}),
    source: 'import', importedAt: review.receivedAt, officialCorrection: { kind: 'reconciled', at: new Date().toISOString() },
  }, candidate, review.receivedAt);
  context.setCalls(calls.map(item => item.id === callId ? call : item));
  state.callRecordReviews = state.callRecordReviews.filter(item => item.id !== reviewId);
  let saved = false;
  try {
    context.reconcileLastCallEndedAt(call.callDate);
    context.financeRunAutoFillCascade();
    saved = context.saveAll() !== false;
  } catch { /* El respaldo permanece si falla el guardado. */ }
  if (!saved) {
    context.setCalls(calls); context.setState(previousState); settings.financeCategories = categories;
    context.render(); return false;
  }
  context.onGameCallsChanged(call.callDate); context.render();
  context.toast(translateText('Respaldo vinculado. Las dos versiones se conservaron.'));
  return true;
}

export function openCallRecords(context, callId, acwStart = null) {
  const { calls, state, settings } = context.data(), owner = settings;
  const { ui, translateText, escapeHtml: esc, money, financeConvertedInline, formatDuration } = context;
  const root = document.getElementById('callRecordsContent');
  const call = calls.find(item => item.id === callId);
  const comparison = compareCallRecords(call), { tool, propio } = comparison;
  const clock = value => Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleTimeString(context.displayLocale(), { hour:'2-digit', minute:'2-digit', second:'2-digit' }) : '—';
  const equationClock = value => new Date(value).toLocaleTimeString(context.displayLocale(), { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false });
  const compactDuration = value => formatDuration(value).replace(/^00:/, '');
  const amount = value => `${money(value)}${financeConvertedInline(value)}`;
  const row = (label, value) => `<div><dt>${esc(label)}</dt><dd>${value}</dd></div>`;
  const start = acwStart || propio?.endISO || tool?.endISO;
  const elapsed = acwStart ? Math.max(0, Date.now() - Date.parse(start)) : null;
  const title = propio ? tool && acwStart ? translateText('El ACW sigue el final de Propio') : translateText('Registro informado por Propio')
    : tool ? translateText('Tu tool conserva la llamada') : acwStart ? translateText('ACW desde el turno o una pausa') : translateText('Vínculos pendientes de revisión');
  document.getElementById('callRecordsSubtitle').textContent = call ? `#${call.customerId} · ${call.callDate}` : translateText('Tus observaciones se conservan');
  let html = `<div class="record-explain"><strong>${esc(title)}</strong><p>${esc(propio && tool ? translateText('Propio tiene prioridad. La observación original sigue guardada como respaldo.') : tool ? translateText('La llamada aún no está confirmada en el historial de Propio. No se borra por ausencia.') : translateText('Consultá el origen de los tiempos y los registros disponibles.'))}</p></div>`;
  if (Number.isFinite(elapsed)) html += `<div class="record-equation"><div><small>${esc(translateText('Ahora'))}</small><strong>${esc(equationClock(new Date().toISOString()))}</strong></div><span>−</span><div><small>${esc(propio ? translateText('Final de Propio*') : tool ? translateText('Final de tu tool') : translateText('Inicio del ACW'))}</small><strong>${esc(equationClock(start))}</strong></div><span>=</span><div><small>ACW</small><strong class="record-acw-value">${esc(compactDuration(elapsed))}</strong></div></div>`;
  if (comparison.differenceMs !== null && (Math.abs(comparison.differenceMs) >= 1000 || comparison.payDifference)) {
    html += `<div class="record-difference-line">${esc(ui`Diferencia de cierre: ${formatDuration(Math.abs(comparison.differenceMs))}`)}${comparison.payDifference ? ` · ${esc(translateText('Diferencia de pago'))}: ${amount(Math.abs(comparison.payDifference))}` : ''}</div>`;
  }
  if (call) {
    html += `<div class="record-sources"><article class="record-source is-propio"><header><strong>Propio</strong><span>${esc(propio ? translateText('PRIORIDAD') : translateText('PENDIENTE'))}</span></header>`;
    html += propio ? `<dl>${row(translateText('Inicio informado'),esc(clock(propio.startISO)))}${row(translateText('Final calculado*'),esc(clock(propio.endISO)))}${row(translateText('Duración informada'),esc(ui`${propio.durationMin} min`))}${row(translateText('Pago informado'),amount(propio.pay))}</dl><p class="record-source-note">${esc(translateText('*Inicio + duración del historial. Propio no expone aquí los segundos originales.'))}</p>`
      : `<div class="record-await"><strong>${esc(translateText('Aún no aparece'))}</strong><p>${esc(translateText('Tu respaldo se conserva mientras esperamos el historial.'))}</p></div>`;
    html += `</article><article class="record-source"><header><strong>${esc(translateText('Tu tool'))}</strong><span>${esc(translateText('RESPALDO'))}</span></header>`;
    html += tool ? `<dl>${row(translateText('Inicio observado'),esc(clock(tool.startISO)))}${row(translateText('Final observado'),esc(clock(tool.endISO)))}${row(translateText('Duración observada'),esc(formatDuration(tool.durationMs)))}${row(translateText('Pago estimado'),amount(tool.pay))}</dl><p class="record-source-note">${esc(translateText('Tiempos detectados; se conservan aunque el historial cambie.'))}</p>`
      : `<div class="record-await"><strong>${esc(translateText('Sin observación disponible'))}</strong><p>${esc(translateText('No reconstruimos segundos que no se registraron.'))}</p></div>`;
    html += '</article></div>';
    if (propio && tool && (!propio.durationMin || !propio.pay)) html += `<div class="record-review-note"><strong>${esc(translateText('Propio informa cero'))}</strong><p>${esc(translateText('El total usa el registro de Propio. Tu observación y su estimación siguen disponibles.'))}</p></div>`;
    html += `<p class="record-foot">${esc(translateText('Dos fuentes de la misma llamada; no se suman dos veces.'))}</p>`;
    const events = [];
    if (tool) {
      events.push([tool.startISO,translateText('Inicio observado')],[tool.endISO,translateText('Cierre observado · respaldo guardado')]);
    }
    if (propio?.receivedAt) events.push([propio.receivedAt,translateText('Historial de Propio recibido')]);
    for (const previous of call.records?.changes || []) if(previous.receivedAt) events.push([previous.receivedAt,translateText('Versión anterior de Propio conservada')]);
    html += `<details class="record-history"><summary>${esc(translateText('Ver cómo se actualizó esta llamada'))}</summary><ol>${events.sort((a,b)=>Date.parse(a[0])-Date.parse(b[0])).map(([at,label])=>`<li><time>${esc(clock(at))}</time><span>${esc(label)}</span></li>`).join('')}</ol>${tool ? `<div class="record-precision"><strong>${esc(translateText('Marcas observadas con milisegundos'))}</strong><code>${esc(tool.startISO)}</code><code>${esc(tool.endISO)}</code><p>${esc(ui`Duración guardada: ${tool.durationMs} ms`)}</p></div>` : ''}<p class="record-source-note">${esc(translateText('Pago estimado: de 0 a 39 segundos se conservan los minutos completos; desde 40 segundos se suma un minuto. La duración observada no se redondea.'))}</p></details>`;
  }
  const reviews = (state.callRecordReviews || []).filter(review => !call || review.candidateIds.includes(call.id));
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
      if (input && linkCallRecordReview(context, review.id, input.value, opened)) openCallRecords(context,input.value);
    });
  }
  context.openModal('callRecordsModal');
}
