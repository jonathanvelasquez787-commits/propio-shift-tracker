import { PORTAL_ORIGIN, TRACKER_ORIGIN, TWILIO_EVENT_ORIGINS, accountScopeValid, readPropioSignal, readPropioRequestBody, propioRequestKind, validateBridgeEvent, createPropioReducer } from '../../js/propio-bridge-rules.js';

const KEY = 'bridge-v1';
const URLS = [`${PORTAL_ORIGIN}/*`, ...TWILIO_EVENT_ORIGINS.map(origin => `${origin}/v4/EndpointEvents*`)];
const SIGN_OUT_DESTINATIONS = new Set(['https://propio.com', 'https://www.propio.com']);
const fresh = () => ({ mode: 'observe', accountScope: null, tabs: {}, session: null, queue: [], completed: 0, last: [], attention: null });
export function createBridgeWorker(api, { now = () => Date.now(), randomId = () => crypto.randomUUID() } = {}) {
  const reduce = createPropioReducer({ randomId }), pending = new Map();
  let serial = Promise.resolve(), flushing = null;
  const transact = operation => {
    const result = serial.then(async () => {
      const stored = (await api.storage.local.get(KEY))[KEY];
      const state = stored?.schema === 1 ? { ...fresh(), ...stored } : fresh();
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
        return accountScopeValid(ready?.accountScope) ? { tabId: tab.id, accountScope: ready.accountScope } : null;
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
    if (event?.type === 'call-end' && validateBridgeEvent(event, now())) state.completed++;
    record(state, signal, at, event);
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
      if (state.mode !== 'auto' || !state.queue.length) return null;
      const matched = targets.filter(target => target.accountScope === state.accountScope);
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
      if (ack?.status === 'ok') { state.queue.shift(); state.attention = null; return true; }
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
        state.tabs[tabId] = { ...previous, documentId: packet.documentId, session: packet.session, call: packet.call, seenAt: at };
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
      });
      await flush(); return { ok: true };
    }
    if (packet?.kind === 'tracker-ready') {
      if (sender.frameId !== 0 || !sender.tab || !accountScopeValid(packet.accountScope)) return null;
      try { if (new URL(sender.url).origin !== TRACKER_ORIGIN) return null; } catch { return null; }
      await flush(); return { ok: true };
    }
    if (sender.url !== api.runtime.getURL('popup.html')) return null;
    if (packet?.kind === 'status') {
      const state = await transact(state => ({ ...state }));
      const portals = Object.values(state.tabs).filter(tab => now() - Date.parse(tab.seenAt) < 15000);
      const authenticated = portals.filter(tab => tab.session === 'authenticated' && tab.blockedDocument !== tab.documentId);
      const call = ['connected', 'incoming', 'idle'].find(kind => authenticated.some(tab => tab.call === kind)) || 'unknown';
      return { mode: state.mode, paired: !!state.accountScope, active: Object.values(state.tabs).some(tab => tab.active), completed: state.completed, queued: state.queue.length, last: state.last, attention: state.attention, call, portal: authenticated.length ? 'authenticated' : portals.some(tab => tab.session === 'logged-out') ? 'logged-out' : 'unknown', diagnostic: state.diagnostic || { requests: 0, recognized: 0, last: [] } };
    }
    if (packet?.kind === 'pair') {
      const targets = await trackers();
      if (targets.length !== 1) return { ok: false, reason: targets.length ? 'multiple-trackers' : 'tracker-closed' };
      return transact(state => {
        if (state.accountScope === targets[0].accountScope) return { ok: true };
        if (state.queue.length && state.accountScope !== targets[0].accountScope) return { ok: false, reason: 'pending-account' };
        if (state.mode === 'auto' && Object.values(state.tabs).some(tab => tab.active)) return { ok: false, reason: 'active-portal-call' };
        state.accountScope = targets[0].accountScope; state.mode = 'observe'; state.tabs = {}; state.session = null; state.attention = null;
        return { ok: true };
      });
    }
    if (packet?.kind === 'mode') {
      const result = await transact(state => {
        if (!['observe', 'auto'].includes(packet.mode)) return { ok: false, reason: 'invalid-mode' };
        if (packet.mode === 'auto' && !state.accountScope) return { ok: false, reason: 'account-needed' };
        if (packet.mode === 'observe' && state.mode === 'auto' && Object.values(state.tabs).some(tab => tab.active)) return { ok: false, reason: 'active-portal-call' };
        if (state.mode !== packet.mode) { state.tabs = {}; state.session = null; }
        state.mode = packet.mode;
        return { ok: true };
      });
      await flush(); return result;
    }
    if (packet?.kind === 'open-tracker') { await api.tabs.create({ url: `${TRACKER_ORIGIN}/` }); return { ok: true }; }
    if (packet?.kind === 'clear-reviewed') return transact(state => {
      state.mode = 'observe'; state.queue = []; state.tabs = {}; state.session = null; state.attention = null; return { ok: true };
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
