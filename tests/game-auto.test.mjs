import test from 'node:test';
import assert from 'node:assert/strict';
import { createAutoBattle } from '../js/game-auto.js';

test('automatic combat attacks, dodges and starts another temporary round', () => {
  const a = createAutoBattle(), events = [];
  let jumped = false, won = false;
  for (let i = 0; i < 1800; i++) {
    events.push(...a.step(.04, 'pistol'));
    jumped ||= a.snapshot().jump > 30;
    won ||= a.snapshot().status === 'victory';
  }
  assert.ok(events.includes('shot')); assert.ok(events.includes('counter')); assert.ok(events.includes('round'));
  assert.ok(jumped); assert.ok(won); assert.ok(a.snapshot().round > 1);
  assert.equal(a.snapshot().hp, 100);
});

test('special charge comes from recorded calls and never refills from elapsed time', () => {
  const a = createAutoBattle();
  assert.equal(a.special(), true); assert.equal(a.snapshot().charge, 0);
  assert.equal(a.special(), false);
  for (let i = 0; i < 3000; i++) a.step(.04, 'smg');
  assert.equal(a.snapshot().charge, 0);
  a.recordCall(2); assert.equal(a.snapshot().charge, 50);
  a.recordCall(9000); assert.equal(a.snapshot().charge, 100);
  a.reset(); assert.equal(a.snapshot().round, 1); assert.equal(a.snapshot().enemyHp, 72);
});

test('time jumps cannot run hidden rounds and combat has no account dependencies', () => {
  const a = createAutoBattle();
  assert.deepEqual(a.step(1e6), []); assert.equal(a.snapshot().elapsed, .05);
  assert.equal(a.snapshot().enemyHp, 72);
  a.step(-5); assert.equal(a.snapshot().elapsed, .05);
  const b = createAutoBattle(); b.special();
  assert.equal(a.snapshot().charge, 100); assert.equal(a.snapshot().enemyHp, 72);
});
