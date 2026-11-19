import { readWorkspaceSettings, saveWorkspaceSettings, workspaceOrder, workspaceNames, defaultWorkspaceSides, describeSides } from './workspace-settings.js';
const form = document.getElementById('workspace-setup'), message = document.getElementById('setup-status'), save = document.getElementById('setup-save');
const fields = Object.fromEntries([...form.elements].filter(input => input.name).map(input => [input.name, input]));
const PATHS_KEY = 'workspace-windows-paths';
const DEFAULT_PATHS = { shortcut: 'C:\\Users\\Jonathan\\Desktop\\Jonathan - Chrome.lnk', notes: 'C:\\Users\\Jonathan\\Desktop\\Notas.txt' };
const unquote = value => String(value || '').trim().replace(/^["']+|["']+$/g, '').trim();
async function savePaths() {
  try { await chrome.storage.local.set({ [PATHS_KEY]: { shortcut: unquote(fields.shortcut.value), notes: unquote(fields.notes.value) } }); } catch { /* si no se puede guardar, el cuadro sigue funcionando */ }
}
const widthRange = document.getElementById('width-range'), heightRange = document.getElementById('height-range');
let sides = { ...defaultWorkspaceSides };
const side = name => workspaceOrder.filter(key => sides[key] === name);
function renderSides() {
  const left = side('left'), right = side('right');
  for (const [name, keys] of [['left', left], ['right', right]]) {
    const list = document.getElementById(`side-${name}`); list.textContent = '';
    for (const key of keys) {
      const item = document.createElement('li'), label = document.createElement('span'), button = document.createElement('button');
      label.textContent = workspaceNames[key]; button.type = 'button'; button.dataset.side = key;
      button.textContent = name === 'left' ? 'Pasar a la derecha →' : '← Pasar a la izquierda';
      button.disabled = name === 'left' ? left.length <= 1 : left.length >= 2;
      button.addEventListener('click', () => { sides[key] = name === 'left' ? 'right' : 'left'; renderSides(); });
      item.append(label, button); list.append(item);
    }
  }
  document.getElementById('sides-note').textContent = left.length <= 1 ? 'A la izquierda tiene que quedar al menos una página.' : left.length >= 2 ? 'A la izquierda caben 2 páginas como mucho; para pasar otra, primero pasá una a la derecha.' : '';
  const summary = describeSides(sides);
  for (const id of ['brand-summary', 'status-summary']) { const element = document.getElementById(id); if (element) element.textContent = summary; }
  updatePreview();
}
function updatePreview() {
  const width = Math.min(50, Math.max(25, Number(fields.width.value) || 31.25)), height = Math.min(100, Math.max(40, Number(fields.height.value) || 100));
  const leftBox = document.getElementById('preview-left'), right = document.getElementById('preview-right'), rightKeys = side('right');
  leftBox.style.width = `calc(${100 - width}% - 3px)`; leftBox.textContent = '';
  for (const key of side('left')) { const page = document.createElement('span'); page.textContent = workspaceNames[key]; leftBox.append(page); }
  right.style.width = `calc(${width}% - 3px)`; right.style.height = `${height}%`; right.textContent = '';
  const main = document.createElement('span'); main.textContent = workspaceNames[rightKeys[0]] || ''; right.append(main);
  if (rightKeys.length > 1) { const tabs = document.createElement('small'); tabs.textContent = `+ pestañas: ${rightKeys.slice(1).map(key => workspaceNames[key]).join(', ')}`; right.append(tabs); }
  document.getElementById('preview-caption').textContent = `Izquierda: ${Math.round((100 - width) * 100) / 100}% del ancho · Derecha: ${Math.round(width * 100) / 100}% del ancho y ${Math.round(height * 10) / 10}% del alto`;
}
for (const [range, number] of [[widthRange, fields.width], [heightRange, fields.height]]) {
  range.addEventListener('input', () => { number.value = range.value; updatePreview(); });
  number.addEventListener('input', () => { range.value = number.value; updatePreview(); });
}
let loaded = false;
try {
  const savedPaths = (await chrome.storage.local.get(PATHS_KEY))[PATHS_KEY] || DEFAULT_PATHS;
  if (savedPaths && typeof savedPaths === 'object') {
    if (typeof savedPaths.shortcut === 'string') fields.shortcut.value = savedPaths.shortcut;
    if (typeof savedPaths.notes === 'string') fields.notes.value = savedPaths.notes;
  }
} catch { /* sin rutas guardadas */ }
for (const key of ['shortcut', 'notes']) fields[key].addEventListener('change', savePaths);
try {
  let defaults = {};
  const response = await fetch(chrome.runtime.getURL('workspace-preferences.json'));
  if (response.ok) defaults = await response.json();
  const value = await readWorkspaceSettings(chrome, defaults);
  const startup = (await chrome.storage.local.get('workspace-profile-enabled'))['workspace-profile-enabled'];
  const passive = (await chrome.storage.local.get('automation-device-passive'))['automation-device-passive'];
  for (const key of ['portal','interpreter','tracker','dictionary']) fields[key].value = value.pages[key];
  fields.startup.checked = typeof startup === 'boolean' ? startup : value.openOnProfileStart;
  fields.passive.checked = typeof passive === 'boolean' ? passive : value.passive;
  fields.height.value = Math.round(value.rightPaneHeightRatio * 1000) / 10;
  fields.width.value = Math.round(value.rightPaneWidthRatio * 10000) / 100;
  widthRange.value = fields.width.value; heightRange.value = fields.height.value; sides = { ...value.sides }; renderSides();
  message.textContent = 'La configuración pertenece solo al perfil de Chrome donde abriste este asistente. Guardar no abre ni mueve ventanas.';
  loaded = true;
} catch (error) { message.textContent = error.message || 'No se pudo leer la configuración. Reabrí el asistente antes de guardar.'; }
save.disabled = !loaded;
form.addEventListener('submit', async event => {
  event.preventDefault(); if (!loaded || save.disabled) return;
  save.disabled = true;
  try {
    await saveWorkspaceSettings(chrome, { version: 1, openOnProfileStart: fields.startup.checked, passive: fields.passive.checked,
      rightPaneHeightRatio: Number(fields.height.value) / 100, rightPaneWidthRatio: Number(fields.width.value) / 100,
      sides: { ...sides }, pages: Object.fromEntries(['portal','interpreter','tracker','dictionary'].map(key => [key, fields[key].value])) });
    message.textContent = 'Guardado en este perfil. Tus llamadas, notas y preferencias de otras PCs se conservan. Podés organizar ahora o en la siguiente apertura del perfil.';
    document.getElementById('workspace-retry').hidden = false;
    document.getElementById('workspace-retry').textContent = 'Organizar ahora';
  } catch (error) { message.textContent = error.message || 'No se pudo guardar. Se conserva la configuración anterior.'; }
  finally { save.disabled = false; }
});
document.getElementById('setup-export').addEventListener('click', () => {
  const exportMessage = document.getElementById('export-status');
  const shortcut = unquote(fields.shortcut.value), notes = unquote(fields.notes.value);
  if ((shortcut && !/^[a-z]:\\.+\.lnk$/i.test(shortcut)) || (notes && !/^[a-z]:\\.+/i.test(notes))) {
    exportMessage.textContent = 'Escribí la ruta completa (por ejemplo C:\\...\\Trabajo.lnk).'; return;
  }
  savePaths();
  const height = Number(fields.height.value) / 100;
  if (!Number.isFinite(height) || height < .4 || height > .85) { exportMessage.textContent = 'Para reservar espacio a las notas, usá entre 40% y 85% de alto.'; return; }
  const settings = { version: 1, ...(shortcut ? { ShortcutPath: shortcut } : {}), ...(notes ? { NotesFile: notes } : {}), RightPaneHeightRatio: height, RightPaneWidthRatio: Number(fields.width.value) / 100 };
  const objectUrl = URL.createObjectURL(new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a'); anchor.href = objectUrl; anchor.download = 'propio-workspace-configuration.json';
  anchor.click(); setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  exportMessage.textContent = 'Configuración preparada para el instalador de Windows. El archivo contiene rutas, no el contenido de tus notas; todavía no se modificó ningún acceso.' + (!shortcut || !notes ? ' Falta escribir una de las rutas: el instalador de Windows te va a pedir que la escribas.' : '');
});
