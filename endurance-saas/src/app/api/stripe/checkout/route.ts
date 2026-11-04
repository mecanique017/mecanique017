import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getStripe, PAID_PLANS, priceIdForPlan } from '@/lib/stripe'

// Le client choisit une OFFRE, pas un priceId libre :
// sinon il pourrait payer un prix moins cher que l'offre obtenue.
const BodySchema = z.object({ plan: z.enum(PAID_PLANS) })

/** POST /api/stripe/checkout { plan: 'pro' | 'premium' } → { url } de paiement Stripe. */
export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = BodySchema.safeParse(await req.json().catch(() => null))
  if (!body.success) {
    return NextResponse.json({ error: 'Offre invalide' }, { status: 400 })
  }
  const priceId = priceIdForPlan(body.data.plan)
  if (!priceId || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Paiement non configuré' }, { status: 503 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, subscription_tier')
    .eq('id', user.id)
    .single()

  // Déjà abonné : un 2e checkout créerait un 2e abonnement facturé.
  // Les changements d'offre passent par le portail client (/api/stripe/portal).
  if (profile && profile.subscription_tier !== 'free') {
    return NextResponse.json({ error: 'Abonnement déjà actif : utilisez « Gérer mon abonnement ».' }, { status: 409 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin

  const session = await getStripe().checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl}/dashboard?subscription=success`,
    cancel_url: `${siteUrl}/dashboard?subscription=cancelled`,
    client_reference_id: user.id,
    // Réutilise le client Stripe existant (évite les doublons à chaque abonnement)
    ...(profile?.stripe_customer_id
      ? { customer: profile.stripe_customer_id }
      : { customer_email: user.email }),
    subscription_data: { metadata: { user_id: user.id } },
  })

  return NextResponse.json({ url: session.url })
}
