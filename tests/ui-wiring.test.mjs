import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('wiring crítico: Higher Rate y ajuste de horario importan sus helpers de UI', () => {
  const app = read('js/app-main.js');
  const higherRate = read('js/higher-rate.js');
  const schedule = read('js/schedule.js');
  assert.match(higherRate, /export function hrTierButtonLabel\(/);
  assert.match(higherRate, /export function hrWindowWeekdayLabel\(/);
  assert.match(app, /hrTierButtonLabel,/);
  assert.match(app, /hrWindowWeekdayLabel,/);
  assert.match(schedule, /export function syncScheduleOffsetUI\(/);
  assert.match(app, /syncScheduleOffsetUI,/);
  assert.match(app, /setContextScheduleOffsetMin\(scheduleOffsetMin - 15\);\s*syncScheduleOffsetUI\(\)/);
  assert.match(app, /setContextScheduleOffsetMin\(scheduleOffsetMin \+ 15\);\s*syncScheduleOffsetUI\(\)/);
});

test('Higher Rate: borrar ventana actualiza settings antes de repintar resúmenes', () => {
  const source = read('js/higher-rate.js');
  const start = source.indexOf('export function removeHigherRateWindowRowAt');
  const end = source.indexOf('function retuneFrozenHigherRateTiers', start);
  const body = source.slice(start, end);
  const assign = body.indexOf('settings.higherRateWindows = current');
  const render = body.indexOf('renderHigherRateWindowsEditor(current)');
  assert.ok(assign >= 0);
  assert.ok(render >= 0);
  assert.ok(assign < render, 'settings debe actualizarse antes de repintar Próximos días/Historial');
});

test('estructura UI: no hay IDs duplicados ni targets de modal/navegación rotos', () => {
  const html = read('app.html');
  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(m => m[1]);
  const set = new Set(ids);
  assert.equal(set.size, ids.length, 'hay IDs duplicados');
  const targetRegexes = [
    /\bdata-close-modal=["']([^"']+)["']/g,
    /\bdata-open-modal=["']([^"']+)["']/g,
    /\baria-controls=["']([^"']+)["']/g,
  ];
  targetRegexes.forEach(re => {
    for (const m of html.matchAll(re)) assert.ok(set.has(m[1]), `target inexistente: ${m[1]}`);
  });
  const pages = new Set(ids.filter(id => /^page[A-Z]/.test(id)).map(id => id.slice(4).toLowerCase()));
  for (const re of [/\bdata-page=["']([^"']+)["']/g, /\bdata-nav-page=["']([^"']+)["']/g]) {
    for (const m of html.matchAll(re)) assert.ok(pages.has(m[1].toLowerCase()), `página inexistente: ${m[1]}`);
  }
});

test('guardas de build incluyen módulos y wiring antes de generar producción', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.match(pkg.scripts.build, /check-module-exports\.mjs/);
  assert.match(pkg.scripts.build, /check-ui-wiring\.mjs/);
  assert.equal(pkg.scripts['check:ui'], 'node scripts/check-ui-wiring.mjs');
});
