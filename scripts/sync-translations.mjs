import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { collectCatalog } from './i18n-catalog.mjs';
import { validateTranslations } from './i18n-validation.mjs';

const projectId = process.env.LOCIZE_PROJECTID;
const apiKey = process.env.LOCIZE_API_KEY;
if (!projectId || !apiKey) {
  console.log('Integración preparada. Configura LOCIZE_PROJECTID y LOCIZE_API_KEY para activarla. No se contactó ningún servicio.');
  process.exit(0);
}
if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('La integración de Locize requiere Node 22 o posterior.');
const catalog = collectCatalog();
const primary = Object.fromEntries(Object.entries(catalog).map(([key, entry]) => [key, entry.source]));
const existing = JSON.parse(fs.readFileSync('locales/en.json', 'utf8'));
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'propio-translations-'));
const require = createRequire(import.meta.url);
const cli = path.join(path.dirname(require.resolve('locize-cli/package.json')), 'dist/esm/cli.js');
const run = args => execFileSync(process.execPath, [cli, ...args], { timeout: 180000, stdio: 'pipe', env: { ...process.env, LOCIZE_VERSION: process.env.LOCIZE_VERSION || 'latest' } });
try {
  for (const [language, values] of Object.entries({ es: primary, en: existing })) {
    fs.mkdirSync(path.join(temporary, language));
    fs.writeFileSync(path.join(temporary, language, 'translation.json'), JSON.stringify(values));
  }
  // One-time seeding preserves the English shipped with the app; future syncs upload only Spanish.
  if (process.argv.includes('--seed')) run(['migrate', '--path', path.join(temporary, 'en'), '--language', 'en']);
  run(['sync', '--path', temporary, '--language', 'es', '--namespace', 'translation', '--reference-language-only', 'true', '--auto-translate', 'true', '--auto-translate-languages', 'en', '--update-values', 'true', '--skip-delete', 'true']);
  let target, errors = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await new Promise(resolve => setTimeout(resolve, 10000));
    run(['download', '--path', temporary, '--language', 'en', '--namespace', 'translation']);
    target = JSON.parse(fs.readFileSync(path.join(temporary, 'en', 'translation.json'), 'utf8'));
    errors = validateTranslations(primary, target);
    if (!errors.length) break;
  }
  if (errors.length) throw new Error(errors.slice(0, 10).join('\n'));
  fs.writeFileSync('locales/es.json', JSON.stringify(primary, null, 2) + '\n');
  fs.writeFileSync('locales/sources.json', JSON.stringify(catalog, null, 2) + '\n');
  fs.writeFileSync('locales/en.json', JSON.stringify(Object.fromEntries(Object.keys(primary).map(key => [key, target[key]])), null, 2) + '\n');
  console.log(`${Object.keys(primary).length} textos sincronizados y validados.`);
} catch (error) {
  // Provider output may contain credentials; keep it out of CI logs.
  throw new Error(`No se guardaron traducciones: ${error.stdout || error.stderr ? 'Locize rechazó la operación o no respondió. Revisa la configuración del proyecto.' : error.message}`);
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
