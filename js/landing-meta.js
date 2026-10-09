export const SITE_ORIGIN = 'https://propio-shift-tracker.vercel.app';
export const INTERPRETER_GUIDE_PATHS = { en: '/guides/interpreter-shifts', es: '/es/guias/turnos-de-interprete' };

export function landingMetadata(language) {
  const spanish = language === 'es';
  return {
    language: spanish ? 'es' : 'en',
    url: SITE_ORIGIN + (spanish ? '/es' : '/'),
    title: spanish ? 'Propio Shift Tracker | Turnos y ganancias de intérpretes'
      : 'Propio Shift Tracker | Interpreter Shifts & Earnings',
    description: spanish
      ? 'Propio Shift Tracker: registra turnos, llamadas y minutos facturables como intérprete. Calcula ganancias y controla tu adherencia. Gratis y sin anuncios.'
      : 'Propio Shift Tracker helps remote interpreters track shifts, calls and billable minutes, calculate earnings and monitor schedule adherence. Free and ad-free.',
    locale: spanish ? 'es_ES' : 'en_US',
    image: SITE_ORIGIN + '/icons/social-preview.png',
  };
}

export function syncLandingMetadata(language) {
  if (!document.documentElement.hasAttribute('data-public-landing')) return;
  const meta = landingMetadata(language);
  document.title = meta.title;
  for (const [selector, value] of [
    ['meta[name="description"]', meta.description], ['meta[property="og:title"]', meta.title],
    ['meta[property="og:description"]', meta.description], ['meta[property="og:url"]', meta.url],
    ['meta[property="og:locale"]', meta.locale], ['meta[name="twitter:title"]', meta.title],
    ['meta[name="twitter:description"]', meta.description],
  ]) document.querySelector(selector)?.setAttribute('content', value);
  document.querySelector('link[rel="canonical"]')?.setAttribute('href', meta.url);
  const structuredData = document.querySelector('script[type="application/ld+json"]');
  if (structuredData) structuredData.textContent = JSON.stringify(landingStructuredData(language));
  const toggle = document.querySelector('[data-language-toggle]');
  toggle?.setAttribute('href', language === 'en' ? '/es' : '/');
  toggle?.setAttribute('hreflang', language === 'en' ? 'es' : 'en');
  document.querySelector('[data-interpreter-guide]')?.setAttribute('href', INTERPRETER_GUIDE_PATHS[language === 'es' ? 'es' : 'en']);
  if (['/', '/index.html', '/es', '/es.html'].includes(window.location.pathname)) {
    const address = new URL(window.location.href);
    address.pathname = language === 'es' ? '/es' : '/';
    window.history.replaceState(window.history.state, '', address.href);
  }
}

export function landingStructuredData(language) {
  const meta = landingMetadata(language);
  return {
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'WebSite', '@id': SITE_ORIGIN + '/#website', url: SITE_ORIGIN + '/', name: 'Propio Shift Tracker',
        alternateName: 'propio-shift-tracker.vercel.app', inLanguage: ['en', 'es'] },
      { '@type': 'WebApplication', '@id': meta.url + '#application', name: 'Propio Shift Tracker', url: meta.url,
        description: meta.description, applicationCategory: 'BusinessApplication', operatingSystem: 'Web browser',
        inLanguage: meta.language, isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } },
    ],
  };
}
