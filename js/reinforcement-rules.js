const MONETARY_STEPS = [25, 50, 75, 100];

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function timestamp(value) {
  if (value == null || value === '' || typeof value === 'boolean') return NaN;
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function mergedIntervals(items, start, end) {
  const intervals = (Array.isArray(items) ? items : []).flatMap((item) => {
    const from = Math.max(start, timestamp(item?.startedAt));
    const to = Math.min(end, timestamp(item?.endedAt));
    return Number.isFinite(from) && Number.isFinite(to) && to > from ? [[from, to]] : [];
  }).sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [from, to] of intervals) {
    const previous = merged[merged.length - 1];
    if (previous && from <= previous[1]) previous[1] = Math.max(previous[1], to);
    else merged.push([from, to]);
  }
  return merged;
}

export function monetaryMilestones(earnings, goal, claimed = []) {
  const previous = new Set((Array.isArray(claimed) ? claimed : [])
    .map(Number).filter((pct) => MONETARY_STEPS.includes(pct)));
  const target = finiteNumber(goal);
  const earned = Math.max(0, finiteNumber(earnings));
  if (target <= 0) return { crossed: [], next: null, claimed: MONETARY_STEPS.filter((pct) => previous.has(pct)) };
  const reached = (pct) => {
    const threshold = target * pct / 100;
    return earned >= threshold || threshold - earned <= Number.EPSILON * Math.max(1, earned, threshold) * 4;
  };
  const attained = MONETARY_STEPS.filter(reached);
  const crossed = attained.filter((pct) => !previous.has(pct));
  crossed.forEach((pct) => previous.add(pct));
  const nextPct = MONETARY_STEPS.find((pct) => !reached(pct));
  return {
    crossed,
    next: nextPct == null ? null : { pct: nextPct, remaining: Math.max(0, target * nextPct / 100 - earned) },
    claimed: MONETARY_STEPS.filter((pct) => previous.has(pct)),
  };
}

export function activeWorkSinceLastCall({
  shiftStartedAt, shiftEndedAt, activePause, pauseHistory = [], calls = [], now = Date.now(), activeCall, workIntervals,
} = {}) {
  if (!shiftStartedAt || shiftEndedAt || activeCall || activePause) return 0;
  const shiftStart = timestamp(shiftStartedAt);
  const current = timestamp(now);
  if (!Number.isFinite(shiftStart) || !Number.isFinite(current) || current <= shiftStart) return 0;
  let start = shiftStart;
  for (const call of Array.isArray(calls) ? calls : []) {
    const end = timestamp(call?.endISO);
    if (end >= start && end <= current) start = end;
  }
  const pauses = mergedIntervals(pauseHistory, start, current);
  const work = workIntervals === undefined ? [[start, current]] : mergedIntervals(workIntervals, start, current);
  let total = 0;
  for (const [workStart, workEnd] of work) {
    total += workEnd - workStart;
    for (const [pauseStart, pauseEnd] of pauses) {
      total -= Math.max(0, Math.min(workEnd, pauseEnd) - Math.max(workStart, pauseStart));
    }
  }
  return Math.max(0, total);
}
