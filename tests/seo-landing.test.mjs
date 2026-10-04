import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parse } from 'parse5';
import { createLocalizedLanding } from '../scripts/landing-pages.mjs';
import { landingMetadata, syncLandingMetadata, SITE_ORIGIN } from '../js/landing-meta.js';
import { readLanguagePreference } from '../js/language-preference.js';

const read = file => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const nodes = root => [root, ...(root.childNodes || []).flatMap(nodes)];
const attr = (node, name) => node.attrs?.find(item => item.name === name)?.value;
const text = node => node.nodeName === '#text' ? node.value : (node.childNodes || []).map(text).join('');

for (const language of ['en', 'es']) {
  test(`public ${language} landing is fully readable and consistent without JavaScript`, () => {
    const html = createLocalizedLanding(read('index.html'), language);
    const all = nodes(parse(html));
    const meta = landingMetadata(language);
    assert.equal(attr(all.find(node => node.tagName === 'html'), 'lang'), language);
    assert.equal(text(all.find(node => node.tagName === 'title')), meta.title);
    assert.equal(attr(all.find(node => attr(node, 'name') === 'description'), 'content'), meta.description);
    assert.equal(attr(all.find(node => attr(node, 'rel') === 'canonical'), 'href'), meta.url);
    const h1s = all.filter(node => node.tagName === 'h1');
    assert.equal(h1s.length, 1);
    assert.match(text(h1s[0]), language === 'en' ? /interpreting shift/ : /turno de intérprete/);
    const faq = all.find(node => attr(node, 'id') === 'preguntas');
    assert.match(text(faq), language === 'en' ? /per-minute earnings/ : /ganancias por minuto/);
    assert.doesNotMatch(text(faq), language === 'en' ? /¿|Sí\./ : /How do I/);
    const toggle = all.find(node => attr(node, 'data-language-toggle') !== undefined);
    assert.equal(toggle.tagName, 'a');
    assert.equal(attr(toggle, 'href'), language === 'en' ? '/es' : '/');
    assert.match(attr(toggle, 'aria-label'), language === 'en' ? /Spanish/ : /inglés/);
    const schema = JSON.parse(text(all.find(node => attr(node, 'type') === 'application/ld+json')));
    const application = schema['@graph'].find(item => item['@type'] === 'WebApplication');
    assert.equal(application.inLanguage, language);
    assert.equal(application.url, meta.url);
    assert.equal(application.description, meta.description);
    assert.equal(application.offers.price, '0');
    assert.equal(application.aggregateRating, undefined);
    assert.ok(all.some(node => attr(node, 'id') === 'loginForm'));
  });
}

test('language changes align visible URL, metadata and schema while retaining login state', t => {
  const previous = { document: globalThis.document, window: globalThis.window };
  t.after(() => Object.assign(globalThis, previous));
  const elements = new Map();
  const get = selector => {
    if (!elements.has(selector)) elements.set(selector, { setAttribute(name, value) { this[name] = value; } });
    return elements.get(selector);
  };
  globalThis.document = { documentElement: { hasAttribute: () => true }, querySelector: get };
  const state = { scroll: 8 };
  globalThis.window = { location: new URL(SITE_ORIGIN + '/?next=/app#entrar'), history: { state,
    replaceState(nextState, title, href) { assert.equal(nextState, state); globalThis.window.location = new URL(href); } } };
  for (const language of ['es', 'en']) {
    syncLandingMetadata(language);
    assert.equal(window.location.pathname, language === 'es' ? '/es' : '/');
    assert.equal(window.location.search, '?next=/app');
    assert.equal(window.location.hash, '#entrar');
    assert.equal(get('link[rel="canonical"]').href, landingMetadata(language).url);
    assert.equal(JSON.parse(get('script[type="application/ld+json"]').textContent)['@graph'][1].inLanguage, language);
  }
});

test('explicit Spanish URLs work even when storage is blocked or English was saved', t => {
  const previous = globalThis.location;
  t.after(() => { if (previous === undefined) delete globalThis.location; else globalThis.location = previous; });
  globalThis.location = { pathname: '/es' };
  assert.equal(readLanguagePreference({ getItem() { throw new Error('blocked'); } }), 'es');
  assert.equal(readLanguagePreference({ getItem() { return 'en'; } }), 'es');
});

test('language alternates and sitemap agree, without indexing private app routes', () => {
  const html = read('index.html'), sitemap = read('sitemap.xml');
  for (const language of ['en', 'es', 'x-default']) {
    const target = SITE_ORIGIN + (language === 'es' ? '/es' : '/');
    assert.ok(html.includes(`hreflang="${language}" href="${target}"`));
    assert.equal(sitemap.split(`hreflang="${language}" href="${target}"`).length - 1, 2);
  }
  assert.doesNotMatch(sitemap, /<loc>[^<]*\/app/);
  const routing = JSON.parse(read('vercel.json'));
  assert.equal(routing.rewrites.find(route => route.source === '/es').destination, '/es.html');
  assert.equal(routing.redirects.find(route => route.source === '/index.html').destination, '/');
});

test('public contact information is restored from its authored version', () => {
  for (const file of ['privacidad.html', 'terminos.html']) {
    assert.match(read(file), /Jonathan Velasquez/);
    assert.match(read(file), /sjonathanvelasquez@gmail\.com/);
    assert.doesNotMatch(read(file), /\[TU (?:NOMBRE|CORREO)/);
  }
});
