import test from 'node:test';
import assert from 'node:assert/strict';
import { setAppSettings, setAppState, setAppCalls, settings, state, calls } from '../js/app-context.js';
import { setLanguage } from '../js/i18n.js';
import { configureFinanceContext, financeResetRow, financeRunAutoFillCascade } from '../js/finance.js';
import { configureSettingsContext, applyGoalValues } from '../js/settings.js';
import { financePlanProjection, financeMonthTotals, financePaymentRows, validFinanceDate, financeSavingsMonthly } from '../js/finance-plan-model.js';
import { addFinancePayment, deleteFinancePayment, saveFinancePlan, saveFinanceSavingsMonths, financePlanningRowHtml } from '../js/finance-planning.js';

function harness(t) {
  setLanguage('es');
  const previous = globalThis.document;
  const inputs = new Map();
  const input = id => { if (!inputs.has(id)) inputs.set(id, {value:'',style:{},textContent:'',innerHTML:'',hidden:false,disabled:false}); return inputs.get(id); };
  globalThis.document = { getElementById:input, querySelectorAll:()=>[] };
  t.after(()=>{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;});
  const expense = {id:'food',name:'Comida <img onerror=x>',categoryId:'otro',kind:'gasto',expenseType:'variable',targetAmount:120,assignedAmount:60,priority:1,recurring:true};
  const meta = {id:'goal',name:'Ahorro',categoryId:'otro',kind:'meta',targetAmount:300,assignedAmount:20,priority:1};
  setAppSettings({rate:.12,productiveGoalMin:360,earningsGoal:43.2,currencyLabel:'L',exchangeRate:26.8,financeCategories:{otro:{rows:[expense,meta]}},customFinanceCategories:[],financeAutoFill:false,dailyGoalOverrides:{'10/11/2026':{min:100,usd:12}},goalHistoryByDay:{'10/10/2026':{min:360,usd:43.2}}});
  setAppState({productiveGoalMin:360,earningsGoal:43.2,activeDayKey:'10/10/2026'});
  setAppCalls([{id:'kept',durationMin:20,pay:100,callDate:'10/10/2026'}]);
  let sequence=0,reject=false,persisted,saves=0;
  const save=()=>{if(reject)return false;saves++;persisted=JSON.stringify({settings,state,calls});return true;};
  const context={money:n=>'$'+n.toFixed(2),convertedAmountText:n=>`≈ ${settings.currencyLabel} ${(n*settings.exchangeRate).toFixed(2)}`,escapeHtml:s=>String(s).replaceAll('<','&lt;'),iconHtml:()=>'',toast(){},appConfirm:(_m,run)=>run(),render(){},saveSettingsOnly:save,saveAll:save,makeLocalId:()=>`payment-${++sequence}`,parseMoney:Number,higherRateBonusForCalls:()=>0,applyGoalValues,todayCallDateKey:()=> '10/11/2026'};
  configureFinanceContext(context);
  configureSettingsContext({...context,RATE:.12,saveStateOnly:save,getActiveDayKey:()=>state.activeDayKey,
    snapshotHistoricalPlanning(){settings.goalHistoryByDay['10/10/2026']={min:settings.productiveGoalMin,usd:settings.earningsGoal};},
    setDailyGoalOverride(day,value){if(value)settings.dailyGoalOverrides[day]=value;else delete settings.dailyGoalOverrides[day];},
    onGameDayMetadataChanged(){},effectiveDailyGoal:day=>settings.goalHistoryByDay[day]||{min:settings.productiveGoalMin,usd:settings.earningsGoal},formatMinutes:String,currencyCeilFromUsdAmount:(n,fx)=>n*fx});
  for(const [id,value] of Object.entries({financePlanHoursInput:'7',financePlanDaysInput:'5',financePlanFixedInput:'60',financePlanVariableInput:'25',financePlanSavingsInput:'15'}))input(id).value=value;
  return {expense,meta,input,reject:()=>{reject=true;},saves:()=>saves,reload(){const snapshot=JSON.parse(persisted);setAppSettings(snapshot.settings);setAppState(snapshot.state);setAppCalls(snapshot.calls);}};
}

test('projections use chosen hours and settings rate; split must sum exactly 100',()=>{
  const p=financePlanProjection(7,5,.12,[60,25,15]);
  assert.equal(p.minutes,420);assert.equal(p.dollars,50.4);assert.equal(p.projected,1008);
  assert.deepEqual(p.distribution,[604.8,252,151.2]);
  for(const args of [[25,5,.12,[50,30,20]],[6,1.5,.12,[50,30,20]],[6,5,Infinity,[50,30,20]],[6,5,.12,[60,30,20]],[6,5,.12,[-10,90,20]],[6,5,.12,[50,30,NaN]]])assert.equal(financePlanProjection(...args),null);
});

test('saving a finance plan updates the global and today goal in one snapshot, keeping old calls, schedules and historical goals',t=>{
  const h=harness(t);settings.weeklySchedule={mon:{start:'06:00',end:'14:00',blocks:[{goalMin:60}]}};
  const before=JSON.stringify({calls,schedule:settings.weeklySchedule,rows:settings.financeCategories});
  assert.equal(saveFinancePlan(),true);assert.equal(h.saves(),1);
  assert.equal(settings.productiveGoalMin,420);assert.equal(state.productiveGoalMin,420);assert.equal(settings.earningsGoal,50.4);
  assert.deepEqual(settings.financePlanning,{daysPerWeek:5,split:[60,25,15]});
  assert.deepEqual(settings.goalHistoryByDay['10/10/2026'],{min:360,usd:43.2});assert.equal(settings.dailyGoalOverrides['10/11/2026'],undefined);
  assert.equal(JSON.stringify({calls,schedule:settings.weeklySchedule,rows:settings.financeCategories}),before);
  h.reload();assert.equal(settings.productiveGoalMin,420);assert.equal(settings.financePlanning.split[0],60);
});

test('failed plan persistence rolls back the goal, settings, today exception and state',t=>{
  const h=harness(t),before=JSON.stringify({settings,state,calls});h.reject();
  assert.equal(saveFinancePlan(),false);assert.equal(JSON.stringify({settings,state,calls}),before);assert.equal(h.saves(),0);
});

test('invalid distribution cannot save goals or assignments',t=>{
  const h=harness(t),before=JSON.stringify(settings);h.input('financePlanSavingsInput').value='20';
  assert.equal(saveFinancePlan(),false);assert.equal(JSON.stringify(settings),before);assert.equal(h.saves(),0);
});

test('blank plan fields are rejected while an explicit zero-hour goal is valid',t=>{
  const h=harness(t);h.input('financePlanHoursInput').value='';assert.equal(saveFinancePlan(),false);assert.equal(settings.productiveGoalMin,360);
  h.input('financePlanHoursInput').value='0';assert.equal(saveFinancePlan(),true);assert.equal(settings.productiveGoalMin,0);
});

test('removing an erroneous payment changes spending only and survives reload',t=>{
  const h=harness(t);addFinancePayment('otro','food','10','','2026-10-11');const before=JSON.stringify({rows:settings.financeCategories,calls});
  deleteFinancePayment(settings.financePayments[0].id);assert.equal(settings.financePayments.length,0);assert.equal(JSON.stringify({rows:settings.financeCategories,calls}),before);
  h.reload();assert.equal(settings.financePayments.length,0);
});

test('payments store USD with a date and do not change existing allocations, earnings or goals',t=>{
  const h=harness(t),before=JSON.stringify({rows:settings.financeCategories,calls,goal:settings.productiveGoalMin});
  assert.equal(addFinancePayment('otro','food','10','','2026-10-11'),true);
  assert.equal(addFinancePayment('otro','food','','268','2026-10-12'),true);
  assert.deepEqual(settings.financePayments.map(p=>p.usd),[10,10]);
  assert.equal(JSON.stringify({rows:settings.financeCategories,calls,goal:settings.productiveGoalMin}),before);
  h.reload();assert.equal(financeMonthTotals(settings.financeCategories.otro.rows.filter(r=>r.kind==='gasto'),settings.financePayments,'2026-10').paid,20);
});

test('changing local currency or rate never reprices existing USD payments',t=>{
  harness(t);addFinancePayment('otro','food','','268','2026-10-11');
  settings.currencyLabel='MX$';settings.exchangeRate=20;
  assert.equal(settings.financePayments[0].usd,10);assert.equal(addFinancePayment('otro','food','','200','2026-10-12'),true);
  assert.deepEqual(settings.financePayments.map(p=>p.usd),[10,10]);
});

test('resetting an expense, editing or deleting its row does not erase monthly payment history',t=>{
  const h=harness(t);addFinancePayment('otro','food','40','','2026-10-11');
  financeResetRow('otro','food');assert.equal(h.expense.assignedAmount,0);assert.equal(settings.financePayments[0].usd,40);
  h.expense.name='Renamed';h.expense.expenseType='fixed';settings.financeCategories.otro.rows=[h.meta];
  const totals=financeMonthTotals([],settings.financePayments,'2026-10');assert.equal(totals.paid,40);assert.equal(totals.variable,40);assert.equal(settings.financePayments[0].name,'Comida <img onerror=x>');
});

test('invalid payment dates, hostile imports, repeated ids, zero amounts and savings rows cannot create fictitious spending',t=>{
  const h=harness(t);
  for(const [row,amount,date] of [['food','0','2026-10-11'],['food','Infinity','2026-10-11'],['food','10','2026-02-30'],['goal','10','2026-10-11']])assert.equal(addFinancePayment('otro',row,amount,'',date),false);
  assert.equal(settings.financePayments,undefined);
  addFinancePayment('otro','food','10','','2026-10-11');
  settings.financePayments.push({...settings.financePayments[0]},{...settings.financePayments[0],id:'bad',usd:Infinity});
  assert.equal(financePaymentRows(settings.financePayments,'2026-10').length,1);
  assert.equal(financeMonthTotals([h.expense],settings.financePayments,'2026-11').paid,0);
  assert.equal(validFinanceDate('2026-02-30'),false);assert.equal(validFinanceDate('2024-02-29'),true);
});

test('failed payment or savings persistence and removal leave the previous data intact',t=>{
  const h=harness(t);addFinancePayment('otro','food','10','','2026-10-11');const before=JSON.stringify(settings);h.reject();
  assert.equal(addFinancePayment('otro','food','25','','2026-10-12'),false);deleteFinancePayment(settings.financePayments[0].id);
  assert.equal(saveFinanceSavingsMonths('otro','goal',12),false);assert.equal(JSON.stringify(settings),before);
});

test('unset or invalid savings deadlines have no invented contribution or prefilled term', t => {
  const h = harness(t);
  for (const value of [undefined, null, '', 0, -1, 1.5, 121, Infinity]) {
    h.meta.savingsMonths = value;
    assert.deepEqual(financeSavingsMonthly(h.meta), { months: null, monthly: null });
    const html = financePlanningRowHtml(h.meta, true);
    assert.match(html, /value="" data-fin-savings-months/);
    assert.doesNotMatch(html, /Aporte mensual orientativo/);
  }
});

test('savings deadlines are optional and manual; setting one does not change existing savings or priorities',t=>{
  const h=harness(t),before=JSON.stringify({assigned:h.meta.assignedAmount,priority:h.meta.priority,target:h.meta.targetAmount});
  assert.equal(saveFinanceSavingsMonths('otro','goal',12),true);
  assert.equal(JSON.stringify({assigned:h.meta.assignedAmount,priority:h.meta.priority,target:h.meta.targetAmount}),before);
  assert.deepEqual(financeSavingsMonthly(h.meta),{months:12,monthly:280/12});assert.equal(saveFinanceSavingsMonths('otro','goal',0),false);
});

test('old finance rows load without payments and retain the existing automatic expense-first cascade',t=>{
  const h=harness(t);settings.financeAutoFill=true;financeRunAutoFillCascade();
  assert.equal(h.expense.assignedAmount,80);assert.equal(h.meta.assignedAmount,20);
  assert.equal(settings.financePayments,undefined);assert.deepEqual(financeMonthTotals([h.expense],null,'2026-10'),{budget:120,paid:0,difference:120,fixed:0,variable:0});
});
