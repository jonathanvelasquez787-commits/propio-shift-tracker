(() => {
  const protocol = 'pst-propio-bridge/v1', origin = 'https://propio-shift-tracker.vercel.app';
  if (location.origin !== origin || window.top !== window) return;
  let ready = null, stopped = false, heartbeat, lastAnnounced = 0, announcing = false;
  const pending = new Map();
  let refreshing = null, statusPending = false, lastStatusRequested = -Infinity;
  function alive() { try { return !stopped && Boolean(chrome.runtime.id); } catch { return false; } }
  function stop() {
    if (stopped) return;
    stopped = true; clearInterval(heartbeat);
    for (const item of pending.values()) clearTimeout(item.timer);
    pending.clear(); ready = null;
    if (refreshing) { clearTimeout(refreshing.timer); refreshing.responders.forEach(respond => respond(null)); refreshing = null; }
    window.removeEventListener('message', onAppMessage);
    window.removeEventListener('pageshow', hello);
    document.removeEventListener('visibilitychange', hello);
    document.removeEventListener('resume', hello);
    try { chrome.runtime.onMessage.removeListener(onExtensionMessage); } catch { /* Chrome may already have invalidated this content script. */ }
  }
  const hello = () => {
    if (!alive()) { stop(); return; }
    window.postMessage({ protocol, direction: 'extension', kind: 'hello' }, origin);
  };
  async function announce(packet) {
    if (announcing) return;
    announcing = true;
    try { const result = await chrome.runtime.sendMessage(packet); if (result?.ok) lastAnnounced = Date.now(); }
    catch (error) { if (!alive() || /extension context invalidated/i.test(String(error?.message))) stop(); }
    finally { announcing = false; }
  }
  async function announceStatus() {
    if (!ready || statusPending || Date.now() - lastStatusRequested < 1000) return;
    statusPending = true; lastStatusRequested = Date.now();
    const owner = { accountScope: ready.accountScope, nonce: ready.nonce };
    try {
      const status = await chrome.runtime.sendMessage({ kind: 'tracker-status', accountScope: owner.accountScope });
      if (alive() && ready?.nonce === owner.nonce && ready.accountScope === owner.accountScope) {
        window.postMessage({ protocol, direction: 'extension', kind: 'automation-status', ...owner, status }, origin);
      }
    } catch { if (!alive()) stop(); }
    finally { statusPending = false; }
  }
  function respondSafely(respond, result) { if (alive()) { try { respond(result); } catch { /* The receiving page may have closed. */ } } }
  function onAppMessage(message) {
    if (!alive()) { stop(); return; }
    if (message.source !== window || message.origin !== origin || message.data?.protocol !== protocol || message.data.direction !== 'app') return;
    const packet = message.data;
    if (packet.kind === 'ready' && /^[a-f0-9]{64}$/.test(packet.accountScope || '') && /^[\w-]{12,100}$/.test(packet.nonce || '')) {
      const plan = packet.plan && typeof packet.plan.startAt === 'string' && typeof packet.plan.endAt === 'string' ? { startAt: packet.plan.startAt, endAt: packet.plan.endAt, hasCall: packet.plan.hasCall === true, ended: packet.plan.ended === true } : null;
      if (plan) plan.scheduledPauses = Array.isArray(packet.plan.scheduledPauses) && packet.plan.scheduledPauses.length <= 100
        ? packet.plan.scheduledPauses.map(slot => ({ type: slot?.type, startedAt: slot?.startedAt, endedAt: slot?.endedAt })) : [];
      if (plan) plan.scheduleVerified = Array.isArray(packet.plan.scheduledPauses) && packet.plan.scheduledPauses.length <= 100;
      if (plan) plan.lastCallEndedAt = typeof packet.plan.lastCallEndedAt === 'string' ? packet.plan.lastCallEndedAt : null;
      if (plan && Object.prototype.hasOwnProperty.call(packet.plan, 'acw')) plan.acw = packet.plan.acw === null ? null
        : { startedAt: packet.plan.acw?.startedAt, observedAt: packet.plan.acw?.observedAt };
      if (plan) for (const key of ['pause','lastPause']) {
        const pause = packet.plan[key];
        plan[key] = pause && ['break','lunch'].includes(pause.type) && typeof pause.startedAt === 'string'
          ? { type: pause.type, startedAt: pause.startedAt, [key === 'pause' ? 'endsAt' : 'endedAt']: key === 'pause' ? pause.endsAt : pause.endedAt } : null;
      }
      const changed = ready?.accountScope !== packet.accountScope || ready?.nonce !== packet.nonce || JSON.stringify(ready?.plan) !== JSON.stringify(plan);
      ready = { accountScope: packet.accountScope, nonce: packet.nonce, plan };
      void announceStatus();
      if (refreshing) {
        const current = refreshing; refreshing = null; clearTimeout(current.timer); current.responders.forEach(respond => respond(ready));
      } else if (changed || Date.now() - lastAnnounced >= 10000) void announce({ kind: 'tracker-ready', ...ready });
    } else if (packet.kind === 'ack' && ready && packet.nonce === ready.nonce && packet.accountScope === ready.accountScope) {
      const item = pending.get(packet.requestId);
      if (item) { clearTimeout(item.timer); respondSafely(item.respond, packet.result); pending.delete(packet.requestId); }
    }
  }
  function onExtensionMessage(message, sender, respond) {
    if (!alive()) { stop(); return; }
    if (sender.id !== chrome.runtime.id) return;
    if (message?.kind === 'identify-tracker') {
      if (!message.refresh) { respond(ready); return; }
      if (refreshing) {
        if (refreshing.responders.length >= 8) { respond(null); return; }
        refreshing.responders.push(value => respondSafely(respond, value)); return true;
      }
      const timer = setTimeout(() => { const current = refreshing; refreshing = null; current?.responders.forEach(reply => reply(null)); }, 2500);
      refreshing = { timer, responders: [value => respondSafely(respond, value)] };
      hello();
      return true;
    }
    if (message?.kind !== 'deliver-event' || !ready || message.accountScope !== ready.accountScope) return;
    const requestId = crypto.randomUUID();
    const timer = setTimeout(() => { pending.delete(requestId); respondSafely(respond, { status: 'blocked', reason: 'app-timeout' }); }, 8000);
    pending.set(requestId, { timer, respond });
    window.postMessage({ protocol, direction: 'extension', kind: 'event', ...ready, requestId, event: message.event }, origin);
    return true;
  }
  window.addEventListener('message', onAppMessage);
  window.addEventListener('pageshow', hello);
  document.addEventListener('visibilitychange', hello);
  document.addEventListener('resume', hello);
  chrome.runtime.onMessage.addListener(onExtensionMessage);
  heartbeat = setInterval(hello, 5000); hello();
})();
