import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PALETTES, paletteTokens, contrast } from '../js/theme-palettes.js';
import { applySavedColors } from '../js/appearance-colors.js';
import { currentLanguage, setLanguage, translateDocument, translateText, translateStoredText, translateMarkup, ui } from '../js/i18n.js';
import { collectCatalog, markupMessages } from '../scripts/i18n-catalog.mjs';
import { validateTranslations } from '../scripts/i18n-validation.mjs';

test('all custom palettes have readable normal text and restore original without removing unrelated variables', () => {
  const properties = new Map([['--user-test', 'keep']]);
  const root = { dataset: {}, style: { setProperty: (key, value) => properties.set(key, value), removeProperty: key => properties.delete(key) } };
  for (const mode of ['light', 'dark']) for (const palette of PALETTES.slice(1)) {
    const tokens = paletteTokens(palette, mode);
    for (const color of ['--text', '--muted', '--primary']) assert.ok(contrast(tokens[color], tokens['--panel']) >= 4.5, `${palette.id}/${mode}/${color}`);
    applySavedColors({ palette: palette.id, theme: mode, language: 'en' }, root);
    assert.equal(root.lang, 'en');
    assert.equal(properties.get('--bg'), tokens['--bg']);
    applySavedColors({ palette: 'original', theme: mode, language: 'es' }, root);
    assert.deepEqual([...properties], [['--user-test', 'keep']]);
  }
  applySavedColors({ palette: 'invalid' }, root);
  assert.equal(root.dataset.palette, 'original');
});

test('offline English translates authored text while retaining personal names and nested safe markup', () => {
  setLanguage('en');
  try {
    assert.equal(translateText('  Activar Logros  '), '  Enable Achievements  ');
    const personal = 'Rompe la armadura de productividad <img data-personal="true">';
    const result = ui`<p>Sonido "${personal}" guardado</p>`;
    assert.equal(result, `<p>Sound "${personal}" saved</p>`);
    const opaque = '<style>.hola { color: red; }</style><script>"Activar Logros"</script>';
    assert.equal(translateMarkup(opaque), opaque);
    assert.ok(translateMarkup('<button title="Activar Logros">Activar Logros</button>').includes('title="Enable Achievements"'));
    assert.equal(translateText('Nota personal fuera del catálogo'), 'Nota personal fuera del catálogo');
  } finally { setLanguage('es'); }
  assert.equal(translateText('Activar Logros'), 'Activar Logros');
});

test('catalog includes current HTML and authored JS without style or script source', () => {
  assert.deepEqual(markupMessages('<style>never translate</style><script>nor this</script><p title="Ayuda">Hola {{v0}}</p>'), ['Ayuda', 'Hola {{v0}}']);
  const current = collectCatalog();
  const es = JSON.parse(fs.readFileSync('locales/es.json'));
  const en = JSON.parse(fs.readFileSync('locales/en.json'));
  for (const [key, entry] of Object.entries(current)) assert.equal(es[key], entry.source, `${key}: changed source`);
  assert.deepEqual(validateTranslations(Object.fromEntries(Object.entries(current).map(([key, entry]) => [key, entry.source])), en), []);
});

test('new and changed strings, missing parameters and injected HTML cannot publish as valid English', () => {
  assert.equal(validateTranslations({ newKey: 'Nuevo texto' }, {}).length, 1);
  assert.equal(validateTranslations({ label: 'Hola {{v0}} {hora}' }, { label: 'Hello {{v0}}' }).length, 1);
  assert.equal(validateTranslations({ label: 'Hola {{v0}}' }, { label: '<img src=x> {{v0}}' }).length, 1);
  assert.deepEqual(validateTranslations({ label: 'Hola {{v0}} · {{v1}}' }, { label: '{{v1}} · Hello {{v0}}' }), []);
});

test('saved mission messages change language without editing numbers or personal values', () => {
  const original = 'Faltan 136.7 min';
  setLanguage('en');
  const english = translateStoredText(original);
  assert.equal(english, '136.7 min remaining');
  const title = 'Meta cumplida: Mi meta española';
  assert.equal(translateStoredText(title), 'Goal completed: Mi meta española');
  setLanguage('es');
  assert.equal(translateStoredText(english), original);
  assert.equal(translateStoredText('Goal completed: Mi meta española'), title);
});

test('dynamic document messages and attributes retain personal values across language changes and independent bundles', async (t) => {
  const previousLanguage = currentLanguage();
  const original = Object.fromEntries(['document', 'NodeFilter'].map(key => [key, globalThis[key]]));
  t.after(() => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
    setLanguage(previousLanguage);
  });
  const spanish = '  "Mi meta española" está libre.\n';
  const english = '  "Mi meta española" is available.\n';
  const text = { nodeValue: spanish, parentElement: { closest: () => null } };
  const personal = { nodeValue: 'Activar Logros', parentElement: { closest: () => ({}) } };
  const attributes = new Map([['title', spanish], ['aria-label', '  Activar Logros  ']]);
  const element = {
    closest: () => null, hasAttribute: name => attributes.has(name),
    getAttribute: name => attributes.get(name), setAttribute: (name, value) => attributes.set(name, value),
  };
  const root = { querySelectorAll: () => [element] };
  globalThis.NodeFilter = { SHOW_TEXT: 4 };
  globalThis.document = {
    documentElement: {},
    createTreeWalker: () => {
      const nodes = [text, personal];
      return { nextNode() { this.currentNode = nodes.shift(); return Boolean(this.currentNode); } };
    },
  };
  setLanguage('es');
  translateDocument(root);
  assert.equal(text.nodeValue, spanish);
  const otherBundle = await import('../js/i18n.js?document-language-regression');
  otherBundle.setLanguage('en');
  otherBundle.translateDocument(root);
  assert.equal(text.nodeValue, english);
  assert.equal(attributes.get('title'), english);
  assert.equal(attributes.get('aria-label'), '  Enable Achievements  ');
  assert.equal(personal.nodeValue, 'Activar Logros');
  setLanguage('en');
  translateDocument(root);
  assert.equal(text.nodeValue, english);
  assert.equal(attributes.get('title'), english);
  text.nodeValue = '  "Otra meta personal" is available.\n';
  element.setAttribute('aria-label', '  Recuperar contraseña  ');
  translateDocument(root);
  assert.equal(text.nodeValue, '  "Otra meta personal" is available.\n');
  assert.equal(attributes.get('aria-label'), '  Reset password  ');
  otherBundle.setLanguage('es');
  otherBundle.translateDocument(root);
  assert.equal(text.nodeValue, '  "Otra meta personal" está libre.\n');
  assert.equal(attributes.get('title'), spanish);
  assert.equal(attributes.get('aria-label'), '  Recuperar contraseña  ');
});

test('English UI keeps saved equipment identifiers and adherence checkpoint identities', () => {
  const game = fs.readFileSync('js/game.js', 'utf8');
  const app = fs.readFileSync('js/app-main.js', 'utf8');
  assert.match(game, /data-accessory="\$\{escapeHtml\(item\.id\)\}"/);
  assert.match(app, /label: 'Entrada'/);
  assert.match(app, /label: 'Salida'/);
  assert.match(app, /textContent = translateText\(currentStateLabel\(\)\)/);
});
