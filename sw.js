const CACHE_NAME = 'm17-cache-v1';
const ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './js/main.js',
    './images/LOGO.jpg',
    './manifest.json'
];

// Install
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Push notification
self.addEventListener('push', (e) => {
    const data = e.data ? e.data.json() : { title: 'MECANIQUE 17', body: 'Nouvelle notification' };
    e.waitUntil(
        self.registration.showNotification(data.title || 'MECANIQUE 17', {
            body: data.body || '',
            icon: './images/LOGO.jpg',
            badge: './images/LOGO.jpg',
            vibrate: [200, 100, 200],
            data: { url: data.url || './' }
        })
    );
});

// Notification click
self.addEventListener('notificationclick', (e) => {
    e.notification.close();
    const url = e.notification.data.url || './';
    e.waitUntil(
        clients.matchAll({ type: 'window' }).then(windowClients => {
            for (const client of windowClients) {
                if (client.url.includes('mecanique017') && 'focus' in client) {
                    return client.focus();
                }
            }
            return clients.openWindow(url);
        })
    );
});

// Fetch - network first, fallback to cache
self.addEventListener('fetch', (e) => {
    e.respondWith(
        fetch(e.request)
            .then((response) => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(e.request, clone);
                });
                return response;
            })
            .catch(() => {
                return caches.match(e.request);
            })
    );
});