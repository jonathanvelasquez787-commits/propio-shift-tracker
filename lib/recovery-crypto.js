import { createCipheriv, createDecipheriv, publicEncrypt, privateDecrypt, randomBytes } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';

export function encryptRecoveryBundle(bundle, publicKey) {
  const key = randomBytes(32), nonce = randomBytes(12);
  try {
    const cipher = createCipheriv('aes-256-gcm', key, nonce);
    const bytes = gzipSync(Buffer.from(JSON.stringify(bundle)));
    const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()]);
    bytes.fill(0);
    return { format: 'pst-encrypted-backup-v2', encryption: 'RSA-OAEP-SHA256+AES-256-GCM',
      createdAt: bundle.created_at,
      wrappedKey: publicEncrypt({ key: publicKey, oaepHash: 'sha256' }, key).toString('base64'),
      nonce: nonce.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') };
  } finally { key.fill(0); }
}

export function decryptRecoveryBundle(envelope, privateKey) {
  if (envelope?.format !== 'pst-encrypted-backup-v2') throw new Error('BACKUP_FORMAT_INVALID');
  const key = privateDecrypt({ key: privateKey, oaepHash: 'sha256' }, Buffer.from(envelope.wrappedKey, 'base64'));
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.nonce, 'base64'));
    decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
    const plaintext = gunzipSync(Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, 'base64')), decipher.final()]));
    try { return JSON.parse(plaintext.toString('utf8')); }
    finally { plaintext.fill(0); }
  } finally { key.fill(0); }
}
