import test from 'node:test';
import assert from 'node:assert/strict';
import { createAutomationLease } from '../js/automation-lease.js';
import { extensionLeaseModel } from '../js/extension-box.js';

const owner = '11111111-1111-4111-8111-111111111111';
function fixture({ current = true, answer } = {}) {
  let clock = Date.parse('2026-11-23T15:00:00Z'), mono = 1000;
  const host = { setInterval: () => 1, clearInterval() {}, addEventListener() {}, removeEventListener() {}, document: { addEventListener() {}, removeEventListener() {} } };
  const client = { rpc: async () => answer ? await answer() : { data: [{ granted: true, server_now: new Date(clock).toISOString(), expires_at: new Date(clock + 30000).toISOString() }] } };
  const lease = createAutomationLease(client, { host, now: () => clock, monotonic: () => mono, isCurrent: () => current });
  return { lease, host };
}
const settled = () => new Promise(resolve => setImmediate(resolve));

test('permiso diagnostico: dice por que no pide el permiso', async () => {
  const f = fixture(); assert.equal(f.lease.diagnostic().reason, 'no-hello');
  f.lease.request({ owner: null, enabled: true }); assert.equal(f.lease.diagnostic().reason, 'no-owner');
  f.lease.request({ owner, enabled: false }); assert.equal(f.lease.diagnostic().reason, 'off');
  const g = fixture({ current: false }); g.lease.request({ owner, enabled: true }); await settled();
  assert.equal(g.lease.diagnostic().reason, 'wrong-account'); assert.equal(g.lease.diagnostic().rpcs, 0);
});

test('permiso diagnostico: cuenta avisos, pedidos y el resultado', async () => {
  const f = fixture(); f.lease.request({ owner, enabled: true }); await settled();
  assert.deepEqual(f.lease.diagnostic(), { reason: 'granted', hellos: 1, rpcs: 1 });
  assert.equal(typeof f.host.__pstLeaseDiagnostic, 'function');
  for (const [answer, expected] of [[async () => ({ data: [{ granted: false }] }), 'denied'], [async () => ({ error: { message: 'boom' } }), 'error: boom'], [async () => { throw Error('offline'); }, 'network: offline']]) {
    const g = fixture({ answer }); g.lease.request({ owner, enabled: true }); await settled(); assert.equal(g.lease.diagnostic().reason, expected);
  }
});

test('permiso diagnostico: el cuadro escribe una linea clara', () => {
  assert.equal(extensionLeaseModel({ reason: 'wrong-account', hellos: 3, rpcs: 0 }), 'Permiso de la nube: cuenta no coincide (la app no lo pide) · avisos: 3 · pedidos: 0');
  assert.equal(extensionLeaseModel({ reason: 'no-owner', hellos: 1, rpcs: 0 }), 'Permiso de la nube: sin dueño (la extensión no mandó su código) · avisos: 1 · pedidos: 0');
  assert.equal(extensionLeaseModel({ reason: 'granted', hellos: 5, rpcs: 2 }), 'Permiso de la nube: concedido · avisos: 5 · pedidos: 2');
  assert.equal(extensionLeaseModel(null), 'Permiso de la nube: la app todavía no lo informa.');
});
