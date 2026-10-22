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
  const row = (label, value) => `<div class="review-line"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
  const source = goal.isOverride ? translateText('Excepción de esta fecha') : goal.isHistorical ? translateText('Meta histórica conservada')
    : context.financeGoal ? translateText('Calculada desde Finanzas') : translateText('Meta general');
  const score=adherence&&Number.isFinite(adherence.scorePct)?adherence.scorePct:null;
  let html = ui`<p class="review-scope">${escapeHtml(day)} · ${context.today ? translateText('Hoy') : translateText('Consulta histórica: los controles del turno requieren volver a Hoy.')}</p>`;
  html+=ui`<div class="review-overview"><div class="review-metric"><span>ACW actual</span><strong class="review-accent" id="workDayCurrentAcw">${escapeHtml(context.currentAcw||'—')}</strong><small>Acumulado del día: ${escapeHtml(context.duration(stats.gapTotal*60000))}</small></div><div class="review-metric"><span>Adherencia</span><strong>${score===null?'—':escapeHtml(String(score))+'%'}</strong>${score===null?'':`<div class="review-progress" aria-hidden="true"><i style="width:${Math.max(0,Math.min(100,score))}%"></i></div>`}${minutes?ui`<small>Dentro del plan o de la gracia: ${escapeHtml(context.formatMinutes(minutes.adherentMinutes))} / ${escapeHtml(context.formatMinutes(minutes.total))} min</small>`:ui`<small>Sin minutos evaluados</small>`}</div></div>`;
  html+=ui`<details class="review-details"><summary>Metas y cálculo del ACW</summary><div class="review-detail-body">`+`<h4 class="review-heading">${escapeHtml(translateText('Meta diaria'))}<span class="review-source">${escapeHtml(source)}</span></h4>`
    +row(translateText('Tiempo productivo'),context.formatMinutes(goal.min)+' min')
    +`<div class="review-line"><span>${escapeHtml(translateText('Equivalente de la meta'))}</span><strong>${context.money(goal.usd)}${context.converted(goal.usd)}</strong></div>`
    +ui`<div class="review-line"><span>Meta del ciclo actual</span><strong>${context.money(context.cycleGoal)}${context.converted(context.cycleGoal)}</strong></div><p class="note">${escapeHtml(context.cycleCustom?translateText('Personalizada para este ciclo'):translateText('Suma de las metas diarias de los días laborables del ciclo'))}</p><p class="note">El actual mide este tramo sin llamada ni pausa; el acumulado reúne los huecos clasificados como ACW del día seleccionado. No son el mismo contador.</p></div></details>`;
  html+=`<details class="review-details"><summary>${escapeHtml(translateText('Ver causas y puntos de control'))}${minutes?' · '+escapeHtml(context.formatMinutes(minutes.exceptionMinutes))+' '+escapeHtml(translateText('min fuera del plan')):''}</summary><div class="review-detail-body">`
    +(adherence?(minutes?row(translateText('Minutos evaluados'),context.formatMinutes(minutes.total))
      +row(translateText('Dentro del plan o de la gracia'),context.formatMinutes(minutes.adherentMinutes))
      +row(translateText('Fuera del plan'),context.formatMinutes(minutes.exceptionMinutes)):ui`<p class="note">Todavía no hay minutos medibles; se usan los puntos de control disponibles.</p>`)
      +Object.entries(adherence.reasons||{}).filter(([,min])=>min>0).map(([key,min])=>row(context.reasonLabels[key]||key,context.formatMinutes(min)+' min')).join('')
      +(adherence.checkpoints||[]).map(item=>row(context.translateLabel(item.label),item.note)).join(''):ui`<p class="note">Sin adherencia calculable para esta fecha.</p>`)
    +'</div></details>';
  html+=`<details class="review-details"><summary>${escapeHtml(translateText('Pausas: plan y registro'))}</summary><div class="review-detail-body">`
    +(context.pauseRows.map(pause=>`<div class="review-pause"><strong>${escapeHtml(pause.label)}</strong><span>${escapeHtml(pause.time||pause.value)}</span>${pause.duration?`<small>${escapeHtml(pause.duration)}</small>`:''}</div>`).join('')||ui`<p class="note">No hay pausas planeadas ni registradas para esta fecha.</p>`)+ '</div></details>';
  document.getElementById('workDayReviewContent').innerHTML = html;

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
  document.getElementById('confirmModalDetails').className='review-confirm';
  document.getElementById('confirmModalOkBtn').textContent=plan.draft?translateText('Aplicar al borrador'):translateText('Aplicar horario');
  const sameBefore=days.every(day=>description(day.before)===description(days[0].before));
  document.getElementById('confirmModalDetails').innerHTML = `<p class="review-scope">${escapeHtml(plan.scope || translateText('Plantilla que se repite cada semana'))}</p>`
    +`<div class="polished-comparison"><div><span>${escapeHtml(translateText('Antes'))}</span><strong class="polished-time">${escapeHtml(sameBefore&&days.length?description(days[0].before):translateText('Varios horarios'))}</strong></div><span aria-hidden="true">→</span><div><span>${escapeHtml(translateText('Después'))}</span><strong class="polished-time">${escapeHtml(description(plan.config))}</strong></div></div>`
    +`<div class="polished-days">${days.map(day=>`<span>${escapeHtml(day.label)}</span>`).join('')}</div>`
    + `<details class="polished-disclosure"><summary>${escapeHtml(translateText('Ver antes y después por día'))}</summary><div class="polished-detail">${days.map(day=>`<div class="review-line"><span>${escapeHtml(day.label)}</span><strong>${escapeHtml(description(day.before))}<br>→ ${escapeHtml(description(plan.config))}</strong></div>`).join('')}</div></details>`
    + `<details class="polished-disclosure"><summary>${escapeHtml(translateText('Ver bloques en orden'))}</summary><div class="polished-detail">${schedulePreviewRows(plan.config).map(block=>`<div class="review-line"><span>${escapeHtml(context.blockLabel(block.type))}</span><strong>${escapeHtml(time(block.startMin))} → ${escapeHtml(time(block.endMin))}</strong></div>`).join('')}</div></details>`
    + (plan.shiftLate ? `<details class="polished-disclosure"><summary>${escapeHtml(translateText('Ejemplo: llegada 30 minutos tarde'))}</summary><div class="polished-detail">`+ui`<p class="note">Si llegás 30 minutos tarde, el plan y su final se desplazan 30 minutos.</p>`+schedulePreviewRows(plan.config).map(block=>`<div class="review-line"><span>${escapeHtml(context.blockLabel(block.type))}</span><strong>${escapeHtml(time(block.startMin+30))} → ${escapeHtml(time(block.endMin+30))}</strong></div>`).join('')+'</div></details>' : ui`<div class="polished-impact"><strong>Llegada tarde</strong><span>El final planeado se conserva.</span></div>`)
    + (plan.draft ? ui`<div class="review-callout">Solo cambia el borrador. Después usá Guardar día.</div>` : ui`<div class="review-callout">Solo cambia el plan; no modifica llamadas ni pausas registradas.</div>`);
}

export function openWorkDayReview(context) {
  const { ui, translateText, escapeHtml, isViewingToday, computeCurrentAcwStart, effectiveDailyGoal, reinforcementScheduleIntervals, fmtTime, sameCallDay, todayCallDateKey, callDateKeyFromValue, formatDuration, pauseDurationExcludingCalls, formatCallDayLabel, importedCallStats, callsForDay, effectiveCycleGoal, getCycleGoalOverride, minuteAdherenceForDay, dayWorkSessions, dayAdherence, EXCEPTION_REASON_LABELS, formatMinutes, money, financeConvertedInline, openModal, dayKey, state, settings } = context;
  const current = isViewingToday() ? computeCurrentAcwStart() : null, goal = effectiveDailyGoal(dayKey);
  const shortTime=value=>fmtTime(new Date(value)).replace(/(\d{1,2}:\d{2}):\d{2}/,'$1');
  const pauseRows = reinforcementScheduleIntervals(dayKey).filter(p => p.type !== 'Work').map(p => ({ label: ui`Planeado: ${p.type === 'Break' ? 'Break' : 'Lunch'}`,
    time: `${shortTime(p.startedAt)} → ${shortTime(p.endedAt)}${sameCallDay(p.startedAt, todayCallDateKey(new Date(p.endedAt))) ? '' : translateText(' (día siguiente)')}` }));
  const real = [...state.pauseHistory, ...(state.activePause ? [{ ...state.activePause, active: true }] : [])];
  real.filter(p => (callDateKeyFromValue(p.shiftDayKey) || todayCallDateKey(new Date(p.startedAt))) === dayKey).forEach(p => {
    pauseRows.push({ label: p.active ? ui`En curso: ${p.type === 'break' ? 'Break' : 'Lunch'}` : ui`Registrado: ${p.type === 'break' ? 'Break' : 'Lunch'}`,
      time:shortTime(p.startedAt),duration:formatDuration(pauseDurationExcludingCalls(p.startedAt, p.endedAt || new Date().toISOString(), dayKey) * 60000) });
  });
  const provenance = settings.goalProvenance;
  renderWorkReview({ ui, translateText, escapeHtml, day: formatCallDayLabel(dayKey), today: isViewingToday(),
    currentAcw: current ? formatDuration(Date.now() - current.getTime()) : null, stats: importedCallStats(callsForDay(dayKey), dayKey), goal,
    financeGoal: provenance?.source === 'finance' && provenance.min === goal.min && provenance.usd === goal.usd,
    cycleGoal: effectiveCycleGoal(0), cycleCustom: getCycleGoalOverride(0) !== null,
    minutes: minuteAdherenceForDay(dayKey, dayWorkSessions(dayKey)), adherence: dayAdherence(dayKey), reasonLabels: EXCEPTION_REASON_LABELS,
    pauseRows, translateLabel: translateText, duration: formatDuration, formatMinutes, money, converted: financeConvertedInline, openModal });
}
