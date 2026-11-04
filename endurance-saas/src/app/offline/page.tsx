import type { Metadata } from 'next'
import { WifiOff } from 'lucide-react'
import { RetryButton } from './retry-button'

export const metadata: Metadata = { title: 'Hors connexion — Endurance SaaS' }

/** Page affichée par le service worker quand le réseau est indisponible. */
export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <WifiOff className="size-10 text-muted-foreground" aria-hidden />
      <h1 className="text-2xl font-bold">Pas de connexion</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Vos données sont en ligne : reconnectez-vous à Internet pour consulter votre tableau de bord ou saisir une séance.
      </p>
      <RetryButton />
    </main>
  )
}
