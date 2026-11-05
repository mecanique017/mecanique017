const CACHE_NAME = 'm17-cache-v4';
const ASSETS = [
    './',
    './index.html',
    './tarifs.html',
    './depannage.html',
    './404.html',
    './css/style.css',
    './js/main.js',
    './images/logo-240.jpg',
    './images/icon-192.png',
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
            icon: './images/icon-192.png',
            badge: './images/favicon-48.png',
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
// Seules les requetes GET du site lui-meme passent par le cache : les formulaires
// (FormSubmit), les statistiques et les API externes vont directement au reseau.
self.addEventListener('fetch', (e) => {
    const req = e.request;
    if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
        return;
    }

    e.respondWith(
        fetch(req)
            .then((response) => {
                // Video plays through partial (206) responses, which the cache rejects;
                // only complete responses are kept for offline use.
                if (response.status === 200 && !req.headers.has('range')) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
                }
                return response;
            })
            .catch(() =>
                caches.match(req, { ignoreSearch: req.mode === 'navigate' }).then((cached) => {
                    if (cached) return cached;
                    // Hors ligne sur une page jamais visitee : page d'accueil en cache
                    if (req.mode === 'navigate') return caches.match('./index.html');
                    return Response.error();
                })
            )
    );
});
