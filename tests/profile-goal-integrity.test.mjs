import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parse} from 'acorn';
import {confirmSchedulePlan} from '../js/shift-work-review.js';

const declarations=(file,names)=>{
 const source=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
 const nodes=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.map(n=>n.declaration||n);
 return names.map(name=>{const node=nodes.find(n=>n.id?.name===name);assert.ok(node,name);return source.slice(node.start,node.end);}).join('\n');
};
const copy=value=>JSON.parse(JSON.stringify(value));
const ui=(strings,...values)=>strings.reduce((out,s,i)=>out+s+(values[i]??''),'');

test('rejected general goal update preserves settings, state and the complete persisted snapshot',()=>{
 const h=vm.createContext({settings:{productiveGoalMin:360,earningsGoal:43.2,dailyGoalOverrides:{day:{min:1,usd:1}}},state:{productiveGoalMin:360,earningsGoal:43.2},
  snapshotHistoricalPlanning(){h.state.history={day:'old-plan'};},setDailyGoalOverride(){delete h.settings.dailyGoalOverrides.day;},
  setAppSettings:value=>{h.settings=value;},setAppState:value=>{h.state=value;},
  saveStateOnly(){h.disk.state=copy(h.state);return true;},saveSettingsOnly:()=>false,saveAll:()=>false,
  onGameDayMetadataChanged(){throw Error('Award after failed save');},refreshGoalInputs(){},render(){},toast(){},translateText:x=>x,
 });
 h.disk=copy({state:h.state,settings:h.settings});const before=copy(h.disk);
 vm.runInContext(declarations('js/settings.js',['applyGoalValues']),h);
 assert.equal(h.applyGoalValues(120,14.4,'global','day'),false);
 assert.deepEqual(copy(h.state),before.state);assert.deepEqual(copy(h.settings),before.settings);assert.deepEqual(copy(h.disk),before);
});

test('rejected daily goal removal restores the override and its historical snapshot',()=>{
 const h=vm.createContext({settings:{dailyGoalOverrides:{day:{min:120,usd:14.4}}},state:{planning:{day:'before'}},
  getActiveDayKey:()=> 'day',getDailyGoalOverride:()=>({min:120,usd:14.4}),
  setDailyGoalOverride(){delete h.settings.dailyGoalOverrides.day;h.state.planning.day='changed';},saveAll:()=>false,
  setAppSettings:value=>{h.settings=value;},setAppState:value=>{h.state=value;},refreshGoalInputs(){},render(){},
  onGameDayMetadataChanged(){throw Error('Award after failed save');},
 });
 const before=copy({settings:h.settings,state:h.state});
 vm.runInContext(declarations('js/settings.js',['clearActiveDayGoalOverride']),h);
 assert.equal(h.clearActiveDayGoalOverride(),false);assert.deepEqual(copy({settings:h.settings,state:h.state}),before);
});

function profileHarness(){
 const elements=Object.fromEntries(['accountUsernameInput','accountEmailInput','accountProfileStatus','saveAccountProfileBtn'].map(id=>[id,{value:id.includes('Username')?'new_name':'a@example.test',textContent:'',disabled:false}]));
 const queued=[];const updates=[],emailUpdates=[];
 const h=vm.createContext({ui,translateText:x=>x,settings:{owner:'A'},EMAIL_AUTH_READY:false,
  document:{activeElement:null,getElementById:id=>elements[id]},getSession:async()=>({user:{id:'A'}}),
  getProfile:()=>new Promise(resolve=>queued.push(resolve)),getUser:async()=>({id:'A',email:'a@example.test'}),
  updateUsername:async value=>updates.push(value),updateEmail:async value=>emailUpdates.push(value),authErrorMessage:()=> 'error',toast:()=>{},
 });
 vm.runInContext('let profileRequestVersion = 0;\n'+declarations('js/settings.js',['syncAccountProfileFields','saveAccountProfile']),h);
 return {h,elements,queued,updates,emailUpdates};
}

test('Google account profile keeps email read-only and never submits a manipulated email field',async()=>{
 const x=profileHarness();const load=x.h.syncAccountProfileFields();
 await new Promise(resolve=>setImmediate(resolve));
 x.queued.shift()({username:'current_name',user_id:'A'});await load;
 assert.equal(x.elements.accountEmailInput.readOnly,true);
 x.elements.accountUsernameInput.value='edited_name';
 x.elements.accountEmailInput.value='other@example.invalid';
 const save=x.h.saveAccountProfile();await new Promise(resolve=>setImmediate(resolve));
 x.queued.shift()({username:'current_name',user_id:'A'});await save;
 assert.deepEqual(x.updates,['edited_name']);assert.deepEqual(x.emailUpdates,[]);
});

test('profile save never applies the old form after the active account changes while reading',async()=>{
 const x=profileHarness();const pending=x.h.saveAccountProfile();
 await new Promise(resolve=>setImmediate(resolve));
 x.h.settings={owner:'B'};x.elements.accountProfileStatus.textContent='B-current';
 x.queued.shift()({username:'old_name',user_id:'A'});await pending;
 assert.deepEqual(x.updates,[]);assert.equal(x.elements.accountProfileStatus.textContent,'B-current');
});

test('late profile reads cannot replace a newer account or a username edited during loading',async()=>{
 const x=profileHarness();const pending=x.h.syncAccountProfileFields();
 await new Promise(resolve=>setImmediate(resolve));
 x.elements.accountUsernameInput.value='draft-after-loading';
 x.queued.shift()({username:'old_name',user_id:'A'});await pending;
 assert.equal(x.elements.accountUsernameInput.value,'draft-after-loading');
 const again=x.h.syncAccountProfileFields();await new Promise(resolve=>setImmediate(resolve));
 x.h.settings={owner:'B'};x.elements.accountUsernameInput.value='B-current';
 x.queued.shift()({username:'A-old',user_id:'A'});await again;
 assert.equal(x.elements.accountUsernameInput.value,'B-current');
});

test('reopening profile cancels an older save and restores its button without stale feedback',async()=>{
 const x=profileHarness();const save=x.h.saveAccountProfile();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(x.elements.saveAccountProfileBtn.disabled,true);
 const load=x.h.syncAccountProfileFields();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(x.elements.saveAccountProfileBtn.disabled,false);
 x.queued[1]({username:'current_name',user_id:'A'});await load;
 x.queued[0]({username:'old_name',user_id:'A'});await save;
 assert.deepEqual(x.updates,[]);assert.equal(x.elements.accountProfileStatus.textContent,'');
});

function installScheduleReview(h) {
 h.scheduleOffsetMin=0;h.canPersistLocalChanges=()=>true;h.escapeHtml=String;h.timeLabel=String;
 h.scheduleWeekStartDate=()=>new Date(2026,9,19);h.scheduleWeekIsPast=()=>false;h.defaultDaySchedule=()=>({off:true});
 h.loadDetailViews=async()=>({confirmSchedulePlan:(context,plan,change)=>{
  const prior=globalThis.document;globalThis.document={getElementById:()=>({})};
  try{return confirmSchedulePlan(context,plan,change);}finally{if(prior===undefined)delete globalThis.document;else globalThis.document=prior;}
 }});
 vm.runInContext(declarations('js/schedule.js',['reviewScheduleChange']),h);
}

for(const name of ['saveShiftWindow','copyDayToAll','copyDayToWeekend'])test(`${name} preserves the plan and historical snapshots when storage rejects`,async()=>{
 const h=vm.createContext({ui,translateText:x=>x,
  settings:{weeklySchedule:{mon:{start:'06:00',end:'14:00',blocks:[]}},shiftStart:'06:00',shiftEnd:'14:00'},state:{history:'before'},
  scheduleViewMode:'template',scheduleWeekOffset:0,scheduleEditDay:'mon',WEEKDAYS:['mon','tue','wed','thu','fri','sat','sun'],WEEKDAY_LABELS:{mon:'Monday'},
  blockRowsWithEqualTimes:()=>[],readScheduleFormAsConfig:()=>({start:'08:00',end:'16:00',blocks:[]}),validateDayConfig:()=>({valid:true}),
  snapshotHistoricalPlanning(){h.state.history='changed';},activeScheduleTarget:()=>h.settings.weeklySchedule,
  saveSettingsOnly:()=>false,saveAll:()=>false,onGameDayMetadataChanged(){throw Error('Award after failure');},
  appConfirm:(_message,apply)=>apply(),renderDayTabs(){},toast(){},todayCallDateKey:()=> 'today',document:{getElementById:()=>null},
 });
 const before=copy({settings:h.settings,state:h.state});
 installScheduleReview(h);vm.runInContext(declarations('js/schedule.js',['persistScheduleMutation',name]),h);await h[name]();
 assert.deepEqual(copy({settings:h.settings,state:h.state}),before);
});

test('schedule copy confirmation does not apply an old draft after the selected day changes',async()=>{
 for(const name of ['copyDayToAll','copyDayToWeekend']){
  let confirm,mutations=0;
  const h=vm.createContext({ui,translateText:x=>x,settings:{weeklySchedule:{}},scheduleViewMode:'template',scheduleWeekOffset:0,scheduleEditDay:'mon',WEEKDAY_LABELS:{mon:'Monday'},WEEKDAYS:['mon','tue','wed','thu','fri','sat','sun'],
   blockRowsWithEqualTimes:()=>[],readScheduleFormAsConfig:()=>({start:'08:00',end:'16:00',blocks:[]}),validateDayConfig:()=>({valid:true}),
   appConfirm:(_message,callback)=>{confirm=callback;},persistScheduleMutation(){mutations++;},activeScheduleTarget:()=>h.settings.weeklySchedule,toast(){},document:{getElementById:()=>null},
  });
  installScheduleReview(h);vm.runInContext(declarations('js/schedule.js',[name]),h);await h[name]();h.scheduleEditDay='tue';confirm();assert.equal(mutations,0);
 }
});

function authHarness(){
 const updates=[];let active='A',result={data:{user_id:'A'},error:null},afterRead=()=>{};
 const query={update:value=>{updates.push(value);return query;},select:()=>query,eq:(field,id)=>{updates.push({field,id});return query;},maybeSingle:async()=>{afterRead();return result;}};
 const h=vm.createContext({getSession:async()=>active?{user:{id:active}}:null,
  getSupabase:()=>({from:()=>query,auth:{getUser:async()=>({data:{user:{id:active}},error:null}),updateUser:async value=>{updates.push(value);return{error:null};}}}),
  window:{},USERNAME_RE:/^[a-zA-Z0-9_.]{3,24}$/,
 });
 vm.runInContext(declarations('js/auth.js',['AuthError','assertAccount','getUser','getProfile','updateUsername','updatePassword']),h);
 return{h,updates,setUser:value=>{active=value;},setResult:value=>{result=value;},afterRead:fn=>{afterRead=fn;}};
}

test('username update requires the matching returned row and preserves uniqueness errors',async()=>{
 const x=authHarness();x.setResult({data:null,error:null});
 await assert.rejects(x.h.updateUsername('new_name','A'),{code:'PROFILE_SAVE_FAILED'});
 x.setResult({data:{user_id:'B'},error:null});
 await assert.rejects(x.h.updateUsername('new_name','A'),{code:'PROFILE_SAVE_FAILED'});
 x.setResult({data:null,error:{code:'23505'}});
 await assert.rejects(x.h.updateUsername('new_name','A'),{code:'USERNAME_TAKEN'});
 x.setResult({data:{user_id:'A'},error:null});assert.equal(await x.h.updateUsername('new_name','A'),true);
 assert.ok(x.updates.some(value=>value.field==='user_id'&&value.id==='A'));
});

test('profile reads and writes reject a different authenticated user before applying a form',async()=>{
 const x=authHarness();x.setUser('B');
 await assert.rejects(x.h.updateUsername('new_name','A'),{code:'NOT_AUTHENTICATED'});
 await assert.rejects(x.h.getUser('A'),{code:'NOT_AUTHENTICATED'});
 assert.deepEqual(x.updates,[]);
 x.setUser('A');x.afterRead(()=>x.setUser('B'));
 await assert.rejects(x.h.getProfile('A'),{code:'NOT_AUTHENTICATED'});
});

test('recovery password update requires its original account and never writes for another session',async()=>{
 const x=authHarness();x.setUser('B');
 await assert.rejects(x.h.updatePassword('synthetic-password','A'),{code:'NOT_AUTHENTICATED'});
 assert.deepEqual(x.updates,[]);x.setUser('A');
 assert.equal(await x.h.updatePassword('synthetic-password','A'),true);
 assert.equal(x.updates.length,1);
});

test('overlapping profile loads only apply the newest result and never erase a later draft',async()=>{
 const x=profileHarness();const first=x.h.syncAccountProfileFields();
 await new Promise(resolve=>setImmediate(resolve));
 const second=x.h.syncAccountProfileFields();
 await new Promise(resolve=>setImmediate(resolve));
 x.queued[1]({username:'newer-name',user_id:'A'});await second;
 x.queued[0]({username:'older-name',user_id:'A'});await first;
 assert.equal(x.elements.accountUsernameInput.value,'newer-name');
});

test('public session card never mixes a stale user with a profile returned after account switching',async()=>{
 let user='A';const shown=[];
 const h=vm.createContext({translateText:x=>x,isConfigured:()=>true,showView(){},showMessage(){},onAuthChange(){},
  params:{get:()=>null},sessionStorage:{removeItem(){}},getSession:async()=>({user:{id:user}}),
  getProfile:async()=>{user='B';return{username:'B-profile'};},showSessionCard:(profile,account)=>shown.push({profile,account}),
  recoveryMode:false,recoveryUserId:null,PENDING_KEY:'pending',stayOnLanding:true,bouncedBackFromApp:()=>false,authErrorMessage:()=> 'error',
 });
 vm.runInContext(declarations('js/landing.js',['init']),h);await h.init();assert.deepEqual(shown,[]);
});
