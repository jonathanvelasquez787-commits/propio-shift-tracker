import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parse } from 'acorn';
import { activityEffects, confirmActivityChange, restoreAutomaticGameChanges } from '../js/work-actions.js';
import { confirmReplacement, replacementSignature, snapshotCounts } from '../js/backup-recovery.js';

const source = fs.readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');
const declarations = parse(source, {ecmaVersion:'latest',sourceType:'module'}).body.map(n=>n.declaration||n);
const fn=name=>{const node=declarations.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);return source.slice(node.start,node.end);};
const clone=value=>JSON.parse(JSON.stringify(value));
const ui=(parts,...values)=>parts.reduce((out,part,i)=>out+part+(values[i]??''),'');
const documentStub={getElementById:()=>null};

function activityHarness(active={startedAt:'2026-10-19T14:00:00Z'}) {
  globalThis.document=documentStub;
  const h=vm.createContext({state:{activeCall:active,activePause:null,events:[],pauseHistory:[],dayInterruptions:{},lastCallEndedAt:'keep',shiftStartedAt:'existing'},
    settings:{}, ui,translateText:value=>value,escapeHtml:String, document:documentStub,
    saveStateOnly:()=>!h.reject,saveAll:()=>!h.reject,canPersistLocalChanges:()=>!h.stale,
    setAppState:value=>{h.state=value;},render:()=>{},toast:message=>h.messages.push(message),
    ignorePropioCall:(state,id)=>{state.ignored=id;},callDateKeyFromValue:value=>value, restoreAutomaticGameChanges,
    todayCallDateKey:()=> '10/19/2026',onGameCallsChanged(){},onGameDayMetadataChanged(){},
    currentShiftAccountingDayKey:()=> '10/19/2026',stopBreakStartAlarm:()=>h.alarms++,stopBreakEndAlarm:()=>h.alarms++,
    appConfirm:(_message,callback)=>{h.confirm=callback;},
  });
  h.messages=[];h.alarms=0;
  vm.runInContext(fn('activityChangeSignature'),h);
  h.requestActivityDiscard=(kind,change,done)=>confirmActivityChange({ui,translateText:value=>value,escapeHtml:String,
    data:()=>({state:h.state,settings:h.settings}),signature:()=>h.activityChangeSignature(),canPersistLocalChanges:h.canPersistLocalChanges,
    appConfirm:h.appConfirm,saveStateOnly:h.saveStateOnly,setState:h.setAppState,render:h.render,toast:h.toast},kind,
    kind==='call'?h.state.activeCall:h.state.activePause,h.activityChangeSignature(),change,done);
  vm.runInContext(fn('discardActiveCall')+'\n'+fn('discardActivePause'),h);
  return h;
}

test('discarding an accidental call restores its interrupted pause and only its automatic shift',()=>{
  const pause={type:'break',startedAt:'2026-10-19T13:00:00Z'};
  const h=activityHarness({startedAt:'2026-10-19T14:00:00Z',autoStartedShift:true,autoShiftEventId:'auto',previousShiftStartedAt:'old',previousShiftEndedAt:'closed',
    gameBeforeAutoShift:{xp:7},interruptedPauseRollback:{pause,pauseHistoryId:'interrupted',pauseEndEventId:'end'}});
  h.state.events=[{id:'auto'},{id:'end'},{id:'unrelated'}];h.state.pauseHistory=[{id:'interrupted'},{id:'keep'}];
  h.discardActiveCall();assert.ok(h.state.activeCall);h.confirm();
  assert.equal(h.state.activeCall,null);assert.deepEqual(clone(h.state.activePause),pause);
  assert.equal(h.state.shiftStartedAt,'old');assert.equal(h.state.shiftEndedAt,'closed');assert.equal(h.state.game.xp,7);
  assert.deepEqual(clone(h.state.events),[{id:'unrelated'}]);assert.equal(h.state.lastCallEndedAt,'keep');
  assert.deepEqual(clone(h.state.pauseHistory),[{id:'keep'}]);
});

test('discarding a continued pause restores its previously closed interval',()=>{
  const closed={id:'closed',type:'break',startedAt:'2026-10-19T13:00:00Z',endedAt:'2026-10-19T13:10:00Z'};
  const h=activityHarness(null);
  h.state.activePause={...closed,shiftDayKey:'10/19/2026',continuationClosedPause:closed,continuationEventId:'continued',continuationInterruptionId:'gap'};
  h.state.dayInterruptions={'10/19/2026':[{id:'gap'},{id:'other'}]};h.state.events=[{id:'continued'},{id:'original'}];
  h.discardActivePause();h.confirm();h.confirm();
  assert.equal(h.state.activePause,null);assert.deepEqual(clone(h.state.pauseHistory),[closed]);
  assert.deepEqual(clone(h.state.events),[{id:'original'}]);assert.deepEqual(clone(h.state.dayInterruptions['10/19/2026']),[{id:'other'}]);
  assert.equal(h.alarms,2);
});

test('discarding an automatic live call keeps historical rewards earned after its start',()=>{
  const before={totalXp:300,ledger:{original:true},days:{today:{finalized:true,xp:200}}};
  const started={totalXp:100,ledger:{original:true,reflex:true},days:{today:{reopened:true}}};
  const h=activityHarness({startedAt:'2026-10-19T14:00:00Z',autoStartedShift:true,gameBeforeAutoShift:before,
    gameAfterAutoShift:started,previousShiftStartedAt:'old',previousShiftEndedAt:'closed'});
  h.state.game={...clone(started),totalXp:150,ledger:{...started.ledger,historical:{applied:50}},days:{...started.days,history:{earnings:4}}};
  h.discardActiveCall();assert.equal(h.confirm(),true);
  assert.equal(h.state.game.totalXp,350);assert.equal(h.state.game.ledger.historical.applied,50);
  assert.equal(h.state.game.ledger.reflex,undefined);assert.equal(h.state.game.days.today.finalized,true);
  assert.equal(h.state.game.days.history.earnings,4);assert.equal(h.state.shiftEndedAt,'closed');
});

test('discarding a fresh pause removes only its own start event',()=>{
  const h=activityHarness(null);h.state.activePause={type:'lunch',startedAt:'2026-10-19T14:00:00Z',startEventId:'start'};
  h.state.events=[{id:'start'},{id:'other'}];h.discardActivePause();h.confirm();
  assert.deepEqual(clone(h.state.events),[{id:'other'}]);assert.equal(h.state.shiftStartedAt,'existing');
});

test('rejected activity discard restores memory and does not stop pause alarms',()=>{
  const h=activityHarness(null);h.state.activePause={type:'break',startedAt:'2026-10-19T14:00:00Z'};
  const before=clone(h.state);h.reject=true;h.discardActivePause();assert.equal(h.confirm(),false);
  assert.deepEqual(clone(h.state),before);assert.equal(h.alarms,0);assert.match(h.messages.at(-1),/No se guardó/);
});

test('a discard confirmation cannot affect a newer activity or another owner',()=>{
  for(const mutate of [h=>{h.state.activeCall.startedAt='new';},h=>{h.settings={different:true};},h=>{h.stale=true;}]) {
    const h=activityHarness();h.discardActiveCall();mutate(h);const before=clone(h.state);
    assert.equal(h.confirm(),false);assert.deepEqual(clone(h.state),before);
  }
});

test('call confirmation explains the real rollback instead of promising a generic deletion',()=>{
  const lines=activityEffects('call',{autoStartedShift:true,interruptedPauseRollback:{pause:{}}},x=>x).join(' ');
  assert.match(lines,/retoma la pausa/);assert.match(lines,/revierte el turno/);assert.match(lines,/ACW previo/);
});

test('a continued pause rejected by storage keeps the previously closed interval',()=>{
  const h=activityHarness(null),at=Date.parse('2026-10-19T14:10:20Z');
  h.Date=class extends Date {constructor(...args){super(...(args.length?args:[at]));}static now(){return at;}};
  Object.assign(h,{currentShiftAccountingDayKey:()=> '10/19/2026',ACCIDENTAL_TOGGLE_GRACE_MIN:2,formatMinutes:String,fmtTime:String,
    onGamePauseStarted:()=>{throw Error('Should not award an unsaved pause');},
    registerDayInterruption:()=>{h.state.dayInterruptions.test=[{id:'gap'}];return{id:'gap'};},
    setEvent:()=>{h.state.events.push({id:'continued'});return{id:'continued'};}});
  h.state.pauseHistory=[{id:'closed',type:'break',startedAt:'2026-10-19T14:00:00Z',endedAt:'2026-10-19T14:10:00Z',shiftDayKey:'10/19/2026'}];
  h.reject=true;const before=clone(h.state);vm.runInContext(fn('startPause'),h);
  assert.equal(h.startPause('break'),false);assert.deepEqual(clone(h.state),before);assert.equal(h.alarms,0);
});

test('metadata editor refuses to overwrite annotations changed while it was open',()=>{
  const h=activityHarness(null);vm.runInContext(fn('metadataEditGuard'),h);
  h.state.dayNotes={day:{comment:'first'}};
  const valid=h.metadataEditGuard(()=>h.state.dayNotes.day);assert.equal(valid(),true);
  h.state.dayNotes.day.comment='newer';assert.equal(valid(),false);assert.match(h.messages.at(-1),/datos cambiaron/);
});

test('rejected manual gap classification leaves the saved annotations unchanged',()=>{
  const h=activityHarness(null);h.state.gapAnnotations={day:{gap:{label:'acw',note:'keep'}}};
  h.ensureGapBucket=day=>h.state.gapAnnotations[day];h.reject=true;
  vm.runInContext(fn('setGapAnnotation'),h);const before=clone(h.state.gapAnnotations);
  assert.equal(h.setGapAnnotation('day','gap',{label:'break',note:'new'}),false);
  assert.deepEqual(clone(h.state.gapAnnotations),before);
});

function replacementHarness() {
  globalThis.document=documentStub;
  let data={state:{events:[],pauseHistory:[],game:{xp:5}},calls:[{id:'old'}],settings:{rate:1}};
  const h={account:'a',copies:[],messages:[],changes:0};
  h.context={ui,translateText:x=>x,escapeHtml:String,data:()=>data,account:()=>h.account,canPersistLocalChanges:()=>!h.stale,
    appConfirm:(_message,callback)=>{h.confirm=callback;},preserve:before=>{if(h.quota)throw Error('quota');h.copies.push(clone(before));},
    restore:before=>{data=before;},toast:text=>h.messages.push(text)};
  h.data=()=>data;
  h.open=()=>confirmReplacement(h.context,'reset',()=>{h.changes++;data.calls=[];data.state.game.xp=0;if(h.fail) return false;return true;});
  return h;
}

test('replacement preserves a complete copy before mutation and applies only once',()=>{
  const h=replacementHarness(),before=clone(h.data());h.open();assert.equal(h.copies.length,0);
  assert.equal(h.confirm(),true);assert.equal(h.confirm(),false);assert.equal(h.changes,1);
  assert.deepEqual(h.copies,[before]);assert.equal(h.data().calls.length,0);
});

test('replacement refuses to destroy data when its previous copy cannot be saved',()=>{
  const h=replacementHarness(),before=clone(h.data());h.quota=true;h.open();assert.equal(h.confirm(),false);
  assert.deepEqual(h.data(),before);assert.equal(h.changes,0);
});

test('a rejected replacement rolls memory back and keeps the recovery copy',()=>{
  const h=replacementHarness(),before=clone(h.data());h.fail=true;h.open();assert.equal(h.confirm(),false);
  assert.deepEqual(h.data(),before);assert.deepEqual(h.copies,[before]);
});

test('replacement rejects stale data, changed accounts and pending live work',()=>{
  for(const mutate of [h=>h.data().calls.push({id:'new'}),h=>{h.account='b';},h=>{h.data().state.activePause={type:'break'};},h=>{h.stale=true;}]){
    const h=replacementHarness();h.open();mutate(h);const before=clone(h.data());
    assert.equal(h.confirm(),false);assert.equal(h.changes,0);assert.equal(h.copies.length,0);assert.deepEqual(h.data(),before);
  }
});

test('replacement ignores background game progress for review but preserves its latest value',()=>{
  const h=replacementHarness();h.open();h.data().state.game.xp=9;assert.equal(h.confirm(),true);assert.equal(h.copies[0].state.game.xp,9);
  assert.deepEqual(snapshotCounts(h.copies[0]),[1,0,0]);
  assert.notEqual(replacementSignature(h.copies[0]),replacementSignature(h.data()));
});
