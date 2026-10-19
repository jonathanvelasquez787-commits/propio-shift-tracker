export function partitionLocaleResources(resources, catalog) {
  const lazyFiles = new Set(['js/detail-views.js', 'js/higher-rate-review.js']);
  const isLazy = key => catalog[key]?.files.length > 0 && catalog[key].files.every(file => lazyFiles.has(file));
  const subset = lazy => Object.fromEntries(Object.entries(resources).map(([language, bundle]) => [language, {
    translation: Object.fromEntries(Object.entries(bundle.translation).filter(([key]) => isLazy(key) === lazy)),
  }]));
  return { initial: subset(false), details: subset(true) };
}

export function localeResourceScript(resources) {
  const spanish = resources.es.translation, english = resources.en.translation;
  const shared = Object.fromEntries(Object.entries(spanish).filter(([key]) => Object.hasOwn(english, key)));
  const delta = Object.fromEntries(Object.entries(english).filter(([key, value]) => shared[key] !== value));
  return `window.pstLocaleResources=(()=>{const es=${JSON.stringify(spanish)};return {es:{translation:es},en:{translation:{...${Object.keys(shared).length === Object.keys(spanish).length ? 'es' : JSON.stringify(shared)},...${JSON.stringify(delta)}}}};})();`;
}
