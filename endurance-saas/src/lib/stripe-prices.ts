import 'server-only'
import { cacheLife } from 'next/cache'
import { getStripe, priceIdForPlan, type PaidPlan } from './stripe'

/**
 * Prix affichés sur la page Tarifs, lus dans Stripe (pas de prix codé en dur).
 * Mis en cache 1 h : un changement de prix dans Stripe apparaît au plus tard 1 h après.
 */
export async function getPlanPriceLabel(plan: PaidPlan): Promise<string | null> {
  'use cache'
  cacheLife('hours')

  const priceId = priceIdForPlan(plan)
  if (!priceId || !process.env.STRIPE_SECRET_KEY) return null
  try {
    const price = await getStripe().prices.retrieve(priceId)
    if (price.unit_amount == null) return null
    const amount = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: price.currency.toUpperCase(),
    }).format(price.unit_amount / 100)
    const interval = price.recurring?.interval === 'year' ? 'an' : 'mois'
    return `${amount} / ${interval}`
  } catch {
    return null
  }
}
