export function validateTranslations(primary, target) {
  const parameters = text => [...text.matchAll(/\{\{\w+\}\}|(?<!\{)\{\w+\}(?!\})/g)].map(match => match[0]).sort();
  return Object.entries(primary).flatMap(([key, source]) => {
    const value = target[key];
    if (typeof value !== 'string' || !value.trim()) return [`${key}: falta inglés para ${JSON.stringify(source)}.`];
    if (JSON.stringify(parameters(source)) !== JSON.stringify(parameters(value))) return [`${key}: variables diferentes entre idiomas.`];
    if (!source.includes('<') && /<\/?[a-z!]/i.test(value)) return [`${key}: la traducción introduce HTML.`];
    return [];
  });
}
