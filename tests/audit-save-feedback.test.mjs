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

for(const deferSave of [false,true])test(`ending a pause with a rejected ${deferSave?'partial':'full'} write does not announce return or award progress`,()=>{
  let rewards=0,writes=0;const messages=[];
  const h=vm.createContext({ui,translateText:x=>x,Date,
    state:{activePause:{type:'break',startedAt:'2026-10-11T12:00:00Z',shiftDayKey:'10/11/2026'},pauseHistory:[]},
    callDateKeyFromValue:x=>x,findPlannedSlotForActivePause:()=>null,makeLocalId:()=> 'pause',
    setEvent:()=>({id:'event'}),fmtTime:()=> '06:20',stopBreakEndAlarm(){},
    saveStateOnly:()=>{writes++;return false;},saveAll:()=>{writes++;return false;},
    toast:x=>messages.push(x),onGamePauseEnded:()=>{rewards++;}});
  vm.runInContext(declaration('../js/app-main.js','endPause'),h);
  assert.equal(h.endPause({deferSave,endedAt:'2026-10-11T12:20:00Z'}),false);
  assert.equal(writes,1);assert.equal(rewards,0);assert.deepEqual(messages,[]);
});

test('starting a live call does not announce success after its snapshot is rejected',()=>{
  const messages=[];
  const h=vm.createContext({Date,ui,translateText:x=>x,
    state:{shiftStartedAt:'2026-10-11T12:00:00Z',shiftEndedAt:null,activeCall:null,activePause:null},
    saveAll:()=>false,toast:x=>messages.push(x)});
  vm.runInContext(declaration('../js/app-main.js','startCall'),h);
  assert.equal(h.startCall({startedAt:'2026-10-11T12:05:00Z'}),false);
  assert.deepEqual(messages,[]);
});

test('removing a special daily goal does not announce success or award metadata after rejection',()=>{
  let rewards=0;const messages=[];
  const h=vm.createContext({getActiveDayKey:()=> '10/11/2026',getDailyGoalOverride:()=>({min:90}),setDailyGoalOverride(){},
    saveSettingsOnly:()=>false,onGameDayMetadataChanged:()=>{rewards++;},toast:x=>messages.push(x)});
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
  const h=vm.createContext({editingDayNoteKey:'10/11/2026',state:{dayNotes:{}},callDateKeyFromValue:x=>x,
    document:{getElementById:()=>({value:'work'})},saveStateOnly:()=>false,
    onGameDayMetadataChanged:()=>{rewards++;},closeModal:()=>{closed++;},toast:x=>messages.push(x)});
  vm.runInContext(['setDayNote','saveDayNoteFromModal','clearDayNoteFromModal'].map(n=>declaration('../js/app-main.js',n)).join('\n'),h);
  assert.equal(h.saveDayNoteFromModal(),false);assert.equal(h.clearDayNoteFromModal(),false);
  assert.equal(h.editingDayNoteKey,'10/11/2026');assert.equal(closed,0);assert.equal(rewards,0);assert.deepEqual(messages,[]);
});
