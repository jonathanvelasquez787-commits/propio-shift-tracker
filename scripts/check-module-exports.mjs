import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const entry = path.join(root, 'js', 'app-main.js');
const importPattern = /\bimport\s*\{([\s\S]*?)\}\s*from\s*['"]([^'"]+)['"]/g;
const exportPattern = /\bexport\s+(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)|\bexport\s*\{([\s\S]*?)\}(?:\s*from\s*['"][^'"]+['"])?/g;

function listedNames(list, useAlias) {
  return list.split(',').map(part => part.trim()).filter(Boolean).map(part => {
    const match = part.match(/^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/);
    if (!match) return null;
    return useAlias && match[2] ? match[2] : match[1];
  }).filter(Boolean);
}

function exportedNames(file) {
  const source = fs.readFileSync(file, 'utf8');
  const names = new Set();
  for (const match of source.matchAll(exportPattern)) {
    if (match[1]) names.add(match[1]);
    if (match[2]) listedNames(match[2], true).forEach(name => names.add(name));
  }
  return names;
}

const queue = [entry];
const visited = new Set();
const errors = [];
while (queue.length) {
  const file = queue.shift();
  if (visited.has(file)) continue;
  visited.add(file);
  const source = fs.readFileSync(file, 'utf8');
  if (/\bexport\s+export\b/.test(source)) {
    errors.push(`${path.relative(root, file)} contiene "export export"`);
  }
  for (const match of source.matchAll(importPattern)) {
    if (!match[2].startsWith('.')) continue;
    const target = path.resolve(path.dirname(file), match[2]);
    if (!fs.existsSync(target)) {
      errors.push(`${path.relative(root, file)}: no existe ${match[2]}`);
      continue;
    }
    queue.push(target);
    const available = exportedNames(target);
    for (const imported of listedNames(match[1], false)) {
      if (!available.has(imported)) {
        errors.push(`${path.relative(root, file)} importa ${imported} de ${path.relative(root, target)}, pero no está exportado`);
      }
    }
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Imports/exports verificados en ${visited.size} módulos.`);
