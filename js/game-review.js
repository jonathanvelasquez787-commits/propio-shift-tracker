export function goalChestStatus({defeated=false,claimed=false,adjustedAt=null}={}) {
  return claimed?'claimed':defeated?'available':adjustedAt?'adjusted':'pending';
}
export function equipmentMatchesFilter(state,filter='all') {
  return filter==='all'||(filter==='owned'?(state==='available'||state==='equipped'):state===filter);
}

let latestContext=null,filterBound=false;
export function renderGameReview(context) {
  latestContext=context;
  const {ui,translateText,escapeHtml,model}=context,root=document.getElementById('gameReviewSummary');
  if(!root||!context.valid())return;
  const row=(label,value)=>`<div class="review-line"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
  const states={pending:translateText('Meta pendiente'),available:translateText('Disponible para abrir'),claimed:translateText('Recompensa guardada'),adjusted:translateText('Ajustado por corrección')};
  const chest=goalChestStatus(model.chest);
  const labels=[translateText('Productividad'),translateText('Llamadas'),translateText('Adherencia'),translateText('Puntualidad'),translateText('Misiones'),translateText('Bonos de juego')];
  const breakdown=['productivityXp','callsXp','adherenceXp','punctualityXp','missionXp','bonusXp'];
  const level=model.level||{level:1,pct:0,remaining:150};
  const icon=paths=>`<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
  const medal=icon('<circle cx="12" cy="8" r="5"/><path d="m8.5 12.5-2 8 5.5-3 5.5 3-2-8"/>');
  const chestIcon=icon('<path d="M4 10V7a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v3M3 10h18v10H3zM3 14h18M10 12h4v5h-4z"/>');
  const html=`<section class="polished-surface game-review-surface"><header class="polished-head"><span class="polished-icon">${medal}</span><div><h2>${escapeHtml(model.enabled?translateText('Logros de hoy'):translateText('Elegí cómo acompañar tu jornada'))}</h2><p>${escapeHtml(model.dayLabel)}</p></div></header>`
    +(model.enabled?`<div class="polished-bento"><div class="polished-hero"><span class="polished-eyebrow">${escapeHtml(translateText('XP del día'))}</span><div class="polished-number">${model.xp}<small>XP</small></div><span class="polished-tag">${escapeHtml(ui`${model.eligibleCalls} llamadas elegibles`)}</span></div><div class="polished-level"><div class="polished-ring" style="--progress:${level.pct}%"><div><small>${escapeHtml(translateText('Nivel'))}</small><strong>${level.level}</strong></div></div><p>${escapeHtml(ui`Faltan ${level.remaining} XP para el siguiente nivel`)}</p></div></div>`:'')
    +`<details class="polished-disclosure"><summary>${escapeHtml(model.xp?translateText('Cómo sumás XP y misiones'):translateText('¿Por qué 0 XP?'))}</summary><div class="polished-detail">`
    +row(translateText('Llamadas elegibles para XP'),`${model.eligibleCalls} / ${model.callCount}`)
    +(model.eligibleCalls?breakdown.map((key,index)=>row(labels[index],`${model.breakdown[key]} XP`)).join(''):ui`<p class="note">Sin llamadas elegibles, el XP del día es cero. Importar llamadas históricas no concede XP retroactivo.</p>`)
    +ui`<p class="note">Los componentes se muestran antes de límites y sellos. El total del día respeta el tope de ${model.cap} XP y el cierre guardado. Corregir o borrar llamadas puede ajustar el progreso; no vuelve a cobrar una recompensa ya reclamada.</p></div></details>`
    +`<div class="polished-chest"><span class="polished-chest-art">${chestIcon}</span><div><span class="polished-tag ${chest==='available'||chest==='claimed'?'is-good':''}">${escapeHtml(states[chest])}</span><h3>${escapeHtml(translateText('Cofre de la meta diaria'))}</h3><details class="polished-disclosure"><summary>${escapeHtml(translateText('Ver estado del cofre'))}</summary><div class="polished-detail">`
    +(chest==='adjusted'?ui`<p class="note">Una corrección dejó la meta por debajo de lo necesario y se ajustó la recompensa asociada. No se borraron tus llamadas. Podés volver a alcanzar la meta.</p>`:chest==='claimed'?ui`<p class="note">La recompensa ya está guardada en tu perfil. Abrir el panel otra vez no la duplica.</p>`:chest==='available'?ui`<p class="note">Cumpliste la meta. Abrí el cofre desde Inicio cuando estés fuera de una llamada.</p>`:ui`<p class="note">El cofre se habilita al alcanzar la meta diaria de ganancias. Una corrección puede cambiar ese estado.</p>`)
    +`</div></details></div>${model.enabled&&chest==='available'?`<button type="button" class="mc-btn-primary cyan" data-game-action="open-daily-chest" ${model.workMode==='call'?'disabled':''}>${escapeHtml(translateText('Abrir cofre'))}</button>`:''}</div><div class="polished-shortcuts"><button type="button" data-game-review-target="gameEquipmentPanel">${medal}<span><strong>${escapeHtml(translateText('Equipo'))}</strong><small>${escapeHtml(`${model.collection?.owned||0} / ${model.collection?.total||0}`)}</small></span><b aria-hidden="true">›</b></button><button type="button" data-game-review-target="positiveRewardsAccordion">${chestIcon}<span><strong>${escapeHtml(translateText('Mis premios'))}</strong><small>${escapeHtml(ui`${model.pendingRewards||0} por realizar`)}</small></span><b aria-hidden="true">›</b></button></div><details class="polished-disclosure"><summary>${escapeHtml(translateText('Armas, práctica y duelo'))}</summary><div class="polished-detail">`
    +row(translateText('Modo de trabajo'),({call:translateText('En llamada'),ready:translateText('En turno'),break:translateText('En pausa'),off:translateText('Fuera del turno')})[model.workMode])
    +ui`<p class="note">Las armas cambian la animación y la práctica. Disparar o jugar el duelo no registra llamadas, dinero ni XP laboral. El duelo se ofrece en Break/Lunch o fuera del turno; al volver al trabajo se pausa y podés retomarlo después.</p></div></details><p class="polished-foot">El progreso de juego no cambia tu pago.</p></section>`;
  if(root.innerHTML!==html){const opened=[...root.querySelectorAll('details')].map(item=>item.open),focused=root.contains(document.activeElement)?document.activeElement?.dataset.gameReviewTarget:null;root.innerHTML=html;root.querySelectorAll('details').forEach((item,index)=>{item.open=!!opened[index];});if(focused)root.querySelector(`[data-game-review-target="${focused}"]`)?.focus({preventScroll:true});}
  applyEquipmentFilter();
  if(!filterBound){filterBound=true;document.addEventListener('change',event=>{if(event.target.id==='gameEquipmentFilter')applyEquipmentFilter();});document.addEventListener('click',event=>{const button=event.target.closest?.('[data-game-review-target]');if(!button||!latestContext?.valid())return;const target=document.getElementById(button.dataset.gameReviewTarget);if(!target)return;for(let parent=target;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;target.scrollIntoView({block:'start',behavior:'auto'});const focus=target.querySelector('summary,button,input,select');focus?.focus({preventScroll:true});});}
}

function applyEquipmentFilter() {
  if(!latestContext?.valid())return;
  const filter=document.getElementById('gameEquipmentFilter'),status=document.getElementById('gameEquipmentFilterStatus');
  if(!filter)return;
  let shown=0,total=0;
  document.querySelectorAll('#gameEquipmentPanel [data-equipment-state]').forEach(item=>{item.hidden=!equipmentMatchesFilter(item.dataset.equipmentState,filter.value);total++;if(!item.hidden)shown++;});
  const {ui}=latestContext;
  if(status)status.textContent=ui`${shown} de ${total} piezas`;
}
