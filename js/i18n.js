import i18next from 'i18next';
import { resources } from './locales.generated.js';
import { translationKey } from './i18n-key.js';

const instance = i18next.createInstance();
let language = 'es';
try { language = JSON.parse(globalThis.localStorage?.getItem('propio_shift_tracker_settings_es_v1') || '{}').language === 'en' ? 'en' : 'es'; } catch {}
instance.init({ resources, lng: language, fallbackLng: 'es', supportedLngs: ['es', 'en'], initImmediate: false,
  keySeparator: false, nsSeparator: false, interpolation: { escapeValue: false } });
const textSources = new WeakMap();
const attributeSources = new WeakMap();
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
// Only for app-authored saved messages, never personal names or notes.
export function translateStoredText(source) {
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
  const catalog = resources[language].translation;
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
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.parentElement?.closest('script,style,textarea,code,[data-user-content]')) continue;
    if (!textSources.has(node)) textSources.set(node, node.nodeValue);
    node.nodeValue = translateText(textSources.get(node));
  }
  root.querySelectorAll('[title],[aria-label],[placeholder],[alt]').forEach(element => {
    if (!attributeSources.has(element)) attributeSources.set(element, Object.fromEntries(
      ['title', 'aria-label', 'placeholder', 'alt'].filter(name => element.hasAttribute(name)).map(name => [name, element.getAttribute(name)])));
    for (const [name, value] of Object.entries(attributeSources.get(element))) element.setAttribute(name, translateText(value));
  });
}
export function setLanguage(value, { documentTranslation = false } = {}) {
  const next = value === 'en' ? 'en' : 'es';
  const changed = next !== language;
  language = next;
  if (changed) instance.changeLanguage(language);
  if (typeof document !== 'undefined') {
    document.documentElement.lang = language;
    if (documentTranslation) translateDocument();
  }
  return changed;
}
