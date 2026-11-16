import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const main = fs.readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');

test('el menú lateral ya no sale fijo por defecto', () => {
  assert.match(main, /sidebarPinned: false,/);
  assert.doesNotMatch(main, /sidebarPinMigrated: true,/, 'el aviso de migración NO va en los valores por defecto, o los usuarios viejos se lo saltan');
  assert.match(main, /typeof settings\.sidebarPinned !== 'boolean'\) settings\.sidebarPinned = false;/);
  assert.doesNotMatch(main, /sidebarPinned: true/);
});

test('quien ya tenía el menú fijo lo pierde una sola vez y después puede volver a fijarlo', () => {
  assert.match(main, /if \(settings\.sidebarPinMigrated !== true\) \{ settings\.sidebarPinned = false; settings\.sidebarPinMigrated = true; \}/);
  assert.match(main, /function toggleSidebarPin\(\)[\s\S]*?settings\.sidebarPinned = pinned;\s+saveSettingsOnly\(\);/);
});
