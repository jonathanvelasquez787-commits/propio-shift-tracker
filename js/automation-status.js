export const AUTOMATION_STATUS_MAX_AGE = 15000;
const reasons = new Set(['connection','schedule','shift-ended','before-shift','review','in-call','incoming','portal-state',
  'multiple-portals','pause','spacing','acw-update','acw-pending','manual-paused','pause-return-off','first-done','off',
  'available','offline-control','retry','starting']);
const timestamp = value => typeof value === 'string' && value.length <= 32 && Number.isFinite(Date.parse(value)) ? value : null;
const fresh = (value, now) => value && now >= Date.parse(value) && now - Date.parse(value) <= AUTOMATION_STATUS_MAX_AGE;

export function validateAutomationStatus(value, now = Date.now()) {
  if (!value || value.version !== 1 || !timestamp(value.reportedAt) || !fresh(value.reportedAt, now)) return null;
  const options = value.options;
  if (!options || !['first','spacing','break','lunch','timed'].every(key => typeof options[key] === 'boolean') ||
      !Number.isInteger(options.minutes) || options.minutes < 1 || options.minutes > 60 ||
      typeof value.recording !== 'boolean' || typeof value.paused !== 'boolean' ||
      !['authenticated','logged-out','unknown'].includes(value.portal) || !['connected','incoming','idle','unknown'].includes(value.call)) return null;
  return {
    version: 1, reportedAt: value.reportedAt, observedAt: timestamp(value.observedAt),
    reason: reasons.has(value.reason) ? value.reason : 'portal-state', recording: value.recording, paused: value.paused,
    portal: value.portal, call: value.call, review: value.review === true,
    scheduleVerified: value.scheduleVerified === true, startAt: timestamp(value.startAt), endAt: timestamp(value.endAt),
    waitUntil: timestamp(value.waitUntil), acwObservedAt: timestamp(value.acwObservedAt),
    pauseType: ['break','lunch'].includes(value.pauseType) ? value.pauseType : null,
    queued: Number.isInteger(value.queued) ? Math.max(0, Math.min(200, value.queued)) : 0,
    options: Object.fromEntries(['first','spacing','break','lunch','timed','minutes'].map(key => [key, options[key]])),
  };
}

export function automationStatusView(snapshot, now = Date.now()) {
  if (!snapshot) return { key: 'missing', seconds: null };
  if (!fresh(snapshot.reportedAt, now)) return { key: 'stale', seconds: null };
  if (snapshot.review) return { key: 'review', seconds: null };
  if (!snapshot.recording) return { key: 'recording-off', seconds: null };
  if (snapshot.paused) return { key: 'manual-paused', seconds: null };
  if (!fresh(snapshot.observedAt, now)) return { key: 'stale', seconds: null };
  if (snapshot.portal !== 'authenticated') return { key: 'connection', seconds: null };
  if (snapshot.call === 'connected') return { key: 'in-call', seconds: null };
  if (snapshot.call === 'incoming') return { key: 'incoming', seconds: null };
  if (snapshot.reason === 'before-shift' && !snapshot.options.first) return {
    key: snapshot.options.spacing || snapshot.options.break || snapshot.options.lunch ? 'before-shift-manual' : 'off', seconds: null,
  };
  if (snapshot.reason === 'before-shift' && snapshot.startAt && now >= Date.parse(snapshot.startAt)) return { key: 'confirming', seconds: null };
  if (snapshot.reason === 'spacing') {
    if (!fresh(snapshot.acwObservedAt, now) || !snapshot.waitUntil) return { key: 'acw-pending', seconds: null };
    const seconds = Math.ceil((Date.parse(snapshot.waitUntil) - now) / 1000);
    return { key: seconds > 0 ? 'spacing' : 'confirming', seconds: seconds > 0 ? seconds : null };
  }
  return { key: snapshot.reason, seconds: null };
}

export function createAutomationStatus(state, now = Date.now()) {
  const prep = state.preparation, plan = prep.plan;
  const portals = Object.values(state.tabs).filter(tab => timestamp(tab.seenAt) && Date.parse(tab.seenAt) <= now);
  const recent = portals.filter(tab => fresh(tab.seenAt, now));
  const authenticated = recent.filter(tab => tab.session === 'authenticated' && tab.blockedDocument !== tab.documentId);
  const observedAt = portals.sort((a,b) => Date.parse(b.seenAt) - Date.parse(a.seenAt))[0]?.seenAt || null;
  const pause = plan?.pause || plan?.scheduledPauses?.find(slot => now >= Date.parse(slot.startedAt) && now < Date.parse(slot.endedAt));
  return validateAutomationStatus({ version: 1, reportedAt: new Date(now).toISOString(), observedAt,
    reason: prep.waitReason, recording: state.mode === 'auto', paused: prep.availabilityPaused === true,
    portal: authenticated.length ? 'authenticated' : recent.some(tab => tab.session === 'logged-out') ? 'logged-out' : 'unknown',
    call: ['connected','incoming','idle'].find(kind => authenticated.some(tab => tab.call === kind)) || 'unknown',
    review: Boolean(state.attention && !['tracker-closed'].includes(state.attention)),
    scheduleVerified: plan?.scheduleVerified === true, startAt: plan?.startAt, endAt: plan?.endAt,
    waitUntil: prep.spacing.waitUntil, acwObservedAt: plan?.acw?.observedAt, pauseType: pause?.type, queued: state.queue.length,
    options: { first: prep.enabled === true, spacing: prep.spacing.enabled === true, minutes: prep.spacing.minutes,
      break: prep.resume.break === true, lunch: prep.resume.lunch === true, timed: prep.resume.mode === 'timed' },
  }, now);
}
