import { ui, translateText, translateMarkup, displayLocale } from '../js/i18n.js';
import { applySavedColors } from '../js/appearance-colors.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { activeWorkSinceLastCall } from '../js/reinforcement-rules.js';
import { normalizeInactivityMinutes } from '../js/reinforcement-feedback.js';

const appSource = fs.readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const gameSource = fs.readFileSync(new URL('../js/game.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const scheduleSource = fs.readFileSync(new URL('../js/schedule.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
function sourceFunction(source, name, indentation = '    ') {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} exists in production source`);
  const end = source.indexOf(`\n${indentation}}\n`, start);
  assert.ok(end > start, `${name} has a complete body`);
  return source.slice(start, end + indentation.length + 2);
}
const dayKey = '09/29/2026';
const base = new Date(2026, 8, 29);
const localTime = (day, hour, minute = 0) => new Date(2026, 8, day, hour, minute).getTime();
const dateAtTime = (date, hhmm) => {
  const [hour, minute] = hhmm.split(':').map(Number);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute);
};
const toMinutes = (hhmm) => { const [hour, minute] = hhmm.split(':').map(Number); return hour * 60 + minute; };
function scheduleHarness(config, { mode = 'anchor', actualStart = '23:30', slots } = {}) {
  const context = vm.createContext({ ui, translateText, translateMarkup, displayLocale, applySavedColors,
    Date, settings: { lateArrivalMode: mode }, callDateToDate: (key) => key === dayKey ? new Date(base) : null,
    dayConfigFor: () => config, dayIsEffectivelyOff: () => false,
    getActiveDayKey: () => dayKey, formatHHMM: (value) => value, toMinutes,
    dayShiftBounds: () => ({ start: actualStart instanceof Date ? actualStart : dateAtTime(base, actualStart) }), dateAtTime,
    pad: (value) => String(value).padStart(2, '0'),
  });
  context.buildPlannedSlots = vm.runInContext(`(${sourceFunction(appSource, 'buildPlannedSlots')})`, context);
  context.getEffectiveScheduleForDay = slots ? () => slots
    : vm.runInContext(`(${sourceFunction(appSource, 'getEffectiveScheduleForDay')})`, context);
  const intervals = vm.runInContext(`(${sourceFunction(appSource, 'reinforcementScheduleIntervals')})`, context);
  context.reinforcementScheduleIntervals = intervals;
  const providerStart = appSource.indexOf('getReinforcementWorkIntervals: (dayKey) => {');
  const providerEnd = appSource.indexOf('\n      },', providerStart);
  assert.ok(providerStart >= 0 && providerEnd > providerStart);
  const provider = vm.runInContext(`(${appSource.slice(providerStart + 'getReinforcementWorkIntervals: '.length, providerEnd + 8)})`, context);
  return { intervals, provider };
}

test('actual schedule helper unfolds a midnight crossing and following break into next-day dates', () => {
  const { intervals } = scheduleHarness({ start: '23:00', end: '02:00' }, { slots: [
    { type: 'Work', start: '23:00', end: '01:00' },
    { type: 'Break', start: '00:30', end: '00:45' },
    { type: 'Work', start: '00:45', end: '02:00' },
  ] });
  const result = intervals(dayKey);
  assert.equal(new Date(result[0].startedAt).getTime(), localTime(29, 23));
  assert.equal(new Date(result[0].endedAt).getTime(), localTime(30, 1));
  assert.equal(new Date(result[1].startedAt).getTime(), localTime(30, 0, 30));
  assert.equal(new Date(result[2].endedAt).getTime(), localTime(30, 2));
  assert.equal(intervals('invalid').length, 0);
});

test('real sorted schedule blocks retain the accounting-day anchor across midnight', () => {
  const { intervals } = scheduleHarness({ start: '23:00', end: '02:00', blocks: [
    { type: 'work', start: '23:00', dur: 90 },
    { type: 'break', start: '00:30', dur: 15 },
    { type: 'work', start: '00:45', dur: 75 },
  ] });
  const result = intervals(dayKey);
  const lateWork = result.find((slot) => slot.start === '23:00');
  const breakSlot = result.find((slot) => slot.type === 'Break');
  const earlyWork = result.find((slot) => slot.start === '00:45');
  assert.equal(new Date(lateWork.startedAt).getTime(), localTime(29, 23));
  assert.equal(new Date(breakSlot.startedAt).getTime(), localTime(30, 0, 30));
  assert.equal(new Date(earlyWork.endedAt).getTime(), localTime(30, 2));
});

test('an effective late-arrival shift carries all wrapped slots forward by the same delay', () => {
  const { intervals } = scheduleHarness({ start: '23:00', end: '02:00', blocks: [
    { type: 'work', start: '23:00', dur: 90 },
    { type: 'break', start: '00:30', dur: 15 },
    { type: 'work', start: '00:45', dur: 75 },
  ] }, { mode: 'shift', actualStart: '23:30' });
  const result = intervals(dayKey);
  const lateWork = result.find((slot) => slot.start === '23:30');
  const breakSlot = result.find((slot) => slot.type === 'Break');
  const earlyWork = result.find((slot) => slot.start === '01:15');
  assert.equal(new Date(lateWork.startedAt).getTime(), localTime(29, 23, 30));
  assert.equal(new Date(breakSlot.startedAt).getTime(), localTime(30, 1));
  assert.equal(new Date(earlyWork.endedAt).getTime(), localTime(30, 2, 30));
});

test('daytime and effective shifted schedules use their real configured intervals', () => {
  const config = { start: '08:00', end: '10:00', blocks: [
    { type: 'work', start: '08:00', dur: 90 }, { type: 'break', start: '09:30', dur: 15 },
    { type: 'work', start: '09:45', dur: 15 },
  ] };
  const daytime = scheduleHarness(config);
  assert.equal(new Date(daytime.intervals(dayKey)[0].startedAt).getTime(), localTime(29, 8));
  assert.equal(daytime.provider(dayKey).length, 2);
  assert.ok(daytime.provider(dayKey).every((slot) => slot.type === 'Work'));
  const shifted = scheduleHarness(config, { mode: 'shift', actualStart: '08:30' });
  assert.equal(new Date(shifted.intervals(dayKey)[0].startedAt).getTime(), localTime(29, 8, 30));
  assert.equal(new Date(shifted.intervals(dayKey)[2].endedAt).getTime(), localTime(29, 10, 30));
});

test('arrival after midnight shifts the night slots by elapsed dates rather than subtracting wall-clock hours', () => {
  const {intervals}=scheduleHarness({start:'23:00',end:'02:00',blocks:[
    {type:'work',start:'23:00',dur:90},{type:'break',start:'00:30',dur:15},{type:'work',start:'00:45',dur:75}
  ]},{mode:'shift',actualStart:new Date(localTime(30,0,30))});
  const result=intervals(dayKey);
  assert.equal(Date.parse(result[0].startedAt),localTime(30,0,30));
  assert.equal(Date.parse(result[1].startedAt),localTime(30,2));
  assert.equal(Date.parse(result[2].endedAt),localTime(30,3,30));
});

test('the production schedule editor reads and validates midnight blocks while rejecting overlaps and out-of-shift work',()=>{
  const blocks=[{type:'work',start:'22:00',end:'01:00',goalMin:30},{type:'break',start:'01:00',end:'01:15'},{type:'work',start:'01:15',end:'06:00',goalMin:30}];
  const h=vm.createContext({ui,translateText,Date,formatHHMM:String,toMinutes,timeLabel:String,formatMinutes:String,
    minutesToHHMM:n=>`${String(Math.floor(n/60)%24).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`,
    BLOCK_TYPE_LABELS:{work:'Trabajo',break:'Break',lunch:'Lunch'},document:{querySelectorAll:()=>blocks.map(b=>({querySelector:s=>({value:s.includes('type')?b.type:s.includes('start')?b.start:s.includes('end')?b.end:b.goalMin||0})}))}});
  for(const name of ['normalizeBlockForCompare','readBlocksFromEditor','validateDayConfig'])h[name]=vm.runInContext(`(${sourceFunction(scheduleSource,name)})`,h);
  const parsed=h.readBlocksFromEditor();assert.equal(parsed[0].dur,180);assert.equal(parsed[2].dur,285);
  const config={start:'22:00',end:'06:00',blocks:parsed};assert.equal(h.validateDayConfig(config).valid,true);
  assert.equal(h.validateDayConfig({...config,blocks:[...parsed,{type:'break',start:'00:55',dur:20}]}).valid,false);
  assert.equal(h.validateDayConfig({...config,blocks:[{type:'work',start:'05:45',dur:30}]}).valid,false);
  assert.equal(h.validateDayConfig({...config,end:'22:00'}).valid,false);
});

test('a call-estimated live shift uses todays alarm plan when the stored explicit shift already ended',()=>{
  const queried=[];const h=vm.createContext({Date,settings:{alertBeforeBreakMin:10},state:{shiftStartedAt:'2026-09-28T08:00:00',shiftEndedAt:'2026-09-28T16:00:00'},
    todayCallDateKey:()=>dayKey,currentShiftAccountingDayKey:()=> '09/28/2026',dayShiftBounds:()=>({live:true}),
    getEffectiveScheduleForDay:key=>{queried.push(key);return[];},callDateToDate:()=>base,stopBreakStartAlarm(){}});
  vm.runInContext(`(${sourceFunction(appSource,'checkBreakStartAlarm','')})`,h)();assert.deepEqual(queried,[dayKey]);
});

test('inactivity production guard suppresses scheduled break and off-duty delivery despite prior work', () => {
  const { provider } = scheduleHarness({ start: '08:00', end: '10:00', blocks: [
    { type: 'work', start: '08:00', dur: 75 }, { type: 'break', start: '09:15', dur: 15 },
    { type: 'work', start: '09:30', dur: 30 },
  ] });
  const state = { shiftStartedAt: new Date(localTime(29, 8)).toISOString(), shiftEndedAt: null, pauseHistory: [], dayInterruptions: {}, game: { ledger: {} } };
  const context = vm.createContext({ ui, translateText, translateMarkup, displayLocale, applySavedColors, Date, state, calls: [], ensureGameState: () => {},
    getReinforcementWorkIntervals: provider, currentGameDayKey: () => dayKey,
    activeWorkSinceLastCall, settings: {}, normalizeInactivityMinutes, saveStateOnly: () => {}, notifyReinforcement: () => {}, reinforcementText: () => 'apoyo', hashText: String,
  });
  const check = vm.runInContext(`(${sourceFunction(gameSource, 'checkReinforcementInactivity', '')})`, context);
  assert.equal(check(localTime(29, 9, 20)), false);
  assert.equal(check(localTime(29, 10, 20)), false);
  assert.equal(check(localTime(29, 7, 30)), false);
  assert.equal(check(localTime(29, 9, 40)), true);
  assert.equal(check(localTime(29, 9, 40)), false);
  context.settings.reinforcement = { inactivityMinutes: 10, inactivityRepeat: true };
  assert.equal(check(localTime(29, 9, 49)), false);
  assert.equal(check(localTime(29, 9, 50)), true);
  assert.equal(check(localTime(29, 10, 20)), false);
});

function pauseHarness({ at, startedAt, planned, absoluteSlots, effectiveDurationMin } = {}) {
  const NativeDate = Date;
  class FixedDate extends NativeDate {
    constructor(...args) { super(...(args.length ? args : [at])); }
    static now() { return at; }
  }
  const state = { activePause: { type: 'break', startedAt: new Date(startedAt).toISOString(), shiftDayKey: dayKey }, pauseHistory: [] };
  const results = [];
  const generalToasts = [];
  const context = vm.createContext({ ui, translateText, translateMarkup, displayLocale, applySavedColors, Date: FixedDate, state,
    callDateKeyFromValue: (value) => value, currentShiftAccountingDayKey: () => dayKey,
    findPlannedSlotForActivePause: () => planned, makeLocalId: () => 'closed-pause',
    setEvent: () => ({ id: 'event' }), fmtTime: () => '', stopBreakEndAlarm: () => {},
    canPersistLocalChanges: () => true, setAppState: value => { context.state = value; }, render() {},
    saveStateOnly: () => {}, saveAll: () => {}, toast: (message) => generalToasts.push(message),
    callDateToDate: () => new Date(base), dateAtTime,
    reinforcementScheduleIntervals: () => absoluteSlots || [],
    pauseForSlot: () => effectiveDurationMin == null ? null : { startedAt: state.pauseHistory[0].startedAt, effectiveDurationMin },
    ADHERENCE_TOLERANCE_MIN: 1, onGamePauseEnded: (record, options) => results.push({ record, options }),
  });
  const end = vm.runInContext(`(${sourceFunction(appSource, 'endPause')})`, context);
  return { end, results, generalToasts, state };
}

test('silent real return when starting a live call receives punctuality while shift closure does not', () => {
  const input = { at: localTime(29, 9, 30), startedAt: localTime(29, 9, 15), planned: { type: 'Break', start: '09:15', end: '09:30' } };
  const live = pauseHarness(input);
  const result = live.end({ silent: true, deferSave: true });
  assert.equal(live.results.length,0);result.finish();
  assert.equal(live.results[0].options.onTime, true);
  assert.equal(live.generalToasts.length, 0);
  assert.equal(result.pauseHistoryId, 'closed-pause');
  assert.equal(live.state.activePause, null);
  const closing = pauseHarness(input);
  closing.end({ silent: true, deferSave: true, forShiftEnd: true }).finish();
  assert.equal(closing.results[0].options.onTime, false);
});

test('actual endPause uses next-day absolute pause times and existing duration tolerance', () => {
  const planned = { type: 'Break', start: '00:30', end: '00:45' };
  const input = {
    at: localTime(30, 0, 45), startedAt: localTime(30, 0, 30), planned,
    absoluteSlots: [{ ...planned, startedAt: new Date(localTime(30, 0, 30)).toISOString(), endedAt: new Date(localTime(30, 0, 45)).toISOString() }],
  };
  const overnight = pauseHarness(input);
  overnight.end({ silent: true });
  assert.equal(overnight.results[0].options.onTime, true);
  const overdue = pauseHarness({ ...input, at: localTime(30, 0, 48) });
  overdue.end({ silent: true });
  assert.equal(overdue.results[0].options.onTime, false);
  const excludedInterruptions = pauseHarness({ ...input, at: localTime(30, 0, 48), effectiveDurationMin: 15 });
  excludedInterruptions.end({ silent: true });
  assert.equal(excludedInterruptions.results[0].options.onTime, true);
});
