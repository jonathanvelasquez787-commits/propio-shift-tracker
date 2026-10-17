import { createPortalObserver } from './portal-observer.js';
import { createHistoryObserver } from './history-observer.js';
if (location.origin === 'https://interpreters.propio-ls.com' && window.top === window) {
  const context = { document, documentId: crypto.randomUUID(), send: packet => chrome.runtime.sendMessage(packet) };
  const observer = createPortalObserver(context), history = createHistoryObserver(context);
  let inFlight = null;
  function stop() {
    observer.stop(); history.stop(); clearInterval(timer);
    window.removeEventListener('pageshow', tick);
    document.removeEventListener('visibilitychange', tick);
    document.removeEventListener('resume', tick);
    try { chrome.runtime.onMessage.removeListener(onMessage); } catch { /* The extension may already be reloaded. */ }
  }
  const tick = () => {
    if (!inFlight) inFlight = sample().finally(() => { inFlight = null; });
    return inFlight;
  };
  async function sample() {
    if (observer.isStopped()) { stop(); return; }
    try {
      if (!chrome.runtime.id) { stop(); return; }
      const reply = await observer.sample(); await history.sample(reply?.historyEnabled);
    } catch { stop(); }
  }
  function onMessage(message, sender, respond) {
    if (sender.id !== chrome.runtime.id || message?.kind !== 'sample-portal') return;
    tick().then(() => respond({ ok: !observer.isStopped() }), () => respond({ ok: false }));
    return true;
  }
  const timer = setInterval(tick, 1000);
  window.addEventListener('pagehide', event => { if (!event.persisted) stop(); });
  window.addEventListener('pageshow', tick);
  document.addEventListener('visibilitychange', tick);
  document.addEventListener('resume', tick);
  chrome.runtime.onMessage.addListener(onMessage);
  void tick();
}
