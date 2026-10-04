import test from 'node:test';
import assert from 'node:assert/strict';
import { battleWorkMode, canPlayDuel, createDuel } from '../js/game-duel.js';
const advance = (duel, seconds, hero = { x: .3, jump: 100 }, work = 'break') => {
  for (let i=0;i<Math.ceil(seconds/.04);i++) duel.step(.04, hero, work);
  return duel.snapshot();
};
test('call state always takes precedence over pause, ended shift and off shift', () => {
  assert.equal(battleWorkMode({}), 'off');
  assert.equal(battleWorkMode({ shiftStartedAt: 'now' }), 'ready');
  assert.equal(battleWorkMode({ shiftStartedAt: 'now', activePause: {} }), 'break');
  assert.equal(battleWorkMode({ shiftStartedAt: 'now', shiftEndedAt: 'end' }), 'off');
  assert.equal(battleWorkMode({ activeCall: {}, activePause: {}, shiftEndedAt: 'end' }), 'call');
  for (const mode of ['call','ready','invalid',undefined]) assert.equal(canPlayDuel(mode), false);
});
test('work interruptions preserve duel time, points and health and never resume automatically', () => {
  const duel=createDuel(); assert.equal(duel.start('call'), false); assert.equal(duel.start('ready'), false);
  assert.equal(duel.start('break'), true); advance(duel,2); duel.shoot('break');
  const before=duel.snapshot(); advance(duel,30,{},'call');
  assert.deepEqual(duel.snapshot(), { ...before, status: 'paused' });
  assert.equal(duel.shoot('call'), false); assert.equal(duel.resume('call'), false);
  advance(duel,10); assert.deepEqual(duel.snapshot(), { ...before, status: 'paused' });
  assert.equal(duel.resume('off'), true); advance(duel,1); assert.ok(duel.snapshot().time < before.time);
});
test('all three attacks are telegraphed and jumping or moving avoids their collision', () => {
  const duel=createDuel(); duel.start('off'); const kinds=new Set();
  for(let i=0;i<350;i++) { const d=duel.step(.04,{x:.3,jump:100},'off'); d.attacks.forEach(a=>kinds.add(a.kind)); }
  assert.deepEqual([...kinds], ['wave','projectile','charge']); assert.equal(duel.snapshot().lives,3);
  const aimed=createDuel(); aimed.start('break');
  for(let i=0;i<200;i++) {
    const target=aimed.snapshot().attacks.find(a=>a.kind==='projectile');
    aimed.step(.04,{x:target&&target.age>.85?.7:.3,jump:target?0:100},'break');
  }
  assert.equal(aimed.snapshot().lives,3);
});
test('enemy damage can end a round, while safe play still expires at sixty seconds', () => {
  const hurt=createDuel(); hurt.start('break'); advance(hurt,20,{x:.3,jump:0});
  assert.equal(hurt.snapshot().status,'lost'); assert.equal(hurt.snapshot().lives,0);
  const timer=createDuel(); timer.start('off'); advance(timer,61);
  assert.equal(timer.snapshot().status,'lost'); assert.equal(timer.snapshot().time,0);
});
test('weapons, grenade cooldown, score and best round remain isolated in the arcade model', () => {
  const duel=createDuel(); duel.start('break');
  assert.equal(duel.shoot('break',{grenade:true}),true);
  assert.equal(duel.shoot('break',{grenade:true}),false);
  assert.equal(duel.shoot('break'),true); assert.equal(duel.shoot('break'),false);
  advance(duel,8.1); assert.equal(duel.snapshot().grenade,0);
  assert.equal(duel.shoot('break',{grenade:true}),true);
  while(duel.snapshot().status==='running') { advance(duel,.4); duel.shoot('break',{damage:16}); }
  const won=duel.snapshot(); assert.equal(won.status,'won'); assert.equal(won.hp,0); assert.ok(won.best>0);
  assert.equal(duel.shoot('break'),false); duel.start('off');
  assert.equal(duel.snapshot().points,0); assert.equal(duel.snapshot().best,won.best);
  const copy=duel.snapshot(); copy.hp=0; copy.attacks.push({kind:'fake'});
  assert.equal(duel.snapshot().hp,100); assert.deepEqual(duel.snapshot().attacks,[]);
});
