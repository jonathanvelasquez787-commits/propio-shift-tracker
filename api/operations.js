import { timingSafeEqual } from 'node:crypto';
import { put, list, get, del } from '@vercel/blob';
import { encryptRecoveryBundle } from '../lib/recovery-crypto.js';

function authorized(req) {
  const expected = process.env.CRON_SECRET;
  const supplied = String(req.headers?.authorization || '').replace(/^Bearer /, '');
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected), b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function rpc(name, body = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST', signal: AbortSignal.timeout(45000),
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('OPERATIONS_DATABASE_UNAVAILABLE');
  return response.json();
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  if (!authorized(req)) return res.status(401).json({ error: 'NOT_AUTHORIZED' });
  const mode = req.query?.mode || 'backup';
  if (!['monitor', 'backup', 'download'].includes(mode)) return res.status(400).json({ error: 'MODE_INVALID' });
  try {
    if (mode === 'download') {
      const date = String(req.query?.date || '');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'DATE_INVALID' });
      const file = await get(`recovery/${date}.json`, { access: 'private' });
      if (!file || file.statusCode !== 200) return res.status(404).json({ error: 'BACKUP_NOT_FOUND' });
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="propio-recovery-${date}.encrypted.json"`);
      const reader = file.stream.getReader();
      for (;;) { const { value, done } = await reader.read(); if (done) break; res.write(value); }
      return res.end();
    }
    if (mode === 'monitor') {
      const readiness = await rpc('production_readiness');
      const app = await fetch('https://propio-shift-tracker.vercel.app/app', { signal: AbortSignal.timeout(15000) });
      const ok = readiness?.ok === true && app.ok
        && app.headers.has('content-security-policy') && app.headers.has('strict-transport-security');
      await rpc('record_operation', { p_kind: 'monitor', p_ok: ok });
      return res.status(ok ? 200 : 503).json({ ok });
    }
    if (!process.env.BACKUP_PUBLIC_KEY || !process.env.BLOB_STORE_ID) throw new Error('BACKUP_NOT_CONFIGURED');
    const day = new Date().toISOString().slice(0, 10);
    const pathname = `recovery/${day}.json`;
    const listing = await list({ prefix: 'recovery/', limit: 100 });
    if (listing.hasMore) throw new Error('BACKUP_RETENTION_REVIEW_REQUIRED');
    if (!listing.blobs.some(blob => blob.pathname === pathname)) {
      const bundle = await rpc('export_recovery_bundle');
      const encrypted = JSON.stringify(encryptRecoveryBundle(bundle, process.env.BACKUP_PUBLIC_KEY));
      // At most 31 daily copies of 8 MiB, well below the Hobby storage quota.
      if (Buffer.byteLength(encrypted) > 8 * 1024 * 1024) throw new Error('BACKUP_TOO_LARGE');
      try {
        await put(pathname, encrypted, { access: 'private', addRandomSuffix: false,
          allowOverwrite: false, contentType: 'application/json' });
      } catch(error) {
        // A simultaneous daily run may have committed the immutable copy.
        const existing = await get(pathname, { access: 'private' });
        if (!existing || existing.statusCode !== 200) throw error;
        await existing.stream.cancel();
      }
    }
    const cutoff = Date.now() - 31 * 86400000;
    const stale = listing.blobs.filter(blob => new Date(blob.uploadedAt).getTime() < cutoff);
    if (stale.length) await del(stale.map(blob => blob.url));
    await rpc('record_operation', { p_kind: 'backup', p_ok: true });
    return res.status(200).json({ ok: true, date: day });
  } catch {
    if (mode !== 'download') {
      try { await rpc('record_operation', { p_kind: mode, p_ok: false }); } catch {}
    }
    console.error(`operations: ${mode} failed`);
    return res.status(503).json({ error: 'OPERATIONS_UNAVAILABLE' });
  }
}
