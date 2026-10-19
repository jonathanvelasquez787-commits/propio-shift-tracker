import i18next from 'i18next';
import { resources } from './locales.generated.js';
import { translationKey } from './i18n-key.js';
import { normalizeLanguage, readLanguagePreference } from './language-preference.js';

const instance = i18next.createInstance();
let language = readLanguagePreference();
instance.init({ resources, lng: language, fallbackLng: 'es', supportedLngs: ['es', 'en'], initImmediate: false,
  keySeparator: false, nsSeparator: false, interpolation: { escapeValue: false } });
const sourceKey = Symbol.for('propio.i18n.documentSources');
const documentSources = globalThis[sourceKey] || (globalThis[sourceKey] = { text: new WeakMap(), attributes: new WeakMap() });
const textSources = documentSources.text;
const attributeSources = documentSources.attributes;
export function currentLanguage() { return language; }
export function displayLocale() { return language === 'en' ? 'en-US' : 'es-MX'; }
export function translateText(source) {
  if (typeof source !== 'string') return source;
  const core = source.trim();
  if (!core) return source;
  const translated = instance.t(translationKey(core), { defaultValue: core, skipInterpolation: true });
  return source.slice(0, source.indexOf(core)) + translated + source.slice(source.indexOf(core) + core.length);
}
let storedMessages;
export function registerDetailTranslations(extra) {
  if (!extra) return;
  for (const code of ['es', 'en']) {
    const entries = extra[code]?.translation || {};
    Object.assign(resources[code].translation, entries);
    instance.addResourceBundle(code, 'translation', entries, true, true);
  }
  storedMessages = null;
}
// Only for app-authored saved messages, never personal names or notes.
export function translateStoredText(source, targetLanguage = language) {
  if (typeof source !== 'string') return source;
  if (!storedMessages) {
    const exact = new Map(), patterns = [];
    const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    for (const catalog of Object.values(resources)) for (const [key, pattern] of Object.entries(catalog.translation)) {
      if (!pattern.includes('{{')) { exact.set(pattern, key); continue; }
      const parameters = [], pieces = pattern.split(/(\{\{v\d+\}\})/g);
      const authoredLength = pieces.filter(piece => !/^\{\{v\d+\}\}$/.test(piece)).join('').length;
      if (authoredLength < 8) continue;
      const expression = pieces.map(piece => {
        if (!/^\{\{v\d+\}\}$/.test(piece)) return escape(piece);
        parameters.push(piece); return '([\\s\\S]*?)';
      }).join('');
      patterns.push({ key, parameters, expression: new RegExp(`^${expression}$`), authoredLength });
    }
    storedMessages = { exact, patterns: patterns.sort((a, b) => b.authoredLength - a.authoredLength) };
  }
  const catalog = resources[normalizeLanguage(targetLanguage)].translation;
  const key = storedMessages.exact.get(source);
  if (key) return catalog[key] ?? source;
  for (const pattern of storedMessages.patterns) {
    const match = source.match(pattern.expression);
    if (!match) continue;
    const values = Object.fromEntries(pattern.parameters.map((parameter, index) => [parameter, match[index + 1]]));
    return (catalog[pattern.key] ?? source).replace(/\{\{v\d+\}\}/g, parameter => values[parameter] ?? parameter);
  }
  return source;
}
export function translateMarkup(source) {
  return source.replace(/(<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>|<[^>]*>)|([^<]+)/gi, (match, tag, text) => tag
    ? /^<(?:script|style)\b/i.test(tag) ? tag
    : tag.replace(/\b(title|aria-label|placeholder|alt)=("[^"]*"|'[^']*')/g, (_, name, quoted) =>
      `${name}=${quoted[0]}${translateText(quoted.slice(1, -1)).replace(/"/g, '&quot;').replace(/'/g, '&#39;')}${quoted[0]}`)
    : translateText(text));
}
// Translate only authored template pieces; interpolated names, notes and HTML stay untouched.
export function ui(parts, ...values) {
  const pattern = parts.map((part, index) => part + (index < values.length ? `{{v${index}}}` : '')).join('');
  return translateMarkup(pattern).replace(/\{\{v(\d+)\}\}/g, (_, index) => String(values[Number(index)]));
}
export function translateDocument(root = document) {
  const authoredSource = (value, targetLanguage = 'es') => {
    const core = value.trim();
    return core ? value.replace(core, () => translateStoredText(core, targetLanguage)) : value;
  };
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.parentElement?.closest('script,style,textarea,code,[data-user-content]')) continue;
    let entry = textSources.get(node);
    if (!entry || node.nodeValue !== entry.translated) entry = { source: authoredSource(node.nodeValue) };
    entry.translated = authoredSource(entry.source, language);
    textSources.set(node, entry);
    node.nodeValue = entry.translated;
  }
  root.querySelectorAll('[title],[aria-label],[placeholder],[alt]').forEach(element => {
    if (element.closest('[data-user-content]')) return;
    const entries = attributeSources.get(element) || {};
    for (const name of ['title', 'aria-label', 'placeholder', 'alt']) {
      if (!element.hasAttribute(name)) continue;
      const value = element.getAttribute(name);
      let entry = entries[name];
      if (!entry || value !== entry.translated) entry = { source: authoredSource(value) };
      entry.translated = authoredSource(entry.source, language);
      entries[name] = entry;
      element.setAttribute(name, entry.translated);
    }
    attributeSources.set(element, entries);
  });
}
export function setLanguage(value, { documentTranslation = false } = {}) {
  const next = normalizeLanguage(value);
  const changed = next !== language;
  language = next;
  if (changed) instance.changeLanguage(language);
  if (typeof document !== 'undefined') {
    document.documentElement.lang = language;
    if (documentTranslation) translateDocument();
  }
  return changed;
}
