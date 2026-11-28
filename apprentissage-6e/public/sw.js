// Service worker de Mission 6e : l'application fonctionne entièrement hors ligne une fois installée.
// À chaque modification des fichiers, incrémenter VERSION pour que les appareils se mettent à jour.
const VERSION = 'mission6e-v3';
const ASSETS = [
  './',
  './css/styles.css',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon.svg',
  './index.html',
  './js/app.js',
  './js/content/bank.js',
  './js/content/francais/accord-sujet-verbe.js',
  './js/content/francais/accords-gn.js',
  './js/content/francais/classes-grammaticales.js',
  './js/content/francais/conjugaison-engine.js',
  './js/content/francais/conjugaison.js',
  './js/content/francais/dictees.js',
  './js/content/francais/figures-de-style.js',
  './js/content/francais/fonctions.js',
  './js/content/francais/homophones.js',
  './js/content/francais/lecture.js',
  './js/content/francais/vocabulaire.js',
  './js/content/index.js',
  './js/content/maths/calcul.js',
  './js/content/maths/fractions.js',
  './js/content/maths/geometrie.js',
  './js/content/maths/grandeurs.js',
  './js/content/maths/nombres.js',
  './js/content/maths/proportionnalite.js',
  './js/content/sciences/energie.js',
  './js/content/sciences/matiere.js',
  './js/content/sciences/technologie.js',
  './js/content/sciences/terre.js',
  './js/content/sciences/vivant.js',
  './js/core/ai-prompts.js',
  './js/core/exercise.js',
  './js/core/gamification.js',
  './js/core/generator.js',
  './js/core/state.js',
  './js/core/utils.js',
  './js/ui/dom.js',
  './js/ui/figure.js',
  './js/ui/player.js',
  './manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('mission6e-') && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Réseau d'abord (pour avoir la dernière version), cache en secours (hors ligne).
// Les appels à l'API (serveur local ou API Claude) ne sont jamais mis en cache.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.includes('/api/')) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))),
  );
});
