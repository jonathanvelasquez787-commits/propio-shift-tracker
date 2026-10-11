import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SUPABASE_URL } from '../js/config.js';

const source = fileURLToPath(new URL('../', import.meta.url));

export function committedDeploymentFiles(root = source) {
  const release = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const entries = execFileSync('git', ['ls-tree', '-r', '-z', '--full-tree', release], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
  return { release, files: entries.map(entry => {
    const [metadata, file] = entry.split('\t');
    const [mode, type, hash] = metadata.split(' ');
    if (!['100644', '100755'].includes(mode) || type !== 'blob') throw new Error('UNSUPPORTED_TRACKED_FILE');
    return { file, content: execFileSync('git', ['cat-file', 'blob', hash], { cwd: root, maxBuffer: 16 * 1024 * 1024 }) };
  }) };
}

export function prepareDrillMigration(sql, recoveryOrigin) {
  const origin = new URL(recoveryOrigin);
  if (origin.protocol !== 'https:' || origin.origin === 'https://propio-shift-tracker.vercel.app' || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('ISOLATED_HTTPS_ORIGIN_REQUIRED');
  const isolated = sql.replace(/^(\s*)(select|perform)\s+cron\.schedule\([^\r\n]+\);[ \t]*$/gim,
    (_, indent, command) => `${indent}${command.toLowerCase() === 'perform' ? 'null;' : 'select true;'} -- No scheduled jobs in the recovery drill.`)
    .replaceAll('https://propio-shift-tracker.vercel.app', origin.origin);
  // Unknown/new scheduler syntax must be reviewed, never silently copied.
  if (/\bcron\.schedule\s*\(/i.test(isolated)) throw new Error('UNREVIEWED_RECOVERY_SCHEDULE');
  return isolated;
}

export function validateRecoveryTarget(projectRef, publishableKey, destination) {
  if (!/^[a-z]{20}$/.test(projectRef || '') || new URL(SUPABASE_URL).hostname === `${projectRef}.supabase.co`) throw new Error('RECOVERY_TARGET_MUST_BE_DIFFERENT');
  if (!/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(publishableKey || '')) throw new Error('PUBLISHABLE_KEY_REQUIRED');
  if (!destination || !path.isAbsolute(destination)) throw new Error('ABSOLUTE_DESTINATION_REQUIRED');
  const relative = path.relative(source, destination);
  if (!relative || (!relative.startsWith('..' + path.sep) && !path.isAbsolute(relative))) throw new Error('DESTINATION_MUST_BE_OUTSIDE_REPOSITORY');
  return `https://${projectRef}.supabase.co`;
}

export async function prepareRecoveryDeployment({ projectRef, publishableKey, destination, recoveryOrigin }) {
  const url = validateRecoveryTarget(projectRef, publishableKey, destination);
  prepareDrillMigration('', recoveryOrigin);
  const settingsResponse = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: publishableKey }, signal: AbortSignal.timeout(15000) });
  if (!settingsResponse.ok) throw new Error('RECOVERY_PUBLIC_KEY_REJECTED');
  const auth = await settingsResponse.json();
  if (auth.external?.email !== false || auth.external?.anonymous_users !== false) throw new Error('RECOVERY_AUTH_MUST_DISABLE_EMAIL_AND_ANONYMOUS');
  const committed = committedDeploymentFiles();
  const release = committed.release;
  const files = committed.files.filter(({ file }) => file !== '.env.example');
  if (files.some(({ file }) => /(^|\/)(?:\.env(?:\.[^/]*)?|node_modules|\.vercel|outputs)(\/|$)|\.(?:pem|key|secret|encrypted\.json)$/i.test(file))) throw new Error('UNSAFE_TRACKED_DEPLOYMENT_INPUT');
  await fs.mkdir(destination); // Never merge into or overwrite an existing checkout.
  for (const { file, content } of files) {
    const target = path.join(destination, file);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, /^supabase\/migrations\/.*\.sql$/.test(file) ? prepareDrillMigration(content.toString('utf8'), recoveryOrigin) : content);
  }
  const configPath = path.join(destination, 'js/config.js');
  let config = await fs.readFile(configPath, 'utf8');
  config = config.replace(/export const SUPABASE_URL = '[^']+';/, `export const SUPABASE_URL = '${url}';`)
    .replace(/export const SUPABASE_ANON_KEY = '[^']+';/, `export const SUPABASE_ANON_KEY = '${publishableKey}';`);
  await fs.writeFile(configPath, config);
  const vercelPath = path.join(destination, 'vercel.json');
  const vercel = JSON.parse(await fs.readFile(vercelPath, 'utf8'));
  delete vercel.crons; // A drill must not schedule real backup or monitor jobs.
  for (const group of vercel.headers || []) for (const header of group.headers || []) {
    if (header.key.toLowerCase() === 'content-security-policy') header.value = header.value.replaceAll(new URL(SUPABASE_URL).hostname, `${projectRef}.supabase.co`);
  }
  const globalHeaders = vercel.headers.find(group => group.source === '/(.*)');
  globalHeaders.headers.push({ key: 'X-Robots-Tag', value: 'noindex, nofollow' });
  await fs.writeFile(vercelPath, JSON.stringify(vercel, null, 2));
  await fs.writeFile(path.join(destination, '.vercelignore'), 'node_modules\n.git\n.env*\n*.pem\n*.key\n*.secret\n*.encrypted.json\nrecovery-deployment.json\n');
  const manifest = { preparedAt: new Date().toISOString(), sourceRelease: release,
    target: projectRef, recoveryOrigin: new URL(recoveryOrigin).origin, copiedCommittedFiles: files.length, scheduledVercelJobs: 0, databaseSchedulesRemovedFromMigrations: true,
    existingDatabaseJobs: 'Verify separately; remove any jobs already present before applying drill migrations', auth: { google: auth.external.google, email: false, anonymous: false },
    serverSecretsIncluded: false, productionSourceChanged: false };
  await fs.writeFile(path.join(destination, 'recovery-deployment.json'), JSON.stringify(manifest, null, 2));
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(await prepareRecoveryDeployment({ projectRef: process.argv[2], publishableKey: process.argv[3], destination: process.argv[4], recoveryOrigin: process.argv[5] }))); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
