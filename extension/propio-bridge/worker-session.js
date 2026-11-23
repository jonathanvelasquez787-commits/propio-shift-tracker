// Sesion PROPIA del worker (Parte 1 del permiso "con todo cerrado").
// La app y el worker NO comparten sesion: los refresh tokens de Supabase rotan, y si los dos renovaran el mismo, uno dejaria al otro
// sin sesion. Aqui el worker inicia SU PROPIA sesion con Google (PKCE, sin supabase-js: solo fetch) y la guarda en chrome.storage.local.
// Nunca toca la sesion de la app (cierra solo la suya con logout scope=local).
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../../js/config.js';

export const SESSION_KEY = 'worker-session-v1';
export const REFRESH_SKEW_MS = 60000;
const KEEPALIVE_MS = 20000;
const b64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const sha256Hex = async text => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))), b => b.toString(16).padStart(2, '0')).join('');
// Mismo calculo que js/boot.js: asi se comprueba que la sesion del worker es de la cuenta vinculada.
export const scopeForUser = userId => sha256Hex('pst-propio-bridge/v1:' + userId);

export function createWorkerSession(api, { fetchImpl = (...args) => fetch(...args), now = () => Date.now(), supabaseUrl = SUPABASE_URL, anonKey = SUPABASE_ANON_KEY, keepAliveMs = KEEPALIVE_MS } = {}) {
  let signingIn = false, refreshing = null;
  const headers = extra => ({ apikey: anonKey, 'Content-Type': 'application/json', ...extra });
  const read = async () => (await api.storage.local.get(SESSION_KEY))[SESSION_KEY] || null;
  const write = value => api.storage.local.set({ [SESSION_KEY]: value });
  const clear = () => api.storage.local.remove ? api.storage.local.remove(SESSION_KEY) : write(null);
  const keep = value => ({ accessToken: value.access_token, refreshToken: value.refresh_token, expiresAt: Number.isFinite(value.expires_at) ? value.expires_at * 1000 : now() + Number(value.expires_in || 3600) * 1000 });

  // Estado para el cuadro (sin red). scope = cuenta vinculada del worker.
  async function status(scope) {
    const saved = await read();
    if (!saved) return { state: 'none' };
    if (saved.expired) return { state: 'expired', email: saved.email || null };
    if (scope && saved.scope !== scope) return { state: 'wrong-account', email: saved.email || null };
    return { state: saved.lastError ? 'offline' : 'ok', email: saved.email || null, expiresAt: saved.expiresAt };
  }

  async function signIn(scope) {
    if (!scope) return { ok: false, reason: 'account-needed' };
    if (signingIn) return { ok: false, reason: 'busy' };
    signingIn = true;
    const keepAlive = setInterval(() => { Promise.resolve(api.storage.local.get(SESSION_KEY)).catch(() => {}); }, keepAliveMs);
    try {
      const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
      const challenge = b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
      const redirect = api.identity.getRedirectURL();
      const url = `${supabaseUrl}/auth/v1/authorize?` + new URLSearchParams({ provider: 'google', redirect_to: redirect, code_challenge: challenge, code_challenge_method: 's256', prompt: 'select_account' });
      let returned;
      try { returned = await api.identity.launchWebAuthFlow({ url, interactive: true }); } catch { return { ok: false, reason: 'login-cancelled' }; }
      let code = null;
      try { code = new URL(returned).searchParams.get('code'); } catch { /* sin direccion */ }
      if (!code) return { ok: false, reason: 'login-no-code' };
      let response;
      try { response = await fetchImpl(`${supabaseUrl}/auth/v1/token?grant_type=pkce`, { method: 'POST', headers: headers(), body: JSON.stringify({ auth_code: code, code_verifier: verifier }) }); }
      catch { return { ok: false, reason: 'login-network' }; }
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.access_token || !body?.refresh_token || !body?.user?.id) return { ok: false, reason: 'login-failed' };
      if (await scopeForUser(body.user.id) !== scope) {
        // Es otra cuenta de Google: se cierra SOLO esa sesion nueva y no se guarda nada.
        try { await fetchImpl(`${supabaseUrl}/auth/v1/logout?scope=local`, { method: 'POST', headers: headers({ Authorization: `Bearer ${body.access_token}` }) }); } catch { /* mejor esfuerzo */ }
        return { ok: false, reason: 'wrong-account' };
      }
      await write({ ...keep(body), scope, email: body.user.email || null, savedAt: now() });
      return { ok: true };
    } finally { clearInterval(keepAlive); signingIn = false; }
  }

  // Devuelve un access token valido (renovando si falta poco) o null. Una sola renovacion a la vez: el refresh token rota.
  async function token(scope) {
    const saved = await read();
    if (!saved || saved.expired || (scope && saved.scope !== scope)) return null;
    if (saved.expiresAt - now() > REFRESH_SKEW_MS) return saved.accessToken;
    if (!refreshing) refreshing = refresh(saved).finally(() => { refreshing = null; });
    return refreshing;
  }
  async function refresh(saved) {
    let response;
    try { response = await fetchImpl(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: headers(), body: JSON.stringify({ refresh_token: saved.refreshToken }) }); }
    catch { await write({ ...saved, lastError: 'network' }); return saved.expiresAt > now() ? saved.accessToken : null; }
    const body = await response.json().catch(() => null);
    if (response.ok && body?.access_token && body?.refresh_token) {
      // Se guarda el refresh token NUEVO antes de devolver nada.
      await write({ ...saved, ...keep(body), lastError: null });
      return body.access_token;
    }
    if (response.status >= 400 && response.status < 500) { await write({ scope: saved.scope, email: saved.email || null, expired: true }); return null; }
    await write({ ...saved, lastError: 'server' });
    return saved.expiresAt > now() ? saved.accessToken : null;
  }

  async function signOut() {
    const saved = await read();
    await clear();
    if (saved?.accessToken && !saved.expired) { try { await fetchImpl(`${supabaseUrl}/auth/v1/logout?scope=local`, { method: 'POST', headers: headers({ Authorization: `Bearer ${saved.accessToken}` }) }); } catch { /* mejor esfuerzo */ } }
    return { ok: true };
  }
  return { status, signIn, token, signOut };
}
