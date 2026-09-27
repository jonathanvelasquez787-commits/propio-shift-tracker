// Script clásico y bloqueante: aplica el tema antes de pintar, sin esperar a Auth.
(() => {
  let theme = 'light';
  try {
    const settings = JSON.parse(localStorage.getItem('propio_shift_tracker_settings_es_v1') || '{}');
    if (settings && settings.theme === 'dark') theme = 'dark';
  } catch {
    // Si el almacenamiento está bloqueado o dañado, se conserva el tema claro.
  }
  document.documentElement.classList.toggle('theme-dark', theme === 'dark');
  document.documentElement.classList.toggle('theme-light', theme !== 'dark');
})();
