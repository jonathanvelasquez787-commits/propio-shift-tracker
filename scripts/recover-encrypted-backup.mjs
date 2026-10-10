import fs from 'node:fs/promises';
import path from 'node:path';
import { createDecipheriv } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const [encryptedPath, keyPath, outputPath] = process.argv.slice(2);
if (!encryptedPath || !keyPath) throw new Error('Usage: node recover-encrypted-backup.mjs encrypted.json key.dpapi [output.json]');
if (process.platform !== 'win32') throw new Error('This key is protected for the original Windows user. Use that account.');
const keyBytes = await fs.readFile(keyPath);
// Only the protected key is passed to PowerShell; no private backup data.
const script = "Add-Type -AssemblyName System.Security; $taskProtected=[Convert]::FromBase64String('" + keyBytes.toString('base64') + "'); $taskKey=[System.Security.Cryptography.ProtectedData]::Unprotect($taskProtected,$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Write([Convert]::ToBase64String($taskKey))";
const { stdout } = await promisify(execFile)('powershell.exe', ['-NoProfile','-NonInteractive','-Command',script], { timeout: 15000 });
const key = Buffer.from(stdout.trim(),'base64');
try {
  const envelope = JSON.parse(await fs.readFile(encryptedPath,'utf8'));
  if (envelope.format !== 'pst-encrypted-backup-v1' || envelope.encryption !== 'AES-256-GCM') throw new Error('Unknown encrypted backup format');
  const decipher = createDecipheriv('aes-256-gcm',key,Buffer.from(envelope.nonce,'base64'));
  decipher.setAuthTag(Buffer.from(envelope.tag,'base64'));
  const plaintext = gunzipSync(Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext,'base64')),decipher.final()]));
  const data = JSON.parse(plaintext.toString('utf8'));
  if (data.format !== 'pst-backup-v1') throw new Error('Unknown backup data format');
  for (const table of ['auth_users','auth_identities','profiles','user_data','calls','daily_backups']) {
    if (!Array.isArray(data[table])) throw new Error('Incomplete backup');
  }
  if (outputPath) {
    await fs.writeFile(path.resolve(outputPath),plaintext,{ flag:'wx' });
  }
  console.log(JSON.stringify({ verified:true, createdAt:data.created_at, accounts:data.auth_users.length, calls:data.calls.length, recoveredTo:outputPath ? path.resolve(outputPath) : null }));
  plaintext.fill(0);
} finally { key.fill(0); }
