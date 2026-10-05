import { settingsKey, languageOf, copyFor } from './i18n.js';
function render(options) {
  const copy = copyFor(options);
  document.documentElement.lang = languageOf(options);
  document.title = copy.title;
  for (const [id, name] of Object.entries({ title: 'title', intro: 'popupIntro', help: 'popupHelp', open: 'open', privacy: 'privacy', independent: 'independent' })) document.getElementById(id).textContent = copy[name];
}
render({});
chrome.storage.local.get(settingsKey).then(stored => render(stored[settingsKey])).catch(() => {});
chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && changes[settingsKey]) render(changes[settingsKey].newValue); });
