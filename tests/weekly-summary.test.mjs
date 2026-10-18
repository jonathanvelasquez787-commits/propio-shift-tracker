import test from 'node:test';
import assert from 'node:assert/strict';
import { renderWeekSummary, renderPayDatesSection } from '../js/weekly-summary.js';
import { setLanguage } from '../js/i18n.js';

const escapeHtml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const money = value => `$${value.toFixed(2)}`;
function documentFixture(t) {
  const previous = globalThis.document;
  const elements = Object.fromEntries(['weekSummaryWrap','weekSummarySubtitle','weekSummaryTip','payDatesBody'].map(id => [id, {innerHTML:'',textContent:'',hidden:false}]));
  globalThis.document = {documentElement:{},getElementById: id => elements[id]};
  t.after(() => { if (previous === undefined) delete globalThis.document; else globalThis.document = previous; setLanguage('es'); });
  return elements;
}

test('weekly renderer uses current offset and preferences, preserves personal notes and omits future earnings', t => {
  const elements = documentFixture(t); setLanguage('es');
  const context = {
    settings:{weekSummaryTipDismissed:false}, weekViewOffset:0,
    weekSummaryForOffset: offset => ({weekStart:offset,weekEnd:7,days:[
      {dayKey:'worked',calls:2,hasShift:true,earnings:5,productive:10,adherencePct:95,note:{category:'note',comment:'<Mi nota personal>'}},
      {dayKey:'future',isFuture:true,calls:0,hasShift:false,earnings:999,productive:0,adherencePct:null},
    ],totals:{calls:2,earnings:5,productive:10,avgAdherence:95}}),
    formatWeekRangeLabel:(from,to)=>`${from}–${to}`, cycleWeekNumberForWeekStart:()=>1,
    callDateToDate:()=>new Date(2026,9,18),weekdayKeyForDayKey:key=>key,
    WEEKDAY_LABELS:{worked:'Día personal',future:'Futuro'},dayNoteCategoryMeta:()=>({label:'Nota',tagClass:'neutral'}),
    escapeHtml,money,financeConvertedNote:()=>'<small>≈ L 125</small>',formatDuration:value=>String(value),
    iconHtml:()=>'',convertedAmountText:()=> '≈ L 125',
  };
  renderWeekSummary(context);
  assert.match(elements.weekSummaryWrap.innerHTML,/\$5\.00/);
  assert.match(elements.weekSummaryWrap.innerHTML,/≈ L 125/);
  assert.match(elements.weekSummaryWrap.innerHTML,/&lt;Mi nota personal&gt;/);
  assert.doesNotMatch(elements.weekSummaryWrap.innerHTML,/\$999/);
  assert.match(elements.weekSummarySubtitle.textContent,/Semana actual/);
  context.weekViewOffset=-1;context.settings.weekSummaryTipDismissed=true;setLanguage('en');
  renderWeekSummary(context);
  assert.equal(elements.weekSummaryTip.hidden,true);
  assert.match(elements.weekSummarySubtitle.textContent,/-1–7/);
  assert.doesNotMatch(elements.weekSummarySubtitle.textContent,/Current week/);
  assert.match(elements.weekSummaryWrap.innerHTML,/Weekly total/);
  assert.match(elements.weekSummaryWrap.innerHTML,/Mi nota personal/);
});

test('pay-date renderer uses the supplied cycle dates and current locale on each render', t => {
  const elements = documentFixture(t);
  const context={
    todayRange:(date=new Date(2026,9,18))=>new Date(date.getFullYear(),date.getMonth(),date.getDate()),
    cycleBoundsForOffset:offset=>({start:new Date(2026,9,18+offset*14),end:new Date(2026,9,31+offset*14),payDate:new Date(2026,10,5+offset*14)}),
    formatCallDayLabel:key=>key,todayCallDateKey:date=>String(date.getDate()),escapeHtml,iconHtml:()=>'',
  };
  setLanguage('es');renderPayDatesSection(context);
  assert.match(elements.payDatesBody.innerHTML,/Próximo pago/);
  assert.match(elements.payDatesBody.innerHTML,/noviembre/);
  setLanguage('en');renderPayDatesSection(context);
  assert.match(elements.payDatesBody.innerHTML,/Next payday/);
  assert.match(elements.payDatesBody.innerHTML,/November/);
});
