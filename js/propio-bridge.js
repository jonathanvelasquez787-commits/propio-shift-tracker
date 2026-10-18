import { BRIDGE_PROTOCOL, validateBridgeEvent, bridgeId, accountScopeValid } from './propio-bridge-rules.js';

export function ignorePropioCall(state, callId, now = Date.now()) {
  if (!bridgeId(callId)) return;
  const ignored = Array.isArray(state.propioBridgeIgnoredCalls) ? state.propioBridgeIgnoredCalls : [];
  state.propioBridgeIgnoredCalls = [...ignored.filter(item => item?.at >= now - 48*60*60*1000 && item.callId !== callId), { callId, at: now }].slice(-2000);
}

export function createStorageRevisionGuard(storage, keys) {
  const known = new Map();
  let stale = false;
  try { keys.forEach(key => known.set(key, storage.getItem(key))); } catch { stale = true; }
  return {
    isCurrent() {
      if (!stale) {
        try { stale = keys.some(key => storage.getItem(key) !== known.get(key)); } catch { stale = true; }
      }
      return !stale;
    },
    record(key, value) { if (known.has(key)) known.set(key, value); },
  };
}

export function createPropioReceiver({ getState, getCalls, start, end, catchUp, startSession, endSession, endScheduledPause, importHistory, save, canReceive = () => true, now = () => Date.now() }) {
  function remember(state, event) {
    const cutoff = now() - 48*60*60*1000;
    const receipts = Array.isArray(state.propioBridgeReceipts) ? state.propioBridgeReceipts : [];
    state.propioBridgeReceipts = [...receipts.filter(r => bridgeId(r?.id) && Number(r.at) >= cutoff && r.id !== event.id), { id: event.id, at: now() }].slice(-2000);
    return save() === false ? { status: 'blocked', reason: 'storage' } : { status: 'ok' };
  }
  return function receive(raw) {
    const event = validateBridgeEvent(raw, now());
    if (!event) return { status: 'rejected', reason: 'invalid-event' };
    if (!canReceive()) return { status: 'blocked', reason: 'stale-tab' };
    const state = getState();
    if (!state) return { status: 'blocked', reason: 'app-not-ready' };
    if (Array.isArray(state.propioBridgeReceipts) && state.propioBridgeReceipts.some(r => r?.id === event.id)) return save() === false ? { status: 'blocked', reason: 'storage' } : { status: 'ok', duplicate: true };
    if (event.type === 'pause-end') {
      if (!endScheduledPause) return { status: 'blocked', reason: 'update-tracker' };
      if (state.activeCall || state.pendingLiveCallBackup) return { status: 'blocked', reason: 'pending-call-review' };
      if (state.activePause?.type !== event.pauseType || state.activePause?.startedAt !== event.startedAt || state.shiftEndedAt) {
        return { ...remember(state, event), superseded: true };
      }
      if (endScheduledPause(event) === false) return { status: 'blocked', reason: 'storage' };
      return remember(getState(), event);
    }
    if (event.type === 'history-records') {
      if (!importHistory) return { status: 'blocked', reason: 'update-tracker' };
      if (state.activeCall || state.pendingLiveCallBackup) return { status: 'blocked', reason: 'pending-call-review' };
      if (importHistory(event.records) === false) return { status: 'blocked', reason: 'history-needs-review' };
      return remember(getState(), event);
    }
    if (event.type.startsWith('session-')) {
      if (!startSession || !endSession) return { status: 'blocked', reason: 'update-tracker' };
      if (state.pendingLiveCallBackup) return { status: 'blocked', reason: 'pending-call-review' };
      if (event.type === 'session-start') {
        // A delayed login must not reopen a shift the user has since closed or replaced.
        if ((state.shiftEndedAt && Date.parse(state.shiftEndedAt) >= Date.parse(event.at)) ||
            (state.shiftStartedAt && Date.parse(state.shiftStartedAt) > Date.parse(event.at))) return remember(state, event);
        if ((!state.shiftStartedAt || state.shiftEndedAt) && startSession(event) === false) return { status: 'blocked', reason: 'storage' };
        state.propioBridgeSession = { sessionId: event.sessionId, shiftStartedAt: state.shiftStartedAt };
      } else {
        const linked = state.propioBridgeSession;
        if (linked?.sessionId === event.sessionId && linked.shiftStartedAt === state.shiftStartedAt && !state.shiftEndedAt) {
          if (state.activeCall) return { status: 'blocked', reason: 'another-active-call' };
          if (Date.parse(state.activePause?.startedAt) > Date.parse(event.at)) return { status: 'blocked', reason: 'pause-after-session-end' };
          if (endSession(event) === false) return { status: 'blocked', reason: 'storage' };
        }
        if (linked?.sessionId === event.sessionId) state.propioBridgeSession = null;
      }
      return remember(getState(), event);
    }
    if (!event.type.startsWith('call-')) return remember(state, event);
    if (Array.isArray(state.propioBridgeIgnoredCalls) && state.propioBridgeIgnoredCalls.some(item => item?.callId === event.callId)) return remember(state, event);
    if (getCalls().some(call => call.propioBridge?.callId === event.callId || call.id === `propio_${event.callId}`)) return remember(state, event);
    if (state.pendingLiveCallBackup) return { status: 'blocked', reason: 'pending-call-review' };
    const activeId = state.activeCall?.propioBridge?.callId;
    if (state.activeCall && activeId !== event.callId) return { status: 'blocked', reason: 'another-active-call' };
    if (event.type === 'call-start') {
      if (state.activePause && Date.parse(state.activePause.startedAt) > Date.parse(event.at)) return { status: 'blocked', reason: 'pause-after-call-start' };
      // Completed calls queued while the tracker was closed are saved from their paired end event.
      if (!state.activeCall && now() - Date.parse(event.at) <= 60000 && start(event) === false) return { status: 'blocked', reason: 'storage' };
    } else if (activeId === event.callId) {
      if (state.activeCall.startedAt !== event.startedAt) return { status: 'rejected', reason: 'start-mismatch' };
      if (end(event) === false) return { status: 'blocked', reason: 'pending-call-review' };
    } else if (catchUp(event) === false) return { status: 'blocked', reason: 'pending-call-review' };
    return remember(getState(), event);
  };
}

export function installPropioBridge({ host = globalThis.window, accountScope, receive, getPlan = () => null, onStatus = () => {} }) {
  if (!host || !accountScopeValid(accountScope)) return () => {};
  const nonce = host.crypto.randomUUID();
  let queue = Promise.resolve(), closed = false;
  const post = value => host.postMessage({ protocol: BRIDGE_PROTOCOL, direction: 'app', nonce, accountScope, ...value }, host.location.origin);
  const listener = message => {
    if (message.source !== host || message.origin !== host.location.origin || message.data?.protocol !== BRIDGE_PROTOCOL || message.data.direction !== 'extension') return;
    const packet = message.data;
    if (packet.kind === 'hello') { post({ kind: 'ready', plan: getPlan() }); return; }
    if (packet.kind === 'automation-status') {
      if (!closed && packet.nonce === nonce && packet.accountScope === accountScope) onStatus(packet.status);
      return;
    }
    if (packet.kind !== 'event' || packet.nonce !== nonce || packet.accountScope !== accountScope || !bridgeId(packet.requestId)) return;
    queue = queue.then(async () => {
      if (closed) return;
      let result;
      try {
        const apply = () => receive(packet.event);
        result = host.navigator?.locks ? await host.navigator.locks.request('pst-propio-bridge', apply) : await apply();
      } catch { result = { status: 'blocked', reason: 'app-error' }; }
      post({ kind: 'ack', requestId: packet.requestId, result });
    });
  };
  host.addEventListener('message', listener);
  post({ kind: 'ready', plan: getPlan() });
  return () => { closed = true; host.removeEventListener('message', listener); };
}
