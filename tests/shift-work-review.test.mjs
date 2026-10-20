import test from 'node:test';
import assert from 'node:assert/strict';
import {confirmShiftTransition,schedulePreviewRows,confirmSchedulePlan} from '../js/shift-work-review.js';
import {configureScheduleContext,updateScheduleRowSummary} from '../js/schedule.js';
import {translateText} from '../js/i18n.js';

function harness(t) {
  const prior=globalThis.document, elements=new Map();
  globalThis.document={getElementById:id=>{if(!elements.has(id))elements.set(id,{textContent:'',innerHTML:'',value:'continue'});return elements.get(id);}};
  t.after(()=>{if(prior===undefined)delete globalThis.document;else globalThis.document=prior;});
  const data={state:{activeCall:null,activePause:null,pendingLiveCallBackup:null},settings:{}};
  let callback,signature='initial',current=true,ended=0,started=0;
  const messages=[];
  const context={ui:(strings,...values)=>strings.reduce((s,text,i)=>s+text+(values[i]??''),''),translateText:s=>s,escapeHtml:s=>s,data:()=>data,signature:()=>signature,
    appConfirm:(_message,run)=>{callback=run;},toast:message=>messages.push(message),isViewingToday:()=>current,canPersistLocalChanges:()=>true};
  return {data,elements,messages,context,open:kind=>confirmShiftTransition(context,kind,()=>++ended,()=>++started),confirm:()=>callback(),
    stale:()=>{signature='changed';},history:()=>{current=false;},counts:()=>({ended,started})};
}

test('shift confirmation explains active work and changes nothing before acceptance',t=>{
  const h=harness(t);h.data.state.activeCall={startedAt:'now'};h.data.state.activePause={type:'break'};
  h.open('end');assert.deepEqual(h.counts(),{ended:0,started:0});
  assert.match(h.elements.get('confirmModalDetails').innerHTML,/Se guarda la llamada/);
  assert.match(h.elements.get('confirmModalDetails').innerHTML,/termina la pausa/);
  h.confirm();h.confirm();assert.deepEqual(h.counts(),{ended:1,started:0});
});

test('shift resume explicitly distinguishes continuation from another session',t=>{
  const h=harness(t);h.open('resume');document.getElementById('shiftResumeChoice').value='new';h.confirm();
  assert.deepEqual(h.counts(),{ended:0,started:1});
});

test('changed activity and historical navigation invalidate a shift confirmation',t=>{
  const h=harness(t);h.open('end');h.stale();assert.equal(h.confirm(),false);
  h.open('end');h.history();assert.equal(h.confirm(),false);assert.deepEqual(h.counts(),{ended:0,started:0});
});

test('pending live-call recovery blocks shift closure before opening confirmation',t=>{
  const h=harness(t);h.data.state.pendingLiveCallBackup={startedAtISO:'saved'};
  assert.equal(h.open('end'),false);assert.equal(h.elements.size,0);assert.equal(h.messages.length,1);
});

test('schedule preview sorts overnight blocks on the shift day without mutating the draft',()=>{
  const config={start:'22:00',end:'06:00',blocks:[{type:'work',start:'00:30',dur:330},{type:'break',start:'23:45',dur:45},{type:'work',start:'22:00',dur:105}]};
  const before=JSON.stringify(config),rows=schedulePreviewRows(config);
  assert.deepEqual(rows.map(row=>row.startMin),[1320,1425,1470]);
  assert.equal(rows[1].endMin,1470);assert.equal(rows[2].endMin,1800);assert.equal(JSON.stringify(config),before);
});

test('schedule confirmation preserves the draft until accepted and refuses a changed schedule',t=>{
  const h=harness(t);let accepted=0,valid=true;
  const plan={scope:'Template',config:{start:'22:00',end:'06:00',blocks:[{type:'break',start:'23:45',dur:30}]},days:[{label:'Monday',before:{off:true}}],shiftLate:true,draft:true};
  const context={...h.context,timeLabel:value=>value,blockLabel:value=>value,valid:()=>valid};
  confirmSchedulePlan(context,plan,()=>++accepted);
  assert.equal(accepted,0);assert.match(h.elements.get('confirmModalDetails').innerHTML,/día siguiente/);
  h.stale();assert.equal(h.confirm(),false);assert.equal(accepted,0);
  confirmSchedulePlan(context,plan,()=>++accepted);valid=false;assert.equal(h.confirm(),false);assert.equal(accepted,0);
  valid=true;confirmSchedulePlan(context,plan,()=>++accepted);h.confirm();h.confirm();assert.equal(accepted,1);
});

test('overnight editor labels and duration follow the edited inputs immediately',t=>{
  const prior=globalThis.document;
  globalThis.document={getElementById:()=>({value:'22:00'})};
  t.after(()=>{if(prior===undefined)delete globalThis.document;else globalThis.document=prior;});
  configureScheduleContext({formatHHMM:x=>x,toMinutes:value=>{const [h,m]=value.split(':').map(Number);return h*60+m;},iconHtml:()=>'<svg></svg>'});
  const elements=new Map([['.block-start-input',{value:'23:45'}],['.block-end-input',{value:'00:15'}],['.block-type-input',{value:'break'}],
    ['.sched-tl-hour',{}],['.sched-tl-duration',{}],['.sched-tl-subtitle',{}],['.sched-tl-icon',{}]]);
  const row={querySelector:selector=>elements.get(selector)};
  assert.equal(updateScheduleRowSummary(row),30);assert.equal(elements.get('.sched-tl-duration').textContent,'30 min');
  assert.equal(elements.get('.sched-tl-hour').textContent,'23:45');assert.ok(elements.get('.sched-tl-subtitle').textContent.includes(translateText('Fin al día siguiente')));
  elements.get('.block-start-input').value='00:30';elements.get('.block-end-input').value='01:15';
  assert.equal(updateScheduleRowSummary(row),45);assert.ok(elements.get('.sched-tl-subtitle').textContent.includes(translateText('Inicio al día siguiente')));
});

test('a day off has no active blocks in its schedule preview',()=>{
  assert.deepEqual(schedulePreviewRows({off:true,start:'08:00',end:'16:00',blocks:[{start:'08:00',dur:480}]}),[]);
});
