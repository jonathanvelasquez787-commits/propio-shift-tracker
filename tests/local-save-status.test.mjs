import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parse } from 'acorn';

function declaration(file, name) {
  const source = fs.readFileSync(new URL(file, import.meta.url), 'utf8');
  const node = parse(source, { ecmaVersion: 'latest', sourceType: 'module' }).body
    .map(n => n.declaration || n).find(n => n.type === 'FunctionDeclaration' && n.id.name === name);
  return source.slice(node.start, node.end).replace(/^export /, '');
}

test('a local rejection remains visible after cloud acknowledgments, timers and reconnect events', () => {
  const dot = { dataset: {} }, label = {};
  let handler, timer, failure = 'quota';
  const events = {};
  const context = vm.createContext({
    document: { getElementById: id => id === 'sidebarSyncDot' ? dot : label },
    getLocalPersistenceFailure: () => failure, translateText: x => x,
    ui: (parts, ...values) => parts.reduce((s, p, i) => s + p + (values[i] ?? ''), ''),
    onSync: fn => { handler = fn; }, readMeta: () => ({ dirty: false }),
    setInterval: fn => { timer = fn; }, Date,
    window: { addEventListener: (name, fn) => { events[name] = fn; } },
    showCloudConflictBanner() {},
  });
  vm.runInContext(['setSyncStatus', 'wireSyncStatus'].map(n => declaration('../js/boot.js', n)).join('\n') + '\nwireSyncStatus();', context);
  handler('local-persistence', {});
  assert.equal(dot.dataset.state, 'error');
  const warning = label.textContent;
  assert.match(warning, /guardar/i);
  handler('pushed', {});
  timer();
  events.online();
  assert.equal(dot.dataset.state, 'error');
  assert.equal(label.textContent, warning);
  failure = null;
  handler('local-persistence', {});
  handler('pushed', {});
  assert.equal(dot.dataset.state, 'ok');
  assert.equal(label.textContent, 'Guardado en la nube');
});

test('separate boot and app module instances share local failures without writing storage or sync metadata', () => {
  const events = [];
  const sharedWindow = { dispatchEvent: event => events.push(event.type) };
  function module() {
    const context = vm.createContext({ window: sharedWindow, Symbol,
      CustomEvent: class { constructor(type) { this.type = type; } },
      emit: () => {},
    });
    vm.runInContext("let localPersistenceFailure=null; const LOCAL_FAILURE_KEY=Symbol.for('propio.localPersistenceFailure');\n" +
      ['getLocalPersistenceFailure', 'reportLocalPersistenceFailure'].map(n => declaration('../js/sync.js', n)).join('\n'), context);
    return context;
  }
  const boot = module(), app = module();
  app.reportLocalPersistenceFailure('quota');
  assert.equal(boot.getLocalPersistenceFailure(), 'quota');
  app.reportLocalPersistenceFailure(null);
  assert.equal(boot.getLocalPersistenceFailure(), null);
  assert.deepEqual(events, ['propio-local-persistence', 'propio-local-persistence']);
});
