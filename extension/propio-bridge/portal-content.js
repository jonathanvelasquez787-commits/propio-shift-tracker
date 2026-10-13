import { createPortalObserver } from './portal-observer.js';
if (location.origin === 'https://interpreters.propio-ls.com' && window.top === window) {
  const observer = createPortalObserver({ document, documentId: crypto.randomUUID(), send: packet => chrome.runtime.sendMessage(packet) });
  let inFlight = false;
  const tick = async () => {
    if (observer.isStopped()) { clearInterval(timer); return; }
    try {
      if (!chrome.runtime.id) { observer.stop(); clearInterval(timer); return; }
      if (!inFlight) { inFlight = true; await observer.sample(); }
    } catch { observer.stop(); clearInterval(timer); }
    finally { inFlight = false; }
  };
  const timer = setInterval(tick, 1000);
  window.addEventListener('pagehide', event => { if (!event.persisted) { observer.stop(); clearInterval(timer); } });
  void tick();
}
