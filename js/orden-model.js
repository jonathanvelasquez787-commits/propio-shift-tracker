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

// debtMin: lo que se debe (tope incluido). lostMoney: dinero que el desorden dejo ir (sin tope).
// inOrderMoney: lo ganado en un dia sin desorden. Los minutos a favor llegan en la parte 2.
export function orderSummary({ disorderMin = 0, topeMin = 60, ratePerMin = 0, earned = 0, started = false } = {}) {
  const total = Math.max(0, Math.round(Number(disorderMin) || 0));
  const tope = sanitizeOrderTope(topeMin);
  const debtMin = Math.min(total, tope);
  const rate = Math.max(0, Number(ratePerMin) || 0);
  return {
    started: !!started,
    disorderMin: total,
    topeMin: tope,
    debtMin,
    debtPct: tope > 0 ? debtMin / tope : 0,
    favorMin: 0,
    lostMoney: total * rate,
    inOrderMoney: started && total === 0 ? Math.max(0, Number(earned) || 0) : 0,
  };
}
