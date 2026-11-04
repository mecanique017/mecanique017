/*
 * Service worker de la version d'essai : met en cache l'application elle-même (fichiers statiques
 * versionnés). Les DONNÉES (Supabase) ne sont jamais mises en cache : elles restent en ligne.
 */
const CACHE = 'endurance-essai-v2'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html', './manifest.webmanifest', './icons/icon-192.png'])).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return // Supabase : jamais en cache
  // Page : réseau d'abord (mises à jour), cache si hors ligne
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('./index.html')))
    return
  }
  // Fichiers versionnés (assets/xxx-hash.js) et icônes : cache d'abord
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((res) => {
          if (res.ok) {
            const copy = res.clone() // copie AVANT de renvoyer la réponse (son contenu n'est lisible qu'une fois)
            caches.open(CACHE).then((c) => c.put(request, copy))
          }
          return res
        })
    )
  )
})
