import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extensionSupportModel } from '../js/extension-box.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('cuadro de soporte: los números y las solicitudes salen igual que en la ventanita vieja', () => {
  const m = extensionSupportModel({ ok: true, diagnostic: { requests: 48, recognized: 11, last: [
    { kind: 'status', format: 'json', status: 200, result: 'unknown' },
    { kind: 'twilio', format: 'form', status: 200, result: 'recognized' },
    { kind: 'raro', format: 'raro', status: 500, result: 'http-error' }] } });
  assert.equal(m.summary, '48 solicitud(es) observada(s) · 11 señal(es) reconocida(s)');
  assert.deepEqual(m.items, ['Solicitud · Sin formato · HTTP 500 · Solicitud fallida', 'Evento de llamadas · Formulario · HTTP 200 · Señal reconocida', 'Estado de Propio · JSON · HTTP 200 · Sin señal compatible']);
  for (const state of [null, { ok: false }, { ok: true }]) {
    const empty = extensionSupportModel(state);
    assert.equal(empty.summary, 'Todavía no se observaron solicitudes del portal.');
    assert.deepEqual(empty.items, []);
  }
});

test('cuadro de soporte: sección plegable que empieza cerrada y recuerda su estado', () => {
  const src = read('js/extension-box.js');
  for (const id of ['extBoxSupport', 'detectorStatus', 'detectorRequests']) assert.ok(src.includes(`'${id}'`), id);
  assert.ok(src.includes('extBoxSupportOpen') && src.includes('Detalles para soporte') && src.includes('Números para revisar la conexión.'));
});
