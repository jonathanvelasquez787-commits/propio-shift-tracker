import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const main = readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');

test('contraer capsula: una sola capsula con dos mitades y el interruptor de siempre conserva su id', () => {
  assert.match(html, /id="blocksCapsule"/);
  assert.match(html, /id="collapseAllBlocksBtn"/);
  assert.match(html, /id="collapseAllBlocksLabel">Contraer bloques</);
  assert.match(html, /id="collapseCompletedBlocksBtn"[^>]*aria-pressed="false"[^>]*aria-label="Contraer bloques al terminar"/);
  assert.match(html, /<span>Al terminar<\/span>/);
  assert.doesNotMatch(html, /sblk-collapse-row/);
  const capsule = html.indexOf('id="blocksCapsule"');
  assert.ok(capsule > html.indexOf('id="blocksView"') && capsule < html.indexOf('id="scheduleList"'), 'nace arriba de la lista (celular)');
});

test('contraer capsula: estilos propios sin colores fijos, 25 px de alto y lugar en la linea de Freelancer', () => {
  const a = css.indexOf('/* contraer capsula */');
  const b = css.indexOf('/* fin contraer capsula */');
  assert.ok(a >= 0 && b > a);
  const block = css.slice(a, b);
  assert.doesNotMatch(block, /#[0-9a-fA-F]{3,8}\b/);
  assert.match(block, /\.cb-pill \{[^}]*height: 25px/);
  assert.match(block, /\.cb-seg \+ \.cb-seg \{ border-left: 1px solid var\(--line\)/);
  assert.match(block, /#scheduleAccordion \.sched-quick-row \.cb-pill \{ margin-left: 14px/);
  assert.match(block, /is-calls-view \.sched-quick-row \.cb-pill \{ display: none/);
});

test('contraer capsula: el clic dentro del summary no pliega el acordeon y se coloca segun el ancho', () => {
  assert.match(main, /blocksCapsule\.addEventListener\('click', \(e\) => e\.preventDefault\(\)\)/);
  assert.match(main, /collapseAllBlocksBtn\.addEventListener\('click', toggleCollapseAllBlocks\)/);
  assert.match(main, /function placeBlocksCapsule\(\)/);
  assert.match(main, /BLOCKS_CAPSULE_WIDE_QUERY = '\(min-width: 761px\)'/);
});

function loadCapsule() {
  const start = main.indexOf('let blocksManualCollapse = null;');
  const end = main.indexOf('function renderSchedule() {');
  assert.ok(start > 0 && end > start);
  const label = { textContent: '' };
  const classes = new Set();
  const btn = { classList: { toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)) } };
  const calls = [];
  const sandbox = {
    document: { getElementById: id => (id === 'collapseAllBlocksBtn' ? btn : id === 'collapseAllBlocksLabel' ? label : null) },
    translateText: t => t,
    renderSchedule: () => calls.push('render'),
  };
  vm.createContext(sandbox);
  vm.runInContext(main.slice(start, end) + '\nthis.api = { syncCollapseAllBlocksUI, toggleCollapseAllBlocks, get manual() { return blocksManualCollapse; }, set all(v) { blocksAllCollapsed = v; } };', sandbox);
  return { api: sandbox.api, label, classes, calls };
}

test('contraer capsula: el boton contrae todo y, con todo contraido, pasa a Expandir bloques', () => {
  const { api, label, classes, calls } = loadCapsule();
  api.toggleCollapseAllBlocks();
  assert.equal(api.manual, 'collapsed');
  api.all = true;
  api.syncCollapseAllBlocksUI();
  assert.equal(label.textContent, 'Expandir bloques');
  assert.ok(classes.has('is-expand'));
  api.toggleCollapseAllBlocks();
  assert.equal(api.manual, 'expanded');
  api.all = false;
  api.syncCollapseAllBlocksUI();
  assert.equal(label.textContent, 'Contraer bloques');
  assert.ok(!classes.has('is-expand'));
  assert.equal(calls.length, 2, 'cada toque vuelve a dibujar los bloques');
});

test('contraer capsula: el interruptor Al terminar sigue guardando el ajuste y suelta el modo manual', () => {
  const at = main.indexOf('function toggleCollapseCompletedBlocks()');
  const piece = main.slice(at, at + 400);
  assert.match(piece, /settings\.collapseCompletedBlocks = !settings\.collapseCompletedBlocks/);
  assert.match(piece, /blocksManualCollapse = null/);
  assert.match(piece, /saveSettingsOnly\(\)/);
});
