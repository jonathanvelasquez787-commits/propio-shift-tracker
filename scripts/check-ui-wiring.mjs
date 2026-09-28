import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const html = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
const appMain = fs.readFileSync(path.join(root, 'js', 'app-main.js'), 'utf8');
const jsDir = path.join(root, 'js');
const jsSources = fs.readdirSync(jsDir).filter(n => n.endsWith('.js')).map(n => fs.readFileSync(path.join(jsDir, n), 'utf8'));
const allJs = jsSources.join('\n');
const errors = [];
const values = (source, re) => [...source.matchAll(re)].map(m => m[1]);

const ids = values(html, /\bid=["']([^"']+)["']/g);
const idSet = new Set(ids);
for (const id of new Set(ids.filter((v, i) => ids.indexOf(v) !== i))) errors.push('ID duplicado: ' + id);

for (const [label, re] of [
  ['data-close-modal', /\bdata-close-modal=["']([^"']+)["']/g],
  ['data-open-modal', /\bdata-open-modal=["']([^"']+)["']/g],
  ['aria-controls', /\baria-controls=["']([^"']+)["']/g],
  ['label for', /<label\b[^>]*\bfor=["']([^"']+)["']/g],
]) {
  for (const target of values(html, re)) if (!idSet.has(target)) errors.push(label + ' apunta a id inexistente: ' + target);
}

const pageIds = new Set(ids.filter(id => /^page[A-Z]/.test(id)).map(id => id.slice(4).toLowerCase()));
for (const page of [...values(html, /\bdata-page=["']([^"']+)["']/g), ...values(html, /\bdata-nav-page=["']([^"']+)["']/g)]) {
  if (!pageIds.has(page.toLowerCase())) errors.push('Navegación apunta a página inexistente: ' + page);
}

const directListenerRe = /document\.getElementById\(\s*["']([^"']+)["']\s*\)\.addEventListener\(/g;
for (const source of jsSources) {
  for (const id of values(source, directListenerRe)) {
    const quoted = ['id="' + id + '"', "id='" + id + "'"];
    if (!idSet.has(id) && !quoted.some(token => allJs.includes(token))) errors.push('Listener directo a id inexistente: ' + id);
  }
}

// Guardia específica contra el patrón Higher Rate / +/- Horario:
// un handler de app-main invoca helper sin definición ni import.
const start = appMain.indexOf("const storageConflictReloadBtn = document.getElementById('storageConflictReloadBtn')");
const end = appMain.indexOf("if (!state.events.length && !state.shiftStartedAt && !calls.length)", start);
if (start < 0 || end < 0) {
  errors.push('No se localizó el bloque de wiring principal de app-main.js');
} else {
  let wiring = appMain.slice(start, end);
  wiring = wiring
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/'(?:\\.|[^'\\])*'/g, ' ')
    .replace(/"(?:\\.|[^"\\])*"/g, ' ');

  const known = new Set([
    'Array','Object','String','Number','Boolean','Date','Math','JSON','Intl','Map','Set','RegExp','Error','Promise',
    'URL','Blob','FileReader','Audio','CustomEvent','Event','Element','IntersectionObserver','setTimeout','clearTimeout',
    'setInterval','clearInterval','requestAnimationFrame','fetch','parseInt','parseFloat','isNaN','isFinite',
    'encodeURIComponent','decodeURIComponent','getComputedStyle','if','for','while','switch','catch','function','return',
    'typeof','void','delete','new','throw','await','import','export','super','else','do','try','async',
  ]);

  for (const m of appMain.matchAll(/\bimport\s*\{([\s\S]*?)\}\s*from/g)) {
    for (const part of m[1].split(',')) {
      const hit = part.trim().match(/^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?/);
      if (hit) known.add(hit[2] || hit[1]);
    }
  }
  for (const m of appMain.matchAll(/\b(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)) known.add(m[1]);
  for (const m of appMain.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\b/g)) known.add(m[1]);
  for (const m of wiring.matchAll(/\(([^()]{0,260})\)\s*=>/g)) for (const p of m[1].matchAll(/\b([A-Za-z_$][\w$]*)\b/g)) known.add(p[1]);
  for (const m of wiring.matchAll(/(^|[^\w$])([A-Za-z_$][\w$]*)\s*=>/gm)) known.add(m[2]);

  const unknown = new Set();
  for (const m of wiring.matchAll(/(^|[^\w$\.])([A-Za-z_$][\w$]*)\s*\(/gm)) if (!known.has(m[2])) unknown.add(m[2]);
  for (const name of unknown) errors.push('Handler llama helper no definido/importado: ' + name + '()');
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('UI wiring verificado: ids, modales, rutas, listeners y helpers OK.');
