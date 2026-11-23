import { automationStatusView } from '../../js/automation-status.js';

export const acwPillKey = 'propio-acw-pill-v1';
const POLL_MS = 2000;
const fmt = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

// Que dice la pildora segun el estado de la disponibilidad automatica (null = no se muestra).
export function acwPillModel(snapshot, now = Date.now()) {
  if (!snapshot) return null;
  const view = automationStatusView(snapshot, now);
  switch (view.key) {
    case 'spacing': return { tone: 'go', text: `Disponible en ${fmt(view.seconds)}` };
    case 'confirming': case 'starting': return { tone: 'go', text: 'Poniéndote disponible…' };
    case 'pause': return { tone: 'wait', text: `Esperando fin de ${snapshot.pauseType === 'lunch' ? 'Lunch' : snapshot.pauseType === 'break' ? 'Break' : 'tu descanso'}` };
    case 'acw-pending': case 'schedule': return { tone: 'info', text: 'Esperando al Tracker' };
    case 'acw-update': return { tone: 'wait', text: 'Actualiza el Tracker' };
    case 'manual-paused': return { tone: 'info', text: 'Pausada por ti' };
    default: return null;
  }
}

const COLORS = {
  light: { go: ['#d6f3fa', '#08465a', '#007898'], wait: ['#fdecd0', '#643c00', '#b8791a'], info: ['#e6e8ec', '#282a30', '#9aa0aa'] },
  dark: { go: ['#0e5669', '#dcf8ff', '#2fd5ff'], wait: ['#69460a', '#ffecc8', '#d9a13a'], info: ['#3c4048', '#e8eaed', '#626974'] },
};

export function installAcwPill(api, { window, document, setTimer = setInterval, clearTimer = clearInterval, now = () => Date.now() } = {}) {
  if (window.top !== window || window.location.origin !== 'https://interpreters.propio-ls.com' || !/^\/portal(?:\/|$)/.test(window.location.pathname)) return;
  let enabled = true, snapshot = null, polledAt = 0, inFlight = false, stopped = false, host = null, pill = null, revision = 0;
  function hide() { if (host) { host.remove(); host = null; pill = null; } }
  function render() {
    if (stopped) return;
    const model = enabled ? acwPillModel(snapshot, now()) : null;
    if (!model || !document.body) { hide(); return; }
    if (!host || !host.isConnected) {
      host = document.createElement('div'); host.id = 'pst-acw-pill';
      const root = host.attachShadow({ mode: 'closed' });
      pill = document.createElement('div'); pill.setAttribute('role', 'status');
      pill.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:2147483000;padding:9px 18px;border-radius:999px;font:600 14px/1.2 system-ui,sans-serif;border:2px solid;box-shadow:0 2px 8px rgba(0,0,0,.25);pointer-events:none;white-space:nowrap';
      root.append(pill); document.body.append(host);
    }
    const palette = document.documentElement.hasAttribute('data-pst-dark') ? COLORS.dark : COLORS.light;
    const [bg, fg, edge] = palette[model.tone];
    pill.style.background = bg; pill.style.color = fg; pill.style.borderColor = edge;
    if (pill.textContent !== model.text) pill.textContent = model.text;
  }
  async function poll() {
    if (inFlight || stopped) return;
    inFlight = true; polledAt = now();
    try {
      const reply = await api.runtime.sendMessage({ kind: 'acw-pill' });
      snapshot = reply?.ok ? reply.status || null : null;
    } catch (error) {
      snapshot = null;
      if (/extension context invalidated/i.test(String(error?.message))) stop();
    } finally { inFlight = false; }
  }
  function tick() {
    if (stopped) return;
    if (enabled && now() - polledAt >= POLL_MS) void poll();
    render();
  }
  function changed(changes, area) {
    if (stopped || area !== 'local' || !changes[acwPillKey]) return;
    revision++; enabled = changes[acwPillKey].newValue?.enabled !== false;
    if (enabled) polledAt = 0; tick();
  }
  function stop() {
    if (stopped) return;
    stopped = true; clearTimer(timer); hide();
    try { api.storage.onChanged.removeListener(changed); } catch { /* La extension pudo recargarse. */ }
  }
  api.storage.onChanged.addListener(changed);
  const initialRevision = revision;
  api.storage.local.get(acwPillKey).then(values => {
    if (stopped || initialRevision !== revision) return;
    enabled = values[acwPillKey]?.enabled !== false; tick();
  }).catch(() => {});
  const timer = setTimer(tick, 1000);
  window.addEventListener('pagehide', event => { if (!event.persisted) stop(); });
  return { stop };
}
