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
  const sound=kind=>({classic:translateText('Beep clásico'),chime:translateText('Campanita'),custom:translateText('Archivo propio')})[kind]||translateText('Beep clásico');
  const advance=value=>Number(value)>0?ui`${Number(value)} min antes`:translateText('Desactivado');
  const progress=context.productive(),model=productiveNoticeProgress(progress?.productiveMin,settings.productiveBreakEarnMin);
  const volume=Math.max(0,Math.min(100,Number(settings.masterVolume)||0));
  const mappings=[
    [translateText('Terminar y guardar desde la tool'),'callEnded'],
    [translateText('Importar un lote pegado'),'callPasted'],
    [translateText('Guardar una llamada manual'),'callManual'],
  ];
  const files=[['productiveBreakCustomSoundDataUrl','productiveBreakCustomSoundName'],...context.soundConfigs.map(cfg=>[cfg.urlKey,cfg.nameKey])]
    .map(([urlKey,nameKey])=>({name:settings[nameKey]||translateText('Sonido personalizado'),size:customSoundFootprint(settings[urlKey])})).filter(item=>item.size);
  const button=(action,label)=>`<button class="mc-btn-secondary" type="button" data-notice-review="${action}">${escapeHtml(label)}</button>`;
  const html=`<div class="review-confirm"><div class="review-overview"><div class="review-metric"><span>${escapeHtml(translateText('Sonido general'))}</span><strong>${escapeHtml(volume?`${volume}%`:translateText('Silenciado'))}</strong></div><div class="review-metric"><span>${escapeHtml(translateText('Próximo descanso por productividad'))}</span><strong>${escapeHtml(!model?translateText('Desactivado'):!progress?translateText('En espera'):ui`Faltan ${Math.ceil(model.remaining)} min`)}</strong></div></div>`
    +(!volume?ui`<p class="note">Volumen 0%: no suena ningún aviso. Los mensajes escritos siguen activos.</p>`:'')
    +`<details class="review-details"><summary>${escapeHtml(translateText('Resumen de alarmas y sonidos'))}</summary><div class="review-detail-body">`
    +row(translateText('Inicio de turno'),advance(settings.alertBeforeShiftMin))
    +row(translateText('Inicio de Break/Lunch'),advance(settings.alertBeforeBreakMin))
    +row(translateText('Final de Break/Lunch'),advance(settings.alertBeforeBreakEndMin))
    +mappings.map(([label,key])=>row(label,settings[key+'SoundEnabled']===true?sound(settings[key+'AlarmSound']):translateText('Desactivado'))).join('')
    +ui`<p class="note">La sincronización y las correcciones de la extensión son silenciosas. Pegar texto sin importar, repetir duplicados o fallar al guardar no reproduce el aviso de importación.</p></div></details>`
    +`<details class="review-details"><summary>${escapeHtml(translateText('Cómo va el descanso por productividad'))}</summary><div class="review-detail-body">`
    +(model&&progress?row(translateText('Minutos productivos registrados'),String(progress.productiveMin))+row(translateText('Tramos completos desde la última pausa'),String(model.completed))+`<progress max="100" value="${model.percent}" aria-label="${escapeHtml(translateText('Progreso del próximo aviso'))}"></progress>`:ui`<p class="note">Se cuenta durante un turno laboral activo y fuera de Break/Lunch. Las llamadas guardadas aportan minutos; una pausa terminada establece un nuevo comienzo.</p>`)
    +ui`<p class="note">Es un aviso para que decidás descansar. No inicia Break, no te pone disponible y no repite avisos anteriores al recargar.</p></div></details>`
    +`<details class="review-details"><summary>${escapeHtml(translateText('Archivos de sonido guardados'))}</summary><div class="review-detail-body">`
    +(files.length?files.map(item=>row(item.name,`${(item.size.bytes/1024).toFixed(1)} KiB`)).join(''):ui`<p class="note">No hay archivos propios guardados.</p>`)
    +ui`<p class="note">Máximo 300 KiB por archivo. Se guarda como texto dentro de tus ajustes y ocupa más que el audio original. Elegir otro sonido no borra el archivo; usá Quitar archivo para liberarlo.</p></div></details>`
    +`<div class="mc-action-row">${button('support',translateText('Configurar apoyo sin llamadas'))}${button('history',translateText('Ver cierres guardados'))}</div></div>`;
  if(root.innerHTML!==html){const opened=[...root.querySelectorAll('details')].map(item=>item.open);root.innerHTML=html;root.querySelectorAll('details').forEach((item,index)=>{item.open=!!opened[index];});}
  if(!bound){bound=true;
    document.addEventListener('input',event=>{if(event.target.closest?.('#notificationsModal'))queueMicrotask(()=>activeContext&&renderNotificationReview(activeContext));});
    document.addEventListener('change',event=>{if(event.target.closest?.('#notificationsModal'))queueMicrotask(()=>activeContext&&renderNotificationReview(activeContext));});
    document.addEventListener('click',event=>{const button=event.target.closest?.('[data-notice-review]');if(button&&activeContext?.valid())activeContext.navigate(button.dataset.noticeReview);});
    document.addEventListener('app:modal-closed',event=>{if(event.detail?.id==='notificationsModal'){clearTimeout(timer);timer=null;activeContext=null;}});
  }
  clearTimeout(timer);timer=setTimeout(()=>{if(activeContext?.valid()&&document.getElementById('notificationsModal')?.classList.contains('open'))renderNotificationReview(activeContext);},1000);
}
