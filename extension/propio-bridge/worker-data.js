// Datos de la nube leidos POR EL WORKER (Parte 3 del permiso "con todo cerrado").
// Usa la sesion propia del worker (worker-session.js). Solo LEE (user_data y calls) y guarda una copia chica en
// chrome.storage.local['worker-data-v1']. Todavia no decide nada con ellos: el plan se calcula en la Parte 4.
// Los datos pueden ir atrasados si la app se cerro hace poco (autoguardado de sync.js).
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../../js/config.js';

export const DATA_KEY = 'worker-data-v1';
export const CALLS_WINDOW_MS = 3 * 24 * 3600 * 1000;   // el plan solo mira llamadas recientes (hoy y el dia anterior)
export const MAX_SAVED_BYTES = 2 * 1024 * 1024;        // chrome.storage.local sin permiso extra aguanta ~10 MB; aqui nunca pasa de 2 MB
const PAGE = 1000, MAX_PAGES = 20;
const short = text => String(text || 'sin detalle').slice(0, 60);

// El id del usuario sale del propio token (campo "sub"): asi no hace falta tocar la sesion de la Parte 1.
export function userIdFromToken(token) {
  try {
    const body = String(token).split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const sub = JSON.parse(atob(body.padEnd(Math.ceil(body.length / 4) * 4, '='))).sub;
    return typeof sub === 'string' && /^[a-f0-9-]{36}$/i.test(sub) ? sub : null;
  } catch { return null; }
}
// Solo lo que el plan mira de cada llamada (js/app-main.js getPropioBridgePlan: startISO, endISO, records.propio.endISO).
export const projectCall = call => ({ id: call?.id ?? null, startISO: call?.startISO ?? null, endISO: call?.endISO ?? null, propioEndISO: call?.records?.propio?.endISO ?? null });

export function createWorkerData(api, session, { fetchImpl = (...args) => fetch(...args), now = () => Date.now(), supabaseUrl = SUPABASE_URL, anonKey = SUPABASE_ANON_KEY } = {}) {
  let running = null;
  const read = async () => (await api.storage.local.get(DATA_KEY))?.[DATA_KEY] || null;
  const write = value => api.storage.local.set({ [DATA_KEY]: value });

  async function get(token, path, extra = {}) {
    const response = await fetchImpl(`${supabaseUrl}/rest/v1/${path}`, { method: 'GET', headers: { apikey: anonKey, Authorization: `Bearer ${token}`, Accept: 'application/json', ...extra } });
    const body = await response.json().catch(() => null);
    if (!response.ok) { const err = new Error(`${response.status} ${short(body?.message || body?.error)}`); err.http = response.status; throw err; }
    return body;
  }

  async function run({ scope }) {
    const before = (await read()) || {};
    const base = { ...before, scope, checkedAt: now(), lastError: null, lastAttemptAt: null, failDetail: null };
    const token = await session.token(scope);
    if (!token) { await write({ ...base, result: 'no-session' }); return { ok: false, reason: 'no-session' }; }
    const userId = userIdFromToken(token);
    if (!userId) { await write({ ...base, result: 'bad-token' }); return { ok: false, reason: 'bad-token' }; }
    try {
      const head = await get(token, `user_data?select=updated_at&user_id=eq.${userId}`);
      const updatedAt = Array.isArray(head) && head[0]?.updated_at;
      if (!updatedAt) { await write({ ...base, userId, result: 'empty', updatedAt: null }); return { ok: true, changed: false }; }
      // Consulta barata: si la nube no cambio y ya tenemos la copia de esta cuenta, solo se anota la hora de revision.
      if (before.result === 'ok' && before.scope === scope && before.userId === userId && before.updatedAt === updatedAt) { await write({ ...base, userId, result: 'ok', detail: null }); return { ok: true, changed: false }; }
      const rows = await get(token, `user_data?select=state,settings,updated_at,schema_version&user_id=eq.${userId}`);
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row || row.updated_at !== updatedAt) { await write({ ...base, userId, result: 'changed' }); return { ok: false, reason: 'changed' }; }
      const since = new Date(now() - CALLS_WINDOW_MS).toISOString();
      const calls = []; let callsNote = null, total = null;
      for (let page = 0; page < MAX_PAGES; page++) {
        let rowsPage;
        try { rowsPage = await get(token, `calls?select=call_id,payload&user_id=eq.${userId}&payload->>startISO=gte.${encodeURIComponent(since)}&order=call_id`, { Range: `${page * PAGE}-${page * PAGE + PAGE - 1}`, 'Range-Unit': 'items' }); }
        catch (err) { if (page === 0 && (err.http === 404 || err.http === 400)) { callsNote = `llamadas: ${err.message}`; break; } throw err; }
        if (!Array.isArray(rowsPage) || !rowsPage.length) break;
        calls.push(...rowsPage.map(r => projectCall(r.payload)));
        if (rowsPage.length < PAGE) break;
      }
      total = calls.length;
      const latest = await get(token, `user_data?select=updated_at&user_id=eq.${userId}`);
      if (latest?.[0]?.updated_at !== updatedAt) { await write({ ...base, userId, result: 'changed' }); return { ok: false, reason: 'changed' }; }
      const saved = { ...base, userId, result: 'ok', detail: callsNote, updatedAt, fetchedAt: now(), schemaVersion: row.schema_version ?? null, state: row.state ?? null, settings: row.settings ?? null, calls, callsSince: since, callsCount: total };
      if (JSON.stringify(saved).length > MAX_SAVED_BYTES) { const { state, settings, calls: dropped, ...rest } = saved; await write({ ...rest, result: 'too-big', detail: `${Math.round(JSON.stringify(saved).length / 1024)} KB` }); return { ok: false, reason: 'too-big' }; }
      await write(saved);
      return { ok: true, changed: true };
    } catch (err) {
      const reason = err?.http ? 'error' : 'network';
      const why = err?.http ? err.message : short(err?.message);
      // Caida corta: si ya hay una copia buena de ESTA cuenta, se conserva tal cual (result 'ok', con la hora de la ULTIMA revision buena en checkedAt).
      // El plan del worker deja de usarla solo cuando esa hora pasa de 5 min (DATA_STALE_MS); asi una falla corta de internet no apaga el pulso.
      if (before.result === 'ok' && before.scope === scope && before.userId === userId && before.state) {
        await write({ ...before, lastAttemptAt: now(), lastError: reason, failDetail: why });
        return { ok: false, reason };
      }
      await write({ ...base, userId, result: reason, detail: why });
      return { ok: false, reason };
    }
  }
  // Una sola lectura a la vez (la alarma, el arranque y el despertar pueden coincidir).
  function refresh(args) {
    if (!args?.scope) return Promise.resolve({ ok: false, reason: 'no-account' });
    if (!running) running = run(args).finally(() => { running = null; });
    return running;
  }
  async function skip(reason) { const before = (await read()) || {}; await write({ ...before, result: reason, checkedAt: now() }); return { ok: false, reason }; }
  // Lo que el worker entregara al plan (Parte 4): la copia guardada o null.
  async function snapshot() { const saved = await read(); return saved?.result === 'ok' || saved?.updatedAt ? saved : null; }
  async function status() {
    const saved = await read();
    if (!saved) return { state: 'none' };
    return { state: saved.result || 'none', updatedAt: saved.updatedAt || null, fetchedAt: saved.fetchedAt || null, checkedAt: saved.checkedAt || null, calls: saved.callsCount ?? null, ...(saved.detail ? { detail: saved.detail } : {}), ...(saved.result === 'ok' && saved.lastError ? { failing: saved.lastError, failDetail: saved.failDetail || null } : {}) };
  }
  async function clear() { await api.storage.local.remove(DATA_KEY); }
  return { refresh, skip, snapshot, status, clear };
}
