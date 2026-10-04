import { parse, parseFragment, serialize } from 'parse5';
import { resources } from '../js/locales.generated.js';
import { translationKey } from '../js/i18n-key.js';
import { landingMetadata, landingStructuredData } from '../js/landing-meta.js';

export function createLocalizedLanding(source, language) {
  const tree = parse(source);
  const meta = landingMetadata(language);
  const translate = text => {
    const core = text.trim();
    const value = resources[language].translation[translationKey(core)];
    return value ? text.replace(core, () => value) : text;
  };
  let head;
  const walk = (node, ignored = false) => {
    const attr = name => node.attrs?.find(item => item.name === name);
    const set = (name, value) => {
      if (attr(name)) attr(name).value = value;
      else (node.attrs ||= []).push({ name, value });
    };
    const skip = ignored || ['script', 'style', 'textarea', 'code', 'noscript'].includes(node.tagName) || Boolean(attr('data-user-content'));
    if (node.tagName === 'html') set('lang', language);
    if (node.tagName === 'head') head = node;
    if (node.nodeName === '#text' && !skip) node.value = translate(node.value);
    if (!skip) for (const item of node.attrs || []) if (['title', 'aria-label', 'placeholder', 'alt'].includes(item.name)) item.value = translate(item.value);
    if (node.tagName === 'link' && attr('rel')?.value === 'canonical') set('href', meta.url);
    if (node.tagName === 'meta') {
      const name = attr('name')?.value || attr('property')?.value;
      const value = { description: meta.description, 'og:title': meta.title, 'og:description': meta.description,
        'og:url': meta.url, 'og:locale': meta.locale, 'twitter:title': meta.title, 'twitter:description': meta.description }[name];
      if (value) set('content', value);
    }
    if (attr('data-language-toggle')) {
      set('href', language === 'en' ? '/es' : '/');
      set('hreflang', language === 'en' ? 'es' : 'en');
      set('aria-label', language === 'en' ? 'Switch to Spanish' : 'Cambiar a inglés');
      set('title', language === 'en' ? 'Switch to Spanish' : 'Cambiar a inglés');
    }
    if (attr('data-language-label')) node.childNodes = [{ nodeName: '#text', value: language.toUpperCase(), parentNode: node }];
    for (const child of node.childNodes || []) walk(child, skip);
  };
  walk(tree);
  head.childNodes.find(node => node.tagName === 'title').childNodes[0].value = meta.title;
  const schema = landingStructuredData(language);
  head.childNodes.push(...parseFragment(`<script type="application/ld+json">${JSON.stringify(schema).replaceAll('<', '\\u003c')}</script>`).childNodes);
  return serialize(tree);
}
