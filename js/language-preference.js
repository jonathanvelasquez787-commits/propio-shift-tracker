export const LANGUAGE_PREFERENCE_KEY = 'propio_language_preference_v1';
export const PENDING_LOGIN_LANGUAGE_KEY = 'propio_login_language_v1';
const SETTINGS_KEY = 'propio_shift_tracker_settings_es_v1';

export function normalizeLanguage(value) {
  return value === 'es' ? 'es' : 'en';
}

export function readLanguagePreference(storage) {
  if (['/es', '/es.html'].includes(globalThis.location?.pathname)) return 'es';
  try {
    const saved = storage || globalThis.localStorage;
    const preference = saved?.getItem(LANGUAGE_PREFERENCE_KEY);
    if (preference === 'en' || preference === 'es') return preference;
    const settings = JSON.parse(saved?.getItem(SETTINGS_KEY) || '{}');
    return normalizeLanguage(settings?.language);
  } catch {
    return 'en';
  }
}

export function saveLanguagePreference(value, { pendingLogin = false, storage, session } = {}) {
  const language = normalizeLanguage(value);
  try { (storage || globalThis.localStorage)?.setItem(LANGUAGE_PREFERENCE_KEY, language); } catch {}
  if (pendingLogin) {
    try { (session || globalThis.sessionStorage)?.setItem(PENDING_LOGIN_LANGUAGE_KEY, language); } catch {}
  }
  return language;
}

export function readPendingLoginLanguage(session) {
  try {
    const value = (session || globalThis.sessionStorage)?.getItem(PENDING_LOGIN_LANGUAGE_KEY);
    return value === 'en' || value === 'es' ? value : null;
  } catch {
    return null;
  }
}

export function clearPendingLoginLanguage(session) {
  try { (session || globalThis.sessionStorage)?.removeItem(PENDING_LOGIN_LANGUAGE_KEY); } catch {}
}
