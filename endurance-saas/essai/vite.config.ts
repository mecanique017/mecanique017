import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Version d'essai : application statique (PWA) publiée sur GitHub Pages, sous /app-endurance/.
 * Elle réutilise le code de l'application Next.js (src/lib, src/components) : mêmes calculs,
 * mêmes composants. La sécurité des données repose sur la RLS Supabase (aucun secret ici).
 */
const app = (p: string) => fileURLToPath(new URL(`../${p}`, import.meta.url))

export default defineConfig({
  base: '/app-endurance/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: /^@\//, replacement: app('src/') },
      // Modules propres à Next.js / au serveur, sans objet dans le navigateur
      { find: 'server-only', replacement: fileURLToPath(new URL('./src/shims/empty.ts', import.meta.url)) },
      { find: 'next/link', replacement: fileURLToPath(new URL('./src/shims/next-link.tsx', import.meta.url)) },
      // Une seule copie de React (celle de l'application) pour les composants partagés
      { find: /^react$/, replacement: app('node_modules/react/index.js') },
      { find: /^react\/jsx-runtime$/, replacement: app('node_modules/react/jsx-runtime.js') },
      { find: /^react\/jsx-dev-runtime$/, replacement: app('node_modules/react/jsx-dev-runtime.js') },
      { find: /^react-dom$/, replacement: app('node_modules/react-dom/index.js') },
      { find: /^react-dom\/client$/, replacement: app('node_modules/react-dom/client.js') },
    ],
    dedupe: ['react', 'react-dom'],
  },
  build: {
    outDir: fileURLToPath(new URL('../../app-endurance', import.meta.url)),
    emptyOutDir: true,
  },
})
