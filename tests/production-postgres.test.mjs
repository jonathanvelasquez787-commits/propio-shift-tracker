import test from 'node:test';
import assert from 'node:assert/strict';
import { applicationDatabase } from './helpers/postgres-fixture.mjs';
import { restoreRecoveryBundle } from '../lib/restore-recovery.js';

test('fresh migrations, actual RLS, bounded histories and encrypted-backup restore run in Postgres',async()=>{
  const db=await applicationDatabase();
  const a='11111111-1111-4111-8111-111111111111', b='22222222-2222-4222-8222-222222222222';
  try {
    await db.query(`insert into auth.users(id,email) values($1,'first@example.invalid'),($2,'second@example.invalid')`,[a,b]);
    await db.exec(`set role authenticated; set request.jwt.claim.sub='${a}';`);
    assert.equal((await db.query('select count(*)::integer as n from public.profiles')).rows[0].n,1);
    await assert.rejects(db.query(`insert into public.calls(user_id,call_id,payload) values($1,'wrong','{}')`,[b]),/row-level security/);
    let revision=(await db.query('select updated_at from public.user_data')).rows[0].updated_at;
    for(let start=0;start<10000;start+=1000){
      const calls=Array.from({length:1000},(_,i)=>({id:String(start+i),duration:60,notes:'capacity fixture'}));
      const result=await db.query(`select public.push_user_data_v2($1,$2,$3,'{}',$4) as result`,[
        JSON.stringify({schedule:{mon:{start:'07:15',end:'15:15'}}}),JSON.stringify({language:'en',theme:'lavender'}),JSON.stringify(calls),revision]);
      assert.equal(result.rows[0].result.ok,true); revision=result.rows[0].result.updated_at;
    }
    assert.equal((await db.query('select count(*)::integer as n from public.calls')).rows[0].n,10000);
    const stale=await db.query(`select public.push_user_data_v2('{}','{}','[]','{}','2000-01-01') as result`);
    assert.equal(stale.rows[0].result.conflict,true);
    await assert.rejects(db.query('select public.export_recovery_bundle()'),/permission denied/);
    await db.exec('reset role');
    await db.query('select public.create_daily_backup()');
    const saved=(await db.query('select public.export_recovery_bundle() as bundle')).rows[0].bundle;
    assert.equal(saved.calls.length,10000);
    await db.query(`update public.user_data set settings='{"changed":true}' where user_id=$1`,[a]);
    revision=(await db.query('select updated_at from public.user_data where user_id=$1',[a])).rows[0].updated_at;
    const restored=(await db.query('select public.restore_user_backup($1,current_date,$2) as result',[a,revision])).rows[0].result;
    assert.equal(restored.ok,true);
    assert.equal((await db.query('select settings from public.user_data where user_id=$1',[a])).rows[0].settings.language,'en');
    const target=await applicationDatabase();
    try {
      const counts=await restoreRecoveryBundle(target,saved);
      assert.equal(counts.auth_users,2); assert.equal(counts.calls,10000);
      const settings=(await target.query('select settings from public.user_data where user_id=$1',[a])).rows[0].settings;
      assert.equal(settings.theme,'lavender');
      const quota=(await target.query('select call_count from public.call_quotas where user_id=$1',[a])).rows[0].call_count;
      assert.equal(quota,10000);
      await assert.rejects(restoreRecoveryBundle(target,saved),/RECOVERY_TARGET_NOT_EMPTY/);
    } finally { await target.close(); }
  } finally { await db.close(); }
});
