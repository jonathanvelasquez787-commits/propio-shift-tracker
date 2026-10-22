import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';

test('Windows installer previews a new PC with its own profile and notes, rejects invalid sizes without mutations', { skip: process.platform !== 'win32' }, () => {
  const work = path.resolve('work'); mkdirSync(work, { recursive: true });
  const dir = mkdtempSync(path.join(work, 'installer-test-'));
  assert.ok(dir.startsWith(work + path.sep));
  const quote = value => "'" + value.replaceAll("'", "''") + "'";
  const powershell = command => execFileSync('powershell.exe', ['-NoProfile','-NonInteractive','-Command', command], { encoding: 'utf8', stdio: ['ignore','pipe','pipe'] });
  try {
    const chrome = path.join(dir, 'chrome.exe'), shortcut = path.join(dir, 'Trabajo.lnk'), notes = path.join(dir, 'Notas.txt'), config = path.join(dir, 'setup.json'), install = path.join(dir, 'installed');
    writeFileSync(chrome, 'synthetic executable placeholder'); writeFileSync(notes, 'Synthetic notes remain unchanged.');
    powershell(`$link=(New-Object -ComObject WScript.Shell).CreateShortcut(${quote(shortcut)});$link.TargetPath=${quote(chrome)};$link.Arguments='--profile-directory="Profile 1" --restore-last-session';$link.Save()`);
    const previous = readFileSync(shortcut), settings = { version: 1, ShortcutPath: shortcut, NotesFile: notes, RightPaneHeightRatio: .61, RightPaneWidthRatio: .4 };
    writeFileSync(config, JSON.stringify(settings));
    const command = `& ${quote(path.resolve('scripts/install-desktop-workspace.ps1'))} -ConfigurationPath ${quote(config)} -InstallDirectory ${quote(install)} -PlanOnly`;
    const preview = JSON.parse(powershell(command));
    assert.equal(preview.Mode, 'Preview'); assert.equal(preview.NotesContentRead, false);
    assert.equal(preview.ChromeArgumentsPreserved, '--profile-directory="Profile 1" --restore-last-session');
    assert.equal(preview.RightPaneWidthRatio, .4); assert.equal(existsSync(install), false);
    assert.deepEqual(readFileSync(shortcut), previous); assert.equal(readFileSync(notes, 'utf8'), 'Synthetic notes remain unchanged.');
    writeFileSync(config, JSON.stringify({ ...settings, RightPaneHeightRatio: 1.2 }));
    assert.throws(() => powershell(command));
    assert.deepEqual(readFileSync(shortcut), previous); assert.equal(existsSync(install), false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
