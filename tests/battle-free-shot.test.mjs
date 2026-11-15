import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const js = fs.readFileSync('js/game-battle.js', 'utf8');
const css = fs.readFileSync('css/game-battle.css', 'utf8');

test('Disparo de práctica: el botón existe en el pie de la batalla y se desactiva en llamada, duelo y jefe derrotado', () => {
  assert.match(js, /data-battle-action="free-shot" data-battle-free-shot/);
  assert.match(js, /freeShotButton\.disabled = mode === 'duel' \|\| work === 'call'/);
  assert.match(js, /view\.defeated \|\| autoPaused \|\| stun >= 100/);
});

test('Disparo de práctica: solo muestra efectos y no toca ganancias, XP ni récords', () => {
  const start = js.indexOf('function freeShot()');
  const end = js.indexOf('function setStun(');
  assert.ok(start > 0 && end > start, 'existe freeShot');
  const body = js.slice(start, end);
  assert.match(body, /emit\(\{ practice: true \}, weapon\)/);
  assert.doesNotMatch(body, /callbacks\./);
  assert.doesNotMatch(body, /queue\.push/);
});

test('Disparo de práctica: el medidor de aturdimiento y su animación respetan movimiento reducido', () => {
  const start = css.indexOf('/* disparo de practica */');
  const end = css.indexOf('/* fin disparo de practica */');
  assert.ok(start > 0 && end > start, 'el bloque CSS está marcado');
  const block = css.slice(start, end);
  assert.match(block, /\.game-battle-stun/);
  assert.match(block, /prefers-reduced-motion: reduce/);
});
