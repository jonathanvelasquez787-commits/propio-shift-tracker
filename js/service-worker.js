const BUILD_VERSION = __BUILD_VERSION__;
const CACHE = `propio-${BUILD_VERSION}`;
const SHELL = [
  '/',
  '/index.html',
  '/es',
  '/app',
  '/privacidad.html',
  '/terminos.html',
  '/manifest.webmanifest',
  '/icons/app-icon.svg',
  '/css/tokens.css',
  '/css/landing.css',
  '/css/legal.css',
  '/css/app-shell.css',
  `/css/app-core.css?v=${BUILD_VERSION}`,
  '/css/game.css',
  '/css/game-battle.css',
  '/css/appearance.css',
  `/assets/theme-init.js?v=${BUILD_VERSION}`,
  `/assets/theme-toggle.js?v=${BUILD_VERSION}`,
  `/assets/footer-year.js?v=${BUILD_VERSION}`,
  `/assets/landing-ui.js?v=${BUILD_VERSION}`,
  `/assets/landing.js?v=${BUILD_VERSION}`,
  `/assets/boot.js?v=${BUILD_VERSION}`,
  `/assets/app-view.js?v=${BUILD_VERSION}`,
  `/assets/monitoring.js?v=${BUILD_VERSION}`,
  `/assets/register-sw.js?v=${BUILD_VERSION}`,
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('propio-') && key !== CACHE).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    if (url.pathname === '/app.html') {
      url.pathname = '/app';
      event.respondWith(Response.redirect(url.href, 308));
      return;
    }
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response.ok) {
            const copy = response.clone();
            await caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() =>
          caches.open(CACHE).then(async (cache) =>
            (await cache.match(request)) ||
            (['/app', '/es'].includes(url.pathname) && await cache.match(url.pathname)) ||
            cache.match('/index.html')
          )
        )
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(request).then((cached) => {
        const fresh = fetch(request).then(async (response) => {
          if (response.ok) await cache.put(request, response.clone()).catch(() => {});
          return response;
        });
        if (cached) {
          event.waitUntil(fresh.catch(() => {}));
          return cached;
        }
        return fresh;
      })
    )
  );
});
