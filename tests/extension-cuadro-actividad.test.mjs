import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extensionActivityModel } from '../js/extension-box.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('cuadro de actividad: conexión, historial y señales salen igual que en la ventanita vieja', () => {
  const base = { ok: true, paired: true, mode: 'auto', portal: 'authenticated', call: 'none', completed: 7, history: { count: 23, coverage: 'range', invalid: 2, at: '2026-11-22T15:00:00.000Z' },
    last: [{ signal: 'incoming', at: '2026-11-22T15:00:00.000Z' }, { signal: 'raro', at: '2026-11-22T15:01:00.000Z' }] };
  const m = extensionActivityModel(base);
  assert.equal(m.connection, 'Propio está abierto y tu sesión fue reconocida. Esperando la próxima llamada.');
  assert.deepEqual([m.historyCount, m.historyScope, m.observed], ['23', 'En el historial de hoy', '7']);
  assert.match(m.historyStatus, /^2 fila\(s\) pendiente\(s\) de datos válidos\. Última lectura: /);
  assert.ok(!m.historyStatus.includes('Activá el registro'));
  assert.equal(m.signals.length, 2);
  assert.match(m.signals[0], /^Señal · /); assert.match(m.signals[1], /^Llamada entrante · /);
  assert.equal(extensionActivityModel({ ...base, active: true }).connection, 'Propio está abierto y tu sesión fue reconocida. Registrando tu llamada actual.');
  assert.match(extensionActivityModel({ ...base, mode: 'observe', history: { count: 1, at: '2026-11-22T15:00:00.000Z' } }).historyStatus, /Activá el registro para sincronizarlas\.$/);
  assert.equal(extensionActivityModel({ ...base, history: { count: 1, at: 'x' } }).historyScope, 'En la página del historial');
  assert.equal(extensionActivityModel({ ...base, attention: 'queue-full' }).connection.startsWith('La cola está llena'), true);
  assert.equal(extensionActivityModel({ ...base, portal: 'logged-out' }).connection, 'Saliste de Propio. Esperando que vuelvas a entrar.');
  const empty = extensionActivityModel({ ok: true, paired: false, last: [] });
  assert.equal(empty.connection, 'Esperando tu sesión de Propio Shift Tracker para conectar.');
  assert.deepEqual([empty.historyCount, empty.observed, empty.signals], ['—', '0', ['Todavía no se detectaron señales compatibles.']]);
  assert.equal(empty.historyStatus, 'Abrí el historial de Propio para leer y recuperar sus llamadas.');
  assert.equal(extensionActivityModel(null).observed, '0');
});

test('cuadro de actividad: tres secciones plegables que empiezan cerradas y recuerdan su estado', () => {
  const src = read('js/extension-box.js');
  for (const id of ['extBoxConnection', 'extBoxHistory', 'extBoxActivity', 'connectionHealth', 'historyCount', 'observedCount', 'historyScope', 'historyStatus', 'signals']) assert.ok(src.includes(`'${id}'`), id);
  for (const key of ['extBoxConnOpen', 'extBoxHistOpen', 'extBoxActOpen']) assert.ok(src.includes(key), key);
  assert.ok(src.includes('body.hidden = true; wrap.append'), 'empiezan cerradas');
});
