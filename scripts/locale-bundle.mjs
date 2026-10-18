export function localeResourceScript(resources) {
  const spanish = resources.es.translation, english = resources.en.translation;
  const shared = Object.fromEntries(Object.entries(spanish).filter(([key]) => Object.hasOwn(english, key)));
  const delta = Object.fromEntries(Object.entries(english).filter(([key, value]) => shared[key] !== value));
  return `window.pstLocaleResources=(()=>{const es=${JSON.stringify(spanish)};return {es:{translation:es},en:{translation:{...${Object.keys(shared).length === Object.keys(spanish).length ? 'es' : JSON.stringify(shared)},...${JSON.stringify(delta)}}}};})();`;
}
