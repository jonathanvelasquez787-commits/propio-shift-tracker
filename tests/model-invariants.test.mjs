import test from 'node:test';
import assert from 'node:assert/strict';
import { monetaryMilestones, activeWorkSinceLastCall } from '../js/reinforcement-rules.js';
import { configureHigherRateContext, higherRateBonusForCall } from '../js/higher-rate.js';
import { configureFinanceContext, financeRunAutoFillCascade } from '../js/finance.js';
import { setAppCalls, setAppSettings } from '../js/app-context.js';

function random(seed) { return max => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % max; }; }

test('10,000 seeded money cases agree with an independent integer-cent milestone oracle', () => {
  const next = random(597);
  for (let i = 0; i < 10000; i++) {
    const target = next(100000) + 1, earned = next(200000);
    const expected = [25, 50, 75, 100].filter(p => earned * 100 >= target * p);
    const result = monetaryMilestones(earned / 100, target / 100);
    assert.deepEqual(result.crossed, expected, `case ${i}`);
    assert.deepEqual(monetaryMilestones(earned / 100, target / 100, result.claimed).crossed, []);
  }
});

test('2,000 overlapping work and pause cases agree with a minute-by-minute activity oracle', () => {
  const next = random(20261008), base = Date.parse('2026-10-08T22:00:00Z');
  const at = minute => new Date(base + minute * 60000).toISOString();
  for (let i = 0; i < 2000; i++) {
    const make = () => Array.from({ length: next(12) }, () => { const a = next(300) - 30; return [a, a + next(90)]; });
    const work = make(), pauses = make(), callEnds = Array.from({ length: next(8) }, () => next(300) - 30);
    const start = Math.max(0, ...callEnds.filter(m => m >= 0 && m <= 240));
    let minutes = 0;
    for (let m = start; m < 240; m++) if (work.some(([a, b]) => a <= m && b > m) && !pauses.some(([a, b]) => a <= m && b > m)) minutes++;
    const intervals = source => source.map(([a, b]) => ({ startedAt: at(a), endedAt: at(b) }));
    assert.equal(activeWorkSinceLastCall({ shiftStartedAt: at(0), now: at(240), calls: callEnds.map(m => ({ endISO: at(m) })), workIntervals: intervals(work), pauseHistory: intervals(pauses) }), minutes * 60000, `case ${i}`);
  }
});

test('3,000 Higher Rate windows agree with an independent numeric-clock oracle across midnight and grace', () => {
  const next = random(96), rates = { bronze: { bonusPerMin: .03 }, silver: { bonusPerMin: .06 }, gold: { bonusPerMin: .09 } };
  configureHigherRateContext({ HIGHER_RATE_EARLY_GRACE_MIN: 7, HIGHER_RATE_TIERS: rates,
    toDateFromInputs: (date, clock) => new Date(`${date}T${clock}:00`), timeLabel: v => v, formatHHMM: v => v, toMinutes: v => Number(v.slice(0, 2)) * 60 + Number(v.slice(3)) });
  const clock = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const base = new Date('2026-10-08T00:00:00').getTime();
  for (let i = 0; i < 3000; i++) {
    const windows = Array.from({ length: 5 }, (_, id) => ({ id: String(id), date: '2026-10-08', start: clock(next(1440)), end: clock(next(1440)), tier: ['bronze', 'silver', 'gold'][next(3)] }));
    const minute = next(3000) - 20, durationMin = next(180);
    const qualifying = windows.filter(w => { const a = Number(w.start.slice(0, 2)) * 60 + Number(w.start.slice(3)), b = Number(w.end.slice(0, 2)) * 60 + Number(w.end.slice(3)); return a !== b && minute >= a - 7 && minute < (b < a ? b + 1440 : b); });
    const cents = Math.max(0, ...qualifying.map(w => Math.round(rates[w.tier].bonusPerMin * 100)));
    setAppSettings({ higherRateWindows: windows });
    const actual = higherRateBonusForCall({ startISO: new Date(base + minute * 60000).toISOString(), durationMin });
    assert.ok(Math.abs((actual?.amount || 0) - cents * durationMin / 100) < 1e-9, `case ${i}`);
  }
});

test('2,000 finance cascades conserve earnings in cents and preserve expense-first priority after corrections', () => {
  const next = random(888);
  configureFinanceContext({ parseMoney: Number, higherRateBonusForCalls: () => 0 });
  for (let i = 0; i < 2000; i++) {
    const rows = Array.from({ length: 12 }, (_, id) => ({ id: String(id), categoryId: 'otro', kind: id < 8 ? 'gasto' : 'meta', priority: id, targetAmount: (next(50000) + 1) / 100, assignedAmount: 0 }));
    setAppSettings({ financeAutoFill: true, financeCategories: { otro: { rows } } });
    for (const cents of [next(500000), next(100000), next(800000)]) {
      setAppCalls([{ pay: cents / 100 }]); financeRunAutoFillCascade();
      let left = cents;
      for (const row of rows) { const expected = Math.min(left, Math.round(row.targetAmount * 100)); left -= expected; assert.ok(Math.abs(row.assignedAmount * 100 - expected) < 1e-6, `case ${i}, row ${row.id}`); }
      const before = rows.map(r => r.assignedAmount);
      financeRunAutoFillCascade(); assert.deepEqual(rows.map(r => r.assignedAmount), before);
    }
  }
});
