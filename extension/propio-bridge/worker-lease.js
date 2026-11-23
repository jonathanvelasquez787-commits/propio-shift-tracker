// Permiso de la nube PEDIDO POR EL WORKER (Parte 2 del permiso "con todo cerrado").
// Usa la sesion propia del worker (worker-session.js) y la funcion public.automation_lease_worker (90 s).
// Usa el MISMO dueño (coordinationOwner) que la ventanita, asi que no se pelean: cualquiera renueva el mismo permiso.
// Por ahora SOLO consigue y renueva el permiso y lo muestra; todavia no decide pulsar Start Calls (eso necesita el plan: Partes 3-4).
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../../js/config.js';

export const LEASE_KEY = 'worker-lease-v1';
const MARGIN_MS = 10000;
const short = text => String(text || 'sin detalle').slice(0, 60);

export function createWorkerLease(api, session, { fetchImpl = (...args) => fetch(...args), now = () => Date.now(), supabaseUrl = SUPABASE_URL, anonKey = SUPABASE_ANON_KEY } = {}) {
  let running = null;
  const read = async () => (await api.storage.local.get(LEASE_KEY))?.[LEASE_KEY] || null;
  const write = value => api.storage.local.set({ [LEASE_KEY]: value });

  async function ask({ scope, owner }) {
    const before = (await read()) || {};
    const keep = { ...before, scope, owner, asks: (before.asks || 0) + 1, lastAt: now(), failing: null };
    // Caida corta: si falla la RENOVACION (sin red o error de la nube) y el permiso anterior sigue vigente, se conserva hasta su hora de vencimiento.
    const stillValid = before.result === 'granted' && before.scope === scope && before.owner === owner && Number.isFinite(before.expiresAt) && before.expiresAt > now();
    const failed = (reason, detail) => stillValid ? write({ ...keep, result: 'granted', failing: reason, detail: null, failDetail: detail || null }) : write({ ...keep, result: reason, detail });
    const token = await session.token(scope);
    if (!token) { await write({ ...keep, result: 'no-session' }); return { ok: false, reason: 'no-session' }; }
    const started = now();
    let response;
    try { response = await fetchImpl(`${supabaseUrl}/rest/v1/rpc/automation_lease_worker`, { method: 'POST', headers: { apikey: anonKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_owner: owner }) }); }
    catch (err) { await failed('network', short(err?.message)); return { ok: false, reason: 'network' }; }
    const body = await response.json().catch(() => null);
    const row = Array.isArray(body) ? body[0] : body;
    if (!response.ok) { await failed('error', `${response.status} ${short(body?.message || body?.error)}`); return { ok: false, reason: 'error' }; }
    const ttl = Date.parse(row?.expires_at) - Date.parse(row?.server_now);
    if (row?.granted !== true) { await write({ ...keep, result: 'denied' }); return { ok: false, reason: 'denied' }; }
    const duration = ttl - MARGIN_MS;
    if (!Number.isFinite(duration) || duration <= 0 || now() - started >= duration) { await write({ ...keep, result: 'bad-answer' }); return { ok: false, reason: 'bad-answer' }; }
    await write({ ...keep, result: 'granted', detail: null, grantedAt: started, expiresAt: started + duration });
    return { ok: true, expiresAt: started + duration };
  }
  // Una sola peticion a la vez (la alarma, el arranque y el despertar pueden coincidir).
  function renew(args) {
    if (!args?.scope || !args?.owner) return Promise.resolve({ ok: false, reason: 'no-owner' });
    if (!running) running = ask(args).finally(() => { running = null; });
    return running;
  }
  async function skip(reason) { const before = (await read()) || {}; await write({ ...before, result: reason, lastAt: now() }); return { ok: false, reason }; }
  async function status() {
    const saved = await read();
    if (!saved) return { state: 'none' };
    const valid = saved.result === 'granted' && Number.isFinite(saved.expiresAt) && saved.expiresAt > now();
    return { state: valid ? 'granted' : (saved.result === 'granted' ? 'lapsed' : saved.result || 'none'), expiresAt: saved.expiresAt || null, asks: saved.asks || 0, ...(saved.detail ? { detail: saved.detail } : {}), ...(saved.result === 'granted' && saved.failing ? { failing: saved.failing } : {}) };
  }
  async function clear() { await api.storage.local.remove(LEASE_KEY); }
  return { renew, skip, status, clear };
}
