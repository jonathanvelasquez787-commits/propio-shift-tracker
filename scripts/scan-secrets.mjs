import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

// Report locations and rule names only. Never print a matching credential.
export function secretKinds(text) {
  const found = new Set();
  const rules = [
    ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/],
    ['supabase-secret', /\bsb_secret_[A-Za-z0-9_-]{20,}/],
    ['github-token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})/],
    ['aws-access-key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
    ['stripe-secret', /\bsk_(?:live|test)_[A-Za-z0-9]{20,}/],
    ['google-api-key', /\bAIza[A-Za-z0-9_-]{35}\b/],
    ['google-oauth-secret', /\bGOCSPX-[A-Za-z0-9_-]{20,}/],
    ['resend-key', /\bre_[A-Za-z0-9]{25,}\b/],
    ['slack-token', /\bxox[baprs]-[A-Za-z0-9-]{20,}/],
    ['database-password', /postgres(?:ql)?:\/\/[^\s:@/]+:[^\s@/]{8,}@/],
  ];
  for (const [kind, pattern] of rules) if (pattern.test(text)) found.add(kind);
  for (const match of text.matchAll(/\beyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+\b/g)) {
    try { if (JSON.parse(Buffer.from(match[1], 'base64url')).role === 'service_role') found.add('supabase-service-role'); } catch {}
  }
  return [...found];
}

export function scanRepository({ history = false } = {}) {
  const git = args => execFileSync('git', args, { maxBuffer: 128 * 1024 * 1024 });
  let checked = 0; const findings = [];
  const inspect = (name, bytes) => {
    if (bytes.includes(0)) return;
    checked++;
    for (const kind of secretKinds(bytes.toString('utf8'))) findings.push({ location: name, rule: kind });
  };
  for (const file of git(['ls-files', '-z']).toString().split('\0').filter(Boolean)) {
    if (fs.existsSync(file) && fs.statSync(file).isFile()) inspect(file, fs.readFileSync(file));
  }
  if (history) {
    const ids = git(['rev-list', '--objects', '--all']).toString().split('\n').filter(Boolean).map(line => line.split(' ')[0]);
    // Batch queries avoid spawning one process per historical blob.
    const metadata = execFileSync('git', ['cat-file', '--batch-check'], { input: ids.join('\n') + '\n', maxBuffer: 128 * 1024 * 1024 }).toString();
    const blobs = metadata.split('\n').filter(line => line.split(' ')[1] === 'blob').map(line => line.split(' ')[0]);
    for (let start = 0; start < blobs.length; start += 100) {
      const batch = execFileSync('git', ['cat-file', '--batch'], { input: blobs.slice(start, start + 100).join('\n') + '\n', maxBuffer: 128 * 1024 * 1024 });
      let offset = 0;
      while (offset < batch.length) {
        const newline = batch.indexOf(10, offset);
        const [id, , size] = batch.subarray(offset, newline).toString().split(' ');
        offset = newline + 1;
        inspect(`git-object:${id}`, batch.subarray(offset, offset + Number(size)));
        offset += Number(size) + 1;
      }
    }
  }
  return { checkedTextFilesAndBlobs: checked, history, findings };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = scanRepository({ history: process.argv.includes('--history') });
  console.log(JSON.stringify(result));
  if (result.findings.length) process.exitCode = 1;
}
