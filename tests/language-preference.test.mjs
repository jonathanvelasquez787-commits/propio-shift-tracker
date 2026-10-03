import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {
  LANGUAGE_PREFERENCE_KEY, PENDING_LOGIN_LANGUAGE_KEY, normalizeLanguage,
  readLanguagePreference, saveLanguagePreference, readPendingLoginLanguage, clearPendingLoginLanguage,
} from '../js/language-preference.js';

const SETTINGS_KEY = 'propio_shift_tracker_settings_es_v1';

function memoryStorage(entries = []) {
  const values = new Map(entries);
  return {
    values,
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  };
}

test('English is the default while an explicit Spanish preference remains Spanish', () => {
  for (const value of [undefined, null, '', 'fr', 'EN', 'ES', 1, {}, []]) assert.equal(normalizeLanguage(value), 'en');
  assert.equal(normalizeLanguage('en'), 'en');
  assert.equal(normalizeLanguage('es'), 'es');
  assert.equal(readLanguagePreference(memoryStorage()), 'en');
});

test('public language has priority and valid saved account languages remain compatible', () => {
  const storage = memoryStorage([[SETTINGS_KEY, JSON.stringify({ language: 'es', goal: 25 })]]);
  assert.equal(readLanguagePreference(storage), 'es');
  storage.setItem(LANGUAGE_PREFERENCE_KEY, 'en');
  assert.equal(readLanguagePreference(storage), 'en');
  storage.setItem(LANGUAGE_PREFERENCE_KEY, 'es');
  storage.setItem(SETTINGS_KEY, JSON.stringify({ language: 'en' }));
  assert.equal(readLanguagePreference(storage), 'es');
  storage.setItem(LANGUAGE_PREFERENCE_KEY, 'invalid');
  assert.equal(readLanguagePreference(storage), 'en');
  storage.setItem(SETTINGS_KEY, JSON.stringify({ language: 'es' }));
  assert.equal(readLanguagePreference(storage), 'es');
});

test('malformed, missing and unusable account settings use English without throwing', () => {
  for (const raw of ['{bad json', 'null', '[]', '"es"', '123', '{}', '{"language":"fr"}']) {
    assert.equal(readLanguagePreference(memoryStorage([[SETTINGS_KEY, raw]])), 'en', raw);
  }
  const blocked = {
    getItem() { throw new Error('Denied'); },
    setItem() { throw new Error('Denied'); },
    removeItem() { throw new Error('Denied'); },
  };
  assert.equal(readLanguagePreference(blocked), 'en');
  assert.equal(readPendingLoginLanguage(blocked), null);
  assert.doesNotThrow(() => saveLanguagePreference('es', { pendingLogin: true, storage: blocked, session: blocked }));
  assert.doesNotThrow(() => clearPendingLoginLanguage(blocked));
});

test('login selection uses independent keys and clearing pending preserves the public language and account data', () => {
  const rawSettings = JSON.stringify({ language: 'en', goal: 25 });
  const storage = memoryStorage([[SETTINGS_KEY, rawSettings], ['calls', '[{"id":"keep"}]']]);
  const session = memoryStorage();
  saveLanguagePreference('es', { pendingLogin: true, storage, session });
  assert.equal(readLanguagePreference(storage), 'es');
  assert.equal(readPendingLoginLanguage(session), 'es');
  assert.equal(storage.getItem(SETTINGS_KEY), rawSettings);
  assert.equal(storage.getItem('calls'), '[{"id":"keep"}]');
  clearPendingLoginLanguage(session);
  assert.equal(readPendingLoginLanguage(session), null);
  assert.equal(session.values.has(PENDING_LOGIN_LANGUAGE_KEY), false);
  assert.equal(readLanguagePreference(storage), 'es');
});

test('ordinary preference updates create no login override and pending values must be valid', () => {
  const storage = memoryStorage(), session = memoryStorage();
  saveLanguagePreference('es', { storage, session });
  assert.equal(readPendingLoginLanguage(session), null);
  for (const value of ['invalid', '', '{bad json']) {
    session.setItem(PENDING_LOGIN_LANGUAGE_KEY, value);
    assert.equal(readPendingLoginLanguage(session), null);
  }
  session.removeItem(PENDING_LOGIN_LANGUAGE_KEY);
  saveLanguagePreference('invalid', { pendingLogin: true, storage, session });
  assert.equal(readLanguagePreference(storage), 'en');
  assert.equal(readPendingLoginLanguage(session), 'en');
});

test('default storage resolution tolerates browsers whose storage property access throws', () => {
  const source = fs.readFileSync(new URL('../js/language-preference.js', import.meta.url), 'utf8')
    .replace(/\bexport (?=(?:function|const))/g, '');
  const context = vm.createContext({});
  for (const key of ['localStorage', 'sessionStorage']) {
    Object.defineProperty(context, key, { get() { throw new Error('SecurityError'); } });
  }
  vm.runInContext(source, context);
  assert.equal(vm.runInContext('readLanguagePreference()', context), 'en');
  assert.equal(vm.runInContext('readPendingLoginLanguage()', context), null);
  assert.doesNotThrow(() => vm.runInContext("saveLanguagePreference('es', {pendingLogin:true}); clearPendingLoginLanguage();", context));
});
