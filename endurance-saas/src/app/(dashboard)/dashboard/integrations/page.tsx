import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CheckCircle2, CircleAlert, Link2, Unlink } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { polarConfigured } from '@/lib/polar/client'
import { Button } from '@/components/ui/button'
import { SyncButton } from './sync-button'

export const metadata: Metadata = { title: 'Connexions — Endurance SaaS' }

const STATUS_MESSAGES: Record<string, { text: string; ok: boolean }> = {
  connected: { text: 'Compte Polar connecté. La première synchronisation est en cours.', ok: true },
  disconnected: { text: 'Compte Polar déconnecté et autorisation révoquée chez Polar.', ok: true },
  consent_required: { text: 'Cochez la case de consentement pour connecter Polar.', ok: false },
  denied: { text: 'Connexion annulée sur Polar Flow.', ok: false },
  invalid_state: { text: 'La connexion a expiré ou n’a pas pu être vérifiée. Réessayez.', ok: false },
  not_configured: { text: 'La connexion Polar n’est pas configurée sur ce serveur.', ok: false },
  error: { text: 'La connexion à Polar a échoué. Réessayez plus tard.', ok: false },
}

const dateTime = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Paris' })

export default function IntegrationsPage({ searchParams }: PageProps<'/dashboard/integrations'>) {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Connexions</h1>
        <p className="text-sm text-muted-foreground mt-1">Synchronisez automatiquement vos séances depuis votre montre.</p>
      </div>
      <Suspense fallback={<div className="h-64 rounded-xl border bg-card animate-pulse" aria-hidden />}>
        <Integrations searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function Integrations({ searchParams }: { searchParams: PageProps<'/dashboard/integrations'>['searchParams'] }) {
  const { polar: status } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Lecture par le serveur (service role) : le jeton n'est jamais envoyé au navigateur
  const configured = polarConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  const connection = configured
    ? (await createAdminClient().from('polar_connections').select('connected_at, last_sync_at, last_sync_error').eq('user_id', user.id).maybeSingle()).data
    : null
  const { count } = await supabase.from('activities').select('id', { count: 'exact', head: true }).eq('source', 'polar')
  const message = typeof status === 'string' ? STATUS_MESSAGES[status] : undefined

  return (
    <div className="space-y-6">
      {message && (
        <p role="status" className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm">
          {message.ok ? (
            <CheckCircle2 className="size-4 shrink-0" style={{ color: 'var(--status-good)' }} aria-hidden />
          ) : (
            <CircleAlert className="size-4 shrink-0" style={{ color: 'var(--status-critical)' }} aria-hidden />
          )}
          {message.text}
        </p>
      )}

      <section className="rounded-xl border bg-card p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Polar</h2>
            <p className="text-sm text-muted-foreground">
              Séances (via leur fichier .fit) et VFC nocturne « Nightly Recharge ». Synchronisation chaque nuit et à la demande.
            </p>
          </div>
          {connection && (
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <CheckCircle2 className="size-4" style={{ color: 'var(--status-good)' }} aria-hidden /> Connecté
            </span>
          )}
        </div>

        {!configured ? (
          <p className="text-sm text-muted-foreground">Bientôt disponible.</p>
        ) : connection ? (
          <div className="space-y-4">
            <dl className="grid gap-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Connecté le</dt>
                <dd>{dateTime.format(new Date(connection.connected_at))}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Dernière synchronisation</dt>
                <dd>{connection.last_sync_at ? dateTime.format(new Date(connection.last_sync_at)) : 'En attente'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Séances Polar</dt>
                <dd>{count ?? 0}</dd>
              </div>
            </dl>
            {connection.last_sync_error && (
              <p className="flex items-center gap-2 text-sm">
                <CircleAlert className="size-4 shrink-0" style={{ color: 'var(--status-critical)' }} aria-hidden />
                Dernière erreur : {connection.last_sync_error}
              </p>
            )}
            <SyncButton />
            <form action="/api/polar/disconnect" method="post" className="space-y-3 border-t pt-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="delete_activities" className="size-4 accent-primary" />
                Supprimer aussi les {count ?? 0} séance(s) importée(s) depuis Polar
              </label>
              <Button type="submit" variant="outline" size="sm">
                <Unlink className="h-4 w-4" /> Déconnecter Polar
              </Button>
            </form>
          </div>
        ) : (
          <form action="/api/polar/connect" method="post" className="space-y-4">
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="ai_consent" required className="mt-0.5 size-4 accent-primary" />
              <span>
                J’autorise Endurance SaaS à importer mes données Polar et à les transmettre au coach IA (modèle Claude
                d’Anthropic) pour analyser mes séances et générer mes plans.
                <span className="block text-xs text-muted-foreground">
                  Obligatoire (licence Polar § 3.1.1). Révocable à tout moment en déconnectant Polar.
                </span>
              </span>
            </label>
            <Button type="submit">
              <Link2 className="h-4 w-4" /> Connecter mon compte Polar
            </Button>
          </form>
        )}
      </section>

      <section className="rounded-xl border bg-card p-4 md:p-6 space-y-2">
        <h2 className="text-lg font-semibold">Garmin, Strava, Wahoo, Coros…</h2>
        <p className="text-sm text-muted-foreground">
          Importez vos fichiers .fit ou l’archive complète de votre compte depuis{' '}
          <Link href="/dashboard/activities/import" className="underline underline-offset-4">
            Importer
          </Link>
          . La synchronisation automatique avec Strava n’est pas proposée : les conditions de son API interdisent
          l’usage des données par une application d’IA.
        </p>
      </section>
    </div>
  )
}
