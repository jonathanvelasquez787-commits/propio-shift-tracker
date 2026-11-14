import { PALETTES, paletteTokens, resolvePalette } from './theme-palettes.js';
import { normalizeLanguage } from './language-preference.js';

export function applySavedColors(settings, root = document.documentElement) {
  const mode = settings.theme === 'dark' ? 'dark' : 'light';
  const palette = resolvePalette(settings.palette, mode);
  const previous = root.dataset.palette;
  if (previous && previous !== 'original') {
    const oldPalette = PALETTES.find(item => item.id === previous);
    if (oldPalette) for (const name of Object.keys(paletteTokens(oldPalette, mode))) root.style.removeProperty(name);
  }
  root.dataset.palette = palette.id;
  for (const [name, value] of Object.entries(paletteTokens(palette, mode))) root.style.setProperty(name, value);
  root.lang = normalizeLanguage(settings.language);
}
