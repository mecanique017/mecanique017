import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Activity, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PLANS, type Plan } from '@/lib/plans'
import { getPlanPriceLabel } from '@/lib/stripe-prices'
import { PlanAction } from '@/components/pricing/plan-action'
import type { SubscriptionTier } from '@/types/database'

export const metadata: Metadata = {
  title: 'Offres — Endurance SaaS',
  description: 'Gratuit, Pro ou Premium : choisissez le niveau de coaching IA adapté à votre entraînement.',
}

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <Activity className="size-5 text-emerald-500" aria-hidden /> Endurance SaaS
          </Link>
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            Tableau de bord
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12 space-y-10">
        <div className="text-center space-y-3">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Choisissez votre offre</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Le suivi de charge est gratuit. Les offres payantes ajoutent des analyses du coach IA après vos séances.
          </p>
        </div>

        {/* Prix (Stripe, en cache) et offre de l'utilisateur (session) : rendus à la requête */}
        <Suspense fallback={<PlanGrid currentTier={null} prices={{}} pending />}>
          <PricingContent />
        </Suspense>

        <p className="text-center text-xs text-muted-foreground">
          Paiement sécurisé par Stripe. Résiliable à tout moment depuis « Gérer mon abonnement ».
        </p>
      </main>
    </div>
  )
}

async function PricingContent() {
  const supabase = await createClient()
  const [{ data: auth }, pro, premium] = await Promise.all([
    supabase.auth.getUser().catch(() => ({ data: { user: null } })),
    getPlanPriceLabel('pro'),
    getPlanPriceLabel('premium'),
  ])

  let currentTier: SubscriptionTier | null = null
  if (auth.user) {
    const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', auth.user.id).single()
    currentTier = profile?.subscription_tier ?? 'free'
  }

  return <PlanGrid currentTier={currentTier} prices={{ pro, premium }} />
}

function PlanGrid({
  currentTier,
  prices,
  pending,
}: {
  currentTier: SubscriptionTier | null
  prices: Partial<Record<SubscriptionTier, string | null>>
  pending?: boolean
}) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {PLANS.map((plan) => (
        <PlanCard key={plan.tier} plan={plan} price={plan.tier === 'free' ? '0 €' : prices[plan.tier]} currentTier={currentTier} pending={pending} />
      ))}
    </div>
  )
}

function PlanCard({
  plan,
  price,
  currentTier,
  pending,
}: {
  plan: Plan
  price: string | null | undefined
  currentTier: SubscriptionTier | null
  pending?: boolean
}) {
  const highlighted = plan.tier === 'pro'
  return (
    <section
      aria-labelledby={`plan-${plan.tier}`}
      className={`flex flex-col rounded-xl border bg-card p-6 ${highlighted ? 'border-primary ring-1 ring-primary' : ''}`}
    >
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <h2 id={`plan-${plan.tier}`} className="text-lg font-semibold">
            {plan.name}
          </h2>
          {highlighted && <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">Recommandé</span>}
        </div>
        <p className="text-sm text-muted-foreground">{plan.tagline}</p>
      </div>
      <p className="my-6 text-3xl font-bold tabular-nums">
        {pending ? <span className="inline-block h-9 w-32 animate-pulse rounded bg-muted align-middle" /> : (price ?? '—')}
      </p>
      <ul className="mb-8 flex-1 space-y-2 text-sm">
        {plan.features.map((f) => (
          <li key={f} className="flex gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" aria-hidden />
            {f}
          </li>
        ))}
      </ul>
      {pending ? (
        <div className="h-9 rounded-md bg-muted animate-pulse" aria-hidden />
      ) : (
        <PlanAction planTier={plan.tier} currentTier={currentTier} available={plan.tier === 'free' || Boolean(price)} />
      )}
    </section>
  )
}
