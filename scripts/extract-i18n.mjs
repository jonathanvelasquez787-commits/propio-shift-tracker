import fs from 'node:fs';
import { collectCatalog } from './i18n-catalog.mjs';
const catalog = collectCatalog();
fs.mkdirSync('locales', { recursive: true });
fs.writeFileSync('locales/es.json', JSON.stringify(Object.fromEntries(Object.entries(catalog).map(([key, entry]) => [key, entry.source])), null, 2) + '\n');
fs.writeFileSync('locales/sources.json', JSON.stringify(catalog, null, 2) + '\n');
console.log(`${Object.keys(catalog).length} textos extraídos.`);
