export function acwMinutesForBlock(gaps, windowStart, windowEnd, actualPauses, overlapMinutesWithIntervals) {
  const blockStart = new Date(windowStart).getTime();
  const blockEnd = new Date(windowEnd).getTime();
  if (!Number.isFinite(blockStart) || !Number.isFinite(blockEnd) || blockEnd <= blockStart) return 0;

  return (Array.isArray(gaps) ? gaps : []).reduce((total, gap) => {
    if (gap?.label !== 'acw') return total;
    const gapStart = new Date(gap.prev?.endISO).getTime();
    const gapEnd = new Date(gap.cur?.startISO).getTime();
    if (!Number.isFinite(gapStart) || !Number.isFinite(gapEnd) || gapEnd <= gapStart) return total;

    const start = Math.max(blockStart, gapStart);
    const end = Math.min(blockEnd, gapEnd);
    if (end <= start) return total;
    const intervals = Array.isArray(gap.connectedIntervals) ? gap.connectedIntervals : [{ start, end }];
    return total + intervals.reduce((minutes, interval) => {
      const from = Math.max(start, new Date(interval.start).getTime());
      const to = Math.min(end, new Date(interval.end).getTime());
      if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return minutes;
      const paused = typeof overlapMinutesWithIntervals === 'function'
        ? overlapMinutesWithIntervals(new Date(from), new Date(to), actualPauses) : 0;
      return minutes + Math.max(0, (to - from) / 60000 - paused);
    }, 0);
  }, 0);
}
