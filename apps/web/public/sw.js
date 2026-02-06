/// <reference lib="webworker" />

const CACHE_NAME = '0g-v1';
const STATIC_CACHE = '0g-static-v1';
const API_CACHE = '0g-api-v1';

// Assets to precache
const PRECACHE_URLS = [
    '/',
    '/offline',
];

// Install: precache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
    );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(key => key !== STATIC_CACHE && key !== API_CACHE && key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

// Fetch strategies
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // API requests: stale-while-revalidate
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            caches.open(API_CACHE).then(async (cache) => {
                const cached = await cache.match(request);
                const networkPromise = fetch(request).then(response => {
                    if (response.ok) {
                        cache.put(request, response.clone());
                    }
                    return response;
                }).catch(() => cached);

                return cached || networkPromise;
            })
        );
        return;
    }

    // Static assets: cache-first
    if (
        url.pathname.match(/\.(js|css|woff2?|png|jpg|jpeg|gif|webp|avif|svg|ico)$/)
    ) {
        event.respondWith(
            caches.match(request).then(cached => {
                if (cached) return cached;
                return fetch(request).then(response => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(STATIC_CACHE).then(cache => cache.put(request, clone));
                    }
                    return response;
                });
            })
        );
        return;
    }

    // Navigation: network-first
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(() => caches.match('/offline') || caches.match('/'))
        );
        return;
    }
});

// Push notification handler
self.addEventListener('push', (event) => {
    if (!event.data) return;

    try {
        const data = event.data.json();
        event.waitUntil(
            self.registration.showNotification(data.title || 'ZeroG', {
                body: data.body || '',
                icon: '/icon-192.png',
                badge: '/badge-72.png',
                data: { url: data.url || '/' },
                tag: data.tag || 'default',
            })
        );
    } catch (e) {
        // Invalid push data
    }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url || '/';
    event.waitUntil(
        self.clients.matchAll({ type: 'window' }).then(clients => {
            for (const client of clients) {
                if (client.url.includes(url) && 'focus' in client) {
                    return client.focus();
                }
            }
            return self.clients.openWindow(url);
        })
    );
});

// Background sync for offline post queue
self.addEventListener('sync', (event) => {
    if (event.tag === 'post-queue') {
        event.waitUntil(processPostQueue());
    }
});

async function processPostQueue() {
    // In production, read from IndexedDB queue and submit posts
    // This is a placeholder for the offline post creation feature
}
