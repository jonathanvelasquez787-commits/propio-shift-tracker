import test from 'node:test';
import assert from 'node:assert/strict';
import {customSoundFootprint,productiveNoticeProgress} from '../js/notification-review.js';

test('custom audio size accounts for base64 padding and keeps encoded cost distinct',()=>{
 for(const bytes of [1,2,3,307200]){
  const uri='data:audio/wav;base64,'+Buffer.alloc(bytes).toString('base64');
  assert.deepEqual(customSoundFootprint(uri),{bytes,characters:uri.length});
 }
 for(const value of ['',null,'data:text/html;base64,YQ==','not audio','data:audio/wav;base64,##'])assert.equal(customSoundFootprint(value),null);
});
test('productive progress uses complete intervals without claiming that past notices fired',()=>{
 assert.deepEqual(productiveNoticeProgress(50,30),{completed:1,current:20,remaining:10,percent:20/30*100});
 assert.deepEqual(productiveNoticeProgress(60,30),{completed:2,current:0,remaining:30,percent:0});
 assert.equal(productiveNoticeProgress(10,0),null);
 assert.equal(productiveNoticeProgress(10,-1),null);
 assert.equal(productiveNoticeProgress(10,Infinity),null);
 assert.deepEqual(productiveNoticeProgress(-5,30),{completed:0,current:0,remaining:30,percent:0});
});
