// Only fixed classifications leave this isolated content script. Names, IDs,
// credentials, client details and arbitrary portal text are never serialized.
const normalize = value => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
const labels = {
  signout: /^(sign\s*out|log\s*out|cerrar sesi[oó]n|salir)$/,
  accept: /^(accept( call)?|answer( call)?|aceptar( llamada)?|contestar( llamada)?)$/,
  reject: /^(reject( call)?|decline( call)?|rechazar( llamada)?)$/,
  hangup: /^(hang ?up|end call|disconnect call|colgar|finalizar llamada|terminar llamada)$/,
  idle: /^(start calls|stop calls|iniciar llamadas|detener llamadas)$/,
};
export function controlKind(element) {
  const buttonValue = element?.matches?.('input[type="button"],input[type="submit"]') ? element.value : null;
  for (const value of [element?.getAttribute?.('aria-label'), element?.getAttribute?.('title'), element?.textContent, buttonValue]) {
    const label = normalize(value);
    for (const [kind, pattern] of Object.entries(labels)) if (pattern.test(label)) return kind;
  }
  return null;
}
function visible(element) {
  if (!element || element.hidden || element.closest('[hidden],[aria-hidden="true"]') || !element.getClientRects().length) return false;
  const style = element.ownerDocument.defaultView.getComputedStyle(element);
  return style.visibility !== 'hidden' && style.display !== 'none';
}
export function readPortalObservation(document, armed = false) {
  const headings = [...document.querySelectorAll('h1,h2,h3,h4,strong,b,[role="heading"],header,nav,span,p,div,label')];
  const welcome = headings.some(element => visible(element) && /^welcome,\s+.{1,180}\s*\(\d{1,12}\)$/i.test(element.textContent.trim()));
  const login = document.querySelector('#loginform');
  const session = welcome ? 'authenticated' : visible(login) ? 'logged-out' : 'unknown';
  if (session !== 'authenticated') return { session, call: 'unknown' };
  const controls = [...document.querySelectorAll('button,[role="button"],input[type="button"],input[type="submit"],a[title],a[aria-label]')]
    .filter(element => visible(element) && !element.disabled && element.getAttribute('aria-disabled') !== 'true');
  const kinds = controls.map(controlKind);
  const statuses = [...document.querySelectorAll('[role="status"],.call-status,#callStatus,[data-call-status],span,p,strong')]
    .filter(visible).map(element => normalize(element.textContent));
  const connected = statuses.some(text => /^(call in progress|call connected|in call|llamada en curso|llamada conectada|en llamada)$/.test(text));
  const ended = statuses.some(text => /^(call ended|call disconnected|call completed|llamada terminada|llamada finalizada|llamada desconectada)$/.test(text));
  if (kinds.includes('hangup') && (connected || armed)) return { session, call: 'connected' };
  if (kinds.includes('accept') && kinds.includes('reject') && !kinds.includes('hangup')) return { session, call: 'incoming' };
  if (!kinds.includes('hangup') && (ended || kinds.includes('idle'))) return { session, call: 'idle' };
  return { session, call: 'unknown' };
}

export function createPortalObserver({ document, send, documentId, now = () => Date.now(), trustedClick = event => event.isTrusted }) {
  let stopped = false, armedUntil = 0, previousCall = null, candidate = null, candidateAt = 0, committed = null, pendingSignal = null;
  function click(event) {
    if (!trustedClick(event)) return;
    const target = event.target?.closest?.('button,[role="button"],input,a');
    if (!visible(target) || readPortalObservation(document).session !== 'authenticated') return;
    const kind = controlKind(target);
    if (kind === 'signout') {
      // Send during capture, before the portal navigates away and destroys this
      // document. The worker waits for the resulting public-site navigation.
      try {
        Promise.resolve(send({ kind: 'portal-sign-out', documentId })).catch(error => {
          if (/extension context invalidated/i.test(String(error?.message))) stop();
        });
      } catch { /* A failed message never closes the shift. */ }
    }
    if (kind === 'accept') armedUntil = now() + 30000;
    if (kind === 'reject') pendingSignal = 'rejected';
  }
  async function sample() {
    if (stopped) return;
    const observation = readPortalObservation(document, now() < armedUntil);
    const key = `${observation.session}/${observation.call}`;
    if (key !== candidate) { candidate = key; candidateAt = now(); return; }
    // Require stable visible evidence across samples; a transient render is unknown.
    if (now() - candidateAt < 750) return;
    if (key !== committed) {
      if (observation.session === 'authenticated') {
        if (observation.call === 'connected' && (previousCall === 'idle' || previousCall === 'incoming' || now() < armedUntil)) pendingSignal = 'accepted';
        if ((observation.call === 'idle' || observation.call === 'incoming') && previousCall === 'connected') pendingSignal = 'disconnected';
        else if (observation.call === 'incoming') pendingSignal = 'incoming';
        if (observation.call !== 'unknown') previousCall = observation.call;
        if (observation.call === 'connected' || observation.call === 'idle') armedUntil = 0;
      } else if (observation.session === 'logged-out') { previousCall = null; armedUntil = 0; pendingSignal = null; }
      committed = key;
    }
    try {
      const result = await send({ kind: 'portal-observation', documentId, ...observation, ...(pendingSignal ? { signal: pendingSignal } : {}) });
      if (result?.ok) pendingSignal = null;
    } catch (error) {
      if (/extension context invalidated/i.test(String(error?.message))) stop();
    }
  }
  function stop() { stopped = true; document.removeEventListener('click', click, true); }
  document.addEventListener('click', click, true);
  return { sample, stop, isStopped: () => stopped };
}
