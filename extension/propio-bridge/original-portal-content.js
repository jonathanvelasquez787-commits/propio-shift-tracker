import { offlineStartButton } from './portal-observer.js';
const key = 'propio-original-layout-v1';
const protocol = 'pst-original-portal-layout/v1';

export function installOriginalPortal(api, { window, document, reloadAllowed = () => Boolean(offlineStartButton(document)), setTimer = setInterval, clearTimer = clearInterval } = {}) {
  if (window.top !== window || window.location.origin !== 'https://interpreters.propio-ls.com' || !/^\/portal(?:\/|$)/.test(window.location.pathname)) return;
  let current = null, loadedRevision = null, attemptedRevision = null, revision = 0, applying = false, stopped = false;
  const normalize = value => value && typeof value.enabled === 'boolean' && /^[\w-]{12,100}$/.test(value.revision || '') ? { enabled: value.enabled, revision: value.revision } : null;
  const announce = () => {
    window.postMessage({ protocol, enabled: current?.enabled === true }, window.location.origin);
    if (!current || stopped) return;
    const header = document.querySelector('app-header'), native = document.querySelector('app-daily-rollup');
    const state = !current.enabled ? 'disabled' : native ? 'native-present' : !header ? 'loading' : !reloadAllowed() ? 'waiting-offline' : 'native-missing';
    try { Promise.resolve(api.runtime.sendMessage({ kind: 'portal-layout-observation', revision: current.revision, state })).catch(() => {}); }
    catch (error) { if (/extension context invalidated/i.test(String(error?.message))) stop(); }
  };
  async function apply() {
    if (stopped || applying || !current || current.revision === attemptedRevision || !document.querySelector('app-header') || !reloadAllowed()) return;
    const legacyMissing = current.enabled && !document.querySelector('app-daily-rollup');
    if (current.revision === loadedRevision && !legacyMissing) return;
    applying = true;
    try {
      const requestedRevision = current.revision;
      const result = await api.runtime.sendMessage({ kind: 'apply-portal-layout', revision: requestedRevision });
      if (result?.ok) attemptedRevision = requestedRevision;
    }
    catch (error) { if (/extension context invalidated/i.test(String(error?.message))) stop(); }
    finally { applying = false; }
  }
  function changed(changes, area) {
    if (area !== 'local' || !changes[key]) return;
    revision++; current = normalize(changes[key].newValue); announce(); void apply();
  }
  const timer = setTimer(() => { announce(); void apply(); }, 1500);
  function stop() {
    if (stopped) return;
    stopped = true; clearTimer(timer); api.storage.onChanged.removeListener(changed);
  }
  api.storage.onChanged.addListener(changed);
  const initialRevision = revision;
  api.storage.local.get(key).then(values => {
    if (stopped || revision !== initialRevision) return;
    current = normalize(values[key]); loadedRevision = current?.revision; announce(); void apply();
  }).catch(() => {});
  window.addEventListener('pagehide', event => { if (!event.persisted) stop(); });
  return { apply, stop };
}

