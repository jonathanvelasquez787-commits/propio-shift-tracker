// Plan de Start Calls: horario del dia, pausas y ACW. Lo comparten la app y el service worker de la extension
// (el worker carga aqui sus propios datos con setAppState/setAppSettings/setAppCalls de app-context.js).
import { state, settings, calls } from './app-context.js';

// Puntos de enganche: la app los configura; el worker usa los valores por defecto.
let planTranslate = (parts, ...values) => parts.map((part, index) => part + (index < values.length ? values[index] : '')).join('');
let planGuard = () => true;
export function configureBridgePlan({ translate, isCurrent } = {}) {
  if (typeof translate === 'function') planTranslate = translate;
  if (typeof isCurrent === 'function') planGuard = isCurrent;
}
const localStorageRevision = { isCurrent: () => planGuard() };
function ui(parts, ...values) { return planTranslate(parts, ...values); }

    // Horario semanal (plantilla planeada, editable por día)
    export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    export const WEEKDAY_JS_INDEX = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
// Huecos SIN pausa real encima (ni Break ni Lunch marcados con el botón) que duran más de este
// umbral se clasifican automáticamente como "Other" en vez de ACW por default (ej. apagón de luz,
// algo que te sacó de la app varias horas).
export const GAP_AUTO_OTHER_THRESHOLD_MIN = 90;
// Cota de distancia para pauseAssignmentCache: no se fuerza el emparejamiento de una pausa real
// (botón o hueco manual) con un slot planeado (Break1/Break2/Lunch) si quedan a más de esta
// cantidad de minutos de diferencia.
export const PAUSE_SLOT_MAX_DISTANCE_MIN = 180;
// Margen de inactividad para el fallback de HOY sin click en "Iniciar shift"
export const CONNECTED_LIVE_GRACE_MIN = 90;

    // Todo vive en `blocks[]`: cada bloque es {type, start, dur} y Trabajo lleva además goalMin.
    export function defaultDaySchedule(isWorkDay) {
      return {
        off: !isWorkDay,
        start: '07:00',
        end: '15:00',
        blocks: [
          { type: 'work', start: '07:00', dur: 130, goalMin: 120 },
          { type: 'break', start: '09:10', dur: 20 },
          { type: 'work', start: '09:30', dur: 130, goalMin: 120 },
          { type: 'break', start: '11:40', dur: 20 },
          { type: 'work', start: '12:00', dur: 65, goalMin: 60 },
          { type: 'lunch', start: '13:05', dur: 50 },
          { type: 'work', start: '13:55', dur: 65, goalMin: 60 },
        ],
      };
    }

    export function defaultWeeklySchedule() {
      return {
        mon: defaultDaySchedule(true),
        tue: defaultDaySchedule(true),
        wed: defaultDaySchedule(true),
        thu: defaultDaySchedule(true),
        fri: defaultDaySchedule(true),
        sat: defaultDaySchedule(false),
        sun: defaultDaySchedule(false),
      };
    }

    // Migración: días guardados en el formato viejo (breaks[]/lunch{}, de antes de unificar todo en
    // blocks[]) pasan al nuevo modelo la primera vez que se cargan.
    export function migrateDayConfigToBlocks(dayCfg) {
      if (!dayCfg || typeof dayCfg !== 'object') return dayCfg;
      if (Array.isArray(dayCfg.blocks)) return dayCfg;
      const legacyBreaks = Array.isArray(dayCfg.breaks) ? dayCfg.breaks : [];
      const legacyLunch = dayCfg.lunch;
      const blocks = [];
      legacyBreaks.forEach(b => {
        if (b && b.start && Number(b.dur) > 0) blocks.push({ type: 'break', start: formatHHMM(b.start), dur: Number(b.dur) });
      });
      if (legacyLunch && legacyLunch.start && Number(legacyLunch.dur) > 0) {
        blocks.push({ type: 'lunch', start: formatHHMM(legacyLunch.start), dur: Number(legacyLunch.dur) });
      }
      if (!dayCfg.off && dayCfg.start && dayCfg.end) {
        const sortedNonWork = [...blocks].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
        let cursor = toMinutes(formatHHMM(dayCfg.start));
        const endMin = toMinutes(formatHHMM(dayCfg.end));
        sortedNonWork.forEach(b => {
          const s = toMinutes(b.start);
          if (s > cursor) blocks.push({ type: 'work', start: minutesToHHMM(cursor), dur: s - cursor });
          cursor = Math.max(cursor, s + b.dur);
        });
        if (endMin > cursor) blocks.push({ type: 'work', start: minutesToHHMM(cursor), dur: endMin - cursor });
      }
      return { off: !!dayCfg.off, start: dayCfg.start, end: dayCfg.end, blocks };
    }

    // Reemplazar el ratio global de "Margen" por una Meta de Productividad en minutos CONFIGURABLE
    // POR BLOQUE de Trabajo. Migración: un bloque de Trabajo guardado ANTES de este cambio no tiene
    // `goalMin`.
    export function ensureBlockProductivityGoals(dayCfg) {
      if (!dayCfg || !Array.isArray(dayCfg.blocks)) return dayCfg;
      dayCfg.blocks = dayCfg.blocks.map(b => {
        if (!b) return b;
        const type = String(b.type || '').toLowerCase();
        if (type !== 'work') {
          if (Object.prototype.hasOwnProperty.call(b, 'goalMin')) {
            const { goalMin, ...rest } = b;
            return rest;
          }
          return b;
        }
        const dur = Number(b.dur) || 0;
        const goalMin = Number(b.goalMin);
        // `goalMin > 0` trataba un 0 configurado A PROPÓSITO (para desactivar la meta de ese
        // bloque) igual que "sin valor"
        if (Number.isFinite(goalMin) && goalMin >= 0) return b;
        return { ...b, goalMin: dur };
      });
      return dayCfg;
    }

    export function ensureWeeklySchedule() {
      if (!settings.weeklySchedule || typeof settings.weeklySchedule !== 'object') {
        // Migración: si ya tenías un shiftStart/shiftEnd guardado, úsalo como base de lunes a
        // viernes en vez de perder tu configuración anterior.
        const legacyStart = settings.shiftStart ? formatHHMM(settings.shiftStart) : '07:00';
        const legacyEnd = settings.shiftEnd ? formatHHMM(settings.shiftEnd) : '16:00';
        settings.weeklySchedule = defaultWeeklySchedule();
        WEEKDAYS.forEach(k => {
          if (!settings.weeklySchedule[k].off) {
            settings.weeklySchedule[k].start = legacyStart;
            settings.weeklySchedule[k].end = legacyEnd;
          }
        });
      }
      WEEKDAYS.forEach(k => { if (!settings.weeklySchedule[k]) settings.weeklySchedule[k] = defaultDaySchedule(k !== 'sat' && k !== 'sun'); });
      WEEKDAYS.forEach(k => { settings.weeklySchedule[k] = migrateDayConfigToBlocks(settings.weeklySchedule[k]); });
      WEEKDAYS.forEach(k => { settings.weeklySchedule[k] = ensureBlockProductivityGoals(settings.weeklySchedule[k]); });
      if (!settings.lateArrivalMode) settings.lateArrivalMode = 'anchor';
    }

    export function weekdayKeyForDayKey(dayKey) {
      const d = callDateToDate(dayKey) || new Date();
      const idx = d.getDay();
      return Object.keys(WEEKDAY_JS_INDEX).find(k => WEEKDAY_JS_INDEX[k] === idx) || 'mon';
    }

    // Overrides puntuales por semana, anclados al mismo inicio de semana de 7 días que usa "Resumen
    // semanal" (startOfCycleWeek).
    export function weekStartKeyFromDate(date) {
      const d = startOfCycleWeek(date);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }

    export function weekStartKeyForDayKey(dayKey) {
      const d = callDateToDate(dayKey) || new Date();
      return weekStartKeyFromDate(d);
    }

    export function baseDayConfigFor(dayKey) {
      ensureWeeklySchedule();
      const wd = weekdayKeyForDayKey(dayKey);
      const weekKey = weekStartKeyForDayKey(dayKey);
      const overrideWeek = settings.scheduleOverridesByWeek && settings.scheduleOverridesByWeek[weekKey];
      if (overrideWeek && overrideWeek[wd]) return overrideWeek[wd];
      return settings.weeklySchedule[wd] || { off: true };
    }

    export function dayConfigFor(dayKey) {
      const normalized = callDateKeyFromValue(dayKey);
      const historical = normalized && settings.scheduleHistoryByDay && settings.scheduleHistoryByDay[normalized];
      if (historical && typeof historical === 'object') return historical;
      return baseDayConfigFor(dayKey);
    }

    // Un día "libre" del horario se sigue tratando como libre SALVO que haya actividad real ese día
    // (llamadas importadas o un turno real/estimado).
    export function dayIsEffectivelyOff(dayKey) {
      const forced = getDayNote(dayKey)?.forcedStatus;
      if (forced === 'work') return false;
      if (forced === 'off') return true;
      const cfg = dayConfigFor(dayKey);
      if (!cfg || !cfg.off) return false;
      return !dayShiftBounds(dayKey).start;
    }

    // Convierte la config de un día (inicio/fin + blocks[]) en una lista de slots Work/Break/Lunch,
    // SIEMPRE anclados al plan — no a la hora real en que empezaste.
    export function buildPlannedSlots(dayConfig) {
      if (!dayConfig || dayConfig.off || !dayConfig.start || !dayConfig.end) return [];
      const rawBlocks = Array.isArray(dayConfig.blocks) ? dayConfig.blocks : [];
      const points = [];
      rawBlocks.forEach((b) => {
        if (!b || !b.start || !(Number(b.dur) > 0)) return;
        const type = String(b.type || '').toLowerCase();
        if (type !== 'break' && type !== 'lunch' && type !== 'work') return;
        points.push({ rawType: type, start: formatHHMM(b.start), dur: Number(b.dur), goalMin: b.goalMin });
      });
      // El nombre ("Break 1", "Lunch 2", "Bloque 3") se asigna DESPUÉS de ordenar
      // cronológicamente, no según el orden del arreglo.
      const anchor = toMinutes(formatHHMM(dayConfig.start));
      const offset = time => (toMinutes(time) - anchor + 1440) % 1440 + anchor;
      points.sort((a, b) => offset(a.start) - offset(b.start));

      let breakIdx = 1, lunchIdx = 1, workIdx = 1;
      const toHHMM = (mins) => { const m = ((mins % 1440) + 1440) % 1440; return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; };

      return points.map(p => {
        const pStart = offset(p.start);
        let type, name;
        if (p.rawType === 'break') { type = 'Break'; name = `Break ${breakIdx++}`; }
        else if (p.rawType === 'lunch') { type = 'Lunch'; name = `Lunch ${lunchIdx++}`; }
        else { type = 'Work'; name = ui`Bloque ${workIdx++}`; }
        const slot = { type, name, start: toHHMM(pStart), end: toHHMM(pStart + p.dur), startMin: pStart, endMin: pStart + p.dur };
        // Meta de Productividad configurable POR BLOQUE (minutos productivos que ese bloque de
        // Trabajo debe alcanzar, reemplaza al viejo ratio global de "Margen"). Solo los bloques de
        // Work la llevan.
        if (type === 'Work') slot.goalMin = Number(p.goalMin) || 0;
        return slot;
      });
    }

    export function cycleAnchorDate() {
      const parsed = new Date(`${settings.cycleAnchorDate || '2025-05-03'}T00:00:00`);
      return Number.isNaN(parsed.getTime()) ? new Date(2025, 4, 3) : parsed;
    }

    export function pad(n) { return String(n).padStart(2, '0'); }

    export function toDateFromInputs(dateStr, timeStr) {
      const d = String(dateStr).trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      const t = String(timeStr).trim().match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
      if (!d || !t) return null;
      const month = Number(d[1]);
      const day = Number(d[2]);
      const year = Number(d[3]);
      let hour = Number(t[1]);
      const minute = Number(t[2]);
      const ampm = t[3].toUpperCase();
      // Sin este chequeo, `new Date` desborda en silencio (21/09/2026 -> septiembre de 2027) y
      // genera una llamada con una fecha que no corresponde a ningún día navegable.
      if (month < 1 || month > 12 || day < 1 || day > 31 || hour < 1 || hour > 12 || minute > 59) return null;
      if (ampm === 'PM' && hour !== 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;
      const parsed = new Date(year, month - 1, day, hour, minute, 0, 0);
      if (parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null;
      return parsed;
    }

    export function toMinutes(hhmm) {
      const [h, m] = hhmm.split(':').map(Number);
      return h * 60 + m;
    }

    // ACW uses work time; opening an authenticated portal early is only a connection.
    export function computeCurrentAcwStart() {
      const dayKey = todayCallDateKey();
      const bounds = dayWorkBounds(dayKey);
      if (!bounds.live) return null;
      if (state.activePause) return null;
      if (state.activeCall) return null;

      const now = new Date();
      const candidates = [bounds.start.getTime()];
      callsForDay(dayKey).forEach(c => candidates.push(new Date(c.endISO || c.records?.propio?.endISO).getTime()));
      dayPauseIntervals(dayKey).forEach(p => candidates.push(p.end.getTime()));
      // Sin este candidato, colgar una llamada no se reflejaba aquí hasta confirmarla en el modal
      // de guardado.
      if (state.lastCallEndedAt) {
        const record = calls.find(call => call.endISO === state.lastCallEndedAt || call.records?.tool?.endISO === state.lastCallEndedAt || call.records?.propio?.endISO === state.lastCallEndedAt);
        candidates.push(new Date(record?.endISO || state.lastCallEndedAt).getTime());
      }
      const valid = candidates.filter(t => Number.isFinite(t) && t <= now.getTime());
      if (!valid.length) return null;
      return new Date(Math.max(...valid));
    }

export function dateKey(date = new Date()) {
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()}`;
}

export function dateAtTime(baseDate, hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), h, m, 0, 0);
}

// Restar 86400000 ms cae en el día equivocado tras el cambio de hora de primavera.
export function previousCalendarDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
}

export function todayCallDateKey(date = new Date()) {
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()}`;
}

export function callDateKeyFromValue(value) {
  const match = String(value ?? '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[1]}/${match[2]}/${match[3]}` : '';
}

export function callDateToDate(key) {
  return toDateFromInputs(callDateKeyFromValue(key), '12:00 AM');
}

export function sameCallDay(iso, key) {
  if (!iso || !key) return false;
  return dateKey(new Date(iso)) === callDateKeyFromValue(key);
}

// Encuentra el slot planeado (ya efectivo) que corresponde a la pausa REAL en curso
// (state.activePause)
export function findPlannedSlotForActivePause(dayKey) {
  if (!state.activePause) return null;
  const type = String(state.activePause.type || '').toLowerCase();
  const planned = getEffectiveScheduleForDay(dayKey).filter(s => s.type.toLowerCase() === type);
  for (const slot of planned) {
    const assigned = pauseForSlot(slot, dayKey);
    if (assigned && assigned.startedAt === state.activePause.startedAt) return slot;
  }
  return null;
}

// El aviso de fin también aplica a una pausa que no coincide exacto con un slot planeado: se usa la
// duración del primer slot de ese tipo.
export function referenceDurationMinForActivePause(dayKey) {
  if (!state.activePause) return null;
  if (Number(state.activePause.plannedMin) > 0) return Number(state.activePause.plannedMin);
  const matchedSlot = findPlannedSlotForActivePause(dayKey);
  if (matchedSlot) return toMinutes(matchedSlot.end) - toMinutes(matchedSlot.start);

  const type = String(state.activePause.type || '').toLowerCase();
  const planned = getEffectiveScheduleForDay(dayKey).filter(s => s.type.toLowerCase() === type);
  if (!planned.length) return null;
  const first = planned[0];
  return toMinutes(first.end) - toMinutes(first.start);
}

export function mergeIntervals(intervals = []) {
  const sorted = intervals
    .map(i => ({ start: new Date(i.start), end: new Date(i.end) }))
    .filter(i => Number.isFinite(i.start.getTime()) && Number.isFinite(i.end.getTime()) && i.end > i.start)
    .sort((a, b) => a.start - b.start);

  const merged = [];
  for (const current of sorted) {
    const last = merged[merged.length - 1];
    if (!last || current.start > last.end) {
      merged.push({ start: new Date(current.start), end: new Date(current.end) });
    } else if (current.end > last.end) {
      last.end = new Date(current.end);
    }
  }
  return merged;
}

export function overlapMinutesWithIntervals(rangeStart, rangeEnd, intervals = []) {
  const merged = mergeIntervals(intervals);
  let total = 0;
  for (const interval of merged) {
    const start = Math.max(rangeStart.getTime(), interval.start.getTime());
    const end = Math.min(rangeEnd.getTime(), interval.end.getTime());
    if (end > start) total += (end - start) / 60000;
  }
  return total;
}

export function gapKeyFor(prevCall, curCall) {
  return [
    prevCall?.customerId || 'prev',
    prevCall?.startISO || '',
    curCall?.customerId || 'cur',
    curCall?.startISO || '',
  ].join('|');
}

export function getGapAnnotation(dayKey, gapKey) {
  const normalized = callDateKeyFromValue(dayKey);
  const bucket = state.gapAnnotations && state.gapAnnotations[normalized];
  const value = bucket && bucket[gapKey];
  if (!value || typeof value !== 'object') return null;
  return {
    label: String(value.label || 'acw').toLowerCase(),
    note: String(value.note || ''),
  };
}

export function suggestGapLabel(prevEnd, curStart, dayKey = getActiveDayKey()) {
  // Solo se sugiere Break/Lunch si el hueco coincide con una pausa REAL (botón de Break/Lunch
  // realmente presionado). El horario planeado ya NO se usa para sugerir la etiqueta.
  const actual = dayPauseIntervals(dayKey);
  const actualLunch = overlapMinutesWithIntervals(prevEnd, curStart, actual.filter(p => p.type === 'lunch'));
  const actualBreak = overlapMinutesWithIntervals(prevEnd, curStart, actual.filter(p => p.type === 'break'));
  if (actualLunch > 0 && actualLunch >= actualBreak) return 'lunch';
  if (actualBreak > 0) return 'break';
  const rawMinutes = Math.max(0, (curStart.getTime() - prevEnd.getTime()) / 60000);
  if (rawMinutes > GAP_AUTO_OTHER_THRESHOLD_MIN) return 'other';
  return 'acw';
}

export function gapClassification(prevEnd, curStart, dayKey = getActiveDayKey(), gapKey = null) {
  const raw = Math.max(0, (curStart.getTime() - prevEnd.getTime()) / 60000);
  if (raw <= 0) {
    return {
      raw: 0,
      residual: 0,
      displayAmount: 0,
      acw: 0,
      break: 0,
      lunch: 0,
      other: 0,
      possiblePause: 0,
      suggested: 'acw',
      label: 'acw',
      note: '',
      manual: false,
    };
  }

  const actualPauses = mergeIntervals(dayPauseIntervals(dayKey));
  const actualCovered = overlapMinutesWithIntervals(prevEnd, curStart, actualPauses);
  // Scheduled pauses do not subtract time; only real pauses and work presence do.
  const annotation = gapKey ? getGapAnnotation(dayKey, gapKey) : null;
  const connections = annotation ? [] : dayShiftSessions(dayKey);
  const sessions = annotation ? [] : mergeIntervals(dayWorkSessions(dayKey));
  const connectedIntervals = connections.length ? sessions.map(session => ({
    start: new Date(Math.max(prevEnd.getTime(), session.start.getTime())),
    end: new Date(Math.min(curStart.getTime(), session.end.getTime())),
  })).filter(interval => interval.end > interval.start) : null;
  const residual = connectedIntervals
    ? connectedIntervals.reduce((sum, interval) => sum + Math.max(0,
      (interval.end - interval.start) / 60000 - overlapMinutesWithIntervals(interval.start, interval.end, actualPauses)), 0)
    : Math.max(0, raw - actualCovered);
  const suggested = suggestGapLabel(prevEnd, curStart, dayKey);
  const automaticLabel = residual > 1e-9
    ? (residual > GAP_AUTO_OTHER_THRESHOLD_MIN ? 'other' : 'acw') : suggested;
  const label = annotation ? String(annotation.label || suggested).toLowerCase() : automaticLabel;

  // "Posible pausa" solo tiene sentido cuando el hueco NO ha sido clasificado a mano (sin
  // anotación) Y la sugerencia automática detectó algo distinto de ACW plano (break/lunch por
  // overlap real, u "other" por ser muy largo).
  const isUnclassifiedPause = !annotation && label === 'other';

  const displayAmount = (label === 'break' || label === 'lunch')
    ? (annotation ? raw : overlapMinutesWithIntervals(prevEnd, curStart, dayPauseIntervals(dayKey).filter(p => p.type === label))) : residual;

  return {
    raw,
    residual,
    displayAmount,
    acw: label === 'acw' ? residual : 0,
    break: label === 'break' ? residual : 0,
    lunch: label === 'lunch' ? residual : 0,
    other: label === 'other' ? residual : 0,
    possiblePause: isUnclassifiedPause ? residual : 0,
    suggested,
    label,
    note: annotation?.note || '',
    manual: !!annotation,
    actualCovered,
    connectedIntervals,
  };
}

export function dayGapRows(dayKey = getActiveDayKey(), sourceCalls = callsForDay(dayKey)) {
  const normalized = callDateKeyFromValue(dayKey);
  const sorted = [...sourceCalls].sort((a, b) => new Date(a.startISO) - new Date(b.startISO));
  const rows = [];

  if (sorted.length) {
    const connectionStart = dayShiftSessions(normalized)[0]?.start;
    const shiftStart = dayWorkSessions(normalized)[0]?.start;
    const firstCallStart = new Date(sorted[0].startISO);
    if (shiftStart && shiftStart.getTime() < firstCallStart.getTime()) {
      // Keep the original key so existing gap annotations survive the work-time projection.
      const virtualPrev = { customerId: 'shift-start', startISO: (connectionStart || shiftStart).toISOString(), endISO: shiftStart.toISOString() };
      const gapKey = gapKeyFor(virtualPrev, sorted[0]);
      const info = gapClassification(shiftStart, firstCallStart, normalized, gapKey);
      if (info.displayAmount > 0 || info.manual) {
        rows.push({ gapKey, prev: virtualPrev, cur: sorted[0], isShiftStartGap: true, ...info });
      }
    }
  }

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    const gapKey = gapKeyFor(prev, cur);
    const info = gapClassification(new Date(prev.endISO), new Date(cur.startISO), normalized, gapKey);
    if (info.displayAmount > 0 || info.manual) {
      rows.push({ gapKey, prev, cur, ...info });
    }
  }
  return rows;
}

export function defaultActiveDayKey() {
  return todayCallDateKey();
}

export function getActiveDayKey() {
  const normalized = callDateKeyFromValue(state.activeDayKey);
  if (normalized) return normalized;
  return defaultActiveDayKey();
}

export function callsForDay(dayKey = getActiveDayKey(), sourceCalls = calls) {
  const normalized = callDateKeyFromValue(dayKey);
  if (callsForDay.reportReadIndex?.source === sourceCalls) return [...(callsForDay.reportReadIndex.days.get(normalized) || [])];
  return sourceCalls.filter(c => callDateKeyFromValue(c.callDate) === normalized);
}

export function dayEvents(dayKey = getActiveDayKey()) {
  const normalized = callDateKeyFromValue(dayKey);
  return state.events.filter(e => {
    const accountingDay = callDateKeyFromValue(e?.shiftDayKey);
    return accountingDay ? accountingDay === normalized : sameCallDay(e.ts, normalized);
  });
}

export function dayPauseIntervals(dayKey = getActiveDayKey()) {
  const normalized = callDateKeyFromValue(dayKey);
  const arr = state.pauseHistory
    .filter(p => {
      const accountingDay = callDateKeyFromValue(p?.shiftDayKey);
      return accountingDay ? accountingDay === normalized : sameCallDay(p.startedAt, normalized);
    })
    .map(p => ({ type: p.type, start: new Date(p.startedAt), end: new Date(p.endedAt) }));
  const activePauseDay = state.activePause
    ? (callDateKeyFromValue(state.activePause.shiftDayKey)
      || (state.shiftStartedAt ? todayCallDateKey(new Date(state.shiftStartedAt)) : todayCallDateKey(new Date(state.activePause.startedAt))))
    : '';
  if (activePauseDay === normalized && state.activePause && !state.shiftEndedAt) {
    arr.push({ type: state.activePause.type, start: new Date(state.activePause.startedAt), end: new Date() });
  }
  return arr;
}

export function dayShiftBounds(dayKey = getActiveDayKey()) {
  const normalized = callDateKeyFromValue(dayKey);
  const isToday = normalized === todayCallDateKey();
  const events = dayEvents(normalized);
  const startEvent = events.find(e => e.type === 'shift' && /iniciado/i.test(e.title || ''));
  const endEvent = events.find(e => e.type === 'shift' && /terminado/i.test(e.title || ''));
  let start = startEvent ? new Date(startEvent.ts) : null;
  let end = endEvent ? new Date(endEvent.ts) : null;
  let estimated = false;

  // Turno que cruza la medianoche: también pertenece a este día si empezó ayer y cerró hoy.
  const belongsToToday = isToday && !!state.shiftStartedAt && (
    !state.shiftEndedAt ||
    sameCallDay(state.shiftStartedAt, normalized) ||
    sameCallDay(state.shiftEndedAt, normalized)
  );
  if (belongsToToday) {
    start = new Date(state.shiftStartedAt);
    // Con el turno actual aún abierto, `end` debe quedar en null y no caer al evento de cierre
    // anterior del mismo día.
    end = state.shiftEndedAt ? new Date(state.shiftEndedAt) : null;
  }

  // Reconciliar el inicio contra la primera llamada del día completo podía cruzar hacia atrás un
  // turno anterior del mismo día.
  let priorShiftEndBoundary = null;
  if (start) {
    const priorEndEvent = events.find(e => e.type === 'shift' && /terminado/i.test(e.title || '') && new Date(e.ts).getTime() < start.getTime());
    if (priorEndEvent) priorShiftEndBoundary = new Date(priorEndEvent.ts);
  }

  // Reconciliación con llamadas reales solo para límites automáticos. Un inicio/fin manual no se
  // mueve por haber tomado una llamada extra antes o después del turno.
  if (start || end) {
    const dayCalls = callsForDay(normalized);
    if (dayCalls.length) {
      const ordered = [...dayCalls].sort((a, b) => new Date(a.startISO) - new Date(b.startISO));
      const relevantForStart = priorShiftEndBoundary
        ? ordered.filter(c => new Date(c.startISO).getTime() >= priorShiftEndBoundary.getTime())
        : ordered;
      const firstCallStart = relevantForStart.length ? new Date(relevantForStart[0].startISO) : null;
      const lastCallEnd = new Date(ordered[ordered.length - 1].endISO);
      const startIsAutomatic = !startEvent || String(startEvent.meta || '').toLowerCase() === 'auto';
      const endIsAutomatic = !endEvent || String(endEvent.meta || '').toLowerCase() === 'auto';
      if (startIsAutomatic && start && firstCallStart && firstCallStart.getTime() < start.getTime()) start = firstCallStart;
      if (endIsAutomatic && end && lastCallEnd.getTime() > end.getTime()) end = lastCallEnd;
    }
  }

  // Fallback: no hay ningún shift real registrado ese día (ni click de "Iniciar shift" ni evento en
  // el log) pero sí hay llamadas importadas.
  if (!start) {
    const dayCalls = callsForDay(normalized);
    if (dayCalls.length) {
      const ordered = [...dayCalls].sort((a, b) => new Date(a.startISO) - new Date(b.startISO));
      start = new Date(ordered[0].startISO);
      const lastCallEnd = new Date(ordered[ordered.length - 1].endISO);
      if (!isToday) {
        end = lastCallEnd;
      } else {
        const inactivityMin = (new Date().getTime() - lastCallEnd.getTime()) / 60000;
        if (inactivityMin > CONNECTED_LIVE_GRACE_MIN) end = lastCallEnd;
      }
      estimated = true;
    }
  }

  // Turno que arrancó este día pero se cerró en uno posterior: el fin se estima con la última
  // llamada real.
  if (!isToday && start && !end) {
    const dayCalls = callsForDay(normalized);
    if (dayCalls.length) {
      const ordered = [...dayCalls].sort((a, b) => new Date(a.startISO) - new Date(b.startISO));
      const lastCallEnd = new Date(ordered[ordered.length - 1].endISO);
      if (lastCallEnd.getTime() > start.getTime()) {
        end = lastCallEnd;
        estimated = true;
      }
    }
  }

  return {
    start,
    end,
    // 'live' unifica el caso de shift real activo y el estimado de hoy: hay inicio, es hoy, y
    // todavía no hay un fin (ni real ni congelado por inactividad).
    live: isToday && !!start && !end,
    estimated,
  };
}

// DayShiftBounds solo reconstruye el turno MÁS RECIENTE del día (usa `.find` sobre state.events,
// que con `unshift` deja los eventos más nuevos primero).
export function dayShiftSessions(dayKey = getActiveDayKey()) {
  const normalized = callDateKeyFromValue(dayKey);
  const isToday = normalized === todayCallDateKey();

  // El cruce de medianoche se detecta con los eventos del día anterior, no con el turno global
  // actual.
  const prevDayKey = todayCallDateKey(previousCalendarDay(callDateToDate(normalized) || new Date()));
  const combinedEvents = [...dayEvents(prevDayKey), ...dayEvents(normalized)]
    .filter(e => e && e.type === 'shift' && (/iniciado/i.test(e.title || '') || /terminado/i.test(e.title || '')))
    .map(e => ({ ts: new Date(e.ts), isStart: /iniciado/i.test(e.title || '') }))
    .sort((a, b) => a.ts.getTime() - b.ts.getTime());

  const allSessions = [];
  let openStart = null;
  combinedEvents.forEach(ev => {
    if (ev.isStart) {
      if (!openStart) openStart = ev.ts;
    } else if (openStart) {
      allSessions.push({ start: openStart, end: ev.ts, live: false });
      openStart = null;
    }
  });

  if (openStart) {
    const matchesActiveShift = state.shiftStartedAt && !state.shiftEndedAt && Date.parse(state.shiftStartedAt) === openStart.getTime();
    if ((isToday || matchesActiveShift) && !state.shiftEndedAt) {
      // El turno activo conserva su día contable después de medianoche.
      allSessions.push({ start: openStart, end: new Date(), live: true });
    } else if (!isToday) {
      // Turno de un día pasado que nunca se cerró — estimar fin desde la última llamada real de ese
      // día (mismo fallback que dayShiftBounds).
      const dayCallsForOrphan = callsForDay(normalized);
      if (dayCallsForOrphan.length) {
        const orderedOrphan = [...dayCallsForOrphan].sort((a, b) => new Date(a.startISO) - new Date(b.startISO));
        const lastCallEnd = new Date(orderedOrphan[orderedOrphan.length - 1].endISO);
        if (lastCallEnd.getTime() > openStart.getTime()) {
          allSessions.push({ start: openStart, end: lastCallEnd, live: false });
        }
      }
      // Sin llamadas para estimar: se descarta esta sesión huérfana — ver nota de "limitación
      // conocida" arriba.
    }
    // (isToday && state.shiftEndedAt): estado inconsistente raro — se descarta en vez de inventar
    // un cierre.
  }

  // Se filtran solo las sesiones que de verdad tocan `normalized` — las que arrancan ese día, o las
  // que TERMINAN ese día (cubre el cruce de medianoche desde `prevDayKey`).
  const sessions = allSessions.filter(s => dateKey(s.start) === normalized || dateKey(s.end) === normalized);

  if (sessions.length) {
    // Una llamada antes de entrar o después de salir es trabajo real, pero no debe reescribir el
    // checkpoint de Entrada/Salida que el usuario marcó con los controles del turno. Las sesiones
    // explícitas mandan; el fallback por llamadas se usa solo cuando no existe ninguna sesión.
    return sessions;
  }

  // Fallback total: sin ningún evento de shift ni turno global vigente ese día — mismo estimado que
  // ya usa dayShiftBounds (primera/última llamada real).
  const bounds = dayShiftBounds(normalized);
  if (!bounds.start) return [];
  const end = bounds.end || (bounds.live ? new Date() : bounds.start);
  return [{ start: bounds.start, end, live: bounds.live }];
}

export function workStartForConnection(connectionStart, sessionEnd = new Date()) {
  const dayKey = todayCallDateKey(connectionStart);
  const manual = dayEvents(dayKey).some(event => event.type === 'shift' && /iniciado/i.test(event.title || '') &&
    Date.parse(event.ts) === connectionStart.getTime() && String(event.meta || '').toLowerCase() === 'manual');
  if (manual) return new Date(connectionStart);
  const windowFor = key => {
    const cfg = dayConfigFor(key), forced = getDayNote(key)?.forcedStatus;
    if (!cfg || forced === 'off' || (cfg.off && forced !== 'work')) return null;
    const base = callDateToDate(key);
    if (!base) return null;
    const start = dateAtTime(base, formatHHMM(cfg.start)), end = dateAtTime(base, formatHHMM(cfg.end));
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return null;
    if (end <= start) end.setDate(end.getDate() + 1);
    return { start, end };
  };
  const previousKey = todayCallDateKey(previousCalendarDay(connectionStart));
  const previous = windowFor(previousKey);
  const planned = previous && previous.start <= connectionStart && previous.end > connectionStart
    ? previous : windowFor(dayKey);
  if (!planned) return new Date(connectionStart);
  let start = Math.max(connectionStart.getTime(), planned.start.getTime());
  const evidence = [...calls, ...(state.activeCall ? [state.activeCall] : [])];
  for (const call of evidence) {
    const from = Date.parse(call.startISO || call.startedAt), to = Date.parse(call.endISO || new Date().toISOString());
    if (Number.isFinite(from) && Number.isFinite(to) && to > connectionStart.getTime() && from <= sessionEnd.getTime() &&
        from < planned.start.getTime() && (to > from || (call === state.activeCall && to === from))) start = Math.min(start, Math.max(connectionStart.getTime(), from));
  }
  return new Date(start);
}

export function dayWorkSessions(dayKey = getActiveDayKey()) {
  return dayShiftSessions(dayKey).map(session => ({ ...session, connectionStart: session.start, start: workStartForConnection(session.start, session.end) }))
    .filter(session => session.end > session.start || (session.live && session.end.getTime() === session.start.getTime()));
}

export function dayWorkBounds(dayKey = getActiveDayKey()) {
  const bounds = dayShiftBounds(dayKey);
  if (!bounds.start) return bounds;
  const start = workStartForConnection(bounds.start, bounds.end || new Date());
  if (bounds.end && bounds.end < start) return { ...bounds, start: null, live: false };
  return { ...bounds, start, live: bounds.live && new Date() >= start };
}

export function manualGapPauseIntervals(dayKey, type) {
  const normalized = callDateKeyFromValue(dayKey);
  return dayGapRows(normalized)
    .filter(row => row.manual && row.label === type && row.raw > 0)
    .map(row => ({ type, startedAt: row.prev.endISO, endedAt: row.cur.startISO, source: 'gap', gapKey: row.gapKey }));
}

// Las pausas reales conservan su tipo; una clasificación manual sólo agrega los minutos
// restantes. Fusionar por tipo evita duplicar una pausa confirmada sobre el mismo hueco.
export function dayPausesForSlotStats(dayKey) {
  const normalized = callDateKeyFromValue(dayKey);
  const byType = {};
  const push = (type, startedAt, endedAt) => {
    const t = String(type || '').toLowerCase();
    (byType[t] = byType[t] || []).push({ type: t, startedAt, endedAt });
  };
  const real = dayPauseIntervals(normalized);
  real.forEach(p => push(p.type, p.start.toISOString(), p.end.toISOString()));
  ['break', 'lunch'].forEach(t => manualGapPauseIntervals(normalized, t).forEach(p => {
    let segments = [{start: new Date(p.startedAt), end: new Date(p.endedAt)}];
    real.filter(pause => pause.type !== t).forEach(pause => {
      segments = segments.flatMap(segment => {
        if (pause.end <= segment.start || pause.start >= segment.end) return [segment];
        const pieces = [];
        if (pause.start > segment.start) pieces.push({start:segment.start,end:pause.start});
        if (pause.end < segment.end) pieces.push({start:pause.end,end:segment.end});
        return pieces;
      });
    });
    segments.forEach(segment => push(t, segment.start.toISOString(), segment.end.toISOString()));
  }));
  const out = [];
  Object.keys(byType).forEach(t => {
    mergeOverlappingPauseEntries(byType[t]).forEach(p => out.push({ type: t, start: new Date(p.startedAt), end: new Date(p.endedAt) }));
  });
  return out;
}

// El motor de Adherencia minuto a minuto (computeMinuteAdherence, vía dayPauseIntervals) solo
// conocía pausas REALES tomadas con el botón.
export function subtractCallsFromPauseInterval(interval, dayKey) {
  const normalized = callDateKeyFromValue(dayKey);
  let segments = [{ start: new Date(interval.start), end: new Date(interval.end) }]
    .filter(seg => Number.isFinite(seg.start.getTime()) && Number.isFinite(seg.end.getTime()) && seg.end > seg.start);

  const dayCalls = [...callsForDay(normalized)]
    .map(call => ({ start: new Date(call.startISO), end: new Date(call.endISO) }))
    .filter(call => Number.isFinite(call.start.getTime()) && Number.isFinite(call.end.getTime()) && call.end > call.start)
    .sort((a, b) => a.start - b.start);

  dayCalls.forEach(call => {
    segments = segments.flatMap(seg => {
      if (call.end <= seg.start || call.start >= seg.end) return [seg];
      const pieces = [];
      if (call.start > seg.start) pieces.push({ start: seg.start, end: new Date(Math.min(call.start.getTime(), seg.end.getTime())) });
      if (call.end < seg.end) pieces.push({ start: new Date(Math.max(call.end.getTime(), seg.start.getTime())), end: seg.end });
      return pieces.filter(piece => piece.end > piece.start);
    });
  });

  return segments.map(seg => ({ ...seg, type: interval.type }));
}

export function pauseDurationExcludingCalls(startedAt, endedAt, dayKey) {
  const start = new Date(startedAt);
  const end = new Date(endedAt);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return 0;
  return subtractCallsFromPauseInterval({ type: 'pause', start, end }, dayKey)
    .reduce((sum, segment) => sum + Math.max(0, (segment.end - segment.start) / 60000), 0);
}

// Empareja cada slot planeado (Break 1, Break 2, Lunch...) con la pausa REAL más cercana en el
// tiempo, de forma 1:1 (greedy por distancia).
export function mergeOverlappingPauseEntries(history) {
  const withTimes = history
    .map(h => ({ ...h, _s: new Date(h.startedAt).getTime(), _e: new Date(h.endedAt).getTime() }))
    .sort((a, b) => a._s - b._s);
  const merged = [];
  for (const cur of withTimes) {
    const last = merged[merged.length - 1];
    if (last && cur._s < last._e) {
      if (cur._e > last._e) { last.endedAt = cur.endedAt; last._e = cur._e; }
    } else {
      merged.push({ ...cur });
    }
  }
  return merged.map(({ _s, _e, ...rest }) => rest);
}

export function pauseAssignmentCache(dayKey, type) {
  const normalized = callDateKeyFromValue(dayKey);
  const base = callDateToDate(normalized) || new Date();

  const rawHistory = dayPausesForSlotStats(normalized)
    .filter(p => p.type === type)
    .map(p => ({type:p.type,startedAt:p.start.toISOString(),endedAt:p.end.toISOString()}));

  // Fusiona duplicados traslapados (ver mergeOverlappingPauseEntries) ANTES de emparejar contra los
  // slots — así una pausa real + un hueco manual clasificado encima cuentan como UNA sola
  // ocurrencia, no dos.
  const history = mergeOverlappingPauseEntries(rawHistory).map(p => ({
    ...p,
    effectiveDurationMin: pauseDurationExcludingCalls(p.startedAt, p.endedAt, normalized),
  }));

  // Se usa el horario EFECTIVO: buildPlannedSlots en crudo ignora el corrimiento de lateArrivalMode
  // === 'shift'.
  const matchingSlots = getEffectiveScheduleForDay(normalized).filter(s => s.type.toLowerCase() === type);
  const assignment = new Array(matchingSlots.length).fill(null);
  if (!history.length || !matchingSlots.length) return { matchingSlots, assignment };

  const slotStarts = matchingSlots.map(s => {
    const start = dateAtTime(base, s.start);
    start.setDate(start.getDate() + Math.floor((s.startMin ?? 0) / 1440));
    return start.getTime();
  });
  const pairs = [];
  matchingSlots.forEach((s, si) => {
    history.forEach((p, pi) => {
      const dist = Math.abs(new Date(p.startedAt).getTime() - slotStarts[si]);
      // Cota de distancia: no se fuerza el emparejamiento si quedan a más de
      // PAUSE_SLOT_MAX_DISTANCE_MIN minutos.
      if (dist > PAUSE_SLOT_MAX_DISTANCE_MIN * 60000) return;
      pairs.push({ si, pi, dist });
    });
  });
  pairs.sort((a, b) => a.dist - b.dist);

  const usedSlots = new Set();
  const usedPauses = new Set();
  for (const pair of pairs) {
    if (usedSlots.has(pair.si) || usedPauses.has(pair.pi)) continue;
    assignment[pair.si] = history[pair.pi];
    usedSlots.add(pair.si);
    usedPauses.add(pair.pi);
  }

  return { matchingSlots, assignment };
}

export function pauseForSlot(slot, dayKey = getActiveDayKey()) {
  if (slot.type === 'Work') return null;
  const desiredType = String(slot.type).toLowerCase();
  const normalized = callDateKeyFromValue(dayKey);
  const { matchingSlots, assignment } = pauseAssignmentCache(normalized, desiredType);
  const slotIndex = matchingSlots.findIndex(s => s.start === slot.start && s.end === slot.end);
  if (slotIndex === -1) return null;
  return assignment[slotIndex] || null;
}

// "Resumen semanal" usaba semanas Lunes-Domingo fijas, sin relación con cuándo arranca de verdad el
// ciclo de pago de 14 días (cycleAnchorDate/cyclePayOffsetDays, ver Horario).
export function startOfCycleWeek(date = new Date()) {
  const anchor = cycleAnchorDate();
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((target.getTime() - anchor.getTime()) / 86400000);
  const weekIndex = Math.floor(diffDays / 7);
  return new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + weekIndex * 7);
}

// Devuelve { category, comment, forcedStatus } para ese día, o null si no hay nada guardado (ni
// categoría, ni comentario, ni Estado forzado) — mismo criterio de "vacío = no existe" que ya usa
// setGapAnnotation para gapAnnotations.
export function getDayNote(dayKey) {
  const normalized = callDateKeyFromValue(dayKey);
  const raw = state.dayNotes && state.dayNotes[normalized];
  if (!raw || typeof raw !== 'object') return null;
  const category = String(raw.category || '');
  const comment = String(raw.comment || '').trim();
  const forcedStatus = ['work', 'off'].includes(raw.forcedStatus) ? raw.forcedStatus : '';
  if (!category && !comment && !forcedStatus) return null;
  return { category, comment, forcedStatus };
}

    export function currentShiftAccountingDayKey(fallbackDate = new Date()) {
      if (state.shiftStartedAt) {
        const started = new Date(state.shiftStartedAt);
        if (Number.isFinite(started.getTime())) return todayCallDateKey(started);
      }
      return todayCallDateKey(fallbackDate);
    }

    export function formatHHMM(value) {
      const raw = String(value || '').trim();
      const match = raw.match(/^(\d{1,2}):(\d{2})$/);
      if (!match) return '07:00';
      const hh = String(Math.max(0, Math.min(23, Number(match[1])))).padStart(2, '0');
      const mm = String(Math.max(0, Math.min(59, Number(match[2])))).padStart(2, '0');
      return `${hh}:${mm}`;
    }

    // Ventana de turno PLANEADA para un día (por defecto, hoy). Ya no se recalcula
    // según cuándo diste click en "Iniciar" — viene del horario semanal configurado.
    export function getShiftWindow(dayKey = todayCallDateKey()) {
      const cfg = dayConfigFor(dayKey);
      if (!cfg) return { start: '07:00', end: '15:00', off: true };
      // Bug reportado por el usuario: al marcar "Día libre (sin turno)" en Horario, el botón "Iniciar shift" (y el chip "Shift: X – Y") cambiaban al fallback fijo 7:00 AM–4:00 PM en vez de mantener el horario real configurado para ese día.
      return { start: formatHHMM(cfg.start), end: formatHHMM(cfg.end), off: !!cfg.off };
    }

    // Bloques planeados del día (Work/Break/Lunch) anclados al horario semanal.
    export function getEffectiveScheduleForDay(dayKey = getActiveDayKey()) {
      const cfg = dayConfigFor(dayKey);
      // Ver dayIsEffectivelyOff: si el día está marcado "libre" pero sí hubo actividad real, se construyen los bloques igual que si off=false, usando la misma plantilla guardada para ese día de la semana.
      const effectiveCfg = (cfg && cfg.off && !dayIsEffectivelyOff(dayKey)) ? { ...cfg, off: false } : cfg;
      const planned = buildPlannedSlots(effectiveCfg);
      if (!planned.length) return [];
      const mode = settings.lateArrivalMode || 'anchor';
      if (mode !== 'shift') return planned;

      const bounds = dayShiftBounds(dayKey);
      if (!bounds.start || !cfg.start) return planned;
      const plannedStart = dateAtTime(callDateToDate(dayKey) || new Date(), formatHHMM(cfg.start));
      const delay = Math.floor((bounds.start.getTime() - plannedStart.getTime()) / 60000);
      if (delay <= 0) return planned;

      const toHHMM = (mins) => { const m = ((mins % 1440) + 1440) % 1440; return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; };
      return planned.map(slot => ({
        ...slot,
        start: toHHMM(toMinutes(slot.start) + delay),
        end: toHHMM(toMinutes(slot.end) + delay),
        startMin: slot.startMin + delay,
        endMin: slot.endMin + delay,
      }));
    }

    export function reinforcementScheduleIntervals(dayKey) {
      const base = callDateToDate(dayKey);
      if (!base) return [];
      const config = dayConfigFor(dayKey);
      const plannedAnchor = toMinutes(formatHHMM(config?.start));
      const actualStart = settings.lateArrivalMode === 'shift' ? dayShiftBounds(dayKey).start : null;
      const anchor = actualStart ? Math.max(plannedAnchor, actualStart.getHours() * 60 + actualStart.getMinutes()) : plannedAnchor;
      let previousStart = base.getTime();
      const slots = [...getEffectiveScheduleForDay(dayKey)].sort((a, b) => (a.startMin ?? ((toMinutes(a.start) - anchor + 1440) % 1440)) - (b.startMin ?? ((toMinutes(b.start) - anchor + 1440) % 1440)));
      return slots.map((slot) => {
        const start = dateAtTime(base, slot.start);
        if (Number.isFinite(slot.startMin)) start.setDate(start.getDate() + Math.floor(slot.startMin / 1440));
        else if (toMinutes(slot.start) < anchor) start.setDate(start.getDate() + 1);
        while (start.getTime() < previousStart) start.setDate(start.getDate() + 1);
        const end = dateAtTime(base, slot.end);
        if (Number.isFinite(slot.endMin)) end.setDate(end.getDate() + Math.floor(slot.endMin / 1440));
        while (end.getTime() <= start.getTime()) end.setDate(end.getDate() + 1);
        previousStart = start.getTime();
        return { ...slot, startedAt: start.toISOString(), endedAt: end.toISOString() };
      });
    }

    export function minutesToHHMM(mins) {
      const m = ((Math.round(mins) % 1440) + 1440) % 1440;
      return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
    }

export function getWorkSessionStatus() {
  if (!localStorageRevision.isCurrent() || !state.shiftStartedAt) return null;
  const connection = new Date(state.shiftStartedAt), end = new Date(state.shiftEndedAt || Date.now());
  if (!Number.isFinite(connection.getTime()) || !Number.isFinite(end.getTime())) return null;
  const start = workStartForConnection(connection, end);
  const manual = dayEvents(todayCallDateKey(connection)).some(event => event.type === 'shift' && /iniciado/i.test(event.title || '') &&
    Date.parse(event.ts) === connection.getTime() && String(event.meta || '').toLowerCase() === 'manual');
  const callAtStart = [...calls, ...(state.activeCall ? [state.activeCall] : [])].some(call => {
    const from = Date.parse(call.startISO || call.startedAt), to = Date.parse(call.endISO || end.toISOString());
    return Number.isFinite(from) && Number.isFinite(to) && from <= end.getTime() && to > connection.getTime() &&
      (to > from || call === state.activeCall) && Math.max(connection.getTime(), from) === start.getTime();
  });
  return { startedAt: start.toISOString(), endedAt: state.shiftEndedAt || null, manual, callAtStart };
}

export function getPropioBridgePlan() {
  if (!localStorageRevision.isCurrent()) return null;
  const day = new Date(), accountingDay = state.shiftStartedAt && !state.shiftEndedAt ? todayCallDateKey(new Date(state.shiftStartedAt)) : todayCallDateKey(day);
  const planned = getShiftWindow(accountingDay), forced = getDayNote(accountingDay)?.forcedStatus;
  // Modo freelancer: sin horario planeado, la ventana es el turno real abierto (la automatización del puente
  // no debe esperar ni cortar según un horario que el usuario ya no usa).
  const freelance = settings.freelancer?.enabled === true && !(settings.freelancer.since && callDateToDate(settings.freelancer.since) > callDateToDate(accountingDay));
  if (freelance && !state.shiftStartedAt) return null;
  if (!freelance && (forced === 'off' || (planned.off && forced !== 'work'))) return null;
  const base = callDateToDate(accountingDay) || day, start = dateAtTime(base, planned.start), end = dateAtTime(base, planned.end);
  if (end <= start) end.setDate(end.getDate() + 1);
  const activeStart = state.shiftStartedAt && !state.shiftEndedAt ? Date.parse(state.shiftStartedAt) : NaN;
  const effectiveStart = settings.lateArrivalMode === 'shift' ? dayShiftBounds(accountingDay).start?.getTime() : NaN;
  if (Number.isFinite(effectiveStart) && effectiveStart > start.getTime()) {
    const delay = Math.floor((effectiveStart - start.getTime()) / 60000) * 60000;
    start.setTime(start.getTime() + delay); end.setTime(end.getTime() + delay);
  }
  if (freelance) {
    start.setTime(Date.parse(state.shiftStartedAt));
    end.setTime(start.getTime() + 86400000);
  }
  const since = Number.isFinite(activeStart) && activeStart < end.getTime() ? Math.min(activeStart, start.getTime()) : start.getTime();
  const pauseDuration = state.activePause ? referenceDurationMinForActivePause(currentShiftAccountingDayKey(day)) : null;
  const lastPause = state.pauseHistory.filter(pause => Date.parse(pause.endedAt) >= since && Date.parse(pause.endedAt) <= day.getTime())
    .sort((a, b) => Date.parse(b.endedAt) - Date.parse(a.endedAt))[0];
  const scheduledPauses = freelance ? [] : reinforcementScheduleIntervals(accountingDay).filter(slot => ['break','lunch'].includes(String(slot.type).toLowerCase()))
    .map(slot => ({ type: String(slot.type).toLowerCase(), startedAt: Math.max(start.getTime(), Date.parse(slot.startedAt)), endedAt: Math.min(end.getTime(), Date.parse(slot.endedAt)) }))
    .filter(slot => slot.startedAt < slot.endedAt)
    .map(slot => ({ type: slot.type, startedAt: new Date(slot.startedAt).toISOString(), endedAt: new Date(slot.endedAt).toISOString() }));
  const acwStart = computeCurrentAcwStart();
  return { startAt: start.toISOString(), endAt: end.toISOString(),
    workSession: getWorkSessionStatus(),
    scheduledPauses,
    acw: acwStart ? { startedAt: acwStart.toISOString(), observedAt: day.toISOString() } : null,
    lastCallEndedAt: [state.lastCallEndedAt, ...calls.map(call => call.endISO || call.records?.propio?.endISO)]
      .filter(value => Date.parse(value) >= since && Date.parse(value) <= Math.min(day.getTime(), end.getTime()))
      .sort((a, b) => Date.parse(b) - Date.parse(a))[0] || null,
    hasCall: Boolean(state.activeCall) || calls.some(call => Date.parse(call.startISO) >= since && Date.parse(call.startISO) < end.getTime()),
    ended: Boolean(state.shiftEndedAt && Date.parse(state.shiftEndedAt) >= start.getTime()),
    pause: state.activePause ? { type: state.activePause.type, startedAt: state.activePause.startedAt,
      endsAt: Number.isFinite(pauseDuration) && pauseDuration > 0 ? new Date(Date.parse(state.activePause.startedAt) + pauseDuration * 60000).toISOString() : null } : null,
    lastPause: lastPause ? { type: lastPause.type, startedAt: lastPause.startedAt, endedAt: lastPause.endedAt } : null };
}
