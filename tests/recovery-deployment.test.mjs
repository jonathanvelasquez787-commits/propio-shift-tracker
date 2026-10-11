import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { validateRecoveryTarget, prepareDrillMigration, committedDeploymentFiles } from '../scripts/prepare-recovery-deployment.mjs';
import { applicationDatabase } from './helpers/postgres-fixture.mjs';

test('recovery deployment rejects production, private keys and unsafe destination paths', () => {
  const destination = path.resolve(process.cwd(), '..', 'isolated-recovery');
  const key = 'sb_publishable_' + 'a'.repeat(25);
  assert.throws(() => validateRecoveryTarget('ccqlvcrsoluxoymuhxnl', key, destination), /DIFFERENT/);
  assert.throws(() => validateRecoveryTarget('qcvdexkkrwfkbxkmnohl', 'sb_secret_example', destination), /PUBLISHABLE/);
  assert.throws(() => validateRecoveryTarget('qcvdexkkrwfkbxkmnohl', key, path.join(process.cwd(), 'public')), /OUTSIDE/);
  assert.throws(() => validateRecoveryTarget('qcvdexkkrwfkbxkmnohl', key, 'relative'), /ABSOLUTE/);
  assert.equal(validateRecoveryTarget('qcvdexkkrwfkbxkmnohl', key, destination), 'https://qcvdexkkrwfkbxkmnohl.supabase.co');
});

test('prepared real migrations schedule no jobs and cannot call the production monitor', async () => {
  const db = await applicationDatabase({ transformMigration: sql => prepareDrillMigration(sql, 'https://propio-recovery-drill.vercel.app') });
  try {
    assert.equal((await db.query('select count(*)::integer as n from cron.job')).rows[0].n, 0);
    const definition = (await db.query("select pg_get_functiondef('public.queue_operation_probe()'::regprocedure) as text")).rows[0].text;
    assert.equal(definition.includes('https://propio-shift-tracker.vercel.app'), false);
    assert(definition.includes('https://propio-recovery-drill.vercel.app'));
    assert.throws(() => prepareDrillMigration('select cron.schedule(\n\'new\',\'x\',\'y\');', 'https://propio-recovery-drill.vercel.app'), /UNREVIEWED/);
  } finally { await db.close(); }
});

test('deployment bytes come from the recorded commit even when tracked working files are edited', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'pst-provenance-'));
  try {
    const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    git(['init']);
    await fs.writeFile(path.join(root, 'fixture.txt'), 'committed bytes\n');
    git(['add', 'fixture.txt']);
    git(['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-m', 'Fixture']);
    const release = git(['rev-parse', 'HEAD']).trim();
    await fs.writeFile(path.join(root, 'fixture.txt'), 'uncommitted replacement');
    const copied = committedDeploymentFiles(root);
    assert.equal(copied.release, release);
    assert.equal(copied.files[0].content.toString('utf8').replaceAll('\r\n', '\n'), 'committed bytes\n');
  } finally {
    // Only the directly returned mkdtemp directory, within the system temp root.
    const parent = path.resolve(os.tmpdir());
    assert.equal(path.dirname(path.resolve(root)), parent);
    assert(path.basename(root).startsWith('pst-provenance-'));
    await fs.rm(root, { recursive: true, force: true });
  }
});
