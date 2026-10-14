const pages = {
  portal: 'https://interpreters.propio-ls.com/portal',
  interpreter: 'https://app.useinterpreter.com/',
  tracker: 'https://propio-shift-tracker.vercel.app/'
};
const lockKey = 'workday-workspace-lock';

export function workspaceBounds(screen) {
  const width = Math.round(screen.availWidth), height = Math.round(screen.availHeight);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 900 || height < 500) {
    throw new Error('Necesitás una pantalla de al menos 900 × 500 para esta distribución.');
  }
  const left = Math.round(screen.availLeft || 0), top = Math.round(screen.availTop || 0);
  const rightWidth = Math.max(320, Math.round(width / 3));
  return {
    left: { left, top, width: width - rightWidth, height },
    right: { left: left + width - rightWidth, top, width: rightWidth, height }
  };
}

export async function arrangeWorkspace(api, screen, { at = Date.now(), wait = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
  if (typeof api.tabs.createSplit !== 'function' || typeof api.tabs.unsplit !== 'function') {
    throw new Error('Chrome necesita tener disponible la vista dividida para extensiones (versión 155 o posterior).');
  }
  const bounds = workspaceBounds(screen);
  const launcher = await api.tabs.getCurrent();
  if (!launcher || launcher.incognito) throw new Error('Abrí el espacio de trabajo en tu perfil habitual de Chrome.');
  const owner = `${launcher.id}:${at}`;
  const previous = (await api.storage.session.get(lockKey))[lockKey];
  if (previous && at - previous.at < 90000) return { status: 'already-running' };
  await api.storage.session.set({ [lockKey]: { owner, at } });
  await wait(300);
  if ((await api.storage.session.get(lockKey))[lockKey]?.owner !== owner) return { status: 'already-running' };
  try {
    // Dejá terminar la restauración antes de buscar pestañas para no duplicarlas.
    await wait(1200);
    const results = await Promise.all(Object.values(pages).map(url => api.tabs.query({ url: `${new URL(url).origin}/*`, windowType: 'normal' })));
    for (let index = 0; index < results.length; index++) {
      results[index] = results[index].filter(tab => !tab.incognito);
      if (results[index].length > 1) throw new Error('Hay varias pestañas de una página de trabajo. Conservá una de cada una antes de organizar.');
    }
    let [portal, interpreter, tracker] = results.map(tabs => tabs[0]);
    if (!portal) portal = await api.tabs.create({ windowId: launcher.windowId, url: pages.portal, active: false });
    const leftId = portal.windowId;
    if (Number.isInteger(tracker?.splitViewId) && tracker.splitViewId >= 0) {
      await api.tabs.unsplit(tracker.splitViewId);
      portal = await api.tabs.get(portal.id);
    }
    if (!tracker || tracker.windowId === leftId) {
      const right = await api.windows.create(tracker ? { tabId: tracker.id, type: 'normal', focused: false } : { url: pages.tracker, type: 'normal', focused: false });
      tracker = tracker ? await api.tabs.get(tracker.id) : right.tabs[0];
    }
    if (!interpreter) interpreter = await api.tabs.create({ windowId: leftId, url: pages.interpreter, active: false });
    const alreadySplit = portal.windowId === interpreter.windowId && portal.splitViewId >= 0 && portal.splitViewId === interpreter.splitViewId && interpreter.index === portal.index + 1;
    if (!alreadySplit) {
      const splits = new Set([portal.splitViewId, interpreter.splitViewId].filter(id => Number.isInteger(id) && id >= 0));
      for (const split of splits) await api.tabs.unsplit(split);
      for (const tab of [portal, interpreter]) {
        if (tab.pinned) await api.tabs.update(tab.id, { pinned: false });
        if (tab.groupId >= 0) await api.tabs.ungroup(tab.id);
      }
      await api.tabs.move([portal.id, interpreter.id], { windowId: leftId, index: 0 });
      await api.tabs.createSplit([portal.id, interpreter.id]);
    }
    for (const [id, geometry] of [[leftId, bounds.left], [tracker.windowId, bounds.right]]) {
      await api.windows.update(id, { state: 'normal' });
      await api.windows.update(id, { ...geometry, focused: false });
    }
    await api.tabs.update(portal.id, { active: true });
    await api.tabs.update(tracker.id, { active: true });
    await api.windows.update(tracker.windowId, { focused: true });
    return { status: 'ready', portal: portal.id, interpreter: interpreter.id, tracker: tracker.id };
  } finally {
    if ((await api.storage.session.get(lockKey))[lockKey]?.owner === owner) await api.storage.session.remove(lockKey);
  }
}
