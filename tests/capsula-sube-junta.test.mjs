import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const a = css.indexOf('/* capsula sube junta */');
const b = css.indexOf('/* fin capsula sube junta */');
const block = css.slice(a, b);

test('capsula sube junta: boton y pildora suben 2 px juntos con Break, Lunch y Llamada y Descartar se queda quieto', () => {
  assert.ok(a >= 0 && b > a);
  for (const type of ['break', 'lunch', 'call']) {
    const rules = block.split('\n').filter((line) => line.includes(`data-live-type="${type}"`) && line.includes('translateY(-2px)') || (line.includes(`data-live-type="${type}"`) && line.includes('> .hbc') ));
    assert.ok(rules.length >= 1, type);
  }
  assert.equal((block.match(/translateY\(-2px\) !important/g) || []).length, 3);
  assert.match(block, /> \.hbc:hover/);
  assert.doesNotMatch(block, /data-slot="discard"/);
  assert.doesNotMatch(block, /#[0-9a-fA-F]{3,8}\b/);
});

test('capsula sube junta: la Llamada vive en otra caja, por eso su regla no usa el hijo directo', () => {
  assert.match(block, /:has\(\.action-slot\[data-slot="call"\] > \.action-btn:hover/);
  assert.match(block, /@media \(hover: hover\) and \(pointer: fine\)/);
});
