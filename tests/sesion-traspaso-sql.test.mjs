import test from 'node:test';
import assert from 'node:assert/strict';
import { applicationDatabase } from './helpers/postgres-fixture.mjs';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const id = (n) => `aaaaaaaa-0000-4000-8000-${String(n).padStart(12, '0')}`;

async function setup() {
  const db = await applicationDatabase();
  await db.query(`insert into auth.users(id,email) values($1,'a@example.invalid'),($2,'b@example.invalid')`, [A, B]);
  return db;
}
const as = (db, user) => db.exec(`reset role; set role authenticated; set request.jwt.claim.sub='${user}';`);
const beat = (db, instance, kind, device) => db.query('select * from public.session_heartbeat($1,$2,$3,$4)', [instance, device, 'Windows', kind]);
const others = (db, instance, device, kind) => db.query('select * from public.session_others($1,$2,$3)', [instance, device, kind]);

test('otras sesiones: cuenta la web y la herramienta, pero no a la misma pagina ni a su mismo navegador y tipo', async () => {
  const db = await setup();
  await as(db, A);
  await beat(db, id(1), 'web', 'dev_web');
  await beat(db, id(2), 'web', 'dev_web');
  await beat(db, id(3), 'extension', 'dev_ext');
  await beat(db, id(4), 'web', 'dev_otra_pc');
  const fromWeb = await others(db, id(1), 'dev_web', 'web');
  assert.deepEqual(fromWeb.rows.map((row) => row.instance).sort(), [id(3), id(4)].sort());
  // Una pagina que aun no deja nota (null) tambien se ve a si misma como del mismo navegador y tipo.
  const fromNew = await others(db, null, 'dev_ext', 'extension');
  assert.deepEqual(fromNew.rows.map((row) => row.instance).sort(), [id(1), id(2), id(4)].sort());
  assert.ok(fromNew.rows.every((row) => row.age_seconds >= 0 && row.age_seconds < 5));
});

test('otras sesiones: una nota de mas de 2 minutos ya no cuenta y consultar no deja nota', async () => {
  const db = await setup();
  await as(db, A);
  await beat(db, id(1), 'extension', 'dev_ext');
  await db.exec('reset role');
  await db.query(`update private.app_sessions set seen_at = now() - interval '3 minutes' where instance = $1`, [id(1)]);
  await as(db, A);
  assert.equal((await others(db, null, 'dev_web', 'web')).rows.length, 0);
  await db.exec('reset role');
  assert.equal((await db.query('select count(*)::integer as n from private.app_sessions')).rows[0].n, 1);
});

test('traspaso: la peticion se ve, se confirma y una peticion nueva la deja sin confirmar', async () => {
  const db = await setup();
  await as(db, A);
  assert.equal((await db.query('select * from public.session_takeover_get()')).rows.length, 0);
  await db.query('select public.session_takeover_request($1,$2,$3)', ['dev_ext', 'Windows', 'extension']);
  const first = (await db.query('select * from public.session_takeover_get()')).rows;
  assert.equal(first.length, 1);
  assert.equal(first[0].by_device_id, 'dev_ext');
  assert.equal(first[0].by_kind, 'extension');
  assert.equal(first[0].acked, false);
  assert.ok(first[0].age_seconds >= 0 && first[0].age_seconds < 5);
  await db.query('select public.session_takeover_ack()');
  assert.equal((await db.query('select * from public.session_takeover_get()')).rows[0].acked, true);
  await db.query('select public.session_takeover_request($1,$2,$3)', ['dev_web', 'Windows', 'web']);
  const second = (await db.query('select * from public.session_takeover_get()')).rows;
  assert.equal(second.length, 1);
  assert.equal(second[0].by_kind, 'web');
  assert.equal(second[0].acked, false);
});

test('traspaso: otra cuenta no ve ni confirma la peticion; sin sesion, anon y datos invalidos se rechazan', async () => {
  const db = await setup();
  await as(db, A);
  await db.query('select public.session_takeover_request($1,$2,$3)', ['dev_ext', 'Windows', 'extension']);
  await as(db, B);
  assert.equal((await db.query('select * from public.session_takeover_get()')).rows.length, 0);
  await db.query('select public.session_takeover_ack()');
  await db.exec('reset role');
  assert.equal((await db.query('select acked_at from private.app_takeovers where user_id=$1', [A])).rows[0].acked_at, null);
  await as(db, A);
  await assert.rejects(db.query('select * from private.app_takeovers'), /permission denied/);
  await assert.rejects(db.query('select public.session_takeover_request($1,$2,$3)', ['dev', 'Windows', 'tablet']), /Invalid kind/);
  await assert.rejects(db.query('select public.session_takeover_request($1,$2,$3)', ['', 'Windows', 'web']), /Invalid device/);
  await db.exec('reset role; set role anon;');
  await assert.rejects(db.query('select * from public.session_others($1,$2,$3)', [null, 'd', 'web']), /permission denied/);
  await assert.rejects(db.query('select public.session_takeover_request($1,$2,$3)', ['d', 'l', 'web']), /permission denied/);
  await assert.rejects(db.query('select * from public.session_takeover_get()'), /permission denied/);
  await assert.rejects(db.query('select public.session_takeover_ack()'), /permission denied/);
  await db.exec('reset role; set role authenticated; reset request.jwt.claim.sub;');
  await assert.rejects(db.query('select * from public.session_others($1,$2,$3)', [null, 'd', 'web']));
});
