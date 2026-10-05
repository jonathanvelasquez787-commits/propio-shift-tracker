import { PORTAL_ORIGIN, TRACKER_ORIGIN, accountScopeValid, readPropioSignal, validateBridgeEvent, createPropioReducer } from '../../js/propio-bridge-rules.js';

const KEY = 'bridge-v1';
const URLS = [`${PORTAL_ORIGIN}/api/Interpreter/UpdateInterpreterStatus*`, 'https://eventgw.twilio.com/v4/EndpointEvents*'];
const fresh = () => ({ mode: 'observe', accountScope: null, tabs: {}, queue: [], completed: 0, last: [], attention: null });
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
  function beforeRequest(details) {
    if (details.method !== 'POST' || details.tabId < 0) return;
    try { if (new URL(details.initiator).origin !== PORTAL_ORIGIN) return; } catch { return; }
    const raw = details.requestBody?.raw;
    if (!Array.isArray(raw) || !raw.length || raw.some(part => !part.bytes)) return;
    const parts = raw.map(part => new Uint8Array(part.bytes));
    const length = parts.reduce((n, part) => n + part.length, 0);
    if (length > 65536) return;
    try {
      const bytes = new Uint8Array(length); let offset = 0;
      for (const part of parts) { bytes.set(part, offset); offset += part.length; }
      const signal = readPropioSignal(details.url, JSON.parse(new TextDecoder().decode(bytes)));
      if (signal && pending.size < 200) pending.set(details.requestId, { signal, tabId: details.tabId, at: new Date(details.timeStamp).toISOString() });
    } catch { /* Unknown payloads are ignored; raw bodies are never retained. */ }
  }
  async function completed(details) {
    const item = pending.get(details.requestId); pending.delete(details.requestId);
    if (!item || details.statusCode < 200 || details.statusCode >= 300) return;
    await transact(state => {
      const { state: reduced, event } = reduce(state.tabs[item.tabId], item.signal, item.at);
      state.tabs[item.tabId] = reduced;
      if (event?.type === 'call-end' && validateBridgeEvent(event, now())) state.completed++;
      state.last = [...state.last, { signal: item.signal, at: item.at }].slice(-20);
      if (state.mode === 'auto' && state.accountScope && event) {
        if (state.queue.length >= 200) { state.mode = 'observe'; state.attention = 'queue-full'; }
        else state.queue.push({ accountScope: state.accountScope, event });
      }
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
    if (packet?.kind === 'tracker-ready') {
      if (sender.frameId !== 0 || !sender.tab || !accountScopeValid(packet.accountScope)) return null;
      try { if (new URL(sender.url).origin !== TRACKER_ORIGIN) return null; } catch { return null; }
      await flush(); return { ok: true };
    }
    if (sender.url !== api.runtime.getURL('popup.html')) return null;
    if (packet?.kind === 'status') {
      const state = await transact(state => ({ ...state }));
      return { mode: state.mode, paired: !!state.accountScope, active: Object.values(state.tabs).some(tab => tab.active), completed: state.completed, queued: state.queue.length, last: state.last, attention: state.attention };
    }
    if (packet?.kind === 'pair') {
      const targets = await trackers();
      if (targets.length !== 1) return { ok: false, reason: targets.length ? 'multiple-trackers' : 'tracker-closed' };
      return transact(state => {
        if (state.accountScope === targets[0].accountScope) return { ok: true };
        if (state.queue.length && state.accountScope !== targets[0].accountScope) return { ok: false, reason: 'pending-account' };
        if (state.mode === 'auto' && Object.values(state.tabs).some(tab => tab.active)) return { ok: false, reason: 'active-portal-call' };
        state.accountScope = targets[0].accountScope; state.mode = 'observe'; state.tabs = {}; state.attention = null;
        return { ok: true };
      });
    }
    if (packet?.kind === 'mode') {
      const result = await transact(state => {
        if (!['observe', 'auto'].includes(packet.mode)) return { ok: false, reason: 'invalid-mode' };
        if (packet.mode === 'auto' && !state.accountScope) return { ok: false, reason: 'account-needed' };
        if (packet.mode === 'observe' && state.mode === 'auto' && Object.values(state.tabs).some(tab => tab.active)) return { ok: false, reason: 'active-portal-call' };
        if (state.mode !== packet.mode) state.tabs = {};
        state.mode = packet.mode;
        return { ok: true };
      });
      await flush(); return result;
    }
    if (packet?.kind === 'open-tracker') { await api.tabs.create({ url: `${TRACKER_ORIGIN}/` }); return { ok: true }; }
    if (packet?.kind === 'clear-reviewed') return transact(state => {
      state.mode = 'observe'; state.queue = []; state.tabs = {}; state.attention = null; return { ok: true };
    });
    return null;
  }
  function install() {
    api.webRequest.onBeforeRequest.addListener(beforeRequest, { urls: URLS }, ['requestBody']);
    api.webRequest.onCompleted.addListener(details => { completed(details).catch(() => {}); }, { urls: URLS });
    api.webRequest.onErrorOccurred.addListener(details => pending.delete(details.requestId), { urls: URLS });
    api.runtime.onMessage.addListener((packet, sender, respond) => {
      message(packet, sender).then(respond, () => respond({ ok: false, reason: 'storage' })); return true;
    });
    api.alarms.create('retry-bridge', { periodInMinutes: 0.5 });
    api.alarms.onAlarm.addListener(alarm => { if (alarm.name === 'retry-bridge') flush().catch(() => {}); });
    api.tabs.onRemoved.addListener(tabId => { transact(state => { delete state.tabs[tabId]; }).catch(() => {}); });
  }
  return { install, beforeRequest, completed, message, flush };
}
