import { validatePortalRecord } from './propio-history-records.js';
import { validateAutomationLease } from './automation-lease.js';
export const BRIDGE_PROTOCOL = 'pst-propio-bridge/v1';
export const TRACKER_ORIGIN = 'https://propio-shift-tracker.vercel.app';
export const PORTAL_ORIGIN = 'https://interpreters.propio-ls.com';
export const TWILIO_EVENT_ORIGINS = Object.freeze(['https://eventgw.twilio.com', 'https://eventgw.us1.twilio.com', 'https://eventgw.ie1.twilio.com', 'https://eventgw.au1.twilio.com']);
export const BRIDGE_MAX_AGE = 24 * 60 * 60 * 1000;
export const bridgeId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{12,100}$/.test(value);
export const accountScopeValid = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
export function validateBridgePlan(value, now = Date.now()) {
  if (!value || typeof value !== 'object' || typeof value.startAt !== 'string' || typeof value.endAt !== 'string') return null;
  const start = Date.parse(value.startAt), end = Date.parse(value.endAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > BRIDGE_MAX_AGE || Math.abs(start - now) > BRIDGE_MAX_AGE) return null;
  if (value.scheduledPauses !== undefined && (!Array.isArray(value.scheduledPauses) || value.scheduledPauses.length > 100)) return null;
  const scheduledPauses = (value.scheduledPauses || []).map(input => {
    if (!input || !['break','lunch'].includes(input.type) || typeof input.startedAt !== 'string' || typeof input.endedAt !== 'string') return null;
    const from = Date.parse(input.startedAt), to = Date.parse(input.endedAt);
    return Number.isFinite(from) && Number.isFinite(to) && from >= start && to <= end && from < to
      ? { type: input.type, startedAt: new Date(from).toISOString(), endedAt: new Date(to).toISOString() } : null;
  });
  if (scheduledPauses.some(slot => !slot)) return null;
  const pause = (input, completed) => {
    if (!input || !['break','lunch'].includes(input.type) || typeof input.startedAt !== 'string') return null;
    const started = Date.parse(input.startedAt), ended = Date.parse(completed ? input.endedAt : input.endsAt);
    if (!Number.isFinite(started) || started > now || now - started > BRIDGE_MAX_AGE) return null;
    return { type: input.type, startedAt: new Date(started).toISOString(),
      [completed ? 'endedAt' : 'endsAt']: Number.isFinite(ended) && ended > started && ended - started <= BRIDGE_MAX_AGE && (!completed || ended <= now) ? new Date(ended).toISOString() : null };
  };
  const acwStart = Date.parse(value.acw?.startedAt), acwObserved = Date.parse(value.acw?.observedAt);
  const acw = typeof value.acw?.startedAt === 'string' && typeof value.acw?.observedAt === 'string' &&
    Number.isFinite(acwStart) && Number.isFinite(acwObserved) && acwStart >= start - BRIDGE_MAX_AGE && acwStart <= acwObserved &&
    acwStart < end && acwObserved <= now + 1000 && now - acwObserved <= BRIDGE_MAX_AGE
      ? { startedAt: new Date(acwStart).toISOString(), observedAt: new Date(acwObserved).toISOString() } : null;
  const work = value.workSession, workStart = typeof work?.startedAt === 'string' ? Date.parse(work.startedAt) : NaN;
  const workEnd = typeof work?.endedAt === 'string' ? Date.parse(work.endedAt) : NaN;
  const workSession = Number.isFinite(workStart) && Math.abs(workStart - now) <= BRIDGE_MAX_AGE
    ? { startedAt: new Date(workStart).toISOString(),
      endedAt: Number.isFinite(workEnd) && Math.abs(workEnd - now) <= BRIDGE_MAX_AGE && workEnd <= now ? new Date(workEnd).toISOString() : null,
      manual: work.manual === true, callAtStart: work.callAtStart === true } : null;
  return { startAt: new Date(start).toISOString(), endAt: new Date(end).toISOString(), hasCall: value.hasCall === true, ended: value.ended === true,
    workSession,
    acw, acwVerified: value.acwVerified !== false && (value.acw === null || !!acw),
    lastCallEndedAt: typeof value.lastCallEndedAt === 'string' && Date.parse(value.lastCallEndedAt) >= start && Date.parse(value.lastCallEndedAt) <= Math.min(now, end) ? new Date(value.lastCallEndedAt).toISOString() : null,
    scheduledPauses, scheduleVerified: Array.isArray(value.scheduledPauses) && value.scheduleVerified !== false,
    pause: pause(value.pause, false), lastPause: pause(value.lastPause, true),
    automationLease: validateAutomationLease(value.automationLease, now) };
}
export function validateBridgeEvent(value, now = Date.now()) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== 1 || !bridgeId(value.id)) return null;
  if (!['call-start','call-end','session-start','session-end','available','unavailable','history-records','pause-end'].includes(value.type)) return null;
  const time = typeof value.at === 'string' ? Date.parse(value.at) : NaN;
  if (!Number.isFinite(time) || time > now + 10000 || now - time > BRIDGE_MAX_AGE) return null;
  const event = { version: 1, id: value.id, type: value.type, at: new Date(time).toISOString() };
  if (value.type === 'pause-end') {
    const start = typeof value.startedAt === 'string' ? Date.parse(value.startedAt) : NaN;
    if (!['break','lunch'].includes(value.pauseType) || !Number.isFinite(start) || start >= time || now - start > BRIDGE_MAX_AGE) return null;
    event.pauseType = value.pauseType; event.startedAt = new Date(start).toISOString();
  }
  if (value.type === 'history-records') {
    if (!Array.isArray(value.records) || !value.records.length || value.records.length > 100) return null;
    event.records = value.records.map(record => validatePortalRecord(record, now));
    if (event.records.some(record => !record)) return null;
  }
  if (value.type.startsWith('session-')) {
    if (!bridgeId(value.sessionId)) return null;
    event.sessionId = value.sessionId;
    if (value.type === 'session-end') {
      const start = Date.parse(value.startedAt);
      if (!Number.isFinite(start) || start > time || now - start > BRIDGE_MAX_AGE) return null;
      event.startedAt = new Date(start).toISOString();
    }
  }
  if (value.type.startsWith('call-')) {
    if (!bridgeId(value.callId)) return null;
    event.callId = value.callId;
    if (value.type === 'call-end') {
      const start = typeof value.startedAt === 'string' ? Date.parse(value.startedAt) : NaN;
      if (!Number.isFinite(start) || start >= time || time-start > BRIDGE_MAX_AGE || now-start > BRIDGE_MAX_AGE) return null;
      event.startedAt = new Date(start).toISOString();
    }
  }
  return event;
}

// Signals are allowlisted from the published add-on; their current portal compatibility still needs observation.
export function readPropioSignal(url, body) {
  let target;
  try { target = new URL(url); } catch { return null; }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  if (target.origin === PORTAL_ORIGIN && target.pathname === '/api/Interpreter/UpdateInterpreterStatus') {
    return body.status === 'AV' ? 'available' : body.status === 'LO' ? 'unavailable' : null;
  }
  if (!TWILIO_EVENT_ORIGINS.includes(target.origin) || target.pathname !== '/v4/EndpointEvents') return null;
  return new Map([['incoming', 'incoming'], ['accepted-by-local', 'accepted'], ['rejected-by-local', 'rejected'], ['disconnected-by-local', 'disconnected'], ['disconnected-by-remote', 'disconnected']]).get(body.name) || null;
}

export function propioRequestKind(url) {
  let target;
  try { target = new URL(url); } catch { return null; }
  if (target.origin === PORTAL_ORIGIN) {
    if (target.pathname === '/api/Interpreter/UpdateInterpreterStatus') return 'status';
    return 'portal-api';
  }
  return TWILIO_EVENT_ORIGINS.includes(target.origin) && target.pathname === '/v4/EndpointEvents' ? 'twilio' : null;
}

export function readPropioRequestBody(requestBody) {
  if (requestBody?.formData && typeof requestBody.formData === 'object') {
    const body = {};
    for (const key of ['name', 'status']) {
      const values = requestBody.formData[key];
      if (Array.isArray(values) && values.length === 1 && typeof values[0] === 'string' && values[0].length <= 64) body[key] = values[0];
    }
    return { body, format: 'form' };
  }
  const raw = requestBody?.raw;
  if (!Array.isArray(raw) || !raw.length || raw.some(part => !part.bytes)) return { body: null, format: 'missing' };
  const parts = raw.map(part => new Uint8Array(part.bytes));
  const length = parts.reduce((size, part) => size + part.length, 0);
  if (length > 65536) return { body: null, format: 'oversized' };
  const bytes = new Uint8Array(length); let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  const text = new TextDecoder().decode(bytes);
  try { return { body: JSON.parse(text), format: 'json' }; } catch {}
  const form = new URLSearchParams(text), body = {};
  for (const key of ['name', 'status']) {
    const values = form.getAll(key);
    if (values.length === 1 && values[0].length <= 64) body[key] = values[0];
  }
  return Object.keys(body).length ? { body, format: 'form' } : { body: null, format: 'unreadable' };
}

export function createPropioReducer({ randomId = () => crypto.randomUUID() } = {}) {
  return function reduce(previous, signal, at) {
    const state = { active: previous?.active ? { ...previous.active } : null, completed: Number(previous?.completed) || 0,
      ...(previous?.lastEndedAt ? { lastEndedAt: previous.lastEndedAt } : {}) };
    let event = null;
    if (!Number.isFinite(Date.parse(at))) return { state, event };
    if (signal === 'accepted' && !state.active && !(Date.parse(at) < Date.parse(state.lastEndedAt))) {
      state.active = { callId: randomId(), startedAt: at };
      event = { version: 1, id: randomId(), type: 'call-start', callId: state.active.callId, at };
    } else if (signal === 'disconnected' && state.active && Date.parse(at) > Date.parse(state.active.startedAt)) {
      event = { version: 1, id: randomId(), type: 'call-end', callId: state.active.callId, startedAt: state.active.startedAt, at };
      state.active = null; state.completed++; state.lastEndedAt = at;
    } else if (signal === 'available' || signal === 'unavailable') {
      event = { version: 1, id: randomId(), type: signal, at };
    }
    return { state, event };
  };
}
