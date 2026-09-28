import { createHash } from 'node:crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function clean(value, max) {
  return String(value || '').replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[email]').slice(0, max);
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  if (!SUPABASE_URL || !SERVICE_KEY) return res.status(204).end();

  try {
    const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    const fingerprint = createHash('sha256').update(`${SERVICE_KEY}:${ip}`).digest('hex');
    const rate = await fetch(`${SUPABASE_URL}/rest/v1/rpc/consume_rate_limit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      body: JSON.stringify({ p_key: `telemetry:${fingerprint}`, p_limit: 30, p_window_seconds: 300 }),
    });
    if (!rate.ok || !(await rate.json())) return res.status(204).end();

    const body = await readBody(req);
    await fetch(`${SUPABASE_URL}/rest/v1/app_errors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({
        kind: clean(body.kind, 40),
        message: clean(body.message, 500),
        stack: clean(body.stack, 1800),
        path: clean(body.path, 200),
        release: clean(body.release, 80),
        client_hash: fingerprint,
      }),
    });
  } catch {
    // La telemetría nunca debe afectar a la app ni generar otra cascada de errores.
  }
  return res.status(204).end();
}
