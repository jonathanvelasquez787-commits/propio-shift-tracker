import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('app.html', 'utf8');
const main = fs.readFileSync('js/app-main.js', 'utf8');
const a11y = fs.readFileSync('js/presentation-accessibility.js', 'utf8');

test('Bloques del día: el texto largo vive en el icono i y el subtítulo es corto', () => {
  const at = html.indexOf('<h2>Bloques del día');
  assert.ok(at > 0, 'existe el título');
  const head = html.slice(at, html.indexOf('</summary>', at));
  assert.match(head, /aria-describedby="blocksInfoTooltip">i<\/button>/);
  assert.match(head, /id="blocksInfoTooltip"[^>]*>Tu horario planeado\. Si llegas tarde o te pasas de un break, aquí se ve la diferencia contra el plan\.</);
  assert.ok(main.includes("translateText('Tu plan vs. lo que hiciste.')"));
  assert.ok(!main.includes("translateText('Tu horario planeado. Si llegas tarde o te pasas de un break"));
});

test('Bloques del día: el aviso de día libre trabajado queda corto y el icono i no abre ni cierra el acordeón', () => {
  assert.match(html, /id="scheduleOffWorkedNote"[^>]*>Trabajaste en tu día libre<\/p>/);
  assert.ok(main.includes("translateText('Trabajaste en tu día libre')"));
  assert.ok(!html.includes('se ve igual que un día laboral normal'));
  assert.match(a11y, /button\?\.closest\('summary'\)\) event\.preventDefault\?\.\(\)/);
});
