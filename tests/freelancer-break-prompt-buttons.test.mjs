import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const main = readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');
const start = html.indexOf('id="breakPromptAcceptBtn"');
const row = html.slice(start, html.indexOf('</div>', start));

test('aviso de descanso: Posponer dice cuántos minutos pospone', () => {
  assert.match(main, /breakPromptSnoozeBtn'\)\.textContent = ui`Posponer \$\{freelancerSnoozeMinutes\(\)\} min`;/, 'el botón muestra los minutos de Ajustes');
  assert.match(main, /function freelancerSnoozeMinutes\(\) \{[\s\S]*?: 5;/, 'si el ajuste no sirve, usa 5 minutos');
  assert.match(main, /freelancerPrompt\.snoozeUntil = Date\.now\(\) \+ freelancerSnoozeMinutes\(\) \* 60000;/, 'pospone exactamente esos minutos');
});

test('aviso de descanso: ya no hay botón "Ahora no" (queda la X)', () => {
  assert.ok(start > 0, 'existe el aviso de descanso');
  assert.match(row, /id="breakPromptSnoozeBtn"/, 'sigue el botón Posponer');
  assert.doesNotMatch(row, /breakPromptDismissBtn/, 'ya no está el botón Ahora no');
  assert.doesNotMatch(main, /breakPromptDismissBtn/, 'tampoco queda su código');
  assert.match(main, /event\.detail\?\.id !== 'breakPromptModal' \|\| freelancerPrompt\.handled/, 'cerrar con la X sigue callando este tramo');
});
