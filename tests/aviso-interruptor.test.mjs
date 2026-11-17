import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeReinforcementSettings } from '../js/positive-reinforcement.js';
import { checkReinforcementInactivity } from '../js/reinforcement.js';

const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const pr = readFileSync(new URL('../js/positive-reinforcement.js', import.meta.url), 'utf8');
const rf = readFileSync(new URL('../js/reinforcement.js', import.meta.url), 'utf8');

test('aviso interruptor: viene encendido por defecto y se puede apagar', () => {
  assert.equal(normalizeReinforcementSettings({}).inactivityEnabled, true);
  assert.equal(normalizeReinforcementSettings(null).inactivityEnabled, true);
  assert.equal(normalizeReinforcementSettings({ inactivityEnabled: false }).inactivityEnabled, false);
  assert.equal(normalizeReinforcementSettings({ inactivityEnabled: true }).inactivityEnabled, true);
});

test('aviso interruptor: apagado no avisa aunque pase el tiempo', () => {
  const at = rf.indexOf('export function checkReinforcementInactivity');
  const piece = rf.slice(at, at + 200);
  assert.match(piece, /inactivityEnabled === false\) return false/);
  assert.equal(typeof checkReinforcementInactivity, 'function');
});

test('aviso interruptor: vive dentro del summary, antes de la flecha, con nombre accesible', () => {
  const at = html.indexOf('<details class="polished-setting" id="positiveSettingsAccordion"');
  assert.ok(at > 0);
  const end = html.indexOf('</summary>', at);
  const summary = html.slice(at, end);
  assert.match(summary, /id="positiveInactivityEnabledInput" type="checkbox" aria-label="Aviso sin llamadas" checked/);
  assert.ok(summary.indexOf('inactivity-switch-wrap') < summary.indexOf('game-settings-accordion-chevron'));
  assert.match(summary, /inactivity-switch-text/);
});

test('aviso interruptor: tocarlo no abre ni cierra el acordeon y se guarda al instante', () => {
  assert.match(pr, /getElementById\('positiveInactivityEnabledWrap'\);\s*if \(typeof inactivityWrap\?\.addEventListener === 'function'\) inactivityWrap\.addEventListener\('click', \(event\) => event\.stopPropagation\(\)\)/);
  assert.match(pr, /positiveInactivityEnabledInput'\)\?\.addEventListener\('change'/);
  assert.match(pr, /if \(saveSettingsOnly\(\) === false\) \{\s*settings\.reinforcement\.inactivityEnabled = previous;/);
  assert.match(pr, /classList\?\.toggle\?\.\('inactivity-off', !inactivityOn\)/);
});

test('aviso interruptor: el CSS atenua lo de abajo, oculta la palabra en celular y no usa colores fijos', () => {
  const a = css.indexOf('/* aviso interruptor */');
  const b = css.indexOf('/* fin aviso interruptor */');
  assert.ok(a >= 0 && b > a);
  const block = css.slice(a, b);
  assert.match(block, /\.inactivity-off \.game-settings-accordion-body \{ opacity: \.45; pointer-events: none; \}/);
  assert.match(block, /@media \(max-width: 760px\)/);
  assert.match(block, /\.game-settings-accordion-copy \{ flex: 1 1 0; min-width: 0; \}/);
  assert.doesNotMatch(block, /#[0-9a-fA-F]{3,8}\b/);
});
