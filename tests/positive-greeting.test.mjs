import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync('app.html', 'utf8');
const js = readFileSync('js/positive-reinforcement.js', 'utf8');
const css = readFileSync('css/reinforcement.css', 'utf8');

function evidenceSource() {
  const start = js.indexOf('const positiveSvg');
  return js.slice(start, js.indexOf('let historyExpanded', start));
}

test('positive page greeting card lives inside the page and has its own class', () => {
  const page = html.slice(html.indexOf('id="pagePositive"'), html.indexOf('<!-- /pagePositive -->'));
  assert.match(page, /<section class="positive-greeting"[^>]*id="positiveEvidenceCard"/);
  assert.doesNotMatch(page, /positive-evidence-card/);
});

test('positive greeting shows the name, three counters and the recovery strip', () => {
  const source = evidenceSource();
  assert.match(source, /Hoy diste todo/);
  assert.match(source, /settings\.userName/);
  for (const label of ['Cerraron bien', 'Cumplí aunque fue difícil', 'Me dejaron un aprendizaje']) assert.ok(source.includes(label), label);
  assert.match(source, /Hoy volviste a tomar otra llamada/);
  assert.match(source, /recoveries === 0 \? ''/);
});

test('positive greeting uses SVG icons instead of emoji and the old card text is gone', () => {
  const source = evidenceSource();
  assert.match(source, /<svg class="positive-icon"/);
  assert.doesNotMatch(source, /[\u2728\u{1F6E1}\u{1F4A1}]/u);
  assert.doesNotMatch(js, /PRUEBA POSITIVA DE HOY/);
});

test('positive greeting styles use theme variables and are fenced in their own block', () => {
  const block = css.slice(css.indexOf('/* historial-positivo-saludo */'), css.indexOf('/* fin historial-positivo-saludo */'));
  assert.ok(block.length > 200);
  assert.match(block, /var\(--panel-navy\)/);
  assert.match(block, /var\(--good\)/);
  assert.doesNotMatch(block, /#[0-9a-fA-F]{3,8}\b/);
  assert.doesNotMatch(css, /positive-evidence-card/);
});
