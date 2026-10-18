import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createAutomationStatus, validateAutomationStatus, automationStatusView } from '../js/automation-status.js';
import { installPropioBridge } from '../js/propio-bridge.js';
import { createBridgeWorker } from '../extension/propio-bridge/bridge-worker.js';
import { TRACKER_ORIGIN } from '../js/propio-bridge-rules.js';
import { installAutomationStatusUi } from '../js/automation-ui.js';
import { setLanguage } from '../js/i18n.js';

const now = Date.parse('2026-10-18T14:00:50Z'), iso = value => new Date(value).toISOString(), scope = 'a'.repeat(64);
function state(){ return { mode:'auto',accountScope:scope,tabs:{1:{session:'authenticated',documentId:'portal-document-12345',call:'idle',seenAt:iso(now)}},queue:[],
 preparation:{enabled:true,availabilityPaused:false,waitReason:'spacing',resume:{break:true,lunch:false,mode:'manual'},
 spacing:{enabled:true,minutes:3,waitUntil:iso(now+130000)},plan:{startAt:iso(now-3600000),endAt:iso(now+3600000),scheduleVerified:true,
 acw:{startedAt:iso(now-50000),observedAt:iso(now)},scheduledPauses:[]}},attention:null }; }

test('automation status exports a bounded view without call records or account details',()=>{
 const input=state();input.email='private@example.invalid';input.queue=[{customerId:'private-customer'}];input.preparation.plan.private='hidden';
 const before=structuredClone(input),snapshot=createAutomationStatus(input,now);
 assert.deepEqual(input,before);assert.equal(snapshot.queued,1);assert.equal(snapshot.options.minutes,3);
 assert.equal(JSON.stringify(snapshot).includes('private'),false);assert.equal(JSON.stringify(snapshot).includes(scope),false);
 assert.deepEqual(automationStatusView(snapshot,now),{key:'spacing',seconds:130});
});

test('display countdown waits for confirmation at its threshold and never invents availability',()=>{
 const snapshot=createAutomationStatus(state(),now);
 assert.equal(automationStatusView(snapshot,now+15001).key,'stale');
 const renewed={...snapshot,reportedAt:iso(now+130000),observedAt:iso(now+130000),acwObservedAt:iso(now+130000)};
 assert.deepEqual(automationStatusView(renewed,now+130000),{key:'confirming',seconds:null});
 assert.equal(automationStatusView({...renewed,reason:'available'},now+130000).key,'available');
});

test('fresh transport cannot disguise an old portal or ACW observation',()=>{
 const snapshot=createAutomationStatus(state(),now);
 assert.equal(automationStatusView({...snapshot,observedAt:iso(now-15001)},now).key,'stale');
 assert.equal(automationStatusView({...snapshot,observedAt:iso(now+1)},now).key,'stale');
 assert.equal(automationStatusView({...snapshot,acwObservedAt:iso(now-15001)},now).key,'acw-pending');
 assert.equal(automationStatusView({...snapshot,waitUntil:null},now).key,'acw-pending');
 for(const reportedAt of [iso(now-15001),iso(now+1),'invalid'])assert.equal(validateAutomationStatus({...snapshot,reportedAt},now),null);
});

test('a new unknown portal observation cannot revive a stale authenticated call',()=>{
 const input=state();input.tabs[1].seenAt=iso(now-16000);input.tabs[1].call='connected';
 input.tabs[2]={session:'unknown',documentId:'other-document-1234',call:'unknown',seenAt:iso(now)};
 const snapshot=createAutomationStatus(input,now);assert.equal(snapshot.portal,'unknown');assert.equal(snapshot.call,'unknown');
 assert.equal(automationStatusView(snapshot,now).key,'connection');
});

test('automation status preserves off, manual, review, active call and shift priorities',()=>{
 const snapshot=createAutomationStatus(state(),now);
 for(const[change,key]of [[{recording:false},'recording-off'],[{paused:true},'manual-paused'],[{review:true},'review'],
  [{portal:'logged-out'},'connection'],[{call:'connected'},'in-call'],[{call:'incoming'},'incoming'],
  [{reason:'shift-ended'},'shift-ended'],[{reason:'pause',pauseType:'break'},'pause'],[{reason:'pause-return-off'},'pause-return-off']])
  assert.equal(automationStatusView({...snapshot,...change},now).key,key);
 assert.equal(automationStatusView({...snapshot,reason:'before-shift',startAt:iso(now-1)},now).key,'confirming');
 assert.equal(automationStatusView({...snapshot,reason:'before-shift',options:{...snapshot.options,first:false}},now).key,'before-shift-manual');
 assert.equal(automationStatusView({...snapshot,reason:'before-shift',options:{...snapshot.options,first:false,spacing:false,break:false,lunch:false}},now).key,'off');
 assert.equal(automationStatusView(null,now).key,'missing');
 assert.equal(automationStatusView({...snapshot,review:true,recording:false},now).key,'review');
});

test('malformed automation options are rejected and extraneous fields are stripped',()=>{
 const snapshot=createAutomationStatus(state(),now);
 for(const minutes of [0,61,1.5,'3'])assert.equal(validateAutomationStatus({...snapshot,options:{...snapshot.options,minutes}},now),null);
 assert.equal(validateAutomationStatus({...snapshot,options:{...snapshot.options,first:'true'}},now),null);
 assert.equal(validateAutomationStatus({...snapshot,portal:'<script>'},now),null);
 const safe=validateAutomationStatus({...snapshot,html:'<script>',reason:'unknown'},now);
 assert.equal(safe.html,undefined);assert.equal(safe.reason,'portal-state');
});

test('tracker status reads are account scoped, top-frame only and cannot invoke preparation',async()=>{
 const stored={...state(),schema:1};let writes=0;const before=structuredClone(stored);
 const api={runtime:{id:'extension-id',getURL:name=>'chrome-extension://extension-id/'+name},storage:{local:{get:async()=>({'bridge-v1':stored}),set:async()=>{writes++;}}}};
 const worker=createBridgeWorker(api,{now:()=>now});
 const sender={id:'extension-id',frameId:0,tab:{id:10},url:TRACKER_ORIGIN+'/app'},packet={kind:'tracker-status',accountScope:scope};
 const snapshot=await worker.message(packet,sender);assert.equal(snapshot.reason,'spacing');
 for(const change of [{frameId:1},{tab:undefined},{url:'https://evil.test'},{id:'other-extension'}])assert.equal(await worker.message(packet,{...sender,...change}),null);
 assert.equal(await worker.message({...packet,accountScope:'b'.repeat(64)},sender),null);
 assert.deepEqual(stored,before);assert.equal(writes,0);
});

test('automation status window packets require the current origin, source, scope and nonce',()=>{
 const posted=[],listeners=new Set(),received=[];
 const host={crypto:{randomUUID:()=> 'nonce-123456789012'},location:{origin:TRACKER_ORIGIN},
 postMessage:packet=>posted.push(packet),addEventListener:(_type,fn)=>listeners.add(fn),removeEventListener:(_type,fn)=>listeners.delete(fn)};
 const stop=installPropioBridge({host,accountScope:scope,receive:()=>{throw Error('Read-only status wrote an event');},onStatus:value=>received.push(value)});
 const packet={...posted[0],direction:'extension',kind:'automation-status',status:{version:1}};
 const dispatch=message=>[...listeners].forEach(fn=>fn(message)),message={source:host,origin:TRACKER_ORIGIN,data:packet};
 for(const change of [{source:{}},{origin:'https://evil.test'},{data:{...packet,accountScope:'b'.repeat(64)}},{data:{...packet,nonce:'older'}}])dispatch({...message,...change});
 assert.equal(received.length,0);dispatch(message);assert.equal(received.length,1);stop();dispatch(message);assert.equal(received.length,1);
});

test('content status response from an older document is never forwarded to a new account',async()=>{
 const source=fs.readFileSync(new URL('../extension/propio-bridge/tracker-content.js',import.meta.url),'utf8');
 const listeners=new Set(),posted=[],responses=[];let clock=now;
 const runtime={id:'extension-id',onMessage:{addListener(){},removeListener(){}},sendMessage:packet=> packet.kind==='tracker-status'?new Promise(resolve=>responses.push(resolve)):Promise.resolve({ok:true})};
 const host={top:null,postMessage:packet=>posted.push(packet),addEventListener:(type,fn)=>{if(type==='message')listeners.add(fn);},removeEventListener(){}};host.top=host;
 const h=vm.createContext({window:host,location:{origin:TRACKER_ORIGIN},chrome:{runtime},document:{addEventListener(){},removeEventListener(){}},Date:{now:()=>clock},setInterval:()=>1,clearInterval(){},setTimeout,clearTimeout,crypto:{randomUUID:()=> 'request-123456789012'}});
 vm.runInContext(source,h);
 const ready=(accountScope,nonce)=>{for(const fn of listeners)fn({source:host,origin:TRACKER_ORIGIN,data:{protocol:'pst-propio-bridge/v1',direction:'app',kind:'ready',accountScope,nonce,plan:null}});};
 ready(scope,'nonce-123456789012');clock+=5000;ready('b'.repeat(64),'nonce-other1234567');responses.shift()({version:1});await new Promise(resolve=>setImmediate(resolve));
 assert.equal(posted.some(packet=>packet.kind==='automation-status'),false);
});

function uiFixture(){
 let clock=now,tick,disconnected=false;
 const nodes=Object.fromEntries(['automationPanel','automationTitle','automationDetail','automationCountdown','automationTrackerCheck',
 'automationPortalCheck','automationScheduleCheck','automationFirstCheck','automationOptionsCheck','automationReturnsCheck',
 'automationConnectionCheck','automationWorkCheck','automationPauseCheck','pageHome'].map(id=>[id,{textContent:'',hidden:false}]));
 const host={document:{getElementById:id=>nodes[id]},setInterval:fn=>{tick=fn;return 1;},clearInterval:()=>{tick=null;},
 MutationObserver:class{observe(){}disconnect(){disconnected=true;}},addEventListener(){},removeEventListener(){}};
 let work=null;setLanguage('es');const view=installAutomationStatusUi({host,now:()=>clock,getWorkSession:()=>work});
 return {nodes,view,setWork(value){work=value;tick?.();},advance(ms){clock+=ms;tick?.();},get disconnected(){return disconnected;}};
}

test('rendered availability ages out, hides on other pages and never saves or starts a call',()=>{
 const x=uiFixture();x.view.update(createAutomationStatus(state(),now));
 assert.equal(x.nodes.automationCountdown.textContent,'2:10');assert.equal(x.nodes.automationCountdown.hidden,false);
 assert.equal(x.nodes.automationTitle.textContent,'Próximo intento de disponibilidad');
 x.nodes.pageHome.hidden=true;x.advance(1000);assert.equal(x.nodes.automationPanel.hidden,true);
 x.nodes.pageHome.hidden=false;x.advance(15000);assert.equal(x.nodes.automationCountdown.hidden,true);
 assert.equal(x.nodes.automationTitle.textContent,'Esperando una lectura reciente');
 x.view.stop();assert.equal(x.disconnected,true);x.view.update(createAutomationStatus(state(),now));
 assert.equal(x.nodes.automationCountdown.hidden,true);
});

test('rendered status ignores reordered snapshots and clears immediately when account status disappears',()=>{
 const x=uiFixture(),snapshot=createAutomationStatus(state(),now);
 x.view.update(snapshot);x.advance(1000);
 x.view.update({...snapshot,reportedAt:iso(now+1000),paused:true});
 x.view.update(snapshot);assert.equal(x.nodes.automationTitle.textContent,'Pausada por vos');
 x.view.update(null);assert.equal(x.nodes.automationTitle.textContent,'Esperando información de la extensión');
 assert.equal(x.nodes.automationCountdown.hidden,true);x.view.stop();
});

test('connection time is only exposed from a recognized portal and old packets remain compatible',()=>{
 const input=state();input.session={startedAt:iso(now-600000),sessionId:'private-session-id'};
 let snapshot=createAutomationStatus(input,now);assert.equal(snapshot.connectionAt,iso(now-600000));
 assert.equal(JSON.stringify(snapshot).includes('private-session-id'),false);
 input.tabs[1].session='unknown';assert.equal(createAutomationStatus(input,now).connectionAt,null);
 for(const connectionAt of [iso(now+1),'invalid',123])assert.equal(validateAutomationStatus({...snapshot,connectionAt},now).connectionAt,null);
 const {connectionAt,pauseActual,pauseEndsAt,...old}=snapshot;
 snapshot=validateAutomationStatus(old,now);assert.ok(snapshot);assert.equal(snapshot.connectionAt,null);assert.equal(snapshot.pauseActual,null);
});

test('active and scheduled pauses carry their own end time without reviving a completed scheduled pause',()=>{
 const input=state(),slot={type:'break',startedAt:iso(now-60000),endedAt:iso(now+600000)};input.preparation.plan.scheduledPauses=[slot];
 let snapshot=createAutomationStatus(input,now);assert.equal(snapshot.pauseActual,false);assert.equal(snapshot.pauseEndsAt,slot.endedAt);
 input.preparation.plan.pause={type:'lunch',startedAt:iso(now-30000),endsAt:iso(now+1800000)};
 snapshot=createAutomationStatus(input,now);assert.equal(snapshot.pauseType,'lunch');assert.equal(snapshot.pauseActual,true);assert.equal(snapshot.pauseEndsAt,input.preparation.plan.pause.endsAt);
 input.preparation.plan.pause=null;input.preparation.plan.lastPause={...slot,endedAt:iso(now-1)};
 assert.equal(createAutomationStatus(input,now).pauseType,null);
});

test('pause explanations distinguish manual return, timed close, missing duration and scheduled-only pauses',()=>{
 const x=uiFixture(),base={...createAutomationStatus(state(),now),reason:'pause',pauseType:'break',pauseActual:true,pauseEndsAt:iso(now+600000)};
 x.view.update(base);assert.match(x.nodes.automationDetail.textContent,/Terminá la pausa en la tool; después/);
 assert.match(x.nodes.automationReturnsCheck.textContent,/Break activado · Lunch apagado/);
 const timed={...base,options:{...base.options,timed:true}};x.view.update(timed);
 assert.match(x.nodes.automationDetail.textContent,/extensión intentará cerrar la pausa/);
 x.view.update({...timed,pauseEndsAt:iso(now-1)});assert.match(x.nodes.automationDetail.textContent,/Esperando confirmar su cierre/);
 x.view.update({...timed,pauseEndsAt:null});assert.match(x.nodes.automationDetail.textContent,/sin duración prevista confirmada/);
 assert.match(x.nodes.automationDetail.textContent,/Terminá la pausa en la tool/);
 x.view.update({...timed,pauseType:'lunch'});assert.match(x.nodes.automationDetail.textContent,/pulsá Start Calls/);
 x.view.update({...timed,pauseActual:false});assert.match(x.nodes.automationDetail.textContent,/programado hasta/);
 assert.match(x.nodes.automationDetail.textContent,/No hay una pausa activa/);
 x.view.update({...timed,paused:true});assert.equal(x.nodes.automationTitle.textContent,'Pausada por vos');
 assert.doesNotMatch(x.nodes.automationDetail.textContent,/intentará cerrar/);x.view.stop();
});

test('work start stays separate from observed connection and handles early calls, manual work and closed sessions',()=>{
 const x=uiFixture(),snapshot={...createAutomationStatus(state(),now),connectionAt:iso(now-1200000),startAt:iso(now+600000),reason:'before-shift'};
 x.setWork({startedAt:iso(now+600000),endedAt:null,manual:false});x.view.update(snapshot);
 assert.match(x.nodes.automationConnectionCheck.textContent,/Conexión a Propio detectada:/);
 assert.match(x.nodes.automationWorkCheck.textContent,/Inicio laboral previsto:/);
 assert.match(x.nodes.automationWorkCheck.textContent,/no suma ACW ni tiempo de trabajo/);
 x.setWork({startedAt:iso(now-60000),endedAt:null,manual:false});assert.doesNotMatch(x.nodes.automationWorkCheck.textContent,/llamada antes del horario/);
 x.setWork({startedAt:iso(now-60000),endedAt:null,manual:false,callAtStart:true});assert.match(x.nodes.automationWorkCheck.textContent,/llamada antes del horario/);
 x.setWork({startedAt:iso(now-60000),endedAt:null,manual:true});assert.match(x.nodes.automationWorkCheck.textContent,/Inicio laboral manual:/);
 x.setWork({startedAt:iso(now+600000),endedAt:iso(now-1)});assert.match(x.nodes.automationWorkCheck.textContent,/no sumó tiempo de trabajo/);
 x.setWork({startedAt:iso(now-600000),endedAt:iso(now-1)});assert.match(x.nodes.automationWorkCheck.textContent,/Cierre de sesión:/);
 x.advance(16000);assert.equal(x.nodes.automationConnectionCheck.textContent,'');
 x.setWork(null);assert.equal(x.nodes.automationWorkCheck.textContent,'');x.view.stop();
});
