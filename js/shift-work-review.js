export function confirmShiftTransition(context, kind, confirm, startNew) {
  const { ui, translateText, escapeHtml } = context, owner = context.data(), expected = context.signature();
  if (owner.state.pendingLiveCallBackup) {
    context.toast(translateText('Resuelve la llamada pendiente antes de finalizar el turno')); return false;
  }
  let settled = false;
  context.appConfirm(kind === 'resume' ? translateText('¿Continuar el turno anterior o iniciar otra sesión?')
    : translateText('Revisá cómo se cerrará tu turno.'), () => {
    if (settled) return false;
    settled = true;
    const current = context.data();
    if (current.state !== owner.state || current.settings !== owner.settings || context.signature() !== expected || !context.isViewingToday() || !context.canPersistLocalChanges()) {
      context.toast(translateText('La actividad cambió. Revisá de nuevo antes de confirmar.')); return false;
    }
    return kind === 'resume' && document.getElementById('shiftResumeChoice')?.value === 'new' ? startNew() : confirm();
  });
  document.getElementById('confirmModalTitle').textContent = kind === 'resume' ? translateText('Volver al trabajo') : translateText('Finalizar turno');
  const effects = kind === 'resume' ? [
    translateText('Continuar conserva el inicio anterior y marca el hueco como interrupción accidental.'),
    translateText('Otra sesión conserva el tramo cerrado y registra una nueva entrada ahora.'),
  ] : [
    owner.state.activeCall ? translateText('Se guarda la llamada en curso hasta este momento. Si falla, el turno sigue abierto.') : translateText('Las llamadas guardadas se conservan.'),
    owner.state.activePause ? translateText('Se termina la pausa activa y se conserva en el historial.') : '',
    translateText('Se detienen los iniciadores del turno. La sesión de Propio sigue abierta.'),
  ].filter(Boolean);
  document.getElementById('confirmModalDetails').innerHTML = ui`<ul class="confirmation-effects">${effects.map(text => `<li>${escapeHtml(text)}</li>`).join('')}</ul>`
    + (kind === 'resume' ? ui`<div class="goals-field"><label for="shiftResumeChoice">Cómo querés volver</label><select id="shiftResumeChoice"><option value="continue">Continuar el mismo turno</option><option value="new">Iniciar otra sesión</option></select></div>` : '');
  return true;
}

export function renderWorkReview(context) {
  const { ui, translateText, escapeHtml, day, stats, goal, minutes, adherence } = context;
  const row = (label, value) => `<div class="fin-preview-row"><span class="fin-preview-main">${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
  const card = (title, body) => `<section class="recovery-card"><strong>${escapeHtml(title)}</strong>${body}</section>`;
  const source = goal.isOverride ? translateText('Excepción de esta fecha') : goal.isHistorical ? translateText('Meta histórica conservada')
    : context.financeGoal ? translateText('Calculada desde Finanzas') : translateText('Meta general');
  let html = ui`<p class="note">${escapeHtml(day)} · ${context.today ? translateText('Hoy') : translateText('Consulta histórica: los controles del turno requieren volver a Hoy.')}</p>`;
  html += card(translateText('ACW'), row(translateText('Espera actual'), context.currentAcw || '—')
    + row(translateText('Acumulado del día'), context.duration(stats.gapTotal * 60000))
    + ui`<details><summary>Cómo se cuenta</summary><p class="note">El actual mide este tramo sin llamada ni pausa; el acumulado reúne los huecos clasificados como ACW del día seleccionado. No son el mismo contador.</p></details>`);
  html += card(translateText('Meta diaria'), row(source, context.formatMinutes(goal.min) + ' min')
    + `<div class="fin-preview-row"><span>${escapeHtml(translateText('Equivalente de la meta'))}</span><strong>${context.money(goal.usd)}${context.converted(goal.usd)}</strong></div>`
    + `<details><summary>${escapeHtml(translateText('Meta del ciclo actual'))}</summary><p class="note">${escapeHtml(context.cycleCustom ? translateText('Personalizada para este ciclo') : translateText('Suma de las metas diarias de los días laborables del ciclo'))}: ${context.money(context.cycleGoal)}${context.converted(context.cycleGoal)}</p></details>`);
  html += card(translateText('Adherencia'), adherence ? row(translateText('Resultado'), `${adherence.scorePct}%`)
    + (minutes ? row(translateText('Minutos evaluados'), context.formatMinutes(minutes.total))
      + row(translateText('Dentro del plan o de la gracia'), context.formatMinutes(minutes.adherentMinutes))
      + row(translateText('Fuera del plan'), context.formatMinutes(minutes.exceptionMinutes)) : ui`<p class="note">Todavía no hay minutos medibles; se usan los puntos de control disponibles.</p>`)
    + `<details><summary>${escapeHtml(translateText('Ver causas y puntos de control'))}</summary>${Object.entries(adherence.reasons || {}).filter(([,min])=>min>0).map(([key,min])=>row(context.reasonLabels[key] || key,context.formatMinutes(min)+' min')).join('')}${adherence.checkpoints.map(item=>row(context.translateLabel(item.label),item.note)).join('')}</details>`
    : ui`<p class="note">Sin adherencia calculable para esta fecha.</p>`);
  html += card(translateText('Pausas: plan y registro'), context.pauseRows.map(pause=>row(pause.label,pause.value)).join('')
    || ui`<p class="note">No hay pausas planeadas ni registradas para esta fecha.</p>`);
  document.getElementById('workDayReviewContent').innerHTML = html;
  context.openModal('workDayReviewModal');
}

export function schedulePreviewRows(config) {
  if (config.off) return [];
  const clock = value => { const [h,m] = String(value).split(':').map(Number); return h*60+m; };
  const anchor = clock(config.start);
  return (config.blocks || []).map(block => {
    const start = clock(block.start), startMin = start < anchor ? start + 1440 : start;
    return { ...block, startMin, endMin: startMin + Number(block.dur) };
  }).sort((a,b)=>a.startMin-b.startMin);
}

export function confirmSchedulePlan(context, plan, change) {
  const { ui, translateText, escapeHtml } = context, expected = context.signature();
  const days = plan.days || plan.keys.map(key => ({ label: plan.labels[key], before: plan.target[key] || plan.defaultDay }));
  let settled = false;
  context.appConfirm(translateText('Revisá los días y las horas antes de aplicar.'), () => {
    if (settled) return false;
    settled = true;
    if (context.signature() !== expected || !context.valid()) { context.toast(translateText('El horario cambió. Abrí de nuevo la vista previa.')); return false; }
    return change();
  });
  const time = minute => context.timeLabel(`${String(Math.floor(minute/60)%24).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`)
    + (minute>=1440 ? translateText(' (día siguiente)') : '');
  const description = cfg => cfg.off ? translateText('Día libre') : `${time(Number(cfg.start.slice(0,2))*60+Number(cfg.start.slice(3)))} → ${time(Number(cfg.end.slice(0,2))*60+Number(cfg.end.slice(3))+(cfg.end<=cfg.start?1440:0))}`;
  document.getElementById('confirmModalTitle').textContent = translateText('Revisar horario');
  document.getElementById('confirmModalDetails').innerHTML = ui`<p class="note">${escapeHtml(plan.scope || translateText('Plantilla que se repite cada semana'))}</p>`
    + `<div class="recovery-card"><strong>${escapeHtml(days.map(day=>day.label).join(' · '))}</strong><p class="note">${escapeHtml(translateText('Horario a aplicar'))}: ${escapeHtml(description(plan.config))}</p>`
    + `<details><summary>${escapeHtml(translateText('Ver antes y después por día'))}</summary>${days.map(day=>`<div class="import-outcome-row"><strong>${escapeHtml(day.label)}</strong><p class="note">${escapeHtml(translateText('Antes'))}: ${escapeHtml(description(day.before))}<br>${escapeHtml(translateText('Después'))}: ${escapeHtml(description(plan.config))}</p></div>`).join('')}</details></div>`
    + `<details><summary>${escapeHtml(translateText('Ver bloques en orden'))}</summary>${schedulePreviewRows(plan.config).map(block=>`<p class="note">${escapeHtml(context.blockLabel(block.type))}: ${escapeHtml(time(block.startMin))} → ${escapeHtml(time(block.endMin))}</p>`).join('')}</details>`
    + ui`<p class="note">${plan.shiftLate ? translateText('Si llegás 30 minutos tarde, el plan y su final se desplazan 30 minutos.') : translateText('Si llegás tarde, el final planeado se conserva.')}</p>`
    + (plan.shiftLate ? `<details><summary>${escapeHtml(translateText('Ejemplo: llegada 30 minutos tarde'))}</summary>${schedulePreviewRows(plan.config).map(block=>`<p class="note">${escapeHtml(context.blockLabel(block.type))}: ${escapeHtml(time(block.startMin+30))} → ${escapeHtml(time(block.endMin+30))}</p>`).join('')}</details>` : '')
    + (plan.draft ? ui`<p class="note">Solo cambia el borrador. Después usá Guardar día.</p>` : ui`<p class="note">Solo cambia el plan; no modifica llamadas ni pausas registradas.</p>`);
}

export function openWorkDayReview(context) {
  const { ui, translateText, escapeHtml, isViewingToday, computeCurrentAcwStart, effectiveDailyGoal, reinforcementScheduleIntervals, fmtTime, sameCallDay, todayCallDateKey, callDateKeyFromValue, formatDuration, pauseDurationExcludingCalls, formatCallDayLabel, importedCallStats, callsForDay, effectiveCycleGoal, getCycleGoalOverride, minuteAdherenceForDay, dayWorkSessions, dayAdherence, EXCEPTION_REASON_LABELS, formatMinutes, money, financeConvertedInline, openModal, dayKey, state, settings } = context;
  const current = isViewingToday() ? computeCurrentAcwStart() : null, goal = effectiveDailyGoal(dayKey);
  const pauseRows = reinforcementScheduleIntervals(dayKey).filter(p => p.type !== 'Work').map(p => ({ label: ui`Planeado: ${p.type === 'Break' ? 'Break' : 'Lunch'}`,
    value: `${fmtTime(new Date(p.startedAt))} → ${fmtTime(new Date(p.endedAt))}${sameCallDay(p.startedAt, todayCallDateKey(new Date(p.endedAt))) ? '' : translateText(' (día siguiente)')}` }));
  const real = [...state.pauseHistory, ...(state.activePause ? [{ ...state.activePause, active: true }] : [])];
  real.filter(p => (callDateKeyFromValue(p.shiftDayKey) || todayCallDateKey(new Date(p.startedAt))) === dayKey).forEach(p => {
    pauseRows.push({ label: p.active ? ui`En curso: ${p.type === 'break' ? 'Break' : 'Lunch'}` : ui`Registrado: ${p.type === 'break' ? 'Break' : 'Lunch'}`,
      value: `${fmtTime(new Date(p.startedAt))} · ${formatDuration(pauseDurationExcludingCalls(p.startedAt, p.endedAt || new Date().toISOString(), dayKey) * 60000)}` });
  });
  const provenance = settings.goalProvenance;
  renderWorkReview({ ui, translateText, escapeHtml, day: formatCallDayLabel(dayKey), today: isViewingToday(),
    currentAcw: current ? formatDuration(Date.now() - current.getTime()) : null, stats: importedCallStats(callsForDay(dayKey), dayKey), goal,
    financeGoal: provenance?.source === 'finance' && provenance.min === goal.min && provenance.usd === goal.usd,
    cycleGoal: effectiveCycleGoal(0), cycleCustom: getCycleGoalOverride(0) !== null,
    minutes: minuteAdherenceForDay(dayKey, dayWorkSessions(dayKey)), adherence: dayAdherence(dayKey), reasonLabels: EXCEPTION_REASON_LABELS,
    pauseRows, translateLabel: translateText, duration: formatDuration, formatMinutes, money, converted: financeConvertedInline, openModal });
}
