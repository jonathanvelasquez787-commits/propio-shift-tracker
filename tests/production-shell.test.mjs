import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parse, parseFragment } from 'parse5';
import { createAppShell } from '../scripts/production-shell.mjs';

function collect(node, predicate, result = []) {
  if (predicate(node)) result.push(node);
  for (const child of node.childNodes || []) collect(child, predicate, result);
  if (node.content) collect(node.content, predicate, result);
  return result;
}
const attr = (node, name) => node.attrs?.find(value => value.name === name)?.value;
const source = fs.readFileSync(new URL('../app.html', import.meta.url), 'utf8').replace('type="module" src="/js/boot.js"', 'src="/assets/boot.js?v=test" defer');

test('the small production shell reconstructs every control and authored text before boot', () => {
  const result = createAppShell(source, 'test', fs.readFileSync(new URL('../css/app-core.css', import.meta.url), 'utf8'));
  assert.ok(result.html.length < 8000);
  assert.ok(!result.html.includes('<style>'));
  assert.ok(!result.html.includes('id="callControlBtn"'));
  assert.ok(result.html.indexOf('/assets/app-view.js') < result.html.indexOf('/assets/boot.js?v=test" defer'));
  let inserted;
  vm.runInNewContext(result.viewScript, { document: {
    createElement: () => ({ set innerHTML(value) { this.content = parseFragment(value); } }),
    getElementById: id => { assert.equal(id, 'bootGate'); return id; },
    body: { insertBefore: (content, gate) => { assert.equal(gate, 'bootGate'); inserted = content; } },
  } });
  const original = parse(source);
  const shell = parse(result.html);
  const beforeIds = collect(original, node => attr(node, 'id')).map(node => attr(node, 'id')).sort();
  const afterIds = [...collect(shell, node => attr(node, 'id')), ...collect(inserted, node => attr(node, 'id'))].map(node => attr(node, 'id')).sort();
  assert.deepEqual(afterIds, beforeIds);
  const originalText = collect(original, node => node.nodeName === '#text' && !['style', 'script'].includes(node.parentNode?.tagName)).map(node => node.value.trim()).filter(Boolean).sort();
  const outputText = [...collect(shell, node => node.nodeName === '#text' && node.parentNode?.tagName !== 'script'), ...collect(inserted, node => node.nodeName === '#text')].map(node => node.value.trim()).filter(Boolean).sort();
  assert.deepEqual(outputText, originalText);
  assert.ok(result.css.includes('--'));
});

test('external styles preserve cascade order, markup attributes and literal dollars or backticks', () => {
  const fixture = '<html><head><link href="before.css"><style>.a{color:red}</style><link href="after.css"></head><body><button id="call" title="\"x">$5 · `sample`</button><div id="bootGate">Loading</div><script src="/assets/boot.js" defer></script></body></html>';
  const result = createAppShell(fixture, 'abc');
  assert.equal(result.css, '.a{color:red}');
  assert.ok(result.html.indexOf('before.css') < result.html.indexOf('app-core.css'));
  assert.ok(result.html.indexOf('app-core.css') < result.html.indexOf('after.css'));
  assert.ok(result.viewScript.includes('$5 · `sample`'));
  assert.equal(collect(parse(result.html), node => node.tagName === 'script').length, 2);
});

test('new shell assets are available in the offline cache and unsupported source layouts fail the build', () => {
  const worker = fs.readFileSync(new URL('../js/service-worker.js', import.meta.url), 'utf8');
  for (const name of ['app-core', 'app-shell', 'game', 'game-battle', 'appearance']) {
    assert.ok(worker.includes(`/css/${name}.css?v=\${BUILD_VERSION}`), `${name} must share the release cache key`);
  }
  assert.ok(worker.includes('/assets/app-view.js?v=${BUILD_VERSION}'));
  assert.throws(() => createAppShell('<html><body>Hello</body></html>', 'test'), /requires/);
});

test('every app stylesheet belongs to the HTML release while retaining cascade order and attributes', () => {
  const input = source.replace('href="/css/app-shell.css"', 'href="/css/app-shell.css" media="screen" data-purpose="layout"');
  const result = createAppShell(input, 'release-next', '.core{}');
  const links = collect(parse(result.html), node => node.tagName === 'link' && attr(node, 'rel') === 'stylesheet');
  assert.deepEqual(links.map(node => attr(node, 'href')), ['app-core', 'app-shell', 'game', 'game-battle', 'appearance'].map(name => `/css/${name}.css?v=release-next`));
  const shell = links.find(node => attr(node, 'href').includes('app-shell'));
  assert.equal(attr(shell, 'media'), 'screen');
  assert.equal(attr(shell, 'data-purpose'), 'layout');
});

test('external app styles retain cascade position and require an explicit unambiguous stylesheet', () => {
  const fixture = '<html><head><link href="before.css"><link rel="stylesheet" href="/css/app-core.css"><link href="after.css"></head><body><div id="bootGate">Loading</div><script src="/assets/boot.js"></script></body></html>';
  const result = createAppShell(fixture, 'test', '.panel{color:red}');
  assert.equal(result.css, '.panel{color:red}');
  assert.ok(result.html.indexOf('before.css') < result.html.indexOf('app-core.css?v=test'));
  assert.ok(result.html.indexOf('app-core.css?v=test') < result.html.indexOf('after.css'));
  assert.throws(() => createAppShell(fixture, 'test'), /requires/);
  assert.throws(() => createAppShell(fixture, 'test', ' '), /requires/);
  assert.throws(() => createAppShell(fixture.replace('</head>', '<style>.other{}</style></head>'), 'test', '.panel{}'), /requires/);
});
