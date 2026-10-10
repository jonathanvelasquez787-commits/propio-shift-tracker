import fs from 'node:fs/promises';
import { decryptRecoveryBundle } from '../lib/recovery-crypto.js';
const [input, keyPath, output] = process.argv.slice(2);
if (!input || !keyPath) throw new Error('Usage: node scripts/recover-portable-backup.mjs backup.encrypted.json recovery-private-key.pem [output.json]');
const data = decryptRecoveryBundle(JSON.parse(await fs.readFile(input, 'utf8')), await fs.readFile(keyPath, 'utf8'));
if (data.format !== 'pst-backup-v1') throw new Error('BACKUP_FORMAT_INVALID');
for (const table of ['auth_users','auth_identities','profiles','user_data','calls','daily_backups']) {
  if (!Array.isArray(data[table])) throw new Error('BACKUP_INCOMPLETE');
}
if (output) await fs.writeFile(output, JSON.stringify(data), { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ verified: true, createdAt: data.created_at, accounts: data.auth_users.length,
  calls: data.calls.length, hasSchemaManifest: Boolean(data.schema_manifest), recoveredTo: output || null }));
