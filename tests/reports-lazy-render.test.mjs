import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {configureReportsContext,renderReportsMonthlyChart} from '../js/reports.js';

test('report call index is scoped to one read, preserves alternate sources and resets after errors',()=>{
 const source=fs.readFileSync(new URL('../js/app-main.js',import.meta.url),'utf8');
 const start=source.indexOf('function withReportCallReadIndex('),end=source.indexOf('\nexport function dayEvents(',start);
 let normalizations=0;
 const h=vm.createContext({calls:[{id:1,callDate:'a'},{id:2,callDate:'b'},{id:3,callDate:'a'}],callDateKeyFromValue:key=>{normalizations++;return key;},getActiveDayKey:()=> 'a'});
 vm.runInContext(source.slice(start,end).replaceAll('export ',''),h);
 h.withReportCallReadIndex(()=>{
   assert.deepEqual(Array.from(h.callsForDay(),c=>c.id),[1,3]);
   h.callsForDay().pop();assert.equal(h.callsForDay().length,2);
   h.withReportCallReadIndex(()=>assert.equal(h.callsForDay('b').length,1));
   assert.equal(normalizations,7);
   assert.deepEqual(Array.from(h.callsForDay('a',[{id:9,callDate:'a'}]),c=>c.id),[9]);
 });
 assert.equal(h.callsForDay.reportReadIndex,undefined);
 h.calls.push({id:4,callDate:'a'});
 assert.equal(h.withReportCallReadIndex(()=>h.callsForDay().length),3);
 assert.throws(()=>h.withReportCallReadIndex(()=>{throw Error('read failed');}),/read failed/);
 assert.equal(h.callsForDay.reportReadIndex,undefined);
 h.calls=[{id:5,callDate:'a'}];
 assert.deepEqual(Array.from(h.withReportCallReadIndex(()=>h.callsForDay()),c=>c.id),[5]);
});

test('productive minutes retain ordering, fractions and exclusions without computing gaps or bonuses',()=>{
 const source=fs.readFileSync(new URL('../js/app-main.js',import.meta.url),'utf8');
 const start=source.indexOf('export function productiveMinutesForDay('),end=source.indexOf('\nfunction manualGapPauseIntervals',start);
 const rows=[{startISO:'2026-10-25T13:00:00Z',durationMin:7.125},{startISO:'2026-10-25T12:00:00Z',durationMin:3.333333333},{startISO:'2026-10-25T14:00:00Z',durationMin:9,countsAsProductive:false},{startISO:'2026-10-25T15:00:00Z',durationMin:0},{startISO:'2026-10-25T16:00:00Z'}];
 const h=vm.createContext({callsForDay:key=>{assert.equal(key,'selected-day');return rows;},getActiveDayKey:()=> 'selected-day',importedCallStats:()=>{throw Error('Unexpected gap or bonus calculation');}});
 vm.runInContext(source.slice(start,end).replace('export ',''),h);
 assert.equal(h.productiveMinutesForDay(),3.333333333+7.125);
 assert.equal(rows[0].durationMin,7.125);
});

test('closed monthly analysis skips history work; reopening uses current data and current width',t=>{
 const previous=globalThis.document;
 t.after(()=>{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;});
 const disclosure={open:false},svg={innerHTML:'',width:600,attributes:{},getBoundingClientRect(){return {width:this.width};},setAttribute(k,v){this.attributes[k]=v;}},range={},next={},prev={};
 const elements={rptMonthlyDetails:disclosure,rptMonthlyChartSvg:svg,rptMonthlyRangeLabel:range,rptMonthlyNextBtn:next,rptMonthlyPrevBtn:prev};
 globalThis.document={getElementById:id=>elements[id]||null};
 let reads=0,earning=1;
 configureReportsContext({todayRange:d=>d||new Date(2026,9,25),effectiveHistoryStartDate:()=>new Date(2026,9,1),todayCallDateKey:d=>`${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`,callsForDay:()=>{reads++;return [{pay:earning}];},parseMoney:Number,higherRateBonusForCalls:rows=>rows.length*.2,importedCallStats:()=>{throw Error('Monthly chart must not classify gaps');},dayIsEffectivelyOff:()=>true,escapeHtml:String,money:n=>'$'+n.toFixed(2),convertedAmountText:()=>''});
 renderReportsMonthlyChart();assert.equal(reads,0);assert.equal(svg.innerHTML,'');
 disclosure.open=true;renderReportsMonthlyChart();assert.equal(reads,25);assert.match(svg.innerHTML,/\$30\.00/);assert.equal(svg.attributes.viewBox,'0 0 600 170');
 disclosure.open=false;earning=2;svg.width=320;renderReportsMonthlyChart();assert.equal(reads,25);
 disclosure.open=true;renderReportsMonthlyChart();assert.equal(reads,50);assert.match(svg.innerHTML,/\$55\.00/);assert.equal(svg.attributes.viewBox,'0 0 320 170');assert.equal(next.disabled,true);assert.equal(prev.disabled,true);
});
