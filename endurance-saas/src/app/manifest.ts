import type { MetadataRoute } from 'next'

/** Manifeste PWA : installation sur l'écran d'accueil, raccourcis vers les saisies du quotidien. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Endurance SaaS — Performance & Coaching',
    short_name: 'Endurance',
    description: 'Suivi de charge, bien-être et coaching IA pour athlètes d’endurance',
    lang: 'fr',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Bien-être du matin', short_name: 'Bien-être', url: '/dashboard/wellness', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Nouvelle séance', short_name: 'Séance', url: '/dashboard/activities/new', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Calendrier', url: '/dashboard/calendar', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  }
}
