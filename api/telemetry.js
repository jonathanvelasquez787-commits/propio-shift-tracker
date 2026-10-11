import { createHash } from 'node:crypto';
import { readJsonObject } from '../lib/request-body.js';
import { cleanDiagnostic as clean } from '../lib/diagnostic-redaction.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function consumeLimit(key, limit) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/consume_rate_limit`, {
    method: 'POST',
    signal: AbortSignal.timeout(5000),
    headers: { 'Content-Type': 'application/json', apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify({ p_key: key, p_limit: limit, p_window_seconds: 300 }),
  });
  return response.ok && (await response.json()) === true;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  if (!SUPABASE_URL || !SERVICE_KEY) return res.status(204).end();

  try {
    const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    const fingerprint = createHash('sha256').update(`${SERVICE_KEY}:${ip}`).digest('hex');
    if (!(await consumeLimit(`telemetry:${fingerprint}`, 30))) return res.status(204).end();
    if (!(await consumeLimit('telemetry:global', 600))) return res.status(204).end();

    const body = await readJsonObject(req, 16 * 1024);
    await fetch(`${SUPABASE_URL}/rest/v1/app_errors`, {
      method: 'POST',
      signal: AbortSignal.timeout(5000),
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
