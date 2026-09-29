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
    const startDate = new Date(start);
    const endDate = new Date(end);
    const paused = typeof overlapMinutesWithIntervals === 'function'
      ? overlapMinutesWithIntervals(startDate, endDate, actualPauses)
      : 0;
    return total + Math.max(0, (end - start) / 60000 - paused);
  }, 0);
}
