export const portalDarkKey = 'propio-dark-mode-v1';

export function installPortalDarkMode(api, { window, document } = {}) {
  if (window.top !== window || window.location.origin !== 'https://interpreters.propio-ls.com' || !/^\/portal(?:\/|$)/.test(window.location.pathname)) return;
  let enabled = false, revision = 0, stopped = false;
  function render() {
    if (stopped || !document.documentElement) return;
    if (enabled) document.documentElement.setAttribute('data-pst-dark', '');
    else document.documentElement.removeAttribute('data-pst-dark');
  }
  function changed(changes, area) {
    if (stopped || area !== 'local' || !changes[portalDarkKey]) return;
    revision++;
    enabled = changes[portalDarkKey].newValue?.enabled === true;
    render();
  }
  function stop() {
    stopped = true;
    api.storage.onChanged.removeListener(changed);
    document.removeEventListener('DOMContentLoaded', render);
  }
  api.storage.onChanged.addListener(changed);
  document.addEventListener('DOMContentLoaded', render);
  const initialRevision = revision;
  api.storage.local.get(portalDarkKey).then(values => {
    if (stopped || initialRevision !== revision) return;
    enabled = values[portalDarkKey]?.enabled === true;
    render();
  }).catch(() => {});
  window.addEventListener('pagehide', event => { if (!event.persisted) stop(); });
  return { stop };
}
