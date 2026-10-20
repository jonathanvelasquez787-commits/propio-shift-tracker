export function callRecordSource(call) {
  if (call?.manualCorrectionAt) return 'manual-correction';
  if (call?.source === 'live' || call?.propioBridge?.payEstimated || call?.propioBridge?.timingEstimated) return 'estimated';
  if (call?.source === 'import') return call?.officialCorrection?.kind === 'corrected' ? 'official-correction' : 'official';
  if (call?.source === 'manual') return 'manual';
  return 'unknown';
}

export function matchesCallReview(call, search = '', source = 'all') {
  const kind = callRecordSource(call);
  if (search && !String(call?.customerId || '').toLocaleLowerCase().includes(String(search).trim().toLocaleLowerCase())) return false;
  return source === 'all' || source === kind || source === 'corrected' && kind.endsWith('-correction');
}
