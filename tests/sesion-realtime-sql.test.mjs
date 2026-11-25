import test from 'node:test';
import assert from 'node:assert/strict';
import { applicationDatabase } from './helpers/postgres-fixture.mjs';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

async function setup() {
  const db = await applicationDatabase();
  await db.query(`insert into auth.users(id,email) values($1,'a@example.invalid'),($2,'b@example.invalid')`, [A, B]);
  return db;
}
const as = (db, user) => db.exec(`reset role; set role authenticated; set request.jwt.claim.sub='${user}';`);
const request = (db, device = 'dev_web') => db.query(`select public.session_takeover_request($1,'Windows','web')`, [device]);
const sent = async (db) => { await db.exec('reset role'); return (await db.query('select topic, event, payload, private from realtime.messages order by id')).rows; };

test('realtime: pedir el traspaso manda un aviso privado al canal de ESA cuenta, sin datos', async () => {
  const db = await setup();
  await as(db, A);
  await request(db);
  const rows = await sent(db);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], { topic: `session-handoff:${A}`, event: 'takeover', payload: { kind: 'takeover' }, private: true });
  await as(db, A);
  await request(db, 'dev_otra');
  assert.equal((await sent(db)).length, 2);
});

test('realtime: confirmar el traspaso NO manda otro aviso', async () => {
  const db = await setup();
  await as(db, A);
  await request(db);
  await db.query('select public.session_takeover_ack()');
  const rows = await sent(db);
  assert.equal(rows.length, 1);
  await db.exec('reset role');
  assert.equal((await db.query('select acked_at is not null as acked from private.app_takeovers')).rows[0].acked, true);
});

test('realtime: si Realtime falla, el pedido igual se guarda y no hay error', async () => {
  const db = await setup();
  await db.exec(`create or replace function realtime.send(payload jsonb, event text, topic text, private boolean default true)
    returns void language plpgsql as $$ begin raise exception 'realtime caido'; end $$;`);
  await as(db, A);
  await request(db);
  await db.exec('reset role');
  const saved = await db.query('select by_device_id, acked_at from private.app_takeovers');
  assert.equal(saved.rows.length, 1);
  assert.equal(saved.rows[0].acked_at, null);
});

test('realtime: cada cuenta solo puede recibir los avisos de SU canal; anon nada', async () => {
  const db = await setup();
  await as(db, A);
  await request(db);
  const read = async (user, topic) => {
    await as(db, user);
    await db.exec(`set realtime.topic = '${topic}'`);
    return (await db.query('select topic from realtime.messages')).rows.length;
  };
  assert.equal(await read(A, `session-handoff:${A}`), 1);
  assert.equal(await read(B, `session-handoff:${A}`), 0);
  assert.equal(await read(A, `session-handoff:${B}`), 0);
  assert.equal(await read(A, `otro-canal:${A}`), 0);
  await db.exec(`reset role; set role anon;`);
  await assert.rejects(() => db.query('select * from realtime.messages'), /permission denied/);
});

test('realtime: ninguna cuenta puede escribir avisos desde el navegador', async () => {
  const db = await setup();
  await as(db, A);
  await assert.rejects(() => db.query(`insert into realtime.messages(topic, event) values('session-handoff:${A}','takeover')`), /permission denied/);
  await assert.rejects(() => db.query('select private.session_takeover_notify()'), /permission denied|trigger/);
});
