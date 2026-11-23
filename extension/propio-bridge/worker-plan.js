import { setAppState, setAppSettings, setAppCalls } from '../../js/app-context.js';
import { getPropioBridgePlan } from '../../js/bridge-plan.js';

// Parte 4b: con todo cerrado el worker arma SOLO el plan de Start Calls, con los datos de la nube (Parte 3),
// su permiso de 90 s (Parte 2) y lo que el mismo vio en el portal. Funcion pura: no toca el almacenamiento.
// El permiso que viaja dentro del plan se recorta a 20 s para pasar la comprobacion normal (maximo 25 s).
export const PLAN_LEASE_MS = 20000;
export const LEASE_MARGIN_MS = 5000;
// Parte 4c: si el worker lleva mas de 5 minutos sin poder revisar la nube, no arma plan (no pulsa con datos viejos).
export const DATA_STALE_MS = 300000;

const iso = ms => new Date(ms).toISOString();

export function buildWorkerPlan({ data, leaseExpiresAt, owner, lastEndedAt, now }) {
  if (!data || data.result !== 'ok' || !data.state || typeof data.state !== 'object') return { plan: null, why: 'no-data' };
  // checkedAt = ultima vez que la nube contesto bien (aunque nada haya cambiado); sin ese dato no se confia en la copia.
  const checked = Number(data.checkedAt);
  if (!Number.isFinite(checked) || now - checked > DATA_STALE_MS) return { plan: null, why: 'stale-data' };
  if (!owner) return { plan: null, why: 'no-owner' };
  if (!Number.isFinite(leaseExpiresAt) || leaseExpiresAt - now <= LEASE_MARGIN_MS) return { plan: null, why: 'no-lease' };
  const cloud = JSON.parse(JSON.stringify(data.state)), cloudSettings = JSON.parse(JSON.stringify(data.settings || {}));
  const load = () => {
    setAppState({ shiftStartedAt: null, shiftEndedAt: null, activeCall: null, activePause: null, pauseHistory: [], lastCallEndedAt: null, events: [], ...cloud });
    setAppSettings({ freelancer: { enabled: false }, lateArrivalMode: 'anchor', ...cloudSettings });
    // El worker guarda cada llamada reducida (propioEndISO); el plan la lee como records.propio.endISO.
    setAppCalls((Array.isArray(data.calls) ? data.calls : []).map(call => ({ id: call.id, startISO: call.startISO, endISO: call.endISO, records: { propio: { endISO: call.propioEndISO ?? null } } })));
  };
  load();
  let plan = getPropioBridgePlan(), inferredStart = false;
  if (!plan) return { plan: null, why: 'no-plan' };
  // Decision de Jonathan (opcion B): con todo cerrado nadie toco "Iniciar turno"; el worker da el turno por iniciado
  // a la hora del horario (solo dentro de la ventana de hoy y si el turno no termino).
  if (!cloud.shiftStartedAt && !plan.ended && now >= Date.parse(plan.startAt) && now < Date.parse(plan.endAt)) {
    cloud.shiftStartedAt = plan.startAt;
    if (cloud.shiftEndedAt && Date.parse(cloud.shiftEndedAt) < Date.parse(plan.startAt)) cloud.shiftEndedAt = null;
    load();
    plan = getPropioBridgePlan() || plan;
    inferredStart = true;
  }
  // Lo que el worker vio con sus propios ojos (fin de llamada en el portal) manda sobre la nube, que puede ir atrasada.
  const seen = Date.parse(lastEndedAt);
  if (Number.isFinite(seen) && seen >= Date.parse(plan.startAt) && seen <= now) {
    if (!plan.acw || seen > Date.parse(plan.acw.startedAt)) plan.acw = { startedAt: iso(seen), observedAt: iso(now) };
    plan.hasCall = true;
    if (!plan.lastCallEndedAt || seen > Date.parse(plan.lastCallEndedAt)) plan.lastCallEndedAt = iso(seen);
  }
  plan.automationLease = { version: 1, owner, grantedAt: iso(now - 1000), expiresAt: iso(Math.min(leaseExpiresAt, now + PLAN_LEASE_MS)) };
  return { plan, why: 'ok', inferredStart };
}
