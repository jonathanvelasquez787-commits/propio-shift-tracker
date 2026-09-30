import fs from 'node:fs';
import path from 'node:path';
import { parse as parseJavaScript } from 'acorn';
import { parse as parseHtml } from 'parse5';
import { translationKey } from '../js/i18n-key.js';

export function markupMessages(source) {
  const messages = [];
  source.replace(/(<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>|<[^>]*>)|([^<]+)/gi, (_, tag, text) => {
    if (tag && /^<(?:script|style)\b/i.test(tag)) return '';
    if (tag) for (const match of tag.matchAll(/\b(?:title|aria-label|placeholder|alt)=("[^"]*"|'[^']*')/g)) messages.push(match[1].slice(1, -1));
    else messages.push(text);
    return '';
  });
  return messages;
}
export function collectCatalog(root = process.cwd()) {
  const messages = new Map();
  const add = (text, file) => {
    const source = text.trim();
    if (!/[A-Za-záéíóúñÁÉÍÓÚÑ¿¡]/.test(source) || /^\{\{v\d+\}\}$/.test(source)) return;
    const key = translationKey(source);
    if (messages.has(key) && messages.get(key).source !== source) throw new Error(`Colisión de traducción: ${key}`);
    const entry = messages.get(key) || { source, files: [] };
    if (!entry.files.includes(file)) entry.files.push(file);
    messages.set(key, entry);
  };
  for (const file of ['app.html', 'index.html', 'privacidad.html', 'terminos.html']) {
    function htmlWalk(node, ignored = false) {
      const skip = ignored || ['script', 'style', 'textarea', 'code'].includes(node.tagName);
      if (node.nodeName === '#text' && !skip) add(node.value, file);
      if (!skip) for (const attr of node.attrs || []) if (['title', 'aria-label', 'placeholder', 'alt'].includes(attr.name)) add(attr.value, file);
      for (const child of node.childNodes || []) htmlWalk(child, skip);
    }
    htmlWalk(parseHtml(fs.readFileSync(path.join(root, file), 'utf8')));
  }
  for (const file of fs.readdirSync(path.join(root, 'js')).filter(file => file.endsWith('.js') && !['i18n.js', 'locales.generated.js'].includes(file))) {
    const source = fs.readFileSync(path.join(root, 'js', file), 'utf8');
    function walk(node) {
      if (!node?.type) return;
      if (node.type === 'CallExpression' && ['translateText', 'translateMarkup'].includes(node.callee.name) && typeof node.arguments[0]?.value === 'string') {
        const text = node.arguments[0].value;
        for (const message of node.callee.name === 'translateMarkup' ? markupMessages(text) : [text]) add(message, `js/${file}`);
      }
      if (node.type === 'TaggedTemplateExpression' && node.tag.name === 'ui') {
        const text = node.quasi.quasis.map((part, i) => part.value.cooked + (i < node.quasi.expressions.length ? `{{v${i}}}` : '')).join('');
        for (const message of markupMessages(text)) add(message, `js/${file}`);
      }
      for (const value of Object.values(node)) for (const child of Array.isArray(value) ? value : [value]) if (child?.type) walk(child);
    }
    walk(parseJavaScript(source, { ecmaVersion: 'latest', sourceType: 'module' }));
  }
  // Catalog names remain Spanish identities in saved records; only their display is localized.
  for (const file of ['monsters.js', 'game.js', 'theme-palettes.js', 'positive-reinforcement.js', 'app-main.js']) {
    const source = fs.readFileSync(path.join(root, 'js', file), 'utf8');
    const limit = file === 'monsters.js' ? source.indexOf('function equipmentEntries')
      : file === 'game.js' ? source.indexOf('const ACCESSORY_BY_LABEL')
      : file === 'positive-reinforcement.js' ? source.indexOf('const WINDOW_LABELS') : source.length;
    const snippet = source.slice(0, limit);
    for (const match of snippet.matchAll(/\b(?:name|phrase|label|description):\s*'([^']+)'/g)) add(match[1], `js/${file}`);
    if (file === 'app-main.js') for (const match of source.matchAll(/(?:shiftAlarmMessage|breakStartAlarmMessage|breakEndAlarmMessage|productiveBreakMessageFirst|productiveBreakMessageRepeat):\s*'([^']+)'/g)) add(match[1], `js/${file}`);
  }
  return Object.fromEntries([...messages.entries()].sort(([a], [b]) => a.localeCompare(b)));
}
