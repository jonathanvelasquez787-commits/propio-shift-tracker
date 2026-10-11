import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SUPABASE_URL } from '../js/config.js';

const source = fileURLToPath(new URL('../', import.meta.url));

export function validateRecoveryTarget(projectRef, publishableKey, destination) {
  if (!/^[a-z]{20}$/.test(projectRef || '') || new URL(SUPABASE_URL).hostname === `${projectRef}.supabase.co`) throw new Error('RECOVERY_TARGET_MUST_BE_DIFFERENT');
  if (!/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(publishableKey || '')) throw new Error('PUBLISHABLE_KEY_REQUIRED');
  if (!destination || !path.isAbsolute(destination)) throw new Error('ABSOLUTE_DESTINATION_REQUIRED');
  const relative = path.relative(source, destination);
  if (!relative || (!relative.startsWith('..' + path.sep) && !path.isAbsolute(relative))) throw new Error('DESTINATION_MUST_BE_OUTSIDE_REPOSITORY');
  return `https://${projectRef}.supabase.co`;
}

export async function prepareRecoveryDeployment({ projectRef, publishableKey, destination }) {
  const url = validateRecoveryTarget(projectRef, publishableKey, destination);
  const settingsResponse = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: publishableKey }, signal: AbortSignal.timeout(15000) });
  if (!settingsResponse.ok) throw new Error('RECOVERY_PUBLIC_KEY_REJECTED');
  const auth = await settingsResponse.json();
  if (auth.external?.email !== false || auth.external?.anonymous_users !== false) throw new Error('RECOVERY_AUTH_MUST_DISABLE_EMAIL_AND_ANONYMOUS');
  const files = execFileSync('git', ['ls-files', '-z'], { cwd: source, encoding: 'utf8' }).split('\0').filter(Boolean);
  if (files.some(file => /(^|\/)(?:\.env(?:\.|$)|node_modules|\.vercel|outputs)(\/|$)|\.(?:pem|key|secret|encrypted\.json)$/i.test(file))) throw new Error('UNSAFE_TRACKED_DEPLOYMENT_INPUT');
  await fs.mkdir(destination); // Never merge into or overwrite an existing checkout.
  for (const file of files) {
    const target = path.join(destination, file);
    const info = await fs.lstat(path.join(source, file));
    if (!info.isFile() || info.isSymbolicLink()) throw new Error('UNSUPPORTED_TRACKED_FILE');
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(path.join(source, file), target);
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
  const manifest = { preparedAt: new Date().toISOString(), sourceRelease: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: source, encoding: 'utf8' }).trim(),
    target: projectRef, copiedTrackedFiles: files.length, scheduledJobs: 0, auth: { google: auth.external.google, email: false, anonymous: false },
    serverSecretsIncluded: false, productionSourceChanged: false };
  await fs.writeFile(path.join(destination, 'recovery-deployment.json'), JSON.stringify(manifest, null, 2));
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(await prepareRecoveryDeployment({ projectRef: process.argv[2], publishableKey: process.argv[3], destination: process.argv[4] }))); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
