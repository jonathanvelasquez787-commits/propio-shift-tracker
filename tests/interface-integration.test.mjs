import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parse} from 'parse5';
const html=fs.readFileSync(new URL('../app.html',import.meta.url),'utf8'),errors=[];
const document=parse(html,{onParseError:error=>errors.push(error.code)}),ids=new Map();
function walk(node){const id=node.attrs?.find(a=>a.name==='id')?.value;if(id)ids.set(id,node);for(const child of node.childNodes||[])walk(child);}walk(document);
function within(id,parent){for(let node=ids.get(id);node;node=node.parentNode)if(node===ids.get(parent))return true;return false;}
test('call comparison and correction share the existing detail and pending cases use the call filter',()=>{
 assert.deepEqual(errors,[]);
 assert.equal(within('callRecordsContent','callEditModal'),true);
 assert.equal(within('saveCallEditBtn','callEditFields'),true);
 assert.equal(ids.has('callRecordsModal'),false);assert.equal(ids.has('latestCallRecordRow'),false);
 assert.equal(within('callSourceFilter','blocksCallsView'),true);
 assert.equal(ids.has('pendingCallRecordsBtn'),false);
});
test('workday, allocation, recovery and support reside in their existing functional destinations',()=>{
 for(const [id,parent] of [['workDayReviewContent','pageReports'],['financeAutoFillInput','financeSection'],['snapshotRecoveryBtn','goalsModal'],['positiveInactivityMinutesInput','notificationsModal'],['gameReviewSummary','gameLevelPanel'],['physicalRewardSelected','pageAchievements']])assert.equal(within(id,parent),true,id);
 for(const id of ['workDayReviewModal','financeDistributionModal','cycleGoalInput'])assert.equal(ids.has(id),false,id);
 assert.equal(ids.has('cycleGoalAmountInput'),true);
 for(const id of ['financePlanDetails','financeMonthInput','financePaymentHistory','financeRowBudgetPeriodInput','financeRowExpenseTypeInput'])assert.equal(ids.has(id),false,id);
});

test('approved placements keep the existing Home controls and one copy of each detail',()=>{
 for(const id of ['callsSection','earningsAccordion','scheduleAccordion','blocksView','blocksCallsView'])assert.equal(within(id,'pageHome'),true,id);
 for(const id of ['earningsDayBreakdown','earningsCycleBreakdown','workDayReviewDetails'])assert.equal(within(id,'pageReports'),true,id);
 assert.equal(ids.has('automationPanel'),false);
 assert.match(fs.readFileSync(new URL('../extension/propio-bridge/popup.html',import.meta.url),'utf8'),/id="automationPanel"/);
 assert.equal(ids.has('automationStatusBtn'),false);
 assert.equal(ids.has('workDayReviewBtn'),false);
 assert.equal(within('acwLiveChip','heroSection'),true);
 assert.equal(within('daySelector','heroSection'),true);
 assert.equal(within('daySelector','clockDate'),false);
 assert.equal(ids.get('daySelector').parentNode,ids.get('clockDate').parentNode);
 assert.equal(within('daySelector','acwLiveChip'),false);
 assert.equal(within('daySelector','stateText'),false);
 assert.equal(ids.get('daySelector').parentNode.parentNode.parentNode.attrs.some(a=>a.name==='class'&&a.value==='clockbox'),true);
 assert.equal(ids.has('earningsHigherRateLiveCard'),false);
 assert.equal(within('higherRateLiveCard','higherRateModal'),true);
 assert.equal(within('positiveEvidenceCard','pageAchievements'),true);
 assert.equal(within('positiveEvidenceCard','pageHome'),false);
 assert.equal(within('callRecordingHelp','callEditModal'),true);
 for(const id of ['workDayReviewDetails','automationPanel','callRecordingHelp'])assert.equal(within(id,'pageHome'),false,id);
 for(const id of ['workDayReviewDetails','earningsDayBreakdown','earningsCycleBreakdown'])assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
});
