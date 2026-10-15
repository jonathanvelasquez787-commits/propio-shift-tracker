import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';

const source = readFileSync(new URL('../extension/propio-bridge/classic-portal.js', import.meta.url), 'utf8');
const flag = 'enable-analytics-block-AT-415-interpreter-portal';
const enabled = () => ({ value: true, variation: 1, version: 14, trackEvents: true });
function fixture({ origin = 'https://interpreters.propio-ls.com', pathname = '/portal', child = false, active = true } = {}) {
  const listeners = {};
  const window = { addEventListener: (name, listener) => { listeners[name] = listener; } }; window.top = child ? {} : window;
  const context = vm.createContext({ window, location: { origin, pathname } });
  vm.runInContext('this.originalParser = JSON.parse', context);
  vm.runInContext(source, context);
  const toggle = enabled => listeners.message?.({ source: window, origin, data: { protocol: 'pst-original-portal-layout/v1', enabled } });
  if (active) toggle(true);
  const parse = (value, reviver) => {
    context.input = typeof value === 'string' ? value : JSON.stringify(value);
    context.reviver = reviver;
    return vm.runInContext('JSON.parse(input, reviver)', context);
  };
  return { context, parse, toggle, listeners, window, changed: () => vm.runInContext('JSON.parse !== originalParser', context) };
}

test('original portal selects the vendor legacy layout while preserving every unrelated feature', () => {
  const f = fixture();
  const input = { [flag]: enabled(), 'geocomply-enabled': { value: true, version: 8, variation: 0 }, 'call-acceptance': { value: true }, clientSetting: 'unchanged' };
  const result = f.parse(input);
  assert.equal(result[flag].value, false);
  assert.equal(result[flag].variation, 1); assert.equal(result[flag].version, 14);
  assert.equal(JSON.stringify(result['geocomply-enabled']), JSON.stringify(input['geocomply-enabled']));
  assert.equal(JSON.stringify(result['call-acceptance']), JSON.stringify(input['call-acceptance']));
  assert.equal(result.clientSetting, 'unchanged');
  assert.equal(input[flag].value, true);
});

test('original portal supports the vendor stream put and single-flag patch without editing other stream paths', () => {
  const f = fixture();
  assert.equal(f.parse({ path: '/flags/', data: { [flag]: enabled(), another: enabled() } }).data[flag].value, false);
  assert.equal(f.parse({ path: '/flags/' + flag, data: enabled() }).data.value, false);
  assert.equal(f.parse({ path: '/flags/another', data: enabled() }).data.value, true);
  assert.equal(f.parse({ path: '/account/' + flag, data: enabled() }).data.value, true);
});

test('original portal ignores unknown schemas and arbitrary portal or call payloads', () => {
  const f = fixture();
  for (const input of [null, 123, true, [], { value: true, version: 14, variation: 1 },
    { [flag]: true }, { [flag]: { value: true } }, { [flag]: { value: 'true', version: 1, variation: 0 } },
    { [flag]: { value: true, version: '1', variation: 0 } }, { [flag]: { value: true, version: 1, variation: null } },
    { payload: { [flag]: enabled() } }, { callId: 123, status: 'accepted', duration: 45, pay: 1.2 }]) {
    assert.equal(JSON.stringify(f.parse(input)), JSON.stringify(input));
  }
});

test('original portal preserves native parser errors and reviver semantics', () => {
  const f = fixture();
  assert.throws(() => f.parse('{'), error => error.name === 'SyntaxError');
  assert.equal(f.parse({ [flag]: enabled() }, (_key, value) => value)[flag].value, true);
  assert.equal(f.parse({ n: 2 }, (key, value) => key === 'n' ? value * 3 : value).n, 6);
  assert.equal(f.parse({ [flag]: enabled() }, (_key, value) => value && typeof value === 'object' ? Object.freeze(value) : value)[flag].value, true);
});

test('original portal is scoped to the top-level portal and never hooks login or other sites', () => {
  for (const config of [{ origin: 'https://other.test' }, { pathname: '/Login' }, { pathname: '/portal-other' }, { child: true }]) {
    const f = fixture(config); assert.equal(f.changed(), false);
  }
  assert.equal(fixture({ pathname: '/portal/history' }).changed(), true);
});

test('original portal repeated injection does not stack parsers or change native false flags', () => {
  const f = fixture(); vm.runInContext('this.firstParser = JSON.parse', f.context);
  vm.runInContext(source, f.context);
  assert.equal(vm.runInContext('JSON.parse === firstParser', f.context), true);
  assert.equal(f.parse({ [flag]: { ...enabled(), value: false } })[flag].value, false);
});

test('original portal choice defaults off, can switch back, and never poisons vendor cache serialization', () => {
  const f = fixture({ active: false }), input = { [flag]: enabled() };
  const result = f.parse(input); assert.equal(result[flag].value, true);
  f.toggle(true); assert.equal(result[flag].value, false);
  assert.equal(JSON.stringify(result), JSON.stringify(input));
  f.toggle(false); assert.equal(result[flag].value, true);
  f.listeners.message({ source: {}, origin: 'https://interpreters.propio-ls.com', data: { protocol: 'pst-original-portal-layout/v1', enabled: true } });
  assert.equal(result[flag].value, true);
  f.listeners.message({ source: f.window, origin: 'https://other.test', data: { protocol: 'pst-original-portal-layout/v1', enabled: true } });
  assert.equal(result[flag].value, true);
});

test('original portal build has unchanged permissions, scoped start scripts and no custom summary', () => {
  const output = mkdtempSync(join(tmpdir(), 'pst-original-portal-'));
  try {
    const build = (...options) => {
      const result = spawnSync(process.execPath, ['scripts/build-extension.mjs', output, ...options], { cwd: new URL('../', import.meta.url), encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
      return JSON.parse(readFileSync(join(output, 'manifest.json'), 'utf8'));
    };
    const personal = build();
    assert.equal(personal.content_scripts.filter(item => item.js.includes('classic-portal.js')).length, 1);
    assert.equal(personal.content_scripts[0].world, 'MAIN');
    assert.equal(personal.content_scripts[0].run_at, 'document_start');
    assert.deepEqual(personal.content_scripts[0].matches, ['https://interpreters.propio-ls.com/portal*']);
    assert.deepEqual(personal.permissions, ['storage', 'webRequest', 'alarms', 'webNavigation']);
    assert.equal(personal.content_scripts.some(item => item.js.includes('summary-content.js')), false);
    assert.equal(personal.content_scripts[1].run_at, 'document_start');
    assert.deepEqual(personal.content_scripts[1].js, ['original-portal-content.js']);
  } finally { rmSync(output, { recursive: true, force: true }); }
});
