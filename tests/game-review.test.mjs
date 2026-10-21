import test from 'node:test';
import assert from 'node:assert/strict';
import {goalChestStatus,equipmentMatchesFilter} from '../js/game-review.js';
import {normalizeGameState} from '../js/game.js';

test('chest review distinguishes earned, claimed and corrected rewards without granting anything',()=>{
 assert.equal(goalChestStatus(),'pending');
 assert.equal(goalChestStatus({defeated:true}),'available');
 assert.equal(goalChestStatus({claimed:true,defeated:false}),'claimed');
 assert.equal(goalChestStatus({adjustedAt:'2026-10-20T12:00:00Z'}),'adjusted');
 assert.equal(goalChestStatus({defeated:true,adjustedAt:'2026-10-20T12:00:00Z'}),'available');
});
test('chest correction context survives live and finalized state normalization',()=>{
 for(const finalized of [false,true]){
  const state=normalizeGameState({days:{'10/20/2026':{finalized,goalChestAdjustedAt:'2026-10-20T12:00:00Z'}}});
  assert.equal(state.days['10/20/2026'].goalChestAdjustedAt,'2026-10-20T12:00:00.000Z');
 }
 assert.equal(normalizeGameState({days:{'10/20/2026':{goalChestAdjustedAt:'invalid'}}}).days['10/20/2026'].goalChestAdjustedAt,undefined);
});
test('equipment filters keep equipped pieces owned while separating available and locked items',()=>{
 assert.equal(equipmentMatchesFilter('equipped','owned'),true);
 assert.equal(equipmentMatchesFilter('available','owned'),true);
 assert.equal(equipmentMatchesFilter('locked','owned'),false);
 assert.equal(equipmentMatchesFilter('equipped','available'),false);
 assert.equal(equipmentMatchesFilter('locked','all'),true);
});
