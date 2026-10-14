import { arrangeWorkspace } from './workspace.js';
const status = document.getElementById('workspace-status');
const retry = document.getElementById('workspace-retry');
let running = false;
async function prepare() {
  if (running) return;
  running = true; retry.hidden = true;
  status.textContent = 'Preparando tus ventanas…';
  try {
    const profile = location.hash === '#profile';
    if (profile && !(await chrome.storage.local.get('workspace-profile-enabled'))['workspace-profile-enabled']) {
      status.textContent = 'La apertura automática del espacio de trabajo está desactivada para este perfil.';
      return;
    }
    const minimumInset = /Win/i.test(globalThis.navigator?.platform || '') ? 8 : 0;
    const frameInset = Math.max(minimumInset, Math.min(16, (window.outerWidth - window.innerWidth) / 2));
    const result = await arrangeWorkspace(chrome, window.screen, { frameInset });
    if (result.status === 'already-running') status.textContent = 'Otra pestaña ya está preparando tus ventanas.';
    else {
      await chrome.storage.session.set({ 'workspace-profile-session': { prepared: true, phase: 'ready' } });
      status.textContent = 'Tus ventanas están listas.';
      const tab = await chrome.tabs.getCurrent();
      await chrome.tabs.remove(tab.id);
    }
  } catch (error) {
    await chrome.storage.session.set({ 'workspace-profile-session': { prepared: false, phase: 'failed' } });
    status.textContent = error.message || 'No se pudieron organizar las ventanas. Podés reintentar.';
    retry.hidden = false;
    try {
      const tab = await chrome.tabs.getCurrent();
      await chrome.tabs.update(tab.id, { active: true });
    } catch {}
  } finally { running = false; }
}
retry.addEventListener('click', prepare);
prepare();
