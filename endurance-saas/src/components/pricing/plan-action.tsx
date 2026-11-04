'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PaidPlan } from '@/lib/stripe'
import type { SubscriptionTier } from '@/types/database'

interface Props {
  planTier: SubscriptionTier
  /** null = visiteur non connecté */
  currentTier: SubscriptionTier | null
  available: boolean
}

/**
 * Bouton d'une carte d'offre :
 * - visiteur → inscription
 * - offre actuelle → libellé désactivé
 * - abonné payant → portail Stripe (changement d'offre / résiliation)
 * - gratuit → paiement Stripe Checkout
 */
export function PlanAction({ planTier, currentTier, available }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (currentTier === null) {
    return (
      <Button asChild className="w-full" variant={planTier === 'pro' ? 'default' : 'outline'}>
        <Link href="/register">{planTier === 'free' ? 'Commencer gratuitement' : 'Créer un compte'}</Link>
      </Button>
    )
  }
  if (planTier === currentTier) {
    return (
      <Button className="w-full" variant="outline" disabled>
        Offre actuelle
      </Button>
    )
  }

  const isPaidUser = currentTier !== 'free'
  if (planTier === 'free' && !isPaidUser) return null

  const go = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = isPaidUser
        ? await fetch('/api/stripe/portal', { method: 'POST' })
        : await fetch('/api/stripe/checkout', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ plan: planTier as PaidPlan }),
          })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body.url) {
        setError(body.error ?? 'Paiement indisponible. Réessayez.')
        setLoading(false)
        return
      }
      window.location.assign(body.url)
    } catch {
      setError('Service indisponible. Vérifiez votre connexion.')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button className="w-full" onClick={go} disabled={loading || (!isPaidUser && !available)} variant={planTier === 'pro' ? 'default' : 'outline'}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {isPaidUser ? 'Gérer mon abonnement' : available ? `Choisir ${planTier === 'pro' ? 'Pro' : 'Premium'}` : 'Bientôt disponible'}
      </Button>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
