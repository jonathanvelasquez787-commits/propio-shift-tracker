import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const main = readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');

function cssBlock() {
  const start = css.indexOf('/* tarjeta de bloques en inicio */');
  const end = css.indexOf('/* fin tarjeta de bloques en inicio */');
  assert.ok(start > 0 && end > start, 'faltan los marcadores del bloque CSS');
  return css.slice(start, end);
}

test('tarjeta de bloques: vive dentro de la barra de acciones y ya no hay tarjetas en Bloques del dia', () => {
  const bar = html.indexOf('class="hero-shift-actions"');
  const card = html.indexOf('id="heroBlockCard"');
  const discard = html.indexOf('data-slot="discard"');
  assert.ok(bar > 0 && card > discard && discard > bar, 'la tarjeta debe estar dentro de la barra de acciones');
  assert.match(html, /id="heroBlockCard"[^>]*role="button"[^>]*tabindex="0"[^>]*hidden/);
  assert.doesNotMatch(html, /id="blockSummaryStrip"/);
});

test('tarjeta de bloques: estilos en un bloque propio, sin colores fijos y con los anchos acordados', () => {
  const b = cssBlock();
  assert.doesNotMatch(b, /#[0-9a-fA-F]{3,8}\b/);
  assert.match(b, /\.hbc-slide\.is-active/);
  assert.match(b, /\.hbc-slide\.is-above/);
  assert.match(b, /flex: 0 0 300px/);
  assert.match(b, /min-width: 480px\) and \(max-width: 760px\)/);
  assert.match(b, /\.hbc\.is-peek \.hbc-peek \{ display: block/);
  assert.match(b, /\.hbc:hover \.hbc-peek \{ display: block/);
  assert.match(b, /hero-shift-actions\[data-live-type\] > \.hbc \{ display: none/);
  assert.match(b, /prefers-reduced-motion/);
});

function loadCard() {
  const start = main.indexOf('let heroBlockCardIdx = 0;');
  const end = main.indexOf('function renderBlockSummaryStrip(cards)');
  assert.ok(start > 0 && end > start);
  const makeClassList = () => {
    const set = new Set();
    return { add: (...c) => c.forEach(x => set.add(x)), remove: (...c) => c.forEach(x => set.delete(x)), contains: c => set.has(c), toggle: (c, on) => { if (on) set.add(c); else set.delete(c); }, set };
  };
  const slides = [0, 1, 2].map(() => ({ classList: makeClassList(), offsetWidth: 1 }));
  const host = { hidden: false, classList: makeClassList(), offsetWidth: 1, querySelectorAll: () => slides };
  const sandbox = {
    state: { activePause: null },
    document: { getElementById: id => (id === 'heroBlockCard' ? host : null) },
    setTimeout: () => 0, clearTimeout: () => {},
    ui: (s, ...v) => s.reduce((a, x, i) => a + x + (v[i] ?? ''), ''), escapeHtml: x => String(x),
  };
  vm.createContext(sandbox);
  vm.runInContext(main.slice(start, end) + '\nthis.api = { heroBlockCardLiveIndex, heroBlockCardGo, advanceHeroBlockCard, get idx() { return heroBlockCardIdx; } };', sandbox);
  return { api: sandbox.api, slides, host, state: sandbox.state };
}

const names = s => s.map(x => (x.classList.contains('is-active') ? 'A' : x.classList.contains('is-above') ? '^' : 'v')).join('');

test('tarjeta de bloques: al tocarla pasa a la siguiente, da la vuelta y vuelve a la actual', () => {
  const { api, slides, host } = loadCard();
  api.heroBlockCardGo(host, 0, false);
  assert.equal(names(slides), 'Avv');
  api.advanceHeroBlockCard();
  assert.equal(names(slides), '^Av');
  api.advanceHeroBlockCard();
  assert.equal(names(slides), '^^A');
  api.advanceHeroBlockCard();
  assert.equal(names(slides), 'A^^', 'despues de Lunch vuelve a Shift');
  assert.equal(api.idx, 0);
  assert.ok(host.classList.contains('is-peek'), 'al tocar se ve el horario unos segundos');
});

test('tarjeta de bloques: la actual es Shift salvo que haya un Break o Lunch en curso', () => {
  const { api, state } = loadCard();
  const cards = [{ kind: 'shift' }, { kind: 'break' }, { kind: 'lunch' }];
  assert.equal(api.heroBlockCardLiveIndex(cards), 0);
  state.activePause = { type: 'break' };
  assert.equal(api.heroBlockCardLiveIndex(cards), 1);
  state.activePause = { type: 'lunch' };
  assert.equal(api.heroBlockCardLiveIndex(cards), 2);
});

test('en celular, con un break, lunch o llamada en curso la pildora toma el color y el cronometro del boton', () => {
  assert.match(html, /<div class="hbc" id="heroBlockCard"[^>]*>\s*<div class="hbc-stack"><\/div><span class="hbc-live" id="heroBlockCardLive" aria-hidden="true"><\/span><\/div>/);
  assert.match(main, /getElementById\('heroBlockCardLive'\)/);
  assert.match(main, /liveBtnId = info \? \(info\.type === 'break' \? 'breakControlBtn' : info\.type === 'lunch' \? 'lunchControlBtn' : 'callControlBtn'\)/);
  const s = css.indexOf('/* pildora activa celular */');
  const e = css.indexOf('/* fin pildora activa celular */');
  assert.ok(s > 0 && e > s);
  const b = css.slice(s, e);
  assert.match(b, /@media \(max-width: 760px\)/);
  assert.match(b, /\.hbc-live \{ display: none; \}/);
  assert.match(b, /\[data-live-type="break"\] \{ --hbc-live-fill: var\(--break-active\); \}/);
  assert.match(b, /\[data-live-type="lunch"\] \{ --hbc-live-fill: var\(--lunch-active\); \}/);
  assert.match(b, /--hbc-live-fill: var\(--danger-red\)/);
  assert.match(b, /flex: 0 0 40px !important/);
  assert.match(b, /\.hbc-slide \{ border-color: var\(--hbc-live-fill\) !important; background: var\(--hbc-live-fill\) !important; \}/);
  assert.doesNotMatch(b, /\[data-slot="(paste|add)"\]/);
  assert.doesNotMatch(b, /#[0-9a-fA-F]{3,8}\b/);
});

test('pildora en curso: con un break, lunch o llamada en curso no sale el horario de otro bloque y la barra va blanca', () => {
  const start = css.indexOf('/* pildora en curso sin horario ajeno */');
  const end = css.indexOf('/* fin pildora en curso sin horario ajeno */');
  assert.ok(start > 0 && end > start, 'faltan los marcadores del bloque CSS');
  const block = css.slice(start, end);
  assert.match(block, /\[data-live-type="call"\][^{]*> \.hbc \.hbc-peek \{ display: none !important; \}/);
  assert.match(block, /\.hbc:is\(\.is-peek,:hover\) \.hbc-prog \{ display: flex !important; \}/);
  assert.match(block, /\.hbc-track i \{ background: white !important; \}/);
});

test('pildora junto al boton: a la par de su boton, con nombre, cronometro, horario y barra, del mismo alto que los botones', () => {
  const start = css.indexOf('/* pildora junto al boton */');
  const end = css.indexOf('/* fin pildora junto al boton */');
  assert.ok(start > 0 && end > start, 'faltan los marcadores del bloque CSS');
  const block = css.slice(start, end);
  assert.match(block, /\[data-live-type="break"\] > \.hbc \{ order: 21;/);
  assert.match(block, /\[data-live-type="lunch"\] > \.hbc \{ order: 31;/);
  assert.match(block, /\.is-swapped\[data-live-type="break"\] > \.hbc \{ order: 61; \}/);
  assert.match(block, /\.is-swapped\[data-live-type="lunch"\] > \.hbc \{ order: 71; \}/);
  assert.match(block, /width: 112px;[^}]*height: 34px;/);
  assert.doesNotMatch(block, /#[0-9a-fA-F]{3,8}\b/);
  assert.match(main, /hbc-live-r1/);
  assert.match(main, /hbc-live-r2/);
  assert.match(main, /hbc-live-bar/);
});

test('capsula larga: boton en curso, pildora y Descartar van pegados, rellenos de color, y todos los botones muestran borde blanco al pasar el mouse', () => {
  const start = css.indexOf('/* capsula larga */');
  const end = css.indexOf('/* fin capsula larga */');
  assert.ok(start > 0 && end > start, 'faltan los marcadores del bloque CSS');
  const block = css.slice(start, end);
  assert.match(block, /\.action-slot\[data-slot="discard"\] \{ order: 22 !important;/);
  assert.match(block, /\.action-slot\[data-slot="discard"\] \{ order: 32 !important;/);
  assert.match(block, /\.action-slot\[data-slot="discard"\] \{ order: 52 !important;/);
  assert.match(block, /\.is-swapped\[data-live-type="break"\] \.action-slot\[data-slot="discard"\] \{ order: 62 !important; \}/);
  assert.match(block, /\.is-swapped:is\(\[data-live-type="call"\],\[data-live-type="pending"\]\) \.action-slot\[data-slot="discard"\] \{ order: 12 !important; \}/);
  assert.match(block, /margin-left: calc\(-1 \* var\(--cap-gap\)\) !important/);
  assert.match(block, /--cap-gap: 6px/);
  assert.match(block, /--cap-gap: 12px/);
  assert.match(block, /\.action-btn:hover:not\(:disabled\) \{ box-shadow: 0 0 0 2px var\(--cap-ring\) !important; \}/);
  assert.match(block, /:has\(> \.action-slot\[data-slot="break"\] > \.action-btn:hover, > \.hbc:hover, > \.action-slot\[data-slot="discard"\] > \.action-btn:hover\)/);
  assert.match(block, /@media \(min-width: 761px\) \{[\s\S]*\.hbc-slide \{ border-color: var\(--hbc-live-fill\) !important; background: var\(--hbc-live-fill\) !important; \}/);
  assert.match(block, /height: 62px/);
  assert.doesNotMatch(block, /#[0-9a-fA-F]{3,8}\b/);
});

test('sin pildora en reposo: sin Break, Lunch ni Llamada en curso la pildora de bloques no se muestra y la barra no deja hueco', () => {
  const start = css.indexOf('/* sin pildora en reposo */');
  const end = css.indexOf('/* fin sin pildora en reposo */');
  assert.ok(start > 0 && end > start, 'faltan los marcadores del bloque CSS');
  const block = css.slice(start, end);
  assert.match(block, /\.hero-shift-actions:not\(\[data-live-type\]\) > \.hbc \{ display: none !important; \}/);
  assert.match(block, /:not\(\[data-live-type\]\) \{ padding-bottom: 0; \}/);
});

test('capsula sin repetido: en compu el boton en curso muestra solo el icono y tocar la pildora en curso hace lo mismo que tocar su boton', () => {
  const start = css.indexOf('/* capsula sin repetido */');
  const end = css.indexOf('/* fin capsula sin repetido */');
  assert.ok(start > 0 && end > start, 'faltan los marcadores del bloque CSS');
  const block = css.slice(start, end);
  assert.match(block, /min-width: 761px/);
  assert.match(block, /width: 62px !important/);
  assert.match(block, /> \.action-short \{ display: none !important; \}/);
  assert.match(block, /\.action-sub \{ display: none !important; \}/);
  const adv = main.slice(main.indexOf('function advanceHeroBlockCard'), main.indexOf('function wireHeroBlockCard'));
  assert.match(adv, /dataset\.liveType/);
  assert.match(adv, /liveBtn\.click\(\)/);
  assert.match(adv, /else \{\s*heroBlockCardGo/);
});

test('pildora icono blanco: con un bloque en curso el icono y los puntitos de la pildora van blancos', () => {
  const start = css.indexOf('/* pildora icono blanco */');
  const end = css.indexOf('/* fin pildora icono blanco */');
  assert.ok(start > 0 && end > start, 'faltan los marcadores del bloque CSS');
  const block = css.slice(start, end);
  assert.match(block, /\.hbc-ic \.ic-svg \{ color: white !important; stroke: white !important; \}/);
  assert.match(block, /\.hbc-dots i \{ background: rgba\(255, 255, 255, \.35\) !important; \}/);
  assert.match(block, /\.hbc-dots i\.on \{ background: white !important; \}/);
});

test('capsula un solo boton: tocar la pildora en curso no dispara un pulso aparte en el boton', () => {
  const start = main.indexOf('function wireActionButtonPress');
  const block = main.slice(start, start + 1500);
  assert.match(block, /closest\('#heroBlockCard'\)/);
  assert.match(block, /dataset\.liveType/);
  assert.doesNotMatch(block, /playActionPressAnimation\(liveBtn\)/);
});
