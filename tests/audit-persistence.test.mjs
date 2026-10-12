import { ui, translateText, translateMarkup, displayLocale, setLanguage } from '../js/i18n.js';
import { applySavedColors } from '../js/appearance-colors.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { APP_KEYS, writeLocalSnapshot, settingsWithinBudget, reportLocalPersistenceFailure, getLocalPersistenceFailure } from '../js/sync.js';
import { createStorageRevisionGuard } from '../js/propio-bridge.js';

const source = fs.readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');

function storageHarness() {
  const state = { game: { ledger: {} } }, calls = [], settings = { goal: 10 };
  const values = new Map([['state', JSON.stringify(state)], ['calls', '[]'], ['settings', JSON.stringify(settings)]]);
  let reject = () => false;
  const warnings = [];
  reportLocalPersistenceFailure(null);
  const context = vm.createContext({ ui, translateText, translateMarkup, displayLocale, applySavedColors, createStorageRevisionGuard, settingsWithinBudget, reportLocalPersistenceFailure, state, calls, settings, STORAGE_KEY: 'state', CALLS_KEY: 'calls', SETTINGS_KEY: 'settings',
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem(key, value) { if (reject(key, value)) throw new Error('QuotaExceededError'); values.set(key, value); },
      removeItem: (key) => values.delete(key),
    }, toast: (message) => warnings.push(message), render: () => {},
  });
  const body = source.slice(source.indexOf('    function safeLocalStorageSet('), source.indexOf('    export function pad(')).replaceAll('export function ', 'function ');
  vm.runInContext("const localStorageRevision = createStorageRevisionGuard(localStorage, [STORAGE_KEY,CALLS_KEY,SETTINGS_KEY]);\n" + body, context);
  return { state, calls, settings, values, warnings, context, reject: (fn) => { reject = fn; }, run: (code) => vm.runInContext(code, context) };
}

function resetHarness() {
  const h = storageHarness(), opened = [], closed = [];
  Object.assign(h.context, {
    setAppState: value => { h.context.state = value; },
    setAppCalls: value => { h.context.calls = value; },
    setAppSettings: value => { h.context.settings = value; },
    defaultState: () => ({ game: { ledger: {} } }),
    defaultSettings: () => ({ productiveGoalMin: 360, onboarded: false }),
    ensureCurrencySettings() {}, setContextScheduleEditDay() {}, resetCallEditorState() {},
    weekViewOffset: 3, cycleViewOffset: 2, editingGapContext: 'editing',
    appConfirm: (message, callback) => { h.context.confirmReset = callback; },
    closeModal: name => closed.push(name), openModal: name => opened.push(name),
    document: { getElementById: () => null }, DEFAULT_USER_EMOJI: 'test', renderEmojiPicker() {},
  });
  h.calls.push({ id: 'keep' });
  h.state.saved = true;
  assert.equal(h.run('saveAll()'), true);
  h.warnings.length = 0;
  vm.runInContext(source.slice(source.indexOf('    function eraseAllData()'), source.indexOf('    function resetDay()')), h.context);
  return { ...h, opened, closed };
}

test('confirmed full reset writes an empty snapshot without mistaking its own changes for another tab', () => {
  const h = resetHarness();
  h.run('eraseAllData(); confirmReset();');
  assert.deepEqual(JSON.parse(h.values.get('calls')), []);
  assert.equal(JSON.parse(h.values.get('settings')).onboarded, false);
  assert.equal(h.run('localStorageRevision.isCurrent()'), true);
  assert.equal(getLocalPersistenceFailure(), null);
  assert.deepEqual(h.opened, ['onboardingModal']);
  assert.deepEqual(h.closed, ['resetModal']);
  assert.ok(h.warnings.includes(translateText('Todos los datos fueron borrados')));
});

test('a reset confirmation cannot delete a newer snapshot written while its dialog was open', () => {
  const h = resetHarness();
  h.run('eraseAllData();');
  h.values.set('calls', JSON.stringify([{ id: 'newer-tab' }]));
  const disk = new Map(h.values), memory = h.run('JSON.stringify({state,calls,settings})');
  h.run('confirmReset();');
  assert.deepEqual(h.values, disk);
  assert.equal(h.run('JSON.stringify({state,calls,settings})'), memory);
  assert.equal(getLocalPersistenceFailure(), 'stale');
  assert.deepEqual(h.opened, []);
});

test('a rejected full reset preserves disk and memory without success; retry can reset completely', () => {
  const h = resetHarness();
  const disk = new Map(h.values), memory = h.run('JSON.stringify({state,calls,settings})');
  h.reject(key => key === 'calls');
  h.run('eraseAllData(); confirmReset();');
  assert.deepEqual(h.values, disk);
  assert.equal(h.run('JSON.stringify({state,calls,settings})'), memory);
  assert.deepEqual(h.opened, []);
  assert.equal(h.context.weekViewOffset, 3);
  assert.ok(!h.warnings.includes(translateText('Todos los datos fueron borrados')));
  h.reject(() => false);
  h.run('eraseAllData(); confirmReset();');
  assert.deepEqual(JSON.parse(h.values.get('calls')), []);
  assert.equal(getLocalPersistenceFailure(), null);
  assert.deepEqual(h.opened, ['onboardingModal']);
});

test('opening a full reset confirmation without accepting leaves all saved data intact', () => {
  const h = resetHarness(), disk = new Map(h.values);
  h.run('eraseAllData();');
  assert.deepEqual(h.values, disk);
  assert.deepEqual(h.opened, []);
});

test('guardar solo estado no vuelve vigente un tab que ya tenía llamadas externas más recientes', () => {
  const h = storageHarness();
  h.values.set('calls', JSON.stringify([{id:'other-tab-call'}]));
  assert.equal(h.run('saveStateOnly()'), false);
  assert.equal(h.run('localStorageRevision.isCurrent()'), false);
  assert.equal(getLocalPersistenceFailure(), 'stale');
  assert.equal(JSON.parse(h.values.get('calls'))[0].id, 'other-tab-call');
});

test('una pestaña antigua no reemplaza el historial guardado por otra pestaña', () => {
  const h = storageHarness();
  h.values.set('calls', JSON.stringify([{id:'other-tab-call'}]));
  const current = new Map(h.values);
  h.calls.push({id:'stale-tab-call'});
  assert.equal(h.run('saveAll()'), false);
  assert.deepEqual(h.values, current);
  assert.ok(h.warnings.length > 0);
});

test('a reassigned owner with identical stored JSON still blocks writes from the prior account document', () => {
  const h = storageHarness(), before = new Map(h.values);
  h.context.window = { [Symbol.for('propio.expectedAppOwner')]: 'account-a' };
  h.context.readMeta = () => ({ userId: 'account-b', lastSyncedUpdatedAt: 'new-revision' });
  h.state.newEdit = true;
  assert.equal(h.run('localStorageRevision.isCurrent()'), true);
  assert.equal(h.run('saveAll()'), false);
  assert.deepEqual(h.values, before);
  assert.equal(getLocalPersistenceFailure(), 'stale');
});

test('the expected owner can persist after sync metadata changes without treating normal acknowledgements as stale', () => {
  const h = storageHarness();
  h.context.window = { [Symbol.for('propio.expectedAppOwner')]: 'account-a' };
  h.context.readMeta = () => ({ userId: 'account-a', lastSyncedUpdatedAt: 'new-revision', dirty: false });
  h.state.newEdit = true;
  assert.equal(h.run('saveStateOnly()'), true);
  assert.equal(JSON.parse(h.values.get('state')).newEdit, true);
  assert.equal(getLocalPersistenceFailure(), null);
});

test('una cuota agotada no persiste recompensas de llamadas que no llegaron al disco; un reintento guarda todo', () => {
  const h = storageHarness();
  const before = new Map(h.values);
  h.calls.push({ id: 'pending-call' });
  h.reject((key, value) => key === 'calls' && value !== '[]');
  assert.equal(h.run('saveAll()'), false);
  assert.equal(getLocalPersistenceFailure(), 'quota');
  h.state.game.ledger['reward:pending-call'] = true;
  assert.equal(h.run('saveStateOnly()'), false);
  h.settings.goal = 20;
  assert.equal(h.run('saveSettingsOnly()'), false);
  assert.deepEqual(h.values, before);
  h.reject(() => false);
  assert.equal(h.run('saveSettingsOnly()'), true);
  assert.equal(getLocalPersistenceFailure(), null);
  assert.deepEqual(JSON.parse(h.values.get('calls')), h.calls);
  assert.deepEqual(JSON.parse(h.values.get('state')), h.state);
  assert.deepEqual(JSON.parse(h.values.get('settings')), h.settings);
});

test('oversized settings keep all pending changes and their failure until a complete retry succeeds', () => {
  const h = storageHarness();
  const before = new Map(h.values);
  h.settings.large = 'x'.repeat(1024 * 1024 + 1);
  h.calls.push({ id: 'pending-call' });
  assert.equal(h.run('saveSettingsOnly()'), false);
  assert.equal(getLocalPersistenceFailure(), 'budget');
  h.state.game.ledger.pending = true;
  assert.equal(h.run('saveStateOnly()'), false);
  assert.deepEqual(h.values, before);
  delete h.settings.large;
  assert.equal(h.run('saveStateOnly()'), true);
  assert.equal(getLocalPersistenceFailure(), null);
  assert.deepEqual(JSON.parse(h.values.get('calls')), h.calls);
  assert.deepEqual(JSON.parse(h.values.get('state')), h.state);
});

test('un almacenamiento que rechaza escrituras conserva las claves previas sin borrarlas', () => {
  const h = storageHarness();
  const before = new Map(h.values);
  h.reject(() => true);
  h.calls.push({ id: 'blocked' });
  assert.equal(h.run('saveAll()'), false);
  assert.deepEqual(h.values, before);
});

test('un fallo al guardar solo estado obliga a guardar el siguiente snapshot completo', () => {
  const h = storageHarness();
  h.reject(() => true);
  h.state.game.ledger.pending = true;
  assert.equal(h.run('saveStateOnly()'), false);
  h.calls.push({ id: 'new-call' });
  h.reject(() => false);
  assert.equal(h.run('saveStateOnly()'), true);
  assert.deepEqual(JSON.parse(h.values.get('calls')), h.calls);
  assert.deepEqual(JSON.parse(h.values.get('state')), h.state);
});

test('el JSON descargado incluye el recibo y escudo del mismo respaldo', () => {
  let downloaded;
  const state = { game: { shields: 0, ledger: {} } };
  const context = vm.createContext({ ui, translateText, translateMarkup, displayLocale, applySavedColors, state, calls: [], settings: {}, Date,
    onGameBackupExported() {
      if (!state.game.ledger['backup-shield:week']) { state.game.shields++; state.game.ledger['backup-shield:week'] = true; }
    },
    Blob: class { constructor(parts) { downloaded = JSON.parse(parts[0]); } },
    URL: { createObjectURL: () => 'blob:backup', revokeObjectURL() {} },
    document: { createElement: () => ({ click() {} }) },
  });
  const body = source.slice(source.indexOf('    function exportJSON()'), source.indexOf('    // Exportación para contabilidad/impuestos'));
  vm.runInContext(body + '\nexportJSON();', context);
  assert.deepEqual(downloaded.state, state);
  assert.equal(downloaded.state.game.shields, 1);
  vm.runInContext('exportJSON();', context);
  assert.equal(downloaded.state.game.shields, 1);
});

test('una exportación de dos años conserva los días y las llamadas después del día 400', () => {
  const lastCall = { id: 'last-day', startISO: '2026-12-31T12:00:00Z', pay: 15 };
  const context = vm.createContext({ ui, translateText, translateMarkup, displayLocale, applySavedColors, Date,
    todayCallDateKey: (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`,
    callsForDay: (key) => key === '2026-12-31' ? [lastCall] : [],
    importedCallStats: (calls) => ({ earnings: calls.reduce((sum, call) => sum + call.pay, 0) }),
    dayIsEffectivelyOff: () => true, dayAdherence: () => null, productiveMinutesForDay: () => 0,
  });
  const body = source.slice(source.indexOf('    function accountingExportDays('), source.indexOf('    function csvField('));
  const days = vm.runInContext(body + '\naccountingExportDays({start: new Date(2025, 0, 1), end: new Date(2026, 11, 31)});', context);
  assert.equal(days.length, 730);
  assert.equal(days.at(-1).dayKey, '2026-12-31');
  assert.equal(days.at(-1).dayCalls[0].id, 'last-day');
  assert.equal(days.reduce((sum, day) => sum + day.stats.earnings, 0), 15);
});

for (const failure of ['all', 'calls']) {
  test(`la hidratación de nube conserva los datos locales si falla ${failure}`, (t) => {
    setLanguage('es');
    const originalWindow = globalThis.window;
    t.after(() => { if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow; });
    const values = new Map(Object.values(APP_KEYS).map((key) => [key, '{"original":true}']));
    const previous = new Map(values);
    globalThis.window = { localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem(key, value) {
        if (failure === 'all' || (key === APP_KEYS.calls && value !== previous.get(key))) throw new Error('Rejected write');
        values.set(key, value);
      },
      removeItem: (key) => values.delete(key),
    } };
    assert.throws(() => writeLocalSnapshot({ state: { cloud: true }, calls: [{ id: 'cloud' }], settings: {} }), /No hay espacio local suficiente/);
    assert.deepEqual(values, previous);
  });
}
