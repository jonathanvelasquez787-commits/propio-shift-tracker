function totals(days){
  return days.reduce((sum,day)=>({calls:sum.calls+day.dayCalls.length,productive:sum.productive+day.productive,earnings:sum.earnings+day.stats.earnings}),{calls:0,productive:0,earnings:0});
}

function callAmounts(ctx,call){
  const base=ctx.parseMoney(call.pay),bonus=Number.isFinite(call.accountingBonusUsd)?call.accountingBonusUsd:Number(ctx.higherRateBonusForCall(call)?.amount)||0;
  return {base,bonus,total:base+bonus};
}

export function accountingCsvContent(ctx,range,days){
  const {translateText,formatCallDayLabel,formatMinutes,csvField}=ctx,rows=[];
  const add=values=>rows.push(values.map(csvField).join(','));
  add([translateText('Resumen por día'),range.label]);add([translateText('Moneda'),'USD']);
  add([translateText('Alcance'),translateText('Ganancias registradas, incluido Higher Rate. No confirma dinero recibido ni incluye reservas o pagos de gastos.')]);
  add([translateText('Fecha'),translateText('Llamadas'),translateText('Productivo (min)'),translateText('Adherencia (%)'),translateText('Ganancias ($)')]);
  for(const day of days)add([formatCallDayLabel(day.dayKey),day.dayCalls.length,formatMinutes(day.productive),day.adherence?.scorePct??'',day.stats.earnings.toFixed(2)]);
  const total=totals(days);add([translateText('Total'),total.calls,formatMinutes(total.productive),'',total.earnings.toFixed(2)]);
  rows.push('');add([translateText('Detalle de llamadas')]);
  add([translateText('Fecha'),'Customer ID',translateText('Inicio'),translateText('Duración (min)'),'Billable','Dropped',translateText('Pago base ($)'),translateText('Higher Rate ($)'),translateText('Total ($)')]);
  for(const day of days)for(const call of day.dayCalls){const amount=callAmounts(ctx,call);add([day.dayKey,call.customerId,call.callStart,call.durationMin,call.billable,call.dropped,amount.base.toFixed(2),amount.bonus.toFixed(2),amount.total.toFixed(2)]);}
  return '\uFEFF'+rows.join('\r\n');
}

export function accountingPdfDocument(ctx,range,days){
  const {ui,escapeHtml:e,formatCallDayLabel,formatMinutes,money,fmtDate}=ctx,total=totals(days);
  const rows=days.map(day=>ui`<tr><td>${e(formatCallDayLabel(day.dayKey))}</td><td>${day.dayCalls.length}</td><td>${e(formatMinutes(day.productive))}</td><td>${day.adherence?day.adherence.scorePct+'%':'—'}</td><td>${e(money(day.stats.earnings))}</td></tr>`).join('');
  const detail=days.flatMap(day=>day.dayCalls.map(call=>{const amount=callAmounts(ctx,call);return ui`<tr><td>${e(day.dayKey)}</td><td>${e(call.customerId)}</td><td>${e(call.callStart)}</td><td>${e(call.durationMin)}</td><td>${e(call.billable)}</td><td>${e(call.dropped)}</td><td>${e(money(amount.base))}</td><td>${e(money(amount.bonus))}</td><td>${e(money(amount.total))}</td></tr>`;})).join('')||ui`<tr><td colspan="9">Sin llamadas en este período.</td></tr>`;
  return ui`<!doctype html><html lang="${e(ctx.displayLocale())}"><head><meta charset="utf-8"><title>Reporte de ganancias — ${e(range.label)}</title><style>
  *{box-sizing:border-box}body{font:12px/1.5 Arial,Helvetica,sans-serif;margin:32px;color:#172033;background:#fff}h1{font-size:24px;margin:0 0 4px}h2{font-size:15px;margin:28px 0 10px}.sub{color:#64748b;margin:4px 0}.totals{display:flex;gap:40px;padding:18px 0;border-top:2px solid #172033;border-bottom:1px solid #dce2e9;margin:22px 0}.totals span{display:grid;gap:5px;color:#64748b}.totals b{font-size:20px;color:#172033}table{width:100%;min-width:0;border-collapse:collapse}.table-scroll{min-width:0}.scroll-hint{display:none}@media screen and (max-width:700px){.table-scroll{overflow-x:auto}.table-scroll table{width:800px}.scroll-hint{display:block;color:#64748b;font-size:11px}}th,td{padding:8px 7px;text-align:left;border-bottom:1px solid #e2e8f0;font-size:10px;overflow-wrap:anywhere}th{background:#f1f5f9}tfoot{font-weight:bold}.print-btn{padding:10px 16px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#172033;cursor:pointer;font-weight:bold}@media print{body{margin:0}.print-btn,.scroll-hint{display:none}.table-scroll{overflow:visible}.table-scroll table{width:100%}thead{display:table-header-group}tr{break-inside:avoid}@page{size:landscape;margin:15mm}}
  </style></head><body><h1>Reporte de ganancias</h1><p class="sub">${e(range.label)} · USD · ${e(fmtDate(new Date()))}</p><p class="sub">Ganancias registradas, incluido Higher Rate. No confirma dinero recibido ni incluye reservas o pagos de gastos.</p><div class="totals"><span>Llamadas<b>${total.calls}</b></span><span>Minutos productivos<b>${e(formatMinutes(total.productive))}</b></span><span>Ganancias<b>${e(money(total.earnings))}</b></span></div><button class="print-btn" type="button">Imprimir / Guardar como PDF</button><p class="scroll-hint">Deslizá las tablas hacia los lados para ver todas las columnas.</p><h2>Resumen por día</h2><div class="table-scroll" tabindex="0"><table><thead><tr><th>Fecha</th><th>Llamadas</th><th>Productivo (min)</th><th>Adherencia</th><th>Ganancias</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td>Total</td><td>${total.calls}</td><td>${e(formatMinutes(total.productive))}</td><td></td><td>${e(money(total.earnings))}</td></tr></tfoot></table></div><h2>Detalle de llamadas</h2><div class="table-scroll" tabindex="0"><table><thead><tr><th>Fecha</th><th>Customer ID</th><th>Inicio</th><th>Min</th><th>Billable</th><th>Dropped</th><th>Pago base</th><th>Higher Rate</th><th>Total</th></tr></thead><tbody>${detail}</tbody></table></div></body></html>`;
}

export function exportAccountingDocument(ctx,kind,range,days,popup){
  if(kind==='pdf'){
    popup.document.write(accountingPdfDocument(ctx,range,days));popup.document.close();
    popup.document.querySelector('.print-btn').addEventListener('click',()=>popup.print());
    ctx.toast(ctx.translateText('Reporte listo — usa "Imprimir / Guardar como PDF" en la pestaña nueva'));return;
  }
  const blob=new Blob([accountingCsvContent(ctx,range,days)],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=`ganancias_${range.label.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'')}.csv`;link.click();URL.revokeObjectURL(url);ctx.toast(ctx.translateText('CSV exportado'));
}
