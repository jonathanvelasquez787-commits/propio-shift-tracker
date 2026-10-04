import { translateText, translateDocument } from './i18n.js';
import { applySavedColors } from './appearance-colors.js';
import { currentLanguage, setLanguage } from './i18n.js';
import { LANGUAGE_PREFERENCE_KEY, readLanguagePreference, saveLanguagePreference } from './language-preference.js';
import { syncLandingMetadata } from './landing-meta.js';
translateDocument();
// Interruptor claro/oscuro de las páginas públicas.
//
// Escribe en la MISMA clave de settings que lee la app, así el tema elegido
// antes de entrar es el que la app abre después. El script theme-init.js del <head>
// de cada página aplica esa preferencia antes de pintar; este módulo solo la
// cambia y mantiene los botones sincronizados.

const SETTINGS_KEY = 'propio_shift_tracker_settings_es_v1';

function readTheme() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || '{}');
    return parsed && parsed.theme === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

// Merge, nunca reemplazo: la clave guarda el resto de los ajustes del usuario.
function writeTheme(theme) {
  let settings = {};
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) settings = parsed;
  } catch {
    settings = {};
  }
  settings.theme = theme;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* sin espacio: el tema vale para esta visita y no se guarda */
  }
}

function applyTheme(theme) {
  const root = document.documentElement;
  root.classList.toggle('theme-dark', theme === 'dark');
  root.classList.toggle('theme-light', theme !== 'dark');
  let settings = {};
  try { settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') || {}; } catch {}
  applySavedColors({ ...settings, theme, language: currentLanguage() }, root);
}

function syncButtons(theme) {
  const isDark = theme === 'dark';
  document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    btn.setAttribute('aria-label', isDark ? translateText('Cambiar a modo claro') : translateText('Cambiar a modo oscuro'));
    btn.title = isDark ? translateText('Modo claro') : translateText('Modo oscuro');
  });
}

const current = readTheme();
applyTheme(current);
syncButtons(current);

function syncLanguage(value) {
  setLanguage(value, { documentTranslation: true });
  syncLandingMetadata(currentLanguage());
  document.querySelectorAll('[data-language-select]').forEach(select => { select.value = currentLanguage(); });
  document.querySelectorAll('[data-language-toggle]').forEach(button => {
    button.dataset.language = currentLanguage();
    button.querySelector('[data-language-label]').textContent = currentLanguage().toUpperCase();
    const action = currentLanguage() === 'en' ? translateText('Cambiar a español') : translateText('Cambiar a inglés');
    button.setAttribute('aria-label', action);
    button.title = action;
  });
  syncButtons(readTheme());
}

syncLanguage(readLanguagePreference());
document.addEventListener('change', event => {
  if (!(event.target instanceof Element) || !event.target.matches('[data-language-select]')) return;
  const language = saveLanguagePreference(event.target.value, { pendingLogin: true });
  syncLanguage(language);
  window.dispatchEvent(new CustomEvent('propio-language-change', { detail: language }));
});

document.addEventListener('click', (e) => {
  const languageButton = e.target instanceof Element ? e.target.closest('[data-language-toggle]') : null;
  if (languageButton) {
    e.preventDefault();
    const language = saveLanguagePreference(currentLanguage() === 'en' ? 'es' : 'en', { pendingLogin: true });
    syncLanguage(language);
    window.dispatchEvent(new CustomEvent('propio-language-change', { detail: language }));
    return;
  }
  const btn = e.target instanceof Element ? e.target.closest('[data-theme-toggle]') : null;
  if (!btn) return;
  const next = readTheme() === 'dark' ? 'light' : 'dark';
  writeTheme(next);
  applyTheme(next);
  syncButtons(next);
});

// Otra pestaña del sitio (o la propia app) cambió el tema: seguirla en vivo.
window.addEventListener('storage', (e) => {
  if (e.key !== null && e.key !== SETTINGS_KEY && e.key !== LANGUAGE_PREFERENCE_KEY) return;
  syncLanguage(readLanguagePreference());
  window.dispatchEvent(new CustomEvent('propio-language-change', { detail: currentLanguage() }));
  const theme = readTheme();
  applyTheme(theme);
  syncButtons(theme);
});
