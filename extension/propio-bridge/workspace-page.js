import { arrangeWorkspace } from './workspace.js';
const status = document.getElementById('workspace-status');
const retry = document.getElementById('workspace-retry');
let running = false;
async function prepare() {
  if (running) return;
  running = true; retry.hidden = true;
  status.textContent = 'Preparando tus ventanas…';
  try {
    const startup = location.hash !== '#setup';
    if (!startup) history.replaceState(null, '', '#startup');
    const result = await arrangeWorkspace(chrome, window.screen, { startup });
    if (result.status === 'outside-hours') status.textContent = 'El arranque automático está fuera de horario. Tus ventanas quedan como están.';
    else if (result.status === 'already-running') status.textContent = 'Otra pestaña ya está preparando tus ventanas.';
    else {
      status.textContent = 'Todo listo. Vos aceptás tu primera llamada cuando llegue.';
      const tab = await chrome.tabs.getCurrent();
      await chrome.tabs.remove(tab.id);
    }
  } catch (error) {
    status.textContent = error.message || 'No se pudieron organizar las ventanas. Podés reintentar.';
    retry.hidden = false;
  } finally { running = false; }
}
retry.addEventListener('click', prepare);
prepare();
