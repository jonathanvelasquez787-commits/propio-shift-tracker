import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../extension/propio-bridge/popup.html', import.meta.url), 'utf8');

test('popup: "Pausar disponibilidad automática" se explica sin jerga', () => {
  const start = html.indexOf('for="availabilityPaused"');
  const row = html.slice(start, html.indexOf('</label>', start));
  assert.ok(row.includes('Pausar disponibilidad automática'));
  assert.ok(row.includes('Si la encendés, pausa el ponerte disponible. No pausa el guardado de llamadas.'));
  assert.ok(!row.includes('Start Calls'), 'el texto de ayuda ya no menciona Start Calls');
});

test('popup: las opciones de volver a estar disponible dicen "Estar disponible"', () => {
  const rowOf = (id) => { const i = html.indexOf(`for="${id}"`); return html.slice(i, html.indexOf('</label>', i)); };
  assert.ok(rowOf('prepareFirst').includes('Estar disponible al iniciar el turno'));
  assert.ok(rowOf('resumeBreak').includes('Estar disponible después del Break'));
  assert.ok(rowOf('resumeLunch').includes('Estar disponible después del Lunch'));
  assert.ok(!html.includes('Volver después de'));
});

const popupJs = readFileSync(new URL('../extension/propio-bridge/popup.js', import.meta.url), 'utf8');

test('popup: "Abrir Shift Tracker" queda a la derecha de "Revisar conexión"', () => {
  const start = html.indexOf('<div class="actions">');
  const actions = html.slice(start, html.indexOf('</div>', start));
  assert.ok(actions.indexOf('id="pair"') > -1 && actions.indexOf('id="open"') > actions.indexOf('id="pair"'));
  assert.ok(!html.includes('quick-links'));
});

test('popup: "Revisar conexión" muestra un aviso cuando termina bien', () => {
  assert.ok(popupJs.includes("act({ kind: 'pair' }, 'Conexión revisada"));
  assert.ok(popupJs.includes('async function act(packet, okMessage)'));
});

test('popup: los textos de Más opciones son cortos', () => {
  assert.ok(!html.includes('Se detienen los iniciadores'));
  assert.ok(!html.includes('El permiso de la nube vence'));
  assert.ok(!html.includes('Estos números cuentan'));
  assert.ok(html.includes('Elegí páginas, perfil y tamaños.'));
});

test('popup: ya no tiene "Solo registrar en esta PC" ni "Cómo funciona la espera"', () => {
  for (const text of ['Solo registrar en esta PC', 'devicePassive', 'Para cambiar de PC', 'prepareStatus', 'Cómo funciona la espera']) {
    assert.ok(!html.includes(text), `${text} ya no está en el popup`);
  }
  assert.ok(!popupJs.includes('devicePassive') && !popupJs.includes('prepareStatus'));
});

test('popup: ya no tiene la tarjeta "Más sobre la disponibilidad"', () => {
  for (const text of ['Más sobre la disponibilidad', 'Qué se pausa y cómo volver', 'Más opciones de disponibilidad']) {
    assert.ok(!html.includes(text), `${text} ya no está en el popup`);
  }
  assert.ok(html.includes('id="moreOptions"') && html.includes('aria-label="Actividad y ayuda"'));
});
