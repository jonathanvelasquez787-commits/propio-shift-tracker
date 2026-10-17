import { PORTAL_ORIGIN, TRACKER_ORIGIN, TWILIO_EVENT_ORIGINS, accountScopeValid, readPropioSignal, readPropioRequestBody, propioRequestKind, validateBridgeEvent, validateBridgePlan, createPropioReducer } from '../../js/propio-bridge-rules.js';
import { validatePortalRecord, portalRecordKey } from '../../js/propio-history-records.js';

const KEY = 'bridge-v1';
const URLS = [`${PORTAL_ORIGIN}/*`, ...TWILIO_EVENT_ORIGINS.map(origin => `${origin}/v4/EndpointEvents*`)];
const SIGN_OUT_DESTINATIONS = new Set(['https://propio.com', 'https://www.propio.com']);
const fresh = () => ({ mode: 'observe', accountScope: null, tabs: {}, session: null, queue: [], completed: 0, last: [], attention: null,
  preparation: { enabled: false, availabilityPaused: false, plan: null, doneFor: null, lastAttemptAt: 0,
    spacing: { enabled: false, minutes: 2, lastEndedAt: null }, waitReason: null,
    resume: { break: false, lunch: false, mode: 'manual' }, pendingPause: null, resumedPauses: [] } });
export function createBridgeWorker(api, { now = () => Date.now(), randomId = () => crypto.randomUUID() } = {}) {
  const reduce = createPropioReducer({ randomId }), pending = new Map();
  let serial = Promise.resolve(), flushing = null;
  const transact = operation => {
    const result = serial.then(async () => {
      const stored = (await api.storage.local.get(KEY))[KEY];
      const state = stored?.schema === 1 ? { ...fresh(), ...stored } : fresh();
      state.preparation = { ...fresh().preparation, ...state.preparation, resume: { ...fresh().preparation.resume, ...state.preparation?.resume } };
      state.preparation.spacing = { ...fresh().preparation.spacing, ...state.preparation.spacing };
      const before = JSON.stringify(state);
      const output = await operation(state);
      if (stored?.schema !== 1 || before !== JSON.stringify(state)) await api.storage.local.set({ [KEY]: { ...state, schema: 1 } });
      return output;
    });
    serial = result.catch(() => {});
    return result;
  };
  async function trackers() {
    const tabs = await api.tabs.query({ url: `${TRACKER_ORIGIN}/*` });
    const results = await Promise.all(tabs.map(async tab => {
      try {
        const ready = await api.tabs.sendMessage(tab.id, { kind: 'identify-tracker' }, { frameId: 0 });
        return accountScopeValid(ready?.accountScope) ? { tabId: tab.id, accountScope: ready.accountScope, plan: validateBridgePlan(ready.plan, now()) } : null;
      } catch { return null; }
    }));
    return results.filter(Boolean);
  }
  function record(state, signal, at, event) {
    state.last = [...state.last, { signal, at }].slice(-20);
    if (state.mode === 'auto' && state.accountScope && event) {
      if (state.queue.length >= 200) { state.mode = 'observe'; state.attention = 'queue-full'; }
      else state.queue.push({ accountScope: state.accountScope, event });
    }
  }
  function callSignal(state, tabId, signal, at) {
    const { state: reduced, event } = reduce(state.tabs[tabId], signal, at);
    state.tabs[tabId] = { ...state.tabs[tabId], ...reduced };
    if (event?.type === 'call-start' && state.preparation.plan) {
      state.preparation.doneFor = state.preparation.plan.startAt;
      if (state.preparation.pendingPause) finishResume(state);
    }
    if (event?.type === 'call-end' && validateBridgeEvent(event, now())) state.completed++;
    if (event?.type === 'call-end' && validateBridgeEvent(event, now())) state.preparation.spacing.lastEndedAt = event.at;
    record(state, signal, at, event);
  }
  function finishResume(state) {
    const prep = state.preparation;
    if (prep.pendingPause) prep.resumedPauses = [...prep.resumedPauses, prep.pendingPause.startedAt].slice(-100);
    prep.pendingPause = null;
  }
  function setAvailabilityPaused(state, paused) {
    state.preparation.availabilityPaused = paused;
    if (!paused) return;
    state.queue = state.queue.filter(item => item.event.type !== 'pause-end');
    if (state.preparation.pendingPause) state.preparation.pendingPause.requestId = null;
  }
  function updatePlan(state, plan) {
    const prep = state.preparation;
    const cancelPending = () => {
      const requestId = prep.pendingPause?.requestId;
      if (requestId) state.queue = state.queue.filter(item => item.event.id !== requestId);
      prep.pendingPause = null;
    };
    prep.plan = plan;
    if (!plan) return;
    if (plan.ended) { cancelPending(); return; }
    const active = plan.pause;
    const pending = prep.pendingPause;
    const pendingEnd = pending?.endedAt || pending?.endsAt || pending?.startedAt;
    if (pending && (Date.parse(pending.startedAt) >= Date.parse(plan.endAt) ||
        (active?.startedAt !== pending.startedAt && Date.parse(pendingEnd) <= Date.parse(plan.startAt)))) cancelPending();
    if (active) {
      if (!prep.resume[active.type] || prep.resumedPauses.includes(active.startedAt)) { cancelPending(); return; }
      if (prep.pendingPause?.startedAt !== active.startedAt || prep.pendingPause.endsAt !== active.endsAt) {
        cancelPending();
        prep.pendingPause = { ...active, endedAt: null, requestId: null };
      }
    } else if (prep.pendingPause) {
      if (plan.lastPause?.startedAt === prep.pendingPause.startedAt && plan.lastPause.endedAt) prep.pendingPause.endedAt = plan.lastPause.endedAt;
      else if (!prep.pendingPause.endedAt) cancelPending();
    } else if (plan.lastPause?.endedAt && prep.resume[plan.lastPause.type] && !prep.resumedPauses.includes(plan.lastPause.startedAt) &&
        now() - Date.parse(plan.lastPause.endedAt) <= 300000 && (!plan.lastCallEndedAt || Date.parse(plan.lastCallEndedAt) <= Date.parse(plan.lastPause.endedAt))) {
      prep.pendingPause = { ...plan.lastPause, endsAt: null, requestId: null };
    }
  }
  function schedulePauseEnd(state, packet) {
    const prep = state.preparation, pause = prep.pendingPause, plan = validateBridgePlan(prep.plan, now());
    if (prep.availabilityPaused || !pause || prep.resume.mode !== 'timed' || !prep.resume[pause.type] || pause.requestId || pause.endedAt ||
        !pause.endsAt || now() < Date.parse(pause.endsAt) || state.mode !== 'auto' || !state.accountScope || !state.session ||
        !plan || plan.ended || now() < Date.parse(plan.startAt) || now() >= Date.parse(plan.endAt) || plan.pause?.startedAt !== pause.startedAt ||
        packet.session !== 'authenticated' || packet.call !== 'idle' || Object.values(state.tabs).some(tab => tab.active)) return;
    const at = new Date(now()).toISOString(), id = randomId();
    record(state, 'pause-end', at, { version: 1, id, type: 'pause-end', at, startedAt: pause.startedAt, pauseType: pause.type });
    if (state.queue.some(item => item.event.id === id)) pause.requestId = id;
  }
  function prepareFirst(state, tabId, packet) {
    const prep = state.preparation, plan = validateBridgePlan(prep.plan, now());
    prep.spacing.waitUntil = null;
    if (plan?.hasCall || plan?.ended || state.tabs[tabId]?.call === 'connected') { if (plan) prep.doneFor = plan.startAt; }
    const hold = reason => { prep.waitReason = reason; return { prepare: false, stopCalls: false }; };
    if (state.tabs[tabId]?.call === 'connected') { if (prep.pendingPause) finishResume(state); return hold('in-call'); }
    const pending = prep.pendingPause;
    const resumeReady = pending?.endedAt && prep.resume[pending.type];
    const completedPause = pending?.endedAt ? pending : plan?.lastPause;
    const plannedPause = plan?.scheduledPauses.some(slot => now() >= Date.parse(slot.startedAt) && now() < Date.parse(slot.endedAt) &&
      !(completedPause?.type === slot.type && completedPause.endedAt &&
        Date.parse(completedPause.startedAt) < Date.parse(slot.endedAt) && Date.parse(completedPause.endedAt) > Date.parse(slot.startedAt)));
    const firstReady = prep.enabled && plan?.scheduleVerified && prep.doneFor !== plan.startAt && !plan.hasCall && !plannedPause;
    if (state.mode !== 'auto' || !state.accountScope || !state.session || packet.session !== 'authenticated') return hold('connection');
    if (!plan || !plan.scheduleVerified) return hold('schedule');
    if (plan.ended || now() >= Date.parse(plan.endAt)) return hold('shift-ended');
    if (now() < Date.parse(plan.startAt)) return hold('before-shift');
    if (state.attention === 'multiple-trackers' || state.attention === 'tracker-needs-review') return hold('review');
    if (packet.call !== 'idle' || Object.values(state.tabs).some(tab => tab.active)) return hold(packet.call === 'incoming' ? 'incoming' : 'portal-state');
    if (prep.availabilityPaused) return hold('manual-paused');
    const portals = Object.entries(state.tabs).filter(([, tab]) => tab.session === 'authenticated' && tab.blockedDocument !== tab.documentId && now() - Date.parse(tab.seenAt) < 15000);
    if (portals.length !== 1 || portals[0][0] !== String(tabId)) return hold('multiple-portals');
    const spacing = prep.spacing;
    const lastEnded = Math.max(Date.parse(spacing.lastEndedAt) || 0, Date.parse(plan.lastCallEndedAt) || 0);
    const spacingReady = spacing.enabled === true && !firstReady && !resumeReady &&
      (plan.hasCall || (lastEnded >= Date.parse(plan.startAt) && lastEnded <= now()));
    if ((plan.pause && !(pending?.endedAt && plan.pause.startedAt === pending.startedAt)) || plannedPause) return hold('pause');
    const lastPauseEnd = Date.parse(plan.lastPause?.endedAt);
    if (Number.isFinite(lastPauseEnd) && !prep.resume[plan.lastPause.type] && lastEnded <= lastPauseEnd) return hold('pause-return-off');
    const acw = plan.acw;
    // A snapshot from before the call ended cannot resume availability afterward.
    const acwFresh = acw && Date.parse(acw.observedAt) <= now() && now() - Date.parse(acw.observedAt) <= 15000 &&
      (!spacing.lastEndedAt || Date.parse(acw.observedAt) >= Date.parse(spacing.lastEndedAt));
    const waitUntil = spacingReady && acwFresh ? Date.parse(acw.startedAt) + spacing.minutes * 60000 : null;
    prep.spacing.waitUntil = waitUntil ? new Date(waitUntil).toISOString() : null;
    if (spacingReady && (!acwFresh || now() < waitUntil)) {
      prep.waitReason = acwFresh ? 'spacing' : plan.acwVerified ? 'acw-pending' : 'acw-update';
      if (packet.available !== true || now() - (prep.lastStopAttemptAt || 0) < 15000) return { prepare: false, stopCalls: false };
      prep.lastStopAttemptAt = now(); record(state, 'spacing-stop', new Date(now()).toISOString(), null);
      return { prepare: false, stopCalls: true };
    }
    if (!firstReady && !resumeReady && !spacingReady) return hold(prep.enabled && (prep.doneFor === plan.startAt || plan.hasCall) ? 'first-done' : 'off');
    if (packet.offline !== true) return hold(packet.available === true ? 'available' : 'offline-control');
    if (now() - prep.lastAttemptAt < 15000) return hold('retry');
    prep.lastAttemptAt = now();
    prep.waitReason = 'starting';
    record(state, 'start-calls', new Date(now()).toISOString(), null);
    return { prepare: true, stopCalls: false };
  }
  function closeSession(state, at) {
    if (!state.session) return;
    for (const [id, tab] of Object.entries(state.tabs)) {
      if (tab.active) callSignal(state, id, 'disconnected', at);
      state.tabs[id].blockedDocument = tab.documentId;
      delete state.tabs[id].signOutPending;
    }
    const session = state.session; state.session = null;
    record(state, 'session-end', at, { version: 1, id: randomId(), type: 'session-end', ...session, at });
  }
  async function navigationCommitted(details) {
    if (details.frameId !== 0 || details.tabId < 0) return;
    try { if (!SIGN_OUT_DESTINATIONS.has(new URL(details.url).origin)) return; } catch { return; }
    // Address-bar visits, bookmarks, reloads and Back are not sign-out evidence.
    if (!['link', 'form_submit'].includes(details.transitionType) &&
        !details.transitionQualifiers?.some(value => ['client_redirect', 'server_redirect'].includes(value))) return;
    if (details.transitionQualifiers?.some(value => ['from_address_bar', 'forward_back'].includes(value))) return;
    await transact(state => {
      const tab = state.tabs[details.tabId], intent = tab?.signOutPending;
      if (!intent || !state.session || intent.sessionId !== state.session.sessionId ||
          now() - intent.at > 60000 || now() < intent.at) return;
      const at = new Date(now()).toISOString();
      closeSession(state, at);
      state.tabs[details.tabId] = { ...state.tabs[details.tabId], session: 'logged-out', call: 'unknown', seenAt: at };
    });
    await flush();
  }
  function beforeRequest(details) {
    const kind = propioRequestKind(details.url);
    if (!kind || details.tabId < 0 || pending.size >= 200) return;
    if (kind === 'portal-api' && details.method !== 'POST' && !['xmlhttprequest', 'websocket'].includes(details.type)) return;
    try { if (new URL(details.initiator).origin !== PORTAL_ORIGIN) return; } catch { return; }
    // Other portal APIs contribute only a counter; never inspect their bodies.
    let signal = null, format = 'not-read';
    try {
      if (kind !== 'portal-api' && details.method === 'POST') {
        const parsed = readPropioRequestBody(details.requestBody);
        format = parsed.format; signal = readPropioSignal(details.url, parsed.body);
      }
      pending.set(details.requestId, { signal, kind, format, tabId: details.tabId, at: new Date(details.timeStamp).toISOString() });
    } catch { /* Raw bodies, headers and URLs are never retained. */ }
  }
  async function completed(details) {
    const item = pending.get(details.requestId); pending.delete(details.requestId);
    if (!item) return;
    await transact(state => {
      const diagnostic = state.diagnostic || { requests: 0, recognized: 0, last: [] };
      const success = details.statusCode >= 200 && details.statusCode < 300;
      state.diagnostic = { requests: Math.min(1000000, diagnostic.requests + 1), recognized: Math.min(1000000, diagnostic.recognized + Number(success && !!item.signal)),
        last: [...diagnostic.last, { kind: item.kind, format: item.format, status: details.statusCode, result: !success ? 'http-error' : item.signal ? 'recognized' : 'unknown', at: item.at }].slice(-20) };
      if (!success || !item.signal) return;
      callSignal(state, item.tabId, item.signal, item.at);
    });
    await flush();
  }
  async function flushOnce() {
    const targets = await trackers();
    // Hold delivery while an account has multiple writable app tabs open.
    const queued = await transact(state => {
      if (state.mode !== 'auto') return null;
      const matched = targets.filter(target => target.accountScope === state.accountScope);
      if (matched.length === 1) {
        updatePlan(state, matched[0].plan);
        if (['multiple-trackers', 'tracker-closed'].includes(state.attention)) state.attention = null;
      } else { updatePlan(state, null); state.attention = matched.length ? 'multiple-trackers' : 'tracker-closed'; }
      if (!state.queue.length) return null;
      if (matched.length !== 1) { state.attention = matched.length ? 'multiple-trackers' : 'tracker-closed'; return null; }
      const item = state.queue[0];
      if (item.accountScope !== state.accountScope || !validateBridgeEvent(item.event, now())) {
        state.mode = 'observe'; state.attention = 'expired-event'; return null;
      }
      return { item, tabId: matched[0].tabId };
    });
    if (!queued) return false;
    let ack;
    try { ack = await api.tabs.sendMessage(queued.tabId, { kind: 'deliver-event', accountScope: queued.item.accountScope, event: queued.item.event }, { frameId: 0 }); }
    catch { ack = { status: 'blocked', reason: 'tracker-closed' }; }
    return transact(state => {
      if (state.queue[0]?.event.id !== queued.item.event.id || state.accountScope !== queued.item.accountScope) return false;
      if (ack?.status === 'ok') {
        if (queued.item.event.type === 'history-records') state.historySeen = [...(state.historySeen || []), ...queued.item.event.records.map(row => ({ key: portalRecordKey(row), signature: JSON.stringify(row), at: now() }))].slice(-2000);
        if (queued.item.event.type === 'pause-end' && state.preparation.pendingPause?.requestId === queued.item.event.id) {
          if (ack.superseded) finishResume(state);
          else state.preparation.pendingPause.endedAt = queued.item.event.at;
        }
        state.queue.shift(); state.attention = null; return true;
      }
      state.attention = ack?.status === 'rejected' ? 'event-rejected' : 'tracker-needs-review';
      if (ack?.status === 'rejected') state.mode = 'observe';
      return false;
    });
  }
  function flush() {
    if (!flushing) flushing = (async () => { for (let i = 0; i < 200 && await flushOnce(); i++) {} })().finally(() => { flushing = null; });
    return flushing;
  }
  async function message(packet, sender) {
    if (sender.id !== api.runtime.id) return null;
    if (packet?.kind === 'apply-portal-layout') {
      if (sender.frameId !== 0 || !sender.tab || !Number.isInteger(sender.tab.id)) return null;
      try { if (new URL(sender.url).origin !== PORTAL_ORIGIN) return null; } catch { return null; }
      return transact(async state => {
        const preferences = (await api.storage.local.get('propio-original-layout-v1'))['propio-original-layout-v1'];
        if (!preferences || preferences.revision !== packet.revision || typeof preferences.enabled !== 'boolean') return { ok: false, reason: 'layout-stale' };
        const tab = state.tabs[sender.tab.id];
        const elapsed = now() - Date.parse(tab?.seenAt);
        if (!tab || tab.session !== 'authenticated' || tab.blockedDocument === tab.documentId || tab.call !== 'idle' || !tab.offline || !Number.isFinite(elapsed) || elapsed < 0 || elapsed > 3000 ||
            Object.values(state.tabs).some(item => item.active || ['connected', 'incoming'].includes(item.call)) ||
            (state.preparation.waitReason === 'starting' && now() - state.preparation.lastAttemptAt < 3000)) return { ok: false, reason: 'portal-busy' };
        const portals = await api.tabs.query({ url: `${PORTAL_ORIGIN}/*` });
        if (portals.length !== 1 || portals[0].id !== sender.tab.id) return { ok: false, reason: 'multiple-portals' };
        const previous = (await api.storage.local.get('propio-original-layout-reload'))['propio-original-layout-reload'];
        if (previous?.revision === packet.revision && previous.tabId === sender.tab.id) return { ok: true, alreadyApplied: true };
        await api.storage.local.set({ 'propio-original-layout-reload': { revision: packet.revision, tabId: sender.tab.id } });
        try { await api.tabs.reload(sender.tab.id); }
        catch { await api.storage.local.set({ 'propio-original-layout-reload': previous || null }); return { ok: false, reason: 'layout-reload-failed' }; }
        return { ok: true };
      });
    }
    if (packet?.kind === 'portal-manual-availability') {
      if (sender.frameId !== 0 || !sender.tab || !['start', 'stop'].includes(packet.action)) return null;
      try { if (new URL(sender.url).origin !== PORTAL_ORIGIN) return null; } catch { return null; }
      return transact(state => {
        const tab = state.tabs[sender.tab.id];
        if (!state.session || tab?.session !== 'authenticated' || tab.documentId !== packet.documentId || tab.blockedDocument === packet.documentId ||
            now() < Date.parse(tab.seenAt) || now() - Date.parse(tab.seenAt) > 15000) return { ok: false, reason: 'session-not-confirmed' };
        setAvailabilityPaused(state, packet.action === 'stop');
        record(state, packet.action === 'stop' ? 'manual-stop' : 'manual-start', new Date(now()).toISOString(), null);
        return { ok: true };
      });
    }
    if (packet?.kind === 'portal-sign-out') {
      if (sender.frameId !== 0 || !sender.tab || !Number.isInteger(sender.tab.id) || sender.tab.id < 0 || !/^[\w-]{12,100}$/.test(packet.documentId || '')) return null;
      try { if (new URL(sender.url).origin !== PORTAL_ORIGIN) return null; } catch { return null; }
      return transact(state => {
        const tab = state.tabs[sender.tab.id];
        if (!state.session || tab?.session !== 'authenticated' || tab.documentId !== packet.documentId || tab.blockedDocument === packet.documentId) return { ok: false, reason: 'session-not-confirmed' };
        tab.signOutPending = { documentId: packet.documentId, sessionId: state.session.sessionId, at: now() };
        return { ok: true };
      });
    }
    if (packet?.kind === 'portal-observation') {
      if (sender.frameId !== 0 || !sender.tab || !Number.isInteger(sender.tab.id) || sender.tab.id < 0) return null;
      try { if (new URL(sender.url).origin !== PORTAL_ORIGIN) return null; } catch { return null; }
      if (!/^[\w-]{12,100}$/.test(packet.documentId || '') || !['authenticated', 'logged-out', 'unknown'].includes(packet.session) ||
          !['connected', 'idle', 'incoming', 'unknown'].includes(packet.call) ||
          (packet.signal && !['incoming', 'accepted', 'rejected', 'disconnected'].includes(packet.signal))) return null;
      const at = new Date(now()).toISOString();
      await transact(state => {
        const tabId = sender.tab.id, previous = state.tabs[tabId] || {};
        const blocked = previous.blockedDocument === packet.documentId;
        state.tabs[tabId] = { ...previous, documentId: packet.documentId, session: packet.session, call: packet.call, offline: packet.offline === true, seenAt: at };
        // A logout page can briefly load inside the portal before the public
        // redirect. Unknown UI keeps the intent; a new authenticated document cancels it.
        if (previous.documentId !== packet.documentId && packet.session === 'authenticated') delete state.tabs[tabId].signOutPending;
        if (packet.session === 'authenticated' && !blocked && !state.session) {
          state.session = { sessionId: randomId(), startedAt: at };
          record(state, 'session-start', at, { version: 1, id: randomId(), type: 'session-start', ...state.session, at });
        } else if (packet.session === 'logged-out' && state.session) {
          // Login remains a fallback when the session expires without a click.
          closeSession(state, at);
        }
        if (packet.session === 'logged-out') delete state.tabs[tabId].blockedDocument;
        if (packet.session === 'authenticated' && !blocked && packet.signal) callSignal(state, tabId, packet.signal, at);
        if (!blocked) schedulePauseEnd(state, packet);
      });
      await flush();
      return transact(state => ({ ok: true, ...prepareFirst(state, sender.tab.id, packet), historyEnabled: state.mode === 'auto' && !!state.accountScope && packet.session === 'authenticated' && packet.call !== 'connected' && !Object.values(state.tabs).some(tab => tab.active) }));
    }
    if (packet?.kind === 'portal-history') {
      if (sender.frameId !== 0 || !sender.tab || !Number.isInteger(sender.tab.id) || sender.tab.id < 0) return null;
      try { if (new URL(sender.url).origin !== PORTAL_ORIGIN) return null; } catch { return null; }
      if (!Number.isSafeInteger(packet.count) || packet.count < 0 || packet.count > 1000000 ||
          !Number.isSafeInteger(packet.invalid) || packet.invalid < 0 || packet.invalid > 1000000 ||
          !Array.isArray(packet.records) || packet.records.length > 100) return null;
      const result = await transact(state => {
        const tab = state.tabs[sender.tab.id];
        if (!tab || tab.documentId !== packet.documentId || tab.session !== 'authenticated' || tab.blockedDocument === packet.documentId) return { ok: false, reason: 'session-not-confirmed' };
        state.history = { count: packet.count, invalid: packet.invalid, at: new Date(now()).toISOString(), coverage: packet.coverage === 'range' ? 'range' : 'page' };
        if (state.mode !== 'auto' || !state.accountScope || tab.call === 'connected' || Object.values(state.tabs).some(tab => tab.active)) return { ok: true };
        const records = packet.records.map(record => validatePortalRecord(record, now()));
        if (records.some(record => !record)) return { ok: false, reason: 'invalid-record' };
        state.historySeen = (state.historySeen || []).filter(item => now() - item.at < 86400000).slice(-2000);
        const freshRecords = records.filter(record => {
          const key = portalRecordKey(record), signature = JSON.stringify(record);
          return !state.historySeen.some(item => item.key === key && item.signature === signature) &&
            !state.queue.some(item => item.event.type === 'history-records' && item.event.records.some(row => portalRecordKey(row) === key && JSON.stringify(row) === signature));
        });
        if (freshRecords.length) record(state, 'history', new Date(now()).toISOString(), { version: 1, id: randomId(), type: 'history-records', at: new Date(now()).toISOString(), records: freshRecords });
        return { ok: true };
      });
      await flush(); return result;
    }
    if (packet?.kind === 'tracker-ready') {
      if (sender.frameId !== 0 || !sender.tab || !accountScopeValid(packet.accountScope)) return null;
      try { if (new URL(sender.url).origin !== TRACKER_ORIGIN) return null; } catch { return null; }
      const targets = await trackers();
      await transact(state => {
        if (!state.accountScope && targets.length > 1) state.attention = 'multiple-trackers';
        if (!state.accountScope && !state.queue.length && targets.length === 1 && targets[0].accountScope === packet.accountScope && targets[0].tabId === sender.tab.id) {
          state.accountScope = targets[0].accountScope;
          state.mode = state.recordingPreference === false ? 'observe' : 'auto';
          state.preparation.enabled = state.firstCallPreference !== false;
          state.tabs = {}; state.session = null; state.attention = null; state.history = null; state.historySeen = [];
        }
        const matched = targets.filter(target => target.accountScope === state.accountScope);
        if (matched.length === 1 && packet.accountScope === state.accountScope) updatePlan(state, matched[0].plan);
        else if (matched.length > 1) { updatePlan(state, null); state.attention = 'multiple-trackers'; }
      });
      await flush(); return { ok: true };
    }
    if (sender.url !== api.runtime.getURL('popup.html')) return null;
    if (packet?.kind === 'pause-availability') {
      if (typeof packet.paused !== 'boolean') return { ok: false, reason: 'invalid-mode' };
      return transact(state => {
        if (!state.accountScope) return { ok: false, reason: 'account-needed' };
        setAvailabilityPaused(state, packet.paused);
        return { ok: true };
      });
    }
    if (packet?.kind === 'status') {
      const state = await transact(state => ({ ...state }));
      const portals = Object.values(state.tabs).filter(tab => now() - Date.parse(tab.seenAt) < 15000);
      const authenticated = portals.filter(tab => tab.session === 'authenticated' && tab.blockedDocument !== tab.documentId);
      const call = ['connected', 'incoming', 'idle'].find(kind => authenticated.some(tab => tab.call === kind)) || 'unknown';
      return { mode: state.mode, paired: !!state.accountScope, active: Object.values(state.tabs).some(tab => tab.active), completed: state.completed, history: state.history || null, preparation: state.preparation, queued: state.queue.length, last: state.last, attention: state.attention, call, portal: authenticated.length ? 'authenticated' : portals.some(tab => tab.session === 'logged-out') ? 'logged-out' : 'unknown', diagnostic: state.diagnostic || { requests: 0, recognized: 0, last: [] } };
    }
    if (packet?.kind === 'pair') {
      const targets = await trackers();
      if (targets.length !== 1) return { ok: false, reason: targets.length ? 'multiple-trackers' : 'tracker-closed' };
      return transact(state => {
        if (state.accountScope === targets[0].accountScope) { updatePlan(state, targets[0].plan); return { ok: true }; }
        if (state.queue.length && state.accountScope !== targets[0].accountScope) return { ok: false, reason: 'pending-account' };
        if (state.mode === 'auto' && Object.values(state.tabs).some(tab => tab.active)) return { ok: false, reason: 'active-portal-call' };
        state.accountScope = targets[0].accountScope; state.mode = 'observe'; state.tabs = {}; state.session = null; state.attention = null; state.history = null; state.historySeen = [];
        state.preparation = { ...fresh().preparation, plan: targets[0].plan };
        return { ok: true };
      });
    }
    if (packet?.kind === 'mode') {
      const result = await transact(state => {
        if (!['observe', 'auto'].includes(packet.mode)) return { ok: false, reason: 'invalid-mode' };
        if (packet.mode === 'auto' && !state.accountScope) return { ok: false, reason: 'account-needed' };
        if (packet.mode === 'observe' && state.mode === 'auto' && Object.values(state.tabs).some(tab => tab.active)) return { ok: false, reason: 'active-portal-call' };
        if (state.mode !== packet.mode) { state.tabs = {}; state.session = null; }
        state.mode = packet.mode; state.recordingPreference = packet.mode === 'auto';
        return { ok: true };
      });
      await flush(); return result;
    }
    if (packet?.kind === 'spacing') {
      if (typeof packet.enabled !== 'boolean' || !Number.isInteger(packet.minutes) || packet.minutes < 1 || packet.minutes > 60) return { ok: false, reason: 'invalid-spacing' };
      return transact(state => {
        if (!state.accountScope) return { ok: false, reason: 'account-needed' };
        state.preparation.spacing.enabled = packet.enabled; state.preparation.spacing.minutes = packet.minutes;
        return { ok: true };
      });
    }
    if (packet?.kind === 'prepare-first') {
      if (typeof packet.enabled !== 'boolean') return { ok: false, reason: 'invalid-mode' };
      const targets = await trackers();
      return transact(state => {
        if (!state.accountScope) return { ok: false, reason: 'account-needed' };
        state.preparation.enabled = packet.enabled; state.firstCallPreference = packet.enabled;
        const matched = targets.filter(target => target.accountScope === state.accountScope);
        if (matched.length === 1) updatePlan(state, matched[0].plan);
        else if (matched.length > 1) updatePlan(state, null);
        return { ok: true };
      });
    }
    if (packet?.kind === 'resume-options') {
      if (typeof packet.break !== 'boolean' || typeof packet.lunch !== 'boolean' || !['manual','timed'].includes(packet.mode)) return { ok: false, reason: 'invalid-mode' };
      const targets = await trackers();
      return transact(state => {
        if (!state.accountScope) return { ok: false, reason: 'account-needed' };
        state.preparation.resume = { break: packet.break, lunch: packet.lunch, mode: packet.mode };
        state.queue = state.queue.filter(item => item.event.type !== 'pause-end' || (packet.mode === 'timed' && packet[item.event.pauseType]));
        if (state.preparation.pendingPause?.requestId && !state.queue.some(item => item.event.id === state.preparation.pendingPause.requestId)) state.preparation.pendingPause.requestId = null;
        const matched = targets.filter(target => target.accountScope === state.accountScope);
        updatePlan(state, matched.length === 1 ? matched[0].plan : null);
        return { ok: true };
      });
    }
    if (packet?.kind === 'open-tracker') { await api.tabs.create({ url: `${TRACKER_ORIGIN}/` }); return { ok: true }; }
    if (packet?.kind === 'refresh-tracker') {
      const targets = await trackers();
      return transact(async state => {
        if (Object.values(state.tabs).some(tab => tab.active || ['connected','incoming'].includes(tab.call))) return { ok: false, reason: 'active-portal-call' };
        const matched = targets.filter(target => target.accountScope === state.accountScope);
        if (matched.length !== 1) return { ok: false, reason: matched.length > 1 ? 'multiple-trackers' : 'tracker-closed' };
        await api.tabs.reload(matched[0].tabId);
        return { ok: true };
      });
    }
    if (packet?.kind === 'clear-reviewed') return transact(state => {
      state.mode = 'observe'; state.recordingPreference = false; state.queue = []; state.tabs = {}; state.session = null; state.attention = null; return { ok: true };
    });
    return null;
  }
  function install() {
    api.webNavigation.onCommitted.addListener(details => { navigationCommitted(details).catch(() => {}); },
      { url: [{ schemes: ['https'], hostEquals: 'propio.com' }, { schemes: ['https'], hostEquals: 'www.propio.com' }] });
    api.webRequest.onBeforeRequest.addListener(beforeRequest, { urls: URLS }, ['requestBody']);
    api.webRequest.onCompleted.addListener(details => { completed(details).catch(() => {}); }, { urls: URLS });
    api.webRequest.onErrorOccurred.addListener(details => { completed({ ...details, statusCode: 0 }).catch(() => {}); }, { urls: URLS });
    api.runtime.onMessage.addListener((packet, sender, respond) => {
      message(packet, sender).then(respond, () => respond({ ok: false, reason: 'storage' })); return true;
    });
    api.alarms.create('retry-bridge', { periodInMinutes: 0.5 });
    api.alarms.onAlarm.addListener(alarm => { if (alarm.name === 'retry-bridge') flush().catch(() => {}); });
    api.tabs.onRemoved.addListener(tabId => { transact(state => {
      if (state.tabs[tabId]?.active) state.attention = 'portal-closed';
      delete state.tabs[tabId];
    }).catch(() => {}); });
  }
  return { install, beforeRequest, completed, message, navigationCommitted, flush };
}
