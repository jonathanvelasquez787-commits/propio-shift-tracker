import test from 'node:test';
import assert from 'node:assert/strict';
import { monetaryMilestones, activeWorkSinceLastCall, supportiveDayEvidence, surpriseDecision } from '../js/reinforcement-rules.js';

const MINUTE = 60000;
const time = (clock) => `2026-09-29T${clock}:00-06:00`;

test('monetary milestones cross all reached thresholds once and survive reloads', () => {
  const first = monetaryMilestones(80, 100);
  assert.deepEqual(first, { crossed: [25, 50, 75], next: { pct: 100, remaining: 20 }, claimed: [25, 50, 75] });
  const reloaded = monetaryMilestones(80, 100, JSON.parse(JSON.stringify(first.claimed)));
  assert.deepEqual(reloaded.crossed, []);
  assert.deepEqual(monetaryMilestones(110, 100, reloaded.claimed), { crossed: [100], next: null, claimed: [25, 50, 75, 100] });
});

test('corrections, deletion and goal changes retain claims while showing actual next progress', () => {
  const claimed = [25, 50, 75];
  assert.deepEqual(monetaryMilestones(10, 100, claimed), { crossed: [], next: { pct: 25, remaining: 15 }, claimed });
  assert.deepEqual(monetaryMilestones(0, 100, claimed).claimed, claimed);
  assert.deepEqual(monetaryMilestones(80, 200, claimed), { crossed: [], next: { pct: 50, remaining: 20 }, claimed });
  assert.deepEqual(monetaryMilestones(80, 50, claimed).crossed, [100]);
  assert.deepEqual(monetaryMilestones(80, 0, claimed), { crossed: [], next: null, claimed });
  assert.deepEqual(monetaryMilestones(100, -5).crossed, []);
  assert.deepEqual(monetaryMilestones(25, 100, [25, '25', 3, null]).claimed, [25]);
  assert.deepEqual(claimed, [25, 50, 75]);
});

test('monetary milestones reach exact boundaries and reject nonfinite money', () => {
  assert.deepEqual(monetaryMilestones(25, 100).crossed, [25]);
  assert.deepEqual(monetaryMilestones(24.999, 100).crossed, []);
  assert.deepEqual(monetaryMilestones(Infinity, 100).crossed, []);
  assert.equal(monetaryMilestones(100, NaN).next, null);
  assert.deepEqual(monetaryMilestones(-100, 100).next, { pct: 25, remaining: 25 });
});

test('active work requires a real open shift and suppresses support during calls or pauses', () => {
  const input = { shiftStartedAt: time('08:00'), now: time('10:00') };
  assert.equal(activeWorkSinceLastCall(input), 120 * MINUTE);
  assert.equal(activeWorkSinceLastCall({ ...input, shiftStartedAt: null }), 0);
  assert.equal(activeWorkSinceLastCall({ ...input, shiftEndedAt: time('09:00') }), 0);
  assert.equal(activeWorkSinceLastCall({ ...input, activeCall: { startedAt: time('09:00') } }), 0);
  assert.equal(activeWorkSinceLastCall({ ...input, activePause: { startedAt: time('09:00') } }), 0);
  assert.equal(activeWorkSinceLastCall({ ...input, shiftStartedAt: time('11:00') }), 0);
});

test('active work uses latest completed call including dropped and excludes future or past-shift calls', () => {
  assert.equal(activeWorkSinceLastCall({
    shiftStartedAt: time('08:00'), now: time('10:00'),
    calls: [
      { endISO: time('07:30') }, { endISO: time('08:40') },
      { endISO: time('09:10'), dropped: true }, { endISO: time('11:00') },
      { endISO: 'invalid' },
    ],
  }), 50 * MINUTE);
});

test('active work subtracts a clipped union of pauses and interruptions rather than double counting', () => {
  assert.equal(activeWorkSinceLastCall({
    shiftStartedAt: time('08:00'), now: time('10:00'), calls: [{ endISO: time('08:20') }],
    pauseHistory: [
      { startedAt: time('08:10'), endedAt: time('08:30') },
      { startedAt: time('09:00'), endedAt: time('09:30') },
      { startedAt: time('09:20'), endedAt: time('09:40') },
      { startedAt: time('09:50'), endedAt: time('10:10') },
      { startedAt: time('09:55'), endedAt: time('09:40') },
      { startedAt: 'invalid', endedAt: time('09:40') },
    ],
  }), 40 * MINUTE);
});

test('active work follows the real shift across midnight without resetting inactivity', () => {
  const shift = { shiftStartedAt: '2026-09-29T23:00:00-06:00', now: '2026-09-30T01:00:00-06:00' };
  assert.equal(activeWorkSinceLastCall(shift), 120 * MINUTE);
  assert.equal(activeWorkSinceLastCall({
    ...shift,
    calls: [{ endISO: '2026-09-29T23:30:00-06:00', dropped: true }],
    pauseHistory: [{ startedAt: '2026-09-29T23:50:00-06:00', endedAt: '2026-09-30T00:20:00-06:00' }],
  }), 60 * MINUTE);
});

test('scheduled working intervals exclude off-duty time and union overlaps before subtracting pauses', () => {
  const input = { shiftStartedAt: time('08:00'), now: time('14:00'), calls: [{ endISO: time('08:30') }] };
  assert.equal(activeWorkSinceLastCall({ ...input, workIntervals: [] }), 0);
  assert.equal(activeWorkSinceLastCall({ ...input, workIntervals: [
    { startedAt: time('08:00'), endedAt: time('10:00') },
    { startedAt: time('09:00'), endedAt: time('10:30') },
    { startedAt: time('12:00'), endedAt: time('13:00') },
  ], pauseHistory: [
    { startedAt: time('09:30'), endedAt: time('11:00') },
    { startedAt: time('10:00'), endedAt: time('12:30') },
  ] }), 90 * MINUTE);
  assert.equal(activeWorkSinceLastCall(input), 330 * MINUTE);
});

test('scheduled work intersects the real overnight shift rather than calendar dates', () => {
  assert.equal(activeWorkSinceLastCall({
    shiftStartedAt: '2026-09-29T23:00:00-06:00', now: '2026-09-30T03:00:00-06:00',
    workIntervals: [{ startedAt: '2026-09-29T22:00:00-06:00', endedAt: '2026-09-30T01:00:00-06:00' }],
    pauseHistory: [{ startedAt: '2026-09-29T23:50:00-06:00', endedAt: '2026-09-30T00:20:00-06:00' }],
  }), 90 * MINUTE);
});

test('supportive closure uses up to three factual positives and conditional tomorrow projection', () => {
  const result = supportiveDayEvidence({
    callCount: 5, earnings: 10, bestCallAmount: 4, yesterdayEarnings: 8, yesterdayHasData: true,
    onTimePauses: 1, recoveries: 1, streak: 3, compliant: true,
    formatAmount: (value) => `$${value.toFixed(2)} (≈ L ${(value * 25).toFixed(2)})`,
  });
  assert.equal(result.things.length, 3);
  assert.match(result.things[0], /5 llamadas.*\$10\.00.*L 250\.00/);
  assert.match(result.things[1], /momento difícil/);
  assert.match(result.things[2], /tiempo de 1 pausa/);
  assert.match(result.projection, /^Si mañana.*4 días/);
});

test('sparse and difficult days never manufacture achievements or money without currency formatting', () => {
  assert.deepEqual(supportiveDayEvidence(), { things: [], projection: null });
  const empty = supportiveDayEvidence({ callCount: 0, earnings: 50, bestCallAmount: 12, recoveries: 2, streak: 5, compliant: true });
  assert.deepEqual(empty, { things: [], projection: null });
  const sparse = supportiveDayEvidence({ callCount: 1, earnings: 1, yesterdayEarnings: 50, yesterdayHasData: true, streak: 5 });
  assert.deepEqual(sparse, { things: ['Completaste 1 llamada.'], projection: null });
  assert.deepEqual(supportiveDayEvidence({ callCount: 0, onTimePauses: 1 }).things, ['Volviste a tiempo de 1 pausa.']);
});

test('closure comparisons stay personal and best call uses the provided money formatter', () => {
  const result = supportiveDayEvidence({ callCount: 2, earnings: 20, yesterdayEarnings: 10, yesterdayHasData: true, bestCallAmount: 12, formatAmount: (n) => `${n} USD · ${n * 25} HNL` });
  assert.match(result.things[1], /respecto a tu propio día/);
  assert.match(result.things[2], /12 USD · 300 HNL/);
  assert.equal(supportiveDayEvidence({ callCount: 2, earnings: 20, yesterdayEarnings: 10 }).things.length, 1);
  assert.equal(supportiveDayEvidence({ callCount: 1, streak: 0, compliant: true }).projection, null);
});

test('surprise decisions use a single validated controlled draw with a fifteen percent boundary', () => {
  let draws = 0;
  assert.equal(surpriseDecision(() => { draws++; return 0.149999; }), true);
  assert.equal(draws, 1);
  assert.equal(surpriseDecision(() => 0), true);
  assert.equal(surpriseDecision(() => 0.15), false);
  assert.equal(surpriseDecision(() => 0.99999), false);
  for (const value of [-1, 1, Infinity, NaN, '0.1', null]) assert.equal(surpriseDecision(() => value), false);
  assert.equal(surpriseDecision(null), false);
});
