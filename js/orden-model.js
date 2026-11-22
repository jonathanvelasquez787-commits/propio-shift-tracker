// Mi orden: cuanto desorden tuvo el dia y que cuesta. Funciones puras (sin pantalla).
const MIN = 60000;

function overGrace(minutes, graceMin) {
  return Number.isFinite(minutes) && minutes > graceMin ? Math.round(minutes) : 0;
}

// Desorden = empezar tarde, cortar el turno antes o pasarse del tiempo de Break/Lunch.
// Salir tarde NO cuenta. Cada cosa solo cuenta si pasa de la gracia de adherencia.
export function disorderBreakdown({ plannedStart = null, plannedEnd = null, shiftStart = null, shiftEnd = null, pauses = [], graceMin = 0 } = {}) {
  const grace = Math.max(0, Number(graceMin) || 0);
  const late = plannedStart && shiftStart ? overGrace((shiftStart.getTime() - plannedStart.getTime()) / MIN, grace) : 0;
  const early = plannedEnd && shiftEnd ? overGrace((plannedEnd.getTime() - shiftEnd.getTime()) / MIN, grace) : 0;
  let overrun = 0;
  for (const pause of pauses) overrun += overGrace(Number(pause.actualMin) - Number(pause.plannedMin), grace);
  return { late, early, overrun, total: late + early + overrun };
}

export function sanitizeOrderTope(value, fallback = 60) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n >= 1 && n <= 480 ? n : fallback;
}

// Los minutos a favor (trabajados despues de tu hora de salida) pagan primero el desorden del dia.
// remainingMin: desorden que queda sin pagar. debtMin: ese resto con el tope del usuario.
// favorMin: lo que sobra a favor. netMin: favor menos deuda. lostMoney: dinero del desorden sin pagar (sin tope).
// inOrderMoney: lo ganado en un dia que termina sin desorden por pagar.
export function orderSummary({ disorderMin = 0, topeMin = 60, ratePerMin = 0, earned = 0, started = false, favorMin = 0 } = {}) {
  const total = Math.max(0, Math.round(Number(disorderMin) || 0));
  const tope = sanitizeOrderTope(topeMin);
  const favorTotal = Math.max(0, Math.round(Number(favorMin) || 0));
  const remainingMin = Math.max(0, total - favorTotal);
  const favor = Math.max(0, favorTotal - total);
  const debtMin = Math.min(remainingMin, tope);
  const rate = Math.max(0, Number(ratePerMin) || 0);
  return {
    started: !!started,
    disorderMin: total,
    remainingMin,
    topeMin: tope,
    debtMin,
    debtPct: debtMin / tope,
    favorMin: favor,
    favorPct: Math.min(1, favor / tope),
    netMin: favor - debtMin,
    lostMoney: remainingMin * rate,
    inOrderMoney: started && remainingMin === 0 ? Math.max(0, Number(earned) || 0) : 0,
  };
}

// Minutos que trabajaste despues de tu hora de salida (salir tarde NO es desorden: es a favor).
export function favorMinutes(plannedEnd, shiftEnd) {
  if (!plannedEnd || !shiftEnd) return 0;
  const m = (shiftEnd.getTime() - plannedEnd.getTime()) / MIN;
  return m >= 1 ? Math.round(m) : 0;
}

// Estado de un dia: off (libre o sin datos), pending (sin empezar o en curso sin desorden), ok o bad.
export function dayOrderStatus({ started = false, ended = false, disorderMin = 0, off = false } = {}) {
  if (off) return 'off';
  if (!started) return 'pending';
  if (disorderMin > 0) return 'bad';
  return ended ? 'ok' : 'pending';
}

export const ORDER_FORGIVE_EVERY = 5;

// Racha de dias en orden. days va del mas viejo al mas nuevo. Cada 5 dias seguidos se gana 1 dia de
// perdon (guarda uno solo): el primer dia con desorden lo gasta y la racha sigue. Los dias libres no cuentan.
export function walkStreak(days = []) {
  let streak = 0;
  let perdon = 0;
  const forgiven = [];
  for (const day of days) {
    if (day.status === 'ok') {
      streak += 1;
      if (streak % ORDER_FORGIVE_EVERY === 0) perdon = 1;
    } else if (day.status === 'bad') {
      if (perdon > 0) { perdon = 0; forgiven.push(day.key); } else streak = 0;
    }
  }
  const last = days[days.length - 1];
  return { streak, perdon, forgiven, lostToday: !!last && last.status === 'bad' && !forgiven.includes(last.key) };
}

export function rewardProgress(okDays = 0, targetDays = 0) {
  const target = Math.max(0, Math.round(Number(targetDays) || 0));
  const ok = Math.max(0, Math.round(Number(okDays) || 0));
  const pct = target > 0 ? Math.min(100, Math.round((ok / target) * 100)) : 0;
  return { okDays: ok, targetDays: target, pct, done: target > 0 && ok >= target };
}
