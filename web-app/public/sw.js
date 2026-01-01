// Service Worker for Restaurant POS PWA

const CACHE_NAME = 'restaurant-pos-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/pwa-192x192.png',
  '/pwa-512x512.png'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Cache successful');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.log('Service Worker: Cache failed', err);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activate event');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache');
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - offline-first strategy
self.addEventListener('fetch', (event) => {
  console.log('Service Worker: Fetch event for', event.request.url);

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          console.log('Service Worker: Serving from cache:', event.request.url);
          return cachedResponse;
        }
        
        // Fetch from network
        return fetch(event.request)
          .then((networkResponse) => {
            // Don't cache POST requests or responses that aren't successful
            if (event.request.method !== 'GET' || networkResponse.status !== 200) {
              return networkResponse;
            }
            
            // Clone response for caching
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                console.log('Service Worker: Caching new file:', event.request.url);
                cache.put(event.request, responseClone);
              });
            return networkResponse;
          })
          .catch(() => {
            // Return offline fallback for navigation requests
            if (event.request.mode === 'navigate') {
              console.log('Service Worker: Serving offline fallback');
              return caches.match('/');
            }
            // For API requests, return cached data or error
            return caches.match(event.request).then((cached) => {
              if (cached) {
                console.log('Service Worker: Serving cached API response');
                return cached;
              }
              console.log('Service Worker: No cached response available');
              return new Response('Offline', { 
                status: 503, 
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'text/plain' }
              });
            });
          });
      })
  );
});

// Background sync for offline transactions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Sync event', event.tag);
  
  if (event.tag === 'sync-offline-data') {
    event.waitUntil(syncOfflineData());
  }
});

async function syncOfflineData() {
  console.log('Service Worker: Starting background sync');
  
  try {
    // Get offline data from IndexedDB
    const db = await openDatabase();
    const offlineTransactions = await db.getAll('offline-queue');
    
    console.log('Service Worker: Found', offlineTransactions.length, 'offline items');
    
    for (const transaction of offlineTransactions) {
      try {
        console.log('Service Worker: Syncing transaction:', transaction.id);
        
        let response;
        
        if (transaction.type === 'transaction') {
          response = await fetch('/api/transactions/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transaction.data)
          });
        } else if (transaction.type === 'product') {
          response = await fetch('/api/inventory/product', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transaction.data)
          });
        }
        
        if (response && response.ok) {
          // Remove from offline store after successful sync
          await db.delete('offline-queue', transaction.id);
          console.log('Service Worker: Successfully synced', transaction.type);
        } else {
          console.error('Service Worker: Failed to sync', transaction.type, response);
        }
      } catch (error) {
        console.error('Service Worker: Error syncing transaction:', error);
      }
    }
    
    console.log('Service Worker: Background sync completed');
    
    // Notify client that sync is complete
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'SYNC_COMPLETE',
          message: 'Offline data synced successfully'
        });
      });
    });
    
  } catch (error) {
    console.error('Service Worker: Background sync failed:', error);
  }
}

// Open IndexedDB in Service Worker
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('restaurant-pos-offline', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      
      if (!db.objectStoreNames.contains('offline-queue')) {
        db.createObjectStore('offline-queue', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

// Push notifications (optional feature)
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push event');
  
  const options = {
    body: event.data ? event.data.text() : 'New notification',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: 'restaurant-pos-notification',
    requireInteraction: true
  };
  
  event.waitUntil(
    self.registration.showNotification('Restaurant POS', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification click');
  
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});
