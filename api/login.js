// POST /api/login  { identifier, password } -> { access_token, refresh_token }
//
// Existe por una sola razón: permitir entrar con NOMBRE DE USUARIO sin que el
// navegador pueda traducir usernames a correos. La traducción ocurre acá con la
// service_role key (que nunca sale del servidor) y lo único que vuelve al
// cliente es la sesión ya creada.
//
// Detalle deliberado: el error es SIEMPRE el mismo, exista o no la cuenta. Si
// respondiera distinto para "ese usuario no existe", este endpoint se
// convertiría en un verificador de quién tiene cuenta.
//
// Sin dependencias: fetch y crypto son nativos de Node 20.

import { createHash } from 'node:crypto';
import { readJsonObject, RequestBodyError } from '../lib/request-body.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const MAX_ATTEMPTS = 12;

async function persistentlyThrottled(ip) {
  const key = createHash('sha256').update(`${SERVICE_KEY}:${ip}`).digest('hex');
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/consume_rate_limit`, {
      method: 'POST',
      signal: AbortSignal.timeout(5000),
      headers: {
        'Content-Type': 'application/json',
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ p_key: `login:${key}`, p_limit: MAX_ATTEMPTS, p_window_seconds: 60 }),
    });
    if (response.ok) {
      const allowed = await response.json();
      if (typeof allowed === 'boolean') return !allowed;
    }
  } catch {}
  // A per-instance fallback cannot enforce a shared serverless limit.
  // null means unavailable, distinct from an exhausted quota.
  return null;
}

async function emailForIdentifier(identifier) {
  if (identifier.includes('@')) return identifier;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/email_for_login_identifier`, {
    method: 'POST',
    signal: AbortSignal.timeout(5000),
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ p_identifier: identifier }),
  });
  if (!res.ok) return null;
  const email = await res.json();
  return typeof email === 'string' && email.includes('@') ? email : null;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
    // Se registra en los logs de Vercel, no en la respuesta.
    console.error('login: faltan variables de entorno de Supabase');
    res.status(500).json({ error: 'SERVER_NOT_CONFIGURED' });
    return;
  }

  const ip =
    (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'desconocida';

  const limited = await persistentlyThrottled(ip);
  if (limited === null) {
    console.error('login: shared rate limiter unavailable');
    res.setHeader('Retry-After', '60');
    res.status(503).json({ error: 'LOGIN_UNAVAILABLE' });
    return;
  }
  if (limited) {
    res.setHeader('Retry-After', '60');
    res.status(429).json({ error: 'RATE_LIMITED' });
    return;
  }

  let body;
  try { body = await readJsonObject(req, 8 * 1024); }
  catch (error) {
    return res.status(error instanceof RequestBodyError ? error.status : 400).json({ error: 'LOGIN_FAILED' });
  }
  const identifier = typeof body.identifier === 'string' ? body.identifier.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!identifier || identifier.length > 254 || !password || password.length > 1024) {
    res.status(400).json({ error: 'LOGIN_FAILED' });
    return;
  }

  try {
    const email = await emailForIdentifier(identifier);

    if (!email) {
      // Mismo cuerpo y mismo código que una contraseña incorrecta.
      res.status(401).json({ error: 'LOGIN_FAILED' });
      return;
    }

    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
      headers: {
        'Content-Type': 'application/json',
        apikey: ANON_KEY,
      },
      body: JSON.stringify({ email, password }),
    });

    const payload = await authRes.json().catch(() => null);

    if (!authRes.ok || !payload || !payload.access_token) {
      if (authRes.status === 429) {
        res.status(429).json({ error: 'RATE_LIMITED' });
        return;
      }
      res.status(401).json({ error: 'LOGIN_FAILED' });
      return;
    }

    res.status(200).json({
      access_token: payload.access_token,
      refresh_token: payload.refresh_token,
      expires_in: payload.expires_in,
    });
  } catch {
    console.error('login: unexpected upstream failure');
    res.status(500).json({ error: 'LOGIN_FAILED' });
  }
}
