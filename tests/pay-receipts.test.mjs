import test from 'node:test';
import assert from 'node:assert/strict';
import {validPayReceipt,validPayReceipts,payReceiptFor,payReceiptComparison,payCycleExpected} from '../js/pay-receipt-model.js';
import {payReceiptAction} from '../js/pay-receipts.js';
import {ui,translateText,displayLocale} from '../js/i18n.js';
const receipt={id:'one',cycleStart:'2026-10-01',cycleEnd:'2026-10-14',scheduledDate:'2026-10-19',date:'2026-10-19',usd:100,expectedAtSave:98};

test('received cycle payments require explicit valid amounts and dates; calendar passage is not evidence',()=>{
  assert.equal(validPayReceipt(receipt),true);assert.equal(validPayReceipt({...receipt,usd:0}),true);
  for(const patch of [{usd:-1},{usd:Infinity},{usd:'100'},{date:'2026-02-30'},{cycleEnd:'2026-10-15'},{expectedAtSave:NaN},{id:''}])assert.equal(validPayReceipt({...receipt,...patch}),false);
  assert.equal(payReceiptFor([],receipt.cycleStart,receipt.cycleEnd),null);
});

test('cycle payment validation rejects duplicate IDs and duplicate cycle identities without discarding entries',()=>{
  assert.equal(validPayReceipts([receipt]),true);assert.equal(validPayReceipts([receipt,{...receipt,id:'other'}]),false);
  assert.equal(validPayReceipts([receipt,{...receipt,cycleStart:'2026-10-15',cycleEnd:'2026-10-28'}]),false);
  assert.equal(validPayReceipts([receipt,{...receipt,id:'other',cycleStart:'2026-10-15',cycleEnd:'2026-10-28'}]),true);
});

test('received money stays fixed while the comparison follows corrected call earnings',()=>{
  const before=JSON.stringify(receipt);
  assert.deepEqual(payReceiptComparison(receipt,98),{received:100,expected:98,difference:2,status:'above'});
  assert.equal(payReceiptComparison(receipt,105).difference,-5);assert.equal(payReceiptComparison(receipt,100).status,'equal');
  assert.equal(JSON.stringify(receipt),before);assert.equal(receipt.expectedAtSave,98);
});

test('cycle expectations include only the stored accounting days and do not alter calls or payments',()=>{
  const calls=[{day:'2026-09-30',pay:10},{day:'2026-10-01',pay:1.1},{day:'2026-10-14',pay:2.2},{day:'2026-10-15',pay:10}];
  const before=JSON.stringify(calls);assert.ok(Math.abs(payCycleExpected(calls,'2026-10-01','2026-10-14',c=>c.day,c=>c.pay)-3.3)<1e-9);
  assert.equal(JSON.stringify(calls),before);
});

function harness(t) {
  const prior=globalThis.document,elements=new Map();
  const element=id=>{if(!elements.has(id))elements.set(id,{value:'',textContent:'',innerHTML:'',hidden:false});return elements.get(id);};
  globalThis.document={getElementById:element};t.after(()=>{if(prior===undefined)delete globalThis.document;else globalThis.document=prior;});
  const data={settings:{payReceipts:[],financeCategories:{expense:{assignedAmount:50}}},calls:[{callDate:'2026-10-01',pay:98}]};
  let reject=false,allowed=true,saves=0,stored=null,confirmation;
  const closed=[],messages=[];
  const ctx={ui,translateText,displayLocale,data:()=>data,isoDateFromDayKey:value=>value,todayCallDateKey:()=> '2026-10-19',parseMoney:Number,higherRateBonusForCall:()=>({amount:0}),
    money:value=>'$'+value.toFixed(2),financeConvertedInline:value=>' (L '+(value*27).toFixed(2)+')',makeLocalId:()=> 'new-receipt',
    canPersistLocalChanges:()=>allowed,saveSettingsOnly:()=>{if(reject)return false;saves++;stored=JSON.stringify(data);return true;},
    openModal(){},closeModal:id=>closed.push(id),render(){},toast:message=>messages.push(message),appConfirm:(_message,run)=>{confirmation=run;}};
  return {data,element,closed,messages,ctx,action:(action,value)=>payReceiptAction(ctx,action,value),reject:value=>{reject=value;},allowed:value=>{allowed=value;},saves:()=>saves,stored:()=>JSON.parse(stored),confirm:()=>confirmation()};
}

test('received payment rejection preserves the form and existing balances; retry stores only its manual receipt',t=>{
  const h=harness(t),calls=JSON.stringify(h.data.calls),reserve=JSON.stringify(h.data.settings.financeCategories);
  h.action('open','2026-10-01|2026-10-14|2026-10-19');h.element('payReceiptAmount').value='100';h.reject(true);
  assert.equal(h.action('save'),false);assert.deepEqual(h.data.settings.payReceipts,[]);assert.equal(h.element('payReceiptAmount').value,'100');assert.equal(h.closed.length,0);
  h.reject(false);assert.equal(h.action('save'),true);assert.equal(h.data.settings.payReceipts.length,1);
  assert.equal(h.data.settings.payReceipts[0].expectedAtSave,98);assert.equal(h.stored().settings.payReceipts[0].usd,100);
  assert.equal(JSON.stringify(h.data.calls),calls);assert.equal(JSON.stringify(h.data.settings.financeCategories),reserve);
  assert.equal(h.action('save'),false);assert.equal(h.saves(),1);
});

test('received payment rejects changed owners, newer receipts and a future receipt date',t=>{
  const h=harness(t);h.action('open','2026-10-01|2026-10-14|2026-10-19');h.element('payReceiptAmount').value='100';
  h.element('payReceiptDate').value='2026-10-20';assert.equal(h.action('save'),false);assert.equal(h.saves(),0);
  h.element('payReceiptDate').value='2026-10-19';h.data.settings={payReceipts:[]};assert.equal(h.action('save'),false);assert.equal(h.saves(),0);
  h.action('open','2026-10-01|2026-10-14|2026-10-19');h.element('payReceiptAmount').value='110';h.data.settings.payReceipts=[receipt];
  assert.equal(h.action('save'),false);assert.equal(h.data.settings.payReceipts[0].usd,100);assert.equal(h.saves(),0);
});

test('malformed existing receipt storage is preserved instead of replaced by a new record',t=>{
  const h=harness(t),invalid={legacy:'unrecognized'};
  h.data.settings.payReceipts=invalid;
  h.action('open','2026-10-01|2026-10-14|2026-10-19');h.element('payReceiptAmount').value='100';
  assert.equal(h.action('save'),false);assert.equal(h.data.settings.payReceipts,invalid);assert.equal(h.saves(),0);
  assert.equal(h.closed.length,0);assert.equal(h.element('payReceiptAmount').value,'100');
});

test('editing or deleting a received payment requires the current receipt and preserves it after rejected deletion',t=>{
  const h=harness(t);h.data.settings.payReceipts=[receipt];h.action('open','2026-10-01|2026-10-14|2026-10-19');
  h.element('payReceiptAmount').value='101';assert.equal(h.action('save'),true);assert.equal(h.data.settings.payReceipts.length,1);assert.equal(h.data.settings.payReceipts[0].id,'one');
  h.action('open','2026-10-01|2026-10-14|2026-10-19');h.action('delete');assert.equal(h.data.settings.payReceipts.length,1);
  h.reject(true);assert.equal(h.confirm(),false);assert.equal(h.data.settings.payReceipts[0].usd,101);
  h.reject(false);h.action('delete');h.confirm();h.confirm();assert.deepEqual(h.data.settings.payReceipts,[]);assert.equal(h.saves(),2);
});
