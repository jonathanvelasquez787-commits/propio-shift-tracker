export const BRIDGE_PROTOCOL = 'pst-propio-bridge/v1';
export const TRACKER_ORIGIN = 'https://propio-shift-tracker.vercel.app';
export const PORTAL_ORIGIN = 'https://interpreters.propio-ls.com';
export const BRIDGE_MAX_AGE = 24 * 60 * 60 * 1000;
export const bridgeId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{12,100}$/.test(value);
export const accountScopeValid = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
export function validateBridgeEvent(value, now = Date.now()) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== 1 || !bridgeId(value.id)) return null;
  if (!['call-start','call-end','available','unavailable'].includes(value.type)) return null;
  const time = typeof value.at === 'string' ? Date.parse(value.at) : NaN;
  if (!Number.isFinite(time) || time > now + 10000 || now - time > BRIDGE_MAX_AGE) return null;
  const event = { version: 1, id: value.id, type: value.type, at: new Date(time).toISOString() };
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
  if (target.origin !== 'https://eventgw.twilio.com' || target.pathname !== '/v4/EndpointEvents') return null;
  return new Map([['incoming', 'incoming'], ['accepted-by-local', 'accepted'], ['rejected-by-local', 'rejected'], ['disconnected-by-local', 'disconnected'], ['disconnected-by-remote', 'disconnected']]).get(body.name) || null;
}

export function createPropioReducer({ randomId = () => crypto.randomUUID() } = {}) {
  return function reduce(previous, signal, at) {
    const state = { active: previous?.active ? { ...previous.active } : null, completed: Number(previous?.completed) || 0 };
    let event = null;
    if (!Number.isFinite(Date.parse(at))) return { state, event };
    if (signal === 'accepted' && !state.active) {
      state.active = { callId: randomId(), startedAt: at };
      event = { version: 1, id: randomId(), type: 'call-start', callId: state.active.callId, at };
    } else if (signal === 'disconnected' && state.active && Date.parse(at) > Date.parse(state.active.startedAt)) {
      event = { version: 1, id: randomId(), type: 'call-end', callId: state.active.callId, startedAt: state.active.startedAt, at };
      state.active = null; state.completed++;
    } else if (signal === 'available' || signal === 'unavailable') {
      event = { version: 1, id: randomId(), type: signal, at };
    }
    return { state, event };
  };
}
