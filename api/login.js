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
// Sin dependencias a propósito: fetch global de Node 18+. Un `npm install` en
// una app sin build es una pieza más que se puede romper en un despliegue.

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Freno básico por IP. Las funciones serverless se reciclan, así que esto no
// reemplaza al rate limit de Supabase Auth — solo abarata los picos obvios.
const attempts = new Map();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 12;

function throttled(ip) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now - entry.start > WINDOW_MS) {
    attempts.set(ip, { start: now, count: 1 });
    return false;
  }
  entry.count += 1;
  if (attempts.size > 500) attempts.clear();
  return entry.count > MAX_ATTEMPTS;
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return null;
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return null;
  }
}

async function emailForIdentifier(identifier) {
  if (identifier.includes('@')) return identifier;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/email_for_login_identifier`, {
    method: 'POST',
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

  if (throttled(ip)) {
    res.status(429).json({ error: 'RATE_LIMITED' });
    return;
  }

  const body = await readBody(req);
  const identifier = String((body && body.identifier) || '').trim().toLowerCase();
  const password = String((body && body.password) || '');

  if (!identifier || !password) {
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
      headers: {
        'Content-Type': 'application/json',
        apikey: ANON_KEY,
      },
      body: JSON.stringify({ email, password }),
    });

    const payload = await authRes.json().catch(() => null);

    if (!authRes.ok || !payload || !payload.access_token) {
      const code = String((payload && (payload.error_code || payload.error)) || '').toLowerCase();
      const desc = String((payload && (payload.msg || payload.error_description)) || '').toLowerCase();

      if (code.includes('email_not_confirmed') || desc.includes('email not confirmed')) {
        res.status(401).json({ error: 'EMAIL_NOT_CONFIRMED' });
        return;
      }
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
  } catch (err) {
    console.error('login: error inesperado', err);
    res.status(500).json({ error: 'LOGIN_FAILED' });
  }
}
