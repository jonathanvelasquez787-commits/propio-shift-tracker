import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { validateRecoveryTarget } from '../scripts/prepare-recovery-deployment.mjs';

test('recovery deployment rejects production, private keys and unsafe destination paths', () => {
  const destination = path.resolve(process.cwd(), '..', 'isolated-recovery');
  const key = 'sb_publishable_' + 'a'.repeat(25);
  assert.throws(() => validateRecoveryTarget('ccqlvcrsoluxoymuhxnl', key, destination), /DIFFERENT/);
  assert.throws(() => validateRecoveryTarget('qcvdexkkrwfkbxkmnohl', 'sb_secret_example', destination), /PUBLISHABLE/);
  assert.throws(() => validateRecoveryTarget('qcvdexkkrwfkbxkmnohl', key, path.join(process.cwd(), 'public')), /OUTSIDE/);
  assert.throws(() => validateRecoveryTarget('qcvdexkkrwfkbxkmnohl', key, 'relative'), /ABSOLUTE/);
  assert.equal(validateRecoveryTarget('qcvdexkkrwfkbxkmnohl', key, destination), 'https://qcvdexkkrwfkbxkmnohl.supabase.co');
});
