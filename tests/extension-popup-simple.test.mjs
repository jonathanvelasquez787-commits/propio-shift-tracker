import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const html = read('extension/propio-bridge/popup.html');
const js = read('extension/propio-bridge/popup.js');
const visible = html.slice(0, html.indexOf('id="moreOptions"'));
const more = html.slice(html.indexOf('id="moreOptions"'), html.indexOf('<script src="popup.js">'));

test('popup de la extensión: estado, registro y disponibilidad a la vista; el resto en "Más opciones"', () => {
  for (const id of ['status', 'connectionBadge', 'resumeAvailability', 'automatic', 'availabilityPaused', 'prepareFirst',
    'resumeBreak', 'resumeLunch', 'spacingEnabled', 'spacingSummary', 'availabilityStatus', 'open']) {
    assert.ok(visible.includes(`id="${id}"`), `#${id} está a la vista`);
  }
  for (const id of ['devicePassive', 'resumeMode', 'spacingMinutes', 'originalLayout', 'portalDark', 'automationPanel', 'signals', 'technicalDetails', 'reviewed']) {
    assert.ok(more.includes(`id="${id}"`), `#${id} queda dentro de "Más opciones"`);
    assert.ok(!visible.includes(`id="${id}"`), `#${id} ya no está a la vista`);
  }
  assert.doesNotMatch(html, /<details class="more-options" id="moreOptions" open/);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids.filter((id, i) => ids.indexOf(id) !== i), [], 'sin ids repetidos');
  assert.match(js, /getElementById\('resumeAvailability'\)\.addEventListener\('click', \(\) => act\(\{ kind: 'pause-availability', paused: false \}\)\)/);
  assert.match(js, /ACW \$\{spacing\.minutes\} min/);
});
