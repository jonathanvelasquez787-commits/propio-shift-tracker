// Icono del encabezado + cuadro con el estado de la extension (solo dentro de la extension de Chrome).
const REASONS = {
  'portal-closed': 'La pestaña de Propio se cerró durante una llamada. Revisá su final en Propio Shift Tracker.',
  'multiple-trackers': 'Dejá abierta una sola pestaña de Propio Shift Tracker para esta cuenta.',
  'tracker-closed': 'Abrí Propio Shift Tracker e iniciá sesión para conectarlo.',
  'pending-account': 'Hay llamadas pendientes de la cuenta anterior. Abrila para completar el registro.',
  'account-needed': 'Abrí Propio Shift Tracker, iniciá sesión y conectá esta cuenta antes de activar el registro.',
  'queue-full': 'La cola está llena. El registro se pausó; revisá las llamadas pendientes.',
  'expired-event': 'Hay una señal de más de 24 horas. El registro se pausó para revisarla.',
  'event-rejected': 'Una señal no pasó la validación. El registro está pausado.',
  'tracker-needs-review': 'Propio Shift Tracker requiere revisión: puede haber una llamada manual, un traslape o un problema al guardar.',
  storage: 'No se pudo guardar el estado. Reintentá la conexión.',
};

// Convierte lo que responde la extension ({kind:'status'}) en lo que se ve. Funcion pura.
export function extensionBoxModel(state) {
  if (!state || state.ok === false) {
    return { dot: 'off', badge: 'Sin respuesta', paired: false, auto: false, title: 'La extensión no responde', detail: 'Cerrá y abrí de nuevo esta ventana.', queued: 0, attention: '' };
  }
  const paired = state.paired === true, auto = paired && state.mode === 'auto';
  const attention = state.attention ? String(state.attention) : '';
  const dot = !paired ? 'off' : attention ? 'warn' : auto ? 'on' : 'idle';
  const title = auto ? 'Registro automático activo' : paired ? 'Listo para registrar' : 'Buscando Propio Shift Tracker';
  const detail = REASONS[attention] || (paired ? (auto ? 'El registro automático está activo.' : 'Activá el registro cuando quieras comenzar.') : 'Se vincula automáticamente al reconocer tu sesión en Propio Shift Tracker.');
  return { dot, badge: paired ? 'Conectada' : 'Esperando', paired, auto, title, detail, queued: Math.max(0, Number(state.queued) || 0), attention };
}

export function initExtensionBox(doc = globalThis.document, chromeApi = globalThis.chrome, loc = globalThis.location) {
  if (!doc || !loc || loc.protocol !== 'chrome-extension:' || !chromeApi?.runtime?.sendMessage) return null;
  const anchor = doc.getElementById('higherRateHeaderBtn');
  if (!anchor || doc.getElementById('extStatusBtn')) return null;
  const isPopup = /[?&]popup=1/.test(loc.search || '');
  const el = (tag, cls, text) => { const n = doc.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const btn = (text, id) => { const b = el('button', 'ext-box-btn', text); b.type = 'button'; if (id) b.id = id; return b; };

  const icon = el('button', 'hero-action-btn hero-action-btn-icon ext-status-btn');
  icon.id = 'extStatusBtn'; icon.type = 'button'; icon.title = 'Extensión de Chrome';
  icon.setAttribute('aria-label', 'Extensión de Chrome'); icon.setAttribute('aria-expanded', 'false'); icon.setAttribute('aria-controls', 'extStatusBox');
  icon.dataset.extDot = 'off';
  icon.innerHTML = '<span aria-hidden="true"><svg class="ic-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20v-5M12 20v-10M19 20V5"/></svg><i class="ext-dot"></i></span>';
  anchor.parentNode.insertBefore(icon, anchor);

  const box = el('section', 'ext-box'); box.id = 'extStatusBox'; box.hidden = true; box.setAttribute('aria-label', 'Extensión de Chrome');
  const head = el('div', 'ext-box-head'), headText = el('div');
  headText.append(el('h3', '', 'Extensión de Chrome'), el('p', '', 'Propio Shift Tracker'));
  const ver = el('span', 'ext-box-ver', 'v' + (chromeApi.runtime.getManifest?.().version || '')); ver.id = 'extBoxVersion';
  head.append(headText, ver);
  const conn = el('div', 'ext-box-conn');
  const badge = el('span', 'ext-box-badge', 'Comprobando'); badge.id = 'extBoxBadge';
  const status = el('p', 'ext-box-status', 'Comprobando conexión…'); status.id = 'extBoxStatus'; status.setAttribute('role', 'status');
  const detail = el('p', 'ext-box-detail'); detail.id = 'extBoxDetail'; detail.setAttribute('aria-live', 'polite');
  const actions = el('div', 'ext-box-actions');
  const pair = btn('Revisar conexión', 'extBoxPair'), open = btn('Abrir Shift Tracker ↗', 'extBoxOpen'), side = btn('Abrir en el panel lateral', 'extBoxSide');
  if (!isPopup) side.hidden = true;
  actions.append(pair, open, side);
  conn.append(badge, status, detail, actions);
  const rec = el('label', 'ext-box-row'); rec.setAttribute('for', 'extBoxAuto');
  const recText = el('span'); recText.append(el('b', '', 'Registrar mi actividad'), el('small', '', 'Guarda turnos y llamadas en Shift Tracker.'));
  const sw = el('span', 'ext-box-switch'), auto = el('input'); auto.type = 'checkbox'; auto.id = 'extBoxAuto'; auto.setAttribute('role', 'switch');
  sw.append(auto, el('span', 'ext-box-track')); rec.append(recText, sw);
  const pend = el('div', 'ext-box-row');
  const pendText = el('span'); const pendNote = el('small', '', 'Nada esperando'); pendNote.id = 'extBoxPendingNote';
  pendText.append(el('b', '', 'Eventos pendientes'), pendNote);
  const pendCount = el('strong', 'ext-box-count', '0'); pendCount.id = 'extBoxPending'; pend.append(pendText, pendCount);
  box.append(head, conn, rec, pend);
  doc.body.append(box);

  let busy = false, feedback = '', shown = false, timer = null;
  const send = packet => chromeApi.runtime.sendMessage(packet);
  function place() {
    const r = icon.getBoundingClientRect(), y = (globalThis.scrollY || 0);
    box.style.top = Math.round(r.bottom + y + 8) + 'px';
  }
  async function refresh() {
    let state = null;
    try { state = await send({ kind: 'status' }); } catch { state = null; }
    const m = extensionBoxModel(state);
    icon.dataset.extDot = m.dot;
    icon.title = m.dot === 'on' ? 'Extensión de Chrome: registrando' : 'Extensión de Chrome';
    badge.textContent = m.badge; badge.classList.toggle('is-on', m.paired);
    status.textContent = m.title;
    detail.textContent = feedback || m.detail; detail.classList.toggle('is-error', Boolean(m.attention));
    auto.checked = m.auto; auto.disabled = busy || !m.paired;
    pendCount.textContent = String(m.queued);
    pendNote.textContent = m.queued ? 'Se entregan al abrir Propio Shift Tracker con la cuenta vinculada.' : 'Nada esperando';
    pair.classList.toggle('is-primary', !m.paired); pair.textContent = m.paired ? 'Revisar conexión' : 'Reintentar conexión';
  }
  async function act(packet, okText) {
    if (busy) return; busy = true; feedback = '';
    try { const r = await send(packet); if (!r?.ok) feedback = REASONS[r?.reason] || 'No se pudo completar la acción.'; else if (okText) feedback = okText; }
    catch { feedback = REASONS.storage; }
    finally { busy = false; await refresh().catch(() => {}); }
    if (feedback) setTimeout(() => { feedback = ''; refresh().catch(() => {}); }, 6000);
  }
  pair.addEventListener('click', () => act({ kind: 'pair' }, 'Conexión revisada: Propio Shift Tracker está conectado.'));
  open.addEventListener('click', () => act({ kind: 'open-tracker' }));
  auto.addEventListener('change', () => act({ kind: 'mode', mode: auto.checked ? 'auto' : 'observe' }));
  side.addEventListener('click', async () => {
    try { const w = await chromeApi.windows.getCurrent(); await chromeApi.sidePanel.open({ windowId: w.id }); globalThis.close?.(); } catch { /* sin panel lateral */ }
  });
  icon.addEventListener('click', () => {
    shown = !shown; box.hidden = !shown; icon.setAttribute('aria-expanded', String(shown));
    if (shown) { place(); refresh().catch(() => {}); }
  });
  globalThis.addEventListener?.('resize', () => { if (shown) place(); });
  refresh().catch(() => {});
  timer = setInterval(() => { if (!doc.hidden) refresh().catch(() => {}); }, 10000);
  return { icon, box, refresh, stop: () => clearInterval(timer) };
}
