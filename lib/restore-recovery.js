const tables = [
  ['auth_users','auth','users'], ['auth_identities','auth','identities'],
  ['profiles','public','profiles'], ['user_data','public','user_data'],
  ['calls','public','calls'], ['daily_backups','public','daily_backups'],
];
const quote = name => '"'+name.replaceAll('"','""')+'"';

// Restore only into an empty, migrated recovery database. Credentials and
// target selection belong to the operator; this never connects to production.
export async function restoreRecoveryBundle(db,bundle) {
  if (bundle?.format !== 'pst-backup-v1' || !bundle.schema_manifest
      || tables.some(([key])=>!Array.isArray(bundle[key]))) throw new Error('BACKUP_INVALID');
  await db.query('begin');
  try {
    await db.query('lock table auth.users, public.user_data in exclusive mode');
    const occupied = await db.query('select exists(select 1 from auth.users) or exists(select 1 from public.user_data) as occupied');
    if (occupied.rows[0].occupied) throw new Error('RECOVERY_TARGET_NOT_EMPTY');
    for (const [key,schema,table] of tables) {
      const metadata = await db.query(`select column_name,data_type,is_generated,identity_generation from information_schema.columns
        where table_schema=$1 and table_name=$2`,[schema,table]);
      const columns = metadata.rows.filter(c=>c.is_generated==='NEVER' && c.identity_generation!=='ALWAYS');
      for (const row of bundle[key]) {
        if(Object.keys(row).some(key=>!metadata.rows.some(c=>c.column_name===key))) throw new Error('RECOVERY_SCHEMA_MISMATCH');
        const included = columns.filter(c=>Object.hasOwn(row,c.column_name));
        if (!included.length) throw new Error('BACKUP_ROW_INVALID');
        const names = included.map(c=>quote(c.column_name));
        const values = included.map(c=>c.data_type==='jsonb'||c.data_type==='json' ? JSON.stringify(row[c.column_name]) : row[c.column_name]);
        const conflictKey = table==='profiles'||table==='user_data' ? 'user_id' : null;
        const update = conflictKey ? ` on conflict (${quote(conflictKey)}) do update set `+
          names.filter(n=>n!==quote(conflictKey)).map(n=>`${n}=excluded.${n}`).join(',') : '';
        await db.query(`insert into ${quote(schema)}.${quote(table)} (${names.join(',')})
          values (${values.map((_,i)=>'$'+(i+1)).join(',')})${update}`,values);
      }
    }
    const counts = {};
    for (const [key,schema,table] of tables) {
      const result=await db.query(`select count(*)::integer as count from ${quote(schema)}.${quote(table)}`);
      counts[key]=result.rows[0].count;
      if(counts[key]!==bundle[key].length) throw new Error('RECOVERY_ROW_COUNT_MISMATCH');
    }
    await db.query('commit');
    return counts;
  } catch(error) { await db.query('rollback'); throw error; }
}
