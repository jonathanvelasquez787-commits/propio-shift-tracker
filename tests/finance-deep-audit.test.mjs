import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { settings, calls, state, setAppSettings, setAppState, setAppCalls } from '../js/app-context.js';
import { setLanguage } from '../js/i18n.js';
import { configureFinanceContext, financeApplySignedAmount, financeSwapPriority, financeDeleteRow,
  updateFinanceAutoFillSetting, financeRunAutoFillCascade, financeResetRow, financeToggleManualPaid,
  createFinanceCategory, financeDeleteCategory, openFinanceNewCatPanel, openFinanceRowModal,
  saveFinanceRowModal, renderFinanceSection } from '../js/finance.js';
import { financeInputUsd, financeInputValue, addFinancePayment, deleteFinancePayment, financePlanningRowHtml, saveFinancePlan, saveFinanceSavingsMonths } from '../js/finance-planning.js';
import { financeExpenseStatus, financeMonthTotals, validFinanceSettings } from '../js/finance-plan-model.js';
import { configureSettingsContext, updateCurrencySettings, updateRate } from '../js/settings.js';
import { configureHigherRateContext, higherRateBonusForCalls } from '../js/higher-rate.js';

test('explicit rollback feedback survives a pending storage failure without showing success',()=>{
  const source=fs.readFileSync(new URL('../js/app-main.js',import.meta.url),'utf8');
  const toastSource=source.slice(source.indexOf('export function toast('),source.indexOf('export function escapeHtml(')).replace('export function','function');
  const element={textContent:'',classList:{add(){},remove(){}}};
  const context=vm.createContext({document:{getElementById:()=>element},clearTimeout(){},setTimeout(){return 1;},STORAGE_QUOTA_TOAST:'save rejected',storageSnapshotPending:true});
  vm.runInContext(toastSource,context);
  vm.runInContext("toast('Applied')",context);assert.equal(element.textContent,'save rejected');
  vm.runInContext("toast('Reservation restored', {persistenceFailure:true})",context);assert.equal(element.textContent,'Reservation restored');
});

test('rejected reserve release and auto-exclusion restore their controls and report the failure',t=>{
  const h=harness(t),before=JSON.stringify(settings);h.reject();
  assert.equal(financeResetRow('otro','food'),false);assert.equal(JSON.stringify(settings),before);assert.match(h.messages.at(-1),/No se liberó/);
  assert.equal(financeToggleManualPaid('otro','food',true),false);assert.equal(JSON.stringify(settings),before);assert.match(h.messages.at(-1),/No se cambió/);
});

function harness(t) {
  setLanguage('es');
  const oldDocument = globalThis.document;
  const fields = new Map();
  const field = id => { if (!fields.has(id)) fields.set(id, {value:'',textContent:'',innerHTML:'',style:{},hidden:false,disabled:false,classList:{add(){},remove(){},toggle(){}},setAttribute(){},focus(){}}); return fields.get(id); };
  globalThis.document = {getElementById:field,querySelectorAll:()=>[]};
  t.after(()=>{if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;});
  const expense={id:'food',name:'Comida',categoryId:'otro',kind:'gasto',targetAmount:80,assignedAmount:30,priority:1,recurring:true,budgetPeriod:'monthly'};
  const second={id:'rent',name:'Renta',categoryId:'otro',kind:'gasto',targetAmount:40,assignedAmount:10,priority:2,recurring:true,budgetPeriod:'monthly'};
  const goal={id:'goal',name:'Meta',categoryId:'ahorro',kind:'meta',targetAmount:100,assignedAmount:10,priority:1};
  setAppSettings({financeAutoFill:false,financeCategories:{otro:{rows:[expense,second]},ahorro:{rows:[goal]},casa:{rows:[]}},customFinanceCategories:[],financePayments:[],rate:.12,productiveGoalMin:360,currencyLabel:'L',exchangeRate:26.8});
  setAppState({});setAppCalls([{id:'earnings',pay:200,callDate:'10/12/2026'}]);
  let rejected=false,sequence=0,snapshot=JSON.stringify(settings);const messages=[];
  const save=()=>{if(rejected)return false;snapshot=JSON.stringify(settings);return true;};
  const context={money:n=>'$'+Number(n).toFixed(2),convertedAmountText:n=>`≈ L ${(n*Number(settings.exchangeRate)).toFixed(2)}`,parseMoney:Number,higherRateBonusForCalls:()=>0,saveSettingsOnly:save,render(){},escapeHtml:String,iconHtml:()=>'',toast:m=>messages.push(m),appConfirm:(_m,run)=>run(),openModal(){},closeModal(){},makeLocalId:()=>`new-${++sequence}`,renderEmojiPicker(){},usdCeilFromCurrencyAmount:(n,rate)=>Math.ceil(n/rate*100)/100};
  configureFinanceContext(context);
  return {field,expense,second,goal,messages,context,reject:()=>{rejected=true;},allow:()=>{rejected=false;},save,reload:()=>setAppSettings(JSON.parse(snapshot))};
}

test('rejected automatic distribution restores reserves and the prior explanation together',t=>{
 const h=harness(t),report={at:'2026-10-01T00:00:00Z',items:[{id:'old',name:'Previous',amount:2}]};
 settings.financeLastDistribution=report;const before=JSON.stringify(settings);h.reject();
 assert.equal(updateFinanceAutoFillSetting(true),false);assert.equal(JSON.stringify(settings),before);assert.equal(settings.financeLastDistribution,report);
 h.allow();updateFinanceAutoFillSetting(true);assert.equal(settings.financeAutoFill,true);assert.ok(settings.financeLastDistribution.items.length>0);
 assert.equal(settings.financePayments.length,0);assert.equal(calls[0].pay,200);
 h.reload();assert.equal(settings.financeLastDistribution.items[0].name,'Comida');
});

for(const sign of ['plus','minus'])test(`rejected ${sign} reservation restores memory and cannot leak into a later save`,t=>{
  const h=harness(t),before=JSON.stringify(settings);h.reject();
  assert.equal(financeApplySignedAmount('otro','food','5',sign),false);
  assert.equal(JSON.stringify(settings),before);h.allow();h.save();h.reload();assert.equal(JSON.stringify(settings),before);
});

test('rejected automatic allocation restores the checkbox and every affected reserve',t=>{
  const h=harness(t),before=JSON.stringify(settings);h.reject();
  assert.equal(updateFinanceAutoFillSetting(true),false);assert.equal(JSON.stringify(settings),before);
});

test('rejected priority swap and row deletion preserve their queues',t=>{
  const h=harness(t),before=JSON.stringify(settings);h.reject();
  assert.equal(financeSwapPriority('otro','food',1),false);assert.equal(JSON.stringify(settings),before);
  financeDeleteRow('otro','food');assert.equal(JSON.stringify(settings),before);
});

test('rejected category creation cannot leave a hidden category or duplicate on retry',t=>{
  const h=harness(t),before=JSON.stringify(settings);h.field('financeNewCatNameInput').value='Mascotas';h.reject();
  assert.equal(createFinanceCategory(),false);assert.equal(JSON.stringify(settings),before);
  h.allow();createFinanceCategory();assert.equal(settings.customFinanceCategories.length,1);
});

test('rejected category edit or deletion preserves row ownership and custom metadata',t=>{
  const h=harness(t);settings.customFinanceCategories=[{id:'custom_x',label:'Casa propia',emoji:'x',rgb:'102,226,165'}];
  settings.financeCategories.custom_x={rows:[{...h.expense,id:'custom_food',categoryId:'custom_x'}]};
  const before=JSON.stringify(settings);openFinanceNewCatPanel('custom_x');h.field('financeNewCatNameInput').value='Cambiada';h.reject();
  assert.equal(createFinanceCategory(),false);assert.equal(JSON.stringify(settings),before);
  financeDeleteCategory('custom_x');assert.equal(JSON.stringify(settings),before);
});

test('rejected new row and row move restore amounts, categories and allocation cascade',t=>{
  const h=harness(t),before=JSON.stringify(settings);openFinanceRowModal('gasto');h.field('financeRowNameInput').value='Nuevo';h.field('financeRowTargetInput').value='12';h.field('financeRowCategoryInput').value='otro';h.field('financeRowTargetCurrencyInput').value='';h.reject();
  assert.equal(saveFinanceRowModal(),false);assert.equal(JSON.stringify(settings),before);
  openFinanceRowModal('gasto',h.expense);h.field('financeRowNameInput').value='Movido';h.field('financeRowTargetInput').value='5';h.field('financeRowCategoryInput').value='casa';h.field('financeRowTargetCurrencyInput').value='';
  assert.equal(saveFinanceRowModal(),false);assert.equal(JSON.stringify(settings),before);
});

test('expense cap is applied before the available-money guard',t=>{
  const h=harness(t);h.expense.assignedAmount=75;h.second.assignedAmount=40;h.goal.assignedAmount=80;
  financeApplySignedAmount('otro','food','100','plus');assert.equal(h.expense.assignedAmount,80);
  assert.match(h.messages.at(-1),/Solo se asignaron/);
});

test('a completed overfunded savings goal cannot hide the amount needed by another goal',t=>{
  const h=harness(t);h.goal.assignedAmount=150;settings.financeCategories.ahorro.rows.push({...h.goal,id:'second-goal',assignedAmount:20});
  renderFinanceSection();assert.match(h.field('financeMetasTotalRow').innerHTML,/Pendiente de reservar[\s\S]*?\$80\.00/);
});

test('zero-budget legacy rows are omitted from next-priority and earnings preview',t=>{
  const h=harness(t);settings.financeCategories.otro.rows.unshift({id:'zero',name:'Sin presupuesto',categoryId:'otro',kind:'gasto',targetAmount:0,assignedAmount:0,priority:0});
  renderFinanceSection();assert.equal(h.field('financeNextPriorityVal').textContent,'Comida');
  assert.ok(!h.field('financePreviewRows').innerHTML.includes('Sin presupuesto'));
});

test('financial half-cent rounding works beyond amounts close to one dollar',t=>{
  harness(t);
  for(const [raw,expected] of [['10.075',10.08],['1.005',1.01],['139.075',139.08],['10.0749',10.07]])assert.equal(financeInputUsd(raw),expected,raw);
});

test('nonmonthly budgets do not claim monthly overspending or an unpaid monthly bill',t=>{
  const h=harness(t);h.expense.budgetPeriod='fortnightly';
  addFinancePayment('otro','food','80','','2026-10-01');addFinancePayment('otro','food','80','','2026-10-15');
  renderFinanceSection();assert.ok(!h.field('financeGastosList').innerHTML.includes('Presupuesto excedido'));
  const detail=financePlanningRowHtml(h.expense,false);assert.ok(!detail.includes('Exceso sobre el presupuesto'));
  assert.ok(!detail.includes('Pendiente de pagar del presupuesto'));
});

test('new finance targets reject unbounded amounts before changing settings',t=>{
  const h=harness(t),before=JSON.stringify(settings);openFinanceRowModal('gasto');h.field('financeRowNameInput').value='Gigante';h.field('financeRowTargetInput').value='1e308';h.field('financeRowTargetCurrencyInput').value='';
  saveFinanceRowModal();assert.equal(JSON.stringify(settings),before);
});

test('backup finance validation preserves legacy rows and orphan payments but rejects corrupt or ambiguous money',t=>{
  const h=harness(t),base=JSON.parse(JSON.stringify(settings));
  assert.equal(validFinanceSettings(base),true);assert.equal(validFinanceSettings({}),true);
  delete base.financeCategories.otro.rows[0].assignedAmount;delete base.financeCategories.otro.rows[0].categoryId;
  base.financePayments=[{id:'old',rowId:'deleted',name:'Eliminado',date:'2026-10-01',usd:10,expenseType:'fixed'}];
  assert.equal(validFinanceSettings(base),true);
  for(const mutate of [
    cfg=>cfg.financeCategories.otro.rows.push({...cfg.financeCategories.otro.rows[0]}),
    cfg=>cfg.financeCategories.otro.rows[0].assignedAmount=-10,
    cfg=>cfg.financeCategories.otro.rows[0].assignedAmount='Infinity',
    cfg=>cfg.financeCategories.otro.rows[0].targetAmount='1e308',
    cfg=>cfg.financePayments.push({...cfg.financePayments[0]}),
    cfg=>cfg.financePayments[0].date='2026-02-30',
    cfg=>cfg.financePayments[0].usd=-1,
    cfg=>cfg.customFinanceCategories=[{id:'otro',label:'Otro duplicado'}],
    cfg=>cfg.customFinanceCategories=[{id:'__proto__',label:'Insegura'}],
    cfg=>cfg.financePlanning={split:[50,50,50]},
  ]){const config=structuredClone(base);mutate(config);assert.equal(validFinanceSettings(config),false);}
  assert.equal(h.expense.assignedAmount,30);
});

test('a rejected finance mutation never restores its snapshot into a different settings owner',t=>{
  const h=harness(t),winner={winner:true};configureFinanceContext({...h.context,saveSettingsOnly(){setAppSettings(winner);return false;}});
  assert.equal(financeApplySignedAmount('otro','food','5','plus'),false);assert.equal(settings,winner);
});

test('failed finance plan does not replace a settings or state winner during the save callback',t=>{
  const h=harness(t);for(const [id,value] of Object.entries({financePlanHoursInput:7,financePlanDaysInput:5,financePlanFixedInput:50,financePlanVariableInput:30,financePlanSavingsInput:20}))h.field(id).value=String(value);
  const winnerSettings={winner:true},winnerState={winner:true};
  configureFinanceContext({...h.context,todayCallDateKey:()=> '10/12/2026',applyGoalValues(){setAppSettings(winnerSettings);setAppState(winnerState);return false;}});
  assert.equal(saveFinancePlan(),false);assert.equal(settings,winnerSettings);assert.equal(state,winnerState);
});

test('rejected currency settings preserve conversion and its form fields',t=>{
  const h=harness(t);configureSettingsContext({...h.context,saveSettingsOnly:()=>false});h.field('exchangeRateInput').value='20';h.field('currencyLabelInput').value='MX$';
  const before=JSON.stringify(settings);assert.equal(updateCurrencySettings(),false);assert.equal(JSON.stringify(settings),before);
  assert.equal(h.field('exchangeRateInput').value,'26.8');assert.equal(h.field('currencyLabelInput').value,'L');
});

test('rate changes use a single complete snapshot and a rejected save restores state and planning history',t=>{
  const h=harness(t);state.earningsGoal=43.2;settings.earningsGoal=43.2;let complete=0,partial=0;
  configureSettingsContext({...h.context,RATE:.12,saveAll(){complete++;return false;},saveStateOnly(){partial++;return true;},snapshotHistoricalPlanning(){settings.goalHistoryByDay={'10/01/2026':{min:360}};}});
  h.field('rateInput').value='.2';const before=JSON.stringify({settings,state,calls});
  assert.equal(updateRate(),false);assert.equal(complete,1);assert.equal(partial,0);assert.equal(JSON.stringify({settings,state,calls}),before);assert.equal(h.field('rateInput').value,'0.12');
});

test('optional savings estimates can be removed without changing the reserved money',t=>{
  const h=harness(t);h.goal.savingsMonths=12;
  assert.equal(saveFinanceSavingsMonths('ahorro','goal',''),true);assert.equal(h.goal.savingsMonths,undefined);assert.equal(h.goal.assignedAmount,10);
  h.goal.savingsMonths=6;h.reject();assert.equal(saveFinanceSavingsMonths('ahorro','goal',''),false);assert.equal(h.goal.savingsMonths,6);
  assert.equal(saveFinanceSavingsMonths('ahorro','goal',0),false);
});

test('an orphan category remains visible and reachable rather than consuming invisible available money',t=>{
  const h=harness(t);settings.financeCategories.legacy={rows:[{...h.expense,id:'orphan',categoryId:'legacy',name:'Gasto anterior'}]};
  renderFinanceSection();assert.match(h.field('financeGastosList').innerHTML,/Gasto anterior/);
  financeApplySignedAmount('legacy','orphan',1,'minus');assert.equal(settings.financeCategories.legacy.rows[0].assignedAmount,29);
});

test('35 days across two months agree with an independent cent ledger after earnings, payments, corrections and reloads',t=>{
  const previousTimezone=process.env.TZ;process.env.TZ='America/Tegucigalpa';
  t.after(()=>{if(previousTimezone===undefined)delete process.env.TZ;else process.env.TZ=previousTimezone;});
  const h=harness(t);
  const accounts=[
    {id:'food',budget:2000,held:0,kind:'gasto',priority:1,excluded:false},
    {id:'rent',budget:5000,held:0,kind:'gasto',priority:2,excluded:false},
    {id:'excluded',budget:1000,held:0,kind:'gasto',priority:3,excluded:true},
    {id:'goal',budget:10000,held:0,kind:'meta',priority:1,excluded:false},
    {id:'goal2',budget:6000,held:0,kind:'meta',priority:2,excluded:false},
  ];
  settings.financeCategories={otro:{rows:accounts.filter(a=>a.kind==='gasto').map(a=>({id:a.id,name:a.id,kind:a.kind,categoryId:'otro',targetAmount:a.budget/100,assignedAmount:0,priority:a.priority,recurring:true,manualPaid:a.excluded,budgetPeriod:a.id==='food'?'fortnightly':'monthly'}))},ahorro:{rows:accounts.filter(a=>a.kind==='meta').map(a=>({id:a.id,name:a.id,kind:a.kind,categoryId:'ahorro',targetAmount:a.budget/100,assignedAmount:0,priority:a.priority}))}};
  settings.financeAutoFill=true;settings.higherRateWindows=[];setAppCalls([]);
  configureHigherRateContext({HIGHER_RATE_TIERS:{gold:{bonusPerMin:.03}},HIGHER_RATE_EARLY_GRACE_MIN:5,toDateFromInputs:(date,clock)=>new Date(`${date}T${clock}:00`),toMinutes:clock=>Number(clock.slice(0,2))*60+Number(clock.slice(3)),formatHHMM:v=>v,timeLabel:v=>v});
  configureFinanceContext({...h.context,higherRateBonusForCalls});
  const income=new Map(),spending=new Map();let automatic=true;
  const row=id=>Object.values(settings.financeCategories).flatMap(c=>c.rows).find(r=>r.id===id);
  const account=id=>accounts.find(a=>a.id===id);
  const queue=()=>accounts.slice().sort((a,b)=>(a.kind==='gasto'?0:1)-(b.kind==='gasto'?0:1)||a.priority-b.priority);
  const earned=()=>[...income.values()].reduce((total,i)=>total+i.base+i.bonus,0);
  const held=()=>accounts.reduce((total,a)=>total+a.held,0);
  const reconcile=()=>{
    let oversubscribed=Math.max(0,held()-earned());
    for(const a of queue().reverse()){const reclaimed=Math.min(a.held,oversubscribed);a.held-=reclaimed;oversubscribed-=reclaimed;}
    if(!automatic)return;
    let pool=earned()-held();
    for(const a of queue()){if(a.kind==='gasto'&&a.excluded)continue;const transfer=Math.min(pool,Math.max(0,a.budget-a.held));a.held+=transfer;pool-=transfer;}
  };
  const verify=day=>{
    assert.ok(held()<=earned(),`day ${day}: money conservation`);
    for(const a of accounts)assert.ok(Math.abs(row(a.id).assignedAmount*100-a.held)<1e-6,`day ${day}, ${a.id}`);
    for(const month of ['2026-10','2026-11']){
      const expected=[...spending.values()].filter(p=>p.date.startsWith(month));
      const paidCents=expected.reduce((sum,p)=>sum+p.cents,0);
      assert.ok(Math.abs(financeMonthTotals(accounts.filter(a=>a.kind==='gasto').map(a=>row(a.id)),settings.financePayments,month).paid*100-paidCents)<1e-6,`day ${day}, month ${month}`);
      for(const a of accounts.filter(a=>a.kind==='gasto'))assert.ok(Math.abs(financeExpenseStatus(row(a.id),settings.financePayments,month).paid*100-expected.filter(p=>p.rowId===a.id).reduce((s,p)=>s+p.cents,0))<1e-6);
    }
  };
  for(let day=1;day<=35;day++){
    if(day===26){updateFinanceAutoFillSetting(false);automatic=false;}
    const date=new Date(2026,9,day),iso=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    const base=350+(day*137)%500,minutes=10+day%10,id=`call-${day}`;
    income.set(id,{base,bonus:minutes*3});settings.higherRateWindows.push({id:`hr-${day}`,date:iso,start:'08:00',end:'10:00',tier:'gold'});
    calls.push({id,pay:(base/100).toFixed(2),durationMin:minutes,startISO:new Date(`${iso}T08:30:00`).toISOString(),callDate:`${String(date.getMonth()+1).padStart(2,'0')}/${String(date.getDate()).padStart(2,'0')}/${date.getFullYear()}`});
    financeRunAutoFillCascade();reconcile();
    const paymentRow=day%2?'food':'rent',paymentCents=125+day%7*25;
    settings.exchangeRate=day%3===0?20:26.8;
    assert.equal(addFinancePayment('otro',paymentRow,day%2?(paymentCents/100).toFixed(2):'',day%2?'':(paymentCents/100*settings.exchangeRate).toFixed(2),iso),true);
    const receipt=settings.financePayments.at(-1);spending.set(receipt.id,{rowId:paymentRow,date:iso,cents:paymentCents});
    if(day===7){financeApplySignedAmount('otro','food','3','minus');account('food').held-=300;}
    if(day===10){calls.find(c=>c.id==='call-1').pay='0.00';income.get('call-1').base=0;financeRunAutoFillCascade();reconcile();}
    if(day===15){setAppCalls(calls.filter(c=>c.id!=='call-2'));income.delete('call-2');financeRunAutoFillCascade();reconcile();}
    if(day===17){financeSwapPriority('otro','food',1);[account('food').priority,account('rent').priority]=[account('rent').priority,account('food').priority];}
    if(day===20){const deleted=settings.financePayments[2].id;deleteFinancePayment(deleted);deleteFinancePayment(deleted);spending.delete(deleted);}
    if(day===21){financeResetRow('otro','food');account('food').held=0;}
    if(day===23){financeToggleManualPaid('otro','food',true);account('food').excluded=true;financeApplySignedAmount('otro','food',1,'minus');account('food').held-=100;}
    if(day===26){financeApplySignedAmount('ahorro','goal2',2,'plus');account('goal2').held+=200;}
    if(day===30){automatic=true;updateFinanceAutoFillSetting(true);reconcile();}
    if(day===32){openFinanceRowModal('meta',row('goal'));h.field('financeRowTargetInput').value='80';h.field('financeRowTargetCurrencyInput').value='';saveFinanceRowModal();account('goal').budget=8000;reconcile();}
    if(day===34){h.field('financeNewCatNameInput').value='Temporal';createFinanceCategory();const cat=settings.customFinanceCategories.at(-1).id;openFinanceRowModal('meta',row('goal2'));h.field('financeRowCategoryInput').value=cat;h.field('financeRowTargetCurrencyInput').value='';saveFinanceRowModal();reconcile();financeDeleteCategory(cat);}
    verify(day);
    h.save();const persisted=JSON.stringify({settings,calls,state});const restored=JSON.parse(persisted);setAppSettings(restored.settings);setAppCalls(restored.calls);setAppState(restored.state);verify(day);
    financeRunAutoFillCascade();reconcile();verify(day);
    const unchanged=JSON.stringify({settings,calls});financeRunAutoFillCascade();reconcile();verify(day);
    assert.equal(JSON.stringify({settings,calls}),unchanged,`day ${day}: repeated cascade is idempotent`);
  }
  assert.equal(income.size,34);assert.equal(spending.size,34);
});

test('floating-point residue never renders a negative zero available balance',t=>{
  const h=harness(t);h.expense.assignedAmount=.1;h.second.assignedAmount=.2;h.goal.assignedAmount=0;setAppCalls([{pay:.3}]);
  renderFinanceSection();assert.equal(h.field('financeAvailableAmt').textContent,'$0.00');
});

test('confirmed category deletion moves the latest rows and cannot resurrect an older snapshot',t=>{
  const h=harness(t);let confirm;
  settings.customFinanceCategories=[{id:'custom_x',label:'Actual',emoji:'x',rgb:'102,226,165'}];
  settings.financeCategories.custom_x={rows:[{...h.expense,id:'old',categoryId:'custom_x'}]};
  configureFinanceContext({...h.context,appConfirm:(_m,callback)=>{confirm=callback;}});financeDeleteCategory('custom_x');
  settings.financeCategories.custom_x.rows=[{...h.expense,id:'latest',categoryId:'custom_x',assignedAmount:5}];
  confirm();assert.ok(!settings.financeCategories.otro.rows.some(r=>r.id==='old'));assert.equal(settings.financeCategories.otro.rows.find(r=>r.id==='latest').assignedAmount,5);
});

test('confirmed deletion still finds a row moved between categories while confirmation was open',t=>{
  const h=harness(t);let confirm;configureFinanceContext({...h.context,appConfirm:(_m,callback)=>{confirm=callback;}});financeDeleteRow('otro','food');
  settings.financeCategories.otro.rows=settings.financeCategories.otro.rows.filter(r=>r.id!=='food');h.expense.categoryId='casa';settings.financeCategories.casa.rows.push(h.expense);
  confirm();assert.ok(!Object.values(settings.financeCategories).flatMap(c=>c.rows).some(r=>r.id==='food'));
});

test('a payment removed during confirmation is harmless and does not recreate a ledger',t=>{
  const h=harness(t);addFinancePayment('otro','food','10','','2026-10-12');const id=settings.financePayments[0].id;let confirm;
  configureFinanceContext({...h.context,appConfirm:(_m,callback)=>{confirm=callback;}});deleteFinancePayment(id);delete settings.financePayments;
  assert.doesNotThrow(()=>confirm());assert.equal(settings.financePayments,undefined);
});

test('overflowing exchange rates are rejected before they can produce infinite equivalents',t=>{
  const h=harness(t);configureSettingsContext({...h.context});h.field('exchangeRateInput').value='1e308';h.field('currencyLabelInput').value='BAD';
  const before=JSON.stringify(settings);assert.equal(updateCurrencySettings(),false);assert.equal(JSON.stringify(settings),before);
  assert.equal(validFinanceSettings({...settings,exchangeRate:1e308}),false);
  assert.equal(h.field('exchangeRateInput').value,'26.8');
});

test('legacy frozen bonus amounts are numeric and cannot concatenate fictitious finance earnings',t=>{
  const h=harness(t);configureHigherRateContext({HIGHER_RATE_TIERS:{gold:{bonusPerMin:.03}}});
  const source=[{pay:10,frozenHigherRateBonus:{tier:'legacy',amount:'2.50'}},{pay:10,frozenHigherRateBonus:{tier:'legacy',amount:'2.50'}}];
  assert.equal(higherRateBonusForCalls(source),5);
  setAppCalls(source);configureFinanceContext({...h.context,higherRateBonusForCalls});renderFinanceSection();assert.equal(h.field('financeAvailableAmt').textContent,'$-25.00');
});

test('corrupt frozen bonuses cannot create NaN, infinite or negative finance adjustments',t=>{
  harness(t);configureHigherRateContext({HIGHER_RATE_TIERS:{gold:{bonusPerMin:.03}}});
  for(const amount of ['garbage','Infinity',Infinity,-50,true,[10]])assert.equal(higherRateBonusForCalls([{frozenHigherRateBonus:{tier:'legacy',amount}}]),0);
  for(const durationMin of [-10,Infinity,NaN,true,[10]])assert.equal(higherRateBonusForCalls([{durationMin,frozenHigherRateBonus:{tier:'gold',amount:1}}]),0);
});

test('rejected payment creation never restores an older ledger into a replacement settings owner',t=>{
  const h=harness(t),winner={financePayments:[{id:'winner'}]};configureFinanceContext({...h.context,saveSettingsOnly(){setAppSettings(winner);return false;}});
  assert.equal(addFinancePayment('otro','food','10','','2026-10-12'),false);assert.equal(settings,winner);assert.deepEqual(settings.financePayments,[{id:'winner'}]);
});

test('rejected payment deletion never restores an older ledger into a replacement settings owner',t=>{
  const h=harness(t);addFinancePayment('otro','food','10','','2026-10-12');const id=settings.financePayments[0].id,winner={financePayments:[{id:'winner'}]};
  configureFinanceContext({...h.context,saveSettingsOnly(){setAppSettings(winner);return false;}});deleteFinancePayment(id);
  assert.equal(settings,winner);assert.deepEqual(settings.financePayments,[{id:'winner'}]);
});

test('rendering a supported finance history validates dates once per frame instead of once per row',t=>{
  const h=harness(t),NativeDate=globalThis.Date,now=new NativeDate(),month=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  settings.financeCategories.otro.rows=Array.from({length:40},(_,id)=>({...h.expense,id:`expense-${id}`,name:`Gasto ${id}`,priority:id+1}));
  settings.financePayments=Array.from({length:400},(_,id)=>({id:`payment-${id}`,rowId:`expense-${id%40}`,name:'Pago',date:`${month}-01`,expenseType:'fixed',usd:1}));
  let dates=0;globalThis.Date=class extends NativeDate{constructor(...args){super(...args);dates++;}};
  t.after(()=>{globalThis.Date=NativeDate;});
  renderFinanceSection();assert.ok(dates<5000,`${dates} Date constructions`);
  t.diagnostic(`${dates} Date constructions for 40 rows and 400 payments`);
  assert.equal((h.field('financeGastosList').innerHTML.match(/data-fin-row=/g)||[]).length,40);
});

test('monthly render data refreshes after in-place payment correction and budget-period changes',t=>{
  const h=harness(t),now=new Date(),month=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  addFinancePayment('otro','food','10','',`${month}-01`);renderFinanceSection();
  settings.financePayments[0].usd=90;h.expense.budgetPeriod='fortnightly';renderFinanceSection();
  const html=h.field('financeGastosList').innerHTML;
  assert.match(html,/Pagado en el mes elegido[\s\S]*?\$90\.00/);assert.ok(!html.includes('Presupuesto excedido'));
  settings.financePayments[0].usd=0;renderFinanceSection();assert.match(h.field('financeGastosList').innerHTML,/Pagado en el mes elegido[\s\S]*?\$0\.00/);
});

test('currency input formatting preserves dollar cents for tiny rates and expands exponent notation',t=>{
  harness(t);
  for(const rate of [.005,.000015,1e-30,1e20]){
    settings.exchangeRate=rate;
    const local=financeInputValue(10*rate);
    assert.ok(!local.includes('e'),local);assert.equal(financeInputUsd(local,'local'),10);
  }
  assert.equal(financeInputValue(1e21),'1000000000000000000000.00');
  assert.equal(financeInputValue(1.05*26.8),'28.14');
});

test('assigning the displayed available cents conserves fractional bonus income instead of rejecting or inventing money',t=>{
  const h=harness(t);h.expense.assignedAmount=0;h.second.assignedAmount=0;h.goal.assignedAmount=0;setAppCalls([{pay:1.00524}]);
  financeApplySignedAmount('otro','food','1.01','plus');assert.equal(h.expense.assignedAmount,1.00524);
  assert.ok(h.expense.assignedAmount<=Number(calls[0].pay));assert.match(h.messages.at(-1),/Reservaste \$1.01.*Comida.*No es un pago/);
});

test('new budgets use cents and reject subcent targets while unchanged legacy precision survives an edit',t=>{
  const h=harness(t);openFinanceRowModal('gasto');h.field('financeRowNameInput').value='Nuevo';h.field('financeRowTargetInput').value='1.005';h.field('financeRowTargetCurrencyInput').value='';saveFinanceRowModal();
  assert.equal(settings.financeCategories.casa.rows[0].targetAmount,1.01);
  openFinanceRowModal('gasto');h.field('financeRowNameInput').value='Subcentavo';h.field('financeRowTargetInput').value='.003';h.field('financeRowTargetCurrencyInput').value='';saveFinanceRowModal();assert.equal(settings.financeCategories.casa.rows.length,1);
  h.expense.targetAmount=.003;h.expense.assignedAmount=.003;openFinanceRowModal('gasto',h.expense);h.field('financeRowNameInput').value='Nombre editado';saveFinanceRowModal();assert.equal(h.expense.targetAmount,.003);
});

for (const action of ['delete-row','delete-category','edit-row','new-row','edit-category','new-category']) {
  test(`audit2 finance ${action} cannot cross a replaced settings owner`, t=>{
    const h=harness(t);let confirm;
    settings.customFinanceCategories=[{id:'custom_x',label:'Casa propia',emoji:'x',rgb:'102,226,165'}];
    settings.financeCategories.custom_x={rows:[]};
    configureFinanceContext({...h.context,appConfirm:(_message,run)=>{confirm=run;}});
    if(action==='delete-row')financeDeleteRow('otro','food');
    if(action==='delete-category')financeDeleteCategory('custom_x');
    if(action==='edit-row'||action==='new-row'){
      openFinanceRowModal('gasto',action==='edit-row'?h.expense:null);
      h.field('financeRowNameInput').value='Borrador anterior';h.field('financeRowTargetInput').value='12';h.field('financeRowTargetCurrencyInput').value='';
    }
    if(action==='edit-category'||action==='new-category'){
      openFinanceNewCatPanel(action==='edit-category'?'custom_x':null);h.field('financeNewCatNameInput').value='Borrador anterior';
    }
    setAppSettings(JSON.parse(JSON.stringify(settings)));const before=JSON.stringify(settings);
    if(confirm)confirm();else if(action.endsWith('row'))saveFinanceRowModal();else createFinanceCategory();
    assert.equal(JSON.stringify(settings),before);
  });
}

for(const action of ['delete-row','delete-category','edit-row','edit-category'])test(`audit2 finance ${action} refuses a changed target`,t=>{
  const h=harness(t);let confirm;
  settings.customFinanceCategories=[{id:'custom_x',label:'Casa propia',emoji:'x',rgb:'102,226,165'}];settings.financeCategories.custom_x={rows:[]};
  configureFinanceContext({...h.context,appConfirm:(_message,run)=>{confirm=run;}});
  if(action==='delete-row')financeDeleteRow('otro','food');
  if(action==='delete-category')financeDeleteCategory('custom_x');
  if(action==='edit-row'){openFinanceRowModal('gasto',h.expense);h.field('financeRowNameInput').value='Borrador';h.field('financeRowTargetCurrencyInput').value='';}
  if(action==='edit-category'){openFinanceNewCatPanel('custom_x');h.field('financeNewCatNameInput').value='Borrador';}
  if(action.endsWith('row'))h.expense.name='Cambio sincronizado';else settings.customFinanceCategories[0].label='Cambio sincronizado';
  const before=JSON.stringify(settings);
  if(confirm)confirm();else if(action==='edit-row')saveFinanceRowModal();else createFinanceCategory();
  assert.equal(JSON.stringify(settings),before);
});

test('audit2 finance successful new-row modal cannot replay a second insert',t=>{
 const h=harness(t);openFinanceRowModal('gasto');h.field('financeRowNameInput').value='Solo una';h.field('financeRowTargetInput').value='12';h.field('financeRowTargetCurrencyInput').value='';
 saveFinanceRowModal();const before=JSON.stringify(settings);saveFinanceRowModal();assert.equal(JSON.stringify(settings),before);
});

test('audit2 finance thrown writer restores the adjustment and permits a clean retry',t=>{
 const h=harness(t),before=JSON.stringify(settings);configureFinanceContext({...h.context,saveSettingsOnly:()=>{throw Error('disk interrupted');}});
 assert.equal(financeApplySignedAmount('otro','food','5','plus'),false);assert.equal(JSON.stringify(settings),before);
 configureFinanceContext(h.context);h.save();h.reload();assert.equal(JSON.stringify(settings),before);
});
