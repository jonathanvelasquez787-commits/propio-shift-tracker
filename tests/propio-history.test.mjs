import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePortalNumber, summarizePortalRows, portalColumns } from '../js/propio-history.js';

test('portal numbers recognize USD, decimal comma and grouped currencies without treating pending as zero', () => {
  for (const [input, expected] of [['$1,234.50',1234.5],['USD 0.12',.12],['12,50',12.5],['1.234,50',1234.5],['1,234',1234],['.50',.5],['-$0.10',-.1],['0',0],['',null],['—',null],['Pending',null],['1.2.3',null],['1,2,3.45',null],['12 min',null]]) assert.equal(parsePortalNumber(input), expected, input);
});

test('summary uses actual portal pay including unpaid rows and negative adjustments', () => {
  const summary = summarizePortalRows([{ minutes:'12.5',pay:'$1.70' },{ minutes:'5',pay:'$0.00' },{ minutes:'0',pay:'-$0.10' }]);
  assert.equal(summary.minutes,17.5);
  assert.equal(summary.missingPay,0);
  assert.equal(summary.pay,1.6);
});

test('pending money and invalid duration remain explicit partial totals', () => {
  assert.deepEqual(summarizePortalRows([{minutes:'10',pay:'Pending'},{minutes:'—',pay:'$2.50'},{minutes:'-5',pay:'0'}]),{count:3,minutes:10,pay:2.5,missingMinutes:2,missingPay:1});
  assert.deepEqual(summarizePortalRows([]),{count:0,minutes:0,pay:0,missingMinutes:0,missingPay:0});
  assert.equal(summarizePortalRows(Array.from({length:100},()=>({minutes:'.1',pay:'.1'}))).pay,10);
});

test('columns recognize reordered call history and reject unrelated tables', () => {
  assert.deepEqual(portalColumns(['Pay','Call Date','Duration (Minutes)','Billable']),{minutes:2,pay:0});
  assert.equal(portalColumns(['Pay','Duration (Minutes)']),null);
  assert.equal(portalColumns(['Pay','Customer ID','Duration (Seconds)']),null);
});
