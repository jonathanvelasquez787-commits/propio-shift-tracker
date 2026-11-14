import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parse } from 'acorn';
import { presentationPreferences, applyPresentation, wirePresentation } from '../js/presentation-accessibility.js';
import { PALETTES, paletteTokens, contrast } from '../js/theme-palettes.js';
import { wireAppearance } from '../js/appearance.js';

const source = fs.readFileSync('js/app-main.js', 'utf8');
const nodes = parse(source, { ecmaVersion: 'latest', sourceType: 'module' }).body.map(node => node.declaration || node);
const fn = name => { const node = nodes.find(node => node.type === 'FunctionDeclaration' && node.id.name === name); return source.slice(node.start, node.end); };
function element() {
  const classes = new Set(), attributes = new Map();
  return { hidden:false, style:{ display:'', setProperty(){} }, textContent:'', dataset:{},
    classList:{ toggle(name, value) { const enabled = value ?? !classes.has(name); if (enabled) classes.add(name); else classes.delete(name); return enabled; }, add:name=>classes.add(name), remove:name=>classes.delete(name), contains:name=>classes.has(name) },
    setAttribute:(key,value)=>attributes.set(key,value), getAttribute:key=>attributes.get(key),
    querySelector:()=>null, closest:()=>null, isConnected:true, addEventListener(type, action){ this[type]=action; },
    focus(){ this.focused = true; }, contains:()=>false };
}
function presentationHarness() {
  const inputs = ['enabled','earnings','schedule','game'].map(key => Object.assign(element(), { dataset:{ essentialOption:key } }));
  const root = element(), listeners = {};
  const doc = { documentElement:root, querySelectorAll:()=>inputs, querySelector:()=>null, addEventListener:(type,action)=>listeners[type]=action };
  let settings = { essentialView:{ enabled:true, earnings:false, schedule:true, game:false }, marker:'keep' };
  const h = { inputs, root, doc, listeners, reject:false, get settings(){ return settings; }, replace(value){settings=value;} };
  wirePresentation({ getSettings:()=>settings, save:()=>!h.reject, apply:()=>applyPresentation(settings,doc) },doc);
  applyPresentation(settings,doc);
  return h;
}

test('essential view restores configured blocks without altering data or achievement settings', () => {
  assert.deepEqual(presentationPreferences(null), { enabled:false, earnings:true, schedule:true, game:false });
  assert.equal(presentationPreferences({enabled:'true', game:'true'}).enabled,false);
  const h = presentationHarness(), before = JSON.stringify(h.settings);
  assert.ok(h.root.classList.contains('essential-hide-earnings'));
  assert.ok(h.root.classList.contains('essential-hide-game'));
  assert.equal(h.root.classList.contains('essential-hide-schedule'),false);
  assert.equal(JSON.stringify(h.settings),before);
  h.inputs[0].checked=false; h.inputs[0].change();
  assert.equal(h.root.classList.contains('essential-hide-earnings'),false);
  assert.equal(h.inputs[1].disabled,true);
  assert.equal(h.settings.essentialView.earnings,false);
  h.inputs[0].checked=true; h.inputs[0].change();
  assert.ok(h.root.classList.contains('essential-hide-earnings'));
  assert.equal(h.settings.marker,'keep');
});

test('a failed essential preference save rolls back controls and leaves the previous preference intact', () => {
  const h = presentationHarness(), previous = h.settings.essentialView;
  h.reject=true; h.inputs[1].checked=true; h.inputs[1].change();
  assert.equal(h.settings.essentialView,previous);
  assert.equal(h.inputs[1].checked,false);
  assert.ok(h.root.classList.contains('essential-hide-earnings'));
});

// Las paletas solo cambian los fondos; texto y acentos son los de Original (css/app-core.css).
// Se mide Original contra los tres fondos de cada paleta (página, panel, panel-2).
const ORIGINAL_COLORS = {
  light: { '--text':'#0f172a','--muted':'#64748b','--primary':'#6366f1','--bad':'#dc2626' },
  dark: { '--text':'#edf4ff','--muted':'#97a6c4','--primary':'#2fd5ff','--bad':'#ff6b72' },
};
test('palette text and semantic states keep normal-text contrast on page and both panel surfaces', () => {
  for (const palette of PALETTES.slice(1)) for (const mode of Object.keys(palette.modes)) {
    const tokens=paletteTokens(palette,mode);
    for (const key of ['--text','--primary','--bad','--good','--warn','--teal']) assert.equal(tokens[key],undefined,`${palette.id}/${mode}/${key} must come from Original`);
    // bg == panel; --muted solo cambia en los temas con retoque de gris.
    const surfaces=['--bg','--panel','--panel-2'].map(key=>tokens[key]);
    const softGray=palette.muted&&palette.muted[mode];
    assert.equal(tokens['--muted'],softGray||undefined,`${palette.id}/${mode}: --muted only where retouched`);
    for (const [key,original] of Object.entries(ORIGINAL_COLORS[mode])) {
      const color=key==='--muted'&&softGray?softGray:original;
      if (key==='--muted'&&softGray) { const w=Math.min(...surfaces.map(surface=>contrast(color,surface))); assert.ok(w>=4.5,`${palette.id}/${mode}: soft gray ${w.toFixed(2)}`); continue; }
      const worst=Math.min(...surfaces.map(surface=>contrast(color,surface)));
      if (key==='--text') assert.ok(worst>=4.5,`${palette.id}/${mode}: ${key} ${worst.toFixed(2)}`);
      else assert.ok(worst>=3,`${palette.id}/${mode}: ${key} ${worst.toFixed(2)}`);
    }
    for (const color of ['cyan','blue','pink','good','warn','bad']) assert.ok(tokens[`--palette-on-${color}`],`${palette.id}/${mode}: missing --palette-on-${color}`);
  }
});

function liveHarness() {
  const elements=Object.fromEntries(['liveDiscardBtn','callControlBtn','callsStatusCard','callsStatusIcon','callsStatusTextTitle','callsStatusTimer','callsStatusMid','callsStatusActions','callsControlsGrid','callsStatusSaveBtn','callsStatusEndBtn'].map(id=>[id,element()]));
  const hero=element();
  const context=vm.createContext({ state:{ activeCall:null,activePause:null,pendingLiveCallBackup:null }, document:{getElementById:id=>elements[id],querySelector:selector=>selector==='.hero-shift-actions'?hero:null,body:element()},
    translateText:value=>value, formatDuration:value=>String(value), iconHtml:()=>'', isViewingToday:()=>true, endCall(){},discardActiveCall(){},endPause(){},discardActivePause(){},restorePendingLiveCallBackup(){context.opened=true;},Date });
  vm.runInContext('let currentLiveActivity = null;\n'+['liveActivityInfo','updateLiveActivityBar','updateCallsStatusCard','callActionLabel','callActionTimer'].map(fn).join('\n'),context);
  return { context, elements, hero };
}
test('pending calls show the same frozen duration and recovery action in activity bar and call card', () => {
  const {context:h,elements:e,hero}=liveHarness();
  h.state.pendingLiveCallBackup={startedAtISO:'2026-10-22T14:00:00Z',endedAtISO:'2026-10-22T14:02:03Z'};
  h.state.activePause={type:'break',startedAt:'2026-10-22T14:03:00Z'};
  const before=JSON.stringify(h.state);
  h.updateLiveActivityBar();h.updateCallsStatusCard();
  // La barra de acciones (única) y la tarjeta de llamadas muestran la misma duración congelada y la misma acción.
  assert.equal(h.callActionTimer(),'123000');assert.equal(e.callsStatusTimer.textContent,'123000');
  assert.equal(h.callActionLabel(),'Revisar llamada');assert.equal(e.callsStatusSaveBtn.textContent,'Revisar llamada');
  assert.equal(hero.dataset.liveType,'pending');assert.equal(e.callControlBtn.classList.contains('is-pending'),true);
  assert.equal(e.liveDiscardBtn.hidden,true);assert.equal(e.callsStatusEndBtn.hidden,true);
  assert.equal(e.callsStatusCard.hidden,false);
  h.liveActivityInfo().onSave();assert.equal(h.opened,true);assert.equal(JSON.stringify(h.state),before);
});

test('activity priority follows live call then pending call then pause and clears obsolete controls', () => {
  const {context:h,elements:e,hero}=liveHarness();
  h.state.activeCall={startedAt:new Date().toISOString()};
  h.state.pendingLiveCallBackup={startedAtISO:'2026-10-22T14:00:00Z',endedAtISO:'2026-10-22T14:02:00Z'};
  h.state.activePause={type:'lunch',startedAt:new Date().toISOString()};
  assert.equal(h.liveActivityInfo().type,'call');
  h.updateLiveActivityBar(); h.updateCallsStatusCard();assert.equal(e.callsStatusCard.hidden,false);
  assert.equal(hero.dataset.liveType,'call');assert.equal(e.liveDiscardBtn.hidden,false);
  assert.equal(e.callControlBtn.classList.contains('is-pending'),false);
  h.state.activeCall=null;assert.equal(h.liveActivityInfo().type,'pending');
  h.state.pendingLiveCallBackup=null;assert.equal(h.liveActivityInfo().type,'lunch');
  h.updateLiveActivityBar();h.updateCallsStatusCard();assert.equal(e.liveDiscardBtn.hidden,false);
  assert.equal(hero.dataset.liveType,'lunch');
  assert.equal(e.callsStatusActions.style.display,'none');
  assert.equal(e.callsStatusCard.hidden,true);assert.equal(e.callsControlsGrid.style.display,'');
  h.state.activePause=null;h.updateLiveActivityBar();assert.equal(hero.dataset.liveType,undefined);assert.equal(e.liveDiscardBtn.hidden,true);
});

test('closing a modal returns focus and a delayed opening cannot steal focus from a newer dialog', () => {
  const trigger=element(), first=element(), second=element(), input1=element(), input2=element(), scheduled=[];
  const elements={first,second};first.querySelector=()=>first;second.querySelector=()=>second;
  first.contains=target=>target===input1;second.contains=target=>target===input2;
  const doc={activeElement:trigger,getElementById:id=>elements[id],dispatchEvent(){}};
  const h=vm.createContext({ document:doc, Map, getModalFocusableElements:scope=>[scope===first?input1:input2],setTimeout:action=>scheduled.push(action),CustomEvent:class{},cancelPendingGoalChange(){},renderAccountingExportScope(){} });
  vm.runInContext('let openModalStack=[]; const modalReturnFocus=new Map();\n'+fn('openModal')+'\n'+fn('closeModal'),h);
  h.openModal('first');doc.activeElement=input1;h.openModal('second');scheduled.forEach(action=>action());
  assert.equal(input1.focused,undefined);assert.equal(input2.focused,true);
  doc.activeElement=input2;h.closeModal('second');assert.equal(input1.focused,true);
  doc.activeElement=input1;h.closeModal('first');assert.equal(trigger.focused,true);
});

test('touch help toggles and Escape dismisses it while retaining focus and the parent dialog', () => {
  const h=presentationHarness(), wrap=element(), button=element();
  button.closest=selector=>selector==='.game-help-wrap'?null:wrap;
  wrap.querySelector=()=>button;
  const target={closest:()=>button};
  h.doc.querySelector=selector=>{
    if(selector.includes('is-help-open')&&wrap.classList.contains('is-help-open'))return wrap;
    if(selector.includes(':focus-within')&&(!selector.includes(':not(.is-help-dismissed)')||!wrap.classList.contains('is-help-dismissed')))return wrap;
    return null;
  };
  h.listeners.click({target});
  assert.equal(wrap.classList.contains('is-help-open'),true);assert.equal(button.getAttribute('aria-expanded'),'true');
  h.listeners.click({target});
  assert.equal(wrap.classList.contains('is-help-open'),false);assert.equal(wrap.classList.contains('is-help-dismissed'),true);
  h.listeners.click({target});
  let prevented=false,stopped=false;
  h.listeners.keydown({key:'Escape',preventDefault(){prevented=true;},stopPropagation(){stopped=true;}});
  assert.equal(wrap.classList.contains('is-help-open'),false);assert.equal(button.getAttribute('aria-expanded'),'false');
  assert.equal(prevented,true);assert.equal(stopped,true);assert.equal(button.focused,undefined);
  prevented=false;stopped=false;
  h.listeners.keydown({key:'Escape',preventDefault(){prevented=true;},stopPropagation(){stopped=true;}});
  assert.equal(prevented,false);assert.equal(stopped,false,'the next Escape can close the parent modal while focus stays on its help button');
  const detachedWrap=element();
  button.closest=selector=>selector==='.game-help-wrap'?null:detachedWrap;
  h.doc.querySelector=selector=>selector.includes(':focus-within')?detachedWrap:null;
  h.listeners.click({target});assert.equal(detachedWrap.classList.contains('is-help-open'),false);
  prevented=false;stopped=false;
  h.listeners.keydown({key:'Escape',preventDefault(){prevented=true;},stopPropagation(){stopped=true;}});
  assert.equal(prevented,false);assert.equal(stopped,false);
});

test('appearance dialog keeps Tab inside visible controls and leaves Escape to the native dialog', () => {
  const beforeDocument=globalThis.document,beforeWindow=globalThis.window;
  const first=Object.assign(element(),{tabIndex:0,getClientRects:()=>[{}]}),last=Object.assign(element(),{tabIndex:0,getClientRects:()=>[{}]}),hidden=Object.assign(element(),{tabIndex:0,getClientRects:()=>[]});
  const dialog=element();dialog.querySelectorAll=()=>[first,hidden,last];dialog.contains=value=>[first,last].includes(value);
  globalThis.document={getElementById:id=>id==='appearanceDialog'?dialog:null,querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){},activeElement:last};
  globalThis.window={matchMedia:()=>({addEventListener(){}})};
  try {
    wireAppearance({getSettings:()=>({}),save:()=>true,applyTheme(){}});
    let prevented=false,stopped=false;
    const event={key:'Tab',shiftKey:false,preventDefault(){prevented=true;},stopPropagation(){stopped=true;}};
    dialog.keydown(event);assert.equal(first.focused,true);assert.equal(prevented,true);
    globalThis.document.activeElement=first;event.shiftKey=true;dialog.keydown(event);assert.equal(last.focused,true);
    prevented=false;event.key='Escape';dialog.keydown(event);assert.equal(stopped,true);assert.equal(prevented,false);
  } finally { if(beforeDocument===undefined)delete globalThis.document;else globalThis.document=beforeDocument;if(beforeWindow===undefined)delete globalThis.window;else globalThis.window=beforeWindow; }
});

test('every theme uses one color for page and card, and the softened grays reach 4.5 contrast', () => {
  const retouched = [];
  for (const palette of PALETTES.slice(1)) for (const mode of Object.keys(palette.modes)) {
    const tokens=paletteTokens(palette,mode);
    assert.equal(tokens['--bg'],tokens['--panel'],`${palette.id}/${mode}: --bg must equal --panel`);
    if (palette.muted&&palette.muted[mode]) {
      retouched.push(`${palette.id}/${mode}`);
      for (const key of ['--muted','--text-gray','--muted-3','--text-muted-3','--tier-silver']) assert.equal(tokens[key],palette.muted[mode],`${palette.id}/${mode}/${key}`);
      for (const surface of ['--bg','--panel','--panel-2']) assert.ok(contrast(tokens['--muted'],tokens[surface])>=4.5,`${palette.id}/${mode}: gray on ${surface}`);
    }
  }
  assert.equal(retouched.length,6,'six themes get the softened gray: '+retouched.join(', '));
});

test('collapsed actions bar opens only the active break, lunch or call button and shows its timer', () => {
  const css = fs.readFileSync('css/app-shell.css', 'utf8');
  const html = fs.readFileSync('app.html', 'utf8');
  assert.ok(/\.action-sub\s*\{\s*display:\s*none/.test(css), 'inactive buttons hide their timer');
  assert.ok(/\.is-active \.action-sub[^{]*\{[^}]*display:\s*block/.test(css), 'the active break, lunch or call button shows its timer');
  assert.ok(/#callControlBtn\.is-pending \.action-sub[^{]*\{[^}]*display:\s*block/.test(css), 'a pending call shows its duration');
  for (const id of ['breakControlBtn', 'lunchControlBtn', 'callControlBtn']) assert.ok(html.includes(`id="${id}"`) && css.includes(`#${id}`), `${id} is styled`);
  assert.ok(!/#shiftControlBtn\.is-active \.action-sub[^{]*\{[^}]*display:\s*block/.test(css), 'the shift button keeps its icon-only look');
});

test('there is a single actions bar: no top live bar, no expanded view, names under each icon and a discard button', () => {
  const html = fs.readFileSync('app.html', 'utf8');
  const main = fs.readFileSync('js/app-main.js', 'utf8');
  assert.ok(!/live-activity-bar|liveActivityBar|liveBarSaveBtn/.test(html + main), 'the top live bar is gone');
  assert.ok(!/hero-shift-toggle/.test(main), 'no expand/collapse arrow');
  const names = { shiftControlBtn: 'Turno', breakControlBtn: 'Break', lunchControlBtn: 'Lunch', callControlBtn: 'Llamada', pasteCallsBtn: 'Pegar', addCallManualBtn: 'Agregar' };
  for (const [id, name] of Object.entries(names)) {
    const start = html.indexOf(`id="${id}"`), end = html.indexOf('</button>', start);
    assert.ok(html.slice(start, end).includes(`<span class="action-short" aria-hidden="true">${name}</span>`), `${id} shows "${name}" under its icon`);
  }
  assert.ok(/id="liveDiscardBtn"[^>]*hidden/.test(html), 'discard button starts hidden');
  const shell = fs.readFileSync('css/app-shell.css', 'utf8');
  assert.ok(/is-stuck/.test(shell) && /wireStickyActionsBar/.test(main), 'the bar sticks to the top while scrolling');
  assert.ok(/#heroSection\s*\{[^}]*backdrop-filter:\s*none/.test(shell), 'the hero card has no backdrop-filter, otherwise position:fixed would not follow the screen');
});

test('the actions bar keeps its layout: six buttons share the width and the empty Llamadas card stays hidden', () => {
  const css = fs.readFileSync('css/app-shell.css', 'utf8');
  assert.ok(/#callsSection:has\(> #callsStatusCard\[hidden\]\)[^{]*\{[^}]*display:\s*none/.test(css), 'an empty Llamadas card disappears');
  assert.ok(/\.hero-shift-actions :is\(#shiftControlBtn[^)]*\)\s*\{[^}]*flex:\s*1 1 0[^}]*min-width:\s*0/.test(css), 'buttons share the bar width instead of using a fixed width');
  assert.ok(/#liveDiscardBtn \.action-short \{ display: none; \}/.test(css), 'narrow screens show the discard X without text so everything fits');
});
