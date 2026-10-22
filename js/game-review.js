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
  const labels=[translateText('Productividad'),translateText('Llamadas'),translateText('Adherencia'),translateText('Puntualidad'),translateText('Misiones'),translateText('Bonos de juego')];
  const breakdown=['productivityXp','callsXp','adherenceXp','punctualityXp','missionXp','bonusXp'];
  const chestState=goalChestStatus(model.chest);
  const chestLabel={pending:translateText('Meta pendiente'),available:translateText('Disponible para abrir'),claimed:translateText('Cofre abierto · recompensa guardada'),adjusted:translateText('Ajustado por corrección')}[chestState];
  const chestHelp={pending:translateText('El cofre se habilita al alcanzar la meta diaria de ganancias. Una corrección puede cambiar ese estado.'),available:translateText('Cumpliste la meta. Abrí el cofre desde Inicio cuando estés fuera de una llamada.'),claimed:translateText('La recompensa ya está guardada en tu perfil. Abrir el panel otra vez no la duplica.'),adjusted:translateText('Una corrección dejó la meta por debajo de lo necesario y se ajustó la recompensa asociada. No se borraron tus llamadas. Podés volver a alcanzar la meta.')}[chestState];
  const html=`<div class="game-level-foot"><span>${escapeHtml(translateText('XP del día'))}</span><strong>${model.xp} XP</strong></div><details class="polished-disclosure" data-review-detail="xp"><summary>${escapeHtml(model.xp?translateText('Cómo sumás XP y misiones'):translateText('¿Por qué 0 XP?'))}</summary><div class="polished-detail">`
    +row(translateText('Llamadas elegibles para XP'),`${model.eligibleCalls} / ${model.callCount}`)
    +(model.eligibleCalls?breakdown.map((key,index)=>row(labels[index],`${model.breakdown[key]} XP`)).join(''):ui`<p class="note">Sin llamadas elegibles, hoy sumás 0 XP. Las importaciones históricas no suman XP.</p>`)
    +ui`<p class="note">Tope diario: ${model.cap} XP.</p><details class="review-details" data-review-detail="rules"><summary>Límites y correcciones</summary><div class="review-detail-body"><p class="note">Los componentes se muestran antes de límites y sellos. Se respeta el cierre guardado. Corregir o borrar llamadas puede ajustar el progreso; una recompensa reclamada no se cobra otra vez.</p><p class="note">Productividad aporta hasta 50 XP, llamadas hasta 30, adherencia hasta 30, puntualidad 20 y misiones hasta 20; el total respeta el tope diario. El nivel depende del XP acumulado. La racha usa productividad y adherencia; los récords se recalculan con las llamadas guardadas.</p></div></details></div></details>`
    +`<details class="polished-disclosure" data-review-detail="chest"><summary>${escapeHtml(translateText('Cofre de la meta diaria'))}<small>${escapeHtml(chestLabel)}</small></summary><div class="polished-detail"><p class="note">${escapeHtml(chestHelp)}</p></div></details>`;
  if(root.innerHTML!==html){const opened=new Set([...root.querySelectorAll('details[open]')].map(node=>node.dataset.reviewDetail));root.innerHTML=html;root.querySelectorAll('details').forEach(node=>{node.open=opened.has(node.dataset.reviewDetail);});}
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
