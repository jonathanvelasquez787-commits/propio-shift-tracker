import fs from 'node:fs';
// Texto de app-main.js MAS el de bridge-plan.js (donde viven ahora las funciones del plan, el horario y el ACW).
// Las pruebas que cortan funciones por nombre leen esto en vez de app-main.js a secas.
// De bridge-plan.js se quitan los 3 enganches propios (import y los dos stand-ins) que app-main.js ya declara.
// Funciones que ya eran `export` en app-main.js; las demas se quedan sin `export` en el texto combinado.
const EXPORTED = new Set(["WEEKDAYS", "callDateKeyFromValue", "callDateToDate", "callsForDay", "dayConfigFor", "dayEvents", "dayGapRows", "dayIsEffectivelyOff", "dayShiftBounds", "defaultDaySchedule", "ensureWeeklySchedule", "formatHHMM", "getActiveDayKey", "getDayNote", "getPropioBridgePlan", "getWorkSessionStatus", "mergeIntervals", "minutesToHHMM", "pad", "previousCalendarDay", "sameCallDay", "startOfCycleWeek", "toDateFromInputs", "toMinutes", "todayCallDateKey", "weekStartKeyFromDate", "weekdayKeyForDayKey"]);
const read = name => fs.readFileSync(new URL(`../../js/${name}`, import.meta.url), 'utf8');
export function appMainSource() {
  const plan = read('bridge-plan.js')
    .replace(/^import \{ state, settings, calls \} from '\.\/app-context\.js';\n/m, '')
    .replace(/^const localStorageRevision = .*\n/m, '')
    .replace(/^function ui\(parts, \.\.\.values\).*\n/m, '')
    .replace(/^let plan(?:Translate|Guard) = [\s\S]*?\n(?=export function configureBridgePlan)/m, '')
    .replace(/^export function configureBridgePlan[\s\S]*?\n\}\n/m, '');
  const unexport = text => text.replace(/^(\s*)export (function|const) ([A-Za-z0-9_$]+)/gm, (all, sp, kw, name) => EXPORTED.has(name) ? all : `${sp}${kw} ${name}`);
  const main = read('app-main.js')
    .replace(/^import \{[^}]*\} from '\.\/bridge-plan\.js';\n/m, '')
    .replace(/^export \{[^}]*\} from '\.\/bridge-plan\.js';\n/m, '');
  return `${main}\n${unexport(plan)}`;
}
