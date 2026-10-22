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
  const html=`<div class="game-level-foot"><span>${escapeHtml(translateText('XP del día'))}</span><strong>${model.xp} XP</strong></div><details class="polished-disclosure"><summary>${escapeHtml(model.xp?translateText('Cómo sumás XP y misiones'):translateText('¿Por qué 0 XP?'))}</summary><div class="polished-detail">`
    +row(translateText('Llamadas elegibles para XP'),`${model.eligibleCalls} / ${model.callCount}`)
    +(model.eligibleCalls?breakdown.map((key,index)=>row(labels[index],`${model.breakdown[key]} XP`)).join(''):ui`<p class="note">Sin llamadas elegibles, el XP del día es cero. Importar llamadas históricas no concede XP retroactivo.</p>`)
    +ui`<p class="note">Los componentes se muestran antes de límites y sellos. El total del día respeta el tope de ${model.cap} XP y el cierre guardado. Corregir o borrar llamadas puede ajustar el progreso; no vuelve a cobrar una recompensa ya reclamada.</p></div></details>`;
  if(root.innerHTML!==html){const opened=root.querySelector('details')?.open;root.innerHTML=html;if(opened)root.querySelector('details').open=true;}
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
