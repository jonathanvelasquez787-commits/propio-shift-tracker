export const PAY_ESTIMATE_RULE = 'from-40-seconds';

// Personal estimate chosen by the owner; this is not a verified Propio billing rule.
export function roundedPayMinutes(durationMin) {
  const minutes = Number(durationMin);
  if (!Number.isFinite(minutes) || minutes <= 0) return 0;
  const whole = Math.floor(minutes);
  return whole + (minutes * 60 - whole * 60 >= 40 - 1e-7 ? 1 : 0);
}

export function callPayMinutes(call) {
  const duration = Number(call?.durationMin);
  if (!Number.isFinite(duration) || duration < 0) return 0;
  if (call?.payEstimateRule !== PAY_ESTIMATE_RULE || call.propioBridge?.payEstimated === false) return duration;
  const start = Date.parse(call.startISO), end = Date.parse(call.endISO);
  const exact = (end - start) / 60000;
  return roundedPayMinutes(call.source === 'live' && Number.isFinite(exact) && exact >= 0
    && Math.abs(exact - duration) <= .005001 ? exact : duration);
}
