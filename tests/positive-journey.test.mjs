import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync('app.html', 'utf8');
const js = readFileSync('js/positive-reinforcement.js', 'utf8');
const css = readFileSync('css/reinforcement.css', 'utf8');
const page = html.slice(html.indexOf('id="pagePositive"'), html.indexOf('<!-- /pagePositive -->'));

test('positive page has the remembered-note card and the journey panel keeps its controls', () => {
  assert.match(page, /id="positiveRememberCard"/);
  assert.ok(page.indexOf('positiveEvidenceCard') < page.indexOf('positiveRememberCard'));
  assert.ok(page.indexOf('positiveRememberCard') < page.indexOf('positiveHistoryPanel'));
  assert.match(page, /<h2>Tu recorrido<\/h2>/);
  for (const id of ['positiveHistoryList', 'positiveHistoryCount', 'positiveHistoryToggle']) assert.ok(page.includes(`id="${id}"`), id);
});

test('remembered note comes only from earlier days and stays the same during a day', () => {
  const start = js.indexOf('function pickRememberedNote');
  const source = js.slice(start, js.indexOf('function renderRemembered'));
  assert.match(source, /daysBetween\(item\.dayKey, dayKey\) > 0/);
  assert.match(source, /sort\(/);
  assert.doesNotMatch(source, /Math\.random/);
  assert.match(js, /hidden = !note/);
});

test('journey groups by day with Hoy and Ayer headings and uses SVG dots', () => {
  const start = js.indexOf('function dayHeading');
  const source = js.slice(start, js.indexOf('export function renderPositiveReinforcement'));
  assert.match(source, /translateText\('Hoy'\)/);
  assert.match(source, /translateText\('Ayer'\)/);
  assert.match(source, /positive-day-heading/);
  assert.match(source, /positive-step-dot/);
  assert.doesNotMatch(source, /[\u2728\u{1F6E1}\u{1F4A1}]/u);
  assert.doesNotMatch(source, /positive-history-row/);
  assert.match(source, /Ver menos/);
});

test('journey styles are fenced, use theme variables and the old row styles are gone', () => {
  const block = css.slice(css.indexOf('/* historial-positivo-recorrido */'), css.indexOf('/* fin historial-positivo-recorrido */'));
  assert.ok(block.length > 300);
  assert.match(block, /var\(--line\)/);
  assert.doesNotMatch(block, /#[0-9a-fA-F]{3,8}\b/);
  assert.doesNotMatch(css, /positive-history-row/);
});
