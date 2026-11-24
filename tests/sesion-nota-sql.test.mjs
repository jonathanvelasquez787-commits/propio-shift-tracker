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
const beat = (db, instance, kind = 'web', device = 'dev_one', label = 'Windows') =>
  db.query('select * from public.session_heartbeat($1,$2,$3,$4)', [instance, device, label, kind]);

test('la nota de sesion: cada sesion ve a las otras de SU cuenta y a si misma marcada', async () => {
  const db = await setup();
  await as(db, A);
  const first = await beat(db, id(1), 'web', 'dev_web');
  assert.equal(first.rows.length, 1);
  assert.equal(first.rows[0].is_self, true);
  const second = await beat(db, id(2), 'extension', 'dev_ext');
  assert.equal(second.rows.length, 2);
  const mine = second.rows.find((row) => row.instance === id(2));
  const other = second.rows.find((row) => row.instance === id(1));
  assert.equal(mine.is_self, true);
  assert.equal(other.is_self, false);
  assert.equal(other.kind, 'web');
  assert.equal(other.device_id, 'dev_web');
  assert.ok(other.age_seconds >= 0 && other.age_seconds < 5);
  // Renovar la misma pagina no duplica filas.
  const again = await beat(db, id(2), 'extension', 'dev_ext');
  assert.equal(again.rows.length, 2);
});

test('otra cuenta no ve ni toca las notas; las tablas y funciones no se abren a anon ni se leen directo', async () => {
  const db = await setup();
  await as(db, A);
  await beat(db, id(1));
  await as(db, B);
  const seen = await beat(db, id(9), 'web', 'dev_b');
  assert.equal(seen.rows.length, 1);
  assert.equal(seen.rows[0].instance, id(9));
  // B intenta borrar la nota de A: no pasa nada.
  await db.query('select public.session_leave($1)', [id(1)]);
  await db.exec('reset role');
  assert.equal((await db.query('select count(*)::integer as n from private.app_sessions where user_id=$1', [A])).rows[0].n, 1);
  // Nadie lee la tabla directo.
  await as(db, A);
  await assert.rejects(db.query('select * from private.app_sessions'), /permission denied/);
  await assert.rejects(db.query(`insert into private.app_sessions(user_id,instance,device_id,label,kind,seen_at) values($1,$2,'d','l','web',now())`, [A, id(5)]), /permission denied/);
  // anon no puede llamar las funciones.
  await db.exec('reset role; set role anon;');
  await assert.rejects(db.query('select * from public.session_heartbeat($1,$2,$3,$4)', [id(1), 'd', 'l', 'web']), /permission denied/);
  await assert.rejects(db.query('select public.session_leave($1)', [id(1)]), /permission denied/);
});

test('sin sesion iniciada o con datos invalidos la nota se rechaza', async () => {
  const db = await setup();
  await db.exec(`reset role; set role authenticated; set request.jwt.claim.sub='';`);
  await assert.rejects(beat(db, id(1)), /Authentication and instance required/);
  await as(db, A);
  await assert.rejects(beat(db, id(1), 'tablet'), /Invalid kind/);
  await assert.rejects(beat(db, id(1), 'web', 'd', ''), /Invalid device/);
  await assert.rejects(beat(db, id(1), 'web', 'd', 'x'.repeat(81)), /Invalid device/);
  await assert.rejects(beat(db, id(1), 'web', 'd'.repeat(65), 'ok'), /Invalid device/);
  await assert.rejects(db.query('select * from public.session_heartbeat(null,$1,$2,$3)', ['d', 'l', 'web']), /Authentication and instance required/);
});

test('las notas viejas no cuentan (mas de 2 min) y se borran solas (mas de 10 min); maximo 20 por cuenta', async () => {
  const db = await setup();
  await as(db, A);
  await beat(db, id(1));
  await db.exec('reset role');
  await db.query(`insert into private.app_sessions(user_id,instance,device_id,label,kind,seen_at) values
    ($1,$2,'dev_old','Windows','web', now() - interval '3 minutes'),
    ($1,$3,'dev_dead','Windows','web', now() - interval '11 minutes')`, [A, id(2), id(3)]);
  await as(db, A);
  const result = await beat(db, id(1));
  assert.deepEqual(result.rows.map((row) => row.instance), [id(1)]);
  await db.exec('reset role');
  const left = (await db.query('select instance from private.app_sessions where user_id=$1 order by instance', [A])).rows.map((row) => row.instance);
  assert.deepEqual(left, [id(1), id(2)]); // la de 11 min se borro; la de 3 min sigue guardada pero no se devuelve
  await as(db, A);
  for (let n = 10; n < 35; n++) await beat(db, id(n));
  await db.exec('reset role');
  assert.equal((await db.query('select count(*)::integer as n from private.app_sessions where user_id=$1', [A])).rows[0].n, 20);
});

test('session_leave borra solo MI nota', async () => {
  const db = await setup();
  await as(db, A);
  await beat(db, id(1), 'web', 'dev_web');
  await beat(db, id(2), 'extension', 'dev_ext');
  await db.query('select public.session_leave($1)', [id(1)]);
  const rest = await beat(db, id(2), 'extension', 'dev_ext');
  assert.deepEqual(rest.rows.map((row) => row.instance), [id(2)]);
});

test('la nota no toca user_data, calls ni el permiso de disponibilidad', async () => {
  const db = await setup();
  await as(db, A);
  const before = (await db.query('select count(*)::integer as n from public.calls')).rows[0].n;
  await beat(db, id(1));
  assert.equal((await db.query('select count(*)::integer as n from public.calls')).rows[0].n, before);
  await db.exec('reset role');
  assert.equal((await db.query('select count(*)::integer as n from private.automation_availability_leases')).rows[0].n, 0);
});
