import test from 'node:test';
import { beforeEach } from 'node:test';
import { callPayMinutes } from '../js/pay-estimate.js';
import { translateText, ui, displayLocale } from '../js/i18n.js';
import assert from 'node:assert/strict';

// Keep Date.now() and generated call-day keys deterministic across midnight.
beforeEach(t => t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-10T18:00:00Z') }));
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setAppCalls, setAppSettings, setAppState } from '../js/app-context.js';
import { configureGameContext, createDefaultGameState, normalizeGameState, onGameCallSaved, onGameCallsChanged } from '../js/game.js';
import { configurePositiveReinforcementContext, createDefaultReinforcementState, normalizeReinforcementState } from '../js/positive-reinforcement.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replaceAll('\r\n', '\n');
const between = (source, startMarker, endMarker) => source.slice(source.indexOf(startMarker), source.indexOf(endMarker, source.indexOf(startMarker)));

function validCallDate(key) {
  const match = String(key).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const date = new Date(Number(match[3]), Number(match[1]) - 1, Number(match[2]));
  return date.getFullYear() === Number(match[3]) && date.getMonth() === Number(match[1]) - 1 && date.getDate() === Number(match[2]) ? date : null;
}

test('el bono manual de Higher Rate no se suma dos veces y los tiles conservan su efecto fuera de ventana', () => {
  const calls = read('js/calls.js');
  const helper = between(calls, 'function manualCallPayWithoutDuplicateRateBonus', 'export function saveManualCall');
  const calculateWithMinutes = new Function('callPayMinutes', 'HIGHER_RATE_TIERS', 'manualCallSelectedRateTile', 'higherRateBonusForCall', 'parseMoney', `${helper}; return manualCallPayWithoutDuplicateRateBonus;`);
  const calculate = (...args) => calculateWithMinutes(callPayMinutes, ...args);
  const tiers = { gold: { bonusPerMin: 0.04 } };
  const withinWindow = calculate(tiers, 'gold', () => ({ amount: 0.12 }), (value) => Number(value) || 0);
  const outsideWindow = calculate(tiers, 'gold', () => null, (value) => Number(value) || 0);
  const durationMin = 3;
  const estimatedGoldPay = 1.62;
  const normalizedBasePay = withinWindow({ durationMin }, estimatedGoldPay);
  assert.equal(Number(normalizedBasePay) + 0.12, estimatedGoldPay);
  assert.equal(outsideWindow({ durationMin }, estimatedGoldPay), estimatedGoldPay);
  assert.match(calls, /if \(!callStart\)\s*\{\s*toast\(translateText\('Elige una hora válida'\)\)/);
});

test('la hora manual vacía no se convierte en 07:00 y las horas futuras no se guardan ni reciben aviso', () => {
  const calls = read('js/calls.js');
  const timeHelper = between(calls, 'function callStartLabelFromHHMM', '// El pago estimado');
  const formatHHMM = (value) => {
    const [hour, minute] = value.split(':').map(Number);
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  };
  const toLabel = new Function('formatHHMM', 'pad', 'translateText', `${timeHelper}; return callStartLabelFromHHMM;`)(formatHHMM, (value) => String(value).padStart(2, '0'), translateText);
  assert.equal(toLabel(''), null);
  assert.equal(toLabel('24:00'), null);
  assert.equal(toLabel('07:05'), '7:05 AM');
  assert.match(calls, /new Date\(candidate\.endISO\)\.getTime\(\) > Date\.now\(\)/);
  assert.match(calls, /La llamada no puede terminar en el futuro/);

  const game = read('js/game.js');
  const eligibilitySource = between(game, 'function callIsRecentlyProductive', 'function higherRateBonusAmount');
  const now = new Date(2026, 8, 28, 12, 0, 0).getTime();
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const dayKeyFor = (date = new FixedDate()) => `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
  const eligible = new Function('todayCallDateKey', 'callDateKeyFromValue', 'Date', `return (${eligibilitySource});`)(dayKeyFor, value => value || null, FixedDate);
  const baseCall = { billable: 'Yes', dropped: 'No', durationMin: 1, importedAt: new FixedDate(now).toISOString(), startISO: new FixedDate(now - 120000).toISOString(), endISO: new FixedDate(now - 60000).toISOString() };
  assert.equal(eligible(baseCall, dayKeyFor()), true);
  assert.equal(eligible({ ...baseCall, startISO: new FixedDate(now + 60000).toISOString(), endISO: new FixedDate(now + 120000).toISOString() }, dayKeyFor()), false);
});

test('CSS de juego cubre motion reducido, layout estrecho y responsive', () => {
  const css = read('css/game.css');
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /animation:\s*none\s*!important/);
  assert.match(css, /transition:\s*none\s*!important/);
  assert.match(css, /@media\s*\(max-width:\s*760px\)/);
  assert.match(css, /@media\s*\(max-width:\s*520px\)/);
  assert.match(css, /min-width:\s*0/);
  assert.match(css, /overflow-wrap:\s*anywhere/);
});

test('build mantiene módulos fuente fuera de public y el worker precarga el CSS de juego', () => {
  const build = read('scripts/build.mjs');
  const worker = read('js/service-worker.js');
  const bundleOptions = read('scripts/bundle-entry.mjs');
  assert.match(bundleOptions, /sourcemap:\s*false/);
  assert.match(bundleOptions, /inlineDynamicImports:\s*true/);
  assert.match(build, /Build listo en public\/ sin sourcemaps ni módulos fuente/);
  assert.match(build, /cp\(path\.join\(root, 'css'\), path\.join\(out, 'css'\)/);
  assert.match(worker, /const SHELL = \[/);
  assert.match(worker, /`\/css\/game\.css\?v=\$\{BUILD_VERSION\}`/);

  const publicRoot = path.join(root, 'public');
  if (fs.existsSync(publicRoot)) {
    assert.equal(fs.existsSync(path.join(publicRoot, 'css', 'game.css')), true);
    assert.equal(fs.existsSync(path.join(publicRoot, 'js')), false);
    const files = [];
    const visit = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) visit(file);
        else files.push(file);
      }
    };
    visit(publicRoot);
    assert.deepEqual(files.filter((file) => file.endsWith('.map')), []);
  }
});

test('avisos y modales de juego se recuperan al cerrar', () => {
  const game = read('js/game.js');
  const appMain = read('js/app-main.js');
  assert.match(game, /app:modal-closed/);
  assert.match(appMain, /new CustomEvent\('app:modal-closed'/);
  assert.doesNotMatch(appMain, /stageClearModal|chestModal/);
  assert.doesNotMatch(read('app.html'), /stageClearModal|chestModal/);
});

test('el sonido del refuerzo solo depende de Celebrar llamadas y del día actual', () => {
  const game = read('js/game.js');
  const tone = between(game, 'function playGameTone', '\nconst gameEventVersions');
  assert.match(tone, /reinforcementFeedbackEnabled\(\)/);
  assert.match(tone, /dayKey === currentGameDayKey\(\)/);
  assert.match(tone, /playGameSound\(kind, \{ allowed \}\)/);
  assert.doesNotMatch(tone, /prefers-reduced-motion/);
});


test('simulación mensual: pegar llamadas usa hooks de juego y reemplaza live provisional', () => {
  const appMain = read('js/app-main.js');
  const calls = read('js/calls.js');
  const game = read('js/game.js');

  assert.match(appMain, /isReplaceableLiveCall/);
  assert.match(appMain, /source:\s*'import'/);
  assert.match(appMain, /onGameCallSaved\(item\.call, 'import'\)/);
  assert.match(appMain, /importedDates\.forEach\(dayKey => onGameCallsChanged\(dayKey\)\)/);
  assert.match(calls, /source:\s*'live'/);
  assert.match(calls, /source:\s*'manual'/);
  assert.match(game, /\['manual', 'live', 'import'\]/);
});

test('simulación mensual: llamadas y Break Lunch no pueden ocupar los mismos minutos', () => {
  const appMain = read('js/app-main.js');
  assert.match(appMain, /subtractCallsFromPauseInterval/);
  assert.match(appMain, /pauseDurationExcludingCalls/);
  assert.match(appMain, /if \(state\.activeCall\) return true/);
  assert.match(appMain, /Termina la llamada antes de iniciar Break\/Lunch/);
  assert.match(appMain, /interruptedPauseRollback = endPause\(\{ silent: true, deferSave: true/);
});

test('simulación mensual: llamada no salta ventana temprana ni reescribe entrada salida manual', () => {
  const appMain = read('js/app-main.js');
  const startCall = appMain.slice(appMain.indexOf('function startCall('), appMain.indexOf('function endCall('));
  assert.doesNotMatch(startCall, /shiftStartTooEarly\(\)/);
  assert.match(startCall, /const needsAutoShift = !state\.shiftStartedAt \|\| !!state\.shiftEndedAt/);
  assert.match(appMain, /startIsAutomatic/);
  assert.match(appMain, /endIsAutomatic/);
});

test('simulación mensual: llamada manual futura se rechaza y live conserva segundos', () => {
  const calls = read('js/calls.js');
  assert.match(calls, /La llamada no puede terminar en el futuro/);
  assert.match(calls, /Math\.round\(\(elapsedMs \/ 60000\) \* 100\) \/ 100/);
  assert.doesNotMatch(calls, /Math\.max\(1, Math\.round\(\(new Date\(endedAtISO\)/);
});


test('segunda simulación mensual: Propio puede corregir una llamada ya importada', () => {
  const appMain = read('js/app-main.js');
  assert.match(appMain, /sameImportedCallIdentity/);
  assert.match(appMain, /replaceAcceptedCall\(c, previous, 'import'\)/);
  assert.match(appMain, /item\.replaces\.importedAt \|\| importTs/);
  assert.match(appMain, /oficial\(es\) corregida\(s\)/);
});

test('segunda simulación mensual: finalizar turno no cierra si falla el guardado de la llamada', () => {
  const appMain = read('js/app-main.js');
  const calls = read('js/calls.js');
  assert.match(calls, /return true;[\s\S]*openManualCallModalFromLiveCall[\s\S]*return false;/);
  assert.match(appMain, /if \(state\.activeCall && !endCall\(\)\) \{[^}]*return false; \}/);
  assert.match(appMain, /return endShift\(\);/);
});

test('segunda simulación mensual: ninguna llamada manual editada o pegada puede terminar en el futuro', () => {
  const calls = read('js/calls.js');
  const appMain = read('js/app-main.js');
  assert.match(calls, /new Date\(candidate\.endISO\)\.getTime\(\) > Date\.now\(\)/);
  assert.match(read('js/call-recovery.js'), /end\.getTime\(\) > Date\.now\(\)/);
  assert.match(appMain, /const endsAt = new Date\(c\.endISO\)\.getTime\(\)/);
  assert.match(appMain, /endsAt > importNow/);
});

test('segunda simulación mensual: descartar no reinicia ACW y reemplazar live corrige su fin', () => {
  const appMain = read('js/app-main.js');
  const discard = appMain.slice(appMain.indexOf('function discardActiveCall()'), appMain.indexOf('function discardActivePause()'));
  assert.doesNotMatch(discard, /lastCallEndedAt\s*=/);
  assert.match(appMain, /state\.lastCallEndedAt = item\.call\.endISO/);
});

test('tercera simulación mensual: Finanzas nunca queda sobreasignada al bajar ganancias', () => {
  const finance = read('js/finance.js');
  const calls = read('js/calls.js');
  const appMain = read('js/app-main.js');
  assert.match(finance, /function financeTrimAssignmentsToEarnings/);
  assert.match(finance, /reverseAllocationOrder/);
  assert.match(finance, /export function financeReconcileAssignmentsToEarnings/);
  assert.match(finance, /const trimmed = financeTrimAssignmentsToEarnings\(\)/);
  assert.match(calls, /financeRunAutoFillCascade\(\);[\s\S]*if \(saveAll\(\) === false\) \{[\s\S]*setAppState\(previous.state\)[\s\S]*return false;[\s\S]*onGameCallsChanged/);
  assert.match(appMain, /function applyImportedPayload[\s\S]*financeRunAutoFillCascade\(\)/);
});

test('tercera simulación mensual: turno nocturno conserva día contable y correcciones oficiales', () => {
  const calls = read('js/calls.js');
  const appMain = read('js/app-main.js');
  assert.match(calls, /const accountingCallDate = belongsToTrackedShift/);
  assert.match(calls, /shiftDayKey: accountingCallDate/);
  assert.match(appMain, /calendarCallDate: call\.callDate, callDate: activeShiftDayKey, shiftDayKey: activeShiftDayKey/);
  assert.match(appMain, /const replacingExisting = \(preserveOfficialIdentity \|\| replacingLive\) \? item\.replaces : null/);
  assert.match(appMain, /callDate: replacingExisting \? replacingExisting\.callDate : item\.call\.callDate/);
  assert.match(appMain, /shiftDayKey: replacingExisting/);
  assert.match(appMain, /startISO ya contiene la fecha real/);
});

test('tercera simulación mensual: horario y meta históricos quedan congelados antes de cambios globales', () => {
  const appMain = read('js/app-main.js');
  const schedule = read('js/schedule.js');
  const settings = read('js/settings.js');
  assert.match(appMain, /export function snapshotHistoricalPlanning/);
  assert.match(appMain, /settings\.scheduleHistoryByDay/);
  assert.match(appMain, /settings\.goalHistoryByDay/);
  assert.match(appMain, /const historical = normalized && settings\.scheduleHistoryByDay/);
  assert.match(appMain, /const historical = normalized && settings\.goalHistoryByDay/);
  assert.match(schedule, /snapshotHistoricalPlanning\(\)/);
  assert.match(settings, /snapshotHistoricalPlanning\(\);[\s\S]*settings\.productiveGoalMin/);
});

test('tercera simulación mensual: ACW se recalcula al editar borrar o vaciar llamadas', () => {
  const calls = read('js/calls.js');
  assert.match(calls, /function reconcileLastCallEndedAt/);
  assert.match(calls, /reconcileLastCallEndedAt\(affectedDayKey\)/);
  assert.match(calls, /reconcileLastCallEndedAt\(dayKey\)/);
});

test('tercera simulación mensual: pegar llamadas de hoy vuelve a auto iniciar el turno', () => {
  const appMain = read('js/app-main.js');
  const importing = appMain.slice(appMain.indexOf('function importCalls('), appMain.indexOf('function clearCallInputBox'));
  assert.match(importing, /autoStartShiftFromCalls\(true\)/);
  assert.match(importing, /!state\.shiftStartedAt && !state\.shiftEndedAt/);
});

test('runtime smoke: la página de historial positivo y Higher Rate siguen conectados', () => {
  const appMain = read('js/app-main.js');
  const higherRate = read('js/higher-rate.js');
  assert.match(appMain, /if \(page === 'achievements'\) renderGame\(\)/);
  assert.match(higherRate, /export async function addHigherRateWindowRow\(\)/);
  assert.match(higherRate, /saveHigherRateWindowsFromEditor\(\)/);
});


test('cuarta simulación mensual: llamadas live antes y después del turno permiten días laborales y bloquean nuevos inicios en días libres', () => {
  const appMain = read('js/app-main.js');
  const startCall = appMain.slice(appMain.indexOf('function startCall('), appMain.indexOf('function endCall(', appMain.indexOf('function startCall(')));
  const disabled = appMain.slice(appMain.indexOf('function callActionDisabled()'), appMain.indexOf('function callActionTimer()', appMain.indexOf('function callActionDisabled()')));
  assert.doesNotMatch(startCall, /shiftStartTooEarly\(\)/);
  assert.match(startCall, /const needsAutoShift = !state\.shiftStartedAt \|\| !!state\.shiftEndedAt/);
  assert.match(startCall, /Shift iniciado automáticamente por llamada/);
  assert.doesNotMatch(disabled, /state\.shiftEndedAt/);
  assert.match(disabled, /!state\.activeCall && liveCallDayIsOff\(\)/);
});

test('cuarta simulación mensual: descartar la primera live revierte el turno que esa llamada abrió', () => {
  const appMain = read('js/app-main.js');
  assert.match(appMain, /autoStartedShift: needsAutoShift/);
  assert.match(appMain, /previousShiftStartedAt/);
  assert.match(appMain, /previousShiftEndedAt/);
  assert.match(appMain, /state\.events = state\.events\.filter\(event => event\?\.id !== discarded\.autoShiftEventId\)/);
  assert.match(appMain, /state\.shiftStartedAt = discarded\.previousShiftStartedAt \|\| null/);
});

test('cuarta simulación mensual: llamada manual de hoy auto inicia turno igual que pegar llamadas', () => {
  const calls = read('js/calls.js');
  assert.match(calls, /autoStartShiftFromCalls/);
  assert.match(calls, /const affectedDayKey = callDateKeyFromValue\(candidate\.callDate\) \|\| callDate/);
  assert.match(calls, /affectedDayKey === todayCallDateKey\(\) && !state\.shiftStartedAt && !state\.shiftEndedAt/);
  assert.match(calls, /autoStartShiftFromCalls\(true\)/);
});

test('cuarta simulación mensual: backup JSON realmente incluye y restaura settings', () => {
  const appMain = read('js/app-main.js');
  const html = read('app.html');
  assert.match(appMain, /schemaVersion: 2, state, calls, settings/);
  assert.match(appMain, /setAppSettings\(restoredSettings\)/);
  assert.match(appMain, /backups viejos \(sin settings\)/i);
  assert.match(html, /respaldo completo: llamadas, turnos, pausas, horario, metas, Finanzas, Higher Rate, gamificación y ajustes/);
});


test('cuarta simulación mensual: Higher Rate cruza medianoche sin perder bonos', () => {
  const hr = read('js/higher-rate.js');
  assert.match(hr, /function higherRateWindowBounds/);
  assert.match(hr, /endMin === startMin/);
  assert.match(hr, /end = new Date\(end\.getFullYear\(\), end\.getMonth\(\), end\.getDate\(\) \+ 1/);
  assert.match(hr, /const windows = settings\.higherRateWindows \|\| \[\]/);
  assert.doesNotMatch(hr, /filter\(w => w\.date === call\.callDate\)/);
  assert.match(hr, /const bounds = higherRateWindowBounds\(w\)/);
  assert.doesNotMatch(hr, /todavía no se soporta, no aplicará a ninguna llamada/);
});


test('cuarta simulación mensual: llamadas antes o después del checkpoint cuentan como presencia sin mover Entrada/Salida', () => {
  const appMain = read('js/app-main.js');
  assert.match(appMain, /function callPresenceIntervalsForDay/);
  assert.match(appMain, /function presenceIntervalsForDay/);
  assert.match(appMain, /presenceIntervalsForDay\(normalized, sessions, lastSlotEnd\)/);
  assert.match(appMain, /callsForDay\(normalized\)\.forEach\(call =>/);
  assert.match(appMain, /return mergeIntervals\(intervals\)\.reduce/);
  assert.match(appMain, /function callPresenceIntervalsForDay/);
  assert.match(appMain, /return mergeIntervals\(intervals\)\.reduce/);
});


test('cuarta simulación mensual: descartar live también revierte efectos de gamificación del auto-turno', () => {
  const appMain = read('js/app-main.js');
  assert.match(appMain, /const gameBeforeAutoShift = needsAutoShift[\s\S]*gameBeforeAutoShift,[\s\S]*if \(needsAutoShift\) onGameShiftStarted\(\{ continued: false, captureState:/);
  assert.match(appMain, /discarded\.gameBeforeAutoShift/);
});


test('promotion list opens its single editor and the editor previews the selected effect before saving', () => {
  const appMain = read('js/app-main.js');
  const higherRate = read('js/higher-rate.js');
  assert.match(higherRate, /export function hrWindowWeekdayLabel\(/);
  assert.match(higherRate, /export function hrTierButtonLabel\(/);
  assert.match(appMain, /hrTierButtonLabel,/);
  assert.match(appMain, /hrWindowWeekdayLabel,/);
  const clickHandler = appMain.slice(appMain.indexOf("document.getElementById('higherRateModal').addEventListener('click'"), appMain.indexOf("document.getElementById('daySelector').addEventListener('change'"));
  assert.match(clickHandler, /saveHigherRateWindowDraft\(/);
  assert.doesNotMatch(higherRate, /data-save-hr-window|data-review-hr-window/);
  assert.doesNotMatch(clickHandler, /saveHigherRateWindowsFromEditor\(\)/);
  const editor=read('js/higher-rate-review.js');
  assert.match(editor,/data-hr-field="date"/); assert.match(editor,/data-hr-field="tier"/);
  assert.match(editor,/data-hr-mode/); assert.match(editor,/context\.apply\(windowId, current.value, current.stamp, current.mode\)/);
});

test('quinta simulación mensual: descartar live iniciada durante Break Lunch restaura la pausa', () => {
  const appMain = read('js/app-main.js');
  assert.match(appMain, /let interruptedPauseRollback = null/);
  assert.match(appMain, /interruptedPauseRollback = endPause\(\{ silent: true, deferSave: true, endedAt: nowISO \}\)/);
  assert.match(appMain, /interruptedPauseRollback,/);
  assert.match(appMain, /rollback\.pauseHistoryId/);
  assert.match(appMain, /rollback\.pauseEndEventId/);
  assert.match(appMain, /state\.activePause = \{ \.\.\.rollback\.pause \}/);
});

test('quinta simulación mensual: respaldo live sobrevive refresh y descartar revierte turno ACW', () => {
  const appMain = read('js/app-main.js');
  const calls = read('js/calls.js');
  assert.match(appMain, /pendingLiveCallBackup: null/);
  assert.match(appMain, /autoSaveLiveCall\(startedAt, endedAt, liveContext\)/);
  assert.match(appMain, /restorePendingLiveCallBackup\(\);/);
  assert.match(calls, /state\.pendingLiveCallBackup = \{/);
  assert.match(calls, /export function restorePendingLiveCallBackup\(\)/);
  assert.match(calls, /function rollbackPendingLiveBackup\(\)/);
  assert.match(calls, /state\.shiftStartedAt = context\.previousShiftStartedAt \|\| null/);
  assert.match(calls, /reconcileLastCallEndedAt\(affectedDayKey\)/);
  assert.doesNotMatch(calls, /let manualCallLiveBackupPending = !!state\.pendingLiveCallBackup/);
});

test('quinta simulación mensual: respaldo live conserva duración decimal y día contable nocturno', () => {
  const calls = read('js/calls.js');
  assert.match(calls, /function callAccountingFields\(start, fallbackCallDate\)/);
  assert.match(calls, /const accountingCallDate = belongsToTrackedShift \? todayCallDateKey\(shiftStart\) : calendarCallDate/);
  assert.match(calls, /const accounting = callAccountingFields\(start, callDate\)/);
  assert.match(calls, /const accounting = callAccountingFields\(start, todayCallDateKey\(start\)\)/);
  assert.match(calls, /Math\.round\(\(elapsedMs \/ 60000\) \* 100\) \/ 100/);
  assert.doesNotMatch(calls, /durationMin = Math\.max\(1, Math\.round\(\(end\.getTime\(\) - start\.getTime\(\)\) \/ 60000\)\)/);
  assert.match(calls, /calendarDayKey = callDateKeyFromValue\(originalCandidate\?\.calendarCallDate\) \|\| todayCallDateKey\(start\)/);
  assert.match(calls, /source: 'live'/);
});

test('quinta simulación mensual: Break Lunch y reset respetan día contable de turno nocturno', () => {
  const appMain = read('js/app-main.js');
  assert.match(appMain, /function currentShiftAccountingDayKey\(fallbackDate = new Date\(\)\)/);
  assert.match(appMain, /state\.activePause = \{ type, startedAt: now\.toISOString\(\), shiftDayKey: dayKey \}/);
  assert.match(appMain, /const pauseRecord = \{ id: makeLocalId\(\), type: endedPause\.type, startedAt: endedPause\.startedAt, endedAt: now, shiftDayKey, startEventId:/);
  assert.match(appMain, /const resetsTrackedShift = trackedShiftDayKey === normalizedDayKey/);
  assert.match(appMain, /belongsToTrackedShift\(p\.startedAt\) \|\| belongsToTrackedShift\(p\.endedAt\)/);
  assert.match(appMain, /const accountingDay = callDateKeyFromValue\(e\?\.shiftDayKey\)/);
});
