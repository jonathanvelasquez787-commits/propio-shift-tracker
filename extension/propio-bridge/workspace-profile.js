const preferenceKey = 'workspace-profile-enabled';
const sessionKey = 'workspace-profile-session';

export function installProfileWorkspace(api, { readDefault = async () => {
  const response = await fetch(api.runtime.getURL('workspace-preferences.json'));
  return response.ok && (await response.json()).openOnProfileStart === true;
} } = {}) {
  let queue = Promise.resolve();
  function enqueue(task) {
    const result = queue.then(task);
    queue = result.catch(() => {});
    return result;
  }
  async function enabled() {
    const stored = (await api.storage.local.get(preferenceKey))[preferenceKey];
    if (typeof stored === 'boolean') return stored;
    const value = await readDefault();
    await api.storage.local.set({ [preferenceKey]: value });
    return value;
  }
  async function open() {
    if (!await enabled()) return { status: 'disabled' };
    if ((await api.storage.session.get(sessionKey))[sessionKey]?.prepared) return { status: 'already-prepared' };
    const windows = (await api.windows.getAll({ windowTypes: ['normal'] })).filter(window => !window.incognito);
    if (!windows.length) return { status: 'no-window' };
    const url = api.runtime.getURL('workspace.html#profile');
    const launchers = (await api.runtime.getContexts({ contextTypes: ['TAB'] }))
      .filter(context => !context.incognito && context.tabId >= 0 && context.documentUrl?.split('#')[0] === api.runtime.getURL('workspace.html'));
    await api.storage.session.set({ [sessionKey]: { prepared: true } });
    try {
      if (launchers.length) {
        // Adoptá el acceso de Windows si llegó junto con el evento del perfil.
        if (launchers[0].documentUrl !== url) await api.tabs.update(launchers[0].tabId, { url });
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
  api.windows.onCreated.addListener(safe(created), { windowTypes: ['normal'] });
  api.windows.onRemoved.addListener(safe(removed), { windowTypes: ['normal'] });
  return { startup, created, removed };
}
