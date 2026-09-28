import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('auditoría profunda: Higher Rate usa bonus.amount para crítico, XP y FX monetario', () => {
  const game = read('js/game.js');
  assert.match(game, /function higherRateBonusAmount\(call\)/);
  assert.match(game, /Number\(higherRateBonusForCall\(call\)\?\.amount\) \|\| 0/);
  assert.match(game, /const critical = higherRateBonusAmount\(call\) > 0/);
  assert.match(game, /const amount = parseMoney\(call\.pay\) \+ higherRateBonusAmount\(call\)/);
  assert.doesNotMatch(game, /higherRateBonusForCall\(call\) > 0/);
  assert.doesNotMatch(game, /parseMoney\(call\.pay\) \+ higherRateBonusForCall\(call\)/);
});

test('auditoría profunda: editar Higher Rate reconcilia días de gamificación cuyo bono cambió', () => {
  const hr = read('js/higher-rate.js');
  assert.match(hr, /onGameCallsChanged,/);
  assert.match(hr, /function higherRateGameBonusSnapshot\(\)/);
  assert.match(hr, /function reconcileHigherRateGameChanges\(beforeSnapshot\)/);
  const save = hr.slice(hr.indexOf('export function saveHigherRateWindowsFromEditor'), hr.indexOf('export function removeHigherRateWindowRowAt'));
  assert.match(save, /const gameBefore = higherRateGameBonusSnapshot\(\)/);
  assert.match(save, /reconcileHigherRateGameChanges\(gameBefore\)/);
});

test('auditoría profunda: ajustar turno completo no deja Inicio Fin mutados si no hay bloques', () => {
  const schedule = read('js/schedule.js');
  const start = schedule.indexOf('export function applyScheduleOffset');
  const end = schedule.indexOf('function scheduleWeekStartDate', start);
  const body = schedule.slice(start, end);
  const readBlocks = body.indexOf('const current = readBlocksFromEditor()');
  const emptyGuard = body.indexOf('if (!current.length)');
  const startMutation = body.indexOf("const startInput = document.getElementById('dayStartInput')");
  assert.ok(readBlocks >= 0 && emptyGuard >= 0 && startMutation >= 0);
  assert.ok(readBlocks < emptyGuard);
  assert.ok(emptyGuard < startMutation, 'el guard de bloques vacíos debe ocurrir antes de mutar Inicio/Fin');
});

test('auditoría profunda: reiniciar día protege llamada activa o respaldo live pendiente', () => {
  const app = read('js/app-main.js');
  const start = app.indexOf('function resetDay()');
  const end = app.indexOf('export function callDedupeKey', start);
  const body = app.slice(start, end);
  assert.match(body, /activeCallDayKey/);
  assert.match(body, /pendingCallDayKey/);
  assert.match(body, /Guarda o descarta la llamada pendiente antes de reiniciar este día/);
  assert.ok(body.indexOf('Guarda o descarta la llamada pendiente') < body.indexOf('appConfirm('));
});

test('auditoría profunda: pegar solo duplicados omitidos no crea evento falso ni ensucia estado', () => {
  const app = read('js/app-main.js');
  const start = app.indexOf('function importCalls()');
  const end = app.indexOf('function clearCallInputBox', start);
  const body = app.slice(start, end);
  assert.match(body, /const importChangedData = unique\.length \|\| replacedLive\.length \|\| correctedOfficial\.length/);
  assert.match(body, /if \(importChangedData\) \{[\s\S]*setEvent\('import', 'Llamadas importadas'/);
  assert.match(body, /if \(importChangedData\) \{[\s\S]*saveAll\(\)/);
});

test('auditoría profunda: cambios de horario y metas reconcilian metadata del juego', () => {
  const schedule = read('js/schedule.js');
  const settings = read('js/settings.js');
  const app = read('js/app-main.js');
  assert.match(app, /export \{ onGameCallSaved, onGameCallsChanged, onGameDayMetadataChanged \}/);
  assert.match(schedule, /onGameDayMetadataChanged,/);
  assert.match(schedule, /onGameDayMetadataChanged\(todayCallDateKey\(\)\)/);
  assert.match(settings, /onGameDayMetadataChanged,/);
  assert.match(settings, /onGameDayMetadataChanged\(dayKey\)/);
});

test('auditoría profunda: cambiar reglas de racha refresca juego además del reporte', () => {
  const reports = read('js/reports.js');
  const start = reports.indexOf('function updateStreakSkipOffSetting');
  const end = reports.indexOf('function trendChipHtml', start);
  const body = reports.slice(start, end);
  assert.match(body, /onGameDayMetadataChanged\(todayCallDateKey\(\)\)/);
  assert.match(body, /render\(\)/);
  assert.doesNotMatch(body, /renderReportsDashboard\(\)/);
});

test('auditoría profunda: sonidos personalizados detectan fallo real de persistencia y revierten', () => {
  const app = read('js/app-main.js');
  assert.match(app, /export function saveSettingsOnly\(\) \{[\s\S]*return ok;/);
  const productive = app.slice(app.indexOf('function handleProductiveBreakSoundFile'), app.indexOf('function testProductiveBreakSound'));
  assert.match(productive, /const previous = \{/);
  assert.match(productive, /if \(!saveSettingsOnly\(\)\)/);
  assert.match(productive, /settings\.productiveBreakCustomSoundDataUrl = previous\.dataUrl/);
  const alarm = app.slice(app.indexOf('function handleAlarmSoundFile'), app.indexOf('function testAlarmSound'));
  assert.match(alarm, /const previous = \{/);
  assert.match(alarm, /if \(!saveSettingsOnly\(\)\)/);
  assert.match(alarm, /settings\[cfg\.urlKey\] = previous\.dataUrl/);
});


test('auditoría profunda: corrección oficial preserva día contable y bono Higher Rate congelado', () => {
  const app = read('js/app-main.js');
  const start = app.indexOf('const importedRows = accepted.map');
  const end = app.indexOf('const importedDates = new Set()', start);
  const body = app.slice(start, end);
  assert.match(body, /const replacingExisting = \(preserveOfficialIdentity \|\| replacingLive\) \? item\.replaces : null/);
  assert.match(body, /callDate: replacingExisting \? replacingExisting\.callDate : item\.call\.callDate/);
  assert.match(body, /replacingExisting\.shiftDayKey/);
  assert.match(body, /replacingExisting\?\.frozenHigherRateBonus/);
  assert.match(body, /frozenHigherRateBonus: \{ \.\.\.replacingExisting\.frozenHigherRateBonus \}/);
});

test('auditoría profunda: hidratar desde nube restaura snapshot anterior si localStorage falla a mitad', () => {
  const sync = read('js/sync.js');
  const start = sync.indexOf('export function writeLocalSnapshot');
  const end = sync.indexOf('export function applyLightThemeDefault', start);
  const body = sync.slice(start, end);
  assert.match(body, /const previous = \{\}/);
  assert.match(body, /Object\.values\(APP_KEYS\)\.forEach\(\(key\) => window\.localStorage\.removeItem\(key\)\)/);
  assert.match(body, /Object\.entries\(previous\)\.forEach/);
  assert.match(body, /No hay espacio local suficiente para descargar tus datos de la nube/);
  assert.match(body, /throw error/);
});
