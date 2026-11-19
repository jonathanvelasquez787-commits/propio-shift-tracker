import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync('extension/propio-bridge/workspace.html', 'utf8');
const script = readFileSync('extension/propio-bridge/workspace-setup.js', 'utf8');
const installer = readFileSync('scripts/install-desktop-workspace.ps1', 'utf8');

test('los cuadros de ruta de Windows son opcionales y avisan que el explorador se abre al instalar', () => {
  assert.match(page, /Ruta del acceso de Chrome de esta PC \(opcional\)/);
  assert.match(page, /Ruta del archivo de notas de esta PC \(opcional\)/);
  assert.match(page, /se abre el explorador de archivos para elegirla con clics/);
});

test('preparar la configuracion acepta rutas vacias y no las escribe en el archivo', () => {
  assert.match(script, /\(shortcut && !\//);
  assert.match(script, /\.\.\.\(shortcut \? \{ ShortcutPath: shortcut \} : \{\}\)/);
  assert.match(script, /\.\.\.\(notes \? \{ NotesFile: notes \} : \{\}\)/);
});

test('el instalador abre el explorador de Windows cuando falta una ruta', () => {
  assert.match(installer, /OpenFileDialog/);
  assert.match(installer, /if \(!\$ShortcutPath\) \{ \$ShortcutPath = Select-WorkspaceFile/);
  assert.match(installer, /if \(!\$NotesFile\) \{ \$NotesFile = Select-WorkspaceFile/);
  assert.ok(installer.indexOf('Select-WorkspaceFile') < installer.indexOf("throw 'Seleccioná el acceso de Chrome"));
});

test('las rutas de Windows se guardan en este perfil, se vuelven a mostrar y se aceptan con o sin comillas', () => {
  assert.match(script, /workspace-windows-paths/);
  assert.match(script, /chrome\.storage\.local\.set\(\{ \[PATHS_KEY\]/);
  assert.match(script, /fields\[key\]\.addEventListener\('change', savePaths\)/);
  assert.match(script, /fields\.shortcut\.value = savedPaths\.shortcut/);
  assert.match(script, /fields\.notes\.value = savedPaths\.notes/);
  assert.match(script, /const unquote = value => String\(value \|\| ''\)\.trim\(\)\.replace\(/);
  const unquote = value => String(value || '').trim().replace(/^["']+|["']+$/g, '').trim();
  assert.equal(unquote('"C:\\Users\\Jonathan\\Desktop\\Notas.txt"'), 'C:\\Users\\Jonathan\\Desktop\\Notas.txt');
  assert.equal(unquote('C:\\Users\\Jonathan\\Desktop\\Notas.txt'), 'C:\\Users\\Jonathan\\Desktop\\Notas.txt');
});
