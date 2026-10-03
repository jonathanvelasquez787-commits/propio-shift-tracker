import { applySavedColors } from './appearance-colors.js';
import { readLanguagePreference } from './language-preference.js';
// El build genera un script bloqueante para aplicar los colores antes de pintar.
(() => {
  let theme = 'light';
  let appearance = {};
  try {
    const settings = JSON.parse(localStorage.getItem('propio_shift_tracker_settings_es_v1') || '{}');
    appearance = settings || {};
    if (settings && settings.theme === 'dark') theme = 'dark';
  } catch {
    // Si el almacenamiento está bloqueado o dañado, se conserva el tema claro.
  }
  document.documentElement.classList.toggle('theme-dark', theme === 'dark');
  document.documentElement.classList.toggle('theme-light', theme !== 'dark');
  applySavedColors({ ...appearance, theme, language: readLanguagePreference() }, document.documentElement);
})();
