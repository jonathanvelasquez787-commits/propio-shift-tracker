import { ui, translateText } from './i18n.js';

export const BATTLE_WEAPONS = Object.freeze([
  { id: 'pistol', name: 'Pistola', key: '1', hint: 'disparo simple', effect: 'bullet', pellets: 1, delay: 0, travel: .46 },
  { id: 'smg', name: 'Subfusil', key: '2', hint: 'ráfaga rápida', effect: 'bullet', pellets: 3, delay: .055, travel: .4 },
  { id: 'shotgun', name: 'Escopeta', key: '3', hint: 'abanico de perdigones', effect: 'pellet', pellets: 5, delay: 0, travel: .5 },
  { id: 'rocket', name: 'Lanzacohetes', key: '4', hint: 'cohete y explosión', effect: 'rocket', pellets: 1, delay: 0, travel: .65 },
  { id: 'railgun', name: 'Railgun', key: '5', hint: 'rayo de energía', effect: 'beam', pellets: 1, delay: 0, travel: .18 },
  { id: 'flame', name: 'Lanzallamas', key: '6', hint: 'chorro de fuego', effect: 'flame', pellets: 8, delay: .025, travel: .5 },
  { id: 'too-much', name: 'Too Much', key: '7', hint: 'cañón de doble núcleo', effect: 'heavy', pellets: 6, delay: .035, travel: .55 },
  { id: 'drone', name: 'Dron', key: '8', hint: 'apoyo desde el aire', effect: 'drone', pellets: 3, delay: .08, travel: .48 },
  { id: 'psr', name: 'PSR B0531+21', key: '9', hint: 'pulso violeta', effect: 'pulse', pellets: 1, delay: 0, travel: .6 },
  { id: 'wand', name: 'Varita mágica', key: '0', hint: 'estela de estrellas', effect: 'magic', pellets: 3, delay: .075, travel: .6 },
].map(Object.freeze));
const GRENADE = Object.freeze({ id: 'grenade', name: 'Granada', effect: 'grenade', pellets: 1, delay: 0, travel: .8 });
const MAX_EFFECTS = 48, MAX_PARTICLES = 56, MAX_QUEUE = 6;
const escape = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const number = value => Math.max(0, Math.min(1e9, Number(value) || 0));
export function normalizeBattleWeapon(value) { return BATTLE_WEAPONS.some(w => w.id === value) ? value : 'pistol'; }
const weaponFor = id => id === 'grenade' ? GRENADE : BATTLE_WEAPONS.find(w => w.id === normalizeBattleWeapon(id));
function weaponName(id) {
  switch (id) {
    case 'smg': return translateText('Subfusil');
    case 'shotgun': return translateText('Escopeta');
    case 'rocket': return translateText('Lanzacohetes');
    case 'railgun': return translateText('Railgun');
    case 'flame': return translateText('Lanzallamas');
    case 'too-much': return translateText('Too Much');
    case 'drone': return translateText('Dron');
    case 'psr': return translateText('PSR B0531+21');
    case 'wand': return translateText('Varita mágica');
    case 'grenade': return translateText('Granada');
    default: return translateText('Pistola');
  }
}
function weaponHint(id) {
  switch (id) {
    case 'smg': return translateText('ráfaga rápida');
    case 'shotgun': return translateText('abanico de perdigones');
    case 'rocket': return translateText('cohete y explosión');
    case 'railgun': return translateText('rayo de energía');
    case 'flame': return translateText('chorro de fuego');
    case 'too-much': return translateText('cañón de doble núcleo');
    case 'drone': return translateText('apoyo desde el aire');
    case 'psr': return translateText('pulso violeta');
    case 'wand': return translateText('estela de estrellas');
    default: return translateText('disparo simple');
  }
}

// This queue carries display data only; the caller has already committed the real call.
export function createBattleQueue() {
  const events = [];
  return {
    get size() { return events.length; },
    push(value, limit = MAX_QUEUE) {
      const event = { dayKey: String(value.dayKey ?? ''), amountText: String(value.amountText ?? '').slice(0, 160), xp: number(value.xp), critical: value.critical === true, count: Math.max(1, Math.floor(number(value.count) || 1)) };
      if (events.length < Math.max(1, Math.min(MAX_QUEUE, limit))) events.push(event);
      else {
        const last = events[events.length - 1];
        last.count = Math.min(1e9, last.count + event.count);
        last.xp = Math.min(1e9, last.xp + event.xp);
        last.critical ||= event.critical;
        last.amountText = '';
      }
      return events.length;
    },
    shift() { return events.shift(); },
    clear() { events.length = 0; },
  };
}

function weaponArt(r, id) {
  if (id === 'wand') { r(7,-2,22,3,'helmet'); r(10,1,3,5,'ink'); r(28,-6,4,11,'hero-light'); r(24,-2,12,3,'monster-light'); return 36; }
  if (id === 'drone') { r(7,-3,17,10,'ink'); r(9,-2,13,6,'hero-dark'); r(10,-1,4,2,'hero-light'); r(18,1,3,2,'good'); return 25; }
  if (id === 'pistol') { r(7,-4,18,7,'ink'); r(8,-3,15,3,'hero-light'); r(10,3,5,7,'ink'); return 25; }
  if (id === 'smg') { r(5,-4,27,8,'ink'); r(8,-3,20,3,'hero-dark'); r(10,-3,15,1,'hero-light'); r(17,4,5,8,'hero'); r(8,4,4,5,'ink'); return 33; }
  if (id === 'shotgun') { r(4,-2,32,6,'ink'); r(9,-1,26,2,'hero-light'); r(6,2,9,4,'helmet'); r(2,3,7,5,'helmet'); return 36; }
  if (id === 'rocket') { r(3,-7,34,13,'ink'); r(5,-5,29,9,'hero-dark'); r(7,-4,17,2,'good'); r(30,-5,7,9,'floor'); r(13,6,5,6,'ink'); return 37; }
  if (id === 'railgun') { r(4,-4,34,8,'ink'); r(7,-3,28,3,'monster-shadow'); r(10,-5,3,9,'hero'); r(18,-5,3,9,'hero'); r(26,-5,3,9,'hero'); r(9,4,5,6,'ink'); return 39; }
  if (id === 'flame') { r(5,-4,29,9,'ink'); r(7,-3,21,5,'helmet'); r(29,-2,7,3,'hero-light'); r(6,5,10,7,'hero-dark'); r(15,5,4,5,'ink'); return 36; }
  if (id === 'too-much') { r(0,-9,36,19,'ink'); r(2,-6,29,13,'hero-dark'); r(7,-6,9,13,'hero-light'); r(21,-6,9,13,'hero'); r(32,-7,8,5,'hero-light'); r(32,3,8,5,'hero-light'); r(5,10,6,4,'ink'); return 40; }
  if (id === 'psr') { r(2,-6,34,13,'ink'); r(4,-4,25,9,'hero'); r(7,-4,3,8,'hero-light'); r(13,-4,3,8,'hero-dark'); r(28,-6,9,13,'monster-shadow'); r(31,-3,5,6,'monster-light'); r(8,7,5,5,'ink'); return 38; }
  r(7,-4,20,7,'hero-dark'); return 28;
}
function weaponIcon(id) {
  const pixels = [];
  weaponArt((x,y,w,h,c) => pixels.push(`<rect x="${x}" y="${y+12}" width="${w}" height="${h}" fill="var(--battle-${c})"/>`), id);
  return `<svg viewBox="0 0 44 30" aria-hidden="true" focusable="false">${pixels.join('')}</svg>`;
}
function fallbackHero() {
  return '<svg class="game-battle-fallback-hero" viewBox="0 0 40 64" aria-hidden="true"><g fill="var(--battle-ink)"><path d="M8 0h24v22H8zM10 22h18v24H10zM8 46h10v18H8zM22 46h10v18H22z"/></g><path fill="var(--battle-helmet)" d="M10 2h20v14H10z"/><path fill="var(--battle-hero-dark)" d="M12 10h18v6H12zM12 44h4v16h-4zM24 44h4v16h-4z"/><path fill="var(--battle-hero)" d="M12 24h14v18H12z"/><path fill="var(--battle-hero-light)" d="M12 24h4v16h-4zM24 12h4v4h-4zM26 28h14v6H26z"/></svg>';
}
export function battleMarkup() {
  return ui`<section class="game-battle" aria-label="Batalla del héroe">
    <div class="game-battle-stage" data-battle-stage tabindex="0" role="group" aria-label="Batalla: A y D para caminar, espacio para saltar, Enter para practicar y G para granada">
      <canvas data-battle-canvas aria-hidden="true"></canvas>
      <div class="game-battle-label game-battle-label--hero"><span>HÉROE</span><b data-battle-hero-label>Tu esfuerzo</b></div>
      <div class="game-battle-label game-battle-label--monster"><span data-battle-monster-label>MONSTRUO DEL DÍA</span><b data-battle-monster-name></b></div>
      <p class="game-battle-feed" data-battle-feed>Listo para tu próxima llamada</p>
      <div class="game-battle-monster" data-battle-monster></div>
      <button type="button" class="game-battle-hero-target" data-battle-action="hero" aria-label="Tocar al héroe para disparar en modo práctica">${fallbackHero()}</button>
      <div class="game-battle-notice" data-battle-notice hidden><strong>HÉROE</strong><span data-battle-notice-text></span></div>
      <p class="game-battle-banner" data-battle-banner hidden></p>
      <div class="game-battle-victory" data-battle-victory hidden><span>★ ★ ★</span><strong>VICTORIA</strong><small>Tu esfuerzo cuenta</small></div>
    </div>
    <div class="game-battle-health" data-battle-health-slot></div>
    <div class="game-battle-controls"><div class="game-battle-keys"><span><kbd>A D</kbd> Caminar</span><span><kbd>Espacio</kbd> Saltar</span><span><kbd>Enter</kbd> Práctica</span><span><kbd>G / RMB</kbd> Granada</span></div>
      <div class="game-battle-touch" role="group" aria-label="Controles de práctica"><button type="button" data-battle-direction="a" aria-label="Caminar a la izquierda">←</button><button type="button" data-battle-direction="d" aria-label="Caminar a la derecha">→</button><button type="button" data-battle-action="jump" aria-label="Saltar">↑</button><button type="button" data-battle-action="attack">Práctica</button><button type="button" data-battle-action="grenade">Granada</button></div>
    </div>
    <details class="game-battle-armory"><summary class="game-battle-armory-head"><span>ARMA DEL HÉROE</span><small data-battle-selected></small></summary>
      <div class="game-battle-weapons" role="group" aria-label="Elegir arma del héroe">${BATTLE_WEAPONS.map(w => `<button type="button" class="game-battle-weapon" data-battle-weapon="${w.id}" aria-pressed="${w.id === 'pistol'}" title="${escape(weaponHint(w.id))}">${weaponIcon(w.id)}<span>${escape(weaponName(w.id))}</span><kbd>${w.key}</kbd></button>`).join('')}</div>
    </details>
    <p class="game-battle-motion-note" data-battle-motion-note hidden>Movimiento reducido: la batalla muestra el resultado sin animación.</p>
    <p class="game-battle-live" data-battle-live role="status" aria-live="polite" aria-atomic="true"></p>
  </section>`;
}

let mounted = null;
export function syncBattle(root, view = {}, callbacks = {}) {
  const element = root?.matches?.('.game-battle') ? root : root?.querySelector?.('.game-battle');
  if (view.enabled === false || !element) { stopBattle(); return; }
  if (mounted?.element !== element) { stopBattle(); mounted = createBattle(element); }
  mounted.sync(view, callbacks);
}
export function playBattleCall(event = {}) { return mounted?.play(event) ?? false; }
export function stopBattle() { mounted?.destroy(); mounted = null; }
export function refreshBattleAppearance() { mounted?.refresh(); }

function createBattle(element) {
  const doc = element.ownerDocument, host = doc.defaultView || globalThis;
  const $ = name => element.querySelector(`[data-battle-${name}]`);
  const stage = $('stage'), canvas = $('canvas'), monster = $('monster'), target = element.querySelector('[data-battle-action="hero"]');
  let ctx = null;
  try { ctx = canvas.getContext?.('2d') || null; } catch {}
  element.dataset.battleCanvas = ctx ? 'ready' : 'fallback';
  const queue = createBattleQueue(), keys = new Set(), cleanup = [], observers = [];
  const motion = host.matchMedia?.('(prefers-reduced-motion: reduce)');
  let reduced = !!motion?.matches, view = {}, callbacks = {}, colors = {}, world = { w: 600, h: 280, floor: 240 };
  let hero = { x: 96, jump: 0, vy: 0, walk: 0, recoil: 0, face: 1 };
  let bullets = [], particles = [], active = null, weapon = 'pistol', raf = 0, lastTime = 0, clock = 0, destroyed = false, intersecting = true, running = false, lastMonsterMarkup, hasSynced = false;
  let bannerUntil = 0, noticeUntil = 0, hitUntil = 0, droneUntil = 0, flash = 0, practiceCount = 0, lastPractice = -1, staticTimer = 0, soundPending = false;
  const listen = (node, type, handler, options) => { node?.addEventListener?.(type, handler, options); cleanup.push(() => node?.removeEventListener?.(type, handler, options)); };
  const boss = () => ({ x: world.w - (world.w < 500 ? 65 : 104), y: world.floor - (world.w < 500 ? 52 : 66) });
  const visible = () => !destroyed && element.isConnected && !doc.hidden && intersecting && !element.closest('[hidden]') && element.getClientRects().length > 0 && host.getComputedStyle(element).visibility !== 'hidden';
  const sound = kind => { if (visible() && callbacks.onSound) { soundPending = true; callbacks.onSound(kind); } };
  function clearEffects() {
    queue.clear(); active = null; bullets = []; particles = []; keys.clear(); flash = 0; hitUntil = 0; droneUntil = 0;
    bannerUntil = 0; noticeUntil = 0; $('banner').hidden = true; $('notice').hidden = true;
    hero.jump = 0; hero.vy = 0; hero.recoil = 0; monster.style.transform = ''; monster.removeAttribute('data-battle-hit');
    host.clearTimeout?.(staticTimer); staticTimer = 0;
    soundPending = false;
  }
  function pause() {
    const notify = element.dataset.battlePaused !== 'true' || soundPending;
    if (raf) host.cancelAnimationFrame?.(raf);
    raf = 0; running = false; lastTime = 0; keys.clear();
    // Hidden scenes discard effects so returning never replays stale sounds or import bursts.
    clearEffects();
    element.dataset.battlePaused = 'true';
    if (notify) callbacks.onPause?.();
  }
  function reconcile() {
    if (!element.isConnected) { destroy(); if (mounted?.element === element) mounted = null; return; }
    if (!visible()) { if (element.dataset.battlePaused !== 'true') pause(); return; }
    element.dataset.battlePaused = 'false';
    if (reduced || !ctx || !host.requestAnimationFrame) { draw(); return; }
    if (!raf) { running = true; lastTime = 0; raf = host.requestAnimationFrame(frame); }
  }
  function refresh() {
    if (destroyed) return;
    const style = host.getComputedStyle(element);
    for (const name of ['sky','building','building-near','floor','hero','hero-dark','hero-light','helmet','monster-light','monster-shadow','bullet','skin','ink','stage-text','stage-muted','gold','good']) colors[name] = style.getPropertyValue(`--battle-${name}`).trim();
    draw(); reconcile();
  }
  function resize() {
    const rect = stage.getBoundingClientRect();
    if (rect.width < 1) return;
    const ratio = Math.min(host.devicePixelRatio || 1, 2);
    world = { w: rect.width, h: rect.height || 280, floor: (rect.height || 280) - 40 };
    canvas.width = Math.round(world.w * ratio); canvas.height = Math.round(world.h * ratio);
    ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (ctx) ctx.imageSmoothingEnabled = false;
    hero.x = Math.max(32, Math.min(boss().x - 82, hero.x)); draw(); reconcile();
  }
  function selection(id, notify = false) {
    weapon = normalizeBattleWeapon(id);
    const w = weaponFor(weapon);
    $('selected').textContent = `${weaponName(w.id)} · ${weaponHint(w.id)}`;
    element.querySelectorAll('[data-battle-weapon]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.battleWeapon === weapon)));
    if (notify) callbacks.onWeaponChange?.(weapon);
    draw();
  }
  function announce(text) { $('live').textContent = text; }
  function message(event) {
    const call = event.count > 1 ? ui`${event.count} llamadas validadas` : translateText('Llamada completada');
    return [call, event.amountText, event.xp ? `+${event.xp} XP` : '', event.critical ? translateText('¡Crítico!') : ''].filter(Boolean).join(' · ');
  }
  function banner(text) {
    $('banner').textContent = text; $('banner').hidden = false; $('feed').textContent = text; bannerUntil = clock + 2.2; announce(text);
    if (reduced || !ctx) {
      host.clearTimeout?.(staticTimer);
      staticTimer = host.setTimeout?.(() => { if (!destroyed) { $('banner').hidden = true; $('notice').hidden = true; } }, 3400) || 0;
    }
  }
  function impact(event, id) {
    const w = weaponFor(id), b = boss();
    if (!reduced && ctx) {
      hitUntil = clock + (event.critical ? .25 : .15);
      monster.dataset.battleHit = event.critical ? 'critical' : 'true';
      const heavy = ['rocket','heavy','grenade','pulse'].includes(w.effect), n = heavy ? 24 : 12;
      for (let i = 0; i < n && particles.length < MAX_PARTICLES; i++) {
        const angle = Math.random() * Math.PI * 2, speed = (heavy ? 100 : 60) + Math.random() * 120;
        particles.push({ x: b.x, y: b.y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed-50, age: 0, life: .45+Math.random()*.25, color: ['magic','pulse','beam'].includes(w.effect) ? 'monster-light' : i%2 ? 'hero-light' : 'helmet', size: 3+Math.floor(Math.random()*3) });
      }
    }
    sound(event.practice ? 'practice-hit' : event.critical ? 'critical' : 'hit');
    if (!event.practice) { banner(message(event)); active = null; }
  }
  function emit(event, id) {
    const w = weaponFor(id), b = boss();
    hero.face = 1;
    sound(`shoot-${id}`);
    if (reduced || !ctx) { impact(event, id); return; }
    hero.recoil = .14; flash = .09;
    const from = { x: hero.x + 38, y: world.floor - 40 - hero.jump };
    if (id === 'drone') { from.x = hero.x+42; from.y -= 69; droneUntil = clock+1.3; }
    let last = null;
    for (let i = 0; i < w.pellets && bullets.length < MAX_EFFECTS; i++) {
      const spread = (i - (w.pellets-1)/2)*(w.effect === 'pellet' ? 6 : w.effect === 'flame' ? 4 : 2);
      last = { ...from, tx: b.x, ty: b.y+spread, elapsed: -i*w.delay, travel: w.travel, effect: w.effect, id, event: null };
      bullets.push(last);
    }
    if (last) last.event = event;
    else if (!event.practice) impact(event, id);
  }
  function practice(id = weapon) {
    const now = (host.performance?.now?.() ?? Date.now()) / 1000;
    if (!visible() || now-lastPractice < .16) return;
    lastPractice = now; practiceCount++;
    emit({ practice: true }, id);
    $('feed').textContent = `${translateText('Práctica')} · ${weaponName(id)}`;
    if (practiceCount%3 === 0) {
      const messages = [translateText('Tu héroe necesita llamadas reales para dañar al monstruo.'), translateText('El daño viene de tu trabajo: completá una llamada real.'), translateText('¡Tomá una llamada! Tu héroe necesita tu esfuerzo para vencer.')];
      const text = messages[(practiceCount/3-1)%messages.length];
      $('notice-text').textContent = text; $('notice').hidden = false; noticeUntil = clock+3.4; announce(text);
      if (reduced || !ctx) { host.clearTimeout?.(staticTimer); staticTimer = host.setTimeout?.(() => { if (!destroyed) $('notice').hidden = true; }, 3400) || 0; }
    } else announce(translateText('Disparo de práctica. Tu progreso se conserva.'));
    reconcile();
  }
  function jump() { if (!reduced && ctx && visible() && hero.jump === 0) hero.vy = 340; }
  function play(event) {
    if (destroyed || String(event.dayKey ?? '') !== String(view.dayKey ?? '') || !visible()) return false;
    queue.push(event, active ? MAX_QUEUE-1 : MAX_QUEUE);
    if (reduced || !ctx) { const next = queue.shift(); emit(next, weapon); }
    reconcile(); return true;
  }
  function rect(x,y,w,h,color) { if (ctx) { ctx.fillStyle = colors[color] || '#97a6c4'; ctx.fillRect(Math.round(x),Math.round(y),w,h); } }
  function skyline() {
    rect(0,0,world.w,world.h,'sky');
    for (let i=0;i<11;i++) {
      const x=(i*107+29)%Math.ceil(world.w+80), h=28+(i*31)%84;
      rect(x,world.floor-h-30,50+(i%3)*10,h+30,'building');
      if (i%2===0) rect(x+20,world.floor-h-48,5,18,'building');
      for (let j=0;j<3;j++) rect(x+8+j*13,world.floor-h-17,3,4,'building-near');
    }
    for (let i=0;i<8;i++) { const x=(i*181+54)%Math.ceil(world.w+90), h=25+(i*19)%52; rect(x,world.floor-h,65,h,'building-near'); }
    ctx.globalAlpha=.5;
    for (let i=0;i<23;i++) rect((i*67+21)%Math.max(1,Math.floor(world.w)),35+(i*29)%110,2,2,'stage-muted');
    ctx.globalAlpha=1; rect(0,world.floor,world.w,4,'floor'); rect(0,world.floor+4,world.w,40,'building-near');
    for (let i=0;i<world.w;i+=32) rect(i,world.floor+11,21,2,'floor');
    rect(world.w*.29,world.floor-67,world.w*.13,5,'floor'); rect(world.w*.6,world.floor-106,world.w*.1,5,'floor');
  }
  function drawHero() {
    const walking=keys.size>0, stride=walking ? Math.sin(hero.walk)*5 : 0, idle=reduced ? 0 : Math.sin(clock*2)*.6;
    ctx.save(); ctx.translate(Math.round(hero.x),Math.round(world.floor-hero.jump+idle)); ctx.scale(hero.face,1);
    const p=(x,y,w,h,c)=>rect(x*2,y*2,w*2,h*2,c);
    ctx.globalAlpha=.2; rect(-22,0,48,6,'ink'); ctx.globalAlpha=1;
    p(-4,-21,9,11,'ink'); p(-3,-20,7,8,'hero'); p(-3,-20,2,7,'hero-light'); p(-3,-12,7,2,'hero-dark');
    p(-4,-10,4,8,'ink'); p(1,-10,4,8,'ink'); p(-3,-9,2,6+stride/2,'hero-dark'); p(2,-9,2,6-stride/2,'hero-dark'); p(-4,-3+stride/2,4,3,'hero'); p(1,-3-stride/2,5,3,'hero');
    p(-5,-31,12,11,'ink'); p(-4,-30,10,8,'helmet'); p(-4,-30,9,2,'skin'); p(-3,-26,9,3,'hero-dark'); p(3,-26,2,2,'hero-light'); p(-5,-22,5,4,'hero-dark'); p(1,-19,7,3,'hero-light'); p(5,-19,3,3,'skin');
    ctx.save(); ctx.translate(8+(hero.recoil>0?-3:0),-38); const muzzle=weaponArt(rect,weapon);
    if (flash>0&&!reduced) { rect(muzzle,-4,8,7,weapon==='wand'?'monster-light':'hero-light'); rect(muzzle+5,-2,7,3,'gold'); }
    ctx.restore(); ctx.restore();
  }
  function projectile(b,q) {
    const x=b.x+(b.tx-b.x)*q; let y=b.y+(b.ty-b.y)*q;
    if (b.effect==='grenade') y-=Math.sin(q*Math.PI)*85;
    if (b.effect==='beam') { ctx.strokeStyle=colors['monster-light']; ctx.lineWidth=5; ctx.beginPath(); ctx.moveTo(b.x,b.y); ctx.lineTo(x,y); ctx.stroke(); ctx.strokeStyle=colors['hero-light']; ctx.lineWidth=2; ctx.stroke(); rect(x-3,y-5,6,10,'hero-light'); }
    else if (b.effect==='rocket') { rect(x-24,y-1,10,2,'gold'); rect(x-17,y-3,12,6,'helmet'); rect(x-7,y-5,15,10,'ink'); rect(x-5,y-3,11,6,'floor'); rect(x+6,y-1,5,2,'helmet'); }
    else if (b.effect==='grenade') { rect(x-7,y-7,14,14,'ink'); rect(x-5,y-5,10,10,'good'); rect(x-2,y-9,5,3,'floor'); rect(x+1,y-8,5,1,'gold'); }
    else if (b.effect==='pulse') { rect(x-13,y-2,11,4,'monster-shadow'); rect(x-5,y-8,11,16,'monster-shadow'); rect(x-9,y-4,19,8,'monster-light'); rect(x-3,y-4,7,8,'hero-light'); for (let i=1;i<4;i++) rect(x-i*12,y+(i%2?4:-5),4,3,'monster-light'); }
    else if (b.effect==='magic') { rect(x-2,y-9,4,18,'gold'); rect(x-8,y-2,17,4,'monster-light'); rect(x-4,y-4,8,8,'hero-light'); for (let i=1;i<4;i++) rect(x-i*15,y+Math.sin(q*15+i)*6,3,3,'monster-light'); }
    else if (b.effect==='flame') { const s=5+q*10, wave=Math.sin(q*12+b.tx)*5; rect(x-s/2-7,y-s/2+wave,s+8,s,'helmet'); rect(x-2,y-2+wave,6,5,'gold'); }
    else if (b.effect==='heavy') { rect(x-18,y-3,13,6,'helmet'); rect(x-7,y-6,13,12,'hero'); rect(x-3,y-3,7,6,'hero-light'); }
    else if (b.effect==='pellet') { rect(x-11,y,9,1,'gold'); rect(x-2,y-2,5,4,'helmet'); }
    else { rect(x-18,y-1,17,2,b.effect==='drone'?'monster-light':'hero'); rect(x-4,y-3,10,5,'bullet'); }
  }
  function draw() {
    if (destroyed) return;
    if (ctx) {
      skyline(); drawHero();
      if (clock<droneUntil&&!reduced) {
        const x=hero.x+42,y=world.floor-hero.jump-109+Math.sin(clock*6)*3;
        rect(x-15,y-4,30,3,'ink'); rect(x-19,y-7,13,2,'hero-light'); rect(x+6,y-7,13,2,'hero-light'); rect(x-7,y-3,14,10,'hero-dark'); rect(x-4,y-2,8,5,'hero'); rect(x-1,y+5,3,5,'monster-light');
      }
      if (!reduced) {
        for (const b of bullets) if (b.elapsed>=0) projectile(b,Math.min(1,b.elapsed/b.travel));
        for (const p of particles) { ctx.globalAlpha=Math.max(0,1-p.age/p.life); rect(p.x,p.y,p.size,p.size,p.color); }
        ctx.globalAlpha=1;
      }
    }
    target.style.transform=`translate(${Math.round(hero.x-24)}px,${Math.round(world.floor-hero.jump-70)}px)`;
    $('notice').style.left=`${Math.max(124,Math.min(world.w-124,hero.x+50))}px`;
    $('notice').style.top=`${Math.max(64,world.floor-hero.jump-147)}px`;
    monster.style.transform=!reduced&&clock<hitUntil ? `translateX(${Math.sin(clock*120)*4}px)` : '';
    if (clock>=hitUntil) monster.removeAttribute('data-battle-hit');
  }
  function frame(time) {
    raf=0;
    if (!visible()) { pause(); return; }
    const dt=Math.min(lastTime?(time-lastTime)/1000:.016,.04); lastTime=time; clock+=dt;
    const left=keys.has('a')||keys.has('arrowleft'), right=keys.has('d')||keys.has('arrowright');
    if (left||right) { hero.x=Math.max(32,Math.min(boss().x-82,hero.x+(right?1:-1)*150*dt)); hero.face=right?1:-1; hero.walk+=dt*13; }
    if (hero.vy||hero.jump) { hero.jump=Math.max(0,hero.jump+hero.vy*dt); hero.vy-=880*dt; if (hero.jump===0) hero.vy=0; }
    hero.recoil=Math.max(0,hero.recoil-dt); flash=Math.max(0,flash-dt);
    if (!active&&queue.size) { active=queue.shift(); emit(active,weapon); }
    const impacts=[];
    bullets=bullets.filter(b=>{ b.elapsed+=dt; if (b.elapsed<b.travel) return true; if (b.event) impacts.push([b.event,b.id]); return false; });
    impacts.forEach(([event,id])=>impact(event,id));
    particles=particles.filter(p=>{ p.age+=dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=360*dt; return p.age<p.life; });
    if (bannerUntil&&clock>bannerUntil) { $('banner').hidden=true; bannerUntil=0; }
    if (noticeUntil&&clock>noticeUntil) { $('notice').hidden=true; noticeUntil=0; }
    draw(); raf=host.requestAnimationFrame(frame);
  }
  function sync(next, handlers) {
    if (destroyed) return;
    const dayChanged = String(view.dayKey??'')!==String(next.dayKey??'');
    const signatures = next.callSignatures || {};
    const stale = hasSynced && !dayChanged && (view.goalUsd !== next.goalUsd || Object.entries(view.callSignatures).some(([id, signature]) => !Object.hasOwn(signatures, id) || signatures[id] !== signature));
    if (dayChanged || stale) {
      clearEffects(); callbacks.onPause?.(); $('feed').textContent=translateText('Listo para tu próxima llamada'); $('live').textContent='';
      if (dayChanged) { hero.x=Math.min(96,world.w*.22); practiceCount=0; lastPractice=-1; }
    }
    view={ ...next, callSignatures: { ...signatures } }; hasSynced=true; callbacks={ ...handlers }; selection(next.weapon);
    const markup = String(next.monsterMarkup??'');
    if (lastMonsterMarkup!==markup) { monster.innerHTML=markup; lastMonsterMarkup=markup; }
    monster.setAttribute('role','img'); monster.setAttribute('aria-label',next.monsterDescription||next.monsterName||translateText('MONSTRUO DEL DÍA'));
    $('hero-label').textContent=next.heroLabel||translateText('Tu esfuerzo'); $('monster-label').textContent=next.monsterLabel||translateText('MONSTRUO DEL DÍA'); $('monster-name').textContent=next.monsterName||'';
    element.dataset.battleDefeated=String(next.defeated===true); element.dataset.battleHp=String(Math.max(0,Math.min(100,Number(next.hpPct)||0)));
    $('victory').hidden=next.defeated!==true; $('motion-note').hidden=!reduced;
    resize(); refresh();
  }
  function destroy() {
    if (destroyed) return;
    pause(); destroyed=true; callbacks={}; cleanup.forEach(remove=>remove()); observers.forEach(observer=>observer.disconnect());
  }
  listen(element,'click',event=>{
    const button=event.target.closest?.('button'); if (!button||!element.contains(button)) return;
    if (button.dataset.battleWeapon) selection(button.dataset.battleWeapon,true);
    if (button.dataset.battleDirection&&event.detail===0&&!reduced&&ctx&&visible()) {
      const direction=button.dataset.battleDirection==='d'?1:-1;
      hero.x=Math.max(32,Math.min(boss().x-82,hero.x+direction*22)); hero.face=direction; draw();
    }
    const action=button.dataset.battleAction;
    if (action==='attack'||action==='hero'||action==='grenade') { practice(action==='grenade'?'grenade':weapon); if (action==='hero') stage.focus({ preventScroll:true }); }
    else if (action==='jump') jump();
  });
  listen(stage,'contextmenu',event=>{ event.preventDefault(); practice('grenade'); });
  listen(stage,'pointerdown',event=>{ if (event.button===0&&event.target===canvas) stage.focus({ preventScroll:true }); });
  listen(element,'keydown',event=>{
    if (event.altKey||event.ctrlKey||event.metaKey||event.target.closest('input,textarea,select,[contenteditable="true"]')||!visible()) return;
    const key=event.key.toLowerCase(), w=BATTLE_WEAPONS.find(item=>item.key===key);
    if (w) { event.preventDefault(); if (!event.repeat) selection(w.id,true); return; }
    if (['a','d','arrowleft','arrowright'].includes(key)) { event.preventDefault(); if (!reduced) keys.add(key); }
    else if ([' ','arrowup','w','enter','g'].includes(key)) {
      // Buttons and disclosures keep native Enter/Space activation.
      if ((key==='enter'||key===' ')&&(event.target.closest('button')||event.target.closest('summary'))) return;
      event.preventDefault(); if (event.repeat) return;
      if (key==='enter'||key==='g') practice(key==='g'?'grenade':weapon); else jump();
    }
  });
  listen(host,'keyup',event=>keys.delete(event.key.toLowerCase())); listen(host,'blur',()=>keys.clear());
  listen(element,'focusout',event=>{ if (!element.contains(event.relatedTarget)) keys.clear(); });
  for (const button of element.querySelectorAll('[data-battle-direction]')) {
    listen(button,'pointerdown',event=>{ if (!reduced&&visible()) { event.preventDefault(); button.focus({ preventScroll:true }); keys.add(button.dataset.battleDirection); button.setPointerCapture?.(event.pointerId); } });
    for (const type of ['pointerup','pointercancel','lostpointercapture']) listen(button,type,()=>keys.delete(button.dataset.battleDirection));
  }
  listen(doc,'visibilitychange',reconcile);
  listen(motion,'change',()=>{ reduced=!!motion.matches; clearEffects(); callbacks.onPause?.(); $('motion-note').hidden=!reduced; if (raf) host.cancelAnimationFrame(raf); raf=0; running=false; reconcile(); });
  if (host.ResizeObserver) { const observer=new host.ResizeObserver(resize); observer.observe(stage); observers.push(observer); } else listen(host,'resize',resize);
  if (host.IntersectionObserver) { const observer=new host.IntersectionObserver(entries=>{ intersecting=entries.some(entry=>entry.isIntersecting); reconcile(); }); observer.observe(element); observers.push(observer); }
  if (host.MutationObserver) {
    const observer=new host.MutationObserver(reconcile); observer.observe(doc.body||doc.documentElement,{ childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class'] }); observers.push(observer);
    const theme=new host.MutationObserver(refresh); theme.observe(doc.documentElement,{ attributes:true,attributeFilter:['class','data-theme','style','data-palette'] }); observers.push(theme);
  }
  resize(); refresh();
  return { element,sync,play,destroy,refresh };
}
