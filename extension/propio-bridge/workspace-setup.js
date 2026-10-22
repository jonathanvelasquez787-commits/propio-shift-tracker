import { readWorkspaceSettings, saveWorkspaceSettings } from './workspace-settings.js';
const form = document.getElementById('workspace-setup'), message = document.getElementById('setup-status'), save = document.getElementById('setup-save');
const fields = Object.fromEntries([...form.elements].filter(input => input.name).map(input => [input.name, input]));
let loaded = false;
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
      pages: Object.fromEntries(['portal','interpreter','tracker','dictionary'].map(key => [key, fields[key].value])) });
    message.textContent = 'Guardado en este perfil. Tus llamadas, notas y preferencias de otras PCs se conservan. Podés organizar ahora o en la siguiente apertura del perfil.';
    document.getElementById('workspace-retry').hidden = false;
    document.getElementById('workspace-retry').textContent = 'Organizar ahora';
  } catch (error) { message.textContent = error.message || 'No se pudo guardar. Se conserva la configuración anterior.'; }
  finally { save.disabled = false; }
});
document.getElementById('setup-export').addEventListener('click', () => {
  const shortcut = fields.shortcut.value.trim(), notes = fields.notes.value.trim();
  if (!/^[a-z]:\\.+\.lnk$/i.test(shortcut) || !/^[a-z]:\\.+/i.test(notes)) {
    message.textContent = 'Elegí la ruta completa del acceso de Chrome (.lnk) y del archivo de notas de esta PC.'; return;
  }
  const height = Number(fields.height.value) / 100;
  if (!Number.isFinite(height) || height < .4 || height > .85) { message.textContent = 'Para reservar espacio a las notas, usá entre 40% y 85% de alto.'; return; }
  const settings = { version: 1, ShortcutPath: shortcut, NotesFile: notes, RightPaneHeightRatio: height, RightPaneWidthRatio: Number(fields.width.value) / 100 };
  const objectUrl = URL.createObjectURL(new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a'); anchor.href = objectUrl; anchor.download = 'propio-workspace-configuration.json';
  anchor.click(); setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  message.textContent = 'Configuración preparada para el instalador de Windows. El archivo contiene rutas, no el contenido de tus notas; todavía no se modificó ningún acceso.';
});
