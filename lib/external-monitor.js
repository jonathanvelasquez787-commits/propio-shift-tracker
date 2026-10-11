export const PRODUCTION_ORIGIN = 'https://propio-shift-tracker.vercel.app';

export async function probeProduction(fetchImpl = fetch) {
  const checks = await Promise.all(['health', 'app'].map(async name => {
    try {
      const response = await fetchImpl(`${PRODUCTION_ORIGIN}/${name === 'health' ? 'api/health' : 'app'}`, {
        signal: AbortSignal.timeout(15000), headers: { 'Cache-Control': 'no-cache' },
      });
      const issues = response.status === 200 ? [] : [`http_${response.status}`];
      let release;
      if (name === 'health') {
        const data = await response.json();
        if (data.ok !== true) issues.push('not_ready');
        if (typeof data.release === 'string' && /^[a-f0-9]{40}$/.test(data.release)) release = data.release;
      } else {
        for (const header of ['content-security-policy', 'strict-transport-security']) {
          if (!response.headers.get(header)) issues.push(`missing_${header}`);
        }
        if (!/no-store/i.test(response.headers.get('cache-control') || '')) issues.push('missing_no_store');
        await response.body?.cancel();
      }
      return { name, status: response.status, issues, ...(release ? { release } : {}) };
    } catch { return { name, issues: ['request_failed'] }; }
  }));
  return { healthy: checks.every(check => check.issues.length === 0), checks };
}

export function monitorTransition(previous, observation, at) {
  const fingerprint = JSON.stringify(observation.checks.map(({ name, status, issues }) => ({ name, status, issues })));
  const alert = observation.healthy
    ? previous?.healthy === false ? 'recovered' : null
    : previous?.healthy !== false || previous.fingerprint !== fingerprint ? 'failure' : null;
  return { alert, state: { version: 1, checkedAt: at, healthy: observation.healthy, fingerprint,
    ...(observation.checks.find(check => check.release)?.release ? { release: observation.checks.find(check => check.release).release } : {}) } };
}

export async function confirmedObservation({ fetchImpl = fetch, pause = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
  const initial = await probeProduction(fetchImpl);
  if (initial.healthy) return { ...initial, attempts: 1 };
  await pause(10000);
  return { ...await probeProduction(fetchImpl), attempts: 2 };
}
