import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe, tierForPriceId } from '@/lib/stripe'

/** Statuts Stripe qui donnent accès à l'offre payante. */
const ACTIVE_STATUSES: Stripe.Subscription.Status[] = ['active', 'trialing', 'past_due']

/**
 * POST /api/stripe/webhook
 * Seule source de vérité pour l'abonnement : met à jour profiles.subscription_*
 * avec le client service role (les utilisateurs n'ont pas le droit d'écrire ces colonnes).
 */
export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!signature || !secret) {
    return NextResponse.json({ error: 'Signature manquante' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    // Corps brut obligatoire pour vérifier la signature
    event = getStripe().webhooks.constructEvent(await req.text(), signature, secret)
  } catch {
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      if (session.mode !== 'subscription' || !session.client_reference_id || !session.subscription) break
      const subscriptionId =
        typeof session.subscription === 'string' ? session.subscription : session.subscription.id
      const subscription = await getStripe().subscriptions.retrieve(subscriptionId)
      const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id

      const { error } = await createAdminClient()
        .from('profiles')
        .update({ stripe_customer_id: customerId ?? null, ...subscriptionFields(subscription) })
        .eq('id', session.client_reference_id)
      if (error) return dbError(error)
      break
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object
      const customerId =
        typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id

      const { error } = await createAdminClient()
        .from('profiles')
        .update(subscriptionFields(subscription))
        .eq('stripe_customer_id', customerId)
      if (error) return dbError(error)
      break
    }
  }

  return NextResponse.json({ received: true })
}

function subscriptionFields(subscription: Stripe.Subscription) {
  const active = ACTIVE_STATUSES.includes(subscription.status)
  return {
    subscription_status: subscription.status,
    subscription_tier: active ? tierForPriceId(subscription.items.data[0]?.price.id) : ('free' as const),
  }
}

// Réponse 500 → Stripe renverra l'événement plus tard
function dbError(error: { message: string }) {
  console.error('Webhook Stripe : échec mise à jour profil', error.message)
  return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 })
}
