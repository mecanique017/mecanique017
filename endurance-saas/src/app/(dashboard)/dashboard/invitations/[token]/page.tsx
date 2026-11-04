import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { findInvitation } from '@/lib/coach'
import { Button } from '@/components/ui/button'
import { acceptInvitation, declineInvitation } from '../../coach/actions'

export const metadata: Metadata = { title: 'Invitation — Endurance SaaS' }

export default function InvitationPage({ params }: PageProps<'/dashboard/invitations/[token]'>) {
  return (
    <div className="max-w-xl mx-auto">
      <Suspense fallback={<div className="h-64 rounded-xl border bg-card animate-pulse" aria-hidden />}>
        <Invitation params={params} />
      </Suspense>
    </div>
  )
}

async function Invitation({ params }: { params: PageProps<'/dashboard/invitations/[token]'>['params'] }) {
  const { token } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const invitation = await findInvitation(token)
  const box = (title: string, text: string) => (
    <section className="rounded-xl border bg-card p-6 space-y-3">
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="text-sm text-muted-foreground">{text}</p>
      <Link href="/dashboard" className="text-sm underline underline-offset-4">
        Retour au tableau de bord
      </Link>
    </section>
  )

  if (invitation.status !== 'ok') {
    const messages = {
      invalid: ['Invitation introuvable', 'Ce lien n’est pas valide.'],
      used: ['Invitation déjà utilisée', 'Cette invitation a déjà été acceptée, refusée ou annulée.'],
      expired: ['Invitation expirée', 'Demandez à votre coach de vous renvoyer une invitation.'],
    } as const
    const [title, text] = messages[invitation.status]
    return box(title, text)
  }
  if (invitation.coachId === user.id) return box('C’est votre invitation', 'Envoyez ce lien à votre athlète.')
  if (invitation.invitedEmail !== user.email?.toLowerCase()) {
    return box('Autre adresse e-mail', `Cette invitation a été envoyée à une autre adresse. Connectez-vous avec le compte de cette adresse pour l’accepter.`)
  }

  return (
    <section className="rounded-xl border bg-card p-6 space-y-4">
      <h1 className="text-xl font-bold">{invitation.coachName ?? 'Un coach'} souhaite suivre votre entraînement</h1>
      <div className="space-y-2 text-sm">
        <p>En acceptant, votre coach pourra :</p>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>voir vos séances (y compris celles synchronisées depuis Polar), vos courbes de forme et vos analyses du coach IA ;</li>
          <li>voir vos relevés de bien-être (VFC, sommeil, fatigue) ;</li>
          <li>voir votre programme et vous programmer des séances.</li>
        </ul>
        <p className="text-muted-foreground">
          Il ne verra ni votre abonnement ni votre facturation. Vous pourrez arrêter le partage à tout moment depuis la page Coach : l’accès est coupé immédiatement.
        </p>
      </div>
      <div className="flex gap-2">
        <form action={acceptInvitation}>
          <input type="hidden" name="token" value={token} />
          <Button type="submit">Accepter et partager</Button>
        </form>
        <form action={declineInvitation}>
          <input type="hidden" name="token" value={token} />
          <Button type="submit" variant="outline">
            Refuser
          </Button>
        </form>
      </div>
    </section>
  )
}
