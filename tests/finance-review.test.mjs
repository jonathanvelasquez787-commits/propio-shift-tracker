import test from 'node:test';
import assert from 'node:assert/strict';
import {confirmFinanceAction,openFinanceDistribution} from '../js/finance-review.js';
import {financeReservationPlan,validFinanceSettings} from '../js/finance-plan-model.js';

function harness(t){
 const previous=globalThis.document,elements=new Map();
 globalThis.document={getElementById:id=>{if(!elements.has(id))elements.set(id,{textContent:'',innerHTML:'',className:''});return elements.get(id);}};
 t.after(()=>{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;});
 let signature='initial',valid=true,callback,changed=0;const messages=[],opened=[];
 const context={ui:(strings,...values)=>strings.reduce((result,text,i)=>result+text+(values[i]??''),''),translateText:text=>text,
  escapeHtml:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),money:value=>'$'+value.toFixed(2),convertedInline:value=>`<small>≈ L ${(value*27).toFixed(2)}</small>`,
  signature:()=>signature,valid:()=>valid,appConfirm:(_message,run)=>{callback=run;},toast:value=>messages.push(value),openModal:value=>opened.push(value),displayLocale:()=> 'es-HN'};
 return {context,elements,messages,opened,run:model=>confirmFinanceAction(context,model,()=>++changed),confirm:()=>callback(),changed:()=>changed,
  stale:()=>{signature='changed';},invalidate:()=>{valid=false;}};
}

test('reservation preview conserves money, follows priority and leaves original rows untouched',()=>{
 const rows=[{name:'Internet',assignedAmount:10,targetAmount:40,kind:'gasto'},{name:'Emergency',assignedAmount:0,targetAmount:100,kind:'meta'}],before=JSON.stringify(rows);
 const plan=financeReservationPlan(rows,50,row=>row.kind==='meta');
 assert.deepEqual(plan.map(item=>item.amount),[30,20]);assert.deepEqual(plan.map(item=>item.nextAssigned),[40,20]);assert.equal(JSON.stringify(rows),before);
 assert.equal(plan.reduce((sum,item)=>sum+item.amount,0),50);
 assert.deepEqual(financeReservationPlan(rows,0,row=>row.kind==='meta'),[]);
});

test('finance confirmation cannot apply before acceptance, after changed data, or more than once',t=>{
 const h=harness(t),model={kind:'auto',available:100,plan:[{row:{name:'<img onerror=x>'},amount:30}]};
 h.run(model);assert.equal(h.changed(),0);
 const html=h.elements.get('confirmModalDetails').innerHTML;assert.match(html,/\$30.00/);assert.match(html,/\$70.00/);assert.match(html,/L 810/);assert.match(html,/&lt;img/);assert.doesNotMatch(html,/<img/);
 h.stale();assert.equal(h.confirm(),false);assert.equal(h.changed(),0);
 h.run(model);h.confirm();h.confirm();assert.equal(h.changed(),1);
 h.run(model);h.invalidate();assert.equal(h.confirm(),false);assert.equal(h.changed(),1);
});

test('reset preview identifies the returned reserve and retained payments without performing a reset',t=>{
 const h=harness(t);h.run({kind:'reset',name:'Internet',reserved:30,period:'Monthly',recurring:true,paymentCount:4,automatic:true,isMeta:false});
 const html=h.elements.get('confirmModalDetails').innerHTML;assert.match(html,/\$30.00/);assert.match(html,/4 pagos/);assert.match(html,/Omitir reserva automática/);assert.equal(h.changed(),0);
});

test('finance plan preview keeps projections and their assumptions folded and compares the two goals',t=>{
 const h=harness(t);h.run({kind:'plan',currentDollars:40,dollars:50,minutes:420,days:5,rate:.12,projected:1000,distribution:[500,300,200],dayOverride:true});
 const html=h.elements.get('confirmModalDetails').innerHTML;assert.match(html,/\$40.00/);assert.match(html,/\$50.00/);assert.match(html,/<details[^>]*><summary>Ver proyección/);assert.match(html,/No incluye Higher Rate/);assert.match(html,/excepción de meta de hoy/);assert.equal(h.changed(),0);
});

test('latest distribution distinguishes released amounts from payments and escapes destination labels',t=>{
 const h=harness(t);openFinanceDistribution(h.context,{report:{at:'2026-10-19T18:00:00Z',items:[{name:'<script>',amount:-20},{name:'Savings',amount:10},{name:'Invalid',amount:Infinity}]}});
 const html=h.elements.get('financeDistributionContent').innerHTML;assert.match(html,/\$-20.00/);assert.match(html,/\+\$10.00/);assert.match(html,/&lt;script>/);assert.doesNotMatch(html,/Infinity/);assert.match(html,/no un historial de pagos/);assert.deepEqual(h.opened,['financeDistributionModal']);
});

test('finance settings reject malformed received-payment backups instead of silently discarding them',()=>{
 assert.equal(validFinanceSettings({payReceipts:{unknown:'data'}}),false);
 assert.equal(validFinanceSettings({payReceipts:[{id:'bad'}]}),false);
 assert.equal(validFinanceSettings({payReceipts:[]}),true);
});
