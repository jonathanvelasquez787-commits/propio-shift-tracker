import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const game = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
const battle = readFileSync(new URL('../js/game-battle.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/game-battle.css', import.meta.url), 'utf8');

test('Reto de hoy compacto: nivel en el encabezado y sin bloques repetidos', () => {
  assert.match(game, /game-level-chip">NV /, 'el nivel va como chip en el encabezado');
  const collection = game.slice(game.indexOf('function compactCollectionMarkup'), game.indexOf('function compactVictoryMarkup'));
  assert.doesNotMatch(collection, /Tu colección|Monstruos vencidos|Ver todos mis Logros/, 'la colección ya no repite bloques');
  assert.match(battle, /data-game-nav>Ver mis Logros →/, 'queda un solo enlace a Logros');
  assert.match(collection, /equip-accessory/, 'el visor se sigue pudiendo equipar');
  assert.doesNotMatch(battle, /Cada llamada te acerca al cofre|ARMA EQUIPADA|Duelo disponible durante el descanso/, 'sin textos largos en la tarjeta');
  assert.match(battle, /data-battle-weapon-select/, 'el selector de arma sigue');
  assert.match(battle, /data-battle-action="duel"/, 'el duelo sigue');
  assert.doesNotMatch(game, /convertedGoal/, 'la conversión a lempiras no se repite tres veces');
  assert.match(css, /\.game-battle-feed:empty \{ display: none; \}/, 'sin frase vacía');
});

test('Logros desplegado: visor y arma lado a lado, modos unidos y un solo pie', () => {
  const panel = battle.slice(battle.indexOf('id="gameBattleCollection"'), battle.indexOf('class="game-battle-duel-hud"'));
  assert.match(panel, /game-battle-slots/, 'visor y arma van juntos');
  assert.ok(panel.indexOf('data-battle-collection-summary') < panel.indexOf('data-battle-weapon-select'), 'visor primero, arma después');
  assert.ok(panel.indexOf('game-battle-modes') < panel.indexOf('game-battle-collection-foot'), 'modos y luego el pie');
  assert.ok(panel.indexOf('data-battle-work-note') > panel.indexOf('game-battle-collection-foot'), 'la nota y el enlace comparten el pie');
  const collection = game.slice(game.indexOf('function compactCollectionMarkup'), game.indexOf('function compactVictoryMarkup'));
  assert.match(collection, /\$\{available \? ui`<button/, 'Equipar solo aparece cuando se puede usar');
  assert.match(css, /\.game-battle-collection \.game-battle-modes \[aria-pressed="true"\]/, 'modo activo con relleno');
});
