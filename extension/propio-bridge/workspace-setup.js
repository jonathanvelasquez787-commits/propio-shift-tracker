import { readWorkspaceSettings, saveWorkspaceSettings, workspacePages, workspaceOrder, workspaceNames, defaultWorkspaceSides, describeSides, workspaceKeys, workspaceNamesFor, validateExtraPages, maxExtraPages } from './workspace-settings.js';
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
let extras = [];
const names = () => workspaceNamesFor(extras);
const urlOf = key => fields[key] ? fields[key].value : (extras.find(page => page.id === key)?.url || '');
const dirtyNote = document.getElementById('dirty-note');
function markDirty(on = true) { if (dirtyNote) dirtyNote.hidden = !on; }
const side = name => workspaceKeys(extras).filter(key => sides[key] === name);
function renderSides() {
  const left = side('left'), right = side('right');
  for (const [name, keys] of [['left', left], ['right', right]]) {
    const list = document.getElementById(`side-${name}`); list.textContent = '';
    for (const key of keys) {
      const item = document.createElement('li'), label = document.createElement('span'), button = document.createElement('button');
      label.textContent = names()[key]; button.type = 'button'; button.dataset.side = key;
      button.textContent = name === 'left' ? 'Pasar a la derecha →' : '← Pasar a la izquierda';
      button.disabled = name === 'left' ? left.length <= 1 : left.length >= 2;
      button.addEventListener('click', () => { sides[key] = name === 'left' ? 'right' : 'left'; markDirty(); renderSides(); });
      const address = document.createElement('small'), edit = document.createElement('button');
      const show = () => { try { const url = new URL(urlOf(key)); address.textContent = url.host + (url.pathname === '/' ? '' : url.pathname); } catch { address.textContent = urlOf(key); } };
      show(); address.className = 'side-address'; edit.type = 'button'; edit.textContent = 'Editar'; edit.dataset.edit = key;
      if (!fields[key]) {
        edit.textContent = 'Quitar'; edit.dataset.remove = key; delete edit.dataset.edit;
        edit.disabled = name === 'left' && left.length <= 1;
        edit.addEventListener('click', () => { extras = extras.filter(page => page.id !== key); delete sides[key]; markDirty(); renderSides(); });
        item.append(label, address, edit, button); list.append(item); continue;
      }
      edit.addEventListener('click', () => {
        if (item.querySelector('input')) return;
        const input = document.createElement('input'); input.type = 'url'; input.value = fields[key].value; input.setAttribute('aria-label', `Dirección de ${workspaceNames[key]}`);
        input.addEventListener('input', () => { fields[key].value = input.value; });
        input.addEventListener('change', show);
        address.replaceWith(input); edit.textContent = 'Listo'; edit.addEventListener('click', () => { show(); input.replaceWith(address); edit.textContent = 'Editar'; }, { once: true }); input.focus();
      });
      item.append(label, address, edit, button); list.append(item);
    }
  }
  document.getElementById('sides-note').textContent = left.length <= 1 ? 'A la izquierda tiene que quedar al menos una página.' : left.length >= 2 ? 'A la izquierda caben 2 páginas como mucho; para pasar otra, primero pasá una a la derecha.' : '';
  const summary = describeSides(sides, extras);
  const openAdd = document.getElementById('add-page-open'); if (openAdd) { openAdd.disabled = extras.length >= maxExtraPages; openAdd.textContent = extras.length >= maxExtraPages ? `Ya agregaste ${maxExtraPages} páginas` : '+ Agregar otra página'; }
  for (const id of ['brand-summary', 'status-summary']) { const element = document.getElementById(id); if (element) element.textContent = summary; }
  updatePreview();
}
function updatePreview() {
  const width = Math.min(50, Math.max(25, Number(fields.width.value) || 31.25)), height = Math.min(100, Math.max(40, Number(fields.height.value) || 100));
  const leftBox = document.getElementById('preview-left'), right = document.getElementById('preview-right'), rightKeys = side('right');
  leftBox.style.width = `calc(${100 - width}% - 3px)`; leftBox.textContent = '';
  for (const key of side('left')) { const page = document.createElement('span'); page.textContent = names()[key]; leftBox.append(page); }
  right.style.width = `calc(${width}% - 3px)`; right.style.height = `${height}%`; right.textContent = '';
  const main = document.createElement('span'); main.textContent = names()[rightKeys[0]] || ''; right.append(main);
  if (rightKeys.length > 1) { const tabs = document.createElement('small'); tabs.textContent = `+ pestañas: ${rightKeys.slice(1).map(key => names()[key]).join(', ')}`; right.append(tabs); }
  document.getElementById('preview-caption').textContent = `Izquierda: ${Math.round((100 - width) * 100) / 100}% del ancho · Derecha: ${Math.round(width * 100) / 100}% del ancho y ${Math.round(height * 10) / 10}% del alto`;
}
form.addEventListener('input', event => { if (loaded && event.target?.name !== 'shortcut' && event.target?.name !== 'notes' && !event.target?.dataset?.noDirty) markDirty(); });
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
  widthRange.value = fields.width.value; heightRange.value = fields.height.value; sides = { ...value.sides }; extras = (value.extraPages || []).map(page => ({ ...page })); renderSides();
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
      sides: { ...sides }, ...(extras.length ? { extraPages: extras.map(page => ({ ...page })) } : {}), pages: Object.fromEntries(['portal','interpreter','tracker','dictionary'].map(key => [key, fields[key].value])) });
    message.textContent = 'Guardado en este perfil. Tus llamadas, notas y preferencias de otras PCs se conservan. Podés organizar ahora o en la siguiente apertura del perfil.';
    markDirty(false);
  } catch (error) { message.textContent = error.message || 'No se pudo guardar. Se conserva la configuración anterior.'; }
  finally { save.disabled = false; }
});
document.getElementById('setup-arrange').addEventListener('click', () => {
  document.getElementById('workspace-card').hidden = false;
  document.getElementById('workspace-retry').click();
});
document.getElementById('setup-reset').addEventListener('click', () => {
  if (!loaded) return;
  sides = { ...defaultWorkspaceSides }; extras = [];
  for (const key of workspaceOrder) fields[key].value = workspacePages[key];
  fields.width.value = 31.25; fields.height.value = 100; widthRange.value = 31.25; heightRange.value = 100;
  markDirty(); renderSides();
  message.textContent = 'Volvió la distribución de siempre. Toca Guardar para aplicarla.';
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


// + Agregar otra página
const addForm = document.getElementById('add-page-form'), addStatus = document.getElementById('add-status');
const addName = document.getElementById('add-name'), addUrl = document.getElementById('add-url');
function closeAdd() { addForm.hidden = true; addName.value = ''; addUrl.value = ''; addStatus.textContent = ''; }
document.getElementById('add-page-open').addEventListener('click', () => { addForm.hidden = false; addStatus.textContent = ''; addName.focus(); });
document.getElementById('add-cancel').addEventListener('click', closeAdd);
for (const [button, name] of [[document.getElementById('add-left'), 'left'], [document.getElementById('add-right'), 'right']]) {
  button.addEventListener('click', () => {
    if (!loaded) return;
    let page;
    try {
      const id = ['extra1', 'extra2', 'extra3', 'extra4'].find(item => !extras.some(entry => entry.id === item));
      if (!id) throw Error(`Podés agregar hasta ${maxExtraPages} páginas.`);
      page = validateExtraPages([...extras, { id, name: addName.value, url: addUrl.value.trim() }]).at(-1);
      if (name === 'left' && side('left').length >= 2) throw Error('A la izquierda caben 2 páginas como mucho. Ponela a la derecha o pasá otra a la derecha primero.');
    } catch (error) { addStatus.textContent = error.message; return; }
    addStatus.textContent = 'Chrome te va a preguntar si permitís el sitio. Tocá «Permitir».';
    // El pedido de permiso tiene que salir directo del clic.
    chrome.permissions.request({ origins: [`${new URL(page.url).origin}/*`] }).then(granted => {
      if (!granted) { addStatus.textContent = 'Sin el permiso de Chrome no se puede agregar la página. No se agregó nada.'; return; }
      extras = [...extras, page]; sides[page.id] = name; markDirty(); renderSides(); closeAdd();
      document.getElementById('setup-status').textContent = `«${page.name}» agregada. Toca Guardar para aplicarla.`;
    }).catch(() => { addStatus.textContent = 'No se pudo pedir el permiso. No se agregó nada.'; });
  });
}
