const MAX_LEASE_MS = 25000;
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);

export function validateAutomationLease(value, now = Date.now()) {
  if (!value || value.version !== 1 || !uuid(value.owner) || typeof value.grantedAt !== 'string' || typeof value.expiresAt !== 'string') return null;
  const from = Date.parse(value.grantedAt), to = Date.parse(value.expiresAt);
  if (!Number.isFinite(from) || !Number.isFinite(to) || from > now || to <= now || to - from > MAX_LEASE_MS || to <= from) return null;
  return { version: 1, owner: value.owner, grantedAt: value.grantedAt, expiresAt: value.expiresAt };
}

export function createAutomationLease(client, { host = window, now = () => Date.now(), monotonic = () => host.performance.now(), isCurrent = () => true } = {}) {
  let owner = null, enabled = false, stopped = false, generation = 0, pending = null, snapshot = null, deadline = 0, lastRequest = -Infinity;
  const invalidate = () => { snapshot = null; deadline = 0; };
  function current() {
    if (!enabled || stopped || !isCurrent() || monotonic() >= deadline) { invalidate(); return null; }
    const checked = validateAutomationLease(snapshot, now());
    if (!checked) invalidate();
    return checked;
  }
  async function renew() {
    if (!enabled || stopped || !owner || !isCurrent()) return;
    if (pending) {
      if (monotonic() - lastRequest < MAX_LEASE_MS) return;
      generation++; pending = null; invalidate(); lastRequest = -Infinity;
    }
    if (monotonic() - lastRequest < 8000) return;
    const revision = generation, requestedOwner = owner, started = now(), startedMono = monotonic();
    lastRequest = startedMono;
    const request = (async () => {
      try {
        const { data, error } = await client.rpc('automation_lease', { p_owner: requestedOwner });
        if (revision !== generation || !enabled || stopped || !isCurrent()) return;
        const row = Array.isArray(data) ? data[0] : data;
        const ttl = Date.parse(row?.expires_at) - Date.parse(row?.server_now);
        const duration = Math.min(MAX_LEASE_MS, ttl - 5000);
        if (error || row?.granted !== true || !Number.isFinite(duration) || duration <= 0 || now() < started || now() - started >= duration || monotonic() - startedMono >= duration) { invalidate(); return; }
        deadline = startedMono + duration;
        snapshot = { version: 1, owner: requestedOwner, grantedAt: new Date(started).toISOString(), expiresAt: new Date(started + duration).toISOString() };
      } catch { if (revision === generation) invalidate(); }
    })();
    pending = request;
    try { await request; } finally { if (pending === request) pending = null; }
  }
  function request({ owner: nextOwner, enabled: requested } = {}) {
    const next = requested === true && uuid(nextOwner) && isCurrent();
    if (owner !== nextOwner || enabled !== next) { generation++; pending = null; invalidate(); lastRequest = -Infinity; }
    owner = uuid(nextOwner) ? nextOwner : null; enabled = next;
    if (enabled) void renew();
    return current();
  }
  const suspend = () => { generation++; pending = null; invalidate(); lastRequest = -Infinity; };
  const resume = () => { suspend(); if (enabled) void renew(); };
  const timer = host.setInterval(() => { current(); void renew(); }, 4000);
  host.addEventListener('offline', suspend);
  host.addEventListener('pageshow', resume);
  host.document?.addEventListener('resume', resume);
  return { request, current, renew, stop() {
    stopped = true; enabled = false; generation++; invalidate(); host.clearInterval(timer);
    host.removeEventListener('offline', suspend); host.removeEventListener('pageshow', resume); host.document?.removeEventListener('resume', resume);
  } };
}
