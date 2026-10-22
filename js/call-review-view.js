export function renderImportOutcome(context, duplicates, overlaps, futureRows = [], replacedLive = [], correctedOfficial = [], added = [], invalid = []) {
  const { ui, translateText, escapeHtml } = context;
  const el = document.getElementById('importSkippedSummary');
  if (!el) return;
  const reasons = {
    format: translateText('Formato no reconocido: se esperan los siete campos de Propio.'),
    'date-time': translateText('Fecha u hora inválida.'), duration: translateText('Duración inválida o fuera del límite.'),
    pay: translateText('Pago inválido o fuera del límite.'), flags: translateText('Billable y Dropped deben decir Yes o No.'),
    'duplicate-input': translateText('Repetida dentro del texto pegado; se leyó una sola vez.'),
  };
  const rows = [
    ...added.map(call => ({ call, status: translateText('Agregada'), reason: translateText('Nuevo registro importado del historial.') })),
    ...replacedLive.map(item => ({ call: item.call, status: translateText('Actualizada'), reason: translateText('Reemplazó el registro estimado por los datos del historial de Propio.') })),
    ...correctedOfficial.map(item => ({ call: item.call, status: translateText('Corregida'), reason: translateText('El historial cambió: se actualizó la llamada que ya tenías.') })),
    ...duplicates.map(call => ({ call, status: translateText('Sin cambios'), reason: translateText('Duplicado exacto de una llamada ya guardada.') })),
    ...overlaps.map(call => ({ call, pending: (context.reviews || []).some(review => review.id === `${call.customerId}|${call.startISO}`), status: translateText('Omitida'), reason: ui`Traslapa con #${call.withCustomerId} (${call.withCallStart}).` })),
    ...futureRows.map(call => ({ call, status: translateText('Omitida'), reason: translateText('Termina en el futuro; revisá fecha, hora y duración.') })),
    ...invalid.map(call => ({ call, status: translateText('No importada'), reason: reasons[call.reason] || reasons.format })),
  ];
  const changed = added.length + replacedLive.length + correctedOfficial.length;
  for (const row of rows) if (row.pending) { row.status = translateText('Pendiente de vincular'); row.reason = translateText('Revisá las posibles coincidencias en el listado de llamadas.'); }
  el.innerHTML = ui`<div class="recovery-card"><strong>Resultado de la última importación</strong><p class="note">${changed} guardada(s) · ${rows.length - changed} sin importar o sin cambios</p><details><summary>Revisar cada fila y su motivo</summary><div class="import-outcome-list">${rows.map(({ call, status, reason }) => ui`<div class="import-outcome-row"><strong>#${escapeHtml(call.customerId || '—')} · ${escapeHtml(status)}</strong><span>${escapeHtml([call.callDate, call.callStart].filter(Boolean).join(' · '))}${call.line ? ui` · Línea ${call.line}` : ''}</span><p>${escapeHtml(reason)}</p></div>`).join('')}</div></details></div>`;
  if (rows.some(row => row.pending)) el.insertAdjacentHTML('beforeend', `<button class="gap-edit-btn" type="button" data-open-call-pending>${escapeHtml(translateText('Revisar vínculos pendientes'))}</button>`);
  el.style.display = '';
}
