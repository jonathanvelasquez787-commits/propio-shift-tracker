import {validPayReceipt,validPayReceipts,payReceiptFor,payReceiptKey,payReceiptComparison,payCycleExpected} from './pay-receipt-model.js';

let editor=null;
let lastRender=null;
const amountHtml=(ctx,amount)=>`${ctx.money(amount)}${ctx.financeConvertedInline(amount)}`;
const records=ctx=>Array.isArray(ctx.data().settings.payReceipts)?ctx.data().settings.payReceipts:[];
const expected=(ctx,cycle)=>payCycleExpected(ctx.data().calls,cycle.cycleStart,cycle.cycleEnd,
  call=>ctx.isoDateFromDayKey(call.callDate),call=>ctx.parseMoney(call.pay)+(Number(ctx.higherRateBonusForCall(call)?.amount)||0));
const cycleData=cycle=>[cycle.cycleStart,cycle.cycleEnd,cycle.scheduledDate].join('|');
const receiptSignature=record=>JSON.stringify(record || null);

function renderPayDates(context) {
  const {ui,translateText,displayLocale,todayRange,cycleBoundsForOffset,formatCallDayLabel,todayCallDateKey,escapeHtml,iconHtml}=context;
  const body=document.getElementById('payDatesBody');if(!body)return;
  const today=todayRange();
  const cycles=[-2,-1,0,1,2].map(offset=>{
    const {start,end,payDate}=cycleBoundsForOffset(offset);
    return {start,end,payDate,cycleStart:context.isoDateFromDayKey(todayCallDateKey(start)),cycleEnd:context.isoDateFromDayKey(todayCallDateKey(end)),scheduledDate:context.isoDateFromDayKey(todayCallDateKey(payDate)),
      isCurrent:today>=start&&today<=todayRange(end),past:todayRange(payDate)<today};
  });
  const next=cycles.find(c=>!c.past)||cycles[2];
  const full=date=>new Intl.DateTimeFormat(displayLocale(),{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(date);
  const short=date=>new Intl.DateTimeFormat(displayLocale(),{day:'numeric',month:'long'}).format(date);
  const weekday=date=>new Intl.DateTimeFormat(displayLocale(),{weekday:'long'}).format(date)+' · '+date.getFullYear();
  const range=cycle=>`${formatCallDayLabel(todayCallDateKey(cycle.start))} – ${formatCallDayLabel(todayCallDateKey(cycle.end))}`;
  const days=Math.max(0,Math.round((todayRange(next.payDate)-today)/86400000));
  const nextHtml=ui`<div class="pd-next-card"><div><div class="pd-next-label">Próxima fecha de pago</div><div class="pd-next-date">${escapeHtml(full(next.payDate))}</div><div class="pd-next-sub">Del ciclo ${escapeHtml(range(next))}</div></div><div class="pd-next-days-wrap"><div class="pd-next-days">${days}</div><div class="pd-next-days-label">días restantes</div></div></div><p class="note">Las fechas son programadas. Un pago se marca recibido solo cuando vos lo registrás.</p>`;
  const row=cycle=>{
    const record=payReceiptFor(records(context),cycle.cycleStart,cycle.cycleEnd),estimated=expected(context,cycle);
    const comparison=record?payReceiptComparison(record,estimated):null;
    const status=record?translateText('Recepción registrada por vos'):cycle.past?translateText('Fecha pasada · recepción sin confirmar'):translateText('Fecha programada');
    return ui`<div class="wk-row ${cycle.isCurrent?'is-today':''}"><span class="wk-row-icon ${record?'tone-good':cycle.isCurrent?'tone-cyan':'tone-neutral'}">${iconHtml(record?'checkCircle':'calendar')}</span><div class="wk-row-main"><div class="wk-row-title">Ciclo: ${escapeHtml(range(cycle))}${cycle.isCurrent?ui` <span class="wk-row-badge tone-cyan">Actual — día ${Math.round((today-todayRange(cycle.start))/86400000)+1} de 14</span>`:''}</div><div class="wk-row-sub">${escapeHtml(status)}</div><details class="pay-receipt-details"><summary>Comparar esperado y recibido</summary><div class="fin-preview-row"><span>Esperado según tus registros</span><strong>${amountHtml(context,estimated)}</strong></div>${record?ui`<div class="fin-preview-row"><span>Recibido al ${escapeHtml(record.date)}</span><strong>${amountHtml(context,record.usd)}</strong></div><div class="fin-preview-row"><span>Diferencia</span><strong>${amountHtml(context,comparison.difference)}</strong></div>`:ui`<p class="note">Todavía no registraste una recepción para este ciclo.</p>`}<p class="note">El esperado sigue los registros del ciclo; el recibido no se recalcula al corregir llamadas.</p></details><button class="fin-ghost-btn" type="button" data-pay-receipt="${escapeHtml(cycleData(cycle))}">${record?translateText('Editar recibido'):translateText('Registrar recibido')}</button></div><div class="wk-row-right"><div class="wk-row-amount" style="color:${cycle===next?'var(--accent-blue-2, var(--cyan))':'var(--text)'}">${escapeHtml(short(cycle.payDate))}</div><div class="wk-row-amount-sub">${escapeHtml(weekday(cycle.payDate))}</div></div></div>`;
  };
  const visible=new Set(cycles.map(c=>payReceiptKey(c.cycleStart,c.cycleEnd)));
  const older=records(context).filter(record=>validPayReceipt(record)&&!visible.has(payReceiptKey(record.cycleStart,record.cycleEnd)));
  const history=older.length?ui`<details class="recovery-card"><summary>Recepciones de otros ciclos (${older.length})</summary>${older.map(record=>ui`<div class="import-outcome-row"><strong>${escapeHtml(record.cycleStart)} → ${escapeHtml(record.cycleEnd)}</strong><p>${amountHtml(context,record.usd)} · ${escapeHtml(record.date)}</p><button class="fin-ghost-btn" type="button" data-pay-receipt="${escapeHtml(cycleData(record))}">Editar recibido</button></div>`).join('')}</details>`:'';
  const html=nextHtml+`<div class="wk-list">${cycles.map(row).join('')}</div>`+history;
  if(lastRender?.body!==body||lastRender.owner!==context.data().settings||lastRender.html!==html){body.innerHTML=html;lastRender={body,owner:context.data().settings,html};}
}

function openReceipt(ctx,raw) {
  const [cycleStart,cycleEnd,scheduledDate]=String(raw||'').split('|');
  const cycle={cycleStart,cycleEnd,scheduledDate};
  const record=payReceiptFor(records(ctx),cycleStart,cycleEnd);
  const today=ctx.isoDateFromDayKey(ctx.todayCallDateKey(new Date()));
  if(!validPayReceipt({id:'preview',...cycle,date:today,usd:0,expectedAtSave:0}))return false;
  editor={owner:ctx.data().settings,cycle,signature:receiptSignature(record),id:record?.id};
  const dateFormat=new Intl.DateTimeFormat(ctx.displayLocale(),{day:'numeric',month:'short',year:'numeric'});
  document.getElementById('payReceiptScope').textContent=dateFormat.formatRange(new Date(`${cycleStart}T12:00:00`),new Date(`${cycleEnd}T12:00:00`));
  document.getElementById('payReceiptAmount').value=record?String(record.usd):'';
  document.getElementById('payReceiptDate').value=record?.date||today;
  document.getElementById('payReceiptStatus').textContent='';
  document.getElementById('payReceiptDeleteBtn').hidden=!record;
  updateReceiptPreview(ctx);
  ctx.openModal('payReceiptModal');return true;
}

function currentEditor(ctx) {
  if(!editor||ctx.data().settings!==editor.owner||!ctx.canPersistLocalChanges())return false;
  return receiptSignature(payReceiptFor(records(ctx),editor.cycle.cycleStart,editor.cycle.cycleEnd))===editor.signature;
}

function updateReceiptPreview(ctx) {
  const {ui}=ctx;
  if(!editor||ctx.data().settings!==editor.owner)return;
  const raw=document.getElementById('payReceiptAmount').value.trim(),usd=Number(raw),estimate=expected(ctx,editor.cycle);
  const amount=raw&&Number.isFinite(usd)&&usd>=0&&usd<=1e9?usd:null;
  document.getElementById('payReceiptExpected').innerHTML=ui`<span>Esperado según tus llamadas</span><strong>${amountHtml(ctx,estimate)}</strong>`;
  const difference=amount===null?null:Math.round((amount-estimate)*100)/100;
  document.getElementById('payReceiptPreview').innerHTML=difference===null?'':ui`<div class="review-line"><span>Diferencia con lo esperado</span><strong class="${difference>0?'review-positive':difference<0?'review-negative':''}">${difference>0?'+':''}${amountHtml(ctx,difference)}</strong></div>`;
}

function saveReceipt(ctx) {
  const {translateText}=ctx;
  const status=document.getElementById('payReceiptStatus');
  if(!currentEditor(ctx)){status.textContent=translateText('Los datos cambiaron. Cerrá y abrí este registro antes de guardar.');return false;}
  const raw=document.getElementById('payReceiptAmount').value.trim(),date=document.getElementById('payReceiptDate').value;
  const record={id:editor.id||ctx.makeLocalId(),...editor.cycle,date,usd:Number(raw),expectedAtSave:expected(ctx,editor.cycle)};
  if(!raw||!validPayReceipt(record)||date>ctx.isoDateFromDayKey(ctx.todayCallDateKey(new Date()))){status.textContent=translateText('Revisá el monto y la fecha: la recepción no puede estar en el futuro.');return false;}
  const previous=editor.owner.payReceipts;
  if(previous!==undefined&&!validPayReceipts(previous)){status.textContent=translateText('Los datos cambiaron. Cerrá y abrí este registro antes de guardar.');return false;}
  const next=[...(Array.isArray(previous)?previous:[]).filter(item=>payReceiptKey(item.cycleStart,item.cycleEnd)!==payReceiptKey(record.cycleStart,record.cycleEnd)),record];
  if(!validPayReceipts(next)){status.textContent=translateText('Los datos cambiaron. Cerrá y abrí este registro antes de guardar.');return false;}
  editor.owner.payReceipts=next;
  if(ctx.saveSettingsOnly()===false){if(ctx.data().settings===editor.owner){if(previous===undefined)delete editor.owner.payReceipts;else editor.owner.payReceipts=previous;}status.textContent=translateText('No se guardó la recepción. Tu borrador sigue abierto.');return false;}
  editor=null;ctx.closeModal('payReceiptModal');ctx.render();ctx.toast(translateText('Recepción registrada. Tus llamadas, ganancias y reservas se conservan.'));return true;
}

function deleteReceipt(ctx) {
  const {translateText}=ctx;
  if(!currentEditor(ctx)||!editor.id)return false;
  const active=editor;
  ctx.appConfirm(translateText('¿Eliminar esta recepción manual? Las llamadas, ganancias y reservas no cambian.'),()=>{
    if(editor!==active||!currentEditor(ctx))return false;
    const previous=active.owner.payReceipts;active.owner.payReceipts=previous.filter(record=>record.id!==active.id);
    if(ctx.saveSettingsOnly()===false){if(ctx.data().settings===active.owner)active.owner.payReceipts=previous;return false;}
    editor=null;ctx.closeModal('payReceiptModal');ctx.render();return true;
  });
}

export function payReceiptAction(context,action,value) {
  if(action==='render'||action==='retry')return renderPayDates(context);
  if(action==='open')return openReceipt(context,value);
  if(action==='preview')return updateReceiptPreview(context);
  if(action==='save')return saveReceipt(context);
  if(action==='delete')return deleteReceipt(context);
}
