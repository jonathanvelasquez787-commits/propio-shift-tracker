(() => {
  const protocol = 'pst-propio-bridge/v1', origin = 'https://propio-shift-tracker.vercel.app';
  if (location.origin !== origin || window.top !== window) return;
  let ready = null, stopped = false, heartbeat;
  const pending = new Map();
  function alive() { try { return !stopped && Boolean(chrome.runtime.id); } catch { return false; } }
  function stop() {
    if (stopped) return;
    stopped = true; clearInterval(heartbeat);
    for (const item of pending.values()) clearTimeout(item.timer);
    pending.clear(); ready = null;
    window.removeEventListener('message', onAppMessage);
    try { chrome.runtime.onMessage.removeListener(onExtensionMessage); } catch { /* Chrome may already have invalidated this content script. */ }
  }
  const hello = () => {
    if (!alive()) { stop(); return; }
    window.postMessage({ protocol, direction: 'extension', kind: 'hello' }, origin);
  };
  async function announce(packet) {
    try { await chrome.runtime.sendMessage(packet); }
    catch (error) { if (!alive() || /extension context invalidated/i.test(String(error?.message))) stop(); }
  }
  function respondSafely(respond, result) { if (alive()) { try { respond(result); } catch { /* The receiving page may have closed. */ } } }
  function onAppMessage(message) {
    if (!alive()) { stop(); return; }
    if (message.source !== window || message.origin !== origin || message.data?.protocol !== protocol || message.data.direction !== 'app') return;
    const packet = message.data;
    if (packet.kind === 'ready' && /^[a-f0-9]{64}$/.test(packet.accountScope || '') && /^[\w-]{12,100}$/.test(packet.nonce || '')) {
      const changed = ready?.accountScope !== packet.accountScope || ready?.nonce !== packet.nonce;
      ready = { accountScope: packet.accountScope, nonce: packet.nonce };
      if (changed) void announce({ kind: 'tracker-ready', ...ready });
    } else if (packet.kind === 'ack' && ready && packet.nonce === ready.nonce && packet.accountScope === ready.accountScope) {
      const item = pending.get(packet.requestId);
      if (item) { clearTimeout(item.timer); respondSafely(item.respond, packet.result); pending.delete(packet.requestId); }
    }
  }
  function onExtensionMessage(message, sender, respond) {
    if (!alive()) { stop(); return; }
    if (sender.id !== chrome.runtime.id) return;
    if (message?.kind === 'identify-tracker') { respond(ready); return; }
    if (message?.kind !== 'deliver-event' || !ready || message.accountScope !== ready.accountScope) return;
    const requestId = crypto.randomUUID();
    const timer = setTimeout(() => { pending.delete(requestId); respondSafely(respond, { status: 'blocked', reason: 'app-timeout' }); }, 8000);
    pending.set(requestId, { timer, respond });
    window.postMessage({ protocol, direction: 'extension', kind: 'event', ...ready, requestId, event: message.event }, origin);
    return true;
  }
  window.addEventListener('message', onAppMessage);
  chrome.runtime.onMessage.addListener(onExtensionMessage);
  heartbeat = setInterval(hello, 5000); hello();
})();
