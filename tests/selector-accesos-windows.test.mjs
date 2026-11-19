import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync('extension/propio-bridge/workspace.html', 'utf8');
const script = readFileSync('extension/propio-bridge/workspace-setup.js', 'utf8');
const installer = readFileSync('scripts/install-desktop-workspace.ps1', 'utf8');

test('los cuadros de ruta de Windows ya no mencionan el explorador', () => {
  assert.match(page, /Ruta del acceso de Chrome de esta PC/);
  assert.match(page, /Ruta del archivo de notas de esta PC/);
  assert.doesNotMatch(page, /explorador/);
});

test('preparar la configuracion acepta rutas vacias y no las escribe en el archivo', () => {
  assert.match(script, /\(shortcut && !\//);
  assert.match(script, /\.\.\.\(shortcut \? \{ ShortcutPath: shortcut \} : \{\}\)/);
  assert.match(script, /\.\.\.\(notes \? \{ NotesFile: notes \} : \{\}\)/);
});

test('el instalador ya no abre el explorador de Windows', () => {
  assert.doesNotMatch(installer, /OpenFileDialog|Select-WorkspaceFile/);
  assert.match(installer, /Escribí la ruta del acceso de Chrome/);
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

test('las rutas de Jonathan aparecen por defecto y solo se reemplazan si ya hay rutas guardadas', () => {
  assert.match(script, /const DEFAULT_PATHS = \{ shortcut: 'C:\\\\Users\\\\Jonathan\\\\Desktop\\\\Jonathan - Chrome\.lnk', notes: 'C:\\\\Users\\\\Jonathan\\\\Desktop\\\\Notas\.txt' \}/);
  assert.match(script, /\[PATHS_KEY\] \|\| DEFAULT_PATHS/);
});
