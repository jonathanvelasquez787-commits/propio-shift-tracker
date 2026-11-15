import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parse } from 'acorn';

function declaration(file,name) {
  const source=fs.readFileSync(new URL(file,import.meta.url),'utf8');
  const node=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body
    .map(n=>n.declaration||n).find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);
  return source.slice(node.start,node.end).replace(/^export /,'');
}
const ui=(parts,...values)=>parts.reduce((out,part,i)=>out+part+(values[i]??''),'');

for(const deferSave of [false,true])test(`ending a pause ${deferSave?'stages an outer transaction without writing':'with a rejected write'} does not announce return or award progress`,()=>{
  let rewards=0,writes=0;const messages=[];
  const h=vm.createContext({ui,translateText:x=>x,Date,
    state:{activePause:{type:'break',startedAt:'2026-10-11T12:00:00Z',shiftDayKey:'10/11/2026'},pauseHistory:[]},
    callDateKeyFromValue:x=>x,findPlannedSlotForActivePause:()=>null,makeLocalId:()=> 'pause',
    setEvent:()=>({id:'event'}),fmtTime:()=> '06:20',stopBreakEndAlarm(){},
    canPersistLocalChanges:()=>true,setAppState:value=>{h.state=value;},render(){},
    saveStateOnly:()=>{writes++;return false;},saveAll:()=>{writes++;return false;},
    toast:x=>messages.push(x),onReinforcementPauseEnded:()=>{rewards++;}});
  vm.runInContext(declaration('../js/app-main.js','endPause'),h);
  const result=h.endPause({deferSave,endedAt:'2026-10-11T12:20:00Z'});
  assert.equal(writes,deferSave?0:1);assert.equal(rewards,0);assert.deepEqual(messages,[]);
  if(deferSave){assert.equal(typeof result.finish,'function');assert.equal(h.state.activePause,null);assert.equal(h.state.pauseHistory.length,1);}
  else{assert.equal(result,false);assert.equal(h.state.activePause.type,'break');assert.equal(h.state.pauseHistory.length,0);}
});

test('starting a live call does not announce success after its snapshot is rejected',()=>{
  const messages=[];
  const h=vm.createContext({Date,ui,translateText:x=>x,
    state:{shiftStartedAt:'2026-10-11T12:00:00Z',shiftEndedAt:null,activeCall:null,activePause:null},
    liveCallDayIsOff:()=>false,canPersistLocalChanges:()=>true,setAppState:value=>{h.state=value;},render(){},saveAll:()=>false,toast:x=>messages.push(x)});
  vm.runInContext(declaration('../js/app-main.js','startCall'),h);
  assert.equal(h.startCall({startedAt:'2026-10-11T12:05:00Z'}),false);
  assert.deepEqual(messages,[]);
});

test('removing a special daily goal does not announce success or award metadata after rejection',()=>{
  let rewards=0;const messages=[];
  const h=vm.createContext({getActiveDayKey:()=> '10/11/2026',getDailyGoalOverride:()=>({min:90}),setDailyGoalOverride(){},
    settings:{dailyGoalOverrides:{}},state:{},saveAll:()=>false,
    setAppSettings:value=>{h.settings=value;},setAppState:value=>{h.state=value;},refreshGoalInputs(){},render(){},
    saveSettingsOnly:()=>false,onReinforcementDayMetadataChanged:()=>{rewards++;},toast:x=>messages.push(x)});
  vm.runInContext(declaration('../js/settings.js','clearActiveDayGoalOverride'),h);
  assert.equal(h.clearActiveDayGoalOverride(),false);
  assert.equal(rewards,0);assert.deepEqual(messages,[]);
});

test('cycle goal editors keep their dialog and omit success when persistence rejects',()=>{
  let closed=0;const messages=[];
  const h=vm.createContext({settings:{cycleGoalOverrides:{}},cycleGoalKeyForOffset:()=> 'cycle',
    document:{getElementById:()=>({value:'100'})},saveSettingsOnly:()=>false,
    closeModal:()=>{closed++;},toast:x=>messages.push(x)});
  vm.runInContext(['setCycleGoalOverride','saveCycleGoalEditor','useAutoCycleGoal'].map(n=>declaration('../js/app-main.js',n)).join('\n'),h);
  assert.equal(h.saveCycleGoalEditor(),false);assert.equal(h.useAutoCycleGoal(),false);
  assert.equal(closed,0);assert.deepEqual(messages,[]);
});

test('day note editors keep their dialog and omit success and rewards when persistence rejects',()=>{
  let closed=0,rewards=0;const messages=[];
  const h=vm.createContext({editingDayNoteKey:'10/11/2026',dayNoteEditValid:()=>true,state:{dayNotes:{}},callDateKeyFromValue:x=>x,
    document:{getElementById:()=>({value:'work'})},saveStateOnly:()=>false,
    onReinforcementDayMetadataChanged:()=>{rewards++;},closeModal:()=>{closed++;},toast:x=>messages.push(x)});
  vm.runInContext(['setDayNote','saveDayNoteFromModal','clearDayNoteFromModal'].map(n=>declaration('../js/app-main.js',n)).join('\n'),h);
  assert.equal(h.saveDayNoteFromModal(),false);assert.equal(h.clearDayNoteFromModal(),false);
  assert.equal(h.editingDayNoteKey,'10/11/2026');assert.equal(closed,0);assert.equal(rewards,0);assert.deepEqual(messages,[]);
});

for(const initialOverrides of [undefined,{'2026':80,'2025':50}]) {
  for(const action of ['saveCalYearGoalModal','useAutoCalYearGoalModal']) {
    test(`annual calendar ${action} preserves the editor and previous overrides after rejected persistence (${initialOverrides?'existing':'absent'})`,()=>{
      let closed=0,rendered=0,writes=0;const messages=[];
      const settings=initialOverrides?{yearGoalOverrides:{...initialOverrides}}:{};
      const previous=settings.yearGoalOverrides;
      const h=vm.createContext({ui,translateText:x=>x,settings,calYearOffset:0,calYearGoalKey:()=> '2026',
        document:{getElementById:()=>({value:'123'})},saveSettingsOnly:()=>{writes++;return false;},
        closeModal:()=>{closed++;},renderCalYear:()=>{rendered++;},toast:x=>messages.push(x),money:String,convertedAmountText:()=>''});
      vm.runInContext(['setCalYearGoalOverride',action].map(n=>declaration('../js/calendar.js',n)).join('\n'),h);
      assert.equal(h[action](),false);
      assert.equal(settings.yearGoalOverrides,previous);
      assert.equal(Object.hasOwn(settings,'yearGoalOverrides'),initialOverrides!==undefined);
      assert.equal(writes,1);assert.equal(closed,0);assert.equal(rendered,0);assert.deepEqual(messages,[]);
    });
  }
}

for(const initialDate of [undefined,'2026-08-01']) {
  for(const [action,value] of [['saveCalHistoryStartModal','2026-09-01'],['saveCalHistoryStartModal',''],['useAutoCalHistoryStartModal','']]) {
    test(`calendar history ${action} (${value||'auto'}) preserves the editor and previous date after rejected persistence (${initialDate||'absent'})`,()=>{
      let closed=0,rendered=0,writes=0;const messages=[];
      const settings=initialDate?{historyStartDateOverride:initialDate}:{};
      const h=vm.createContext({ui,translateText:x=>x,settings,
        document:{getElementById:()=>({value})},saveSettingsOnly:()=>{writes++;return false;},
        closeModal:()=>{closed++;},renderCalYear:()=>{rendered++;},toast:x=>messages.push(x)});
      vm.runInContext(['setCalHistoryStartOverride',action].map(n=>declaration('../js/calendar.js',n)).join('\n'),h);
      assert.equal(h[action](),false);
      assert.equal(settings.historyStartDateOverride,initialDate);
      assert.equal(Object.hasOwn(settings,'historyStartDateOverride'),initialDate!==undefined);
      assert.equal(writes,1);assert.equal(closed,0);assert.equal(rendered,0);assert.deepEqual(messages,[]);
    });
  }
}

test('annual calendar goal can be retried after persistence recovers',()=>{
  let accepted=false,closed=0;const messages=[];
  const settings={yearGoalOverrides:{'2026':80}};
  const h=vm.createContext({ui,translateText:x=>x,settings,calYearOffset:0,calYearGoalKey:()=> '2026',
    document:{getElementById:()=>({value:'123'})},saveSettingsOnly:()=>accepted,
    closeModal:()=>{closed++;},renderCalYear(){},toast:x=>messages.push(x),money:String,convertedAmountText:()=>''});
  vm.runInContext(['setCalYearGoalOverride','saveCalYearGoalModal'].map(n=>declaration('../js/calendar.js',n)).join('\n'),h);
  assert.equal(h.saveCalYearGoalModal(),false);assert.equal(settings.yearGoalOverrides['2026'],80);
  accepted=true;h.saveCalYearGoalModal();
  assert.equal(settings.yearGoalOverrides['2026'],123);assert.equal(closed,1);assert.equal(messages.length,1);
});

test('Higher Rate purge restores windows, frozen bonuses and finance assignments when persistence rejects',()=>{
  const windows=[{id:'old',past:true},{id:'new',past:false}],calls=[{id:'call'}];
  const settings={higherRateWindows:windows,financeCategories:{expenses:{rows:[{assignedAmount:5}]}}};
  let accepted=false;const messages=[];
  const h=vm.createContext({ui,translateText:x=>x,settings,calls,canPersistLocalChanges:()=>true,money:x=>String(x),convertedAmountText:()=>'',higherRateBonusForCall:()=>({amount:1,windowId:'old'}),
    higherRateGameBonusSnapshot:()=>new Map(),higherRateWindowIsPast:w=>w.past,appConfirm:(_,accept)=>accept(),
    freezeHigherRateBonusesForWindowIds:()=>{calls[0].frozenHigherRateBonus={amount:1};},
    financeRunAutoFillCascade:()=>{settings.financeCategories.expenses.rows[0].assignedAmount=10;},
    reconcileHigherRateGameChanges:()=>messages.push('reconcile'),saveAll:()=>accepted,
    render() {},renderHigherRateWindowsEditor:()=>messages.push('render'),toast:x=>messages.push(x)});
  vm.runInContext(['higherRateMutationSnapshot','restoreHigherRateMutation','purgePastHigherRateWindows'].map(n=>declaration('../js/higher-rate.js',n)).join('\n'),h);h.purgePastHigherRateWindows();
  assert.equal(settings.higherRateWindows,windows);assert.equal(Object.hasOwn(calls[0],'frozenHigherRateBonus'),false);
  assert.equal(settings.financeCategories.expenses.rows[0].assignedAmount,5);assert.deepEqual(messages,[]);
  accepted=true;h.purgePastHigherRateWindows();assert.equal(settings.higherRateWindows.length,1);
  assert.equal(settings.higherRateWindows[0].id,'new');assert.equal(calls[0].frozenHigherRateBonus.amount,1);
  assert.equal(settings.financeCategories.expenses.rows[0].assignedAmount,5);
  assert.equal(messages.length,2);
});

for(const scenario of [
  {name:'scheduled free day',off:true,forced:undefined,active:false,today:true,disabled:true},
  {name:'forced working day overrides free schedule',off:true,forced:'work',active:false,today:true,disabled:false},
  {name:'forced free day overrides working schedule',off:false,forced:'off',active:false,today:true,disabled:true},
  {name:'working day',off:false,forced:undefined,active:false,today:true,disabled:false},
  {name:'active call can end on a free day',off:true,forced:'off',active:true,today:true,disabled:false},
  {name:'historical day remains disabled',off:false,forced:'work',active:true,today:false,disabled:true},
])test(`live call action: ${scenario.name}`,()=>{
  const h=vm.createContext({state:{activeCall:scenario.active?{id:'live'}:null},isViewingToday:()=>scenario.today,
    todayCallDateKey:()=> '10/11/2026',getDayNote:()=>({forcedStatus:scenario.forced}),dayConfigFor:()=>({off:scenario.off}),
    shiftWouldStartNew:()=>!scenario.active,shiftStartTooEarly:()=>false});
  vm.runInContext(['liveCallDayIsOff','callActionDisabled','todayIsOff','shiftActionDisabled'].map(n=>declaration('../js/app-main.js',n)).join('\n'),h);
  assert.equal(h.liveCallDayIsOff(),scenario.forced==='off'||(scenario.forced!=='work'&&scenario.off));
  assert.equal(h.callActionDisabled(),scenario.disabled);
  assert.equal(h.shiftActionDisabled(),scenario.disabled);
});
