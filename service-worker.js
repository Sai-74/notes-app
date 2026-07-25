// Name of the cache used by this service worker. Update to force refreshes.
const CACHE_NAME = 'notes-app-v10';

// During the install phase, pre-cache the core application shell so the app
// can load offline. `waitUntil` ensures the service worker doesn't finish
// installing until the assets are cached.
self.addEventListener('install', (e) => {
  self.skipWaiting(); // force the new worker to activate immediately, don't wait for old tabs to close
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

// On activate, delete any old caches that don't match the current CACHE_NAME
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME) // keep only the current version
          .map(name => caches.delete(name))     // delete everything else
      );
    }).then(() => self.clients.claim()) // take control of open tabs immediately
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