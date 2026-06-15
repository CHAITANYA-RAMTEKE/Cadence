/* Cadence service worker — network-first, cache as offline fallback.
   Bump CACHE on every deploy so clients fetch fresh assets and purge the old cache. */
const CACHE = 'cadence-v6';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './store.js',
  './app.js',
  './manifest.webmanifest',
  './icon.svg',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  // Fetch fresh copies (bypass the HTTP cache) when warming the cache.
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    // Network-first, bypassing the HTTP cache so a deploy shows up immediately.
    fetch(e.request, { cache: 'no-store' })
      .then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return resp;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
  );
});
