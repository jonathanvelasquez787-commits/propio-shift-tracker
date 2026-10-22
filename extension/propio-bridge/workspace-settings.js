export const workspaceSettingsKey = 'workspace-configuration-v1';
export const workspacePages = Object.freeze({ portal: 'https://interpreters.propio-ls.com/portal', interpreter: 'https://app.useinterpreter.com/', tracker: 'https://propio-shift-tracker.vercel.app/', dictionary: 'https://www.linguee.es/' });
export function validateWorkspaceSettings(value) {
  if (!value || value.version !== 1 || typeof value.openOnProfileStart !== 'boolean' || typeof value.passive !== 'boolean' ||
      !Number.isFinite(value.rightPaneHeightRatio) || value.rightPaneHeightRatio < .4 || value.rightPaneHeightRatio > 1 ||
      !Number.isFinite(value.rightPaneWidthRatio) || value.rightPaneWidthRatio < .25 || value.rightPaneWidthRatio > .5) throw Error('Revisá las opciones y tamaños del espacio de trabajo.');
  const pages = {};
  for (const [key, fallback] of Object.entries(workspacePages)) {
    const raw = value.pages?.[key];
    if (typeof raw !== 'string' || raw.length > 1000) throw Error('Revisá las direcciones de tus páginas.');
    let url;
    try { url = new URL(raw); } catch { throw Error('Usá direcciones HTTPS completas.'); }
    const allowed = key === 'dictionary' ? ['https://www.linguee.es', 'https://www.linguee.com'] : [new URL(fallback).origin];
    if (!allowed.includes(url.origin) || url.username || url.password || url.search || url.hash ||
        (key === 'portal' && !/^\/portal(?:\/|$)/.test(url.pathname))) throw Error('Usá las páginas de trabajo reconocidas, sin contraseña, parámetros ni fragmentos.');
    pages[key] = url.href;
  }
  return { version: 1, pages, openOnProfileStart: value.openOnProfileStart, passive: value.passive,
    rightPaneHeightRatio: value.rightPaneHeightRatio, rightPaneWidthRatio: value.rightPaneWidthRatio };
}
export async function saveWorkspaceSettings(api, value) {
  const settings = validateWorkspaceSettings(value);
  await api.storage.local.set({ [workspaceSettingsKey]: settings, 'workspace-profile-enabled': settings.openOnProfileStart, 'automation-device-passive': settings.passive });
  return settings;
}
export async function readWorkspaceSettings(api, defaults = {}) {
  const saved = (await api.storage.local.get(workspaceSettingsKey))[workspaceSettingsKey];
  if (saved !== undefined) return validateWorkspaceSettings(saved);
  return validateWorkspaceSettings({ version: 1, pages: workspacePages, openOnProfileStart: defaults.openOnProfileStart === true,
    passive: true, rightPaneHeightRatio: typeof defaults.rightPaneHeightRatio === 'number' ? defaults.rightPaneHeightRatio : 1,
    rightPaneWidthRatio: 5 / 16 });
}
