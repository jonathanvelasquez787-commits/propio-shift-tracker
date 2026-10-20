import { ui, translateText, translateMarkup, displayLocale } from '../js/i18n.js';
import { applySavedColors } from '../js/appearance-colors.js';
import { readLanguagePreference } from '../js/language-preference.js';
import { exportAccountingDocument } from '../js/accounting-export.js';
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
  const headers = JSON.parse(read('vercel.json')).headers.find(rule => rule.source === '/(.*)').headers;
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
  const bundleOptions = read('scripts/bundle-entry.mjs');
  assert.match(bundleOptions, /sourcemap:\s*false/);
  assert.match(bundleOptions, /inlineDynamicImports:\s*true/);
  assert.match(bundleOptions, /format: \[.*'boot'.*'landing'.*'theme-init'.*\]\.includes\(name\) \? 'iife' : 'es'/);
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

  assert.equal(resolve('/app.html?from=login#main'), 'https://app.example/app?from=login#main');
  assert.equal(resolve('/app?from=login#main'), 'https://app.example/app?from=login#main');
  assert.equal(resolve('https://evil.example/path'), '/app');
  assert.equal(resolve('//evil.example/path'), '/app');
  assert.equal(resolve('\\\\evil.example/path'), '/app');
  assert.equal(resolve('/\\\\evil.example/path'), '/app');
  assert.equal(resolve('https://app.example//evil.example/path'), 'https://app.example//evil.example/path');
  assert.equal(resolve(null), '/app');
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
  assert.equal(manifest.start_url, '/app');
  // Keep the effective identity of already-installed apps when changing their launch URL.
  assert.equal(manifest.id, '/app.html');
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

test('clean app route preserves legacy links and login navigation', () => {
  const routing = JSON.parse(read('vercel.json'));
  assert.deepEqual(routing.redirects.find(route => route.source === '/app.html'), {
    source: '/app.html', destination: '/app', permanent: true,
  });
  assert.equal(routing.rewrites.find(route => route.source === '/app').destination, '/app.html');
  assert.match(read('index.html'), /class="submit-btn" href="\/app"/);
  assert.match(read('js/boot.js'), /window\.location\.replace\('\/\?next=\/app'\)/);
});

test('verified app sessions display the root URL with a non-secret reload hint and preserve URL state', () => {
  const source = read('js/boot.js');
  const normalize = source.match(/^function normalizeAppAddress\(\) \{[\s\S]*?^\}/m)?.[0];
  assert.ok(normalize);
  for (const path of ['/app', '/app.html', '/app?from=bookmark#main']) {
    const state = { position: 3 };
    let replaced, cleared, entryHint;
    vm.runInNewContext(`${normalize}\nnormalizeAppAddress()`, {
      sessionStorage: { removeItem(key) { cleared = key; } },
      setAppEntryHint(enabled) { entryHint = enabled; },
      URL, window: { location: { href: 'https://app.example' + path },
        history: { state, replaceState(nextState, title, url) { replaced = { nextState, title, url }; } } },
    });
    assert.equal(replaced.nextState, state);
    assert.equal(entryHint, true);
    assert.equal(cleared, 'ps_auto_enter_at');
    const expected = new URL('https://app.example' + path);
    expected.pathname = '/';
    assert.equal(replaced.url, expected.href);
  }
  vm.runInNewContext(`${normalize}\nnormalizeAppAddress()`, {
    setAppEntryHint() {}, URL, window: { location: { href: 'https://app.example/?recuperar=1' },
      history: { replaceState() { assert.fail('Only the loaded app entry route should be normalized'); } } },
  });
  const boot = source.slice(source.indexOf('async function boot()'));
  assert.ok(boot.indexOf('normalizeAppAddress();') > boot.indexOf('if (!(await mountApp())) return;'));
});

test('returning root visits choose the gated shell while explicit public views remain reachable', () => {
  const routing = JSON.parse(read('vercel.json'));
  const root = routing.rewrites.find(route => route.source === '/');
  assert.equal(root.destination, '/app.html');
  assert.deepEqual(root.has, [{ type: 'cookie', key: 'ps_app_entry', value: '1' }]);
  assert.deepEqual(root.missing, [{type:'query',key:'quedarse'}, {type:'query',key:'recuperar'}]);
  const publicRoot = routing.rewrites.find(route => route.source === '/' && !route.has);
  assert.equal(publicRoot.destination, '/landing.html');
  assert.ok(routing.rewrites.indexOf(root) < routing.rewrites.indexOf(publicRoot));
  const headers = routing.headers.find(route => route.source === '/');
  assert.deepEqual(headers.has, root.has);
  assert.match(headers.headers.find(header => header.key === 'Cache-Control').value, /no-store/);
  const helper = read('js/auth.js').match(/export function setAppEntryHint\(enabled\) \{[\s\S]*?^\}/m)[0].replace('export ', '');
  const document = {};
  vm.runInNewContext(helper + '\nsetAppEntryHint(true)', {document});
  assert.equal(document.cookie, 'ps_app_entry=1; Path=/; Max-Age=31536000; SameSite=Lax; Secure');
  vm.runInNewContext(helper + '\nsetAppEntryHint(false)', {document});
  assert.equal(document.cookie, 'ps_app_entry=; Path=/; Max-Age=0; SameSite=Lax; Secure');
});

test('PWA launches the clean route offline and redirects legacy navigations', async () => {
  const handlers = new Map();
  let precached = [], responsePromise, networkCalls = 0;
  const shell = new Response('app shell');
  const cache = {
    async addAll(urls) { precached = urls; },
    async match(request) {
      const url = request.url || request;
      return url === 'https://app.example/app' || url === '/app' ? shell : undefined;
    },
  };
  vm.runInNewContext(read('js/service-worker.js'), {
    __BUILD_VERSION__: 'test', URL, Response,
    self: { location: { origin: 'https://app.example' }, skipWaiting() {},
      addEventListener(name, handler) { handlers.set(name, handler); } },
    caches: { async open() { return cache; } },
    async fetch() { networkCalls++; throw new Error('offline'); },
  });
  let installation;
  handlers.get('install')({ waitUntil(promise) { installation = promise; } });
  await installation;
  assert.ok(precached.includes('/app'));
  const navigate = url => {
    handlers.get('fetch')({ request: { method: 'GET', mode: 'navigate', url },
      respondWith(promise) { responsePromise = promise; } });
    return Promise.resolve(responsePromise);
  };
  const legacy = await navigate('https://app.example/app.html?from=bookmark');
  assert.equal(legacy.status, 308);
  assert.equal(legacy.headers.get('location'), 'https://app.example/app?from=bookmark');
  assert.equal(networkCalls, 0);
  assert.equal(await navigate('https://app.example/app'), shell);
  assert.equal(networkCalls, 1);
  assert.equal(await navigate(legacy.headers.get('location')), shell);
  assert.equal(networkCalls, 2);
});

test('footer year tolerates pages without a footer', () => {
  const footer = {};
  vm.runInNewContext(read('js/footer-year.js'), { ui, translateText, translateMarkup, displayLocale, applySavedColors,document:{getElementById:()=>footer}});
  assert.equal(footer.textContent, String(new Date().getFullYear()));
  assert.doesNotThrow(() => vm.runInNewContext(read('js/footer-year.js'), { ui, translateText, translateMarkup, displayLocale, applySavedColors,document:{getElementById:()=>null}}));
});

test('PDF report registers a click listener on its own print window', () => {
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
  exportAccountingDocument({ui,translateText,displayLocale,escapeHtml:String,formatCallDayLabel:String,formatMinutes:String,money:String,fmtDate:String,toast(){}},'pdf',{label:'Test period'},[{dayCalls:[],dayKey:'2026-09-27',productive:0,stats:{earnings:0}}],popup);
  assert.doesNotMatch(html, /\son[a-z]+\s*=/i);
  assert.equal(printed, false);
  click();
  assert.equal(printed, true);
});
