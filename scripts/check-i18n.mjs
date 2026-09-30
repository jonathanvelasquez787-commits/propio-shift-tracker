import fs from 'node:fs';
import { collectCatalog } from './i18n-catalog.mjs';
import { validateTranslations } from './i18n-validation.mjs';

const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const primary = read('locales/es.json');
const target = read('locales/en.json');
const extracted = collectCatalog();
const errors = validateTranslations(Object.fromEntries(Object.entries(extracted).map(([key, entry]) => [key, entry.source])), target);
for (const [key, { source, files }] of Object.entries(extracted)) {
  if (primary[key] !== source) errors.push(`${key}: origen nuevo o modificado en ${files.join(', ')}. Ejecutar i18n:extract.`);
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  const pick = catalog => Object.fromEntries(Object.keys(extracted).map(key => [key, catalog[key]]));
  const resources = { es: { translation: pick(primary) }, en: { translation: pick(target) } };
  fs.writeFileSync('js/locales.generated.js', `export const resources = ${JSON.stringify(resources)};\n`);
  console.log(`${Object.keys(extracted).length} textos validados en español e inglés.`);
}
