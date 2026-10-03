import { ui, translateText, translateMarkup, displayLocale } from '../js/i18n.js';
import { applySavedColors } from '../js/appearance-colors.js';
import { readLanguagePreference } from '../js/language-preference.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = file => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const themeSource = read('js/theme-init.js').replace(/^import .*;\r?$/gm, '');

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
    const storage = {
      getItem() { if (raw instanceof Error) throw raw; return raw; },
      setItem() { assert.fail('Theme initialization must not overwrite settings'); },
    };
    vm.runInNewContext(themeSource, { ui, translateText, translateMarkup, displayLocale, applySavedColors,
      readLanguagePreference: () => readLanguagePreference(storage), localStorage: storage,
      document: { documentElement: { dataset: {}, style: { setProperty() {}, removeProperty() {} }, classList: {
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
  assert.deepEqual(directives['script-src'], ["'self'"]);
  assert.deepEqual(directives['script-src-attr'], ["'none'"]);
  assert.deepEqual(directives['object-src'], ["'none'"]);
  assert.deepEqual(directives['frame-ancestors'], ["'none'"]);
  assert.ok(directives['style-src'].includes('https://fonts.googleapis.com'));
  assert.ok(directives['font-src'].includes('https://fonts.gstatic.com'));
  assert.ok(directives['media-src'].includes('data:'));
});

test('production build pins and bundles Supabase without source maps', () => {
  const pkg = JSON.parse(read('package.json'));
  const vercel = JSON.parse(read('vercel.json'));
  assert.equal(pkg.dependencies['@supabase/supabase-js'], '2.117.2');
  assert.equal(pkg.devDependencies.rollup, '3.30.0');
  assert.equal(pkg.devDependencies.terser, '5.44.0');
  assert.equal(vercel.outputDirectory, 'public');
  assert.match(read('js/supabase-client.js'), /from '@supabase\/supabase-js'/);
  const build = read('scripts/build.mjs');
  assert.match(build, /sourcemap:\s*false/);
  assert.match(build, /inlineDynamicImports:\s*true/);
  assert.match(build, /format: \[.*'boot'.*'landing'.*'theme-init'.*\]\.includes\(name\) \? 'iife' : 'es'/);
  assert.doesNotMatch(build, /chunkFileNames/);
  assert.match(build, /if \(ownCycle\) throw new Error\(warning\.message\)/);
  assert.match(build, /minify\(/);
});

test('phase 5 migration keeps private data behind RLS and persistent limits', () => {
  const sql = read('supabase/migrations/0003_phase_5.sql');
  for (const table of ['calls', 'rate_limit_buckets', 'app_errors', 'daily_backups']) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
  }
  assert.match(sql, /consume_rate_limit/);
  assert.match(sql, /push_user_data_v2/);
  assert.match(sql, /cron\.schedule\('propio-daily-backup'/);
  assert.match(sql, /octet_length\(payload::text\) <= 65536/);
  assert.match(sql, /set schema_version = 2/);
  assert.match(sql, /function public\.wipe_my_data\(\)[\s\S]*security definer/i);
});

test('landing redirects only to a validated same-origin URL', () => {
  const source = read('js/landing.js');
  const nextUrl = source.match(/^function nextUrl\(\) \{[\s\S]*?^\}/m)?.[0] || '';
  const resolve = next => vm.runInNewContext(`${nextUrl}\nnextUrl()`, { ui, translateText, translateMarkup, displayLocale, applySavedColors,
    params: new URLSearchParams(next === null ? '' : `next=${encodeURIComponent(next)}`),
    URL,
    window: { location: { origin: 'https://app.example' } },
  });

  assert.equal(resolve('/app.html?from=login#main'), 'https://app.example/app.html?from=login#main');
  assert.equal(resolve('https://evil.example/path'), '/app.html');
  assert.equal(resolve('//evil.example/path'), '/app.html');
  assert.equal(resolve('\\\\evil.example/path'), '/app.html');
  assert.equal(resolve('/\\\\evil.example/path'), '/app.html');
  assert.equal(resolve('https://app.example//evil.example/path'), 'https://app.example//evil.example/path');
  assert.equal(resolve(null), '/app.html');
});

test('telemetry enforces both global and per-IP limits', () => {
  const source = read('api/telemetry.js');
  assert.match(source, /consumeLimit\('telemetry:global',\s*600\)/);
  assert.match(source, /consumeLimit\(`telemetry:\$\{fingerprint\}`[,]\s*30\)/);
  assert.ok(source.indexOf('`telemetry:${fingerprint}`') < source.indexOf("'telemetry:global'"));
  assert.match(source, /createHash\('sha256'\)/);
});

test('security hardening migration enforces call quota and bounds telemetry storage', () => {
  const sql = read('supabase/migrations/0004_security_hardening.sql');
  assert.match(sql, /create table if not exists public\.call_quotas/i);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /call_count\s*<\s*100000/);
  assert.match(sql, /before insert on public\.calls/i);
  assert.match(sql, /before delete on public\.calls/i);
  assert.match(sql, /after delete on public\.calls/i);
  assert.match(read('supabase/migrations/0003_phase_5.sql'), /if \(select count\(\*\) from public\.calls where user_id = uid\) > 100000 then raise exception 'TOO_MANY_CALLS'/);
  assert.match(sql, /create or replace function public\.prune_app_errors\(\)/i);
  assert.match(sql, /interval '30 days'/i);
  assert.match(sql, /offset 50000/i);
  assert.match(sql, /cron\.schedule\('propio-prune-app-errors', '\*\/5 \* \* \* \*'/i);
});

test('git ignores environment files while allowing explicit examples', () => {
  const ignore = read('.gitignore');
  assert.match(ignore, /^\.env\.\*$/m);
  assert.match(ignore, /^\*\.env$/m);
  assert.match(ignore, /^\*\.env\.\*$/m);
  assert.match(ignore, /^!\.env\.example$/m);
  assert.match(ignore, /^!\.env\.\*\.example$/m);
  assert.match(ignore, /^!\*\.env\.\*\.example$/m);
});

test('PWA shell includes a manifest and service worker with API exclusions', () => {
  const manifest = JSON.parse(read('manifest.webmanifest'));
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, '/app.html');
  const worker = read('js/service-worker.js');
  assert.match(worker, /url\.pathname\.startsWith\('\/api\/'\)/);
  assert.match(worker, /request\.mode === 'navigate'/);
  assert.match(worker, /cache\.match\(request\)/);
  assert.doesNotMatch(worker, /caches\.match\(request\)/);
  for (const asset of [
    '/css/tokens.css', '/css/landing.css', '/css/legal.css', '/css/app-shell.css', '/css/game.css',
    '/assets/theme-init.js', '/assets/theme-toggle.js', '/assets/footer-year.js', '/assets/landing-ui.js',
    '/assets/landing.js', '/assets/boot.js', '/assets/monitoring.js', '/assets/register-sw.js',
  ]) assert.ok(worker.includes(asset), `missing precache asset ${asset}`);
  const build = read('scripts/build.mjs');
  assert.match(build, /\?v=\$\{release\}/);
  assert.match(build, /name === 'monitoring'[\s\S]*replaceAll\('__BUILD_VERSION__', release\)/);
});

test('footer year tolerates pages without a footer', () => {
  const footer = {};
  vm.runInNewContext(read('js/footer-year.js'), { ui, translateText, translateMarkup, displayLocale, applySavedColors,document:{getElementById:()=>footer}});
  assert.equal(footer.textContent, String(new Date().getFullYear()));
  assert.doesNotThrow(() => vm.runInNewContext(read('js/footer-year.js'), { ui, translateText, translateMarkup, displayLocale, applySavedColors,document:{getElementById:()=>null}}));
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
  vm.runInNewContext(fn + '\nexportAccountingPdf();', { ui, translateText, translateMarkup, displayLocale, applySavedColors,
    window: {open:()=>popup}, accountingExportRange:()=>({label:'Test period'}),
    accountingExportDays:()=>[{dayCalls:[],dayKey:'2026-09-27',productive:0,stats:{earnings:0}}],
    escapeHtml:String, formatCallDayLabel:String, formatMinutes:String, money:String, fmtDate:String, toast() {},
  });
  assert.doesNotMatch(html, /\son[a-z]+\s*=/i);
  assert.equal(printed, false);
  click();
  assert.equal(printed, true);
});

