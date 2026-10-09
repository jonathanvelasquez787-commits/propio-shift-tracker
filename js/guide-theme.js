import { applySavedColors } from './appearance-colors.js';

const key = 'propio_shift_tracker_settings_es_v1';
const root = document.documentElement;
const button = document.querySelector('[data-guide-theme]');
function readSettings() {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '{}');
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  } catch {}
  return {};
}
function apply(settings) {
  const dark = settings.theme === 'dark';
  root.classList.toggle('theme-dark', dark);
  root.classList.toggle('theme-light', !dark);
  applySavedColors({ ...settings, language: root.lang }, root);
  button?.setAttribute('aria-pressed', String(dark));
  button?.setAttribute('aria-label', root.lang === 'es'
    ? dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'
    : dark ? 'Switch to light mode' : 'Switch to dark mode');
}
apply(readSettings());
button?.addEventListener('click', () => {
  const settings = { ...readSettings(), theme: root.classList.contains('theme-dark') ? 'light' : 'dark' };
  try { localStorage.setItem(key, JSON.stringify(settings)); } catch {}
  apply(settings);
});
window.addEventListener('storage', event => { if (event.key === null || event.key === key) apply(readSettings()); });
