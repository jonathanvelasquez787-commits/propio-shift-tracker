(() => {
  const protocol = 'pst-propio-bridge/v1', origin = 'https://propio-shift-tracker.vercel.app';
  if (location.origin !== origin || window.top !== window) return;
  let ready = null;
  const pending = new Map();
  const hello = () => window.postMessage({ protocol, direction: 'extension', kind: 'hello' }, origin);
  window.addEventListener('message', message => {
    if (message.source !== window || message.origin !== origin || message.data?.protocol !== protocol || message.data.direction !== 'app') return;
    const packet = message.data;
    if (packet.kind === 'ready' && /^[a-f0-9]{64}$/.test(packet.accountScope || '') && /^[\w-]{12,100}$/.test(packet.nonce || '')) {
      const changed = ready?.accountScope !== packet.accountScope || ready?.nonce !== packet.nonce;
      ready = { accountScope: packet.accountScope, nonce: packet.nonce };
      if (changed) chrome.runtime.sendMessage({ kind: 'tracker-ready', ...ready }).catch(() => {});
    } else if (packet.kind === 'ack' && ready && packet.nonce === ready.nonce && packet.accountScope === ready.accountScope) {
      pending.get(packet.requestId)?.(packet.result); pending.delete(packet.requestId);
    }
  });
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (sender.id !== chrome.runtime.id) return;
    if (message?.kind === 'identify-tracker') { respond(ready); return; }
    if (message?.kind !== 'deliver-event' || !ready || message.accountScope !== ready.accountScope) return;
    const requestId = crypto.randomUUID();
    const timer = setTimeout(() => { pending.delete(requestId); respond({ status: 'blocked', reason: 'app-timeout' }); }, 8000);
    pending.set(requestId, result => { clearTimeout(timer); respond(result); });
    window.postMessage({ protocol, direction: 'extension', kind: 'event', ...ready, requestId, event: message.event }, origin);
    return true;
  });
  hello(); setInterval(hello, 5000);
})();
