import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const banned = /\b(logros?|gamificaci[oó]n|monstruos?|premios?)\b/i;

function visibleSources() {
  const files = ['app.html', 'locales/es.json'];
  for (const name of readdirSync('js')) {
    if (name.endsWith('.js') && name !== 'locales.generated.js') files.push(`js/${name}`);
  }
  return files;
}

test('no visible text mentions the removed game (logros, gamificación, monstruos, premios)', () => {
  const found = [];
  for (const file of visibleSources()) {
    readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
      if (banned.test(line)) found.push(`${file}:${index + 1}`);
    });
  }
  assert.deepEqual(found, []);
});
