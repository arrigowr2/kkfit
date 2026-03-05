const CACHE_NAME = 'kkfit-v2';
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-72x72.svg',
  '/icons/icon-96x96.svg',
  '/icons/icon-128x128.svg',
  '/icons/icon-144x144.svg',
  '/icons/icon-152x152.svg',
  '/icons/icon-192x192.svg',
  '/icons/icon-384x384.svg',
  '/icons/icon-512x512.svg',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip API requests
  if (event.request.url.includes('/api/')) return;
  
  // Skip Next.js internal requests
  if (event.request.url.includes('_next')) return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      return (
        response ||
        fetch(event.request, { redirect: 'follow' }).then((fetchResponse) => {
          // Don't cache non-successful responses
          if (!fetchResponse || fetchResponse.status !== 200) {
            return fetchResponse;
          }

          // Clone the response
          const responseToCache = fetchResponse.clone();

          // Cache the fetched response
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return fetchResponse;
        }).catch((error) => {
          // If fetch fails (e.g., network error, redirect), try to return cached version
          console.error('Fetch failed:', error);
          return response;
        })
        })
      );
    })
  );
});

// Handle push notifications (for future use)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || 'KK Fit', {
        body: data.body || 'Nova notificação',
        icon: '/icons/icon-192x192.svg',
        badge: '/icons/icon-72x72.svg',
        tag: data.tag || 'default',
        requireInteraction: data.requireInteraction || false,
        data: data.data || {},
      })
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window if none exists
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});