/**
 * @file sw.js
 * @description Service Worker for SMASP.
 * Caches HTML, CSS, JS, and data/medicines.json for 100% offline availability.
 */

const CACHE_NAME = 'smasp-india-v3';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './data/medicines.json',
  './data/adr_model_weights.json',
  './js/engine/smaspEngine.js',
  './js/engine/adrPredictor.js',
  './js/engine/riskEngine.js',
  './js/engine/logger.js',
  './js/data/indianPharma.js',
  './js/data/ayurvedaAllopathy.js',
  './js/data/conditions.js',
  './js/data/i18n.js'
];

// Install Event: Cache Core Assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SMASP SW] Caching core static assets for offline use...');
      return cache.addAll(CORE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Clean old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SMASP SW] Purging outdated cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Cache-First Strategy with Network Fallback
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // Network fallback + update cache
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Fallback for HTML navigations when completely offline
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});
