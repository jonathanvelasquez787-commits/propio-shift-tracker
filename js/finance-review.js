export function confirmFinanceAction(context,model,change) {
  const {ui,translateText,escapeHtml,money,convertedInline}=context,expected=context.signature();let settled=false;
  const amount=value=>`${money(value)}${convertedInline(value)}`;
  const row=(label,value)=>`<div class="review-line"><span>${escapeHtml(label)}</span><strong>${value}</strong></div>`;
  const metric=(label,value)=>`<div class="review-metric"><span>${escapeHtml(label)}</span><strong>${amount(value)}</strong></div>`;
  context.appConfirm(translateText('Revisá el efecto antes de aplicar.'),()=>{
    if(settled)return false;settled=true;
    if(!context.valid()||context.signature()!==expected){context.toast(translateText('Los datos de Finanzas cambiaron. Abrí de nuevo la vista previa.'));return false;}
    return change();
  });
  document.getElementById('confirmModalTitle').textContent=model.kind==='reset'?translateText('Liberar reserva'):model.kind==='plan'?translateText('Aplicar meta desde Finanzas'):translateText('Repartir el disponible');
  document.getElementById('confirmModalOkBtn').textContent=model.kind==='reset'?translateText('Liberar reserva'):model.kind==='plan'?translateText('Aplicar meta'):translateText('Activar reparto');
  let html='';
  if(model.kind==='reset'){
    html=`<h4>${escapeHtml(model.name)}</h4><div class="review-overview">${metric(translateText('Vuelve a Disponible'),model.reserved)}</div><p class="review-scope">${escapeHtml(model.period)} · ${model.recurring?translateText('Recurrente'):translateText('Puntual')}</p>`
      +ui`<div class="review-callout">Se conservan la fila, su objetivo y sus ${model.paymentCount} pagos registrados. El período no borra ni genera pagos automáticamente.</div>`
      +(model.automatic?ui`<p class="note">El reparto automático puede volver a reservar para esta fila con la próxima llamada.</p>`:'')
      +(model.automatic&&!model.isMeta?ui`<p class="note">Para evitarlo, activá Omitir reserva automática en el gasto.</p>`:'');
  }else if(model.kind==='plan'){
    html=`<div class="review-overview">${metric(translateText('Meta general actual'),model.currentDollars)}${metric(translateText('Nueva meta diaria'),model.dollars)}</div>${row(translateText('Minutos productivos por día'),escapeHtml(String(model.minutes)))}`
      +`<details class="review-details"><summary>${escapeHtml(translateText('Ver proyección y distribución'))}</summary><div class="review-detail-body">${row(translateText('Estimado para cuatro semanas'),amount(model.projected))}${model.distribution.map((value,index)=>row([translateText('Gastos fijos'),translateText('Gastos variables'),translateText('Ahorro')][index],amount(value))).join('')}`
      +ui`<p class="note">Se calcula con ${model.days} días por semana, 4 semanas y tarifa base de ${escapeHtml(money(model.rate))}/min. No incluye Higher Rate.</p></div></details>`
      +ui`<div class="review-callout">Actualiza la meta general y la distribución del plan. No asigna dinero ni registra pagos. Las metas históricas de otros días se conservan.</div>`
      +(model.dayOverride?ui`<p class="note">La excepción de meta de hoy se quitará para usar esta meta general.</p>`:'');
  }else{
    const allocated=model.plan.reduce((sum,item)=>sum+item.amount,0);
    html=`<div class="review-overview">${metric(translateText('Se reserva ahora'),allocated)}${metric(translateText('Disponible después'),Math.max(0,model.available-allocated))}</div><h4>${escapeHtml(translateText('Destino del dinero'))}</h4>`
      +model.plan.map((item,index)=>row(`${index+1}. ${item.row.name}`,amount(item.amount))).join('')
      +(model.plan.length?'':`<p class="note">${escapeHtml(translateText('No hay un reparto inmediato; se usará el próximo disponible.'))}</p>`)
      +ui`<div class="review-callout">Reservar aparta dinero en tu plan. No registra un pago ni cambia tus ganancias.</div>`
      +`<details class="review-details"><summary>${escapeHtml(translateText('Ver destinos en orden de prioridad'))}</summary><div class="review-detail-body">${row(translateText('Disponible antes'),amount(model.available))}`
      +ui`<p class="note">Primero Gastos, luego Metas. Reservar no registra pagos ni modifica tus ganancias.</p></div></details>`;
  }
  document.getElementById('confirmModalDetails').className='review-confirm';
  document.getElementById('confirmModalDetails').innerHTML=html;
}

export function openFinanceDistribution(context,model) {
  const {ui,translateText,escapeHtml,money,convertedInline}=context;
  const amount=value=>`${value>0?'+':''}${money(value)}${convertedInline(value)}`;
  const report=model.report,items=Array.isArray(report?.items)?report.items.filter(item=>Number.isFinite(item?.amount)&&typeof item.name==='string'):[];
  const date=new Date(report?.at),at=Number.isFinite(date.getTime())?date.toLocaleString(context.displayLocale()):'—';
  document.getElementById('financeDistributionContent').innerHTML=`<h4 class="review-heading">${escapeHtml(translateText('Último ajuste automático de reservas'))}</h4>`
    +(items.length?`<p class="review-scope">${escapeHtml(at)}</p>${items.map(item=>`<div class="review-line"><span>${escapeHtml(item.name)}</span><strong>${amount(item.amount)}</strong></div>`).join('')}`:ui`<p class="note">Todavía no hay un ajuste automático registrado en esta versión.</p>`)
    +ui`<details class="review-details"><summary>Cómo se reparte</summary><div class="review-detail-body"><p class="note">El disponible se reserva primero para Gastos y luego para Metas, siguiendo las prioridades de cada lista. Los pagos registrados se llevan por separado.</p><p class="note">Los importes negativos liberan reservas tras corregir las ganancias. Es el último ajuste automático, no un historial de pagos ni el saldo actual de cada fila.</p></div></details>`;
  context.openModal('financeDistributionModal');
}
