import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/game.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');

test('Logros: la fila Misiones pone título y número arriba y el aviso de armaduras debajo, sin encimarse', () => {
  const start = css.indexOf('/* logros-misiones-fila */');
  assert.ok(start > 0, 'bloque marcado');
  const block = css.slice(start, css.indexOf('/* fin logros-misiones-fila */', start));
  assert.match(block, /\.game-missions-summary\s*\{[^}]*flex-wrap:\s*wrap/);
  assert.match(block, /\.game-missions-summary > strong\s*\{[^}]*margin-left:\s*0/);
  assert.match(block, /\.game-missions-summary::after\s*\{[^}]*margin-left:\s*auto/);
  assert.match(block, /\.game-missions-summary > small\s*\{[^}]*flex:\s*0 0 100%/);
});

test('Logros: la fila Misiones conserva su contenido (título, conteo y armaduras pendientes)', () => {
  const at = js.indexOf('<summary class="game-missions-summary">');
  assert.ok(at > 0);
  const line = js.slice(at, js.indexOf('</summary>', at));
  assert.ok(line.includes('<span>Misiones</span>') && line.includes('<strong>') && line.includes('<small>') && line.includes('armaduras pendientes'));
});
