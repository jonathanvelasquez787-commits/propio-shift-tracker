import { automationStatusView } from '../../js/automation-status.js';

export const acwPillKey = 'propio-acw-pill-v1';
export const acwPillPosKey = 'propio-acw-pill-pos-v1';
const originalLayoutKey = 'propio-original-layout-v1';
const EDGE_MIN = 4;
const POLL_MS = 2000;
const hhmm = iso => { const d = new Date(iso); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const fmt = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

// Que dice la pildora segun el estado de la disponibilidad automatica (null solo mientras no ha llegado ningun dato).
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
    case 'first-call-wait': return { tone: 'info', text: 'Esperando tu primera llamada' };
    case 'in-call': return { tone: 'go', text: 'En llamada' };
    case 'incoming': return { tone: 'go', text: 'Llamada entrante' };
    case 'available': return { tone: 'go', text: 'Disponible' };
    case 'before-shift': return { tone: 'info', text: snapshot.startAt && Number.isFinite(Date.parse(snapshot.startAt)) ? `Turno empieza ${hhmm(snapshot.startAt)}` : 'Antes de tu turno' };
    case 'before-shift-manual': return { tone: 'info', text: 'Esperando inicio de turno' };
    case 'shift-ended': return { tone: 'info', text: 'Fuera de turno' };
    case 'connection': return { tone: 'wait', text: 'Esperando tu sesión' };
    case 'offline-control': return { tone: 'wait', text: 'Esperando Start Calls' };
    case 'retry': return { tone: 'wait', text: 'Reintentando…' };
    case 'pause-return-off': return { tone: 'info', text: 'Regreso manual' };
    case 'first-done': return { tone: 'info', text: 'Primera llamada lista' };
    case 'off': return { tone: 'info', text: 'Disponibilidad apagada' };
    case 'recording-off': return { tone: 'info', text: 'Registro apagado' };
    case 'device-passive': return { tone: 'info', text: 'Solo registro en esta PC' };
    case 'coordination': return { tone: 'wait', text: 'Otra PC activa' };
    case 'multiple-portals': return { tone: 'wait', text: 'Varias pestañas de Propio' };
    case 'stale': return { tone: 'wait', text: 'Sin datos recientes' };
    case 'review': return { tone: 'wait', text: 'Revisa el Tracker' };
    default: return { tone: 'info', text: 'Revisando Propio' };
  }
}

// Posicion = distancia a la orilla derecha y a la de abajo; siempre se queda dentro de la pantalla.
export function acwPillClamp(pos, view, size) {
  const num = (v, d) => (Number.isFinite(v) ? v : d);
  const maxRight = Math.max(EDGE_MIN, num(view?.width, 1000) - num(size?.width, 0) - EDGE_MIN);
  const maxBottom = Math.max(EDGE_MIN, num(view?.height, 800) - num(size?.height, 0) - EDGE_MIN);
  return {
    right: Math.min(maxRight, Math.max(EDGE_MIN, num(pos?.right, 20))),
    bottom: Math.min(maxBottom, Math.max(EDGE_MIN, num(pos?.bottom, 20))),
  };
}

// Lugar por defecto con la vista original: pegada a la izquierda de la primera pildora de Propio (Calls), a su misma altura.
export function acwPillDockedPos(rect, view, size, gap = 10) {
  const num = (v, d) => (Number.isFinite(v) ? v : d);
  const centered = (num(rect?.height, 0) - num(size?.height, 0)) / 2;
  return { right: num(view?.width, 1000) - num(rect?.left, 0) + gap, bottom: num(view?.height, 800) - num(rect?.bottom, 0) + centered };
}

const COLORS = {
  light: { go: ['#d6f3fa', '#08465a', '#007898'], wait: ['#fdecd0', '#643c00', '#b8791a'], info: ['#e6e8ec', '#282a30', '#9aa0aa'] },
  dark: { go: ['#0e5669', '#dcf8ff', '#2fd5ff'], wait: ['#69460a', '#ffecc8', '#d9a13a'], info: ['#3c4048', '#e8eaed', '#626974'] },
};

// Copia el aspecto de las pildoras "Calls / Minutes / Pay" de Propio (mismo tamano y color, claro u oscuro).
const CHIP_TEXT = /^(calls|minutes|pay)\s*:/i;
const CHIP_TWICE = /(calls|minutes|pay)\s*:[\s\S]*(calls|minutes|pay)\s*:/i;
const rgba = value => {
  const text = String(value || '').trim();
  let m = /^rgba?\(\s*(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)(?:[,\s/]+(\d*\.?\d+%?))?\s*\)$/.exec(text);
  const alpha = raw => (raw === undefined ? 1 : raw.endsWith('%') ? parseFloat(raw) / 100 : parseFloat(raw));
  if (m) return { r: +m[1], g: +m[2], b: +m[3], a: alpha(m[4]) };
  // Chrome devuelve color(srgb ...) cuando el color se mezcla con color-mix().
  m = /^color\(\s*srgb\s+(\d*\.?\d+)\s+(\d*\.?\d+)\s+(\d*\.?\d+)(?:\s*\/\s*(\d*\.?\d+%?))?\s*\)$/.exec(text);
  return m ? { r: Math.round(+m[1] * 255), g: Math.round(+m[2] * 255), b: Math.round(+m[3] * 255), a: alpha(m[4]) } : null;
};
const blend = (top, under) => `rgb(${['r', 'g', 'b'].map(k => Math.round(top[k] * top.a + under[k] * (1 - top.a))).join(', ')})`;
// El fondo puede estar en el propio elemento o en su ::before / ::after (como hacen las chips de Angular Material).
const paintOf = (window, node) => {
  for (const pseudo of [undefined, '::before', '::after']) {
    let cs; try { cs = pseudo ? window.getComputedStyle(node, pseudo) : window.getComputedStyle(node); } catch { cs = null; }
    const bg = cs && rgba(cs.backgroundColor);
    if (bg && bg.a > 0) return { cs, bg };
  }
  return null;
};
export function readChipStyle(window, document) {
  if (typeof window?.getComputedStyle !== 'function' || typeof document?.querySelectorAll !== 'function') return null;
  for (const el of document.querySelectorAll('body *')) {
    if ((el.children?.length || 0) > 4) continue;
    const text = String(el.textContent || '').trim();
    if (text.length > 30 || !CHIP_TEXT.test(text) || CHIP_TWICE.test(text)) continue; // un contenedor con varias pildoras no es la pildora
    for (let node = el, depth = 0; node && node !== document.body && depth < 6; node = node.parentElement, depth++) {
      const rect = node.getBoundingClientRect?.() || {};
      if (rect.height > 48 || rect.width > 320) break; // ya es la barra completa, no una pildora
      const paint = paintOf(window, node);
      if (!paint) continue;
      const { cs, bg } = paint;
      let under = { r: 255, g: 255, b: 255, a: 1 };
      for (let up = node.parentElement; up; up = up.parentElement) {
        const c = rgba(window.getComputedStyle(up).backgroundColor);
        if (c && c.a > 0) { under = bg.a < 1 && c.a < 1 ? { ...c, a: 1 } : c; if (c.a === 1) break; }
      }
      const own = window.getComputedStyle(node), width = parseFloat(own.borderTopWidth) || 0;
      return {
        background: bg.a < 1 ? blend(bg, under) : `rgb(${bg.r}, ${bg.g}, ${bg.b})`, color: own.color, fontFamily: own.fontFamily, fontSize: own.fontSize,
        fontWeight: own.fontWeight, letterSpacing: own.letterSpacing, borderRadius: own.borderTopLeftRadius || cs.borderTopLeftRadius,
        border: width > 0 && own.borderTopStyle !== 'none' ? `${own.borderTopWidth} solid ${own.borderTopColor}` : 'none',
        padding: [own.paddingTop, own.paddingRight, own.paddingBottom, own.paddingLeft], height: rect.height > 0 ? `${rect.height}px` : null, node,
      };
    }
  }
  return null;
}
// Un poco mas ancha que las pildoras de Propio.
const EXTRA_SIDE_PX = 10;
const widen = padding => { const [t, r, b, l] = padding.map(v => parseFloat(v) || 0); return `${t}px ${r + EXTRA_SIDE_PX}px ${b}px ${l + EXTRA_SIDE_PX}px`; };
export function applyChipStyle(pill, chip) {
  Object.assign(pill.style, { boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', lineHeight: '1.2', boxShadow: 'none',
    background: chip.background, color: chip.color, fontFamily: chip.fontFamily, fontSize: chip.fontSize, fontWeight: chip.fontWeight,
    letterSpacing: chip.letterSpacing, borderRadius: chip.borderRadius, border: chip.border, padding: widen(chip.padding), height: chip.height || 'auto' });
}

export function installAcwPill(api, { window, document, setTimer = setInterval, clearTimer = clearInterval, now = () => Date.now() } = {}) {
  if (window.top !== window || window.location.origin !== 'https://interpreters.propio-ls.com' || !/^\/portal(?:\/|$)/.test(window.location.pathname)) return;
  let enabled = true, snapshot = null, polledAt = 0, inFlight = false, stopped = false, host = null, pill = null, revision = 0, pos = null, dragging = false, chipCache = null, chipAt = 0, originalOn = false;
  function place() {
    if (!pill) return;
    const view = { width: window.innerWidth, height: window.innerHeight };
    const size = { width: pill.offsetWidth, height: pill.offsetHeight };
    const rect = !pos && originalOn && chipCache?.node?.isConnected ? chipCache.node.getBoundingClientRect?.() : null;
    let target = pos;
    if (!target && rect && rect.width > 0) {
      const docked = acwPillDockedPos(rect, view, size);
      // Si a la izquierda de Calls no cabe, se queda en su esquina para no taparla.
      if (docked.right <= view.width - (size.width || 0) - EDGE_MIN) target = docked;
    }
    const next = acwPillClamp(target, view, size);
    pill.style.right = `${next.right}px`; pill.style.bottom = `${next.bottom}px`;
    return next;
  }
  function wireDrag(el) {
    let start = null;
    el.addEventListener('pointerdown', event => {
      if (event.button !== undefined && event.button !== 0) return;
      const now0 = place() || { right: 20, bottom: 20 };
      start = { x: event.clientX, y: event.clientY, right: now0.right, bottom: now0.bottom, id: event.pointerId };
      dragging = true; el.style.cursor = 'grabbing';
      try { el.setPointerCapture(event.pointerId); } catch { /* Sin captura tambien funciona. */ }
      event.preventDefault();
    });
    el.addEventListener('pointermove', event => {
      if (!start) return;
      pos = { right: start.right - (event.clientX - start.x), bottom: start.bottom - (event.clientY - start.y) };
      pos = place() || pos;
    });
    const finish = () => {
      if (!start) return;
      start = null; dragging = false; el.style.cursor = 'grab';
      api.storage.local.set({ [acwPillPosKey]: pos }).catch(() => {});
    };
    el.addEventListener('pointerup', finish);
    el.addEventListener('pointercancel', finish);
    // Doble clic: vuelve a su lugar de fabrica (con la vista original, junto a Calls).
    el.addEventListener('dblclick', () => {
      pos = null; place();
      try { Promise.resolve(api.storage.local.remove?.(acwPillPosKey)).catch(() => {}); } catch { /* Sin almacenamiento. */ }
    });
  }
  function hide() { if (host) { host.remove(); host = null; pill = null; } }
  function render() {
    if (stopped) return;
    const model = enabled ? acwPillModel(snapshot, now()) : null;
    if (!model || !document.body) { hide(); return; }
    if (!host || !host.isConnected) {
      host = document.createElement('div'); host.id = 'pst-acw-pill';
      const root = host.attachShadow({ mode: 'closed' });
      pill = document.createElement('div'); pill.setAttribute('role', 'status');
      pill.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:2147483000;padding:9px 24px;border-radius:999px;font:600 14px/1.2 system-ui,sans-serif;border:2px solid;box-shadow:0 2px 8px rgba(0,0,0,.25);cursor:grab;touch-action:none;user-select:none;white-space:nowrap';
      wireDrag(pill);
      root.append(pill); document.body.append(host);
    }
    if (!chipAt || now() - chipAt >= 3000 || now() < chipAt) { chipCache = readChipStyle(window, document); chipAt = now() || 1; }
    const chip = chipCache;
    if (chip) applyChipStyle(pill, chip);
    else {
      const palette = document.documentElement.hasAttribute('data-pst-dark') ? COLORS.dark : COLORS.light;
      const [bg, fg, edge] = palette[model.tone];
      pill.style.background = bg; pill.style.color = fg; pill.style.borderColor = edge;
    }
    if (pill.textContent !== model.text) pill.textContent = model.text;
    if (!dragging) place();
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
    if (stopped || area !== 'local') return;
    if (changes[originalLayoutKey]) { originalOn = changes[originalLayoutKey].newValue?.enabled === true; if (!dragging) place(); }
    if (!changes[acwPillKey]) return;
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
  api.storage.local.get([acwPillKey, acwPillPosKey, originalLayoutKey]).then(values => {
    if (stopped) return;
    originalOn = values[originalLayoutKey]?.enabled === true;
    const saved = values[acwPillPosKey];
    if (saved && Number.isFinite(saved.right) && Number.isFinite(saved.bottom)) pos = { right: saved.right, bottom: saved.bottom };
    if (initialRevision !== revision) return;
    enabled = values[acwPillKey]?.enabled !== false; tick();
  }).catch(() => {});
  const timer = setTimer(tick, 1000);
  window.addEventListener('pagehide', event => { if (!event.persisted) stop(); });
  const follow = () => { if (!stopped && !dragging) place(); };
  window.addEventListener('resize', follow);
  window.addEventListener('scroll', follow, true);
  return { stop };
}
