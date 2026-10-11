import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parse } from 'acorn';
import { settings, state, calls, setAppSettings, setAppState, setAppCalls } from '../js/app-context.js';
import { configureSettingsContext, requestGoalChange, applyPendingGoalChange, clearActiveDayGoalOverride, updateRate } from '../js/settings.js';
import { ui, translateText, setLanguage } from '../js/i18n.js';

const source=fs.readFileSync(new URL('../js/app-main.js',import.meta.url),'utf8');
const nodes=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.map(n=>n.declaration||n);
const functions=new Map(nodes.filter(n=>n.type==='FunctionDeclaration').map(n=>[n.id.name,source.slice(n.start,n.end)]));
const goalConstants=nodes.filter(n=>n.type==='VariableDeclaration' && n.declarations.some(d=>['DEFAULT_GOAL_MINUTES','DEFAULT_GOAL_DOLLARS'].includes(d.id.name))).map(n=>source.slice(n.start,n.end)).join('\n');
const names=['defaultDaySchedule','defaultWeeklySchedule','defaultSettings','ensureWeeklySchedule','migrateDayConfigToBlocks','ensureBlockProductivityGoals','pad','dateKey','todayRange','todayCallDateKey','callDateKeyFromValue','callDateToDate','toDateFromInputs','clonePlanningValue','earliestTrackedPlanningDate','snapshotHistoricalPlanning','getDailyGoalOverride','effectiveDailyGoal','setDailyGoalOverride'];
const copy=value=>JSON.parse(JSON.stringify(value));

function harness(t) {
  setLanguage('es');
  const oldDocument=globalThis.document;
  const elements=new Map();
  const element=id=>{if(!elements.has(id))elements.set(id,{value:'',textContent:'',innerHTML:''});return elements.get(id);};
  globalThis.document={getElementById:element};
  t.after(()=>{if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;});
  class FixedDate extends Date {constructor(...args){super(...(args.length?args:['2026-10-10T12:00:00']));}}
  const h={Date:FixedDate,RATE:.12,DEFAULT_USER_EMOJI:'',WEEKDAYS:['mon','tue','wed','thu','fri','sat','sun'],getActiveDayKey:()=>state.activeDayKey,baseDayConfigFor:()=>settings.weeklySchedule.mon};
  Object.defineProperties(h,{settings:{get:()=>settings},state:{get:()=>state},calls:{get:()=>calls}});
  vm.createContext(h);vm.runInContext(goalConstants+'\n'+names.map(n=>functions.get(n)).join('\n'),h);
  setAppSettings(copy(h.defaultSettings()));
  setAppState({activeDayKey:'09/29/2026',events:[],pauseHistory:[],dayNotes:{},game:{days:{}}});
  setAppCalls([{id:'existing-call',callDate:'09/29/2026',durationMin:10}]);
  settings.productiveGoalMin=250.7;settings.earningsGoal=30.08;
  let persisted,opened;
  const save=()=>{persisted=JSON.stringify({settings,state,calls});};
  configureSettingsContext({...h,ui,translateText,closeModal(){},convertedAmountText:()=>'',currencyCeilFromUsdAmount:(usd,rate)=>Math.ceil(usd*rate*100)/100,
    effectiveCycleGoal:()=>0,ensureCurrencySettings(){},escapeHtml:String,formatCallDayLabel:String,formatMinutes:n=>String(Math.round(n*10)/10),iconHtml:()=>'',money:n=>n.toFixed(2),onGameDayMetadataChanged(){},openModal:id=>{opened=id;},render(){},saveSettingsOnly:save,saveStateOnly:save,toast(){},usdCeilFromCurrencyAmount:(amount,rate)=>Math.ceil(amount/rate*100)/100});
  const edit=(scope,min)=>{element('productiveGoalInput').value=String(min);element('earningsGoalInput').value=String(h.effectiveDailyGoal().usd);requestGoalChange('minutes');assert.equal(opened,'goalScopeModal');applyPendingGoalChange(scope);};
  return {h,element,edit,opened:()=>opened,reload(){const data=JSON.parse(persisted);setAppSettings(data.settings);setAppState(data.state);setAppCalls(data.calls);}};
}

test('new accounts start at 06:00–14:00 with the requested blocks and 360-minute goal',t=>{
  const x=harness(t),fresh=copy(x.h.defaultSettings());
  assert.equal(fresh.productiveGoalMin,360);assert.equal(fresh.earningsGoal,43.2);
  assert.equal(fresh.shiftStart,'06:00');assert.equal(fresh.shiftEnd,'14:00');
  const expected=[['work','06:00',130,120],['break','08:10',20],['work','08:30',130,120],['break','10:40',20],['work','11:00',65,60],['lunch','12:05',50],['work','12:55',65,60]];
  for(const day of ['mon','tue','wed','thu','fri']){
    assert.equal(fresh.weeklySchedule[day].off,false);
    assert.deepEqual(fresh.weeklySchedule[day].blocks.map(b=>b.type==='work'?[b.type,b.start,b.dur,b.goalMin]:[b.type,b.start,b.dur]),expected);
    assert.equal(fresh.weeklySchedule[day].blocks.reduce((sum,b)=>sum+(b.goalMin||0),0),360);
  }
  assert.equal(fresh.weeklySchedule.sat.off,true);assert.equal(fresh.weeklySchedule.sun.off,true);
  fresh.weeklySchedule.mon.blocks[0].goalMin=1;assert.equal(fresh.weeklySchedule.tue.blocks[0].goalMin,120);
});

test('loading an existing customized schedule keeps its times, goals and days off',t=>{
  const x=harness(t);settings.productiveGoalMin=250.7;
  for(const day of x.h.WEEKDAYS)settings.weeklySchedule[day]={off:day==='wed',start:'16:00',end:'22:00',blocks:[{type:'work',start:'16:00',dur:120,goalMin:90}]};
  const before=copy(settings.weeklySchedule);x.h.ensureWeeklySchedule();
  assert.deepEqual(copy(settings.weeklySchedule),before);assert.equal(settings.productiveGoalMin,250.7);
});

test('editing the general goal from a historical day changes that day, persists and leaves other history intact',t=>{
  const x=harness(t);x.edit('global',360);
  assert.equal(settings.productiveGoalMin,360);assert.ok(Math.abs(settings.earningsGoal-43.2)<1e-9);
  assert.equal(x.h.effectiveDailyGoal('09/29/2026').min,360);
  assert.equal(x.h.effectiveDailyGoal('09/30/2026').min,250.7);
  assert.equal(x.h.effectiveDailyGoal('10/10/2026').min,360);
  assert.equal(x.element('productiveGoalInput').value,'360');
  x.reload();assert.equal(x.h.effectiveDailyGoal('09/29/2026').min,360);assert.equal(calls.length,1);
});

test('day-only goals leave the general goal intact and using general updates the selected historical day',t=>{
  const x=harness(t);x.h.snapshotHistoricalPlanning();x.edit('day',360);
  assert.equal(settings.productiveGoalMin,250.7);assert.equal(x.h.effectiveDailyGoal().min,360);
  settings.productiveGoalMin=300;settings.earningsGoal=36;clearActiveDayGoalOverride();
  assert.equal(x.h.effectiveDailyGoal().min,300);assert.equal(x.h.effectiveDailyGoal('09/30/2026').min,250.7);
  assert.equal(x.element('productiveGoalInput').value,'300');x.reload();assert.equal(x.h.effectiveDailyGoal().min,300);
});

test('editing the rate while viewing a special past goal preserves the general minutes and daily exception',t=>{
  const x=harness(t);x.edit('day',90);
  const override=copy(settings.dailyGoalOverrides['09/29/2026']);
  x.element('rateInput').value='0.20';updateRate();
  assert.equal(settings.productiveGoalMin,250.7);
  assert.ok(Math.abs(settings.earningsGoal-50.14)<1e-9);
  assert.deepEqual(copy(settings.dailyGoalOverrides['09/29/2026']),override);
  assert.equal(x.h.effectiveDailyGoal('09/29/2026').min,90);
  x.reload();assert.equal(settings.productiveGoalMin,250.7);assert.equal(x.h.effectiveDailyGoal().min,90);
});

test('overflowing converted goals and rates do not persist non-finite values',t=>{
  const x=harness(t);x.element('productiveGoalInput').value='250.7';x.element('earningsGoalInput').value='1e308';
  requestGoalChange('dollars');
  assert.equal(x.opened(),undefined);
  assert.equal(settings.productiveGoalMin,250.7);assert.equal(settings.earningsGoal,30.08);
  x.element('rateInput').value='1e308';updateRate();
  assert.equal(settings.rate,.12);assert.equal(settings.earningsGoal,30.08);
});
