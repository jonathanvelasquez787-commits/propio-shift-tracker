const preferenceKey = 'workspace-profile-enabled';
const sessionKey = 'workspace-profile-session';
const revisionKey = 'workspace-profile-setup-revision';

export function installProfileWorkspace(api, { readDefault = async () => {
  const response = await fetch(api.runtime.getURL('workspace-preferences.json'));
  return response.ok ? await response.json() : { openOnProfileStart: false };
} } = {}) {
  let queue = Promise.resolve();
  function enqueue(task) {
    const result = queue.then(task);
    queue = result.catch(() => {});
    return result;
  }
  async function enabled() {
    const defaults = await readDefault();
    const value = defaults === true || defaults?.openOnProfileStart === true;
    const revision = typeof defaults?.profileSetupRevision === 'string' ? defaults.profileSetupRevision.slice(0, 64) : '';
    if (revision && (await api.storage.local.get(revisionKey))[revisionKey] !== revision) {
      // Una configuración personal nueva se aplica una vez; luego manda la elección guardada.
      await api.storage.local.set({ [preferenceKey]: value, [revisionKey]: revision });
      await api.storage.session.remove(sessionKey);
      return value;
    }
    const stored = (await api.storage.local.get(preferenceKey))[preferenceKey];
    if (typeof stored === 'boolean') return stored;
    await api.storage.local.set({ [preferenceKey]: value });
    return value;
  }
  async function open({ retryExisting = false } = {}) {
    if (!await enabled()) return { status: 'disabled' };
    const previous = (await api.storage.session.get(sessionKey))[sessionKey];
    if (previous?.prepared) return { status: 'already-prepared' };
    const windows = (await api.windows.getAll({ windowTypes: ['normal'] })).filter(window => !window.incognito);
    if (!windows.length) return { status: 'no-window' };
    const url = api.runtime.getURL('workspace.html#profile');
    const launchers = (await api.runtime.getContexts({ contextTypes: ['TAB'] }))
      .filter(context => !context.incognito && context.tabId >= 0 && context.documentUrl?.split('#')[0] === api.runtime.getURL('workspace.html'));
    await api.storage.session.set({ [sessionKey]: { prepared: true, phase: 'preparing' } });
    try {
      if (launchers.length) {
        // Adoptá el acceso de Windows si llegó junto con el evento del perfil.
        if (launchers[0].documentUrl !== url) await api.tabs.update(launchers[0].tabId, { url });
        else if (retryExisting || previous?.phase === 'failed') await api.tabs.reload(launchers[0].tabId);
        return { status: 'reused' };
      }
      await api.tabs.create({ windowId: windows[0].id, url, active: false });
      return { status: 'opened' };
    } catch (error) {
      await api.storage.session.remove(sessionKey);
      throw error;
    }
  }
  const startup = () => enqueue(open);
  const installed = details => enqueue(async () => {
    if (!['install', 'update'].includes(details.reason)) return { status: 'ignored-install' };
    await api.storage.session.remove(sessionKey);
    return open({ retryExisting: true });
  });
  const created = window => enqueue(async () => {
    if (window.incognito || window.type !== 'normal') return { status: 'ignored-window' };
    return open();
  });
  const removed = () => enqueue(async () => {
    const normal = (await api.windows.getAll({ windowTypes: ['normal'] })).filter(window => !window.incognito);
    if (!normal.length) await api.storage.session.remove(sessionKey);
  });
  const safe = handler => (...args) => { handler(...args).catch(() => {}); };
  api.runtime.onStartup.addListener(safe(startup));
  api.runtime.onInstalled.addListener(safe(installed));
  api.windows.onCreated.addListener(safe(created), { windowTypes: ['normal'] });
  api.windows.onRemoved.addListener(safe(removed), { windowTypes: ['normal'] });
  return { startup, installed, created, removed };
}
