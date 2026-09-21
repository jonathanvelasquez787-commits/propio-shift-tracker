// Interruptor claro/oscuro de las páginas públicas.
//
// Escribe en la MISMA clave de settings que lee la app, así el tema elegido
// antes de entrar es el que la app abre después. El <script> inline del <head>
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
}

function syncButtons(theme) {
  const isDark = theme === 'dark';
  document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    btn.setAttribute('aria-label', isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    btn.title = isDark ? 'Modo claro' : 'Modo oscuro';
  });
}

const current = readTheme();
applyTheme(current);
syncButtons(current);

document.addEventListener('click', (e) => {
  const btn = e.target instanceof Element ? e.target.closest('[data-theme-toggle]') : null;
  if (!btn) return;
  const next = readTheme() === 'dark' ? 'light' : 'dark';
  writeTheme(next);
  applyTheme(next);
  syncButtons(next);
});

// Otra pestaña del sitio (o la propia app) cambió el tema: seguirla en vivo.
window.addEventListener('storage', (e) => {
  if (e.key !== null && e.key !== SETTINGS_KEY) return;
  const theme = readTheme();
  applyTheme(theme);
  syncButtons(theme);
});
