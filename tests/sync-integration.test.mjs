import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../js/sync.js', import.meta.url), 'utf8')
  .replace(/^import .*;\r?$/gm, '')
  .replace(/\bexport (?=(?:async )?(?:function|const))/g, '')
  .replace(/^export \{ DATA_SCHEMA_VERSION \};\r?$/gm, '');

function harness() {
  const values = new Map(), requests = [], timers = new Map(), events = [];
  let timerId = 0;
  const context = vm.createContext({ Date, Math, JSON, Map, Set, Promise, Error, navigator: { userAgent: 'Audit', platform: 'Audit' },
    DATA_SCHEMA_VERSION: 2, SUPABASE_URL: 'https://audit.invalid', SUPABASE_ANON_KEY: 'audit',
    window: { localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key),
    } },
    setTimeout: (fn, delay) => { timers.set(++timerId, { fn, delay }); return timerId; },
    clearTimeout: (id) => timers.delete(id),
    getSupabase: () => ({ rpc: (name, payload) => new Promise((resolve) => requests.push({ name, payload, resolve })) }),
  });
  vm.runInContext(source, context);
  vm.runInContext("onSync((type) => auditEvents.push(type));", Object.assign(context, { auditEvents: events }));
  return { values, requests, timers, events, run: (code) => vm.runInContext(code, context) };
}

test('cambios durante una subida conservan dirty y se envían en el siguiente delta', async () => {
  const h = harness();
  h.run("writeLocalSnapshot({state:{v:1},calls:[{id:'first'}],settings:{goal:10}}); adoptLocal('audit');");
  const first = h.run('pushSnapshot()');
  assert.equal(h.requests[0].payload.p_call_upserts.length, 1);
  h.run("window.localStorage.setItem(APP_KEYS.calls, JSON.stringify([{id:'first'},{id:'second'}])); markDirty();");
  h.requests[0].resolve({ data: { updated_at: '2026-09-30T12:00:00Z' }, error: null });
  await first;
  assert.equal(h.run('readMeta().dirty'), true);
  assert.ok([...h.timers.values()].some((timer) => timer.delay === 6000));
  const second = h.run('pushSnapshot()');
  assert.equal(h.requests[1].payload.p_call_upserts.length, 1);
  assert.equal(h.requests[1].payload.p_call_upserts[0].id, 'second');
  assert.equal(h.requests[1].payload.p_expected_updated_at, '2026-09-30T12:00:00Z');
  h.requests[1].resolve({ data: { updated_at: '2026-09-30T12:00:10Z' }, error: null });
  await second;
  assert.equal(h.run('readMeta().dirty'), false);
});

test('un conflicto conserva los cambios locales y un error permite reintentar sin omitir llamadas', async () => {
  const h = harness();
  h.run("writeLocalSnapshot({state:{v:1},calls:[{id:'call'}],settings:{}}); adoptLocal('audit');");
  const conflict = h.run('pushSnapshot()');
  h.requests[0].resolve({ data: { conflict: true, updated_at: 'other-device' }, error: null });
  assert.equal((await conflict).conflict, true);
  assert.equal(h.run('readMeta().dirty'), true);
  const failed = h.run('pushSnapshot()');
  h.requests[1].resolve({ data: null, error: { message: 'Offline' } });
  assert.ok((await failed).error);
  assert.equal(h.run('readMeta().dirty'), true);
  const retry = h.run('pushSnapshot()');
  assert.equal(h.requests[2].payload.p_call_upserts[0].id, 'call');
  h.requests[2].resolve({ data: { updated_at: 'synced' }, error: null });
  await retry;
  assert.equal(h.run('readMeta().dirty'), false);
});

test('QA espera a que el último cambio real se haya sincronizado antes de activar el aislamiento', async () => {
  const h = harness();
  h.run("writeLocalSnapshot({state:{v:1},calls:[],settings:{}}); adoptLocal('audit');");
  const entering = h.run("beginQaMode('audit')");
  h.run("window.localStorage.setItem(APP_KEYS.calls, JSON.stringify([{id:'new'}])); markDirty();");
  h.requests[0].resolve({ data: { updated_at: 'ack' }, error: null });
  assert.ok((await entering).error);
  assert.equal(h.run('isQaModeActive()'), false);
  assert.equal(h.run('readMeta().dirty'), true);
});

test('un error al reemplazar el escenario QA no borra el escenario anterior ni toca los datos reales', () => {
  const h = harness();
  h.run("window.localStorage.setItem(QA_KEY, JSON.stringify({version:1,scenario:'original'})); writeLocalSnapshot({state:{real:true},calls:[],settings:{}}); writeQaSnapshot({state:{original:true},calls:[],settings:{}}, 'original');");
  const before = new Map(h.values);
  h.run("window.localStorage.setItem = () => { throw new Error('Denied'); };");
  assert.throws(() => h.run("writeQaSnapshot({state:{new:true},calls:[{id:'new'}],settings:{}},'new')"), /Denied/);
  assert.deepEqual(h.values, before);
});
