import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const bloque = css.slice(css.indexOf('/* ajustes pestanas */'), css.indexOf('/* fin ajustes pestanas */'));
const modal = html.slice(html.indexOf('id="goalsModal"'), html.indexOf('id="positiveReflectionModal"'));

test('ajustes pestanas: hay cuatro pestanas y cuatro paneles con sus campos', () => {
  for (const t of ['general', 'dinero', 'avisos', 'datos']) {
    assert.match(modal, new RegExp(`data-set-tab="${t}"`));
    assert.match(modal, new RegExp(`data-set-panel="${t}"`));
  }
  const panel = (name, next) => modal.slice(modal.indexOf(`id="setPanel${name}"`), next ? modal.indexOf(`id="setPanel${next}"`) : modal.indexOf('/setPanelDatos'));
  assert.match(panel('General', 'Dinero'), /id="settingsLanguage"[\s\S]*id="userNameInput"[\s\S]*id="saveAccountProfileBtn"/);
  assert.match(panel('Dinero', 'Avisos'), /id="productiveGoalInput"[\s\S]*id="rateInput"[\s\S]*id="cycleAnchorInput"[\s\S]*id="cycleGoalSettingsBtn"/);
  assert.match(panel('Datos'), /id="exportBtn"[\s\S]*id="snapshotRecoveryBtn"[\s\S]*id="accountingExportCsvBtn"/);
});

test('ajustes pestanas: el boton Listo queda fuera de los paneles y los textos largos van en Como funciona', () => {
  assert.ok(modal.indexOf('data-close-modal="goalsModal" type="button"><svg') > modal.indexOf('/setPanelDatos'));
  assert.match(modal, /id="settingsMoneyHelp"/);
  assert.match(modal, /id="settingsBackupHelp"/);
});

test('ajustes pestanas: el CSS usa variables del tema y no colores fijos', () => {
  assert.ok(bloque.length > 300, 'falta el bloque ajustes pestanas');
  assert.match(bloque, /\.set-panel:not\(\.active\) \{ display: none/);
  assert.doesNotMatch(bloque, /#[0-9a-fA-F]{3,8}\b/);
});
