const CACHE_NAME = 'notes-app-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll([
        '/notes-app/index.html',
        '/notes-app/style.css',
        '/notes-app/app.js',
        '/notes-app/manifest.json'
      ]);
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(response => {
      return response || fetch(e.request);
    })
  );
});