function numericPay(value) {
  const n = Number(String(value ?? '').replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function observedCallRecord(call) {
  if (call?.records?.tool) return { ...call.records.tool };
  if (call?.source !== 'live') return null;
  const start = Date.parse(call.startISO), end = Date.parse(call.endISO);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return { id: call.id, startISO: call.startISO, endISO: call.endISO, durationMs: end - start,
    pay: numericPay(call.pay), detectedBy: call.propioBridge ? 'extension' : 'tool',
    ...(call.propioBridge?.callId ? { callId: call.propioBridge.callId } : {}) };
}

export function reportedCallRecord(call) {
  if (call?.records?.propio) return { ...call.records.propio };
  if (call?.source !== 'import') return null;
  return { startISO: call.startISO, endISO: call.endISO, durationMin: Number(call.durationMin),
    pay: numericPay(call.pay), customerId: call.customerId, receivedAt: call.officialCorrection?.at || call.importedAt || null };
}

export function preserveCallRecords(incoming, previous, at) {
  const tool = observedCallRecord(previous), prior = reportedCallRecord(previous);
  const propio = { startISO: incoming.startISO, endISO: incoming.endISO, durationMin: Number(incoming.durationMin),
    pay: numericPay(incoming.pay), customerId: incoming.customerId, receivedAt: at };
  const old = previous?.records?.changes || [];
  const changed = prior && ['startISO', 'endISO', 'durationMin', 'pay'].some(key => prior[key] !== propio[key]);
  return { ...incoming, records: { ...(tool ? { tool } : {}), propio,
    ...(changed || old.length ? { changes: [...old, ...(changed ? [prior] : [])].slice(-12) } : {}) } };
}

export function compareCallRecords(call) {
  const tool = observedCallRecord(call), propio = reportedCallRecord(call);
  return { tool, propio,
    differenceMs: tool && propio ? Date.parse(tool.endISO) - Date.parse(propio.endISO) : null,
    payDifference: tool && propio ? Number((tool.pay - propio.pay).toFixed(2)) : null };
}

export function acwCallRecord(calls, startedAt) {
  const time = Date.parse(startedAt);
  return calls.find(call => Date.parse(call.records?.propio?.endISO || call.endISO) === time) || null;
}

export function latestCompletedCall(calls, nowMs = Date.now()) {
  let latest = null, latestEnd = -Infinity;
  for (const call of calls) {
    const end = Date.parse(call.records?.tool?.endISO || call.endISO);
    if (Number.isFinite(end) && end <= nowMs && end > latestEnd) { latest = call; latestEnd = end; }
  }
  return latest;
}

export function callElapsedMs(call) {
  return call?.source === 'live' && Number.isFinite(Date.parse(call.startISO)) && Number.isFinite(Date.parse(call.endISO))
    ? Math.max(0, Date.parse(call.endISO) - Date.parse(call.startISO)) : Math.max(0, Number(call?.durationMin) || 0) * 60000;
}
