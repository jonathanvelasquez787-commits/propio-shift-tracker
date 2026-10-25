import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {reportDayAssessment,cycleProjectionFromCalendarDays,configureReportsContext,renderReportsDashboard} from '../js/reports.js';
import {configureCalendarContext,calDayStatus} from '../js/calendar.js';
import {accountingCsvContent,accountingPdfDocument} from '../js/accounting-export.js';
import {ui,translateText,setLanguage} from '../js/i18n.js';

test('daily conclusions distinguish missing records and days off from a recorded day below its goal',()=>{
 const base={isOff:false,hasShift:false,callCount:0,productiveMin:0,goalMin:360};
 assert.equal(reportDayAssessment(base).kind,'nodata');assert.equal(reportDayAssessment({...base,isOff:true}).kind,'off');
 assert.equal(reportDayAssessment({...base,hasShift:true}).kind,'progress');
 assert.equal(reportDayAssessment({...base,callCount:1,productiveMin:360}).kind,'met');
 assert.equal(reportDayAssessment({...base,isOff:true,callCount:1,productiveMin:10}).kind,'off');
 assert.equal(reportDayAssessment({...base,hasShift:true,goalMin:0}).kind,'met');
 assert.equal(reportDayAssessment({...base,hasShift:true,productiveMin:100}).remainingMin,260);
});

test('cycle projection uses elapsed calendar days including today rather than worked days or hours',()=>{
 assert.deepEqual(cycleProjectionFromCalendarDays(200,4),{projected:700,dailyAvg:50,daysElapsed:4,daysRemaining:10});
 assert.equal(cycleProjectionFromCalendarDays(100,0).projected,1400);
 assert.equal(cycleProjectionFromCalendarDays(100,20).projected,100);
 assert.equal(cycleProjectionFromCalendarDays(0,3).projected,0);
});

test('accounting export leaves adherence unknown when there are no shift or call records',()=>{
 const source=fs.readFileSync(new URL('../js/app-main.js',import.meta.url),'utf8'),code=source.slice(source.indexOf('    function accountingExportDays('),source.indexOf('    function csvField('));
 const context={Date,todayCallDateKey:date=>String(date.getDate()),callsForDay:()=>[],importedCallStats:()=>({earnings:0}),dayIsEffectivelyOff:()=>false,dayShiftBounds:()=>({start:null}),dayAdherence:()=>({scorePct:0}),productiveMinutesForDay:()=>0};
 const days=vm.runInNewContext(code+';accountingExportDays({start:new Date(2026,9,1),end:new Date(2026,9,2)})',context);
 assert.equal(days.length,2);assert.equal(days[0].adherence,null);assert.equal(days[1].adherence,null);
});

test('calendar status keeps no-data days distinct from recorded zero-minute work and planned days off',()=>{
 configureCalendarContext({dayIsEffectivelyOff:day=>day==='off',dayShiftBounds:day=>({start:day==='zero-work'?'recorded':null}),callsForDay:day=>day==='call'?[{}]:[]});
 assert.equal(calDayStatus('off'),'off');assert.equal(calDayStatus('empty'),'nodata');assert.equal(calDayStatus('zero-work'),'normal');assert.equal(calDayStatus('call'),'normal');
});

test('report cards do not turn missing activity or a day off into missing minutes and money',t=>{
 setLanguage('es');const previous=globalThis.document,elements=new Map(['rptDashboard','rptDayConclusion','rptGoalsGrid','rptSecGoals','rptGoalsStatus','rptGoalsComparison','rptAdherenceHistoryContent'].map(id=>[id,{innerHTML:''}]));
 globalThis.document={getElementById:id=>elements.get(id)||null};t.after(()=>{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;});
 let off=false;
 configureReportsContext({todayRange:()=>new Date(2026,9,19),dayConfigFor:()=>({}),getActiveDayKey:()=> '10/19/2026',todayCallDateKey:()=> '10/19/2026',callDateToDate:()=>new Date(2026,9,19),previousCalendarDay:date=>new Date(date.getTime()-86400000),callsForDay:()=>[],importedCallStats:()=>({earnings:0}),productiveMinutesForDay:()=>0,dayAdherence:()=>null,dayShiftBounds:()=>({start:null}),dayIsEffectivelyOff:()=>off,effectiveDailyGoal:()=>({min:360,usd:43.2}),escapeHtml:String,iconHtml:()=>'',formatMinutes:String,money:value=>'$'+value,financeConvertedInline:()=>'',convertedAmountText:()=>''});
 renderReportsDashboard();assert.match(elements.get('rptDayConclusion').innerHTML,/Sin actividad registrada/);assert.doesNotMatch(elements.get('rptGoalsGrid').innerHTML,/Faltan|Meta alcanzada/);
 off=true;renderReportsDashboard();assert.match(elements.get('rptGoalsStatus').textContent,/Día libre: meta sin evaluar/);assert.doesNotMatch(elements.get('rptGoalsGrid').innerHTML,/Faltan/);
 assert.equal(elements.get('rptGoalsComparison').hidden,false);assert.doesNotMatch(elements.get('rptGoalsGrid').innerHTML,/Sin comparación disponible|<details/);
});

function context(){
 setLanguage('es');
 const source=fs.readFileSync(new URL('../js/app-main.js',import.meta.url),'utf8');
 const code=source.slice(source.indexOf('    function csvField('),source.indexOf('    async function prepareAccountingExport(')).trim();
 return {ui,translateText,displayLocale:()=> 'es',escapeHtml:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'),
  formatCallDayLabel:String,formatMinutes:String,money:value=>'$'+value.toFixed(2),fmtDate:()=> '19/10/2026',parseMoney:Number,higherRateBonusForCall:call=>({amount:call.higherRateBonus||0}),csvField:vm.runInNewContext('('+code+')')};
}

test('CSV scope separates base, bonus and total and keeps spreadsheet formulas inert',()=>{
 const ctx=context(),call={customerId:'=WEBSERVICE("bad")',callStart:'08:00 AM',durationMin:10,pay:1.2,higherRateBonus:.3,billable:'Yes',dropped:'No'};
 const days=[{dayKey:'10/19/2026',dayCalls:[call],productive:10,adherence:{scorePct:95},stats:{earnings:1.5}}],before=JSON.stringify(days),csv=accountingCsvContent(ctx,{label:'Test'},days);
 assert.match(csv,/Moneda,USD/);assert.match(csv,/Pago base \(\$\),Higher Rate \(\$\),Total \(\$\)/);
 assert.match(csv,/1.20,0.30,1.50/);assert.match(csv,/'=WEBSERVICE/);assert.match(csv,/No confirma dinero recibido/);assert.equal(JSON.stringify(days),before);
});

test('CSV translates every accounting heading when English is selected',()=>{
 const ctx=context();setLanguage('en');const csv=accountingCsvContent(ctx,{label:'Cycle'},[]);
 assert.match(csv,/Scope,/);assert.match(csv,/Adherence \(%\)/);assert.match(csv,/Earnings \(\$\)/);assert.match(csv,/Base pay \(\$\)/);assert.doesNotMatch(csv,/Alcance|Adherencia|Ganancias|Pago base/);
 setLanguage('es');
});

test('PDF displays the selected scope, totals and safe call text without inline event handlers',()=>{
 const ctx=context(),call={customerId:'<img src=x onerror=alert(1)>',callStart:'08:00 AM',durationMin:10,pay:1.2,higherRateBonus:.3,billable:'Yes',dropped:'No'};
 const html=accountingPdfDocument(ctx,{label:'<script>bad</script>'},[{dayKey:'10/19/2026',dayCalls:[call],productive:10,adherence:null,stats:{earnings:1.5}}]);
 assert.match(html,/&lt;script&gt;/);assert.match(html,/&lt;img/);assert.doesNotMatch(html,/<script|<img/);assert.match(html,/Higher Rate/);assert.match(html,/\$1.50/);assert.match(html,/>USD|· USD/);assert.doesNotMatch(html,/<[^>]+\son\w+=/i);
});

function exportController(overrides={}){
 const source=fs.readFileSync(new URL('../js/app-main.js',import.meta.url),'utf8'),code=source.slice(source.indexOf('    async function prepareAccountingExport('),source.indexOf('    function exportAccountingCsv('));
 const data=[{dayCalls:[{pay:1.2,higherRateBonus:.3}],productive:10,stats:{earnings:1.5}}];
 const ctx=vm.createContext({...context(),settings:{},structuredClone,accountingExportRange:()=>({label:'Selected cycle'}),accountingExportDays:()=>data,window:{open:()=>null},toast(){},...overrides});
 return {data,ctx,run:kind=>vm.runInContext(code+';prepareAccountingExport("'+kind+'")',ctx)};
}

test('failed lazy export or changed accounts close the placeholder without exporting another account',async()=>{
 let closed=0,exported=0,resolve;const popup={close:()=>closed++};
 const h=exportController({window:{open:()=>popup},loadDetailViews:()=>new Promise(done=>{resolve=done;})});
 const first=h.run('pdf');resolve(null);await first;assert.equal(closed,1);assert.equal(exported,0);
 const second=h.run('pdf');h.ctx.settings={otherAccount:true};resolve({exportAccountingDocument:()=>exported++});await second;assert.equal(closed,2);assert.equal(exported,0);
});

test('export snapshots call amounts and bonuses before the optional document module loads',async()=>{
 let resolve,exported,bonus=.3;
 const h=exportController({higherRateBonusForCall:()=>({amount:bonus}),loadDetailViews:()=>new Promise(done=>{resolve=done;})});
 const pending=h.run('csv');h.data[0].dayCalls[0].pay=99;bonus=10;
 resolve({exportAccountingDocument:(ctx,kind,range,days)=>{exported={kind,range,days,csv:accountingCsvContent(ctx,range,days)};}});await pending;
 assert.equal(exported.kind,'csv');assert.equal(exported.days[0].dayCalls[0].pay,1.2);assert.equal(exported.days[0].dayCalls[0].accountingBonusUsd,.3);assert.match(exported.csv,/1.20,0.30,1.50/);
 assert.equal(Object.hasOwn(h.data[0].dayCalls[0],'accountingBonusUsd'),false);
});
