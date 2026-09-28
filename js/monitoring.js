const sent = new Set();

function clean(value, max = 1200) {
  return String(value || '').replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[email]').slice(0, max);
}

function report(kind, error) {
  const message = clean(error?.message || error || kind, 500);
  const stack = clean(error?.stack || '', 1800);
  const key = `${kind}:${message}:${stack.slice(0, 200)}`;
  if (sent.has(key)) return;
  sent.add(key);
  const body = JSON.stringify({ kind, message, stack, path: location.pathname, release: 'v566' });
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/telemetry', new Blob([body], { type: 'application/json' }));
  } else {
    fetch('/api/telemetry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
  }
}

window.addEventListener('error', (event) => report('error', event.error || event.message));
window.addEventListener('unhandledrejection', (event) => report('unhandledrejection', event.reason));
