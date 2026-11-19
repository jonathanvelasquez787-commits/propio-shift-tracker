import { workspacePages, workspaceOrder, defaultWorkspaceSides, validateWorkspaceSettings, workspaceKeys } from './workspace-settings.js';
const lockKey = 'workday-workspace-lock';

export function workspaceBounds(screen, frameInset = 8, rightPaneHeightRatio = 1, rightPaneWidthRatio = 5 / 16) {
  const width = Math.round(screen.availWidth), height = Math.round(screen.availHeight);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 900 || height < 500) {
    throw new Error('Necesitás una pantalla de al menos 900 × 500 para esta distribución.');
  }
  const left = Math.round(screen.availLeft || 0), top = Math.round(screen.availTop || 0);
  const inset = Number.isFinite(frameInset) ? Math.max(0, Math.min(16, frameInset)) : 8;
  const widthRatio = Number.isFinite(rightPaneWidthRatio) && rightPaneWidthRatio >= .25 && rightPaneWidthRatio <= .5 ? rightPaneWidthRatio : 5 / 16;
  const rightContentWidth = Math.max(320, Math.round(width * widthRatio));
  const rightWidth = rightContentWidth + 2 * inset;
  const ratio = typeof rightPaneHeightRatio === 'number' && Number.isFinite(rightPaneHeightRatio) && rightPaneHeightRatio >= .4 && rightPaneHeightRatio <= 1 ? rightPaneHeightRatio : 1;
  // Overlap invisible side borders and extend the bottom border past the work area.
  return {
    left: { left, top, width: width - rightContentWidth, height: height + inset },
    right: { left: left + width - rightWidth, top, width: rightWidth, height: Math.round(height * ratio) + inset }
  };
}

export async function arrangeWorkspace(api, screen, { at = Date.now(), frameInset = 8, rightPaneHeightRatio = 1, rightPaneWidthRatio = 5 / 16, configuration = null, wait = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
  const validated = configuration ? validateWorkspaceSettings(configuration) : null;
  const extras = validated?.extraPages || [];
  const pages = { ...(validated ? validated.pages : workspacePages), ...Object.fromEntries(extras.map(page => [page.id, page.url])) };
  const sides = validated ? validated.sides : defaultWorkspaceSides;
  const order = workspaceKeys(extras);
  const leftKeys = order.filter(key => sides[key] === 'left'), rightKeys = order.filter(key => sides[key] === 'right');
  if (typeof api.tabs.createSplit !== 'function' || typeof api.tabs.unsplit !== 'function') {
    throw new Error('Chrome necesita tener disponible la vista dividida para extensiones (versión 155 o posterior).');
  }
  for (const page of extras) {
    // Sin permiso del sitio Chrome no deja buscar sus pestañas y se abrirían repetidas.
    const granted = typeof api.permissions?.contains === 'function' && await api.permissions.contains({ origins: [`${new URL(page.url).origin}/*`] });
    if (!granted) throw new Error(`Falta el permiso de Chrome para «${page.name}». Abrí la configuración del espacio de trabajo y volvé a agregarla.`);
  }
  const bounds = workspaceBounds(screen, frameInset, rightPaneHeightRatio, rightPaneWidthRatio);
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
    const results = await Promise.all(order.map(key => api.tabs.query({ url: key === 'dictionary' ? ['https://www.linguee.es/*', 'https://www.linguee.com/*'] : `${new URL(pages[key]).origin}/*`, windowType: 'normal' })));
    for (let index = 0; index < results.length; index++) {
      results[index] = results[index].filter(tab => !tab.incognito);
      if (order[index] !== 'dictionary' && results[index].length > 1) throw new Error('Hay varias pestañas de una página de trabajo. Conservá una de cada una antes de organizar.');
    }
    const found = Object.fromEntries(order.map((key, index) => [key, results[index][0]]));
    const isSplit = tab => Number.isInteger(tab?.splitViewId) && tab.splitViewId >= 0;
    // Primera página de la izquierda: ancla de la ventana izquierda.
    let first = found[leftKeys[0]];
    if (!first) first = await api.tabs.create({ windowId: launcher.windowId, url: pages[leftKeys[0]], active: false });
    const leftId = first.windowId;
    // Primera página de la derecha: ancla de la ventana derecha.
    let anchor = found[rightKeys[0]];
    if (isSplit(anchor)) {
      await api.tabs.unsplit(anchor.splitViewId);
      first = await api.tabs.get(first.id);
    }
    if (!anchor || anchor.windowId === leftId) {
      const right = await api.windows.create(anchor ? { tabId: anchor.id, type: 'normal', focused: false } : { url: pages[rightKeys[0]], type: 'normal', focused: false });
      anchor = anchor ? await api.tabs.get(anchor.id) : right.tabs[0];
    }
    const tabs = { [leftKeys[0]]: first, [rightKeys[0]]: anchor };
    if (leftKeys[1]) {
      let second = found[leftKeys[1]];
      if (!second) second = await api.tabs.create({ windowId: leftId, url: pages[leftKeys[1]], active: false });
      tabs[leftKeys[1]] = second;
      const alreadySplit = first.windowId === second.windowId && first.splitViewId >= 0 && first.splitViewId === second.splitViewId && second.index === first.index + 1;
      if (!alreadySplit) {
        const splits = new Set([first.splitViewId, second.splitViewId].filter(id => Number.isInteger(id) && id >= 0));
        for (const split of splits) await api.tabs.unsplit(split);
        for (const tab of [first, second]) {
          if (tab.pinned) await api.tabs.update(tab.id, { pinned: false });
          if (tab.groupId >= 0) await api.tabs.ungroup(tab.id);
        }
        await api.tabs.move([first.id, second.id], { windowId: leftId, index: 0 });
        await api.tabs.createSplit([first.id, second.id]);
      }
    } else if (first.windowId !== leftId || isSplit(first)) {
      if (isSplit(first)) await api.tabs.unsplit(first.splitViewId);
      await api.tabs.move([first.id], { windowId: leftId, index: 0 });
    }
    for (const key of rightKeys.slice(1)) {
      let tab = key === 'dictionary' ? (results[order.indexOf(key)].find(item => item.windowId === anchor.windowId) || found[key]) : found[key];
      if (!tab) tab = await api.tabs.create({ windowId: anchor.windowId, url: pages[key], active: false });
      if (isSplit(tab)) await api.tabs.unsplit(tab.splitViewId);
      tabs[key] = tab;
    }
    await api.tabs.move(rightKeys.map(key => tabs[key].id), { windowId: anchor.windowId, index: 0 });
    const portal = tabs.portal, interpreter = tabs.interpreter, tracker = tabs.tracker, dictionary = tabs.dictionary;
    for (const [id, geometry] of [[leftId, bounds.left], [anchor.windowId, bounds.right]]) {
      await api.windows.update(id, { state: 'normal' });
      await api.windows.update(id, { ...geometry, focused: false });
    }
    await api.tabs.update(first.id, { active: true });
    await api.tabs.update(anchor.id, { active: true });
    await api.windows.update(anchor.windowId, { focused: true });
    return { status: 'ready', portal: portal.id, interpreter: interpreter.id, tracker: tracker.id, dictionary: dictionary.id, ...Object.fromEntries(extras.map(page => [page.id, tabs[page.id].id])) };
  } finally {
    if ((await api.storage.session.get(lockKey))[lockKey]?.owner === owner) await api.storage.session.remove(lockKey);
  }
}
