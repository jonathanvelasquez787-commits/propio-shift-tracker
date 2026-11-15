import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const build = fs.readFileSync('scripts/build.mjs', 'utf8');
const vercel = fs.readFileSync('vercel.json', 'utf8');
const privacy = fs.readFileSync('privacidad.html', 'utf8');

test('Vercel Analytics: el build agrega el script solo a la landing y a la app, sin tocar el HTML fuente', () => {
  assert.match(build, /name === 'index\.html' \|\| name === 'app\.html'\) html = html\.replace\('<\/head>', '<script defer src="\/_vercel\/insights\/script\.js"><\/script>/);
  for (const name of ['app.html', 'index.html', 'privacidad.html', 'terminos.html']) {
    assert.ok(!fs.readFileSync(name, 'utf8').includes('_vercel/insights'), `${name}: el fuente no lleva el script`);
  }
});

test('Vercel Analytics: la política de seguridad lo permite desde el mismo origen y la privacidad lo declara', () => {
  assert.match(vercel, /script-src 'self'/);
  assert.match(vercel, /connect-src 'self'/);
  assert.doesNotMatch(vercel, /script-src[^;]*unsafe-inline/);
  assert.match(privacy, /Vercel Analytics, sin cookies y sin datos personales/);
  assert.doesNotMatch(privacy, /ni analítica de terceros/);
});
