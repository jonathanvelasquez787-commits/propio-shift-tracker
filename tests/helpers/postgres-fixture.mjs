import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs/promises';

// Postgres executes the real application migrations. Only Supabase-managed
// Auth identities and the background extension interfaces are fixtures.
export async function applicationDatabase() {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema extensions; create schema cron;
    create schema net; create schema vault;
    grant usage on schema public,auth to anon,authenticated,service_role;
    alter default privileges in schema public grant all on tables to authenticated,service_role;
    alter default privileges in schema public grant all on sequences to authenticated,service_role;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create table auth.identities(id uuid primary key, user_id uuid references auth.users, provider text, identity_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table cron.job(jobid bigint generated always as identity primary key,jobname text unique,schedule text,command text,active boolean default true);
    create table cron.job_run_details(jobid bigint,status text,end_time timestamptz);
    create function cron.schedule(n text,s text,c text) returns bigint language sql as $$
      insert into cron.job(jobname,schedule,command) values(n,s,c) on conflict(jobname) do update set schedule=s,command=c returning jobid $$;
    create function cron.unschedule(j bigint) returns boolean language sql as $$ delete from cron.job where jobid=j returning true $$;
    create table vault.decrypted_secrets(name text,decrypted_secret text);
    create table net._http_response(id bigint,status_code integer,error_msg text);
    create function net.http_get(url text,params jsonb default '{}',headers jsonb default '{}',timeout_milliseconds integer default 1000)
      returns bigint language sql as $$ select 1::bigint $$;
  `);
  const root = new URL('../../supabase/migrations/',import.meta.url);
  for (const name of (await fs.readdir(root)).filter(n=>n.endsWith('.sql')).sort()) {
    const sql = (await fs.readFile(new URL(name,root),'utf8'))
      .replace(/^create extension if not exists pg_(?:cron|net) with schema extensions;\r?$/gm,'');
    await db.exec('begin;');
    try { await db.exec(sql); await db.exec('commit;'); }
    catch(error) { await db.exec('rollback;'); throw new Error(`${name}: ${error.message}`); }
  }
  return db;
}
