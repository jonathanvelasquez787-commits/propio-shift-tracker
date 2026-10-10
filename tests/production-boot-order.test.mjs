import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import vm from 'node:vm';
import { rollup } from 'rollup';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { entryBundleOptions } from '../scripts/bundle-entry.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const gate = path.join(root, 'js/boot.js');
const app = path.join(root, 'js/app-main.js');
async function compile(input, name, plugins = [nodeResolve({ browser: true })]) {
  const options = entryBundleOptions(root, name, 'sync-regression');
  const bundle = await rollup({ input, external: options.external,
    makeAbsoluteExternalsRelative: options.makeAbsoluteExternalsRelative,
    plugins, onwarn: warning => { if (warning.code !== 'CIRCULAR_DEPENDENCY') throw new Error(warning.message); } });
  try { return (await bundle.generate(options.output)).output[0]; }
  finally { await bundle.close(); }
}

test('production gate retains a versioned native app import and never evaluates app modules eagerly', async () => {
  const result = await compile(gate, 'boot');
  const modules = Object.keys(result.modules);
  assert.ok(!modules.includes(app));
  assert.ok(!modules.some(id => id.endsWith('app-context.js')));
  assert.match(result.code, /import\('\/assets\/app-main\.js\?v=sync-regression'\)/);
  assert.doesNotMatch(result.code, /import\('\.\/assets\/app-main/);
  const worker = fs.readFileSync(new URL('../js/service-worker.js', import.meta.url), 'utf8');
  assert.ok(worker.includes('`/assets/app-main.js?v=${BUILD_VERSION}`'));
});

test('two isolated storage contexts initialize from cloud after the gate and preserve later edits', async () => {
  // Exercise the real production bundler, with a controlled session/cloud and a
  // module whose top-level storage read exposes eager dynamic-import evaluation.
  const sources = new Map([
    [gate, "(async()=>{await sessionReady; hydrate(); await import('./app-main.js'); opened();})();"],
    [app, "const initial=readStorage(); mounted(initial); export function edit(value){writeStorage(value);}"],
  ]);
  const plugin = { name: 'controlled-session', load: id => sources.get(id) };
  const boot = await compile(gate, 'boot', [plugin]);
  const main = await compile(app, 'app-main', [plugin]);
  let cloud = { rate: 0.12, name: 'before' };
  function browser(local = null) {
    let ready, mounted, edit, opened = false;
    const sessionReady = new Promise(resolve => { ready = resolve; });
    const context = vm.createContext({ sessionReady,
      hydrate: () => { local = structuredClone(cloud); },
      readStorage: () => structuredClone(local), mounted: value => { mounted = value; },
      writeStorage: value => { local = structuredClone(value); cloud = structuredClone(value); },
      opened: () => { opened = true; },
      loadApp: async () => {
        vm.runInContext(main.code.replace(/export\s*\{[^}]*\};?/, '') + '\neditForTest = edit;', context);
        edit = value => context.editForTest(value);
      },
    });
    vm.runInContext(boot.code.replace(/import\('\/assets\/app-main\.js\?v=sync-regression'\)/g, 'loadApp()'), context);
    return { ready: async () => { ready(); await new Promise(resolve => setImmediate(resolve)); },
      mounted: () => mounted, opened: () => opened, edit: value => edit(value) };
  }
  const first = browser({ name: 'stale first browser' });
  assert.equal(first.mounted(), undefined);
  await first.ready();
  assert.deepEqual(first.mounted(), cloud);
  first.edit({ rate: 0.21, name: 'saved from first browser' });
  const second = browser();
  assert.equal(second.mounted(), undefined);
  await second.ready();
  assert.deepEqual(second.mounted(), { rate: 0.21, name: 'saved from first browser' });
  assert.equal(second.opened(), true);
  second.edit({ rate: 0.33, name: 'saved from second browser' });
  const reopened = browser({ name: 'old local data' });
  await reopened.ready();
  assert.deepEqual(reopened.mounted(), { rate: 0.33, name: 'saved from second browser' });
});
