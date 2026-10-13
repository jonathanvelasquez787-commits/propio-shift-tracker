import { createPortalObserver } from './portal-observer.js';
import { createHistoryObserver } from './history-observer.js';
if (location.origin === 'https://interpreters.propio-ls.com' && window.top === window) {
  const context = { document, documentId: crypto.randomUUID(), send: packet => chrome.runtime.sendMessage(packet) };
  const observer = createPortalObserver(context), history = createHistoryObserver(context);
  let inFlight = false;
  const tick = async () => {
    if (observer.isStopped()) { history.stop(); clearInterval(timer); return; }
    try {
      if (!chrome.runtime.id) { observer.stop(); history.stop(); clearInterval(timer); return; }
      if (!inFlight) { inFlight = true; const reply = await observer.sample(); await history.sample(reply?.historyEnabled); }
    } catch { observer.stop(); history.stop(); clearInterval(timer); }
    finally { inFlight = false; }
  };
  const timer = setInterval(tick, 1000);
  window.addEventListener('pagehide', event => { if (!event.persisted) { observer.stop(); history.stop(); clearInterval(timer); } });
  void tick();
}
