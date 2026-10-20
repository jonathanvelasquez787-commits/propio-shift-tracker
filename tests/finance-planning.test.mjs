import test from 'node:test';
import assert from 'node:assert/strict';
import { setAppSettings, setAppState, setAppCalls, settings, state, calls } from '../js/app-context.js';
import { setLanguage } from '../js/i18n.js';
import { configureFinanceContext, financeResetRow, financeRunAutoFillCascade } from '../js/finance.js';
import { configureSettingsContext, applyGoalValues } from '../js/settings.js';
import { financePlanProjection, financeMonthTotals, financePaymentRows, validFinanceDate, financeSavingsMonthly, financeExpenseStatus, financeBudgetPeriod } from '../js/finance-plan-model.js';
import { addFinancePayment, deleteFinancePayment, saveFinancePlan, saveFinanceSavingsMonths, financePlanningRowHtml, renderFinancePlanning, financeSelectedMonth, financeInputUsd } from '../js/finance-planning.js';

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
  assert.equal(settings.goalProvenance.source,'finance');
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

test('saving a distribution without editing hours preserves an existing fractional-minute goal exactly', t => {
  const h = harness(t);
  settings.productiveGoalMin = 250.7;
  settings.earningsGoal = 30.084;
  state.productiveGoalMin = 250.7;
  renderFinancePlanning();
  h.input('financePlanFixedInput').value = '60';
  h.input('financePlanVariableInput').value = '25';
  h.input('financePlanSavingsInput').value = '15';
  assert.equal(saveFinancePlan(), true);
  assert.equal(settings.productiveGoalMin, 250.7);
  assert.ok(Math.abs(settings.earningsGoal - 30.084) < 1e-12);
  h.reload();
  assert.equal(settings.productiveGoalMin, 250.7);
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

test('expense payment status follows the ledger independently of its reserved amount', t => {
  const h = harness(t);
  h.expense.assignedAmount = 120;
  assert.deepEqual(financeExpenseStatus(h.expense, [], '2026-10'), {
    paid: 0, remaining: 120, excess: 0, percentPaid: 0, paymentStatus: 'none'
  });
  assert.equal(addFinancePayment('otro', 'food', '30', '', '2026-10-11'), true);
  assert.deepEqual(financeExpenseStatus(h.expense, settings.financePayments, '2026-10'), {
    paid: 30, remaining: 90, excess: 0, percentPaid: 25, paymentStatus: 'partial'
  });
  h.expense.assignedAmount = 0;
  assert.equal(addFinancePayment('otro', 'food', '90', '', '2026-10-12'), true);
  assert.deepEqual(financeExpenseStatus(h.expense, settings.financePayments, '2026-10'), {
    paid: 120, remaining: 0, excess: 0, percentPaid: 100, paymentStatus: 'paid'
  });
  assert.equal(addFinancePayment('otro', 'food', '30', '', '2026-10-13'), true);
  assert.deepEqual(financeExpenseStatus(h.expense, settings.financePayments, '2026-10'), {
    paid: 150, remaining: 0, excess: 30, percentPaid: 125, paymentStatus: 'paid'
  });
  h.reload();
  assert.equal(financeExpenseStatus(settings.financeCategories.otro.rows[0], settings.financePayments, '2026-10').paid, 150);
});

test('expense status isolates the selected month and row and ignores duplicate or corrupt payments', t => {
  const h = harness(t);
  const payment = (id, rowId, usd, date) => ({ id, rowId, usd, date, name: 'Gasto', expenseType: 'variable' });
  const records = [
    payment('food-oct', 'food', 30, '2026-10-11'),
    payment('food-oct', 'food', 300, '2026-10-12'),
    payment('rent-oct', 'rent', 20, '2026-10-11'),
    payment('food-nov', 'food', 60, '2026-11-01'),
    payment('invalid-date', 'food', 90, '2026-10-32'),
    payment('invalid-money', 'food', Infinity, '2026-10-11')
  ];
  const before = JSON.stringify(records);
  assert.deepEqual(financePaymentRows(records, '2026-10', 'food').map(record => record.id), ['food-oct']);
  assert.deepEqual(financeExpenseStatus(h.expense, records, '2026-10'), {
    paid: 30, remaining: 90, excess: 0, percentPaid: 25, paymentStatus: 'partial'
  });
  assert.equal(financeExpenseStatus(h.expense, records, '2026-11').paid, 60);
  assert.equal(financeExpenseStatus(h.expense, records, '2026-12').paymentStatus, 'none');
  assert.equal(financeMonthTotals([h.expense], records, '2026-10').paid, 50);
  assert.equal(JSON.stringify(records), before);
});

test('payment comparisons tolerate subcent rounding without hiding a missing cent', t => {
  const h = harness(t);
  h.expense.targetAmount = .3;
  const payment = (id, usd) => ({ id, rowId: 'food', name: 'Comida', expenseType: 'variable', date: '2026-10-11', usd });
  const rounded = financeExpenseStatus(h.expense, [payment('first', .1), payment('second', .2)], '2026-10');
  assert.equal(rounded.paymentStatus, 'paid');
  assert.ok(Math.abs(rounded.paid - .3) < 1e-12);
  assert.ok(rounded.remaining >= 0);
  assert.ok(rounded.excess >= 0);
  h.expense.targetAmount = 120.003;
  assert.equal(financeExpenseStatus(h.expense, [payment('rounded-budget', 120)], '2026-10').paymentStatus, 'paid');
  h.expense.targetAmount = 120.01;
  const short = financeExpenseStatus(h.expense, [payment('short-cent', 120)], '2026-10');
  assert.equal(short.paymentStatus, 'partial');
  assert.ok(Math.abs(short.remaining - .01) < 1e-12);
  assert.equal(short.excess, 0);
});

test('legacy manual-paid flags exclude automatic reservation without inventing a payment history', t => {
  const h = harness(t);
  h.expense.manualPaid = true;
  h.expense.assignedAmount = 120;
  assert.deepEqual(financeExpenseStatus(h.expense, undefined, '2026-10'), {
    paid: 0, remaining: 120, excess: 0, percentPaid: 0, paymentStatus: 'none'
  });
  assert.equal(settings.financePayments, undefined);
});

test('releasing a reservation preserves the automatic exclusion and recorded payments after reload', t => {
  const h = harness(t);
  h.expense.manualPaid = true;
  assert.equal(addFinancePayment('otro', 'food', '40', '', '2026-10-11'), true);
  const before = JSON.stringify({ payments: settings.financePayments, calls, target: h.expense.targetAmount, priority: h.expense.priority });
  financeResetRow('otro', 'food');
  assert.equal(h.expense.assignedAmount, 0);
  assert.equal(h.expense.manualPaid, true);
  assert.equal(JSON.stringify({ payments: settings.financePayments, calls, target: h.expense.targetAmount, priority: h.expense.priority }), before);
  h.reload();
  const expense = settings.financeCategories.otro.rows[0];
  assert.equal(expense.assignedAmount, 0);
  assert.equal(expense.manualPaid, true);
  assert.equal(financeExpenseStatus(expense, settings.financePayments, '2026-10').paid, 40);
  settings.financeAutoFill = true;
  financeRunAutoFillCascade();
  assert.equal(expense.assignedAmount, 0);
  assert.equal(settings.financeCategories.otro.rows[1].assignedAmount, 100);
});

test('a rejected reservation release restores the assignment and preserves exclusion and payment history', t => {
  const h = harness(t);
  h.expense.manualPaid = true;
  assert.equal(addFinancePayment('otro', 'food', '40', '', '2026-10-11'), true);
  const before = JSON.stringify({ settings, state, calls });
  const saves = h.saves();
  h.reject();
  assert.equal(financeResetRow('otro', 'food'), false);
  assert.equal(JSON.stringify({ settings, state, calls }), before);
  assert.equal(h.saves(), saves);
  h.reload();
  assert.equal(JSON.stringify({ settings, state, calls }), before);
});

test('savings months remain a manual estimate as the reserved balance changes', t => {
  const h = harness(t);
  assert.equal(saveFinanceSavingsMonths('otro', 'goal', 12), true);
  h.meta.assignedAmount = 180;
  assert.deepEqual(financeSavingsMonthly(h.meta), { months: 12, monthly: 10 });
  h.meta.assignedAmount = 350;
  assert.deepEqual(financeSavingsMonthly(h.meta), { months: 12, monthly: 0 });
  assert.equal(h.meta.savingsMonths, 12);
  assert.equal(settings.financePayments, undefined);
});

test('finance defaults to the current local month for its payment status', () => {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  assert.equal(financeSelectedMonth(), month);
});

test('currency entry uses one canonical USD amount and rejects unavailable local conversion', t => {
  harness(t);
  assert.equal(financeInputUsd('268', 'local'), 10);
  assert.equal(financeInputUsd('10', 'usd'), 10);
  assert.equal(financeInputUsd('1.005', 'usd'), 1.01);
  assert.equal(addFinancePayment('otro','food','1.005','','2026-10-12'),true);
  assert.equal(settings.financePayments[0].usd,1.01);
  assert.ok(Number.isNaN(financeInputUsd('abc', 'local')));
  settings.exchangeRate = 0;
  assert.ok(Number.isNaN(financeInputUsd('268', 'local')));
  assert.equal(financeInputUsd('10', 'usd'), 10);
  settings.exchangeRate = Infinity;
  assert.ok(Number.isNaN(financeInputUsd('268', 'local')));
  settings.exchangeRate = 26.8; settings.currencyLabel = '';
  assert.ok(Number.isNaN(financeInputUsd('268', 'local')));
});

test('budget periods are explicit descriptors and never inferred from names or used to multiply amounts', t => {
  const h = harness(t); h.expense.name = 'Despensa / 2 semanas';
  assert.equal(financeBudgetPeriod(h.expense), 'unspecified');
  const before = JSON.stringify(h.expense);
  assert.equal(financeMonthTotals([h.expense], [], '2026-10').budget, 120);
  assert.equal(JSON.stringify(h.expense), before);
  for (const period of ['weekly','fortnightly','monthly','onetime']) {
    h.expense.budgetPeriod = period;
    assert.equal(financeBudgetPeriod(h.expense), period);
    assert.equal(financeMonthTotals([h.expense], [], '2026-10').budget, 120);
  }
  h.expense.budgetPeriod = '<script>';
  assert.equal(financeBudgetPeriod(h.expense), 'unspecified');
});
