import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parse } from 'acorn';
import { ui, translateText, translateMarkup, setLanguage, displayLocale } from '../js/i18n.js';
import { parse as parseHtml } from 'parse5';
import { acwMinutesForBlock } from '../js/block-acw.js';

function declarations(file, names) {
  const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8');
  const nodes = parse(source, { ecmaVersion: 'latest', sourceType: 'module' }).body.map(node => node.declaration || node);
  return names.map(name => {
    const node = nodes.find(node => node.type === 'FunctionDeclaration' ? node.id.name === name
      : node.type === 'VariableDeclaration' && node.declarations.some(item => item.id.name === name));
    assert.ok(node, name);
    return source.slice(node.start, node.end);
  }).join('\n');
}

const key = date => `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
const at = (day, hour, minute = 0) => new Date(2026, 9, day, hour, minute);

test('visible day statistics keep zero-minute explanations, averages and currency without removed summary targets', () => {
  const ids=['dayStatsGrid','statsShortest','statsShortestNote','statsLongest','statsAvg','statsGapLongest','statsGapAvg','statsAvgPay'];
  const elements=Object.fromEntries(ids.map(id=>[id,{textContent:'',style:{}}]));
  let calls=[{}];
  const h=vm.createContext({ui,translateText,document:{getElementById:id=>{assert.ok(ids.includes(id),id);return elements[id];}},
    getActiveDayKey:()=> '10/18/2026',callsForDay:()=>calls,
    importedCallStats:()=>({shortest:0,zeroCount:1,shortestNonZero:5,longest:5,avg:2.5,gapLongest:1,gapAvg:1,earnings:0.6}),
    formatDuration:value=>String(value),money:value=>`$${value.toFixed(2)}`,convertedAmountText:()=> '≈ L 15',
  });
  vm.runInContext(declarations('../js/calls.js',['renderDayStatsCards']),h);
  h.renderDayStatsCards();
  assert.equal(elements.statsAvgPay.textContent,'$0.60 (≈ L 15)');
  assert.equal(elements.statsShortestNote.style.display,'');
  assert.equal(elements.statsAvg.textContent,'150000');
  calls=[];h.renderDayStatsCards();
  assert.equal(elements.statsAvgPay.textContent,'—');
  assert.equal(elements.statsShortestNote.style.display,'none');
});
function scheduleHarness({ day = 12, now = at(12, 19), start = at(12, 10), end = at(12, 11) } = {}) {
  const elements = new Map([['scheduleList', { innerHTML: '' }]]);
  const dayKey = key(at(day, 0)), todayKey = key(now);
  const slots = [{ type: 'Work', name: 'Mi bloque personal', start: '08:00', end: '09:00', goalMin: 0 }];
  class FixedDate extends Date { constructor(...args) { super(...(args.length ? args : [now.getTime()])); } }
  const h = vm.createContext({ Date: FixedDate, ui, translateText, translateMarkup,
    state: { shiftEndedAt: end?.toISOString() || null }, settings: {},
    document: { getElementById: id => elements.get(id) || null },
    getActiveDayKey: () => dayKey, callsForDay: () => [], dayPausesForSlotStats: () => [],
    dayShiftSessions: () => start ? [{ start, end: end || now, live: !end }] : [],
    dayConfigFor: () => ({ off: false }), dayIsEffectivelyOff: () => false,
    getEffectiveScheduleForDay: () => slots, originalPlannedSlotsForDay: () => slots,
    getShiftWindow: () => ({ start: '08:00', end: '09:00' }), connectedMinutesForDay: () => 60,
    getDayNote: () => null, todayCallDateKey: () => todayKey, todayRange: () => at(12, 0),
    callDateToDate: () => at(day, 0), dayGapRows: () => [], mergeIntervals: value => value,
    pauseForSlot: () => null, acwMinutesForBlock: () => 0, overlapMinutesWithIntervals: () => 0,
    slotMinuteAdherence: () => ({ pct: 0, adherentMinutes: 0, total: 60, reasons: { ausente: 60 } }),
    formatDuration: ms => `${ms / 60000}m`, formatMinutes: String, formatDeltaMinutes: String,
    timeLabel: value => value, timeLabelFromDate: String, escapeHtml: String, iconHtml: () => '',
    renderBlockSummaryStrip() {}, sameCallDay: () => true,
  });
  h.dayWorkSessions = () => h.dayShiftSessions();
  h.workingMinutesForDay = h.connectedMinutesForDay;
  vm.runInContext(declarations('../js/app-main.js', ['dateAtTime', 'toMinutes', 'overlapMinutes',
    'EXCEPTION_REASON_LABELS', 'dominantExceptionReason', 'slotStats', 'renderSchedule']), h);
  h.renderSchedule();
  return elements.get('scheduleList').innerHTML;
}

test('night work blocks preserve chronological order, duration and next-day call coverage', () => {
  const h=vm.createContext({Date,ui,translateText,translateMarkup,state:{shiftEndedAt:null},calls:[],
    formatHHMM:String,pad:n=>String(n).padStart(2,'0'),pauseForSlot:()=>null,
    todayCallDateKey:()=>key(at(12,0)),formatDuration:String,formatMinutes:String,formatDeltaMinutes:String});
  vm.runInContext(declarations('../js/app-main.js',['buildPlannedSlots','toMinutes','dateAtTime','overlapMinutes','slotStats']),h);
  const slots=h.buildPlannedSlots({start:'22:00',end:'06:00',blocks:[
    {type:'work',start:'22:00',dur:180},{type:'break',start:'01:00',dur:15},{type:'work',start:'01:15',dur:285} ]});
  assert.deepEqual(Array.from(slots,s=>s.start),['22:00','01:00','01:15']);
  h.callDateToDate=()=>at(12,0);
  const call={startISO:at(13,0,10).toISOString(),endISO:at(13,0,20).toISOString()};
  const stats=h.slotStats(slots[0],[call],[],null,null,key(at(12,0)));
  assert.equal(stats.durationMin,180);assert.equal(stats.callMin,10);
  const pause=h.slotStats(slots[1],[],[],null,null,key(at(12,0)));
  assert.equal(pause.slotStart.getTime(),at(13,1).getTime());assert.equal(pause.durationMin,15);
});

test('work already counted never shrinks for a later pause, while pauses inside counted gaps are deducted once', () => {
  const h=vm.createContext({Date,ui,translateText,translateMarkup,state:{shiftEndedAt:null},calls:[],
    pauseForSlot:()=>null,callDateToDate:()=>at(22,0),todayCallDateKey:()=>key(at(22,0)),
    formatDuration:String,formatMinutes:String,formatDeltaMinutes:String});
  vm.runInContext(declarations('../js/app-main.js',['toMinutes','dateAtTime','overlapMinutes',
    'mergeIntervals','overlapMinutesWithIntervals','slotStats']),h);
  const slot={type:'Work',start:'08:00',end:'18:00',goalMin:240};
  const call=(start,end)=>({startISO:start.toISOString(),endISO:end.toISOString()});
  const pause=(start,end,type='break')=>({start,end,type});
  const first=call(at(22,9,1),at(22,9,10));
  const stats=pauses=>h.slotStats(slot,[first],pauses,at(22,9),null,key(at(22,0)));
  assert.equal(stats([]).filledMin,10);
  for(const end of [at(22,9,20),at(22,10),at(22,12)]) {
    assert.equal(stats([pause(at(22,9,15),end)]).filledMin,10,'growing pause after the last call cannot erase prior work');
  }
  assert.equal(stats([pause(at(22,8),at(22,8,30))]).filledMin,10,'pause before counted activity is excluded');
  assert.equal(stats([pause(at(22,9,8),at(22,9,20))]).filledMin,10,'call time inside a pause remains work');
  assert.equal(stats([pause(at(22,9),at(22,9,1))]).filledMin,9,'leading ACW pause is still deducted');
  const second=call(at(22,9,30),at(22,9,40));
  const middle=[pause(at(22,9,15),at(22,9,25)),pause(at(22,9,20),at(22,9,25),'lunch')];
  assert.equal(h.slotStats(slot,[first,second],middle,at(22,9),null,key(at(22,0))).filledMin,30,'overlapping pause sources deduct their union once');
  const breakStats=h.slotStats({type:'Break',start:'09:00',end:'09:15'},[],[pause(at(22,9),at(22,9,10))],null,null,key(at(22,0)));
  assert.equal(breakStats.filledMin,10,'planned pause progress remains unchanged');
});

test('work progress uses classified connected ACW and never fills an offline gap or deducts a pause twice', () => {
  const h=vm.createContext({Date,ui,translateText,translateMarkup,acwMinutesForBlock,state:{shiftEndedAt:null},calls:[],
    pauseForSlot:()=>null,callDateToDate:()=>at(22,0),todayCallDateKey:()=>key(at(22,0)),
    formatDuration:String,formatMinutes:String,formatDeltaMinutes:String});
  vm.runInContext(declarations('../js/app-main.js',['toMinutes','dateAtTime','overlapMinutes',
    'mergeIntervals','overlapMinutesWithIntervals','slotStats']),h);
  const slot={type:'Work',start:'08:00',end:'18:00',goalMin:240};
  const first={startISO:at(22,9).toISOString(),endISO:at(22,9,10).toISOString()};
  const second={startISO:at(22,10).toISOString(),endISO:at(22,10,10).toISOString()};
  const gap={label:'acw',prev:first,cur:second,connectedIntervals:[{start:at(22,9,50),end:at(22,10)}]};
  const pauses=[{type:'break',start:at(22,9,52),end:at(22,9,55)}];
  const stats=h.slotStats(slot,[first,second],pauses,at(22,9),null,key(at(22,0)),null,null,[gap]);
  assert.equal(stats.callMin,20);assert.equal(stats.acwMin,7);assert.equal(stats.filledMin,27);
  assert.equal(h.slotStats(slot,[first,second],pauses,at(22,9),null,key(at(22,0)),null,null,[{...gap,label:'other'}]).filledMin,20);
  assert.equal(h.slotStats(slot,[first,second],pauses,at(22,9),null,key(at(22,0)),null,null,[]).filledMin,20);
});

test('night adherence counts full dated minutes and next-day pauses instead of a zero-length clock range', () => {
  let clock=at(13,7),pauses=[{type:'break',start:at(13,1),end:at(13,1,15)}];
  const dayKey=key(at(12,0)),base=at(12,0);
  const h=vm.createContext({Date:class extends Date{constructor(...args){super(...(args.length?args:[clock]));}},
    ui,translateText,translateMarkup,settings:{adherenceGraceMin:0},calls:[],state:{shiftStartedAt:at(12,22).toISOString()},
    formatHHMM:String,pad:n=>String(n).padStart(2,'0'),callDateKeyFromValue:String,
    callDateToDate:()=>base,todayCallDateKey:()=>key(clock),currentShiftAccountingDayKey:()=>dayKey,
    todayRange:()=>at(13,0),dayIsEffectivelyOff:()=>false,actualPauseIntervalsForDay:()=>pauses,
    dateKey:key,sameCallDay:(date,k)=>key(new Date(date))===k,EXCEPTION_REASON_MAP:{'work|none':'absent','break|work':'break-missed'}});
  vm.runInContext(declarations('../js/app-main.js',['buildPlannedSlots','toMinutes','dateAtTime','computeMinuteAdherence',
    'sessionsToPresenceIntervals','callPresenceIntervalsForDay','presenceIntervalsForDay','pauseIntervalsToMinuteRanges',
    'plannedMinuteSlots','minuteAdherenceForDay','slotMinuteAdherence','isRightNowOutOfAdherence','checkBreakStartAlarm']),h);
  const slots=h.buildPlannedSlots({start:'22:00',end:'06:00',blocks:[{type:'work',start:'22:00',dur:180},{type:'break',start:'01:00',dur:15},{type:'work',start:'01:15',dur:285}]});
  h.originalPlannedSlotsForDay=()=>slots;
  const sessions=[{start:at(12,22),end:at(13,6),live:false}];
  assert.equal(h.minuteAdherenceForDay(dayKey,sessions).total,480);
  assert.equal(h.minuteAdherenceForDay(dayKey,sessions).exceptionMinutes,0);
  assert.equal(h.slotMinuteAdherence(dayKey,slots[2],sessions).total,285);
  pauses=[];assert.equal(h.minuteAdherenceForDay(dayKey,sessions).exceptionMinutes,14);
  clock=at(12,23,30);const live=[{start:at(12,22),end:clock,live:true}];
  assert.equal(h.minuteAdherenceForDay(dayKey,live).total,90);
  assert.equal(h.slotMinuteAdherence(dayKey,slots[0],live).total,90);
  clock=at(13,1,5);assert.equal(h.isRightNowOutOfAdherence(),true);
  const alarms=[];clock=at(13,0,55);h.settings.alertBeforeBreakMin=10;
  Object.assign(h,{dayShiftBounds:()=>({live:true}),getEffectiveScheduleForDay:()=>slots,pauseForSlot:()=>null,
    breakStartAlarmActiveKey:null,breakStartAlarmFiredKeys:new Set(),startBreakStartAlarm:k=>alarms.push(k),
    stopBreakStartAlarm(){},toast(){},renderAlertTemplate:()=>'',timeLabel:String});
  h.checkBreakStartAlarm();assert.equal(alarms.length,1);assert.ok(alarms[0].startsWith(dayKey+'|'));
});

test('elapsed work after an early shift closure is incomplete rather than upcoming in both languages',t=>{
  t.after(()=>setLanguage('es'));
  for(const language of ['es','en']){setLanguage(language);const html=scheduleHarness({now:at(12,12),start:at(12,8),end:at(12,8,30)});
    assert.ok(html.includes(language==='es'?'Incompleto':'Incomplete'));}
});

for (const language of ['es', 'en']) {
  test('real schedule rendering localizes skipped work and absence detail in both supported languages', t => {
    setLanguage(language); t.after(() => setLanguage('es'));
    const html = scheduleHarness();
    assert.ok(html.includes(language === 'en' ? 'Skipped' : 'Omitido'));
    assert.ok(html.includes(language === 'en' ? 'Absence/late arrival' : 'Ausencia/llegada tarde'));
    assert.ok(html.includes('Mi bloque personal'), 'personal block names remain unchanged');
  });

  test(`real schedule rendering keeps the same active, finished and incomplete badge tones in ${language}`, t => {
    setLanguage(language); t.after(() => setLanguage('es'));
    const current = scheduleHarness({ now: at(12, 8, 30), start: at(12, 8), end: null });
    assert.match(current, /sblk-status warn/);
    const finished = scheduleHarness({ day: 11, start: at(11, 8), end: at(11, 10) });
    assert.match(finished, /sblk-status good/);
    const incomplete = scheduleHarness({ day: 11, start: at(11, 8), end: at(11, 8, 30) });
    assert.match(incomplete, /sblk-status warn/);
  });

  test(`real finance totals and completed-shift toast use ${language} labels`, t => {
    setLanguage(language); t.after(() => setLanguage('es'));
    const elements = new Map(['financeAvailableAmt', 'financeGastosTotalRow', 'financeMetasTotalRow'].map(id => [id, { innerHTML: '' }]));
    const messages = [];
    const h = vm.createContext({ Date, ui, translateText, translateMarkup,
      settings: {}, state: { shiftStartedAt: at(12, 8).toISOString(), shiftEndedAt: null },
      document: { getElementById: id => elements.get(id) || null },
      captureFinanceDetails() {}, financeAvailableBalance: () => 0,
      financeGastoRowsSorted: () => [{ id: 'expense', targetAmount: 10, assignedAmount: 5 }],
      financeMetaRowsSorted: () => [{ id: 'savings', targetAmount: 10, assignedAmount: 2 }],
      financeIsRowPagado: () => false, prepareFinanceMonthRender() {}, renderFinancePreview() {}, renderFinancePlanning() {}, updateFinanceTotalsScrollHint() {},
      money: value => `$${value}`, financeConvertedInline: () => '', escapeHtml: String,
      todayCallDateKey: key, setEvent() {}, fmtTime: String, saveAll: () => true,
      onGameShiftEnded() {}, canPersistLocalChanges: () => true, toast: message => messages.push(message),
    });
    vm.runInContext(declarations('../js/finance.js', ['financeTotalsRowHtml', 'renderFinanceSection'])
      + '\n' + declarations('../js/app-main.js', ['endShift']), h);
    h.renderFinanceSection(); h.endShift();
    assert.ok(elements.get('financeGastosTotalRow').innerHTML.includes(language === 'en' ? 'Reserved' : 'Reservado'));
    assert.ok(elements.get('financeMetasTotalRow').innerHTML.includes(language === 'en' ? 'Reserved' : 'Reservado'));
    assert.deepEqual(messages, [language === 'en' ? 'Shift ended' : 'Shift terminado']);
  });
}

test('finance preview localizes allocated and saved labels without translating personal names', t => {
  setLanguage('en'); t.after(() => setLanguage('es'));
  const elements = new Map([['financePreviewBox', { style: {} }], ['financePreviewRows', { innerHTML: '' }]]);
  const personalName = 'Mi nombre personal sin traducir';
  const items = [false, true].map(isMeta => ({ isMeta, row: { categoryId: 'personal', name: personalName, targetAmount: 10, assignedAmount: 2 } }));
  const h = vm.createContext({ ui, translateText, document: { getElementById: id => elements.get(id) },
    financePendingPreviewItems: () => items, financeCategoryDef: () => ({ rgb: '1,2,3' }),
    financeCategoryIconHtml: () => '', escapeHtml: String, money: String, financeConvertedInline: () => '' });
  vm.runInContext(declarations('../js/finance.js', ['renderFinancePreview']), h);
  h.renderFinancePreview();
  const result = elements.get('financePreviewRows').innerHTML;
  assert.equal(result.split('>Reserved<').length - 1, 2);
  assert.ok(!result.includes('>Reservado<'));
  assert.equal(result.split(personalName).length - 1, 2);
});

test('Higher Rate history singular and plural render in English with unchanged window identities', t => {
  setLanguage('en'); t.after(() => setLanguage('es'));
  const elements = new Map(['higherRateWindowsList', 'higherRateHistoryList', 'higherRateHistoryTitle', 'higherRateActiveCountPill'].map(id => [id, { innerHTML: '' }]));
  const h = vm.createContext({ ui, translateText, translateMarkup,
    document: { getElementById: id => elements.get(id) || null },
    higherRateWindowIsPast: window => window.past,
    renderHigherRateWindowRow: window => `<div data-window-id="${window.id}"></div>`,
    iconHtml: () => '', renderHigherRateDayStats() {}, renderHigherRateLiveCard() {},
    higherRateStatsForDay: () => ({totalBonus:0}), money: () => '$0.00', financeConvertedInline: () => '', escapeHtml: String, formatCallDayLabel: x=>x,
  });
  vm.runInContext('let higherRateLastPastCount = null;\n' + declarations('../js/higher-rate.js', ['renderHigherRateWindowsEditor']), h);
  for (const count of [1, 2]) {
    const windows = Array.from({ length: count }, (_, id) => ({ id: `personal-window-${id}`, date: '10/12/2026', start: '08:00', past: true }));
    const before = JSON.stringify(windows);
    h.renderHigherRateWindowsEditor(windows);
    assert.equal(elements.get('higherRateHistoryTitle').innerHTML.trim(), `History (${count} past)`);
    assert.equal(JSON.stringify(windows), before);
  }
});

test('paste-call placeholder localizes help while preserving original Propio sample and personal pasted input', t => {
  setLanguage('en'); t.after(() => setLanguage('es'));
  const html = parseHtml(fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8'));
  let textarea;
  function find(node) {
    if (node.attrs?.some(attr => attr.name === 'id' && attr.value === 'callInput')) textarea = node;
    (node.childNodes || []).forEach(find);
  }
  find(html);
  const original = textarea.attrs.find(attr => attr.name === 'placeholder').value;
  const input = { placeholder: original, value: 'Personal customer 9876\n10/12/2026\n8:00 AM\n5\nYes\nNo\n$0.60' };
  const before = input.value;
  const h = vm.createContext({ ui, translateText, document: { getElementById: () => input } });
  const source = fs.readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');
  const node = parse(source, { ecmaVersion: 'latest', sourceType: 'module' }).body.map(node => node.declaration || node)
    .find(node => node.type === 'FunctionDeclaration' && node.id.name === 'syncCallImportPlaceholder');
  if (node) { vm.runInContext(source.slice(node.start, node.end), h); h.syncCallImportPlaceholder(); }
  assert.match(input.placeholder, /^Paste your Propio data here\.\.\.\n\nExample:\n/);
  assert.equal(input.placeholder.split('Example:\n')[1], original.split('Ejemplo:\n')[1]);
  assert.equal(input.value, before);
});

test('weekly future badges render in the current language without changing notes or future amounts', t => {
  t.after(() => setLanguage('es'));
  const elements = Object.fromEntries(['weekSummaryWrap', 'weekSummarySubtitle', 'weekSummaryTip'].map(id => [id, { innerHTML: '', textContent: '' }]));
  const summary = { weekStart: 0, weekEnd: 7, days: [{ dayKey: 'future', isFuture: true, calls: 0, hasShift: false,
    earnings: 999, productive: 0, adherencePct: null, note: { category: 'personal', comment: 'Mi nota personal' } }],
    totals: { calls: 0, earnings: 0, productive: 0, avgAdherence: null } };
  const before = JSON.stringify(summary);
  const h = vm.createContext({ ui, translateText, displayLocale, document: { getElementById: id => elements[id] || null } });
  vm.runInContext(declarations('../js/weekly-summary.js', ['renderWeekSummary']), h);
  const context = { settings: {}, weekViewOffset: 1, weekSummaryForOffset: () => summary,
    formatWeekRangeLabel: () => '0–7', cycleWeekNumberForWeekStart: () => 1, callDateToDate: () => at(29, 0),
    weekdayKeyForDayKey: () => 'mon', WEEKDAY_LABELS: { mon: 'Monday' }, dayNoteCategoryMeta: () => ({ label: 'Personal', tagClass: 'neutral' }),
    escapeHtml: String, money: value => `$${value}`, financeConvertedNote: () => '', formatDuration: String, iconHtml: () => '', convertedAmountText: () => '' };
  for (const language of ['es', 'en']) {
    setLanguage(language); h.renderWeekSummary(context);
    const html = elements.weekSummaryWrap.innerHTML;
    assert.ok(html.includes(`>${language === 'en' ? 'Future' : 'Futuro'}</button>`), `future status must use the ${language} catalog`);
    assert.ok(html.includes('Mi nota personal')); assert.ok(!html.includes('$999'));
    if (language === 'en') assert.ok(!html.includes('Futuro'));
    assert.equal(JSON.stringify(summary), before);
  }
});

test('report trend rendering translates metric labels and preserves signed percentages in both languages', t => {
  t.after(() => setLanguage('es'));
  const elements = Object.fromEntries(['rptDashboard', 'rptTrendRow'].map(id => [id, { innerHTML: '' }]));
  let trend = { productivePct: -92, adherencePct: 780, earningsPct: -10, callsPct: 0, acwPct: null };
  const h = vm.createContext({ ui, translateText, escapeHtml: String, iconHtml: () => '',
    document: { getElementById: id => elements[id] || null },
    getActiveDayKey: () => 'today', todayCallDateKey: () => 'today', reportsKpiData: () => ({ callCount: 1, productiveMin: 1 }),
    dayIsEffectivelyOff: () => false, dayShiftBounds: () => ({ start: at(23, 8) }), effectiveDailyGoal: () => ({ min: 1 }),
    renderReportsMonthlyChart() {}, reportsTrends: () => trend, reportsWeekBillableDropped: () => ({ billablePct: 100, droppedPct: 0 }) });
  vm.runInContext(declarations('../js/reports.js', ['reportDayAssessment', 'trendChipHtml', 'statChipHtml', 'renderReportsDashboard']), h);
  for (const language of ['es', 'en']) {
    setLanguage(language); h.renderReportsDashboard();
    const html = elements.rptTrendRow.innerHTML;
    assert.ok(html.includes(`${language === 'en' ? 'Productivity' : 'Productividad'} -92%`));
    assert.ok(html.includes(`${language === 'en' ? 'Adherence' : 'Adherencia'} +780%`));
    if (language === 'en') assert.doesNotMatch(html, /Productividad|Adherencia/);
  }
  setLanguage('en'); trend = { ...trend, productivePct: 0, adherencePct: null }; h.renderReportsDashboard();
  assert.match(elements.rptTrendRow.innerHTML, /Productivity/); assert.match(elements.rptTrendRow.innerHTML, /Adherence/);
  assert.doesNotMatch(elements.rptTrendRow.innerHTML, /Productividad|Adherencia/);
});

test('saved action titles follow the display language without rewriting history or personal text', t => {
  t.after(() => setLanguage('es'));
  const events = [{type:'shift',title:'Shift iniciado',ts:'2026-10-03T14:30:00Z'},
    {type:'shift',title:'Shift terminado',ts:'2026-10-04T06:03:00Z'},
    {type:'import',title:'Mi texto personal',ts:'2026-10-03T15:00:00Z'}];
  const before = JSON.stringify(events);
  const h=vm.createContext({translateText,state:{pauseHistory:[]},callDateKeyFromValue:x=>x,
    dayEvents:()=>events,dayGapRows:()=>[],dayWorkSessions:()=>[]});
  vm.runInContext(declarations('../js/calls.js',['dayActionRows']),h);
  for(const language of ['es','en']){
    setLanguage(language);const rows=h.dayActionRows('10/03/2026');
    assert.equal(rows[0].detail,translateText('Shift iniciado'));
    assert.equal(rows[1].detail,translateText('Shift terminado'));
    if(language==='en')assert.doesNotMatch(rows[0].detail+rows[1].detail,/iniciado|terminado/);
    assert.equal(rows[2].detail,'Mi texto personal');assert.equal(JSON.stringify(events),before);
  }
});
