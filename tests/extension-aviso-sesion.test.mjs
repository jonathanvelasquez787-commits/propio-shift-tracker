import test from 'node:test';
import assert from 'node:assert/strict';
import { createBridgeWorker, badgeFor } from '../extension/propio-bridge/bridge-worker.js';
import { PORTAL_ORIGIN } from '../js/propio-bridge-rules.js';

const accountScope = 'a'.repeat(64);

function chrome() {
  const store = {}, icon = { text: '', title: null };
  const api = { runtime: { id: 'ses-extension', getURL: name => `chrome-extension://ses-extension/${name}`, onMessage: { addListener() {} }, onStartup: { addListener() {} } },
    storage: { local: { get: async key => ({ [key]: structuredClone(store[key]) }), set: async patch => { Object.assign(store, structuredClone(patch)); } } },
    alarms: { create() {}, onAlarm: { addListener() {} } },
    webNavigation: { onCommitted: { addListener() {} } },
    webRequest: { onBeforeRequest: { addListener() {} }, onCompleted: { addListener() {} }, onErrorOccurred: { addListener() {} } },
    tabs: { onRemoved: { addListener() {} }, get: async () => { throw new Error('no tab'); }, query: async () => [{ id: 10 }], sendMessage: async (_id, message) => message.kind === 'identify-tracker' ? { accountScope } : { status: 'ok' } },
    action: { setBadgeText: async ({ text }) => { icon.text = text; }, setBadgeBackgroundColor: async () => {}, setTitle: async ({ title }) => { icon.title = title; } } };
  const worker = createBridgeWorker(api, { now: () => Date.parse('2026-11-22T15:00:00.000Z'), randomId: () => 'ses-event-0000000001' });
  const sender = { id: 'ses-extension', url: api.runtime.getURL('popup.html') };
  const portal = tabId => ({ id: 'ses-extension', frameId: 0, tab: { id: tabId }, url: `${PORTAL_ORIGIN}/` });
  const observe = (tabId, session) => worker.message({ kind: 'portal-observation', session, call: 'idle', documentId: `doc-${tabId}-abcdefghij`, observedAt: new Date(Date.parse('2026-11-22T15:00:00.000Z')).toISOString() }, portal(tabId));
  return { worker, sender, icon, store, observe };
}
async function recording(c) {
  assert.equal((await c.worker.message({ kind: 'pair' }, c.sender)).ok, true);
  assert.equal((await c.worker.message({ kind: 'mode', mode: 'auto' }, c.sender)).ok, true);
}

test('badgeFor: sesion cerrada sin ninguna sesion abierta pone "!"; sin pestañas o con una abierta no', () => {
  const base = { accountScope, mode: 'auto', attention: null };
  assert.equal(badgeFor({ ...base, tabs: {} }).text, '', 'sin pestaña de Propio es normal');
  const out = badgeFor({ ...base, tabs: { 1: { session: 'logged-out' } } });
  assert.equal(out.text, '!');
  assert.match(out.title, /saliste de tu sesión/);
  assert.equal(badgeFor({ ...base, tabs: { 1: { session: 'logged-out' }, 2: { session: 'authenticated' } } }).text, '', 'otra pestaña con sesion abierta');
  assert.equal(badgeFor({ ...base, tabs: { 1: { session: 'unknown' } } }).text, '');
  assert.equal(badgeFor({ accountScope: null, mode: 'observe', tabs: { 1: { session: 'logged-out' } } }).text, '', 'sin vincular no avisa');
});

test('el worker pone "!" cuando Propio muestra la sesion cerrada y lo quita al volver a entrar', async () => {
  const c = chrome();
  await recording(c);
  await c.observe(1, 'authenticated');
  assert.equal(c.icon.text, '');
  await c.observe(1, 'logged-out');
  assert.equal(c.icon.text, '!');
  assert.match(c.icon.title, /saliste de tu sesión/);
  await c.observe(1, 'authenticated');
  assert.equal(c.icon.text, '');
});

test('con la pestaña de Propio cerrada no hay marca de sesion', async () => {
  const c = chrome();
  await recording(c);
  await c.observe(1, 'logged-out');
  assert.equal(c.icon.text, '!');
  await c.worker.tabRemoved(1);
  assert.equal(c.icon.text, '');
});
