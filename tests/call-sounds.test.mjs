import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parse} from 'acorn';
import {ui,translateText,setLanguage} from '../js/i18n.js';
const source=fs.readFileSync(new URL('../js/app-main.js',import.meta.url),'utf8');
const nodes=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.map(n=>n.declaration||n);
const declarations=new Map(nodes.filter(n=>n.type==='FunctionDeclaration').map(n=>[n.id.name,source.slice(n.start,n.end)]));
const config=nodes.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name==='ALARM_SOUND_CONFIGS'));
function harness(){
  setLanguage('es');const fields=new Map(),played=[],readers=[],messages=[];let failed=false,budget=true;
  const field=id=>{if(!fields.has(id))fields.set(id,{value:'classic',checked:false,disabled:false,style:{},textContent:''});return fields.get(id);};
  const context=vm.createContext({settings:{masterVolume:60,callEndedSoundEnabled:false,callEndedAlarmSound:'classic',callEndedAlarmCustomSoundDataUrl:'',callEndedAlarmCustomSoundName:''},ui,translateText,document:{getElementById:field},saveSettingsOnly:()=>!failed,settingsWithinBudget:()=>budget,toast:(m,o)=>messages.push({message:m,options:o}),playShiftAlarmBeep:()=>played.push('classic'),playProductiveBreakChimeTone:()=>played.push('chime'),MAX_CUSTOM_SOUND_BYTES:300*1024,Audio:class{constructor(url){this.url=url;}play(){played.push({url:this.url,volume:this.volume});return Promise.resolve();}},FileReader:class{constructor(){readers.push(this);}readAsDataURL(file){this.file=file;}}});
  const names=['getMasterVolumeFraction','playConfiguredAlarmSound','playCallSavedSound','syncAlarmCustomSoundUI','updateAlarmSound','updateCallSoundEnabled','clearAlarmCustomSound','handleAlarmSoundFile','testAlarmSound'];
  vm.runInContext(source.slice(config.start,config.end)+'\nconst alarmSoundReadVersions=new Map();\n'+names.map(n=>declarations.get(n)).join('\n'),context);
  const run=code=>vm.runInContext(code,context);
  const upload=(name='confirm.wav',size=512,type='audio/wav')=>{context.event={target:{value:'selected',files:[{name,size,type}]}};run("handleAlarmSoundFile('callEnded',event)");};
  const complete=(reader=readers.at(-1))=>{reader.result='data:audio/wav;base64,AAAA';reader.onload();};
  return{context,field,played,readers,messages,run,upload,complete,reject:()=>{failed=true;},budgetReject:()=>{budget=false;}};
}
test('call sounds are independent and opt-in with previews and master-volume mute',()=>{
  const h=harness();h.run("playCallSavedSound('callEnded'); playCallSavedSound('callPasted')");assert.deepEqual(h.played,[]);
  h.run("testAlarmSound('callEnded')");assert.deepEqual(h.played,['classic']);h.played.length=0;
  h.context.settings.callEndedSoundEnabled=true;h.context.settings.callEndedAlarmSound='chime';h.run("playCallSavedSound('callPasted'); playCallSavedSound('callEnded')");assert.deepEqual(h.played,['chime']);
  h.context.settings.masterVolume=0;h.run("playCallSavedSound('callEnded'); testAlarmSound('callEnded')");assert.deepEqual(h.played,['chime']);
});
test('custom call playback scales volume and falls back when browser audio rejects',async()=>{
  const h=harness();Object.assign(h.context.settings,{callEndedSoundEnabled:true,callEndedAlarmSound:'custom',callEndedAlarmCustomSoundDataUrl:'data:audio/wav;base64,AAAA'});
  h.run("playCallSavedSound('callEnded')");assert.deepEqual(h.played,[{url:'data:audio/wav;base64,AAAA',volume:.6}]);
  h.context.Audio=class{play(){return Promise.reject(new Error('blocked'));}};h.run("playCallSavedSound('callEnded')");await Promise.resolve();assert.equal(h.played.at(-1),'classic');
});
test('rejected call toggle selector and file removal restore their persisted controls',()=>{
  const h=harness();h.reject();h.field('callEndedSoundEnabledInput').checked=true;h.run("updateCallSoundEnabled('callEnded')");assert.equal(h.context.settings.callEndedSoundEnabled,false);assert.equal(h.field('callEndedSoundEnabledInput').checked,false);
  h.field('callEndedAlarmSoundInput').value='chime';h.run("updateAlarmSound('callEnded')");assert.equal(h.context.settings.callEndedAlarmSound,'classic');assert.equal(h.field('callEndedAlarmSoundInput').value,'classic');
  Object.assign(h.context.settings,{callEndedAlarmSound:'custom',callEndedAlarmCustomSoundDataUrl:'data:audio/wav;base64,OLD=',callEndedAlarmCustomSoundName:'old.wav'});const before=JSON.stringify(h.context.settings);h.run("clearAlarmCustomSound('callEnded')");assert.equal(JSON.stringify(h.context.settings),before);assert.equal(h.messages.at(-1).options.persistenceFailure,true);
});
test('call audio upload rejects nonaudio oversized files and total settings overflow',()=>{
  const h=harness();h.upload('bad.txt',100,'text/plain');h.upload('large.wav',300*1024+1);assert.equal(h.readers.length,0);
  const before=JSON.stringify(h.context.settings);h.budgetReject();h.upload();h.complete();assert.equal(JSON.stringify(h.context.settings),before);assert.match(h.messages.at(-1).message,/espacio disponible/);
});
test('rejected call audio upload preserves the previous file and failure feedback',()=>{
  const h=harness();Object.assign(h.context.settings,{callEndedAlarmSound:'custom',callEndedAlarmCustomSoundDataUrl:'data:audio/wav;base64,OLD=',callEndedAlarmCustomSoundName:'old.wav'});const before=JSON.stringify(h.context.settings);h.reject();h.upload();h.complete();assert.equal(JSON.stringify(h.context.settings),before);assert.match(h.messages.at(-1).message,/anterior se conservó/);assert.equal(h.field('callEndedAlarmSoundInput').value,'custom');
});
test('async audio uploads cannot cross owners or overtake newer files or sound selections',()=>{
  const h=harness();h.upload('first.wav');const first=h.readers.at(-1);h.upload('second.wav');h.complete(first);assert.equal(h.context.settings.callEndedAlarmCustomSoundName,'');h.complete();assert.equal(h.context.settings.callEndedAlarmCustomSoundName,'second.wav');
  h.upload('late.wav');h.field('callEndedAlarmSoundInput').value='chime';h.run("updateAlarmSound('callEnded')");h.complete();assert.equal(h.context.settings.callEndedAlarmSound,'chime');assert.equal(h.context.settings.callEndedAlarmCustomSoundName,'second.wav');
  h.upload('other.wav');h.context.settings={masterVolume:50};h.complete();assert.equal(h.context.settings.callEndedAlarmCustomSoundName,undefined);
});
test('upload and removal keep the independent enabled switch and update the custom file UI',()=>{
  const h=harness();h.context.settings.callEndedSoundEnabled=true;h.upload();h.complete();assert.equal(h.context.settings.callEndedAlarmSound,'custom');assert.equal(h.context.settings.callEndedAlarmCustomSoundName,'confirm.wav');assert.equal(h.field('callEndedAlarmCustomSoundSection').style.display,'');
  h.run("clearAlarmCustomSound('callEnded')");assert.equal(h.context.settings.callEndedAlarmSound,'classic');assert.equal(h.context.settings.callEndedAlarmCustomSoundDataUrl,'');assert.equal(h.context.settings.callEndedSoundEnabled,true);assert.equal(h.field('clearCallEndedSoundBtn').disabled,true);
});
