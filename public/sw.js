// Service Worker for advanced image caching
const CACHE_NAME = 'fgc-inventory-images-v1';
const STATIC_CACHE_NAME = 'fgc-inventory-static-v1';

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll([
        // Add critical static assets here if needed
      ]);
    })
  );
});

// Fetch event - handle image requests with caching strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Handle image requests from /images/ path
  if (url.pathname.startsWith('/images/') && event.request.method === 'GET') {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          if (response) {
            // Return cached image
            return response;
          }
          
          // Fetch and cache the image
          return fetch(event.request).then((fetchResponse) => {
            if (fetchResponse.ok) {
              // Clone the response before caching
              const responseClone = fetchResponse.clone();
              cache.put(event.request, responseClone);
            }
            return fetchResponse;
          });
        });
      })
    );
  }
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});