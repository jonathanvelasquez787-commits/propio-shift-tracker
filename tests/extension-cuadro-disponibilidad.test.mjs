import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extensionAvailabilityModel } from '../js/extension-box.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('cuadro de disponibilidad: los valores salen igual que en la ventanita vieja', () => {
  const now = Date.parse('2026-11-22T15:00:00.000Z');
  const base = { paired: true, preparation: { availabilityPaused: true, enabled: true, resume: { break: true, lunch: false, mode: 'timed' }, spacing: { enabled: true, minutes: 5 }, waitReason: 'pause' } };
  const a = extensionAvailabilityModel(base, now);
  assert.deepEqual([a.paused, a.first, a.resumeBreak, a.resumeLunch, a.resumeMode, a.spacingOn, a.minutes], [true, true, true, false, 'timed', true, 5]);
  assert.match(a.resumeNote, /Al cumplir la duración/);
  assert.match(a.spacingNote, /pausada por vos/);
  const manual = extensionAvailabilityModel({ paired: true, preparation: { resume: { break: false, lunch: false, mode: 'manual' }, spacing: { enabled: false, minutes: 2 } } }, now);
  assert.match(manual.resumeNote, /Vos terminás la pausa en Inicio/);
  assert.equal(manual.spacingNote, 'Apagado. No agrega esperas entre llamadas.');
  assert.equal(extensionAvailabilityModel({ paired: true, preparation: { waitReason: 'before-shift', spacing: { enabled: true, minutes: 3, waitUntil: '2026-11-22T15:01:05.000Z' } } }, now).minutes, 3);
  const countdown = extensionAvailabilityModel({ paired: true, preparation: { waitReason: 'spacing', spacing: { enabled: true, minutes: 3, waitUntil: '2026-11-22T15:01:05.000Z' } } }, now);
  assert.match(countdown.spacingNote, /Faltan 1:05/);
  assert.equal(extensionAvailabilityModel(null, now).paired, false);
  assert.equal(extensionAvailabilityModel({ ok: false }, now).paused, false);
  assert.equal(extensionAvailabilityModel({ paired: true }, now).status, 'Comprobando cuándo ponerte disponible.');
});

test('cuadro de disponibilidad: cada control manda el mismo paquete que la ventanita vieja', () => {
  const src = read('js/extension-box.js');
  for (const piece of ["kind: 'pause-availability', paused:", "kind: 'prepare-first', enabled:", "kind: 'resume-options', break:", "kind: 'spacing', enabled:"]) assert.ok(src.includes(piece), piece);
  for (const id of ['extBoxAvailBtn', 'extBoxAvailBody', 'extBoxPaused', 'extBoxFirst', 'extBoxResumeBreak', 'extBoxResumeLunch', 'extBoxResumeMode', 'extBoxSpacing', 'extBoxMinutes']) assert.ok(src.includes(`'${id}'`), id);
  assert.ok(src.includes("availBody.hidden = false"), 'empieza abierta');
  assert.ok(src.includes('extBoxAvailOpen') && src.includes('storage?.local?.set') && src.includes('storage?.local?.get'), 'recuerda si la dejaste abierta o cerrada');
  assert.ok(!/<details/.test(src), 'sin details');
  const css = read('css/app-shell.css');
  const block = css.slice(css.indexOf('/* cuadro extension */'), css.indexOf('/* fin cuadro extension */'));
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(block), 'sin hexadecimales');
});
