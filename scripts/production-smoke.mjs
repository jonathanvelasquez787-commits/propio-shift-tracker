import assert from 'node:assert/strict';

// Accounts must be provisioned explicitly and carry reserved test addresses.
// No admin key, real account enumeration, signup emails or account deletion.
export async function verifyHostedAccounts({ url, anonKey, appUrl, accounts }) {
  assert.equal(accounts.length, 2);
  for (const account of accounts) {
    assert.match(account.email, /^pst-production-check-[a-f0-9-]+@example\.invalid$/);
    assert.match(account.id, /^[a-f0-9-]{36}$/);
  }
  const evidence = [];
  const record = name => evidence.push({ name, passed: true });
  const request = async (path, { token = anonKey, method = 'GET', body } = {}) => {
    const response = await fetch(url + path, {
      method, signal: AbortSignal.timeout(15000),
      headers: { apikey: anonKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data = await response.json().catch(() => null);
    return { response, data };
  };
  const login = async account => {
    const result = await request('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: account.email, password: account.password } });
    assert.equal(result.response.status, 200, 'Hosted password login must succeed');
    assert.equal(result.data.user.id, account.id);
    return result.data;
  };
  const a = await login(accounts[0]), b = await login(accounts[1]);
  record('Hosted password login for two synthetic accounts');
  const secondDevice = await login(accounts[0]);
  const refresh = await request('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: secondDevice.refresh_token } });
  assert.equal(refresh.response.status, 200);
  assert.equal(refresh.data.user.id, accounts[0].id);
  record('Hosted session refresh on a second client');
  for (const identifier of [accounts[0].email, accounts[1].username]) {
    const owner = identifier.includes('@') ? accounts[0] : accounts[1];
    const response = await fetch(appUrl + '/api/login', { method: 'POST', signal: AbortSignal.timeout(15000),
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier, password: owner.password }) });
    const data = await response.json();
    assert.equal(response.status, 200, 'Published email/username login must succeed');
    const me = await request('/auth/v1/user', { token: data.access_token });
    assert.equal(me.data.id, owner.id);
  }
  record('Published app login by email and username');
  const read = async (token, id) => {
    const result = await request('/rest/v1/user_data?select=state,settings,updated_at&user_id=eq.' + id, { token });
    assert.equal(result.response.status, 200);
    return result.data;
  };
  assert.equal((await read(b.access_token, accounts[0].id)).length, 0);
  assert.equal((await read(a.access_token, accounts[1].id)).length, 0);
  const badWrite = await request('/rest/v1/calls', { token: b.access_token, method: 'POST',
    body: { user_id: accounts[0].id, call_id: 'cross-account-attempt', payload: { id: 'cross-account-attempt' } } });
  assert.equal(badWrite.response.status, 403);
  record('RLS rejects cross-account reads and writes through hosted PostgREST');
  const base = (await read(a.access_token, accounts[0].id))[0].updated_at;
  const push = (token, label) => request('/rest/v1/rpc/push_user_data_v2', { token, method: 'POST', body: {
    p_state: { productionCheck: label }, p_settings: {}, p_call_upserts: [{ id: 'pst-qa-call', callDate: '2026-10-09', durationMin: 10 }],
    p_call_deletes: [], p_expected_updated_at: base, p_device_id: label, p_device_label: 'Synthetic readiness check',
  } });
  const contenders = await Promise.all([push(a.access_token, 'client-a'), push(refresh.data.access_token, 'client-b')]);
  for (const result of contenders) assert.equal(result.response.status, 200);
  assert.equal(contenders.filter(x => x.data.ok === true).length, 1);
  assert.equal(contenders.filter(x => x.data.conflict === true).length, 1);
  record('Two simultaneous hosted connections produce one commit and one conflict');
  const calls = await request('/rest/v1/calls?select=call_id&user_id=eq.' + accounts[0].id, { token: a.access_token });
  assert.equal(calls.data.length, 1);
  const before = (await read(a.access_token, accounts[0].id))[0];
  const deleted = await request('/rest/v1/rpc/push_user_data_v2', { token: a.access_token, method: 'POST', body: {
    p_state: before.state, p_settings: before.settings, p_call_upserts: [], p_call_deletes: ['pst-qa-call'],
    p_expected_updated_at: before.updated_at, p_device_id: 'client-a',
  } });
  assert.equal(deleted.data.ok, true);
  const after = await request('/rest/v1/calls?select=call_id&user_id=eq.' + accounts[0].id, { token: a.access_token });
  assert.equal(after.data.length, 0);
  record('Hosted delta deletion persists without duplicate calls');
  return { checkedAt: new Date().toISOString(), evidence, limitations: [
    'Accounts were provisioned administratively; this does not certify public signup or delivery of confirmation/recovery email.',
    'OAuth requires the user-owned Google account flow.',
    'Offline UI and account switching are covered separately by regression tests, not by this HTTP check.',
  ] };
}
