import test from 'node:test';
import assert from 'node:assert/strict';
import {setAppSettings,setAppState,setAppCalls} from '../js/app-context.js';
import {configurePositiveReinforcementContext,createDefaultReinforcementState,normalizeReinforcementSettings,initPositiveReinforcement} from '../js/positive-reinforcement.js';

test('a personal reward editor cannot save or delete into a replacement owner or a newer reward revision',t=>{
 const oldDocument=globalThis.document,oldElement=globalThis.Element;
 t.after(()=>{globalThis.document=oldDocument;globalThis.Element=oldElement;setAppSettings({});setAppState(null);setAppCalls([]);});
 const nodes=new Map(),listeners=new Map();
 const ids=['physicalRewardEditorTitle','physicalRewardIconInput','physicalRewardNameInput','physicalRewardWindowInput','physicalRewardTriggerInput','physicalRewardEveryInput','physicalRewardMaxInput','physicalRewardAccumulationInput','physicalRewardDurationInput','physicalRewardCostInput','deletePhysicalRewardBtn','savePhysicalRewardBtn','physicalRewardEveryRow','physicalRewardCostConverted'];
 for(const id of ids)nodes.set(id,{value:'',hidden:false,textContent:'',addEventListener:(kind,handler)=>listeners.set(id+':'+kind,handler)});
 class Element{constructor(dataset){this.dataset=dataset;}closest(){return this;}}
 globalThis.Element=Element;globalThis.document={getElementById:id=>nodes.get(id)||null,addEventListener:(kind,handler)=>listeners.set(kind,handler),activeElement:null};
 const config=name=>({game:{enabled:false},reinforcement:normalizeReinforcementSettings({enabled:true,rewards:[{id:'same-id',name,window:'break',trigger:'calls',every:5}]})});
 const owner=config('First owner'),replacement=config('Second owner');
 setAppSettings(owner);setAppState({game:{reinforcement:createDefaultReinforcementState()}});setAppCalls([]);
 let writes=0;const messages=[];
 configurePositiveReinforcementContext({openModal:()=>{},closeModal:()=>{},saveSettingsOnly:()=>{writes++;return true;},toast:message=>messages.push(message),convertedAmountText:()=>'',escapeHtml:String,todayCallDateKey:()=> '10/20/2026'});
 initPositiveReinforcement();
 const edit=()=>listeners.get('click')({target:new Element({positiveAction:'edit-reward',rewardId:'same-id'})});
 edit();nodes.get('physicalRewardNameInput').value='Old form';setAppSettings(replacement);
 const before=structuredClone(replacement);
 listeners.get('savePhysicalRewardBtn:click')();assert.deepEqual(replacement,before);assert.equal(writes,0);
 listeners.get('deletePhysicalRewardBtn:click')();assert.deepEqual(replacement,before);assert.equal(writes,0);
 setAppSettings(owner);edit();owner.reinforcement.rewards[0].name='Newer value';
 listeners.get('savePhysicalRewardBtn:click')();assert.equal(owner.reinforcement.rewards[0].name,'Newer value');assert.equal(writes,0);
 listeners.get('deletePhysicalRewardBtn:click')();assert.equal(owner.reinforcement.rewards.length,1);assert.equal(writes,0);
 assert.ok(messages.length>=4);
});
