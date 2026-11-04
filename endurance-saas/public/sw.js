/*
 * Service worker Endurance SaaS.
 * Volontairement minimal : AUCUNE page authentifiée n'est mise en cache (données personnelles,
 * appareil partagé). Seuls la page hors-ligne, les icônes et les fichiers statiques versionnés de Next le sont.
 */
const VERSION = 'v1'
const STATIC_CACHE = `static-${VERSION}`
const PRECACHE = ['/offline', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Navigation : réseau d'abord, page hors-ligne si pas de connexion
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/offline')))
    return
  }

  // Fichiers statiques versionnés (noms avec empreinte) : cache d'abord
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone()
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy))
            }
            return response
          })
      )
    )
  }
})
