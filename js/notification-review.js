export function customSoundFootprint(dataUrl) {
  const value=String(dataUrl||'');
  const match=value.match(/^data:audio\/[^,]*;base64,([a-z\d+/]*={0,2})$/i);
  if(!match)return null;
  const encoded=match[1],padding=(encoded.match(/=*$/)||[''])[0].length;
  return {bytes:Math.max(0,Math.floor(encoded.length*3/4)-padding),characters:value.length};
}

export function productiveNoticeProgress(productiveMin,earnMin) {
  const productive=Math.max(0,Number(productiveMin)||0),earn=Number(earnMin);
  if(!Number.isFinite(earn)||earn<=0)return null;
  const completed=Math.floor(productive/earn),current=productive-completed*earn;
  return {completed,current,remaining:earn-current,percent:Math.min(100,current/earn*100)};
}

let activeContext=null,timer=null,bound=false;
export function renderNotificationReview(context) {
  activeContext=context;
  const {ui,translateText,escapeHtml,settings}=context;
  const root=document.getElementById('notificationReview');
  if(!root||!context.valid())return;
  const row=(label,value)=>`<div class="review-line"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
  const progress=context.productive(),model=productiveNoticeProgress(progress?.productiveMin,settings.productiveBreakEarnMin);
  const volume=Math.max(0,Math.min(100,Number(settings.masterVolume)||0));
  const files=[['productiveBreakCustomSoundDataUrl','productiveBreakCustomSoundName'],...context.soundConfigs.map(cfg=>[cfg.urlKey,cfg.nameKey])]
    .map(([urlKey,nameKey])=>({name:settings[nameKey]||translateText('Sonido personalizado'),size:customSoundFootprint(settings[urlKey])})).filter(item=>item.size);
  const label=!model?translateText('Desactivado'):!progress?translateText('En espera'):String(Math.ceil(model.remaining));
  const html=`<div class="polished-productive"><div class="polished-ring" style="--progress:${model&&progress?model.percent:0}%"><div><strong class="${model&&progress?'':'is-text'}">${escapeHtml(label)}</strong>${model&&progress?`<small>${escapeHtml(translateText('minutos'))}</small>`:''}</div></div><div><span class="polished-eyebrow">${escapeHtml(translateText('Próximo aviso'))}</span><h4>${escapeHtml(translateText('Descanso por productividad'))}</h4><p>${escapeHtml(model&&progress?ui`${Math.floor(model.current)} de ${settings.productiveBreakEarnMin} min registrados`:translateText('Se cuenta durante el trabajo activo.'))}</p><span class="polished-tag">${escapeHtml(volume?ui`Sonido al ${volume}%`:translateText('Silenciado'))}</span></div></div>`
    +(!volume?ui`<p class="polished-foot">Volumen 0%: no suena ningún aviso. Los mensajes escritos siguen activos.</p>`:'');
  if(root.innerHTML!==html){const opened=[...root.querySelectorAll('details')].map(item=>item.open);root.innerHTML=html;root.querySelectorAll('details').forEach((item,index)=>{item.open=!!opened[index];});}
  const fileRoot=document.getElementById('notificationFilesReview');
  const fileHtml=`<details class="polished-setting"><summary><span>${escapeHtml(translateText('Archivos de sonido guardados'))}<small>${escapeHtml(ui`${files.length} archivos propios`)}</small></span></summary><div class="polished-setting-body">`
    +(files.length?files.map(item=>row(item.name,`${(item.size.bytes/1024).toFixed(1)} KiB`)).join(''):ui`<p class="note">No hay archivos propios guardados.</p>`)
    +ui`<p class="note">Máximo 300 KiB por archivo. Se guarda como texto dentro de tus ajustes y ocupa más que el audio original. Elegir otro sonido no borra el archivo; usá Quitar archivo para liberarlo.</p></div></details>`;
  if(fileRoot&&fileRoot.dataset.content!==fileHtml){const opened=fileRoot.querySelector('details')?.open;fileRoot.innerHTML=fileHtml;fileRoot.dataset.content=fileHtml;if(opened)fileRoot.querySelector('details').open=true;}
  if(!bound){bound=true;
    document.addEventListener('input',event=>{if(event.target.closest?.('#notificationsModal'))queueMicrotask(()=>activeContext&&renderNotificationReview(activeContext));});
    document.addEventListener('change',event=>{if(event.target.closest?.('#notificationsModal'))queueMicrotask(()=>activeContext&&renderNotificationReview(activeContext));});
    document.addEventListener('app:modal-closed',event=>{if(event.detail?.id==='notificationsModal'){clearTimeout(timer);timer=null;activeContext=null;}});
  }
  clearTimeout(timer);timer=setTimeout(()=>{if(activeContext?.valid()&&document.getElementById('notificationsModal')?.classList.contains('open'))renderNotificationReview(activeContext);},1000);
}
