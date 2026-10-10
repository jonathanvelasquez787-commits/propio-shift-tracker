import fs from 'node:fs/promises';
import pg from 'pg';
import { decryptRecoveryBundle } from '../lib/recovery-crypto.js';
import { restoreRecoveryBundle } from '../lib/restore-recovery.js';
const [input,keyPath,confirmation]=process.argv.slice(2);
if(!input||!keyPath||confirmation!=='--empty-recovery-target'||!process.env.RECOVERY_DATABASE_URL)
  throw new Error('Usage: set RECOVERY_DATABASE_URL for a migrated empty recovery project, then node scripts/restore-portable-backup.mjs backup.encrypted.json private-key.pem --empty-recovery-target');
const url=new URL(process.env.RECOVERY_DATABASE_URL);
if(url.href.includes('ccqlvcrsoluxoymuhxnl'))throw new Error('PRODUCTION_RESTORE_FORBIDDEN');
const bundle=decryptRecoveryBundle(JSON.parse(await fs.readFile(input,'utf8')),await fs.readFile(keyPath,'utf8'));
const client=new pg.Client({connectionString:process.env.RECOVERY_DATABASE_URL,
  ssl:{rejectUnauthorized:true, ...(process.env.RECOVERY_DATABASE_CA_PATH
    ? {ca:await fs.readFile(process.env.RECOVERY_DATABASE_CA_PATH,'utf8')} : {})}});
await client.connect();
try { console.log(JSON.stringify({restored:true,counts:await restoreRecoveryBundle(client,bundle)})); }
finally { await client.end(); }
