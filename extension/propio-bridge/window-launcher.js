// El icono de la extension abre (o enfoca) la ventana propia del tracker, sin pestañas ni barra de direcciones.
export const WINDOW_SIZE = { width: 490, height: 620 };
export function installWindowLauncher(api) {
  async function open() {
    const url = api.runtime.getURL('panel.html');
    let tabs = [];
    try { tabs = await api.tabs.query({ url: `${url}*` }); } catch { tabs = []; }
    if (tabs.length) {
      try {
        await api.windows.update(tabs[0].windowId, { focused: true });
        await api.tabs.update(tabs[0].id, { active: true });
        return 'focused';
      } catch { /* la ventana se cerro justo ahora: se abre otra */ }
    }
    await api.windows.create({ url, type: 'popup', ...WINDOW_SIZE });
    return 'created';
  }
  api.action.onClicked.addListener(() => { void open().catch(() => {}); });
  return { open };
}
