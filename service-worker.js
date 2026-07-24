// Name of the cache used by this service worker. Update to force refreshes.
const CACHE_NAME = 'notes-app-v6';

// During the install phase, pre-cache the core application shell so the app
// can load offline. `waitUntil` ensures the service worker doesn't finish
// installing until the assets are cached.
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll([
        'index.html',
        'style.css',
        'app.js',
        'manifest.json'
      ]);
    })
  );
});

// Intercept network requests and try to serve cached responses first.
// Falls back to the network when a resource is not in cache.
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(response => {
      return response || fetch(e.request);
    })
  );
});