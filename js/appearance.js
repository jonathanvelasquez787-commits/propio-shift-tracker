import { PALETTES } from './theme-palettes.js';
import { applySavedColors } from './appearance-colors.js';
import { setLanguage, translateText } from './i18n.js';

export function applyAppearance(settings) {
  const root = document.documentElement;
  const palette = PALETTES.find(item => item.id === settings.palette) || PALETTES[0];
  const mode = settings.theme === 'auto'
    ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : settings.theme === 'dark' ? 'dark' : 'light';
  applySavedColors({ ...settings, theme: mode }, root);
  setLanguage(settings.language);
  document.querySelectorAll('[data-palette-choice]').forEach(button => {
    const active = button.dataset.paletteChoice === palette.id;
    button.setAttribute('aria-checked', String(active));
    button.tabIndex = active ? 0 : -1;
  });
  document.querySelectorAll('[data-preview-theme]').forEach(button => {
    button.textContent = palette.id === 'original'
      ? translateText(button.dataset.previewTheme === 'light' ? 'Claro original' : 'Oscuro original')
      : translateText(button.dataset.previewTheme === 'light' ? 'Claro' : 'Oscuro');
    button.setAttribute('aria-pressed', String(button.dataset.previewTheme === mode));
  });
  const label = palette.id === 'original'
    ? translateText(mode === 'light' ? 'Claro original' : 'Oscuro original')
    : `${translateText(palette.name)} · ${translateText(mode === 'light' ? 'Claro' : 'Oscuro')}`;
  document.querySelectorAll('[data-appearance-label]').forEach(element => element.textContent = label);
  document.querySelectorAll('[data-current-swatches]').forEach(element => {
    element.replaceChildren(...palette.colors.map(color => {
      const swatch = document.createElement('i');
      swatch.style.background = color;
      swatch.title = color;
      return swatch;
    }));
  });
  const language = document.getElementById('appearanceLanguage');
  if (language) language.value = settings.language === 'en' ? 'en' : 'es';
  const source = document.getElementById('appearanceSource');
  if (source) {
    source.hidden = !palette.code;
    if (palette.code) source.href = `https://colorhunt.co/palette/${palette.code}`;
    else source.removeAttribute('href');
  }
}

export function wireAppearance({ getSettings, save, applyTheme }) {
  const dialog = document.getElementById('appearanceDialog');
  if (!dialog || dialog.dataset.wired) return;
  dialog.dataset.wired = 'true';
  const change = patch => {
    Object.assign(getSettings(), patch);
    save();
    applyTheme();
  };
  document.querySelectorAll('[data-palette-choice]').forEach((button, index) => {
    button.addEventListener('click', () => change({ palette: button.dataset.paletteChoice }));
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? PALETTES.length - 1
        : (index + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1) + PALETTES.length) % PALETTES.length;
      change({ palette: PALETTES[next].id });
      document.querySelector(`[data-palette-choice="${PALETTES[next].id}"]`).focus();
    });
  });
  document.querySelectorAll('[data-preview-theme]').forEach(button =>
    button.addEventListener('click', () => change({ theme: button.dataset.previewTheme })));
  document.getElementById('appearanceLanguage').addEventListener('change', event => {
    if (getSettings().language === event.target.value) return;
    const previous = getSettings().language;
    getSettings().language = event.target.value === 'en' ? 'en' : 'es';
    if (save() === false) {
      getSettings().language = previous;
      event.target.value = previous === 'en' ? 'en' : 'es';
      return;
    }
    try {
      const page = document.querySelector('.app-page:not([hidden])')?.dataset.page;
      if (page) sessionStorage.setItem('propio_appearance_return_page', page);
    } catch {}
    window.location.reload();
  });
  setTimeout(() => {
    try {
      const page = sessionStorage.getItem('propio_appearance_return_page');
      sessionStorage.removeItem('propio_appearance_return_page');
      if (page) document.querySelector(`.sidebar-link[data-page="${page.replace(/[^a-z]/g, '')}"]`)?.click();
    } catch {}
  }, 0);
  document.querySelectorAll('[data-open-appearance]').forEach(button =>
    button.addEventListener('click', () => { if (!dialog.open) dialog.showModal(); }));
  document.querySelectorAll('[data-close-appearance]').forEach(button =>
    button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
    if (getSettings().theme === 'auto') applyTheme();
  });
}
