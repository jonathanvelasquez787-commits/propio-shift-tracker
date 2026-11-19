export const workspaceSettingsKey = 'workspace-configuration-v1';
export const workspacePages = Object.freeze({ portal: 'https://interpreters.propio-ls.com/portal', interpreter: 'https://app.useinterpreter.com/', tracker: 'https://propio-shift-tracker.vercel.app/', dictionary: 'https://www.linguee.es/' });
export const workspaceOrder = Object.freeze(['portal', 'interpreter', 'tracker', 'dictionary']);
export const workspaceNames = Object.freeze({ portal: 'Propio', interpreter: 'UseInterpreter', tracker: 'Propio Shift Tracker', dictionary: 'Linguee' });
export const defaultWorkspaceSides = Object.freeze({ portal: 'left', interpreter: 'left', tracker: 'right', dictionary: 'right' });
export const maxExtraPages = 4;
export const workspaceKeys = (extraPages = []) => [...workspaceOrder, ...extraPages.map(page => page.id)];
export const workspaceNamesFor = (extraPages = []) => ({ ...workspaceNames, ...Object.fromEntries(extraPages.map(page => [page.id, page.name])) });
export function validateWorkspaceSides(value, keys = workspaceOrder) {
  if (value === undefined) return Object.fromEntries(keys.map(key => [key, defaultWorkspaceSides[key] || 'right']));
  const sides = {};
  for (const key of keys) {
    if (!value || (value[key] !== 'left' && value[key] !== 'right')) throw Error('Revisá de qué lado va cada página.');
    sides[key] = value[key];
  }
  const left = keys.filter(key => sides[key] === 'left').length;
  if (left < 1 || left > 2 || left === keys.length) throw Error('A la izquierda caben 1 o 2 páginas, y a la derecha tiene que quedar al menos una.');
  return sides;
}
export function describeSides(sides, extraPages = []) {
  const names = workspaceNamesFor(extraPages), keys = workspaceKeys(extraPages);
  const list = side => keys.filter(key => sides[key] === side).map(key => names[key]).reduce((text, name, index, all) => text + (index === 0 ? '' : index === all.length - 1 ? ' y ' : ', ') + name, '');
  return `${list('left')} a la izquierda; ${list('right')} a la derecha.`;
}
export function validateExtraPages(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > maxExtraPages) throw Error(`Podés agregar hasta ${maxExtraPages} páginas.`);
  const builtIn = new Set([...Object.values(workspacePages).map(raw => new URL(raw).origin), 'https://www.linguee.com']);
  const ids = new Set(), origins = new Set(), result = [];
  for (const page of value) {
    const name = typeof page?.name === 'string' ? page.name.trim() : '';
    if (!/^extra[1-9]$/.test(page?.id || '') || ids.has(page.id) || !name || name.length > 30) throw Error('Revisá el nombre de la página que agregaste (hasta 30 letras).');
    let url;
    try { url = new URL(page.url); } catch { throw Error('Usá direcciones HTTPS completas.'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || String(page.url).length > 1000) throw Error('La página nueva debe ser HTTPS, sin contraseña, parámetros ni fragmentos.');
    if (builtIn.has(url.origin) || origins.has(url.origin)) throw Error('Ese sitio ya está en tu espacio de trabajo.');
    ids.add(page.id); origins.add(url.origin); result.push({ id: page.id, name, url: url.href });
  }
  return result;
}
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
  const extraPages = validateExtraPages(value.extraPages);
  const sides = validateWorkspaceSides(value.sides, workspaceKeys(extraPages));
  return { version: 1, pages, sides, ...(extraPages.length ? { extraPages } : {}), openOnProfileStart: value.openOnProfileStart, passive: value.passive,
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
