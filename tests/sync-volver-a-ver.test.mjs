import { ui, translateText, translateMarkup, displayLocale } from '../js/i18n.js';
import { applySavedColors } from '../js/appearance-colors.js';
import { LANGUAGE_PREFERENCE_KEY, PENDING_LOGIN_LANGUAGE_KEY, normalizeLanguage, readLanguagePreference, saveLanguagePreference, readPendingLoginLanguage, clearPendingLoginLanguage } from '../js/language-preference.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../js/sync.js', import.meta.url), 'utf8')
  .replace(/^import .*;\r?$/gm, '')
  .replace(/\bexport (?=(?:async )?(?:function|const))/g, '')
  .replace(/^export \{ DATA_SCHEMA_VERSION \};\r?$/gm, '');
const boot = fs.readFileSync(new URL('../js/boot.js', import.meta.url), 'utf8');

function harness({ cloud, cloudError = null } = {}) {
  const values = new Map(), sessionValues = new Map(), events = [];
  let cloudRequests = 0;
  const context = vm.createContext({ ui, translateText, translateMarkup, displayLocale, applySavedColors,
    LANGUAGE_PREFERENCE_KEY, PENDING_LOGIN_LANGUAGE_KEY, normalizeLanguage, readLanguagePreference, saveLanguagePreference, readPendingLoginLanguage, clearPendingLoginLanguage,
    Date, Math, JSON, Map, Set, Promise, Error, navigator: { userAgent: 'Audit', platform: 'Audit' },
    DATA_SCHEMA_VERSION: 2, SUPABASE_URL: 'https://audit.invalid', SUPABASE_ANON_KEY: 'audit',
    window: { localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key),
    }, sessionStorage: {
      getItem: (key) => sessionValues.get(key) ?? null,
      setItem: (key, value) => sessionValues.set(key, value), removeItem: (key) => sessionValues.delete(key),
    } },
    setTimeout: () => 1, clearTimeout: () => {},
    getSupabase: () => ({
      rpc: () => new Promise(() => {}),
      from: (table) => ({ select: () => ({ eq: () => {
        if (table !== 'calls') return { maybeSingle: async () => { cloudRequests++; return { data: cloud, error: cloudError }; } };
        const rows = (cloud?.calls || []).map((payload) => ({ call_id: String(payload.id), payload }));
        const query = {
          order: () => query,
          range: async (from, to) => ({ data: rows.slice(from, to + 1), count: rows.length, error: null }),
        };
        return query;
      } }) }),
    }),
  });
  vm.runInContext(source, context);
  vm.runInContext('onSync((type) => auditEvents.push(type));', Object.assign(context, { auditEvents: events }));
  return { events, run: (code) => vm.runInContext(code, context), requests: () => cloudRequests };
}

const base = { state: { events: [{ id: 'e1' }] }, calls: [{ id: 'c1', pay: '0.12' }], settings: { goal: 45 }, updated_at: '2026-11-22T10:00:00Z' };
const adopt = (h) => h.run(`adoptCloud(${JSON.stringify(base)}, 'u1')`);

test('volver a ver: la nube cambió y no hay nada sin subir avisa cloud-changed', async () => {
  const h = harness({ cloud: { updated_at: '2026-11-22T11:00:00Z' } });
  adopt(h);
  const result = await h.run('checkCloudOnReturn({ minGapMs: 0 })');
  assert.equal(result.changed, true);
  assert.deepEqual(h.events.filter(type => type === 'cloud-changed'), ['cloud-changed']);
});

test('volver a ver: misma revisión en la nube no avisa nada', async () => {
  const h = harness({ cloud: { updated_at: base.updated_at } });
  adopt(h);
  const result = await h.run('checkCloudOnReturn({ minGapMs: 0 })');
  assert.equal(result.same, true);
  assert.equal(h.events.includes('cloud-changed'), false);
});

test('volver a ver: con cambios sin subir no consulta ni avisa (lo decide la subida normal)', async () => {
  const h = harness({ cloud: { updated_at: '2026-11-22T11:00:00Z' } });
  adopt(h);
  h.run('markDirty()');
  const result = await h.run('checkCloudOnReturn({ minGapMs: 0 })');
  assert.equal(result.skipped, true);
  assert.equal(h.requests(), 0);
  assert.equal(h.events.includes('cloud-changed'), false);
});

test('volver a ver: un error de la nube o una consulta muy seguida no avisan', async () => {
  const bad = harness({ cloud: null, cloudError: { message: 'caído' } });
  adopt(bad);
  assert.equal((await bad.run('checkCloudOnReturn({ minGapMs: 0 })')).skipped, true);
  assert.equal(bad.events.includes('cloud-changed'), false);
  const h = harness({ cloud: { updated_at: '2026-11-22T11:00:00Z' } });
  adopt(h);
  await h.run('checkCloudOnReturn({ minGapMs: 0 })');
  assert.equal((await h.run('checkCloudOnReturn({ minGapMs: 60000 })')).skipped, true);
  assert.equal(h.requests(), 1);
});

test('volver a ver: cambios locales mientras se espera a la nube cancelan el aviso', async () => {
  const h = harness({ cloud: { updated_at: '2026-11-22T11:00:00Z' } });
  adopt(h);
  const pending = h.run('checkCloudOnReturn({ minGapMs: 0 })');
  h.run('markDirty()');
  assert.equal((await pending).skipped, true);
  assert.equal(h.events.includes('cloud-changed'), false);
});

test('conflicto de arranque: la decisión trae la hora en que se guardó lo local', async () => {
  const cloud = { ...base, updated_at: '2026-11-22T11:00:00Z', calls: [{ id: 'c1', pay: '0.12' }, { id: 'c2', pay: '0.2' }] };
  const h = harness({ cloud });
  adopt(h);
  h.run(`window.localStorage.setItem(APP_KEYS.state, JSON.stringify({ events: [{ id: 'e1' }, { id: 'e2' }] })); markDirty();`);
  const decision = await h.run("resolveBoot('u1')");
  assert.equal(decision.action, 'conflict');
  assert.ok(decision.localSavedAt, 'la decisión incluye cuándo se guardó lo local');
});

test('conflicto de arranque: nadie elige, se queda la versión guardada más tarde', () => {
  const start = boot.indexOf('function chooseNewerVersion(');
  const fn = boot.slice(start, boot.indexOf('\n}\n', start) + 3);
  const choose = vm.runInNewContext(`${fn}; chooseNewerVersion`, { Date, Number });
  const cloud = { updated_at: '2026-11-22T11:00:00Z' };
  assert.equal(choose({ cloud, localSavedAt: '2026-11-22T11:00:30Z' }), 'local', 'lo local es más nuevo');
  assert.equal(choose({ cloud, localSavedAt: '2026-11-22T10:59:00Z' }), 'cloud', 'la nube es más nueva');
  assert.equal(choose({ cloud, localSavedAt: null }), 'local', 'sin fecha local se protege lo no subido');
  assert.equal(choose({ cloud: {}, localSavedAt: '2026-11-22T10:59:00Z' }), 'local');
  const ask = boot.slice(boot.indexOf('function askConflict('), boot.indexOf('function escribiendoAhora'));
  assert.doesNotMatch(ask, /bootUseLocal|bootUseCloud|addEventListener|innerHTML|setTimeout/, 'sin botones ni aviso: nada que elegir ni que leer');
});

test('conexión: al volver a ver la página se revisa la nube y solo se recarga sin cambios sin subir ni texto a medias', () => {
  const sync = fs.readFileSync(new URL('../js/sync.js', import.meta.url), 'utf8');
  assert.match(sync, /visibilityState === 'visible'\) checkCloudOnReturn\(\)/);
  assert.match(sync, /addEventListener\('focus'/);
  const at = boot.indexOf("type === 'cloud-changed'");
  assert.ok(at > 0);
  const block = boot.slice(at, at + 400);
  assert.match(block, /!readMeta\(\)\.dirty/);
  assert.match(block, /!escribiendoAhora\(\)/);
  assert.match(block, /window\.location\.reload\(\)/);
  const conflict = boot.slice(boot.indexOf("if (type === 'conflict')"), boot.indexOf("if (type === 'conflict')") + 600);
  assert.match(conflict, /!escribiendoAhora\(\)\) window\.location\.reload\(\)/);
  assert.match(boot, /\/\^\(INPUT\|TEXTAREA\)\$\//);
});
