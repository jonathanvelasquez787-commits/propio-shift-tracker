// Public readiness signal. Never return internal checks, account data or keys.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
let cached = null;
let pending = null;

async function probe() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/production_readiness`, {
      method: 'POST',
      signal: AbortSignal.timeout(5000),
      headers: { 'Content-Type': 'application/json', apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      body: '{}',
    });
    const result = response.ok ? await response.json() : null;
    let operationsOk = true;
    if (process.env.BACKUP_PUBLIC_KEY && process.env.CRON_SECRET) {
      const operations = await fetch(`${SUPABASE_URL}/rest/v1/rpc/operations_readiness`, {
        method: 'POST', signal: AbortSignal.timeout(5000),
        headers: { 'Content-Type': 'application/json', apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }, body: '{}',
      });
      const status = operations.ok ? await operations.json() : null;
      operationsOk = status?.monitor === true && status?.external_backup === true;
    }
    const ok = result?.ok === true && operationsOk;
    if (!ok) console.error('health: readiness check failed');
    return ok;
  } catch {
    console.error('health: readiness check unavailable');
    return false;
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  const now = Date.now();
  if (!cached || now >= cached.until) {
    if (!pending) {
      pending = (async () => {
        const ok = Boolean(SUPABASE_URL && SERVICE_KEY) && await probe();
        cached = { ok, until: Date.now() + (ok ? 60000 : 10000) };
      })().finally(() => { pending = null; });
    }
    await pending;
  }
  if (!cached.ok) res.setHeader('Retry-After', '60');
  res.status(cached.ok ? 200 : 503);
  if (req.method === 'HEAD') return res.end();
  return res.json({ ok: cached.ok, release: process.env.VERCEL_GIT_COMMIT_SHA || 'local' });
}
