import test from 'node:test';
import assert from 'node:assert/strict';
import { createAutoBattle } from '../js/game-auto.js';

test('idle time can only animate a tiny walk, never attack or create temporary HP', () => {
  const a = createAutoBattle();
  for (let i = 0; i < 10000; i++) {
    assert.deepEqual(a.step(.04), []);
    assert.ok(a.snapshot().x >= .185 && a.snapshot().x <= .195);
  }
  assert.equal(a.snapshot().calls, 0);
  assert.equal(a.snapshot().jump, 0);
  assert.equal(Object.hasOwn(a.snapshot(), 'hp'), false);
  assert.equal(Object.hasOwn(a.snapshot(), 'enemyHp'), false);
  assert.equal(Object.hasOwn(a.snapshot(), 'round'), false);
});

test('specials count exact third calls across grouped representations', () => {
  const a = createAutoBattle();
  assert.equal(a.recordCall(2), 0); assert.equal(a.snapshot().remainder, 2);
  assert.equal(a.recordCall(), 1); assert.equal(a.snapshot().remainder, 0);
  assert.equal(a.recordCall(8), 2); assert.equal(a.snapshot().remainder, 2);
  assert.equal(a.recordCall(), 1); assert.equal(a.snapshot().calls, 12);
  assert.equal(a.recordCall(9000), 3000);
  for (let i = 0; i < 1000; i++) a.step(.05);
  assert.equal(a.snapshot().calls, 9012);
  a.reset(); assert.equal(a.snapshot().calls, 0); assert.equal(a.snapshot().elapsed, 0);
});

test('time jumps and separate scenes cannot alter call cadence', () => {
  const a = createAutoBattle(), b = createAutoBattle();
  assert.deepEqual(a.step(1e6), []); assert.equal(a.snapshot().elapsed, .05);
  a.step(-5); assert.equal(a.snapshot().elapsed, .05);
  b.recordCall(3); assert.equal(a.snapshot().calls, 0); assert.equal(b.snapshot().calls, 3);
});
