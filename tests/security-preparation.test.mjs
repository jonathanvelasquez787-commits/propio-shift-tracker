import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = file => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const themeSource = read('js/theme-init.js');

for (const [name, raw, expected] of [
  ['saved dark', '{"theme":"dark","rate":0.2}', 'dark'],
  ['saved light', '{"theme":"light"}', 'light'],
  ['missing settings', null, 'light'],
  ['malformed JSON', '{', 'light'],
  ['null settings', 'null', 'light'],
  ['unknown theme', '{"theme":"invalid"}', 'light'],
  ['blocked storage', new Error('Storage denied'), 'light'],
]) {
  test(`theme initialization: ${name}`, () => {
    const classes = new Set(['theme-dark', 'theme-light']);
    vm.runInNewContext(themeSource, {
      localStorage: {
        getItem() { if (raw instanceof Error) throw raw; return raw; },
        setItem() { assert.fail('Theme initialization must not overwrite settings'); },
      },
      document: { documentElement: { classList: {
        toggle(name, on) { if (on) classes.add(name); else classes.delete(name); },
      } } },
    });
    assert.deepEqual([...classes], ['theme-' + expected]);
  });
}

test('all pages load local external scripts without inline handlers', () => {
  for (const name of ['app.html', 'index.html', 'privacidad.html', 'terminos.html']) {
    const html = read(name);
    for (const [, attrs, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      const src = attrs.match(/\bsrc="([^"]+)"/)?.[1];
      assert.ok(src, `${name}: inline script`);
      assert.equal(body.trim(), '');
      assert.ok(read(src.replace(/^\//, '')).length, `${name}: missing script ${src}`);
    }
    assert.doesNotMatch(html, /\son[a-z]+\s*=/i, `${name}: inline event handler`);
    assert.ok(html.indexOf('src="/js/theme-init.js"') < html.indexOf('</head>'));
  }
});

test('enforced CSP contains the required Supabase and asset origins', () => {
  const headers = JSON.parse(read('vercel.json')).headers[0].headers;
  assert.ok(!headers.some(h => h.key === 'Content-Security-Policy-Report-Only'));
  const policy = headers.find(h => h.key === 'Content-Security-Policy').value;
  const directives = Object.fromEntries(policy.split(';').map(part => {
    const [key, ...values] = part.trim().split(/\s+/); return [key, values];
  }));
  const supabaseUrl = read('js/config.js').match(/SUPABASE_URL = '([^']+)'/)[1];
  assert.ok(directives['connect-src'].includes(supabaseUrl));
  assert.ok(directives['connect-src'].includes(supabaseUrl.replace('https:', 'wss:')));
  assert.ok(directives['script-src'].includes('https://cdn.jsdelivr.net'));
  assert.ok(!directives['script-src'].some(s => /unsafe|\*/.test(s)));
  assert.deepEqual(directives['script-src-attr'], ["'none'"]);
  assert.deepEqual(directives['object-src'], ["'none'"]);
  assert.deepEqual(directives['frame-ancestors'], ["'none'"]);
  assert.ok(directives['style-src'].includes('https://fonts.googleapis.com'));
  assert.ok(directives['font-src'].includes('https://fonts.gstatic.com'));
  assert.ok(directives['media-src'].includes('data:'));
});

test('Supabase browser client uses an exact stable v2 release allowed by CSP', () => {
  const source = read('js/supabase-client.js');
  const importUrl = source.match(/from '([^']*supabase-js@([^/]+)\/\+esm)'/);
  assert.ok(importUrl, 'missing Supabase CDN import');
  assert.equal(importUrl[1], 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/+esm');
  assert.match(importUrl[2], /^2\.\d+\.\d+$/);

  const headers = JSON.parse(read('vercel.json')).headers[0].headers;
  const policy = headers.find(h => h.key === 'Content-Security-Policy').value;
  assert.match(policy, /script-src[^;]*https:\/\/cdn\.jsdelivr\.net/);
});

test('footer year tolerates pages without a footer', () => {
  const footer = {};
  vm.runInNewContext(read('js/footer-year.js'), {document:{getElementById:()=>footer}});
  assert.equal(footer.textContent, String(new Date().getFullYear()));
  assert.doesNotThrow(() => vm.runInNewContext(read('js/footer-year.js'), {document:{getElementById:()=>null}}));
});

test('PDF report registers a click listener on its own print window', () => {
  const source = read('js/app-main.js');
  const fn = source.slice(source.indexOf('    function exportAccountingPdf()'), source.indexOf('    function syncAccountingExportPeriodUI()'));
  let html = '', click, printed = false;
  const popup = {
    print() { printed = true; },
    document: {
      write(value) { html = value; }, close() {},
      querySelector(selector) {
        assert.equal(selector, '.print-btn');
        return {addEventListener(event, handler) { assert.equal(event, 'click'); click = handler; }};
      },
    },
  };
  vm.runInNewContext(fn + '\nexportAccountingPdf();', {
    window: {open:()=>popup}, accountingExportRange:()=>({label:'Test period'}),
    accountingExportDays:()=>[{dayCalls:[],dayKey:'2026-09-27',productive:0,stats:{earnings:0}}],
    escapeHtml:String, formatCallDayLabel:String, formatMinutes:String, money:String, fmtDate:String, toast() {},
  });
  assert.doesNotMatch(html, /\son[a-z]+\s*=/i);
  assert.equal(printed, false);
  click();
  assert.equal(printed, true);
});
