import 'server-only'
import Stripe from 'stripe'
import type { SubscriptionTier } from '@/types/database'

// Sans apiVersion explicite, le SDK utilise la version d'API qu'il épingle (cohérente avec ses types).
let stripe: Stripe | null = null
export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY manquant')
  stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY)
  return stripe
}

/** Offres payantes → identifiant de prix Stripe (configuré dans .env). */
export const PAID_PLANS = ['pro', 'premium'] as const
export type PaidPlan = (typeof PAID_PLANS)[number]

export function priceIdForPlan(plan: PaidPlan): string | undefined {
  return plan === 'pro' ? process.env.STRIPE_PRICE_PRO : process.env.STRIPE_PRICE_PREMIUM
}

/** Retrouve l'offre à partir du prix d'un abonnement Stripe. */
export function tierForPriceId(priceId: string | undefined): SubscriptionTier {
  if (priceId && priceId === process.env.STRIPE_PRICE_PREMIUM) return 'premium'
  if (priceId && priceId === process.env.STRIPE_PRICE_PRO) return 'pro'
  return 'free'
}
